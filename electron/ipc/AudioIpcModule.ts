import { IpcMain, BrowserWindow } from "electron";
import { AppState } from "../main";
import { createSafeHandle, sanitizeErrorMessage } from "./types";
import { AudioDevices } from "../audio/AudioDevices";

export function register(ipcMain: IpcMain, appState: AppState): void {
  const safeHandle = createSafeHandle(ipcMain);

  safeHandle("set-stt-provider", async (_, provider: "none" | "google" | "groq" | "openai" | "deepgram" | "elevenlabs" | "azure" | "ibmwatson" | "soniox" | "natively") => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setSttProvider(provider);
      await appState.reconfigureSttProvider();
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send("credentials-changed");
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error setting STT provider:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("get-stt-provider", async () => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      return CredentialsManager.getInstance().getSttProvider();
    } catch {
      return "none";
    }
  });

  safeHandle("set-groq-stt-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setGroqSttApiKey(apiKey);
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send("credentials-changed");
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error saving Groq STT API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-openai-stt-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setOpenAiSttApiKey(apiKey);
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send("credentials-changed");
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error saving OpenAI STT API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-openai-stt-base-url", async (_, url: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setOpenAiSttBaseUrl(url);
      await appState.reconfigureSttProvider();
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send("credentials-changed");
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error saving OpenAI STT base URL:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-deepgram-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setDeepgramApiKey(apiKey);
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send("credentials-changed");
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error saving Deepgram API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-groq-stt-model", async (_, model: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setGroqSttModel(model);
      await appState.reconfigureSttProvider();
      return { success: true };
    } catch (error: any) {
      console.error("Error setting Groq STT model:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-elevenlabs-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setElevenLabsApiKey(apiKey);
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send("credentials-changed");
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error saving ElevenLabs API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-azure-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setAzureApiKey(apiKey);
      return { success: true };
    } catch (error: any) {
      console.error("Error saving Azure API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-azure-region", async (_, region: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setAzureRegion(region);
      await appState.reconfigureSttProvider();
      return { success: true };
    } catch (error: any) {
      console.error("Error setting Azure region:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-ibmwatson-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setIbmWatsonApiKey(apiKey);
      return { success: true };
    } catch (error: any) {
      console.error("Error saving IBM Watson API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-soniox-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setSonioxApiKey(apiKey);
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) win.webContents.send("credentials-changed");
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error saving Soniox API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-ibmwatson-region", async (_, region: string) => {
    try {
      const { CredentialsManager } = require("../services/CredentialsManager");
      CredentialsManager.getInstance().setIbmWatsonRegion(region);
      await appState.reconfigureSttProvider();
      return { success: true };
    } catch (error: any) {
      console.error("Error setting IBM Watson region:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("test-stt-connection", async (_, provider: "groq" | "openai" | "deepgram" | "elevenlabs" | "azure" | "ibmwatson" | "soniox", apiKey: string, region?: string) => {
    console.log(`[IPC] Received test - stt - connection request for provider: ${provider} `);
    try {
      if (provider === "deepgram") {
        const WebSocket = require("ws");
        const token = apiKey.trim();
        return await new Promise<{ success: boolean; error?: string }>((resolve) => {
          const url = "wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate=16000&channels=1";
          const ws = new WebSocket(url, { headers: { Authorization: `Token ${token}` } });
          const timeout = setTimeout(() => {
            ws.close();
            console.error("[IPC] Deepgram test failed: Connection timed out");
            resolve({ success: false, error: "Connection timed out" });
          }, 15000);
          ws.on("open", () => {
            clearTimeout(timeout);
            try { ws.send(JSON.stringify({ type: "CloseStream" })); } catch {}
            ws.close();
            resolve({ success: true });
          });
          ws.on("unexpected-response", (request: any, response: any) => {
            clearTimeout(timeout);
            const status = response.statusCode;
            let body = "";
            response.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            response.on("end", () => {
              const errMsg = `Unexpected server response: ${status} - ${body}`;
              console.error(`[IPC] Deepgram test failed: ${errMsg}`);
              resolve({ success: false, error: errMsg });
            });
          });
          ws.on("error", (err: any) => {
            clearTimeout(timeout);
            console.error(`[IPC] Deepgram test error: ${err.message}`);
            resolve({ success: false, error: err.message || "Connection failed" });
          });
        });
      }

      if (provider === "soniox") {
        const WebSocket = require("ws");
        return await new Promise<{ success: boolean; error?: string }>((resolve) => {
          let resolved = false;
          const done = (result: { success: boolean; error?: string }) => {
            if (resolved) return;
            resolved = true;
            try { ws.close(); } catch {}
            resolve(result);
          };
          const ws = new WebSocket("wss://stt-rt.soniox.com/transcribe-websocket");
          const connectTimeout = setTimeout(() => {
            done({ success: false, error: "Connection timed out" });
          }, 10000);
          ws.on("open", () => {
            clearTimeout(connectTimeout);
            ws.send(JSON.stringify({
              api_key: apiKey,
              model: "stt-rt-v4",
              audio_format: "pcm_s16le",
              sample_rate: 16000,
              num_channels: 1,
            }));
            setTimeout(() => done({ success: true }), 2500);
          });
          ws.on("message", (msg: any) => {
            try {
              const res = JSON.parse(msg.toString());
              if (res.error_code) {
                done({ success: false, error: `${res.error_code}: ${res.error_message}` });
              }
            } catch {}
          });
          ws.on("error", (err: any) => {
            clearTimeout(connectTimeout);
            done({ success: false, error: err.message || "Connection failed" });
          });
          ws.on("close", (code: number) => {
            if (!resolved && code !== 1000) {
              done({ success: false, error: `Server closed connection (code ${code})` });
            }
          });
        });
      }

      const axios = require("axios");
      const FormData = require("form-data");
      const numSamples = 8000;
      const pcmData = Buffer.alloc(numSamples * 2);
      const wavHeader = Buffer.alloc(44);
      wavHeader.write("RIFF", 0);
      wavHeader.writeUInt32LE(36 + pcmData.length, 4);
      wavHeader.write("WAVE", 8);
      wavHeader.write("fmt ", 12);
      wavHeader.writeUInt32LE(16, 16);
      wavHeader.writeUInt16LE(1, 20);
      wavHeader.writeUInt16LE(1, 22);
      wavHeader.writeUInt32LE(16000, 24);
      wavHeader.writeUInt32LE(32000, 28);
      wavHeader.writeUInt16LE(2, 32);
      wavHeader.writeUInt16LE(16, 34);
      wavHeader.write("data", 36);
      wavHeader.writeUInt32LE(pcmData.length, 40);
      const testWav = Buffer.concat([wavHeader, pcmData]);

      if (provider === "elevenlabs") {
        try {
          await axios.get("https://api.elevenlabs.io/v1/voices", {
            headers: { "xi-api-key": apiKey },
            timeout: 10000,
          });
        } catch (elErr: any) {
          const elStatus = elErr?.response?.data?.detail?.status;
          if (elStatus === "invalid_api_key") {
            throw elErr;
          }
          console.log("[IPC] ElevenLabs key is valid but may have restricted scopes. Saving key.");
        }
      } else if (provider === "azure") {
        const azureRegion = region || "eastus";
        await axios.post(
          `https://${azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`,
          testWav,
          { headers: { "Ocp-Apim-Subscription-Key": apiKey, "Content-Type": "audio/wav" }, timeout: 15000 }
        );
      } else if (provider === "ibmwatson") {
        const ibmRegion = region || "us-south";
        await axios.post(
          `https://api.${ibmRegion}.speech-to-text.watson.cloud.ibm.com/v1/recognize`,
          testWav,
          {
            headers: {
              Authorization: `Basic ${Buffer.from(`apikey:${apiKey}`).toString("base64")}`,
              "Content-Type": "audio/wav",
            },
            timeout: 15000,
          }
        );
      } else {
        let openAiEndpoint = "https://api.openai.com/v1/audio/transcriptions";
        if (provider === "openai") {
          const { CredentialsManager } = require("../services/CredentialsManager");
          const customBase = (CredentialsManager.getInstance().getOpenAiSttBaseUrl() || "").trim();
          if (customBase) {
            const trimmed = customBase.replace(/\/+$/, "");
            openAiEndpoint = /\/v\d+$/.test(trimmed)
              ? `${trimmed}/audio/transcriptions`
              : `${trimmed}/v1/audio/transcriptions`;
          }
        }
        const endpoint = provider === "groq"
          ? "https://api.groq.com/openai/v1/audio/transcriptions"
          : openAiEndpoint;
        const model = provider === "groq" ? "whisper-large-v3-turbo" : "whisper-1";

        const form = new FormData();
        form.append("file", testWav, { filename: "test.wav", contentType: "audio/wav" });
        form.append("model", model);

        await axios.post(endpoint, form, {
          headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
          timeout: 15000,
        });
      }

      return { success: true };
    } catch (error: any) {
      const respData = error?.response?.data;
      const rawMsg = respData?.error?.message || respData?.detail?.message || respData?.message || error.message || "Connection failed";
      const msg = sanitizeErrorMessage(rawMsg);
      console.error("STT connection test failed:", msg);
      return { success: false, error: msg };
    }
  });

  const activeWhisperDownloads = new Set<string>();

  safeHandle("local-whisper-get-models", async () => {
    try {
      const { getAvailableModels } = require("../audio/whisper/modelManager");
      const models = getAvailableModels();
      const activeModelId = require("../services/SettingsManager").SettingsManager.getInstance().get("localWhisperModel") ?? "";
      return { models, activeModelId };
    } catch (e: any) {
      console.error("[IPC] local-whisper-get-models error:", e.message);
      return { models: [], activeModelId: "" };
    }
  });

  safeHandle("local-whisper-set-model", async (_, modelId: string) => {
    try {
      require("../services/SettingsManager").SettingsManager.getInstance().set("localWhisperModel", modelId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  safeHandle("local-whisper-get-channel-config", async () => {
    const sm = require("../services/SettingsManager").SettingsManager.getInstance();
    return {
      enabled: !!sm.get("localWhisperPerChannelEnabled"),
      micModelId: sm.get("localWhisperModelMic") ?? "",
      systemModelId: sm.get("localWhisperModelSystem") ?? "",
      globalModelId: sm.get("localWhisperModel") ?? "",
    };
  });

  safeHandle("local-whisper-set-channel-config", async (_, cfg: { enabled?: boolean; micModelId?: string; systemModelId?: string }) => {
    try {
      const sm = require("../services/SettingsManager").SettingsManager.getInstance();
      if (typeof cfg?.enabled === "boolean") sm.set("localWhisperPerChannelEnabled", cfg.enabled);
      if (typeof cfg?.micModelId === "string") sm.set("localWhisperModelMic", cfg.micModelId);
      if (typeof cfg?.systemModelId === "string") sm.set("localWhisperModelSystem", cfg.systemModelId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  safeHandle("local-whisper-delete-model", async (_, modelId: string) => {
    try {
      const { deleteModel } = require("../audio/whisper/modelManager");
      deleteModel(modelId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  safeHandle("local-whisper-start-download", async (event, modelId: string) => {
    if (activeWhisperDownloads.has(modelId)) {
      return { success: false, error: "already-downloading" };
    }
    activeWhisperDownloads.add(modelId);
    try {
      const { Worker } = require("worker_threads");
      const nodePath = require("path");
      const { buildWorkerInitMessage } = require("../audio/whisper/inferenceConfig");
      const workerPath = nodePath.join(__dirname, "..", "audio", "whisper", "whisperWorker.js");
      const w = new Worker(workerPath);
      const sender = event.sender;
      w.on("message", (msg: any) => {
        if (sender.isDestroyed()) return;
        if (msg.type === "progress") {
          sender.send("local-whisper-download-progress", { modelId, progress: msg.progress });
        } else if (msg.type === "ready") {
          activeWhisperDownloads.delete(modelId);
          sender.send("local-whisper-download-complete", { modelId });
          w.terminate();
        } else if (msg.type === "error") {
          activeWhisperDownloads.delete(modelId);
          sender.send("local-whisper-download-error", { modelId, error: msg.message });
          w.terminate();
        }
      });
      w.on("error", (err: Error) => {
        activeWhisperDownloads.delete(modelId);
        if (!sender.isDestroyed()) {
          sender.send("local-whisper-download-error", { modelId, error: err.message });
        }
      });
      w.postMessage(buildWorkerInitMessage(modelId));
      return { success: true };
    } catch (e: any) {
      activeWhisperDownloads.delete(modelId);
      return { success: false, error: e.message };
    }
  });

  safeHandle("local-whisper-preload", async (_, modelId: string) => {
    try {
      const { modelPreloader } = require("../audio/whisper/modelPreloader");
      const { isModelCached } = require("../audio/whisper/modelManager");
      const { resolveInferenceConfig } = require("../audio/whisper/inferenceConfig");
      const { SettingsManager } = require("../services/SettingsManager");
      const id = modelId || SettingsManager.getInstance().get("localWhisperModel") || "Xenova/whisper-tiny.en";
      const { dtype } = resolveInferenceConfig();
      if (!isModelCached(id, dtype)) {
        return { success: false, reason: "model-not-cached" };
      }
      modelPreloader.preload(id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  safeHandle("local-whisper-get-hardware", () => {
    const { detectHardware } = require("../audio/whisper/hardwareDetect");
    return detectHardware();
  });

  safeHandle("native-audio-status", async () => {
    return { connected: true };
  });

  safeHandle("get-input-devices", async () => {
    return AudioDevices.getInputDevices();
  });

  safeHandle("get-output-devices", async () => {
    return AudioDevices.getOutputDevices();
  });

  safeHandle("start-audio-test", async (event, deviceId?: string) => {
    await appState.startAudioTest(deviceId);
    return { success: true };
  });

  safeHandle("stop-audio-test", async () => {
    appState.stopAudioTest();
    return { success: true };
  });

  safeHandle("set-recognition-language", async (_, key: string) => {
    appState.setRecognitionLanguage(key);
    return { success: true };
  });

  safeHandle("finalize-mic-stt", async () => {
    appState.finalizeMicSTT();
  });
}
