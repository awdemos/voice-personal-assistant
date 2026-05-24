import { IpcMain, app, shell, dialog } from "electron";
import { AppState } from "../main";
import { createSafeHandle, isProOrTrialActive, clearActiveModeOnLicenseLoss } from "./types";

export function register(ipcMain: IpcMain, appState: AppState): void {
  const safeHandle = createSafeHandle(ipcMain);

  safeHandle("license:activate", async (event, key: string) => {
    try {
      const { LicenseManager } = require("../premium/electron/services/LicenseManager");
      const result = await LicenseManager.getInstance().activateLicense(key);
      if (result?.success) {
        const { BrowserWindow } = require("electron");
        BrowserWindow.getAllWindows().forEach((win: any) => {
          if (!win.isDestroyed()) win.webContents.send("license-status-changed", { isPremium: true });
        });
      }
      return result;
    } catch (err: any) {
      console.error("[IPC] license:activate unexpected error:", err);
      return { success: false, error: "Premium features not available in this build." };
    }
  });

  safeHandle("license:check-premium", async () => {
    try {
      const { LicenseManager } = require("../premium/electron/services/LicenseManager");
      return LicenseManager.getInstance().isPremium();
    } catch {
      return false;
    }
  });

  safeHandle("license:get-details", async () => {
    try {
      const { LicenseManager } = require("../premium/electron/services/LicenseManager");
      return LicenseManager.getInstance().getLicenseDetails();
    } catch {
      return { isPremium: false };
    }
  });

  safeHandle("license:check-premium-async", async () => {
    try {
      const { LicenseManager } = require("../premium/electron/services/LicenseManager");
      return await LicenseManager.getInstance().isPremiumAsync();
    } catch {
      return false;
    }
  });

  safeHandle("license:deactivate", async () => {
    try {
      const { LicenseManager } = require("../premium/electron/services/LicenseManager");
      await LicenseManager.getInstance().deactivate();
      try {
        const orchestrator = appState.getKnowledgeOrchestrator();
        if (orchestrator) {
          orchestrator.setKnowledgeMode(false);
          console.log("[IPC] Knowledge mode auto-disabled due to license deactivation");
        }
      } catch (e) {
        /* ignore */
      }
      clearActiveModeOnLicenseLoss();
      const { BrowserWindow } = require("electron");
      BrowserWindow.getAllWindows().forEach((win: any) => {
        if (!win.isDestroyed()) win.webContents.send("license-status-changed", { isPremium: false });
      });
    } catch {
      /* LicenseManager not available */
    }
    return { success: true };
  });

  safeHandle("license:get-hardware-id", async () => {
    try {
      const { LicenseManager } = require("../premium/electron/services/LicenseManager");
      return LicenseManager.getInstance().getHardwareId();
    } catch {
      return "unavailable";
    }
  });

  safeHandle("get-donation-status", async () => {
    const { DonationManager } = require("../DonationManager");
    const manager = DonationManager.getInstance();
    return {
      shouldShow: manager.shouldShowToaster(),
      hasDonated: manager.getDonationState().hasDonated,
      lifetimeShows: manager.getDonationState().lifetimeShows,
    };
  });

  safeHandle("mark-donation-toast-shown", async () => {
    const { DonationManager } = require("../DonationManager");
    DonationManager.getInstance().markAsShown();
    return { success: true };
  });

  safeHandle("set-donation-complete", async () => {
    const { DonationManager } = require("../DonationManager");
    DonationManager.getInstance().setHasDonated(true);
    return { success: true };
  });

  const _usageCache = new Map<string, { data: any; ts: number }>();
  const USAGE_CACHE_TTL_MS = 60_000;

  safeHandle("set-natively-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const cm = CredentialsManager.getInstance();
      const prevSttProvider = cm.getSttProvider();
      cm.setNativelyApiKey(apiKey);

      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setNativelyKey(apiKey || null);

      const defaultModel = cm.getDefaultModel();
      const providers = [...(cm.getCurlProviders() || []), ...(cm.getCustomProviders() || [])];
      llmHelper.setModel(defaultModel, providers);
      const { BrowserWindow } = require("electron");
      BrowserWindow.getAllWindows().forEach((win: any) => {
        if (!win.isDestroyed()) win.webContents.send("model-changed", defaultModel);
      });

      const newSttProvider = cm.getSttProvider();
      if (newSttProvider !== prevSttProvider) {
        console.log(`[IPC] set-natively-api-key: STT provider changed ${prevSttProvider} → ${newSttProvider}, reconfiguring pipeline`);
        await appState.reconfigureSttProvider();
      }

      if (apiKey) {
        try {
          const { LicenseManager } = require("../premium/electron/services/LicenseManager");
          const result = await LicenseManager.getInstance().activateWithApiKey(apiKey);
          if (result.success) {
            console.log("[IPC] set-natively-api-key: Pro auto-activated via API plan.");
            BrowserWindow.getAllWindows().forEach((win: any) => {
              if (!win.isDestroyed()) win.webContents.send("license-status-changed", { isPremium: true });
            });
          } else if (result.skipped) {
            console.log("[IPC] set-natively-api-key: existing Gumroad/Dodo license preserved — Pro not overwritten.");
          } else {
            console.log("[IPC] set-natively-api-key: Pro not activated —", result.error);
          }
        } catch (e: any) {
          console.warn("[IPC] set-natively-api-key: LicenseManager unavailable for Pro auto-activation:", e?.message);
        }
      } else {
        try {
          const { LicenseManager } = require("../premium/electron/services/LicenseManager");
          const lm = LicenseManager.getInstance();
          const details = lm.getLicenseDetails();
          if (details.isPremium && details.provider === "natively_api") {
            await lm.deactivate();
            console.log("[IPC] set-natively-api-key: key cleared — natively_api Pro license deactivated.");
            clearActiveModeOnLicenseLoss();
            BrowserWindow.getAllWindows().forEach((win: any) => {
              if (!win.isDestroyed()) win.webContents.send("license-status-changed", { isPremium: false });
            });
          }
        } catch (e: any) {
          console.warn("[IPC] set-natively-api-key: LicenseManager unavailable for Pro deactivation on key clear:", e?.message);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error saving Natively API key:", error);
      return { success: false, error: error.message };
    } finally {
      _usageCache?.clear();
    }
  });

  safeHandle("get-natively-usage", async () => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const key = CredentialsManager.getInstance().getNativelyApiKey();
      if (!key) return { ok: false, error: "no_key" };

      const cached = _usageCache.get(key);
      if (cached && Date.now() - cached.ts < USAGE_CACHE_TTL_MS) {
        return cached.data;
      }

      const res = await fetch("https://api.natively.software/v1/usage", {
        headers: { "x-natively-key": key },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as any;
        return { ok: false, error: body.error || "request_failed", status: res.status };
      }
      const data = await res.json() as any;
      const result = { ok: true, ...data };

      _usageCache.set(key, { data: result, ts: Date.now() });
      return result;
    } catch (error: any) {
      return { ok: false, error: error.message || "network_error" };
    }
  });

  safeHandle("invalidate-natively-usage-cache", () => {
    _usageCache.clear();
    return { ok: true };
  });

  safeHandle("trial:start", async () => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const cm = CredentialsManager.getInstance();

      let hwid = "unavailable";
      try {
        const { LicenseManager } = require("../premium/electron/services/LicenseManager");
        hwid = LicenseManager.getInstance().getHardwareId() || "unavailable";
      } catch {
        /* fall back */
      }

      const res = await fetch("https://api.natively.software/v1/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hwid }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as any;
        return { ok: false, error: body.error || "request_failed", status: res.status };
      }

      const data = await res.json() as any;

      if (data.ok && data.trial_token && !data.expired) {
        cm.setTrialToken(data.trial_token, data.expires_at, data.started_at);
        const prevSttProvider = cm.getSttProvider();
        cm.setNativelyApiKey("__trial__");
        const newSttProvider = cm.getSttProvider();
        if (newSttProvider !== prevSttProvider) {
          await appState.reconfigureSttProvider();
        }
        const llmHelper = appState.processingHelper?.getLLMHelper?.();
        if (llmHelper) llmHelper.setNativelyKey("__trial__");
      }

      const { trial_token, ...safeData } = data;
      return { ok: true, ...safeData, hasToken: Boolean(data.trial_token) };
    } catch (error: any) {
      console.error("[IPC] trial:start failed:", error);
      return { ok: false, error: error.message || "network_error" };
    }
  });

  safeHandle("trial:status", async () => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const token = CredentialsManager.getInstance().getTrialToken();
      if (!token) return { ok: false, error: "no_trial_token" };

      const res = await fetch("https://api.natively.software/v1/trial/status", {
        headers: { "x-trial-token": token },
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as any;
        return { ok: false, error: body.error || "request_failed", status: res.status };
      }

      return await res.json();
    } catch (error: any) {
      return { ok: false, error: error.message || "network_error" };
    }
  });

  safeHandle("trial:get-local", async () => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const cm = CredentialsManager.getInstance();
      const token = cm.getTrialToken();
      if (!token) return { hasToken: false, trialClaimed: cm.getTrialClaimed() };
      return {
        hasToken: true,
        trialClaimed: true,
        expiresAt: cm.getTrialExpiresAt(),
        startedAt: cm.getTrialStartedAt(),
        expired: cm.getTrialExpiresAt()
          ? new Date(cm.getTrialExpiresAt()!).getTime() < Date.now()
          : false,
      };
    } catch {
      return { hasToken: false, trialClaimed: false };
    }
  });

  safeHandle("trial:convert", async (_, choice: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const token = CredentialsManager.getInstance().getTrialToken();
      if (!token) return { ok: true };

      await fetch("https://api.natively.software/v1/trial/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-trial-token": token },
        body: JSON.stringify({ choice }),
        signal: AbortSignal.timeout(5_000),
      }).catch(() => {});

      return { ok: true };
    } catch {
      return { ok: true };
    }
  });

  safeHandle("trial:end-byok", async () => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const cm = CredentialsManager.getInstance();

      const token = cm.getTrialToken();
      if (token) {
        fetch("https://api.natively.software/v1/trial/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-trial-token": token },
          body: JSON.stringify({ choice: "byok" }),
          signal: AbortSignal.timeout(4_000),
        }).catch(() => {});
      }

      cm.clearTrialToken();

      cm.setNativelyApiKey("");
      const llmHelper = appState.processingHelper?.getLLMHelper?.();
      if (llmHelper) llmHelper.setNativelyKey(null);
      await appState.reconfigureSttProvider();

      try {
        const { LicenseManager } = require("../premium/electron/services/LicenseManager");
        await LicenseManager.getInstance().deactivate();
      } catch {
        /* LicenseManager not available in this build */
      }

      try {
        const orchestrator = appState.getKnowledgeOrchestrator();
        if (orchestrator) {
          orchestrator.setKnowledgeMode(false);
          const { DocType } = require("../premium/electron/knowledge/types");
          orchestrator.deleteDocumentsByType(DocType.RESUME);
          orchestrator.deleteDocumentsByType(DocType.JD);
        }
      } catch {
        /* ignore */
      }

      try {
        const sqliteDb = require("../db/DatabaseManager").DatabaseManager.getInstance().getDb();
        if (sqliteDb) {
          sqliteDb.exec(`
            DELETE FROM company_dossiers;
            DELETE FROM knowledge_documents;
            DELETE FROM resume_nodes;
            DELETE FROM user_profile;
          `);
          console.log("[IPC] trial:end-byok: Pro data wiped from SQLite");
        }
      } catch (dbErr: any) {
        console.warn("[IPC] trial:end-byok: SQLite wipe partial error:", dbErr.message);
      }

      clearActiveModeOnLicenseLoss();
      const { BrowserWindow } = require("electron");
      BrowserWindow.getAllWindows().forEach((win: any) => {
        if (!win.isDestroyed()) {
          win.webContents.send("license-status-changed", { isPremium: false });
          win.webContents.send("trial-ended", { choice: "byok" });
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error("[IPC] trial:end-byok error:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("trial:wipe-profile-data", async () => {
    try {
      try {
        const orchestrator = appState.getKnowledgeOrchestrator();
        if (orchestrator) {
          orchestrator.setKnowledgeMode(false);
          const { DocType } = require("../premium/electron/knowledge/types");
          orchestrator.deleteDocumentsByType(DocType.RESUME);
          orchestrator.deleteDocumentsByType(DocType.JD);
        }
      } catch {
        /* ignore */
      }

      try {
        const sqliteDb = require("../db/DatabaseManager").DatabaseManager.getInstance().getDb();
        if (sqliteDb) {
          sqliteDb.exec(`
            DELETE FROM company_dossiers;
            DELETE FROM knowledge_documents;
            DELETE FROM resume_nodes;
            DELETE FROM user_profile;
          `);
        }
      } catch (dbErr: any) {
        console.warn("[IPC] trial:wipe-profile-data: SQLite wipe partial error:", dbErr.message);
      }

      return { success: true };
    } catch (error: any) {
      console.error("[IPC] trial:wipe-profile-data error:", error);
      return { success: false, error: error.message };
    }
  });
}
