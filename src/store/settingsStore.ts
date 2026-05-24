import { create } from 'zustand';
import type { MeetingInterfaceTheme } from '../lib/meetingInterfaceTheme';
import {
  clampOverlayOpacity,
  OVERLAY_OPACITY_DEFAULT,
  getDefaultOverlayOpacity,
} from '../lib/overlayAppearance';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeMode = 'system' | 'light' | 'dark';
export type MeetingRetention = 'forever' | '7d' | '30d' | 'never';
export type ScreenUnderstandingMode = 'vision_first' | 'vision_only' | 'private_vision';
export type DisguiseMode = 'terminal' | 'settings' | 'activity' | 'none';
export type SttProvider = 'none' | 'google' | 'groq' | 'openai' | 'deepgram' | 'elevenlabs' | 'azure' | 'ibmwatson' | 'soniox' | 'natively' | 'local-whisper';
export type ActionButtonMode = 'recap' | 'brainstorm';
export type UpdateStatus = 'idle' | 'checking' | 'available' | 'uptodate' | 'error';
export type TestStatus = 'idle' | 'testing' | 'success' | 'error';
export type OllamaStatus = 'checking' | 'detected' | 'not-found' | 'fixing';

export interface CustomProvider {
  id: string;
  name: string;
  curlCommand: string;
  responsePath: string;
}

export interface ProviderDataScopes {
  transcript?: boolean;
  screenshots?: boolean;
  reference_files?: boolean;
  profile_history?: boolean;
  embeddings?: boolean;
  post_call_summary?: boolean;
}

export interface CodexCliConfig {
  enabled: boolean;
  path: string;
  model: string;
  fastModel: string;
  timeoutMs: number;
}

export interface DeviceFallbackNotice {
  kind: 'input' | 'output';
  requested: string | null;
  actual: string | null;
  reason?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  link?: string;
}

export interface CalendarStatus {
  connected: boolean;
  email?: string;
}

// ---------------------------------------------------------------------------
// State Interface
// ---------------------------------------------------------------------------

interface SettingsState {
  // === General / Stealth ===
  isUndetectable: boolean;
  isMousePassthrough: boolean;
  disguiseMode: DisguiseMode;
  openOnLogin: boolean;
  themeMode: ThemeMode;
  meetingInterfaceTheme: MeetingInterfaceTheme;
  overlayOpacity: number;
  showTranscript: boolean;
  autoScroll: boolean;

  // === AI / Intelligence ===
  verboseLogging: boolean;
  meetingRetention: MeetingRetention;
  providerDataScopes: ProviderDataScopes;
  screenUnderstandingMode: ScreenUnderstandingMode;
  technicalInterviewVisionFirst: boolean;
  reasoningEnabled: boolean;
  actionButtonMode: ActionButtonMode;

  // === Language ===
  recognitionLanguage: string;
  selectedSttGroup: string;
  availableLanguages: Record<string, any>;
  autoDetectedLanguage: string | null;
  aiResponseLanguage: string;
  availableAiLanguages: Array<{ label: string; code: string }>;

  // === Audio Devices ===
  inputDevices: MediaDeviceInfo[];
  outputDevices: MediaDeviceInfo[];
  selectedInput: string;
  selectedOutput: string;
  micLevel: number;
  useExperimentalSck: boolean;
  deviceFallbackNotice: DeviceFallbackNotice | null;

  // === STT Provider ===
  sttProvider: SttProvider;
  groqSttModel: string;
  sttGroqKey: string;
  sttOpenaiKey: string;
  sttDeepgramKey: string;
  sttElevenLabsKey: string;
  sttAzureKey: string;
  sttAzureRegion: string;
  sttIbmKey: string;
  sttOpenaiBaseUrl: string;
  sttSonioxKey: string;
  sttTestStatus: TestStatus;
  sttTestError: string;
  sttSaving: boolean;
  sttSaved: boolean;
  googleServiceAccountPath: string | null;
  hasNativelyKey: boolean;
  hasStoredSttGroqKey: boolean;
  hasStoredSttOpenaiKey: boolean;
  hasStoredDeepgramKey: boolean;
  hasStoredElevenLabsKey: boolean;
  hasStoredAzureKey: boolean;
  hasStoredIbmWatsonKey: boolean;
  hasStoredSonioxKey: boolean;

  // === AI Provider Keys ===
  apiKey: string; // gemini
  groqApiKey: string;
  openaiApiKey: string;
  claudeApiKey: string;
  kimiApiKey: string;
  savedStatus: Record<string, boolean>;
  savingStatus: Record<string, boolean>;
  testStatus: Record<string, TestStatus>;
  testError: Record<string, string>;
  hasStoredKey: Record<string, boolean>;

  // === Custom Providers ===
  customProviders: CustomProvider[];
  isEditingCustom: boolean;
  editingProvider: CustomProvider | null;
  customName: string;
  customCurl: string;
  customResponsePath: string;
  curlError: string | null;

  // === Ollama ===
  ollamaModels: string[];
  ollamaStatus: OllamaStatus;
  ollamaRestarted: boolean;
  isRefreshingOllama: boolean;

  // === Codex CLI ===
  codexCliConfig: CodexCliConfig;
  codexCliStatus: TestStatus;
  codexCliError: string;

  // === Model Selection ===
  defaultModel: string;
  fastResponseMode: boolean;
  credentialsLoaded: boolean;
  preferredModels: Record<string, string>;

  // === Calendar ===
  calendarStatus: CalendarStatus;
  isCalendarsLoading: boolean;
  calendarEvents: CalendarEvent[];
  isCalendarRefreshing: boolean;

  // === Update ===
  updateStatus: UpdateStatus;

  // === Profile / Premium ===
  profileMode: boolean;
  hasProfile: boolean;
  isPremium: boolean;

  // === UI State (transient) ===
  activeTab: string;
  isThemeDropdownOpen: boolean;
  isAiLangDropdownOpen: boolean;
  isInterfaceThemeDropdownOpen: boolean;
  isSttDropdownOpen: boolean;
  showVerboseToast: boolean;
  isPreviewingOpacity: boolean;
  previewOverlayOpacity: number;

  // === Loading / Init ===
  isInitialized: boolean;
}

interface SettingsActions {
  // === General / Stealth ===
  setUndetectable: (value: boolean) => Promise<void>;
  setMousePassthrough: (value: boolean) => Promise<void>;
  setDisguiseMode: (value: DisguiseMode) => Promise<void>;
  setOpenOnLogin: (value: boolean) => Promise<void>;
  setThemeMode: (value: ThemeMode) => Promise<void>;
  setMeetingInterfaceTheme: (value: MeetingInterfaceTheme) => void;
  setOverlayOpacity: (value: number) => void;
  setShowTranscript: (value: boolean) => void;
  setAutoScroll: (value: boolean) => void;

  // === AI / Intelligence ===
  setVerboseLogging: (value: boolean) => Promise<void>;
  setMeetingRetention: (value: MeetingRetention) => Promise<void>;
  setProviderDataScopes: (value: ProviderDataScopes) => Promise<void>;
  setScreenUnderstandingMode: (value: ScreenUnderstandingMode) => Promise<void>;
  setTechnicalInterviewVisionFirst: (value: boolean) => Promise<void>;
  setReasoningEnabled: (value: boolean) => Promise<void>;
  setActionButtonMode: (value: ActionButtonMode) => Promise<void>;

  // === Language ===
  setRecognitionLanguage: (value: string) => Promise<void>;
  setSelectedSttGroup: (value: string) => void;
  setAvailableLanguages: (value: Record<string, any>) => void;
  setAutoDetectedLanguage: (value: string | null) => void;
  setAiResponseLanguage: (value: string) => Promise<void>;
  setAvailableAiLanguages: (value: Array<{ label: string; code: string }>) => void;

  // === Audio Devices ===
  setInputDevices: (value: MediaDeviceInfo[]) => void;
  setOutputDevices: (value: MediaDeviceInfo[]) => void;
  setSelectedInput: (value: string) => void;
  setSelectedOutput: (value: string) => void;
  setMicLevel: (value: number) => void;
  setUseExperimentalSck: (value: boolean) => void;
  setDeviceFallbackNotice: (value: DeviceFallbackNotice | null) => void;

  // === STT Provider ===
  setSttProvider: (value: SttProvider) => Promise<void>;
  setGroqSttModel: (value: string) => Promise<void>;
  setSttGroqKey: (value: string) => void;
  setSttOpenaiKey: (value: string) => void;
  setSttDeepgramKey: (value: string) => void;
  setSttElevenLabsKey: (value: string) => void;
  setSttAzureKey: (value: string) => void;
  setSttAzureRegion: (value: string) => void;
  setSttIbmKey: (value: string) => void;
  setSttOpenaiBaseUrl: (value: string) => void;
  setSttSonioxKey: (value: string) => void;
  setSttTestStatus: (value: TestStatus) => void;
  setSttTestError: (value: string) => void;
  setSttSaving: (value: boolean) => void;
  setSttSaved: (value: boolean) => void;
  setGoogleServiceAccountPath: (value: string | null) => void;
  setHasNativelyKey: (value: boolean) => void;
  setHasStoredSttGroqKey: (value: boolean) => void;
  setHasStoredSttOpenaiKey: (value: boolean) => void;
  setHasStoredDeepgramKey: (value: boolean) => void;
  setHasStoredElevenLabsKey: (value: boolean) => void;
  setHasStoredAzureKey: (value: boolean) => void;
  setHasStoredIbmWatsonKey: (value: boolean) => void;
  setHasStoredSonioxKey: (value: boolean) => void;

  // === AI Provider Keys ===
  setApiKey: (value: string) => void;
  setGroqApiKey: (value: string) => void;
  setOpenaiApiKey: (value: string) => void;
  setClaudeApiKey: (value: string) => void;
  setKimiApiKey: (value: string) => void;
  setSavedStatus: (value: Record<string, boolean>) => void;
  setSavingStatus: (value: Record<string, boolean>) => void;
  setTestStatus: (value: Record<string, TestStatus>) => void;
  setTestError: (value: Record<string, string>) => void;
  setHasStoredKey: (value: Record<string, boolean>) => void;

  // === Custom Providers ===
  setCustomProviders: (value: CustomProvider[]) => void;
  setIsEditingCustom: (value: boolean) => void;
  setEditingProvider: (value: CustomProvider | null) => void;
  setCustomName: (value: string) => void;
  setCustomCurl: (value: string) => void;
  setCustomResponsePath: (value: string) => void;
  setCurlError: (value: string | null) => void;

  // === Ollama ===
  setOllamaModels: (value: string[]) => void;
  setOllamaStatus: (value: OllamaStatus) => void;
  setOllamaRestarted: (value: boolean) => void;
  setIsRefreshingOllama: (value: boolean) => void;

  // === Codex CLI ===
  setCodexCliConfig: (value: CodexCliConfig) => void;
  setCodexCliStatus: (value: TestStatus) => void;
  setCodexCliError: (value: string) => void;

  // === Model Selection ===
  setDefaultModel: (value: string) => Promise<void>;
  setFastResponseMode: (value: boolean) => Promise<void>;
  setCredentialsLoaded: (value: boolean) => void;
  setPreferredModels: (value: Record<string, string>) => void;

  // === Calendar ===
  setCalendarStatus: (value: CalendarStatus) => void;
  setIsCalendarsLoading: (value: boolean) => void;
  setCalendarEvents: (value: CalendarEvent[]) => void;
  setIsCalendarRefreshing: (value: boolean) => void;

  // === Update ===
  setUpdateStatus: (value: UpdateStatus) => void;

  // === Profile / Premium ===
  setProfileMode: (value: boolean) => Promise<void>;
  setHasProfile: (value: boolean) => void;
  setIsPremium: (value: boolean) => void;

  // === UI State ===
  setActiveTab: (value: string) => void;
  setIsThemeDropdownOpen: (value: boolean) => void;
  setIsAiLangDropdownOpen: (value: boolean) => void;
  setIsInterfaceThemeDropdownOpen: (value: boolean) => void;
  setIsSttDropdownOpen: (value: boolean) => void;
  setShowVerboseToast: (value: boolean) => void;
  setIsPreviewingOpacity: (value: boolean) => void;
  setPreviewOverlayOpacity: (value: number) => void;

  // === Init ===
  setIsInitialized: (value: boolean) => void;

  // === Bulk setters ===
  setState: (partial: Partial<SettingsState>) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getInitialOverlayOpacity = (): number => {
  const stored = localStorage.getItem('natively_overlay_opacity');
  const parsed = stored ? parseFloat(stored) : NaN;
  const isUserSet = Number.isFinite(parsed) && parsed !== OVERLAY_OPACITY_DEFAULT;
  return isUserSet ? clampOverlayOpacity(parsed) : getDefaultOverlayOpacity();
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSettingsStore = create<SettingsStore>((set, _get) => ({
  // === Initial State ===

  // General / Stealth
  isUndetectable: false,
  isMousePassthrough: false,
  disguiseMode: 'none',
  openOnLogin: false,
  themeMode: 'system',
  meetingInterfaceTheme: 'default',
  overlayOpacity: getInitialOverlayOpacity(),
  showTranscript: localStorage.getItem('natively_interviewer_transcript') !== 'false',
  autoScroll: localStorage.getItem('natively_auto_scroll') === 'true',

  // AI / Intelligence
  verboseLogging: false,
  meetingRetention: 'forever',
  providerDataScopes: {},
  screenUnderstandingMode: 'vision_first',
  technicalInterviewVisionFirst: true,
  reasoningEnabled: false,
  actionButtonMode: 'recap',

  // Language
  recognitionLanguage: '',
  selectedSttGroup: '',
  availableLanguages: {},
  autoDetectedLanguage: null,
  aiResponseLanguage: 'English',
  availableAiLanguages: [],

  // Audio Devices
  inputDevices: [],
  outputDevices: [],
  selectedInput: localStorage.getItem('preferredInputDeviceId') || '',
  selectedOutput: localStorage.getItem('preferredOutputDeviceId') || '',
  micLevel: 0,
  useExperimentalSck: localStorage.getItem('useExperimentalSckBackend') === 'true',
  deviceFallbackNotice: null,

  // STT Provider
  sttProvider: 'none',
  groqSttModel: 'whisper-large-v3-turbo',
  sttGroqKey: '',
  sttOpenaiKey: '',
  sttDeepgramKey: '',
  sttElevenLabsKey: '',
  sttAzureKey: '',
  sttAzureRegion: 'eastus',
  sttIbmKey: '',
  sttOpenaiBaseUrl: '',
  sttSonioxKey: '',
  sttTestStatus: 'idle',
  sttTestError: '',
  sttSaving: false,
  sttSaved: false,
  googleServiceAccountPath: null,
  hasNativelyKey: false,
  hasStoredSttGroqKey: false,
  hasStoredSttOpenaiKey: false,
  hasStoredDeepgramKey: false,
  hasStoredElevenLabsKey: false,
  hasStoredAzureKey: false,
  hasStoredIbmWatsonKey: false,
  hasStoredSonioxKey: false,

  // AI Provider Keys
  apiKey: '',
  groqApiKey: '',
  openaiApiKey: '',
  claudeApiKey: '',
  kimiApiKey: '',
  savedStatus: {},
  savingStatus: {},
  testStatus: {},
  testError: {},
  hasStoredKey: {},

  // Custom Providers
  customProviders: [],
  isEditingCustom: false,
  editingProvider: null,
  customName: '',
  customCurl: '',
  customResponsePath: '',
  curlError: null,

  // Ollama
  ollamaModels: [],
  ollamaStatus: 'checking',
  ollamaRestarted: false,
  isRefreshingOllama: false,

  // Codex CLI
  codexCliConfig: { enabled: false, path: 'codex', model: 'gpt-5.4', fastModel: 'gpt-5.3-codex-spark', timeoutMs: 60000 },
  codexCliStatus: 'idle',
  codexCliError: '',

  // Model Selection
  defaultModel: 'kimi-k2.5',
  fastResponseMode: false,
  credentialsLoaded: false,
  preferredModels: {},

  // Calendar
  calendarStatus: { connected: false },
  isCalendarsLoading: false,
  calendarEvents: [],
  isCalendarRefreshing: false,

  // Update
  updateStatus: 'idle',

  // Profile / Premium
  profileMode: false,
  hasProfile: false,
  isPremium: false,

  // UI State
  activeTab: 'general',
  isThemeDropdownOpen: false,
  isAiLangDropdownOpen: false,
  isInterfaceThemeDropdownOpen: false,
  isSttDropdownOpen: false,
  showVerboseToast: false,
  isPreviewingOpacity: false,
  previewOverlayOpacity: getInitialOverlayOpacity(),

  // Init
  isInitialized: false,

  // === Actions ===

  // General / Stealth
  setUndetectable: async (value) => {
    set({ isUndetectable: value });
    await window.electronAPI?.setUndetectable?.(value);
  },
  setMousePassthrough: async (value) => {
    set({ isMousePassthrough: value });
    await window.electronAPI?.setOverlayMousePassthrough?.(value);
  },
  setDisguiseMode: async (value) => {
    set({ disguiseMode: value });
    await window.electronAPI?.setDisguise?.(value);
  },
  setOpenOnLogin: async (value) => {
    set({ openOnLogin: value });
    await window.electronAPI?.setOpenAtLogin?.(value);
  },
  setThemeMode: async (value) => {
    set({ themeMode: value });
    await window.electronAPI?.setThemeMode?.(value);
  },
  setMeetingInterfaceTheme: (value) => {
    set({ meetingInterfaceTheme: value });
  },
  setOverlayOpacity: (value) => {
    const clamped = clampOverlayOpacity(value);
    set({ overlayOpacity: clamped, previewOverlayOpacity: clamped });
    localStorage.setItem('natively_overlay_opacity', String(clamped));
    window.electronAPI?.setOverlayOpacity?.(clamped);
  },
  setShowTranscript: (value) => {
    set({ showTranscript: value });
    localStorage.setItem('natively_interviewer_transcript', String(value));
    window.dispatchEvent(new Event('storage'));
  },
  setAutoScroll: (value) => {
    set({ autoScroll: value });
    localStorage.setItem('natively_auto_scroll', String(value));
    window.dispatchEvent(new Event('storage'));
  },

  // AI / Intelligence
  setVerboseLogging: async (value) => {
    set({ verboseLogging: value });
    await window.electronAPI?.setVerboseLogging?.(value);
  },
  setMeetingRetention: async (value) => {
    set({ meetingRetention: value });
    await window.electronAPI?.setMeetingRetention?.(value);
  },
  setProviderDataScopes: async (value) => {
    set({ providerDataScopes: value });
    await window.electronAPI?.setProviderDataScopes?.(value);
  },
  setScreenUnderstandingMode: async (value) => {
    set({ screenUnderstandingMode: value });
    await window.electronAPI?.setScreenUnderstandingMode?.(value);
  },
  setTechnicalInterviewVisionFirst: async (value) => {
    set({ technicalInterviewVisionFirst: value });
    if (window.electronAPI?.setTechnicalInterviewVisionFirst) {
      await window.electronAPI.setTechnicalInterviewVisionFirst(value);
    } else {
      await window.electronAPI?.setTechnicalInterviewDirectVision?.(value);
    }
  },
  setReasoningEnabled: async (value) => {
    set({ reasoningEnabled: value });
    await window.electronAPI?.setReasoningEnabled?.(value);
  },
  setActionButtonMode: async (value) => {
    set({ actionButtonMode: value });
    await window.electronAPI?.setActionButtonMode?.(value);
  },

  // Language
  setRecognitionLanguage: async (value) => {
    set({ recognitionLanguage: value, autoDetectedLanguage: null });
    await window.electronAPI?.setRecognitionLanguage?.(value);
  },
  setSelectedSttGroup: (value) => set({ selectedSttGroup: value }),
  setAvailableLanguages: (value) => set({ availableLanguages: value }),
  setAutoDetectedLanguage: (value) => set({ autoDetectedLanguage: value }),
  setAiResponseLanguage: async (value) => {
    set({ aiResponseLanguage: value });
    await window.electronAPI?.setAiResponseLanguage?.(value);
  },
  setAvailableAiLanguages: (value) => set({ availableAiLanguages: value }),

  // Audio Devices
  setInputDevices: (value) => set({ inputDevices: value }),
  setOutputDevices: (value) => set({ outputDevices: value }),
  setSelectedInput: (value) => {
    set({ selectedInput: value });
    localStorage.setItem('preferredInputDeviceId', value);
  },
  setSelectedOutput: (value) => {
    set({ selectedOutput: value });
    localStorage.setItem('preferredOutputDeviceId', value);
  },
  setMicLevel: (value) => set({ micLevel: value }),
  setUseExperimentalSck: (value) => {
    set({ useExperimentalSck: value });
    localStorage.setItem('useExperimentalSckBackend', value ? 'true' : 'false');
  },
  setDeviceFallbackNotice: (value) => set({ deviceFallbackNotice: value }),

  // STT Provider
  setSttProvider: async (value) => {
    set({ sttProvider: value, sttTestStatus: 'idle', sttTestError: '' });
    await window.electronAPI?.setSttProvider?.(value);
  },
  setGroqSttModel: async (value) => {
    set({ groqSttModel: value });
    await window.electronAPI?.setGroqSttModel?.(value);
  },
  setSttGroqKey: (value) => set({ sttGroqKey: value }),
  setSttOpenaiKey: (value) => set({ sttOpenaiKey: value }),
  setSttDeepgramKey: (value) => set({ sttDeepgramKey: value }),
  setSttElevenLabsKey: (value) => set({ sttElevenLabsKey: value }),
  setSttAzureKey: (value) => set({ sttAzureKey: value }),
  setSttAzureRegion: (value) => set({ sttAzureRegion: value }),
  setSttIbmKey: (value) => set({ sttIbmKey: value }),
  setSttOpenaiBaseUrl: (value) => set({ sttOpenaiBaseUrl: value }),
  setSttSonioxKey: (value) => set({ sttSonioxKey: value }),
  setSttTestStatus: (value) => set({ sttTestStatus: value }),
  setSttTestError: (value) => set({ sttTestError: value }),
  setSttSaving: (value) => set({ sttSaving: value }),
  setSttSaved: (value) => set({ sttSaved: value }),
  setGoogleServiceAccountPath: (value) => set({ googleServiceAccountPath: value }),
  setHasNativelyKey: (value) => set({ hasNativelyKey: value }),
  setHasStoredSttGroqKey: (value) => set({ hasStoredSttGroqKey: value }),
  setHasStoredSttOpenaiKey: (value) => set({ hasStoredSttOpenaiKey: value }),
  setHasStoredDeepgramKey: (value) => set({ hasStoredDeepgramKey: value }),
  setHasStoredElevenLabsKey: (value) => set({ hasStoredElevenLabsKey: value }),
  setHasStoredAzureKey: (value) => set({ hasStoredAzureKey: value }),
  setHasStoredIbmWatsonKey: (value) => set({ hasStoredIbmWatsonKey: value }),
  setHasStoredSonioxKey: (value) => set({ hasStoredSonioxKey: value }),

  // AI Provider Keys
  setApiKey: (value) => set({ apiKey: value }),
  setGroqApiKey: (value) => set({ groqApiKey: value }),
  setOpenaiApiKey: (value) => set({ openaiApiKey: value }),
  setClaudeApiKey: (value) => set({ claudeApiKey: value }),
  setKimiApiKey: (value) => set({ kimiApiKey: value }),
  setSavedStatus: (value) => set({ savedStatus: value }),
  setSavingStatus: (value) => set({ savingStatus: value }),
  setTestStatus: (value) => set({ testStatus: value }),
  setTestError: (value) => set({ testError: value }),
  setHasStoredKey: (value) => set({ hasStoredKey: value }),

  // Custom Providers
  setCustomProviders: (value) => set({ customProviders: value }),
  setIsEditingCustom: (value) => set({ isEditingCustom: value }),
  setEditingProvider: (value) => set({ editingProvider: value }),
  setCustomName: (value) => set({ customName: value }),
  setCustomCurl: (value) => set({ customCurl: value }),
  setCustomResponsePath: (value) => set({ customResponsePath: value }),
  setCurlError: (value) => set({ curlError: value }),

  // Ollama
  setOllamaModels: (value) => set({ ollamaModels: value }),
  setOllamaStatus: (value) => set({ ollamaStatus: value }),
  setOllamaRestarted: (value) => set({ ollamaRestarted: value }),
  setIsRefreshingOllama: (value) => set({ isRefreshingOllama: value }),

  // Codex CLI
  setCodexCliConfig: (value) => set({ codexCliConfig: value }),
  setCodexCliStatus: (value) => set({ codexCliStatus: value }),
  setCodexCliError: (value) => set({ codexCliError: value }),

  // Model Selection
  setDefaultModel: async (value) => {
    set({ defaultModel: value });
    await window.electronAPI?.setDefaultModel?.(value);
  },
  setFastResponseMode: async (value) => {
    set({ fastResponseMode: value });
    localStorage.setItem('natively_groq_fast_text', String(value));
    await window.electronAPI?.setGroqFastTextMode?.(value);
  },
  setCredentialsLoaded: (value) => set({ credentialsLoaded: value }),
  setPreferredModels: (value) => set({ preferredModels: value }),

  // Calendar
  setCalendarStatus: (value) => set({ calendarStatus: value }),
  setIsCalendarsLoading: (value) => set({ isCalendarsLoading: value }),
  setCalendarEvents: (value) => set({ calendarEvents: value }),
  setIsCalendarRefreshing: (value) => set({ isCalendarRefreshing: value }),

  // Update
  setUpdateStatus: (value) => set({ updateStatus: value }),

  // Profile / Premium
  setProfileMode: async (value) => {
    set({ profileMode: value });
    await window.electronAPI?.profileSetMode?.(value);
  },
  setHasProfile: (value) => set({ hasProfile: value }),
  setIsPremium: (value) => set({ isPremium: value }),

  // UI State
  setActiveTab: (value) => set({ activeTab: value }),
  setIsThemeDropdownOpen: (value) => set({ isThemeDropdownOpen: value }),
  setIsAiLangDropdownOpen: (value) => set({ isAiLangDropdownOpen: value }),
  setIsInterfaceThemeDropdownOpen: (value) => set({ isInterfaceThemeDropdownOpen: value }),
  setIsSttDropdownOpen: (value) => set({ isSttDropdownOpen: value }),
  setShowVerboseToast: (value) => set({ showVerboseToast: value }),
  setIsPreviewingOpacity: (value) => set({ isPreviewingOpacity: value }),
  setPreviewOverlayOpacity: (value) => set({ previewOverlayOpacity: value }),

  // Init
  setIsInitialized: (value) => set({ isInitialized: value }),

  // Bulk setter
  setState: (partial) => set(partial),
}));

// ---------------------------------------------------------------------------
// IPC Synchronization — fetch on init, subscribe to changes
// ---------------------------------------------------------------------------

let ipcUnsubscribers: Array<() => void> = [];

export function initializeSettingsStore(): () => void {
  const store = useSettingsStore.getState();

  // --- Fetch initial values from main process ---
  const init = async () => {
    try {
      const api = window.electronAPI;
      if (!api) return;

      // General
      const undetectable = await api.getUndetectable?.();
      if (typeof undetectable === 'boolean') store.setState({ isUndetectable: undetectable });

      const mousePassthrough = await api.getOverlayMousePassthrough?.();
      if (typeof mousePassthrough === 'boolean') store.setState({ isMousePassthrough: mousePassthrough });

      const disguise = await api.getDisguise?.();
      if (disguise) store.setState({ disguiseMode: disguise });

      const openAtLogin = await api.getOpenAtLogin?.();
      if (typeof openAtLogin === 'boolean') store.setState({ openOnLogin: openAtLogin });

      const theme = await api.getThemeMode?.();
      if (theme) store.setState({ themeMode: theme.mode });

      // AI / Intelligence
      const verbose = await api.getVerboseLogging?.();
      if (typeof verbose === 'boolean') store.setState({ verboseLogging: verbose });

      const retention = await api.getMeetingRetention?.();
      if (retention) store.setState({ meetingRetention: retention });

      const scopes = await api.getProviderDataScopes?.();
      if (scopes) store.setState({ providerDataScopes: scopes });

      const screenMode = await api.getScreenUnderstandingMode?.();
      if (screenMode) store.setState({ screenUnderstandingMode: screenMode });

      const techVision = await api.getTechnicalInterviewVisionFirst?.().catch(() =>
        api.getTechnicalInterviewDirectVision?.()
      );
      if (typeof techVision === 'boolean') store.setState({ technicalInterviewVisionFirst: techVision });

      const reasoning = await api.getReasoningEnabled?.();
      if (typeof reasoning === 'boolean') store.setState({ reasoningEnabled: reasoning });

      // Action button mode
      const actionMode = await api.getActionButtonMode?.();
      if (actionMode) store.setState({ actionButtonMode: actionMode });

      // Fast response mode
      const fastMode = await api.getGroqFastTextMode?.();
      if (fastMode) store.setState({ fastResponseMode: fastMode.enabled });

      // Default model
      const defaultModel = await api.getDefaultModel?.();
      if (defaultModel?.model) store.setState({ defaultModel: defaultModel.model });

      // Codex CLI config
      const codexConfig = await api.getCodexCliConfig?.();
      if (codexConfig) store.setState({ codexCliConfig: codexConfig });

      // Calendar
      const calStatus = await api.getCalendarStatus?.();
      if (calStatus) store.setState({ calendarStatus: calStatus });

      // Profile / Premium
      const profileStatus = await api.profileGetStatus?.();
      if (profileStatus) {
        store.setState({
          hasProfile: profileStatus.hasProfile,
          profileMode: profileStatus.profileMode,
        });
      }
      const premium = await api.licenseCheckPremium?.();
      store.setState({ isPremium: !!premium });

      // STT Provider
      const sttProv = await api.getSttProvider?.();
      if (sttProv) store.setState({ sttProvider: sttProv as SttProvider });

      // Credentials
      const creds = await api.getStoredCredentials?.();
      if (creds) {
        store.setState({
          hasStoredKey: {
            gemini: creds.hasGeminiKey,
            groq: creds.hasGroqKey,
            openai: creds.hasOpenaiKey,
            claude: creds.hasClaudeKey,
            kimi: creds.hasKimiKey,
            natively: creds.hasNativelyKey || false,
          },
          hasNativelyKey: creds.hasNativelyKey || false,
          hasStoredSttGroqKey: creds.hasSttGroqKey,
          hasStoredSttOpenaiKey: creds.hasSttOpenaiKey,
          hasStoredDeepgramKey: creds.hasDeepgramKey,
          hasStoredElevenLabsKey: creds.hasElevenLabsKey,
          hasStoredAzureKey: creds.hasAzureKey,
          hasStoredIbmWatsonKey: creds.hasIbmWatsonKey,
          hasStoredSonioxKey: creds.hasSonioxKey || false,
          googleServiceAccountPath: creds.googleServiceAccountPath,
          groqSttModel: creds.groqSttModel || 'whisper-large-v3-turbo',
          sttAzureRegion: creds.azureRegion || 'eastus',
        });

        const pm: Record<string, string> = {};
        if (creds.geminiPreferredModel) pm.gemini = creds.geminiPreferredModel;
        if (creds.groqPreferredModel) pm.groq = creds.groqPreferredModel;
        if (creds.openaiPreferredModel) pm.openai = creds.openaiPreferredModel;
        if (creds.claudePreferredModel) pm.claude = creds.claudePreferredModel;
        if (creds.kimiPreferredModel) pm.kimi = creds.kimiPreferredModel;
        store.setState({ preferredModels: pm });

        // Pre-populate key fields
        if (creds.sttGroqKey) store.setState({ sttGroqKey: creds.sttGroqKey });
        if (creds.sttOpenaiKey) store.setState({ sttOpenaiKey: creds.sttOpenaiKey });
        if (creds.sttDeepgramKey) store.setState({ sttDeepgramKey: creds.sttDeepgramKey });
        if (creds.sttElevenLabsKey) store.setState({ sttElevenLabsKey: creds.sttElevenLabsKey });
        if (creds.sttAzureKey) store.setState({ sttAzureKey: creds.sttAzureKey });
        if (creds.sttIbmKey) store.setState({ sttIbmKey: creds.sttIbmKey });
        if (creds.sttSonioxKey) store.setState({ sttSonioxKey: creds.sttSonioxKey });
        if (typeof creds.openAiSttBaseUrl === 'string') store.setState({ sttOpenaiBaseUrl: creds.openAiSttBaseUrl });
      }

      store.setState({ credentialsLoaded: true, isInitialized: true });
    } catch (e) {
      console.error('[SettingsStore] Initialization error:', e);
      store.setState({ credentialsLoaded: true, isInitialized: true });
    }
  };

  init();

  // --- Subscribe to IPC change events ---
  const api = window.electronAPI;
  if (api) {
    if (api.onUndetectableChanged) {
      ipcUnsubscribers.push(api.onUndetectableChanged((state) => {
        useSettingsStore.setState({ isUndetectable: state });
      }));
    }
    if (api.onOverlayMousePassthroughChanged) {
      ipcUnsubscribers.push(api.onOverlayMousePassthroughChanged((enabled) => {
        useSettingsStore.setState({ isMousePassthrough: enabled });
      }));
    }
    if (api.onDisguiseChanged) {
      ipcUnsubscribers.push(api.onDisguiseChanged((mode) => {
        useSettingsStore.setState({ disguiseMode: mode as DisguiseMode });
      }));
    }
    if (api.onMeetingRetentionChanged) {
      ipcUnsubscribers.push(api.onMeetingRetentionChanged((retention) => {
        useSettingsStore.setState({ meetingRetention: retention });
      }));
    }
    if (api.onProviderDataScopesChanged) {
      ipcUnsubscribers.push(api.onProviderDataScopesChanged((scopes) => {
        useSettingsStore.setState({ providerDataScopes: scopes });
      }));
    }
    if (api.onScreenUnderstandingModeChanged) {
      ipcUnsubscribers.push(api.onScreenUnderstandingModeChanged((mode) => {
        useSettingsStore.setState({ screenUnderstandingMode: mode as ScreenUnderstandingMode });
      }));
    }
    if (api.onTechnicalInterviewVisionFirstChanged) {
      ipcUnsubscribers.push(api.onTechnicalInterviewVisionFirstChanged((enabled) => {
        useSettingsStore.setState({ technicalInterviewVisionFirst: enabled });
      }));
    }
    if ((api as any).onTechnicalInterviewDirectVisionChanged) {
      ipcUnsubscribers.push((api as any).onTechnicalInterviewDirectVisionChanged((enabled: boolean) => {
        useSettingsStore.setState({ technicalInterviewVisionFirst: enabled });
      }));
    }
    if (api.onReasoningEnabledChanged) {
      ipcUnsubscribers.push(api.onReasoningEnabledChanged((enabled) => {
        useSettingsStore.setState({ reasoningEnabled: enabled });
      }));
    }
    if (api.onGroqFastTextChanged) {
      ipcUnsubscribers.push(api.onGroqFastTextChanged((enabled) => {
        useSettingsStore.setState({ fastResponseMode: enabled });
        localStorage.setItem('natively_groq_fast_text', String(enabled));
      }));
    }
    if (api.onActionButtonModeChanged) {
      ipcUnsubscribers.push(api.onActionButtonModeChanged((mode) => {
        useSettingsStore.setState({ actionButtonMode: mode as ActionButtonMode });
      }));
    }
    if (api.onThemeChanged) {
      ipcUnsubscribers.push(api.onThemeChanged(({ mode }) => {
        useSettingsStore.setState({ themeMode: mode as ThemeMode });
      }));
    }
    if (api.onSttLanguageAutoDetected) {
      ipcUnsubscribers.push(api.onSttLanguageAutoDetected((bcp47) => {
        useSettingsStore.setState({ autoDetectedLanguage: bcp47 });
      }));
    }
    if (api.onCredentialsChanged) {
      ipcUnsubscribers.push(api.onCredentialsChanged(() => {
        // Re-fetch credentials
        api.getStoredCredentials?.().then((creds: any) => {
          if (!creds) return;
          useSettingsStore.setState({
            sttProvider: creds.sttProvider || 'none',
            groqSttModel: creds.groqSttModel || 'whisper-large-v3-turbo',
            hasNativelyKey: creds.hasNativelyKey || false,
            hasStoredSttGroqKey: creds.hasSttGroqKey,
            hasStoredSttOpenaiKey: creds.hasSttOpenaiKey,
            hasStoredDeepgramKey: creds.hasDeepgramKey,
            hasStoredElevenLabsKey: creds.hasElevenLabsKey,
            hasStoredAzureKey: creds.hasAzureKey,
            hasStoredIbmWatsonKey: creds.hasIbmWatsonKey,
            hasStoredSonioxKey: creds.hasSonioxKey || false,
            googleServiceAccountPath: creds.googleServiceAccountPath,
            hasStoredKey: {
              gemini: creds.hasGeminiKey,
              groq: creds.hasGroqKey,
              openai: creds.hasOpenaiKey,
              claude: creds.hasClaudeKey,
              kimi: creds.hasKimiKey,
              natively: creds.hasNativelyKey || false,
            },
          });
        }).catch(() => {});
      }));
    }
    if (api.onOverlayOpacityChanged) {
      ipcUnsubscribers.push(api.onOverlayOpacityChanged((opacity) => {
        useSettingsStore.setState({ overlayOpacity: opacity, previewOverlayOpacity: opacity });
      }));
    }
    if (api.onLicenseStatusChanged) {
      ipcUnsubscribers.push(api.onLicenseStatusChanged((data) => {
        useSettingsStore.setState({ isPremium: data.isPremium });
      }));
    }
  }

  return () => {
    ipcUnsubscribers.forEach((unsub) => unsub?.());
    ipcUnsubscribers = [];
  };
}

// ---------------------------------------------------------------------------
// Selectors (derived state)
// ---------------------------------------------------------------------------

export const selectCanUseFastMode = (state: SettingsStore): boolean => {
  return !!(state.hasStoredKey.groq || state.hasStoredKey.natively || state.codexCliConfig.enabled);
};

export const selectIsSttKeyStored = (state: SettingsStore, provider: string): boolean => {
  const map: Record<string, boolean> = {
    groq: state.hasStoredSttGroqKey,
    openai: state.hasStoredSttOpenaiKey,
    deepgram: state.hasStoredDeepgramKey,
    elevenlabs: state.hasStoredElevenLabsKey,
    azure: state.hasStoredAzureKey,
    ibmwatson: state.hasStoredIbmWatsonKey,
    soniox: state.hasStoredSonioxKey,
  };
  return map[provider] ?? false;
};

export const selectSttKeyValue = (state: SettingsStore, provider: string): string => {
  const map: Record<string, string> = {
    groq: state.sttGroqKey,
    openai: state.sttOpenaiKey,
    deepgram: state.sttDeepgramKey,
    elevenlabs: state.sttElevenLabsKey,
    azure: state.sttAzureKey,
    ibmwatson: state.sttIbmKey,
    soniox: state.sttSonioxKey,
  };
  return map[provider] ?? '';
};
