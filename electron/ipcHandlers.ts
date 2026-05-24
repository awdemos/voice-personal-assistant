import { IpcMain } from "electron";
import { AppState } from "./main";
import { registerAllIpcModules } from "./ipc";

export function initializeIpcHandlers(appState: AppState): void {
  registerAllIpcModules(require("electron").ipcMain, appState);
}
