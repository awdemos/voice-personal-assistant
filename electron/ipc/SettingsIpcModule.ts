import { IpcMain, app, shell, dialog, systemPreferences } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { AppState } from "../main";
import { createSafeHandle } from "./types";
import { SettingsManager } from "../services/SettingsManager";
import { TRIAL_SENTINEL_KEY } from "../config/constants";

export function register(ipcMain: IpcMain, appState: AppState): void {
  const safeHandle = createSafeHandle(ipcMain);

  safeHandle("set-gemini-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setGeminiApiKey(apiKey);
      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setApiKey(apiKey);
      appState.getIntelligenceManager().resetEngine();
      appState.getIntelligenceManager().initializeLLMs();
      return { success: true };
    } catch (error: any) {
      console.error("Error saving Gemini API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-groq-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setGroqApiKey(apiKey);
      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setGroqApiKey(apiKey);
      appState.getIntelligenceManager().resetEngine();
      appState.getIntelligenceManager().initializeLLMs();
      return { success: true };
    } catch (error: any) {
      console.error("Error saving Groq API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-openai-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setOpenaiApiKey(apiKey);
      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setOpenaiApiKey(apiKey);
      appState.getIntelligenceManager().resetEngine();
      appState.getIntelligenceManager().initializeLLMs();
      return { success: true };
    } catch (error: any) {
      console.error("Error saving OpenAI API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-claude-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setClaudeApiKey(apiKey);
      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setClaudeApiKey(apiKey);
      appState.getIntelligenceManager().resetEngine();
      appState.getIntelligenceManager().initializeLLMs();
      return { success: true };
    } catch (error: any) {
      console.error("Error saving Claude API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-kimi-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setKimiApiKey(apiKey);
      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setKimiApiKey(apiKey);
      appState.getIntelligenceManager().resetEngine();
      appState.getIntelligenceManager().initializeLLMs();
      return { success: true };
    } catch (error: any) {
      console.error("Error saving Kimi API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("get-stored-credentials", async () => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const creds = CredentialsManager.getInstance().getAllCredentials();
      const hasKey = (key?: string) => !!(key && key.trim().length > 0);

      return {
        hasGeminiKey: hasKey(creds.geminiApiKey),
        hasGroqKey: hasKey(creds.groqApiKey),
        hasOpenaiKey: hasKey(creds.openaiApiKey),
        hasClaudeKey: hasKey(creds.claudeApiKey),
        hasKimiKey: hasKey(creds.kimiApiKey),
        hasNativelyKey: hasKey(creds.nativelyApiKey),
        googleServiceAccountPath: creds.googleServiceAccountPath || null,
        sttProvider: creds.sttProvider || "none",
        groqSttModel: creds.groqSttModel || "whisper-large-v3-turbo",
        hasSttGroqKey: hasKey(creds.groqSttApiKey),
        hasSttOpenaiKey: hasKey(creds.openAiSttApiKey),
        hasDeepgramKey: hasKey(creds.deepgramApiKey),
        hasElevenLabsKey: hasKey(creds.elevenLabsApiKey),
        hasAzureKey: hasKey(creds.azureApiKey),
        azureRegion: creds.azureRegion || "eastus",
        hasIbmWatsonKey: hasKey(creds.ibmWatsonApiKey),
        ibmWatsonRegion: creds.ibmWatsonRegion || "us-south",
        hasSonioxKey: hasKey(creds.sonioxApiKey),
        sttGroqKey: creds.groqSttApiKey ? `sk-...${creds.groqSttApiKey.slice(-4)}` : "",
        sttOpenaiKey: creds.openAiSttApiKey ? `sk-...${creds.openAiSttApiKey.slice(-4)}` : "",
        sttDeepgramKey: creds.deepgramApiKey ? `sk-...${creds.deepgramApiKey.slice(-4)}` : "",
        sttElevenLabsKey: creds.elevenLabsApiKey ? `sk-...${creds.elevenLabsApiKey.slice(-4)}` : "",
        sttAzureKey: creds.azureApiKey ? `sk-...${creds.azureApiKey.slice(-4)}` : "",
        sttIbmKey: creds.ibmWatsonApiKey ? `sk-...${creds.ibmWatsonApiKey.slice(-4)}` : "",
        sttSonioxKey: creds.sonioxApiKey ? `sk-...${creds.sonioxApiKey.slice(-4)}` : "",
        openAiSttBaseUrl: creds.openAiSttBaseUrl || "",
        hasTavilyKey: hasKey(creds.tavilyApiKey),
        geminiPreferredModel: creds.geminiPreferredModel || undefined,
        groqPreferredModel: creds.groqPreferredModel || undefined,
        openaiPreferredModel: creds.openaiPreferredModel || undefined,
        claudePreferredModel: creds.claudePreferredModel || undefined,
        kimiPreferredModel: creds.kimiPreferredModel || undefined,
      };
    } catch (error: any) {
      return {
        hasGeminiKey: false, hasGroqKey: false, hasOpenaiKey: false, hasClaudeKey: false, hasKimiKey: false, hasNativelyKey: false,
        googleServiceAccountPath: null, sttProvider: "none", groqSttModel: "whisper-large-v3-turbo",
        hasSttGroqKey: false, hasSttOpenaiKey: false, hasDeepgramKey: false, hasElevenLabsKey: false,
        hasAzureKey: false, azureRegion: "eastus", hasIbmWatsonKey: false, ibmWatsonRegion: "us-south",
        hasSonioxKey: false, hasTavilyKey: false,
        sttGroqKey: "", sttOpenaiKey: "", sttDeepgramKey: "", sttElevenLabsKey: "", sttAzureKey: "", sttIbmKey: "", sttSonioxKey: "",
      };
    }
  });

  safeHandle("select-service-account", async () => {
    try {
      const result: any = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const filePath = result.filePaths[0];
      appState.updateGoogleCredentials(filePath);
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setGoogleServiceAccountPath(filePath);
      return { success: true, path: filePath };
    } catch (error: any) {
      console.error("Error selecting service account:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("theme:get-mode", () => {
    const tm = appState.getThemeManager();
    return {
      mode: tm.getMode(),
      resolved: tm.getResolvedTheme(),
    };
  });

  safeHandle("theme:set-mode", (_, mode: "system" | "light" | "dark") => {
    appState.getThemeManager().setMode(mode);
    return { success: true };
  });

  safeHandle("get-verbose-logging", async () => {
    return appState.getVerboseLogging();
  });

  safeHandle("set-verbose-logging", async (_, enabled: boolean) => {
    appState.setVerboseLogging(enabled);
    return { success: true };
  });

  safeHandle("get-meeting-retention", async () => {
    return SettingsManager.getInstance().get("meetingRetention") ?? "forever";
  });

  safeHandle("set-meeting-retention", async (_, retention: "forever" | "7d" | "30d" | "never") => {
    if (!["forever", "7d", "30d", "never"].includes(retention)) {
      return { success: false, error: "invalid_retention" };
    }
    SettingsManager.getInstance().set("meetingRetention", retention);
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((win: any) => {
      if (!win.isDestroyed()) {
        win.webContents.send("meeting-retention-changed", retention);
      }
    });
    return { success: true };
  });

  safeHandle("get-provider-data-scopes", async () => {
    return SettingsManager.getInstance().get("providerDataScopes") ?? {};
  });

  safeHandle("set-provider-data-scopes", async (_, scopes: Record<string, boolean>) => {
    if (!scopes || typeof scopes !== "object") {
      return { success: false, error: "invalid_scopes" };
    }
    const allowedKeys = new Set(["transcript", "screenshots", "reference_files", "profile_history", "embeddings", "post_call_summary"]);
    const sanitized: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(scopes)) {
      if (allowedKeys.has(key) && typeof value === "boolean") {
        sanitized[key] = value;
      }
    }
    SettingsManager.getInstance().set("providerDataScopes", sanitized as any);
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((win: any) => {
      if (!win.isDestroyed()) {
        win.webContents.send("provider-data-scopes-changed", sanitized);
      }
    });
    return { success: true };
  });

  safeHandle("get-screen-understanding-mode", async () => {
    return SettingsManager.getInstance().getScreenUnderstandingMode();
  });

  safeHandle("set-screen-understanding-mode", async (_, mode: "vision_first" | "vision_only" | "private_vision") => {
    if (!["vision_first", "vision_only", "private_vision"].includes(mode)) {
      return { success: false, error: "invalid_mode" };
    }
    SettingsManager.getInstance().setScreenUnderstandingMode(mode);
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((win: any) => {
      if (!win.isDestroyed()) {
        win.webContents.send("screen-understanding-mode-changed", mode);
      }
    });
    return { success: true };
  });

  safeHandle("get-technical-interview-vision-first", async () => {
    return SettingsManager.getInstance().getTechnicalInterviewVisionFirst();
  });

  safeHandle("set-technical-interview-vision-first", async (_, enabled: boolean) => {
    if (typeof enabled !== "boolean") {
      return { success: false, error: "invalid_value" };
    }
    SettingsManager.getInstance().set("technicalInterviewVisionFirst", enabled);
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((win: any) => {
      if (!win.isDestroyed()) {
        win.webContents.send("technical-interview-vision-first-changed", enabled);
      }
    });
    return { success: true };
  });

  safeHandle("get-technical-interview-direct-vision", async () => {
    return SettingsManager.getInstance().getTechnicalInterviewVisionFirst();
  });

  safeHandle("set-technical-interview-direct-vision", async (_, enabled: boolean) => {
    if (typeof enabled !== "boolean") {
      return { success: false, error: "invalid_value" };
    }
    SettingsManager.getInstance().set("technicalInterviewVisionFirst", enabled);
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((win: any) => {
      if (!win.isDestroyed()) {
        win.webContents.send("technical-interview-vision-first-changed", enabled);
      }
    });
    return { success: true };
  });

  safeHandle("get-log-file-path", async () => {
    try {
      return path.join(app.getPath("documents"), "natively_debug.log");
    } catch {
      return null;
    }
  });

  safeHandle("open-log-file", async () => {
    try {
      const logPath = path.join(app.getPath("documents"), "natively_debug.log");
      if (!fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, "");
      }
      await shell.openPath(logPath);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.on("forward-log-to-file", (_event, level: string, msg: string) => {
    if (!appState.getVerboseLogging()) return;
    const tag = level === "error" ? "[RENDERER-ERROR]" : level === "warn" ? "[RENDERER-WARN]" : "[RENDERER]";
    console.log(`${tag} ${msg}`);
  });

  safeHandle("get-arch", async () => {
    return process.arch;
  });

  safeHandle("get-os-version", async () => {
    const platform = process.platform;
    if (platform === "darwin") {
      const darwinMajor = parseInt(os.release().split(".")[0] || "0", 10);
      const macosMajor = darwinMajor >= 25 ? darwinMajor + 1 : darwinMajor >= 20 ? darwinMajor - 9 : null;
      return macosMajor ? `macOS ${macosMajor}` : `macOS ${os.release()}`;
    }
    if (platform === "win32") {
      const release = os.release();
      const majorBuild = parseInt(release.split(".")[2] || "0", 10);
      return majorBuild >= 22000 ? "Windows 11" : "Windows 10";
    }
    return os.type();
  });

  safeHandle("permissions:check", async () => {
    if (process.platform === "darwin") {
      const mic = systemPreferences.getMediaAccessStatus("microphone");
      const screen = systemPreferences.getMediaAccessStatus("screen");
      return { microphone: mic, screen, platform: "darwin" };
    }
    return { microphone: "granted", screen: "granted", platform: process.platform };
  });

  safeHandle("permissions:request-mic", async () => {
    if (process.platform !== "darwin") return true;
    try {
      return await systemPreferences.askForMediaAccess("microphone");
    } catch {
      return false;
    }
  });

  safeHandle("get-reasoning-enabled", async () => {
    const { SettingsManager } = require("../services/SettingsManager");
    return SettingsManager.getInstance().get("reasoningEnabled") ?? false;
  });

  safeHandle("set-reasoning-enabled", async (_, enabled: boolean) => {
    const { SettingsManager } = require("../services/SettingsManager");
    SettingsManager.getInstance().set("reasoningEnabled", !!enabled);
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((win: any) => {
      if (!win.isDestroyed()) {
        win.webContents.send("reasoning-enabled-changed", !!enabled);
      }
    });
    return { success: true };
  });

  safeHandle("set-tavily-api-key", async (_, apiKey: string) => {
    try {
      if (apiKey && !apiKey.startsWith("tvly-")) {
        return { success: false, error: 'Invalid Tavily API key. Keys must start with "tvly-".' };
      }
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setTavilyApiKey(apiKey);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-open-at-login", async (_, openAtLogin: boolean) => {
    app.setLoginItemSettings({
      openAtLogin,
      openAsHidden: false,
      path: app.getPath("exe"),
    });
    return { success: true };
  });

  safeHandle("get-open-at-login", async () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  safeHandle("get-recognition-languages", async () => {
    const { RECOGNITION_LANGUAGES } = require("../config/languages");
    return RECOGNITION_LANGUAGES;
  });

  safeHandle("get-ai-response-languages", async () => {
    const { AI_RESPONSE_LANGUAGES } = require("../config/languages");
    return AI_RESPONSE_LANGUAGES;
  });

  safeHandle("set-ai-response-language", async (_, language: string) => {
    if (!language || typeof language !== "string" || !language.trim()) {
      console.warn("[IPC] set-ai-response-language: invalid or empty language received, ignoring.");
      return { success: false, error: "Invalid language value" };
    }
    const sanitizedLanguage = language.trim();
    const { CredentialsManager } = require("../services/CredentialsManager");
    CredentialsManager.getInstance().setAiResponseLanguage(sanitizedLanguage);
    const llmHelper = appState.processingHelper?.getLLMHelper?.();
    if (llmHelper) {
      llmHelper.setAiResponseLanguage(sanitizedLanguage);
      console.log(`[IPC] AI response language updated to: ${sanitizedLanguage}`);
    } else {
      console.warn("[IPC] set-ai-response-language: processingHelper or LLMHelper not ready, language saved to disk only.");
    }
    return { success: true };
  });

  safeHandle("get-stt-language", async () => {
    const { CredentialsManager } = require("../services/CredentialsManager");
    return CredentialsManager.getInstance().getSttLanguage();
  });

  safeHandle("get-ai-response-language", async () => {
    const { CredentialsManager } = require("../services/CredentialsManager");
    return CredentialsManager.getInstance().getAiResponseLanguage();
  });
}
