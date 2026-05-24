import { IpcMain, BrowserWindow } from "electron";
import { AppState } from "../main";
import { createSafeHandle } from "./types";
import { SettingsManager } from "../services/SettingsManager";

export function register(ipcMain: IpcMain, appState: AppState): void {
  const safeHandle = createSafeHandle(ipcMain);

  safeHandle("generate-suggestion", async (event, context: string, lastQuestion: string) => {
    try {
      const suggestion = await appState.processingHelper.getLLMHelper().generateSuggestion(context, lastQuestion);
      return { suggestion };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("generate-assist", async () => {
    try {
      const intelligenceManager = appState.getIntelligenceManager();
      const insight = await intelligenceManager.runAssistMode();
      return { insight };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("generate-what-to-say", async (_, question?: string, imagePaths?: string[], options?: { promptInstruction?: string }) => {
    try {
      let screenContext: any;
      let screenContextStatus: "not_available" | "available" | "failed" = "not_available";
      let visionProviderUsed: string | undefined;
      let visionModelUsed: string | undefined;
      let visionAttempts: number | undefined;
      let visionFailureReason: string | undefined;

      const validatedImagePaths: string[] | undefined = imagePaths?.length ? [] : undefined;

      if (imagePaths && imagePaths.length > 0) {
        if (!Array.isArray(imagePaths) || imagePaths.length > 5 || imagePaths.some((imagePath) => typeof imagePath !== "string" || imagePath.trim().length === 0)) {
          console.warn("[IPC] generate-what-to-say: malformed image path payload rejected");
          return { answer: null, question: question || "unknown", screenContextStatus, error: "Invalid image path payload" };
        }
        const { app } = require("electron");
        const { validateImagePath } = require("../utils/curlUtils");
        const userDataDir = app.getPath("userData");
        for (const imagePath of imagePaths) {
          const validation = validateImagePath(imagePath, userDataDir);
          if (!validation.isValid) {
            console.warn(`[IPC] generate-what-to-say: invalid image path rejected: ${validation.reason}`);
            return { answer: null, question: question || "unknown", screenContextStatus, error: `Invalid image path: ${validation.reason}` };
          }
          validatedImagePaths!.push(imagePath);
        }
        try {
          const { getScreenUnderstandingService } = require("../services/screen/ScreenUnderstandingService");
          const { CredentialsManager } = require("../services/CredentialsManager");
          const sus = getScreenUnderstandingService();
          const settings = SettingsManager.getInstance();
          const credentials = CredentialsManager.getInstance();
          const providerScopes = settings.get("providerDataScopes") || {};
          const sur = await sus.understand({
            modeId: "what-to-say",
            transcript: question,
            userAction: "what_to_say",
            qualityMode: "balanced",
            imagePaths: validatedImagePaths,
            screenUnderstandingMode: settings.getScreenUnderstandingMode(),
            technicalInterviewVisionFirst: settings.getTechnicalInterviewVisionFirst(),
            providerPolicy: {
              localOnly: settings.getScreenUnderstandingMode() === "private_vision",
              allowScreenshots: providerScopes.screenshots !== false,
              visionAvailable: credentials.anyVisionProviderConfigured?.() ?? true,
              localVisionAvailable: credentials.anyLocalVisionProviderConfigured?.() ?? false,
            },
          });
          screenContext = sur.status === "available" ? sur : undefined;
          screenContextStatus = sur.status === "available" ? "available" : (sur.status === "failed" ? "failed" : "not_available");
          visionProviderUsed = sur.providerUsed;
          visionModelUsed = sur.modelUsed;
          visionAttempts = Array.isArray(sur.attempts) ? sur.attempts.length : undefined;
          visionFailureReason = sur.failureReason;
        } catch (sErr: any) {
          screenContextStatus = "failed";
          console.warn("[IPC] generate-what-to-say: ScreenUnderstandingService failed", { errorClass: sErr?.name || "Error" });
        }
      }

      const intelligenceManager = appState.getIntelligenceManager();
      const answer = await intelligenceManager.runWhatShouldISay(question, 0.8, validatedImagePaths, {
        skipCooldown: process.env.NODE_ENV === "test",
        screenContext,
        promptInstruction: typeof options?.promptInstruction === "string" ? options.promptInstruction : undefined,
      });
      return {
        answer,
        question: question || "inferred from context",
        screenContextStatus,
        visionProviderUsed,
        visionModelUsed,
        visionAttempts,
        visionFailureReason,
        imageCount: validatedImagePaths?.length || 0,
        usedImageInput: Boolean(validatedImagePaths?.length),
      };
    } catch (error: any) {
      console.error("[IPC] generate-what-to-say error:", error);
      return { answer: null, question: question || "unknown", error: error?.message || "unknown_error" };
    }
  });

  safeHandle("generate-clarify", async () => {
    try {
      const intelligenceManager = appState.getIntelligenceManager();
      const clarification = await intelligenceManager.runClarify();
      if (clarification === null) {
        const win = appState.getMainWindow();
        win?.webContents.send("intelligence-error", { error: "Could not generate a clarifying question. Try again after some audio context is available.", mode: "clarify" });
      }
      return { clarification };
    } catch (error: any) {
      throw error;
    }
  });

  async function optimizeImagesForVision(paths: string[], handlerLabel: string, profile: "fast" | "balanced" | "technical" | "best" = "technical"): Promise<string[]> {
    if (paths.length === 0) return paths;
    try {
      const { getImageOptimizer } = require("../services/screen/ImageOptimizer");
      const optimizer = getImageOptimizer();
      const optimized: string[] = [];
      for (const p of paths) {
        try {
          const out = await optimizer.optimize(p, { profile, provider: "openai", cacheKey: p });
          optimized.push(out.path);
        } catch (err: any) {
          console.warn(`[IPC] ${handlerLabel}: image optimization failed for ${p}, using original`, { errorClass: err?.name });
          optimized.push(p);
        }
      }
      return optimized;
    } catch {
      return paths;
    }
  }

  safeHandle("generate-code-hint", async (_, imagePaths?: string[], problemStatement?: string) => {
    try {
      const screenshotQueue = appState.getScreenshotQueue();
      const resolvedImagePaths: string[] = imagePaths && imagePaths.length > 0 ? imagePaths : screenshotQueue;
      if (imagePaths && imagePaths.length > 0) {
        const { app } = require("electron");
        const { validateImagePath } = require("../utils/curlUtils");
        const userDataDir = app.getPath("userData");
        for (const imagePath of imagePaths) {
          const validation = validateImagePath(imagePath, userDataDir);
          if (!validation.isValid) {
            console.warn(`[IPC] generate-code-hint: invalid image path rejected: ${validation.reason}`);
            return { error: `Invalid image path: ${validation.reason}`, hint: null };
          }
        }
      }
      console.log(`[IPC] generate-code-hint: using ${resolvedImagePaths.length} image(s)`);
      const optimizedPaths = await optimizeImagesForVision(resolvedImagePaths, "generate-code-hint", "technical");
      const intelligenceManager = appState.getIntelligenceManager();
      const hint = await intelligenceManager.runCodeHint(optimizedPaths.length > 0 ? optimizedPaths : undefined, problemStatement);
      return { hint };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("generate-brainstorm", async (_, imagePaths?: string[], problemStatement?: string) => {
    try {
      const screenshotQueue = appState.getScreenshotQueue();
      const resolvedImagePaths: string[] = imagePaths && imagePaths.length > 0 ? imagePaths : screenshotQueue;
      if (imagePaths && imagePaths.length > 0) {
        const { app } = require("electron");
        const { validateImagePath } = require("../utils/curlUtils");
        const userDataDir = app.getPath("userData");
        for (const imagePath of imagePaths) {
          const validation = validateImagePath(imagePath, userDataDir);
          if (!validation.isValid) {
            console.warn(`[IPC] generate-brainstorm: invalid image path rejected: ${validation.reason}`);
            return { error: `Invalid image path: ${validation.reason}`, script: null };
          }
        }
      }
      console.log(`[IPC] generate-brainstorm: using ${resolvedImagePaths.length} image(s)`);
      const optimizedPaths = await optimizeImagesForVision(resolvedImagePaths, "generate-brainstorm", "balanced");
      const intelligenceManager = appState.getIntelligenceManager();
      const script = await intelligenceManager.runBrainstorm(optimizedPaths.length > 0 ? optimizedPaths : undefined, problemStatement);
      return { script };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("get-action-button-mode", () => {
    const sm = require("../services/SettingsManager").SettingsManager.getInstance();
    return sm.get("actionButtonMode") ?? "recap";
  });

  safeHandle("set-action-button-mode", (_, mode: "recap" | "brainstorm") => {
    const sm = require("../services/SettingsManager").SettingsManager.getInstance();
    sm.set("actionButtonMode", mode);
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("action-button-mode-changed", mode);
      }
    });
    return { success: true };
  });

  safeHandle("generate-follow-up", async (_, intent: string, userRequest?: string) => {
    try {
      const intelligenceManager = appState.getIntelligenceManager();
      const refined = await intelligenceManager.runFollowUp(intent, userRequest);
      return { refined, intent };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("generate-recap", async () => {
    try {
      const intelligenceManager = appState.getIntelligenceManager();
      const summary = await intelligenceManager.runRecap();
      return { summary };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("generate-follow-up-questions", async () => {
    try {
      const intelligenceManager = appState.getIntelligenceManager();
      const questions = await intelligenceManager.runFollowUpQuestions();
      return { questions };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("submit-manual-question", async (_, question: string) => {
    try {
      const intelligenceManager = appState.getIntelligenceManager();
      const answer = await intelligenceManager.runManualAnswer(question);
      return { answer, question };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("get-intelligence-context", async () => {
    try {
      const intelligenceManager = appState.getIntelligenceManager();
      return {
        context: intelligenceManager.getFormattedContext(),
        lastAssistantMessage: intelligenceManager.getLastAssistantMessage(),
        activeMode: intelligenceManager.getActiveMode(),
      };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("reset-intelligence", async () => {
    try {
      const intelligenceManager = appState.getIntelligenceManager();
      intelligenceManager.reset();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("dynamic-action:accept", async (_, actionId: string) => {
    try {
      if (typeof actionId !== "string" || !actionId) {
        return { success: false, error: "invalid_action_id" };
      }
      const intelligenceManager = appState.getIntelligenceManager();
      const action = intelligenceManager.acceptDynamicAction(actionId);
      if (!action) return { success: false, error: "not_found" };
      try {
        const { telemetryService } = require("../services/telemetry/TelemetryService");
        telemetryService.track({
          name: "dynamic_action_accepted",
          sessionId: action.sessionId,
          modeId: action.modeId,
          properties: { actionId: action.id, actionType: action.type, modeTemplateType: action.modeTemplateType },
        });
      } catch {}
      return { success: true, action };
    } catch (error: any) {
      return { success: false, error: error?.message ?? "internal_error" };
    }
  });

  safeHandle("dynamic-action:dismiss", async (_, actionId: string) => {
    try {
      if (typeof actionId !== "string" || !actionId) {
        return { success: false, error: "invalid_action_id" };
      }
      const intelligenceManager = appState.getIntelligenceManager();
      intelligenceManager.dismissDynamicAction(actionId);
      try {
        const { telemetryService } = require("../services/telemetry/TelemetryService");
        telemetryService.track({ name: "dynamic_action_dismissed", properties: { actionId } });
      } catch {}
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? "internal_error" };
    }
  });

  safeHandle("dynamic-action:list", async () => {
    try {
      const intelligenceManager = appState.getIntelligenceManager();
      return { success: true, actions: intelligenceManager.getActiveDynamicActions() };
    } catch (error: any) {
      return { success: false, error: error?.message ?? "internal_error", actions: [] };
    }
  });

  safeHandle("test-inject-transcript", async (_, segment: { speaker: string; text: string; timestamp?: number; final?: boolean }) => {
    try {
      if (process.env.NODE_ENV !== "test") return { success: false, error: "test_only" };
      const intelligenceManager = appState.getIntelligenceManager();
      intelligenceManager.addTranscript({
        speaker: segment.speaker,
        text: segment.text,
        timestamp: segment.timestamp ?? Date.now(),
        final: segment.final ?? true,
      }, true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("test-get-mode-context", async () => {
    try {
      if (process.env.NODE_ENV !== "test") return { success: false, error: "test_only" };
      const { ModesManager } = require("../services/ModesManager");
      const manager = ModesManager.getInstance();
      return { success: true, block: manager.buildActiveModeContextBlock(), suffix: manager.getActiveModeSystemPromptSuffix() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
