export interface DynamicActionEvidenceRef {
  source: 'transcript' | 'screen' | 'reference' | 'meeting_history'
  text: string
  timestamp?: number
  speaker?: string
  fileId?: string
  chunkId?: string
}

export interface DynamicActionPayload {
  id: string
  sessionId: string
  modeId: string
  modeTemplateType: string
  type: string
  label: string
  description?: string
  confidence: number
  priority: number
  evidenceRefs: DynamicActionEvidenceRef[]
  status: 'candidate' | 'shown' | 'accepted' | 'dismissed' | 'completed' | 'expired'
  createdAt: number
  expiresAt?: number
  promptInstruction: string
  answerStyle?: {
    maxWords: number
    format: 'bullets' | 'short_script' | 'code' | 'checklist' | 'summary'
    tone: string
  }
}

export interface PhoneMirrorInfo {
  running: boolean;
  enabled: boolean;
  exposeOnLan: boolean;
  port: number;
  loopbackUrl: string | null;
  primaryUrl: string | null;
  lanUrls: string[];
  token: string | null;
  qrDataUrl: string | null;
  clients: number;
}

export interface LlmAPI {
  getCurrentLlmConfig: () => Promise<{
    provider: "ollama" | "gemini" | "custom" | "codex-cli";
    model: string;
    isOllama: boolean;
  }>;
  getAvailableOllamaModels: () => Promise<string[]>;
  switchToOllama: (model?: string, url?: string) => Promise<{ success: boolean; error?: string }>;
  switchToGemini: (apiKey?: string, modelId?: string) => Promise<{ success: boolean; error?: string }>;
  testLlmConnection: (provider: 'gemini' | 'groq' | 'openai' | 'claude', apiKey?: string) => Promise<{ success: boolean; error?: string }>;
  setGeminiApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setGroqApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setOpenaiApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setClaudeApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setKimiApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setNativelyApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  streamGeminiChat: (message: string, imagePaths?: string[], context?: string, options?: { skipSystemPrompt?: boolean; ignoreKnowledgeMode?: boolean }) => Promise<void>;
  onGeminiStreamToken: (callback: (token: string) => void) => () => void;
  onGeminiStreamDone: (callback: () => void) => () => void;
  onGeminiStreamError: (callback: (error: string) => void) => () => void;
  getDefaultModel: () => Promise<{ model: string }>;
  setModel: (modelId: string) => Promise<{ success: boolean; error?: string }>;
  setDefaultModel: (modelId: string) => Promise<{ success: boolean; error?: string }>;
  toggleModelSelector: (coords: { x: number; y: number }) => Promise<void>;
  modelSelectorCloseIfOpen: () => Promise<void>;
  forceRestartOllama: () => Promise<void>;
  getGroqFastTextMode: () => Promise<{ enabled: boolean }>;
  setGroqFastTextMode: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  getCodexCliConfig: () => Promise<{ enabled: boolean; path: string; model: string; fastModel: string; timeoutMs: number }>;
  setCodexCliConfig: (config: { enabled: boolean; path: string; model: string; fastModel: string; timeoutMs: number }) => Promise<{ success: boolean; error?: string; config?: { enabled: boolean; path: string; model: string; fastModel: string; timeoutMs: number } }>;
  testCodexCli: (config?: { enabled?: boolean; path?: string; model?: string; fastModel?: string; timeoutMs?: number }) => Promise<{ success: boolean; error?: string; resolvedPath?: string; config?: { enabled: boolean; path: string; model: string; fastModel: string; timeoutMs: number } }>;
  saveCustomProvider: (provider: { id?: string; name: string; curlCommand: string; responsePath?: string }) => Promise<{ success: boolean; id?: string; error?: string }>;
  getCustomProviders: () => Promise<Array<{ id: string; name: string; curlCommand: string; responsePath?: string }>>;
  deleteCustomProvider: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchProviderModels: (provider: 'gemini' | 'groq' | 'openai' | 'claude' | 'kimi', apiKey: string) => Promise<{ success: boolean; models?: { id: string; label: string }[]; error?: string }>;
  setProviderPreferredModel: (provider: 'gemini' | 'groq' | 'openai' | 'claude' | 'kimi', modelId: string) => Promise<void>;
  onOllamaPullProgress: (callback: (data: { status: string; percent: number }) => void) => () => void;
  onOllamaPullComplete: (callback: () => void) => () => void;
  onModelChanged: (callback: (modelId: string) => void) => () => void;
  onGroqFastTextChanged: (callback: (enabled: boolean) => void) => () => void;
}

export interface SettingsAPI {
  updateContentDimensions: (dimensions: { width: number; height: number }) => Promise<void>;
  onToggleExpand: (callback: () => void) => () => void;
  setUndetectable: (state: boolean) => Promise<{ success: boolean; error?: string }>;
  getUndetectable: () => Promise<boolean>;
  onUndetectableChanged: (callback: (state: boolean) => void) => () => void;
  setOverlayMousePassthrough: (enabled: boolean) => Promise<{ success: boolean }>;
  toggleOverlayMousePassthrough: () => Promise<{ success: boolean; enabled: boolean }>;
  getOverlayMousePassthrough: () => Promise<boolean>;
  onOverlayMousePassthroughChanged: (callback: (enabled: boolean) => void) => () => void;
  setDisguise: (mode: 'terminal' | 'settings' | 'activity' | 'none') => Promise<{ success: boolean; error?: string }>;
  getDisguise: () => Promise<'none' | 'terminal' | 'settings' | 'activity'>;
  onDisguiseChanged: (callback: (mode: 'terminal' | 'settings' | 'activity' | 'none') => void) => () => void;
  setOpenAtLogin: (open: boolean) => Promise<{ success: boolean; error?: string }>;
  getOpenAtLogin: () => Promise<boolean>;
  onSettingsVisibilityChange: (callback: (isVisible: boolean) => void) => () => void;
  toggleSettingsWindow: (coords?: { x: number; y: number }) => Promise<void>;
  closeSettingsWindow: () => Promise<void>;
  toggleAdvancedSettings: () => Promise<void>;
  closeAdvancedSettings: () => Promise<void>;
  openSettingsTab: (tab: string) => Promise<void>;
  onOpenSettingsTab: (callback: (tab: string) => void) => () => void;
  checkPermissions: () => Promise<{ microphone: 'granted' | 'denied' | 'not-determined' | 'restricted'; screen: 'granted' | 'denied' | 'not-determined' | 'restricted'; platform: string }>;
  requestMicPermission: () => Promise<boolean>;
  getThemeMode: () => Promise<{ mode: 'system' | 'light' | 'dark'; resolved: 'light' | 'dark' }>;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;
  onThemeChanged: (callback: (data: { mode: 'system' | 'light' | 'dark'; resolved: 'light' | 'dark' }) => void) => () => void;
  getVerboseLogging: () => Promise<boolean>;
  setVerboseLogging: (enabled: boolean) => Promise<{ success: boolean }>;
  getMeetingRetention: () => Promise<'forever' | '7d' | '30d' | 'never'>;
  setMeetingRetention: (retention: 'forever' | '7d' | '30d' | 'never') => Promise<{ success: boolean; error?: string }>;
  onMeetingRetentionChanged: (callback: (retention: 'forever' | '7d' | '30d' | 'never') => void) => () => void;
  getProviderDataScopes: () => Promise<{ transcript?: boolean; screenshots?: boolean; reference_files?: boolean; profile_history?: boolean; embeddings?: boolean; post_call_summary?: boolean }>;
  setProviderDataScopes: (scopes: { transcript?: boolean; screenshots?: boolean; reference_files?: boolean; profile_history?: boolean; embeddings?: boolean; post_call_summary?: boolean }) => Promise<{ success: boolean; error?: string }>;
  onProviderDataScopesChanged: (callback: (scopes: { transcript?: boolean; screenshots?: boolean; reference_files?: boolean; profile_history?: boolean; embeddings?: boolean; post_call_summary?: boolean }) => void) => () => void;
  getScreenUnderstandingMode: () => Promise<'vision_first' | 'vision_only' | 'private_vision'>;
  setScreenUnderstandingMode: (mode: 'vision_first' | 'vision_only' | 'private_vision') => Promise<{ success: boolean; error?: string }>;
  onScreenUnderstandingModeChanged: (callback: (mode: 'vision_first' | 'vision_only' | 'private_vision') => void) => () => void;
  getTechnicalInterviewVisionFirst: () => Promise<boolean>;
  setTechnicalInterviewVisionFirst: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  onTechnicalInterviewVisionFirstChanged: (callback: (enabled: boolean) => void) => () => void;
  getTechnicalInterviewDirectVision: () => Promise<boolean>;
  setTechnicalInterviewDirectVision: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  onTechnicalInterviewDirectVisionChanged: (callback: (enabled: boolean) => void) => () => void;
  getReasoningEnabled: () => Promise<boolean>;
  setReasoningEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  onReasoningEnabledChanged: (callback: (enabled: boolean) => void) => () => void;
  getLogFilePath: () => Promise<string | null>;
  openLogFile: () => Promise<{ success: boolean; error?: string }>;
  getArch: () => Promise<string>;
  getOsVersion: () => Promise<string>;
  setOverlayOpacity: (opacity: number) => Promise<void>;
  onOverlayOpacityChanged: (callback: (opacity: number) => void) => () => void;
  selectServiceAccount: () => Promise<{ success: boolean; path?: string; cancelled?: boolean; error?: string }>;
  getStoredCredentials: () => Promise<{ hasNativelyKey?: boolean; hasGeminiKey: boolean; hasGroqKey: boolean; hasOpenaiKey: boolean; hasClaudeKey: boolean; hasKimiKey: boolean; googleServiceAccountPath: string | null; sttProvider: 'none' | 'google' | 'groq' | 'openai' | 'deepgram' | 'elevenlabs' | 'azure' | 'ibmwatson' | 'soniox' | 'natively'; hasSttGroqKey: boolean; hasSttOpenaiKey: boolean; hasDeepgramKey: boolean; hasElevenLabsKey: boolean; hasAzureKey: boolean; azureRegion: string; hasIbmWatsonKey: boolean; ibmWatsonRegion: string; groqSttModel?: string; hasSonioxKey?: boolean; hasTavilyKey?: boolean; geminiPreferredModel?: string; groqPreferredModel?: string; openaiPreferredModel?: string; claudePreferredModel?: string; kimiPreferredModel?: string; sttGroqKey?: string; sttOpenaiKey?: string; sttDeepgramKey?: string; sttElevenLabsKey?: string; sttAzureKey?: string; sttIbmKey?: string; sttSonioxKey?: string; openAiSttBaseUrl?: string }>;
  onCredentialsChanged: (callback: () => void) => () => void;
  getNativelyUsage: () => Promise<{ ok: boolean; error?: string; plan?: string; quota?: { transcription: { used: number; limit: number; remaining: number }; ai: { used: number; limit: number; remaining: number }; search: { used: number; limit: number; remaining: number }; resets_at: string }; member_since?: string }>;
  setTavilyApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  getKeybinds: () => Promise<Array<{ id: string; label: string; accelerator: string; isGlobal: boolean; defaultAccelerator: string }>>;
  setKeybind: (id: string, accelerator: string) => Promise<boolean>;
  resetKeybinds: () => Promise<Array<{ id: string; label: string; accelerator: string; isGlobal: boolean; defaultAccelerator: string }>>;
  onKeybindsUpdate: (callback: (keybinds: Array<{ id: string; label: string; accelerator: string; isGlobal: boolean; defaultAccelerator: string }>) => void) => () => void;
  onKeybindRegistrationFailed: (callback: (data: { id: string; accelerator: string }) => void) => () => void;
  onGlobalShortcut: (callback: (data: { action: string }) => void) => () => void;
  startTrial: () => Promise<{ ok: boolean; hasToken?: boolean; started_at?: string; expires_at?: string; expired?: boolean; already_used?: boolean; converted_to?: string | null; usage?: { ai: number; stt_seconds: number; search: number }; limits?: { duration_ms: number; ai_requests: number; stt_minutes: number; search_requests: number }; error?: string; status?: number }>;
  getTrialStatus: () => Promise<{ ok: boolean; expired?: boolean; remaining_ms?: number; started_at?: string; expires_at?: string; converted_to?: string | null; usage?: { ai: number; stt_seconds: number; search: number }; limits?: object; error?: string }>;
  getLocalTrial: () => Promise<{ hasToken: boolean; trialClaimed?: boolean; expiresAt?: string; startedAt?: string; expired?: boolean }>;
  convertTrial: (choice: string) => Promise<{ ok: boolean }>;
  endTrialByok: () => Promise<{ success: boolean; error?: string }>;
  wipeTrialProfileData: () => Promise<{ success: boolean; error?: string }>;
  onTrialEnded: (cb: (data: { choice: string }) => void) => () => void;
  getDonationStatus: () => Promise<{ shouldShow: boolean; hasDonated: boolean; lifetimeShows: number }>;
  markDonationToastShown: () => Promise<{ success: boolean }>;
  setDonationComplete: () => Promise<{ success: boolean }>;
  calendarConnect: () => Promise<{ success: boolean; error?: string }>;
  calendarDisconnect: () => Promise<{ success: boolean; error?: string }>;
  getCalendarStatus: () => Promise<{ connected: boolean; email?: string }>;
  getUpcomingEvents: () => Promise<Array<{ id: string; title: string; startTime: string; endTime: string; link?: string; source: 'google'; attendees?: Array<{ email: string; name?: string; photoUrl?: string; response?: 'accepted' | 'declined' | 'tentative' | 'needsAction' }> }>>;
  calendarRefresh: () => Promise<{ success: boolean; error?: string }>;
  onUpdateAvailable: (callback: (info: { version?: string; releaseDate?: string; parsedNotes?: string[] }) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version?: string; releaseDate?: string; parsedNotes?: string[] }) => void) => () => void;
  onUpdateChecking: (callback: () => void) => () => void;
  onUpdateNotAvailable: (callback: (info: { version?: string }) => void) => () => void;
  onUpdateError: (callback: (err: string) => void) => () => void;
  onDownloadProgress: (callback: (progressObj: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => void) => () => void;
  restartAndInstall: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  testReleaseFetch: () => Promise<{ success: boolean; error?: string }>;
  logErrorToMain: (error: { type: string; context: string; message?: string; stack?: string; componentStack?: string }) => void;
}

export interface AudioAPI {
  getRecognitionLanguages: () => Promise<Record<string, { label: string; bcp47: string; iso639: string; group: string; alternates?: string[] }>>;
  setRecognitionLanguage: (key: string) => Promise<{ success: boolean; error?: string }>;
  getAiResponseLanguages: () => Promise<Array<{ label: string; code: string }>>;
  setAiResponseLanguage: (language: string) => Promise<{ success: boolean; error?: string }>;
  getSttLanguage: () => Promise<string>;
  getAiResponseLanguage: () => Promise<string>;
  onSttLanguageAutoDetected: (callback: (bcp47: string) => void) => () => void;
  getInputDevices: () => Promise<Array<{ id: string; name: string }>>;
  getOutputDevices: () => Promise<Array<{ id: string; name: string }>>;
  onDeviceSelectionApplied: (callback: (payload: { kind: 'input' | 'output'; requested: string | null; actual: string | null; fellBack: boolean; reason?: string }) => void) => () => void;
  onAudioCaptureFailed: (callback: (payload: { channel: 'system' | 'mic'; message: string; attempt: number; maxAttempts: number; terminal?: boolean; stuck?: boolean }) => void) => () => void;
  onSystemAudioPermissionDenied: (callback: (message: string) => void) => () => void;
  onNativeAudioTranscript: (callback: (transcript: { speaker: string; text: string; final: boolean }) => void) => () => void;
  onNativeAudioSuggestion: (callback: (suggestion: { context: string; lastQuestion: string; confidence: number }) => void) => () => void;
  onNativeAudioConnected: (callback: () => void) => () => void;
  onNativeAudioDisconnected: (callback: () => void) => () => void;
  onSuggestionGenerated: (callback: (data: { question: string; suggestion: string; confidence: number }) => void) => () => void;
  onSuggestionProcessingStart: (callback: () => void) => () => void;
  onSuggestionError: (callback: (error: { error: string }) => void) => () => void;
  generateSuggestion: (context: string, lastQuestion: string) => Promise<{ suggestion: string }>;
  getNativeAudioStatus: () => Promise<{ connected: boolean }>;
  onSttStatusChanged: (callback: (data: { state: 'connected' | 'reconnecting' | 'failed'; provider: string; error?: string; channel: 'user' | 'interviewer'; reconnectAttempts?: number }) => void) => () => void;
  setSttProvider: (provider: 'none' | 'google' | 'groq' | 'openai' | 'deepgram' | 'elevenlabs' | 'azure' | 'ibmwatson' | 'soniox' | 'natively' | 'local-whisper') => Promise<{ success: boolean; error?: string }>;
  getSttProvider: () => Promise<string>;
  setGroqSttApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setOpenAiSttApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setOpenAiSttBaseUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  setDeepgramApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setElevenLabsApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setAzureApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setAzureRegion: (region: string) => Promise<{ success: boolean; error?: string }>;
  setIbmWatsonApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setGroqSttModel: (model: string) => Promise<{ success: boolean; error?: string }>;
  setSonioxApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  setIbmWatsonRegion: (region: string) => Promise<{ success: boolean; error?: string }>;
  testSttConnection: (provider: 'groq' | 'openai' | 'deepgram' | 'elevenlabs' | 'azure' | 'ibmwatson' | 'soniox', apiKey: string, region?: string) => Promise<{ success: boolean; error?: string }>;
  onSttConfigChanged: (callback: (data: { configured: boolean; provider: string }) => void) => () => void;
  startAudioTest: (deviceId?: string) => Promise<{ success: boolean }>;
  stopAudioTest: () => Promise<{ success: boolean }>;
  onAudioTestLevel: (callback: (level: number) => void) => () => void;
  finalizeMicSTT: () => Promise<void>;
}

export interface WindowAPI {
  moveWindowLeft: () => Promise<void>;
  moveWindowRight: () => Promise<void>;
  moveWindowUp: () => Promise<void>;
  moveWindowDown: () => Promise<void>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  resizeLauncherWindow: (dimensions: { width: number; height: number }) => Promise<void>;
  updateContentDimensionsCentered: (dimensions: { width: number; height: number }) => Promise<void>;
  quitApp: () => Promise<void>;
  toggleWindow: () => Promise<void>;
  showWindow: (inactive?: boolean) => Promise<void>;
  hideWindow: () => Promise<void>;
  showOverlay: () => Promise<void>;
  hideOverlay: () => Promise<void>;
  onWindowMaximizedChanged: (callback: (isMaximized: boolean) => void) => () => void;
  onEnsureExpanded: (callback: () => void) => () => void;
  getMeetingActive: () => Promise<boolean>;
  onMeetingStateChanged: (callback: (data: { isActive: boolean }) => void) => () => void;
  setWindowMode: (mode: 'launcher' | 'overlay', inactive?: boolean) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  platform: NodeJS.Platform;
}

export interface ScreenshotAPI {
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>;
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>;
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => () => void;
  onScreenshotAttached: (callback: (data: { path: string; preview: string }) => void) => () => void;
  onCaptureAndProcess: (callback: (data: { path: string; preview: string }) => void) => () => void;
  takeScreenshot: () => Promise<{ path: string; preview: string }>;
  takeSelectiveScreenshot: () => Promise<{ path: string; preview: string; cancelled?: boolean }>;
  analyzeImageFile: (path: string) => Promise<void>;
  cropperConfirmed: (bounds: { x: number; y: number; width: number; height: number }) => void;
  cropperCancelled: () => void;
  onResetCropper: (callback: (data: { hudPosition: { x: number; y: number } }) => void) => () => void;
}

export interface MeetingSummary {
  overview?: string;
  actionItems?: string[];
  keyPoints?: string[];
  actionItemsTitle?: string;
  keyPointsTitle?: string;
}

export interface MeetingDetails {
  id: string;
  title: string;
  date: string;
  duration: string;
  summary: string;
  transcript?: Array<{ speaker: string; text: string; timestamp: number }>;
  detailedSummary?: {
    overview?: string;
    actionItems: string[];
    keyPoints: string[];
  };
  usage?: Array<{
    type: 'assist' | 'followup' | 'chat' | 'followup_questions';
    timestamp: number;
    question?: string;
    answer?: string;
  }>;
}

export interface Mode {
  id: string;
  name: string;
  templateType: string;
  customContext: string;
  isActive: boolean;
  createdAt: string;
  referenceFileCount: number;
}

export interface ReferenceFile {
  id: string;
  modeId: string;
  fileName: string;
  content: string;
  createdAt: string;
}

export interface NoteSection {
  id: string;
  modeId: string;
  title: string;
  description: string;
  sortOrder: number;
}

export interface ModeAPI {
  getActionButtonMode: () => Promise<'recap' | 'brainstorm'>;
  setActionButtonMode: (mode: 'recap' | 'brainstorm') => Promise<{ success: boolean }>;
  onActionButtonModeChanged: (callback: (mode: 'recap' | 'brainstorm') => void) => () => void;
  onModeChanged: (callback: (data: { id: string | null; name: string | null }) => void) => () => void;
  modesGetAll: () => Promise<Mode[]>;
  modesGetActive: () => Promise<Omit<Mode, 'referenceFileCount'> | null>;
  modesCreate: (params: { name: string; templateType: string }) => Promise<{ success: boolean; mode?: Mode; error?: string }>;
  modesUpdate: (id: string, updates: { name?: string; templateType?: string; customContext?: string }) => Promise<{ success: boolean; error?: string }>;
  modesDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  modesSetActive: (id: string | null) => Promise<{ success: boolean; error?: string }>;
  modesGetReferenceFiles: (modeId: string) => Promise<ReferenceFile[]>;
  modesUploadReferenceFile: (modeId: string) => Promise<{ success: boolean; file?: ReferenceFile; cancelled?: boolean; error?: string }>;
  modesDeleteReferenceFile: (id: string) => Promise<{ success: boolean; error?: string }>;
  modesGetNoteSections: (modeId: string) => Promise<NoteSection[]>;
  modesAddNoteSection: (modeId: string, title: string, description: string) => Promise<{ success: boolean; section?: NoteSection; error?: string }>;
  modesUpdateNoteSection: (id: string, updates: { title?: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
  modesDeleteNoteSection: (id: string) => Promise<{ success: boolean; error?: string }>;
  modesRemoveAllNoteSections: (modeId: string) => Promise<{ success: boolean; error?: string }>;
  startMeeting: (metadata?: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  endMeeting: () => Promise<{ success: boolean; error?: string }>;
  getRecentMeetings: () => Promise<Array<{ id: string; title: string; date: string; duration: string; summary: string }>>;
  getMeetingDetails: (id: string) => Promise<MeetingDetails | null>;
  updateMeetingTitle: (id: string, title: string) => Promise<boolean>;
  updateMeetingSummary: (id: string, updates: MeetingSummary) => Promise<boolean>;
  deleteMeeting: (id: string) => Promise<boolean>;
  onMeetingsUpdated: (callback: () => void) => () => void;
  generateAssist: () => Promise<{ insight: string | null }>;
  generateWhatToSay: (question?: string, imagePaths?: string[], options?: { promptInstruction?: string }) => Promise<{ answer: string | null; question?: string; error?: string; screenContextStatus?: 'not_available' | 'available' | 'failed'; visionProviderUsed?: string; visionModelUsed?: string; visionAttempts?: number; visionFailureReason?: 'no_vision_provider' | 'all_vision_failed' | 'privacy_blocked' | 'scope_blocked' | 'provider_timeout'; imageCount?: number; usedImageInput?: boolean }>;
  generateClarify: () => Promise<{ clarification: string | null }>;
  generateCodeHint: (imagePaths?: string[], problemStatement?: string) => Promise<{ hint: string | null }>;
  generateBrainstorm: (imagePaths?: string[], problemStatement?: string) => Promise<{ script: string | null }>;
  generateFollowUp: (intent: string, userRequest?: string) => Promise<{ refined: string | null; intent: string }>;
  generateFollowUpQuestions: () => Promise<{ questions: string | null }>;
  generateRecap: () => Promise<{ summary: string | null }>;
  submitManualQuestion: (question: string) => Promise<{ answer: string | null; question: string }>;
  getIntelligenceContext: () => Promise<{ context: string; lastAssistantMessage: string | null; activeMode: string }>;
  resetIntelligence: () => Promise<{ success: boolean; error?: string }>;
  onIntelligenceDynamicAction: (callback: (data: { action: DynamicActionPayload }) => void) => () => void;
  acceptDynamicAction: (actionId: string) => Promise<{ success: boolean; action?: DynamicActionPayload; error?: string }>;
  dismissDynamicAction: (actionId: string) => Promise<{ success: boolean; error?: string }>;
  listDynamicActions: () => Promise<{ success: boolean; actions: DynamicActionPayload[]; error?: string }>;
  onIntelligenceAssistUpdate: (callback: (data: { insight: string }) => void) => () => void;
  onIntelligenceSuggestedAnswerToken: (callback: (data: { token: string; question: string; confidence: number }) => void) => () => void;
  onIntelligenceSuggestedAnswer: (callback: (data: { answer: string; question: string; confidence: number }) => void) => () => void;
  onIntelligenceNegotiationCoaching: (callback: (data: { payload: {
    tacticalNote: string;
    exactScript: string;
    showSilenceTimer: boolean;
    phase: string;
    theirOffer: number | null;
    yourTarget: number | null;
    currency: string;
  } }) => void) => () => void;
  onIntelligenceTokenBatch: (callback: (data: { kind: 'suggested_answer' | 'refined_answer' | 'recap' | 'clarify' | 'follow_up_questions'; items: Array<Record<string, unknown>> }) => void) => () => void;
  onIntelligenceRefinedAnswerToken: (callback: (data: { token: string; intent: string }) => void) => () => void;
  onIntelligenceRefinedAnswer: (callback: (data: { answer: string; intent: string }) => void) => () => void;
  onIntelligenceFollowUpQuestionsUpdate: (callback: (data: { questions: string }) => void) => () => void;
  onIntelligenceFollowUpQuestionsToken: (callback: (data: { token: string }) => void) => () => void;
  onIntelligenceRecap: (callback: (data: { summary: string }) => void) => () => void;
  onIntelligenceRecapToken: (callback: (data: { token: string }) => void) => () => void;
  onIntelligenceClarify: (callback: (data: { clarification: string }) => void) => () => void;
  onIntelligenceClarifyToken: (callback: (data: { token: string }) => void) => () => void;
  onIntelligenceManualStarted: (callback: () => void) => () => void;
  onIntelligenceManualResult: (callback: (data: { answer: string; question: string }) => void) => () => void;
  onIntelligenceModeChanged: (callback: (data: { mode: string }) => void) => () => void;
  onIntelligenceError: (callback: (data: { error: string; mode: string }) => void) => () => void;
  onSessionReset: (callback: () => void) => () => void;
  onSolutionsReady: (callback: (solutions: string) => void) => () => void;
  onResetView: (callback: () => void) => () => void;
  onSolutionStart: (callback: () => void) => () => void;
  onDebugStart: (callback: () => void) => () => void;
  onDebugSuccess: (callback: (data: { result: string }) => void) => () => void;
  onDebugError: (callback: (error: string) => void) => () => void;
  onSolutionError: (callback: (error: string) => void) => () => void;
  onProcessingNoScreenshots: (callback: () => void) => () => void;
  onProblemExtracted: (callback: (data: { problem: string; language?: string }) => void) => () => void;
  onSolutionSuccess: (callback: (data: { answer: string; explanation?: string }) => void) => () => void;
  onUnauthorized: (callback: () => void) => () => void;
  seedDemo: () => Promise<{ success: boolean }>;
  generateFollowupEmail: (input: { to?: string; subject?: string; body?: string; context?: string }) => Promise<string>;
  extractEmailsFromTranscript: (transcript: Array<{ text: string }>) => Promise<string[]>;
  getCalendarAttendees: (eventId: string) => Promise<Array<{ email: string; name: string }>>;
  openMailto: (params: { to: string; subject: string; body: string }) => Promise<{ success: boolean; error?: string }>;
  flushDatabase: () => Promise<{ success: boolean }>;
  onIncompatibleProviderWarning: (callback: (data: { count: number; oldProvider: string; newProvider: string }) => void) => () => void;
  reindexIncompatibleMeetings: () => Promise<void>;
  ragQueryMeeting: (meetingId: string, query: string) => Promise<{ success?: boolean; fallback?: boolean; error?: string }>;
  ragQueryLive: (query: string) => Promise<{ success?: boolean; fallback?: boolean; error?: string }>;
  ragQueryGlobal: (query: string) => Promise<{ success?: boolean; fallback?: boolean; error?: string }>;
  ragCancelQuery: (options: { meetingId?: string; global?: boolean }) => Promise<{ success: boolean }>;
  ragIsMeetingProcessed: (meetingId: string) => Promise<boolean>;
  ragGetQueueStatus: () => Promise<{ pending: number; processing: number; completed: number; failed: number }>;
  ragRetryEmbeddings: () => Promise<{ success: boolean }>;
  onRAGStreamChunk: (callback: (data: { meetingId?: string; global?: boolean; chunk: string }) => void) => () => void;
  onRAGStreamComplete: (callback: (data: { meetingId?: string; global?: boolean }) => void) => () => void;
  onRAGStreamError: (callback: (data: { meetingId?: string; global?: boolean; error: string }) => void) => () => void;
  profileUploadResume: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  profileGetStatus: () => Promise<{ hasProfile: boolean; profileMode: boolean; name?: string; role?: string; totalExperienceYears?: number }>;
  profileSetMode: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  profileDelete: () => Promise<{ success: boolean; error?: string }>;
  profileGetProfile: () => Promise<Record<string, unknown> | null>;
  profileSelectFile: () => Promise<{ success?: boolean; cancelled?: boolean; filePath?: string; error?: string }>;
  profileUploadJD: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  profileDeleteJD: () => Promise<{ success: boolean; error?: string }>;
  profileResearchCompany: (companyName: string) => Promise<{ success: boolean; dossier?: Record<string, unknown>; error?: string; searchQuotaExhausted?: boolean }>;
  profileGenerateNegotiation: (force?: boolean) => Promise<{ success: boolean; script?: Record<string, unknown>; error?: string }>;
  profileGetNegotiationState: () => Promise<{ success: boolean; state?: Record<string, unknown>; isActive?: boolean; error?: string }>;
  profileResetNegotiation: () => Promise<{ success: boolean; error?: string }>;
  profileGetNotes: () => Promise<{ success: boolean; content: string; error?: string }>;
  profileSaveNotes: (content: string) => Promise<{ success: boolean; error?: string }>;
  phoneMirrorGetInfo: () => Promise<PhoneMirrorInfo>;
  phoneMirrorEnable: (exposeOnLan: boolean) => Promise<PhoneMirrorInfo | { error: string }>;
  phoneMirrorDisable: () => Promise<{ success: true }>;
  phoneMirrorSetLan: (exposeOnLan: boolean) => Promise<PhoneMirrorInfo | { error: string }>;
  phoneMirrorRotateToken: () => Promise<PhoneMirrorInfo | { error: string }>;
  onPhoneMirrorStatus: (callback: (info: PhoneMirrorInfo) => void) => () => void;
  stealthTapAvailable: () => Promise<boolean>;
  stealthTapPermissionGranted: () => Promise<boolean>;
  stealthTapRequestPermission: () => Promise<boolean>;
  stealthTapOpenSettings: () => Promise<void>;
  stealthTapIsActive: () => Promise<boolean>;
  stealthTapStop: () => Promise<void>;
  stealthTapStart: () => Promise<boolean>;
  stealthTapShouldAutoEngage: () => Promise<boolean>;
  onStealthTapState: (cb: (state: { active: boolean; reason?: string }) => void) => () => void;
  onStealthKeyCaptured: (cb: (ev: { keyCode: number; chars: string; flags: number; isKeyDown: boolean }) => void) => () => void;
}

export interface LicenseAPI {
  licenseActivate: (key: string) => Promise<{ success: boolean; error?: string }>;
  licenseCheckPremium: () => Promise<boolean>;
  licenseGetDetails: () => Promise<{ isPremium: boolean; plan?: string; provider?: string }>;
  licenseCheckPremiumAsync: () => Promise<boolean>;
  onLicenseStatusChanged: (callback: (data: { isPremium: boolean; plan?: string }) => void) => () => void;
  licenseDeactivate: () => Promise<void>;
  licenseGetHardwareId: () => Promise<string>;
}

export interface ElectronAPI extends
  LlmAPI,
  SettingsAPI,
  AudioAPI,
  WindowAPI,
  ScreenshotAPI,
  ModeAPI,
  LicenseAPI {
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
