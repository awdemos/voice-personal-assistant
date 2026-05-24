import { IpcMain, dialog, BrowserWindow } from "electron";
import * as path from "path";
import * as fs from "fs";
import { AppState } from "../main";
import { createSafeHandle, isProOrTrialActive, clearActiveModeOnLicenseLoss } from "./types";

export function register(ipcMain: IpcMain, appState: AppState): void {
  const safeHandle = createSafeHandle(ipcMain);

  safeHandle("modes:get-all", async () => {
    try {
      const { ModesManager } = require("../services/ModesManager");
      const mgr = ModesManager.getInstance();
      const modes = mgr.getModes();
      return modes.map((m: any) => ({
        ...m,
        referenceFileCount: mgr.getReferenceFiles(m.id).length,
      }));
    } catch (e: any) {
      console.error("[IPC] modes:get-all error:", e);
      return [];
    }
  });

  safeHandle("modes:get-active", async () => {
    try {
      const { ModesManager } = require("../services/ModesManager");
      return ModesManager.getInstance().getActiveMode();
    } catch (e: any) {
      console.error("[IPC] modes:get-active error:", e);
      return null;
    }
  });

  safeHandle("modes:create", async (_, params: { name: string; templateType: string }) => {
    try {
      if (!isProOrTrialActive()) return { success: false, error: "pro_required" };
      const { ModesManager } = require("../services/ModesManager");
      const mode = ModesManager.getInstance().createMode({
        name: params.name,
        templateType: params.templateType as any,
      });
      return { success: true, mode };
    } catch (e: any) {
      console.error("[IPC] modes:create error:", e);
      return { success: false, error: e.message };
    }
  });

  safeHandle("modes:update", async (_, id: string, updates: { name?: string; templateType?: string; customContext?: string }) => {
    try {
      const { ModesManager } = require("../services/ModesManager");
      const mgr = ModesManager.getInstance();
      if (!isProOrTrialActive()) {
        if (updates.templateType && updates.templateType !== "general") {
          return { success: false, error: "pro_required" };
        }
        const existing = mgr.getModes().find((m: any) => m.id === id);
        if (existing && existing.templateType !== "general") {
          return { success: false, error: "pro_required" };
        }
      }
      mgr.updateMode(id, updates);
      return { success: true };
    } catch (e: any) {
      console.error("[IPC] modes:update error:", e);
      return { success: false, error: e.message };
    }
  });

  safeHandle("modes:delete", async (_, id: string) => {
    try {
      if (!isProOrTrialActive()) return { success: false, error: "pro_required" };
      const { ModesManager } = require("../services/ModesManager");
      ModesManager.getInstance().deleteMode(id);
      return { success: true };
    } catch (e: any) {
      console.error("[IPC] modes:delete error:", e);
      return { success: false, error: e.message };
    }
  });

  safeHandle("modes:set-active", async (_, id: string | null) => {
    try {
      if (id !== null) {
        const { ModesManager } = require("../services/ModesManager");
        const targetMode = ModesManager.getInstance().getModes().find((m: any) => m.id === id);
        if (targetMode && targetMode.templateType !== "general" && !isProOrTrialActive()) {
          return { success: false, error: "pro_required" };
        }
      }
      const { ModesManager } = require("../services/ModesManager");
      try {
        const appStateIntMgr = appState.getIntelligenceManager();
        if (appStateIntMgr) appStateIntMgr.clearSessionContext();
      } catch {}
      ModesManager.getInstance().setActiveMode(id);
      const activeMode = id ? ModesManager.getInstance().getActiveMode() : null;
      const activeName = activeMode?.name ?? null;
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send("mode-changed", { id, name: activeName });
      });
      try {
        const appStateIntMgr = appState.getIntelligenceManager();
        if (appStateIntMgr && activeMode) {
          appStateIntMgr.setDynamicActionContext({
            sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            modeId: activeMode.id,
            modeTemplateType: activeMode.templateType,
          });
        } else if (appStateIntMgr && !id) {
          appStateIntMgr.clearDynamicActionContext();
        }
      } catch {}
      try {
        const { telemetryService } = require("../services/telemetry/TelemetryService");
        telemetryService.track({
          name: "mode_switched",
          modeId: activeMode?.id,
          properties: { modeTemplateType: activeMode?.templateType, cleared: !id },
        });
      } catch {}
      return { success: true };
    } catch (e: any) {
      console.error("[IPC] modes:set-active error:", e);
      return { success: false, error: e.message };
    }
  });

  safeHandle("modes:get-reference-files", async (_, modeId: string) => {
    try {
      const { ModesManager } = require("../services/ModesManager");
      return ModesManager.getInstance().getReferenceFiles(modeId);
    } catch (e: any) {
      console.error("[IPC] modes:get-reference-files error:", e);
      return [];
    }
  });

  safeHandle("modes:upload-reference-file", async (_, modeId: string) => {
    try {
      if (!isProOrTrialActive()) return { success: false, error: "pro_required" };
      const ALLOWED_EXTENSIONS = new Set([
        ".txt", ".md", ".markdown", ".json", ".csv", ".tsv", ".xml", ".html", ".htm", ".log",
        ".pdf", ".docx", ".doc",
      ]);
      const MAX_FILE_BYTES = 10 * 1024 * 1024;
      const result: any = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          { name: "Text & Documents", extensions: ["txt", "md", "json", "csv", "xml", "html", "pdf", "docx", "doc"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (result.canceled || !result.filePaths.length) {
        return { success: false, cancelled: true };
      }
      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return {
          success: false,
          error: `Unsupported file type "${ext || "none"}". Supported formats: TXT, MD, JSON, CSV, XML, HTML, LOG, PDF, DOCX, DOC. For resumes and job descriptions, use Profile Intelligence under Settings instead.`,
        };
      }
      let stats: ReturnType<typeof fs.lstatSync>;
      try {
        stats = fs.lstatSync(filePath);
      } catch {
        return { success: false, error: "Could not read the selected file. It may have moved or been deleted." };
      }
      if (!stats.isFile()) {
        return { success: false, error: "Selected path is not a regular file (it may be a symlink, device, or directory). Pick a real document file." };
      }
      if (stats.size > MAX_FILE_BYTES) {
        const mb = (stats.size / (1024 * 1024)).toFixed(1);
        return { success: false, error: `File is ${mb} MB; the maximum is 10 MB. Trim the file or split it into smaller reference documents.` };
      }
      const PARSE_TIMEOUT_MS = 15_000;
      function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
        return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))]);
      }
      let content = "";
      try {
        if (ext === ".pdf") {
          const { PDFParse } = require("pdf-parse");
          const buffer = fs.readFileSync(filePath);
          const parser = new PDFParse({ data: buffer });
          const data: any = await withTimeout<any>(parser.getText(), PARSE_TIMEOUT_MS, "PDF parse");
          content = data.text;
        } else if (ext === ".docx" || ext === ".doc") {
          const mammoth = require("mammoth");
          const result2: any = await withTimeout<any>(mammoth.extractRawText({ path: filePath }), PARSE_TIMEOUT_MS, "DOCX parse");
          content = result2.value;
        } else {
          const probe = fs.readFileSync(filePath, { encoding: null });
          if (probe.length === 0) {
            return { success: false, error: `"${fileName}" is empty.` };
          }
          if (probe.length >= 2 && probe[0] === 0xFF && probe[1] === 0xFE) {
            content = probe.subarray(2).toString("utf16le");
          } else if (probe.length >= 2 && probe[0] === 0xFE && probe[1] === 0xFF) {
            const swapped = Buffer.allocUnsafe(probe.length - 2);
            for (let i = 2; i + 1 < probe.length; i += 2) {
              swapped[i - 2] = probe[i + 1];
              swapped[i - 1] = probe[i];
            }
            content = swapped.toString("utf16le");
          } else if (probe.length >= 3 && probe[0] === 0xEF && probe[1] === 0xBB && probe[2] === 0xBF) {
            content = probe.subarray(3).toString("utf8");
          } else {
            const sniffWindow = probe.subarray(0, Math.min(2048, probe.length));
            if (sniffWindow.includes(0)) {
              return { success: false, error: `"${fileName}" looks like a binary file even though its extension is ${ext}. Re-save the file as plain text or pick a supported document format.` };
            }
            content = probe.toString("utf8");
          }
        }
      } catch (parseErr: any) {
        console.error("[IPC] modes:upload-reference-file parser error:", parseErr?.message ?? parseErr);
        return { success: false, error: `Could not parse "${fileName}". The file may be corrupt, password-protected, or in an unsupported variant of ${ext}.` };
      }
      if (!content || content.trim().length === 0) {
        return { success: false, error: `"${fileName}" parsed to empty text. The file may be password-protected, image-only, or corrupt.` };
      }
      const { ModesManager } = require("../services/ModesManager");
      const file = ModesManager.getInstance().addReferenceFile({ modeId, fileName, content });
      return { success: true, file };
    } catch (e: any) {
      console.error("[IPC] modes:upload-reference-file error:", e);
      return { success: false, error: "Could not read the selected file. Please try a different file or contact support." };
    }
  });

  safeHandle("modes:delete-reference-file", async (_, id: string) => {
    try {
      if (!isProOrTrialActive()) return { success: false, error: "pro_required" };
      const { ModesManager } = require("../services/ModesManager");
      ModesManager.getInstance().deleteReferenceFile(id);
      return { success: true };
    } catch (e: any) {
      console.error("[IPC] modes:delete-reference-file error:", e);
      return { success: false, error: e.message };
    }
  });

  safeHandle("modes:get-note-sections", async (_, modeId: string) => {
    try {
      const { ModesManager } = require("../services/ModesManager");
      return ModesManager.getInstance().getNoteSections(modeId);
    } catch (e: any) {
      console.error("[IPC] modes:get-note-sections error:", e);
      return [];
    }
  });

  safeHandle("modes:add-note-section", async (_, modeId: string, title: string, description: string) => {
    try {
      if (!isProOrTrialActive()) return { success: false, error: "pro_required" };
      const { ModesManager } = require("../services/ModesManager");
      const section = ModesManager.getInstance().addNoteSection({ modeId, title, description });
      return { success: true, section };
    } catch (e: any) {
      console.error("[IPC] modes:add-note-section error:", e);
      return { success: false, error: e.message };
    }
  });

  safeHandle("modes:update-note-section", async (_, id: string, updates: { title?: string; description?: string }) => {
    try {
      if (!isProOrTrialActive()) return { success: false, error: "pro_required" };
      const { ModesManager } = require("../services/ModesManager");
      ModesManager.getInstance().updateNoteSection(id, updates);
      return { success: true };
    } catch (e: any) {
      console.error("[IPC] modes:update-note-section error:", e);
      return { success: false, error: e.message };
    }
  });

  safeHandle("modes:delete-note-section", async (_, id: string) => {
    try {
      if (!isProOrTrialActive()) return { success: false, error: "pro_required" };
      const { ModesManager } = require("../services/ModesManager");
      ModesManager.getInstance().deleteNoteSection(id);
      return { success: true };
    } catch (e: any) {
      console.error("[IPC] modes:delete-note-section error:", e);
      return { success: false, error: e.message };
    }
  });

  safeHandle("modes:remove-all-note-sections", async (_, modeId: string) => {
    try {
      if (!isProOrTrialActive()) return { success: false, error: "pro_required" };
      const { ModesManager } = require("../services/ModesManager");
      ModesManager.getInstance().removeAllNoteSections(modeId);
      return { success: true };
    } catch (e: any) {
      console.error("[IPC] modes:remove-all-note-sections error:", e);
      return { success: false, error: e.message };
    }
  });
}
