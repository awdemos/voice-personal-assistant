import { IpcMain, BrowserWindow, shell } from "electron";
import { AppState } from "../main";
import { createSafeHandle, isProOrTrialActive, clearActiveModeOnLicenseLoss } from "./types";
import { DatabaseManager } from "../db/DatabaseManager";
import { TRIAL_SENTINEL_KEY } from "../config/constants";
import { PhoneMirrorService } from "../services/PhoneMirrorService";

export function register(ipcMain: IpcMain, appState: AppState): void {
  const safeHandle = createSafeHandle(ipcMain);

  safeHandle("test-release-fetch", async () => {
    try {
      console.log("[IPC] Manual Test Fetch triggered (forcing refresh)...");
      const { ReleaseNotesManager } = require("../update/ReleaseNotesManager");
      const notes = await ReleaseNotesManager.getInstance().fetchReleaseNotes("latest", true);
      if (notes) {
        console.log("[IPC] Notes fetched for:", notes.version);
        const info = {
          version: notes.version || "latest",
          files: [] as any[],
          path: "",
          sha512: "",
          releaseName: notes.summary,
          releaseNotes: notes.fullBody,
          parsedNotes: notes,
        };
        appState.getMainWindow()?.webContents.send("update-available", info);
        return { success: true };
      }
      return { success: false, error: "No notes returned" };
    } catch (err: any) {
      console.error("[IPC] test-release-fetch failed:", err);
      return { success: false, error: err.message };
    }
  });

  safeHandle("quit-app", () => {
    const { app } = require("electron");
    app.quit();
  });

  safeHandle("quit-and-install-update", async () => {
    try {
      console.log("[IPC] Quit and install update requested");
      await appState.quitAndInstallUpdate();
      return { success: true };
    } catch (err: any) {
      console.error("[IPC] quit-and-install-update failed:", err);
      return { success: false, error: err.message };
    }
  });

  safeHandle("check-for-updates", async () => {
    try {
      console.log("[IPC] Manual update check requested");
      await appState.checkForUpdates();
      return { success: true };
    } catch (err: any) {
      console.error("[IPC] check-for-updates failed:", err);
      return { success: false, error: err.message };
    }
  });

  safeHandle("download-update", async () => {
    try {
      console.log("[IPC] Download update requested");
      appState.downloadUpdate();
      return { success: true };
    } catch (err: any) {
      console.error("[IPC] download-update failed:", err);
      return { success: false, error: err.message };
    }
  });

  safeHandle("delete-meeting", async (_, id: string) => {
    return DatabaseManager.getInstance().deleteMeeting(id);
  });

  safeHandle("get-meeting-active", async () => {
    return appState.getIsMeetingActive();
  });

  safeHandle("reset-queues", async () => {
    try {
      appState.clearQueues();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("start-meeting", async (event, metadata?: any) => {
    try {
      await appState.startMeeting(metadata);
      return { success: true };
    } catch (error: any) {
      console.error("Error starting meeting:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("end-meeting", async () => {
    try {
      await appState.endMeeting();
      return { success: true };
    } catch (error: any) {
      console.error("Error ending meeting:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("get-recent-meetings", async () => {
    return DatabaseManager.getInstance().getRecentMeetings(50);
  });

  safeHandle("get-meeting-details", async (event, id) => {
    return DatabaseManager.getInstance().getMeetingDetails(id);
  });

  safeHandle("update-meeting-title", async (_, { id, title }: { id: string; title: string }) => {
    return DatabaseManager.getInstance().updateMeetingTitle(id, title);
  });

  safeHandle("update-meeting-summary", async (_, { id, updates }: { id: string; updates: any }) => {
    return DatabaseManager.getInstance().updateMeetingSummary(id, updates);
  });

  safeHandle("seed-demo", async () => {
    DatabaseManager.getInstance().seedDemoMeeting();
    const ragManager = appState.getRAGManager();
    if (ragManager && ragManager.isReady()) {
      ragManager.ensureDemoMeetingProcessed().catch(console.error);
    }
    return { success: true };
  });

  safeHandle("flush-database", async () => {
    const result = DatabaseManager.getInstance().clearAllData();
    return { success: result };
  });

  safeHandle("open-external", async (event, url: string) => {
    try {
      if (typeof url !== "string") {
        console.warn("[IPC] Blocked invalid open-external request", { reason: "non-string" });
        return;
      }
      const parsed = new URL(url);
      const allowedWebUrl = parsed.protocol === "https:" && parsed.hostname === "mail.google.com" && parsed.pathname === "/mail/";
      const allowedSystemSettingsUrl = parsed.protocol === "x-apple.systempreferences:";
      if (allowedWebUrl || allowedSystemSettingsUrl) {
        await shell.openExternal(url);
      } else {
        console.warn("[IPC] Blocked open-external request", { protocol: parsed.protocol, hostname: parsed.hostname });
      }
    } catch {
      console.warn("[IPC] Invalid URL in open-external");
    }
  });

  safeHandle("calendar-connect", async () => {
    try {
      const { CalendarManager } = require("../services/CalendarManager");
      await CalendarManager.getInstance().startAuthFlow();
      return { success: true };
    } catch (error: any) {
      console.error("Calendar auth error:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("calendar-disconnect", async () => {
    const { CalendarManager } = require("../services/CalendarManager");
    await CalendarManager.getInstance().disconnect();
    return { success: true };
  });

  safeHandle("get-calendar-status", async () => {
    const { CalendarManager } = require("../services/CalendarManager");
    return CalendarManager.getInstance().getConnectionStatus();
  });

  safeHandle("get-upcoming-events", async () => {
    const { CalendarManager } = require("../services/CalendarManager");
    return CalendarManager.getInstance().getUpcomingEvents();
  });

  safeHandle("calendar-refresh", async () => {
    const { CalendarManager } = require("../services/CalendarManager");
    await CalendarManager.getInstance().refreshState();
    return { success: true };
  });

  safeHandle("generate-followup-email", async (_, input: any) => {
    try {
      const { FOLLOWUP_EMAIL_PROMPT, GROQ_FOLLOWUP_EMAIL_PROMPT } = require("../llm/prompts");
      const { buildFollowUpEmailPromptInput } = require("../utils/emailUtils");
      const llmHelper = appState.processingHelper.getLLMHelper();
      const contextString = buildFollowUpEmailPromptInput(input);
      const geminiPrompt = `${FOLLOWUP_EMAIL_PROMPT}\n\nMEETING DETAILS:\n${contextString}`;
      const groqPrompt = `${GROQ_FOLLOWUP_EMAIL_PROMPT}\n\nMEETING DETAILS:\n${contextString}`;
      const emailBody = await llmHelper.chatWithGemini(geminiPrompt, undefined, undefined, true, groqPrompt);
      return emailBody;
    } catch (error: any) {
      console.error("Error generating follow-up email:", error);
      throw error;
    }
  });

  safeHandle("extract-emails-from-transcript", async (_, transcript: Array<{ text: string }>) => {
    try {
      const { extractEmailsFromTranscript } = require("../utils/emailUtils");
      return extractEmailsFromTranscript(transcript);
    } catch (error: any) {
      console.error("Error extracting emails:", error);
      return [];
    }
  });

  safeHandle("get-calendar-attendees", async (_, eventId: string) => {
    try {
      const { CalendarManager } = require("../services/CalendarManager");
      const cm = CalendarManager.getInstance();
      const events = await cm.getUpcomingEvents();
      const event = events?.find((e: any) => e.id === eventId);
      if (event && event.attendees) {
        return event.attendees.map((a: any) => ({
          email: a.email,
          name: a.displayName || a.email?.split("@")[0] || "",
        })).filter((a: any) => a.email);
      }
      return [];
    } catch (error: any) {
      console.error("Error getting calendar attendees:", error);
      return [];
    }
  });

  safeHandle("open-mailto", async (_, { to, subject, body }: { to: string; subject: string; body: string }) => {
    try {
      const { buildMailtoLink } = require("../utils/emailUtils");
      const mailtoUrl = buildMailtoLink(to, subject, body);
      await shell.openExternal(mailtoUrl);
      return { success: true };
    } catch (error: any) {
      console.error("Error opening mailto:", error);
      return { success: false, error: error.message };
    }
  });

  const activeRAGQueries = new Map<string, AbortController>();

  safeHandle("rag:query-meeting", async (event, { meetingId, query }: { meetingId: string; query: string }) => {
    const ragManager = appState.getRAGManager();
    if (!ragManager || !ragManager.isReady()) {
      console.log("[RAG] Not ready, falling back to regular chat");
      return { fallback: true };
    }
    if (!ragManager.isMeetingProcessed(meetingId) && !ragManager.isLiveIndexingActive(meetingId)) {
      console.log(`[RAG] Meeting ${meetingId} not processed and no JIT indexing, falling back to regular chat`);
      return { fallback: true };
    }
    const abortController = new AbortController();
    const queryKey = `meeting-${meetingId}`;
    activeRAGQueries.set(queryKey, abortController);
    try {
      const stream = ragManager.queryMeeting(meetingId, query, abortController.signal);
      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;
        event.sender.send("rag:stream-chunk", { meetingId, chunk });
      }
      event.sender.send("rag:stream-complete", { meetingId });
      return { success: true };
    } catch (error: any) {
      if (error.name !== "AbortError") {
        const msg = error.message || "";
        if (msg.includes("NO_RELEVANT_CONTEXT") || msg.includes("NO_MEETING_EMBEDDINGS")) {
          console.log(`[RAG] Query failed with '${msg}', falling back to regular chat`);
          return { fallback: true };
        }
        console.error("[RAG] Query error:", error);
        event.sender.send("rag:stream-error", { meetingId, error: msg });
      }
      return { success: false, error: error.message };
    } finally {
      activeRAGQueries.delete(queryKey);
    }
  });

  safeHandle("rag:query-live", async (event, { query }: { query: string }) => {
    const ragManager = appState.getRAGManager();
    if (!ragManager || !ragManager.isReady()) {
      return { fallback: true };
    }
    if (!ragManager.isLiveIndexingActive("live-meeting-current") || !ragManager.hasLiveChunks()) {
      return { fallback: true };
    }
    const abortController = new AbortController();
    const queryKey = `live-${Date.now()}`;
    activeRAGQueries.set(queryKey, abortController);
    try {
      const stream = ragManager.queryMeeting("live-meeting-current", query, abortController.signal);
      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;
        event.sender.send("rag:stream-chunk", { live: true, chunk });
      }
      event.sender.send("rag:stream-complete", { live: true });
      return { success: true };
    } catch (error: any) {
      if (error.name !== "AbortError") {
        const msg = error.message || "";
        if (msg.includes("NO_RELEVANT_CONTEXT") || msg.includes("NO_MEETING_EMBEDDINGS")) {
          console.log(`[RAG] JIT query failed with '${msg}', falling back to regular live chat`);
          return { fallback: true };
        }
        console.error("[RAG] Live query error:", error);
        event.sender.send("rag:stream-error", { live: true, error: msg });
      }
      return { success: false, error: error.message };
    } finally {
      activeRAGQueries.delete(queryKey);
    }
  });

  safeHandle("rag:query-global", async (event, { query }: { query: string }) => {
    const ragManager = appState.getRAGManager();
    if (!ragManager || !ragManager.isReady()) {
      return { fallback: true };
    }
    const abortController = new AbortController();
    const queryKey = `global-${Date.now()}`;
    activeRAGQueries.set(queryKey, abortController);
    try {
      const stream = ragManager.queryGlobal(query, abortController.signal);
      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;
        event.sender.send("rag:stream-chunk", { global: true, chunk });
      }
      event.sender.send("rag:stream-complete", { global: true });
      return { success: true };
    } catch (error: any) {
      if (error.name !== "AbortError") {
        event.sender.send("rag:stream-error", { global: true, error: error.message });
      }
      return { success: false, error: error.message };
    } finally {
      activeRAGQueries.delete(queryKey);
    }
  });

  safeHandle("rag:cancel-query", async (_, { meetingId, global }: { meetingId?: string; global?: boolean }) => {
    const queryKey = global ? "global" : `meeting-${meetingId}`;
    for (const [key, controller] of activeRAGQueries) {
      if (key.startsWith(queryKey) || (global && key.startsWith("global"))) {
        controller.abort();
        activeRAGQueries.delete(key);
      }
    }
    return { success: true };
  });

  safeHandle("rag:is-meeting-processed", async (_, meetingId: string) => {
    try {
      const ragManager = appState.getRAGManager();
      if (!ragManager) throw new Error("RAGManager not initialized");
      return ragManager.isMeetingProcessed(meetingId);
    } catch (error: any) {
      console.error("[IPC rag:is-meeting-processed] Error:", error);
      return false;
    }
  });

  safeHandle("rag:reindex-incompatible-meetings", async () => {
    try {
      const ragManager = appState.getRAGManager();
      if (!ragManager) throw new Error("RAGManager not initialized");
      await ragManager.reindexIncompatibleMeetings();
      return { success: true };
    } catch (error: any) {
      console.error("[IPC rag:reindex-incompatible-meetings] Error:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("rag:get-queue-status", async () => {
    const ragManager = appState.getRAGManager();
    if (!ragManager) return { pending: 0, processing: 0, completed: 0, failed: 0 };
    return ragManager.getQueueStatus();
  });

  safeHandle("rag:retry-embeddings", async () => {
    const ragManager = appState.getRAGManager();
    if (!ragManager) return { success: false };
    await ragManager.retryPendingEmbeddings();
    return { success: true };
  });

  safeHandle("profile:upload-resume", async (_, filePath: string) => {
    try {
      if (!isProOrTrialActive()) {
        return { success: false, error: "Pro license required. Please activate a license key to use Profile Intelligence features." };
      }
      console.log(`[IPC] profile:upload-resume called with: ${filePath}`);
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) {
        return { success: false, error: "Knowledge engine not initialized. Please ensure API keys are configured." };
      }
      const { DocType } = require("../../premium/electron/knowledge/types");
      const result = await orchestrator.ingestDocument(filePath, DocType.RESUME);
      return result;
    } catch (error: any) {
      console.error("[IPC] profile:upload-resume error:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("profile:get-status", async () => {
    try {
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) {
        return { hasProfile: false, profileMode: false };
      }
      const status = orchestrator.getStatus();
      return {
        hasProfile: status.hasResume,
        profileMode: status.activeMode,
        name: status.resumeSummary?.name,
        role: status.resumeSummary?.role,
        totalExperienceYears: status.resumeSummary?.totalExperienceYears,
      };
    } catch {
      return { hasProfile: false, profileMode: false };
    }
  });

  safeHandle("profile:set-mode", async (_, enabled: boolean) => {
    try {
      if (enabled && !isProOrTrialActive()) {
        return { success: false, error: "Pro license required. Please activate a license key to use Profile Intelligence features." };
      }
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) {
        return { success: false, error: "Knowledge engine not initialized" };
      }
      orchestrator.setKnowledgeMode(enabled);
      const { SettingsManager } = require("../services/SettingsManager");
      SettingsManager.getInstance().set("knowledgeMode", enabled);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("profile:delete", async () => {
    try {
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) {
        return { success: false, error: "Knowledge engine not initialized" };
      }
      const { DocType } = require("../../premium/electron/knowledge/types");
      orchestrator.deleteDocumentsByType(DocType.RESUME);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("profile:get-profile", async () => {
    try {
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) return null;
      return orchestrator.getProfileData();
    } catch {
      return null;
    }
  });

  safeHandle("profile:select-file", async () => {
    try {
      const { dialog } = require("electron");
      const result: any = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Resume Files", extensions: ["pdf", "docx", "txt"] }],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { cancelled: true };
      }
      return { success: true, filePath: result.filePaths[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("profile:upload-jd", async (_, filePath: string) => {
    try {
      if (!isProOrTrialActive()) {
        return { success: false, error: "Pro license required. Please activate a license key to use Profile Intelligence features." };
      }
      console.log(`[IPC] profile:upload-jd called with: ${filePath}`);
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) {
        return { success: false, error: "Knowledge engine not initialized. Please ensure API keys are configured." };
      }
      const { DocType } = require("../../premium/electron/knowledge/types");
      const result = await orchestrator.ingestDocument(filePath, DocType.JD);
      return result;
    } catch (error: any) {
      console.error("[IPC] profile:upload-jd error:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("profile:delete-jd", async () => {
    try {
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) {
        return { success: false, error: "Knowledge engine not initialized" };
      }
      const { DocType } = require("../../premium/electron/knowledge/types");
      orchestrator.deleteDocumentsByType(DocType.JD);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("profile:research-company", async (_, companyName: string) => {
    try {
      if (!isProOrTrialActive()) {
        return { success: false, error: "Pro license required. Please activate a license key to use Profile Intelligence features." };
      }
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) {
        return { success: false, error: "Knowledge engine not initialized" };
      }
      const engine = orchestrator.getCompanyResearchEngine();
      const { CredentialsManager } = require("../services/CredentialsManager");
      const cm = CredentialsManager.getInstance();
      const tavilyApiKey = cm.getTavilyApiKey();
      if (tavilyApiKey) {
        const { TavilySearchProvider } = require("../../premium/electron/knowledge/TavilySearchProvider");
        engine.setSearchProvider(new TavilySearchProvider(tavilyApiKey));
      } else {
        const nativelyKey = cm.getNativelyApiKey();
        if (nativelyKey) {
          const { NativelySearchProvider } = require("../../premium/electron/knowledge/NativelySearchProvider");
          const trialToken = nativelyKey === TRIAL_SENTINEL_KEY ? cm.getTrialToken() : undefined;
          engine.setSearchProvider(new NativelySearchProvider(nativelyKey, trialToken ?? undefined));
          console.log("[IPC] Company research: using Natively API search (no Tavily key configured)");
        }
      }
      const profileData = orchestrator.getProfileData();
      const activeJD = profileData?.activeJD;
      const jdCtx = activeJD ? {
        title: activeJD.title,
        location: activeJD.location,
        level: activeJD.level,
        technologies: activeJD.technologies,
        requirements: activeJD.requirements,
        keywords: activeJD.keywords,
        compensation_hint: activeJD.compensation_hint,
        min_years_experience: activeJD.min_years_experience,
      } : {};
      const dossier = await engine.researchCompany(companyName, jdCtx, true);
      const searchQuotaExhausted = (engine.searchProvider as any)?.quotaExhausted === true;
      return { success: true, dossier, searchQuotaExhausted };
    } catch (error: any) {
      console.error("[IPC] profile:research-company error:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("profile:generate-negotiation", async (_, force: boolean = false) => {
    try {
      if (!isProOrTrialActive()) {
        return { success: false, error: "Pro license required. Please activate a license key to use Profile Intelligence features." };
      }
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) {
        return { success: false, error: "Knowledge engine not initialized" };
      }
      const status = orchestrator.getStatus();
      if (!status.hasResume) {
        return { success: false, error: "No resume loaded" };
      }
      let script = force ? null : orchestrator.getNegotiationScript();
      if (!script) {
        script = await orchestrator.generateNegotiationScriptOnDemand();
      }
      if (!script) {
        return { success: false, error: "Could not generate negotiation script. Ensure a resume and job description are uploaded." };
      }
      return { success: true, script };
    } catch (error: any) {
      console.error("[IPC] profile:generate-negotiation error:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("profile:get-negotiation-state", async () => {
    try {
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) return { success: false, error: "Engine not ready" };
      const tracker = orchestrator.getNegotiationTracker();
      return { success: true, state: tracker.getState(), isActive: tracker.isActive() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("profile:reset-negotiation", async () => {
    try {
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (!orchestrator) return { success: false };
      orchestrator.resetNegotiationSession();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("profile:get-notes", async () => {
    try {
      const content = DatabaseManager.getInstance().getCustomNotes();
      return { success: true, content };
    } catch (error: any) {
      return { success: false, content: "", error: error.message };
    }
  });

  safeHandle("profile:save-notes", async (_, content: string) => {
    try {
      const trimmed = typeof content === "string" ? content.slice(0, 4000) : "";
      DatabaseManager.getInstance().saveCustomNotes(trimmed);
      const orchestrator = appState.getKnowledgeOrchestrator();
      if (orchestrator?.setCustomNotes) orchestrator.setCustomNotes(trimmed);
      const llmHelper = appState.processingHelper?.getLLMHelper?.();
      if (llmHelper?.setCustomNotes) llmHelper.setCustomNotes(trimmed);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  PhoneMirrorService.getInstance().onStatusChange((info) => {
    const win = appState.getMainWindow();
    win?.webContents.send("phone-mirror:status", info);
    try {
      const settingsWin = (appState as any).settingsWindowHelper?.getWindow?.();
      settingsWin?.webContents?.send("phone-mirror:status", info);
    } catch {}
  });

  safeHandle("phone-mirror:get-info", async () => {
    return PhoneMirrorService.getInstance().snapshot();
  });

  safeHandle("phone-mirror:enable", async (_, exposeOnLan?: boolean) => {
    try {
      return await PhoneMirrorService.getInstance().start({ exposeOnLan: !!exposeOnLan, persist: true });
    } catch (e: any) {
      console.error("[IPC] phone-mirror:enable error:", e);
      return { error: e?.message || "failed to start phone mirror" };
    }
  });

  safeHandle("phone-mirror:disable", async () => {
    await PhoneMirrorService.getInstance().stop({ persist: true });
    return { success: true };
  });

  safeHandle("phone-mirror:set-lan", async (_, exposeOnLan: boolean) => {
    try {
      return await PhoneMirrorService.getInstance().setExposeOnLan(!!exposeOnLan);
    } catch (e: any) {
      console.error("[IPC] phone-mirror:set-lan error:", e);
      return { error: e?.message || "failed to update lan setting" };
    }
  });

  safeHandle("phone-mirror:rotate-token", async () => {
    try {
      return await PhoneMirrorService.getInstance().rotateToken();
    } catch (e: any) {
      console.error("[IPC] phone-mirror:rotate-token error:", e);
      return { error: e?.message || "failed to rotate token" };
    }
  });
}
