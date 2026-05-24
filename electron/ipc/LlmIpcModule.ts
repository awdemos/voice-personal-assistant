import { IpcMain, BrowserWindow } from "electron";
import { AppState } from "../main";
import { createSafeHandle } from "./types";
import { CHAT_MODE_PROMPT } from "../llm/prompts";
import { CodexCliService } from "../services/CodexCliService";
import { PhoneMirrorService } from "../services/PhoneMirrorService";

export function register(ipcMain: IpcMain, appState: AppState): void {
  const safeHandle = createSafeHandle(ipcMain);

  safeHandle("gemini-chat", async (event, message: string, imagePaths?: string[], context?: string, options?: { skipSystemPrompt?: boolean }) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().chatWithGemini(message, imagePaths, context, options?.skipSystemPrompt);
      console.log(`[IPC] gemini - chat response received`, { length: result?.length ?? 0 });
      if (!result || result.trim().length === 0) {
        console.warn("[IPC] Empty response from LLM, not updating IntelligenceManager");
        return "I apologize, but I couldn't generate a response. Please try again.";
      }
      const intelligenceManager = appState.getIntelligenceManager();
      intelligenceManager.addTranscript({
        text: message,
        speaker: "user",
        timestamp: Date.now(),
        final: true,
      }, true);
      console.log(`[IPC] Updating IntelligenceManager with assistant message...`);
      intelligenceManager.addAssistantMessage(result);
      console.log(`[IPC] Updated IntelligenceManager.Last message`, { length: intelligenceManager.getLastAssistantMessage()?.length ?? 0 });
      intelligenceManager.logUsage("chat", message, result);
      return result;
    } catch (error: any) {
      throw error;
    }
  });

  let _chatStreamId = 0;
  const IDENTITY_PROBE_RE = /^\s*(who\s+(are|r)\s+(you|u|this|natively)|what\s+(are|r)\s+(you|u)|are\s+you\s+(chatgpt|gpt[-\s]?\d?|claude|gemini|llama|an?\s+(ai|bot|llm|model|assistant))|what('?s|\s+is)\s+your\s+(name|model)|which\s+(ai|model|llm)\s+are\s+you|who\s+(made|built|created|developed|trained)\s+(you|this|natively)|what\s+model\s+(are\s+you|do\s+you\s+use)|introduce\s+yourself)\s*\??\s*$/i;
  const CREATOR_PROBE_RE = /^\s*(who\s+(made|built|created|developed|trained)\s+(you|this|natively))\s*\??\s*$/i;

  safeHandle("gemini-chat-stream", async (event, message: string, imagePaths?: string[], context?: string, options?: { skipSystemPrompt?: boolean, ignoreKnowledgeMode?: boolean }) => {
    try {
      console.log("[IPC] gemini-chat-stream started using LLMHelper.streamChat");
      const llmHelper = appState.processingHelper.getLLMHelper();
      const myStreamId = ++_chatStreamId;
      const intelligenceManager = appState.getIntelligenceManager();

      if (!imagePaths?.length && typeof message === "string") {
        const identityHit = CREATOR_PROBE_RE.test(message)
          ? "I was developed by Evin John."
          : (IDENTITY_PROBE_RE.test(message) ? "I'm Natively, an AI assistant." : null);
        if (identityHit) {
          intelligenceManager.addTranscript({ text: message, speaker: "user", timestamp: Date.now(), final: true }, true);
          try { PhoneMirrorService.getInstance().publishUserMessage(String(myStreamId), message); } catch (_) {}
          if (_chatStreamId !== myStreamId) {
            console.log(`[IPC] gemini-chat-stream ${myStreamId} (identity probe) superseded by ${_chatStreamId}, skipping emit.`);
            return null;
          }
          event.sender.send("gemini-stream-token", identityHit);
          event.sender.send("gemini-stream-done");
          try { PhoneMirrorService.getInstance().publishToken(String(myStreamId), identityHit); } catch (_) {}
          try { PhoneMirrorService.getInstance().publishDone(String(myStreamId), identityHit); } catch (_) {}
          intelligenceManager.addAssistantMessage(identityHit);
          intelligenceManager.logUsage("chat", message, identityHit);
          return null;
        }
      }

      let autoContextSnapshot: string | undefined;
      if (!context) {
        try {
          const snap = intelligenceManager.getFormattedContext(100);
          if (snap && snap.trim().length > 0) autoContextSnapshot = snap;
        } catch (ctxErr) {
          console.warn("[IPC] Failed to capture pre-turn context:", ctxErr);
        }
      }

      intelligenceManager.addTranscript({
        text: message,
        speaker: "user",
        timestamp: Date.now(),
        final: true,
      }, true);

      try { PhoneMirrorService.getInstance().publishUserMessage(String(myStreamId), message); } catch (_) {}

      let fullResponse = "";
      if (!context && autoContextSnapshot) {
        context = autoContextSnapshot;
        console.log(`[IPC] Auto-injected 100s context for gemini-chat-stream (${context.length} chars)`);
      }

      const systemPromptOverride: string | undefined = options?.skipSystemPrompt ? "" : CHAT_MODE_PROMPT;

      try {
        const stream = llmHelper.streamChat(message, imagePaths, context, systemPromptOverride, options?.ignoreKnowledgeMode);
        for await (const token of stream) {
          if (_chatStreamId !== myStreamId) {
            console.log(`[IPC] gemini-chat-stream ${myStreamId} superseded by ${_chatStreamId}, stopping.`);
            return null;
          }
          event.sender.send("gemini-stream-token", token);
          try { PhoneMirrorService.getInstance().publishToken(String(myStreamId), token); } catch (_) {}
          fullResponse += token;
        }
        if (_chatStreamId === myStreamId) {
          event.sender.send("gemini-stream-done");
          try { PhoneMirrorService.getInstance().publishDone(String(myStreamId), fullResponse); } catch (_) {}
          if (fullResponse.trim().length > 0) {
            intelligenceManager.addAssistantMessage(fullResponse);
            intelligenceManager.logUsage("chat", message, fullResponse);
          }
        }
      } catch (streamError: any) {
        console.error("[IPC] Streaming error:", streamError);
        if (_chatStreamId === myStreamId) {
          event.sender.send("gemini-stream-error", streamError.message || "Unknown streaming error");
          try { PhoneMirrorService.getInstance().publishError(String(myStreamId), streamError?.message || "Unknown streaming error"); } catch (_) {}
        }
      }
      return null;
    } catch (error: any) {
      console.error("[IPC] Error in gemini-chat-stream setup:", error);
      throw error;
    }
  });

  safeHandle("get-current-llm-config", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      return {
        provider: llmHelper.getCurrentProvider(),
        model: llmHelper.getCurrentModel(),
        isOllama: llmHelper.isUsingOllama(),
      };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("get-available-ollama-models", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      return await llmHelper.getOllamaModels();
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("switch-to-ollama", async (_, model?: string, url?: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchToOllama(model, url);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("force-restart-ollama", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const success = await llmHelper.forceRestartOllama();
      return { success };
    } catch (error: any) {
      console.error("Error force restarting Ollama:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("restart-ollama", async () => {
    try {
      await appState.processingHelper.getLLMHelper().forceRestartOllama();
      return true;
    } catch (error: any) {
      console.error("[IPC restart-ollama] Failed to restart:", error);
      return false;
    }
  });

  safeHandle("ensure-ollama-running", async () => {
    try {
      const { OllamaManager } = require("../services/OllamaManager");
      await OllamaManager.getInstance().init();
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  });

  safeHandle("switch-to-gemini", async (_, apiKey?: string, modelId?: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchToGemini(apiKey, modelId);
      if (apiKey) {
        const { CredentialsManager } = require("../services/CredentialsManager");
        CredentialsManager.getInstance().setGeminiApiKey(apiKey);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("get-custom-providers", async () => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const cm = CredentialsManager.getInstance();
      const curlProviders = cm.getCurlProviders();
      const legacyProviders = cm.getCustomProviders() || [];
      return [...curlProviders, ...legacyProviders];
    } catch (error: any) {
      console.error("Error getting custom providers:", error);
      return [];
    }
  });

  safeHandle("save-custom-provider", async (_, provider: unknown) => {
    try {
      if (
        typeof provider !== "object" || provider === null ||
        typeof (provider as any).id !== "string" ||
        typeof (provider as any).name !== "string" ||
        typeof (provider as any).curlCommand !== "string"
      ) {
        console.error("[IPC] save-custom-provider: invalid payload shape", typeof provider);
        return { success: false, error: "Invalid provider payload" };
      }
      const curlCmd: string = (provider as any).curlCommand;
      if (!curlCmd.includes("{{TEXT}}")) {
        return { success: false, error: "curlCommand must contain {{TEXT}} placeholder for the prompt" };
      }
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().saveCurlProvider(provider);
      return { success: true };
    } catch (error: any) {
      console.error("Error saving custom provider:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("delete-custom-provider", async (_, id: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().deleteCurlProvider(id);
      CredentialsManager.getInstance().deleteCustomProvider(id);
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting custom provider:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("switch-to-custom-provider", async (_, providerId: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const cm = CredentialsManager.getInstance();
      const provider = [
        ...(cm.getCurlProviders() || []),
        ...(cm.getCustomProviders() || []),
      ].find((p: any) => p.id === providerId);
      if (!provider) throw new Error("Provider not found");
      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchToCustom(provider);
      appState.getIntelligenceManager().initializeLLMs();
      return { success: true };
    } catch (error: any) {
      console.error("Error switching to custom provider:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("get-curl-providers", async () => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      return CredentialsManager.getInstance().getCurlProviders();
    } catch (error: any) {
      console.error("Error getting curl providers:", error);
      return [];
    }
  });

  safeHandle("save-curl-provider", async (_, provider: any) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().saveCurlProvider(provider);
      return { success: true };
    } catch (error: any) {
      console.error("Error saving curl provider:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("delete-curl-provider", async (_, id: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().deleteCurlProvider(id);
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting curl provider:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("switch-to-curl-provider", async (_, providerId: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const provider = CredentialsManager.getInstance().getCurlProviders().find((p: any) => p.id === providerId);
      if (!provider) throw new Error("Provider not found");
      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchToCurl(provider);
      appState.getIntelligenceManager().initializeLLMs();
      return { success: true };
    } catch (error: any) {
      console.error("Error switching to curl provider:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("fetch-provider-models", async (_, provider: "gemini" | "groq" | "openai" | "claude" | "kimi", apiKey: string) => {
    try {
      let key = apiKey?.trim();
      if (!key) {
        const { CredentialsManager } = require("../services/CredentialsManager");
        const cm = CredentialsManager.getInstance();
        if (provider === "gemini") key = cm.getGeminiApiKey();
        else if (provider === "groq") key = cm.getGroqApiKey();
        else if (provider === "openai") key = cm.getOpenaiApiKey();
        else if (provider === "claude") key = cm.getClaudeApiKey();
        else if (provider === "kimi") key = cm.getKimiApiKey();
      }
      if (!key) {
        return { success: false, error: "No API key available. Please save a key first." };
      }
      const { fetchProviderModels } = require("../utils/modelFetcher");
      const models = await fetchProviderModels(provider, key);
      return { success: true, models };
    } catch (error: any) {
      console.error(`[IPC] Failed to fetch ${provider} models:`, error);
      const msg = error?.response?.data?.error?.message || error.message || "Failed to fetch models";
      return { success: false, error: msg };
    }
  });

  safeHandle("set-provider-preferred-model", async (_, provider: "gemini" | "groq" | "openai" | "claude" | "kimi", modelId: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setPreferredModel(provider, modelId);
    } catch (error: any) {
      console.error(`[IPC] Failed to set preferred model for ${provider}:`, error);
    }
  });

  safeHandle("test-llm-connection", async (_, provider: "gemini" | "groq" | "openai" | "claude" | "kimi", apiKey?: string) => {
    console.log(`[IPC] Received test-llm-connection request for provider: ${provider}`);
    try {
      if (!apiKey || !apiKey.trim()) {
        const { CredentialsManager } = require("../services/CredentialsManager");
        const creds = CredentialsManager.getInstance();
        if (provider === "gemini") apiKey = creds.getGeminiApiKey();
        else if (provider === "groq") apiKey = creds.getGroqApiKey();
        else if (provider === "openai") apiKey = creds.getOpenaiApiKey();
        else if (provider === "claude") apiKey = creds.getClaudeApiKey();
        else if (provider === "kimi") apiKey = creds.getKimiApiKey();
      }
      if (!apiKey || !apiKey.trim()) {
        return { success: false, error: "No API key provided" };
      }
      const axios = require("axios");
      let response;
      if (provider === "gemini") {
        response = await axios.post(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent",
          { contents: [{ parts: [{ text: "Hello" }] }] },
          { headers: { "x-goog-api-key": apiKey }, timeout: 15000 }
        );
      } else if (provider === "groq") {
        response = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          { model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: "Hello" }] },
          { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 }
        );
      } else if (provider === "openai") {
        response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          { model: "gpt-4o-mini", messages: [{ role: "user", content: "Hello" }] },
          { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 }
        );
      } else if (provider === "claude") {
        response = await axios.post(
          "https://api.anthropic.com/v1/messages",
          { model: "claude-sonnet-4-6", max_tokens: 10, messages: [{ role: "user", content: "Hello" }] },
          { headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" }, timeout: 15000 }
        );
      } else if (provider === "kimi") {
        response = await axios.post(
          "https://api.moonshot.cn/v1/chat/completions",
          { model: "kimi-k2.6-fast", messages: [{ role: "user", content: "Hello" }] },
          { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 }
        );
      }
      if (response && (response.status === 200 || response.status === 201)) {
        return { success: true };
      }
      return { success: false, error: "Request failed with status " + response?.status };
    } catch (error: any) {
      const safeInfo = {
        provider,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        code: error?.code,
        message: error?.message,
        responseError: error?.response?.data?.error?.message || error?.response?.data?.message,
      };
      console.error("LLM connection test failed:", safeInfo);
      const rawMsg = error?.response?.data?.error?.message || error?.response?.data?.message || (error.response?.data?.error?.type ? `${error.response.data.error.type}: ${error.response.data.error.message}` : error.message) || "Connection failed";
      return { success: false, error: rawMsg };
    }
  });

  safeHandle("get-groq-fast-text-mode", () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      return { enabled: llmHelper.getGroqFastTextMode() };
    } catch {
      return { enabled: false };
    }
  });

  safeHandle("set-groq-fast-text-mode", (_, enabled: boolean) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setGroqFastTextMode(enabled);
      const { SettingsManager } = require("../services/SettingsManager");
      SettingsManager.getInstance().set("groqFastTextMode", enabled);
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send("groq-fast-text-changed", enabled);
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("get-codex-cli-config", () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      return llmHelper.getCodexCliConfig();
    } catch {
      return CodexCliService.normalizeConfig({});
    }
  });

  safeHandle("set-codex-cli-config", (_, config: any) => {
    try {
      const normalized = CodexCliService.normalizeConfig(config || {});
      const sm = require("../services/SettingsManager").SettingsManager.getInstance();
      sm.set("codexCliEnabled", normalized.enabled);
      sm.set("codexCliPath", normalized.path);
      sm.set("codexCliModel", normalized.model);
      sm.set("codexCliFastModel", normalized.fastModel);
      sm.set("codexCliTimeoutMs", normalized.timeoutMs);
      sm.set("codexCliSandboxMode", normalized.sandboxMode);
      appState.processingHelper.getLLMHelper().setCodexCliConfig(normalized);
      return { success: true, config: normalized };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("test-codex-cli", async (_, config?: any) => {
    try {
      const current = appState.processingHelper.getLLMHelper().getCodexCliConfig();
      const normalized = CodexCliService.normalizeConfig({ ...current, ...(config || {}) });
      const result = await CodexCliService.validateExecutable(normalized.path);
      if (result.success && result.resolvedPath && result.resolvedPath !== normalized.path) {
        const updated = CodexCliService.normalizeConfig({ ...normalized, path: result.resolvedPath });
        const sm = require("../services/SettingsManager").SettingsManager.getInstance();
        sm.set("codexCliPath", updated.path);
        appState.processingHelper.getLLMHelper().setCodexCliConfig(updated);
        return { success: true, resolvedPath: result.resolvedPath, config: updated };
      }
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-model", async (_, modelId: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const { CredentialsManager } = require("../services/CredentialsManager");
      const cm = CredentialsManager.getInstance();
      const curlProviders = cm.getCurlProviders();
      const legacyProviders = cm.getCustomProviders() || [];
      const allProviders = [...curlProviders, ...legacyProviders];
      llmHelper.setModel(modelId, allProviders);
      appState.modelSelectorWindowHelper.hideWindow();
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send("model-changed", modelId);
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error setting model:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-default-model", async (_, modelId: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const cm = CredentialsManager.getInstance();
      cm.setDefaultModel(modelId);
      const llmHelper = appState.processingHelper.getLLMHelper();
      const curlProviders = cm.getCurlProviders();
      const legacyProviders = cm.getCustomProviders() || [];
      const allProviders = [...curlProviders, ...legacyProviders];
      llmHelper.setModel(modelId, allProviders);
      appState.modelSelectorWindowHelper.hideWindow();
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send("model-changed", modelId);
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error setting default model:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("get-default-model", async () => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      const cm = CredentialsManager.getInstance();
      return { model: cm.getDefaultModel() };
    } catch {
      return { model: "kimi-k2.6-fast" };
    }
  });

  safeHandle("show-model-selector", (_, coords: { x: number; y: number }) => {
    appState.modelSelectorWindowHelper.showWindow(coords.x, coords.y);
  });

  safeHandle("hide-model-selector", () => {
    appState.modelSelectorWindowHelper.hideWindow();
  });

  safeHandle("toggle-model-selector", (_, coords: { x: number; y: number }) => {
    appState.modelSelectorWindowHelper.toggleWindow(coords.x, coords.y);
  });

  safeHandle("model-selector:close-if-open", () => {
    const win = appState.modelSelectorWindowHelper.getWindow();
    if (win && !win.isDestroyed() && win.isVisible()) {
      appState.modelSelectorWindowHelper.hideWindow();
    }
  });

  safeHandle("get-reasoning-enabled", async () => {
    const { SettingsManager } = require("../services/SettingsManager");
    return SettingsManager.getInstance().get("reasoningEnabled") ?? false;
  });

  safeHandle("set-reasoning-enabled", async (_, enabled: boolean) => {
    const { SettingsManager } = require("../services/SettingsManager");
    SettingsManager.getInstance().set("reasoningEnabled", !!enabled);
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("reasoning-enabled-changed", !!enabled);
      }
    });
    return { success: true };
  });
}
