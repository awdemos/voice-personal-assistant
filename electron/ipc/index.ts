import { IpcMain } from "electron";
import { AppState } from "../main";
import * as LicenseIpcModule from "./LicenseIpcModule";
import * as SettingsIpcModule from "./SettingsIpcModule";
import * as AudioIpcModule from "./AudioIpcModule";
import * as WindowIpcModule from "./WindowIpcModule";
import * as ScreenshotIpcModule from "./ScreenshotIpcModule";
import * as LlmIpcModule from "./LlmIpcModule";
import * as IntelligenceIpcModule from "./IntelligenceIpcModule";
import * as SystemIpcModule from "./SystemIpcModule";
import * as ModeIpcModule from "./ModeIpcModule";

export function registerAllIpcModules(ipcMain: IpcMain, appState: AppState): void {
  LicenseIpcModule.register(ipcMain, appState);
  SettingsIpcModule.register(ipcMain, appState);
  AudioIpcModule.register(ipcMain, appState);
  WindowIpcModule.register(ipcMain, appState);
  ScreenshotIpcModule.register(ipcMain, appState);
  LlmIpcModule.register(ipcMain, appState);
  IntelligenceIpcModule.register(ipcMain, appState);
  SystemIpcModule.register(ipcMain, appState);
  ModeIpcModule.register(ipcMain, appState);
}
