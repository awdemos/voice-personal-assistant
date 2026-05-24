import { IpcMain, app } from "electron";
import * as path from "path";
import { AppState } from "../main";
import { createSafeHandle } from "./types";

export function register(ipcMain: IpcMain, appState: AppState): void {
  const safeHandle = createSafeHandle(ipcMain);

  safeHandle("delete-screenshot", async (event, filePath: string) => {
    const userDataDir = app.getPath("userData");
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(userDataDir + path.sep)) {
      console.warn("[IPC] delete-screenshot: path outside userData rejected:", filePath);
      return { success: false, error: "Path not allowed" };
    }
    return appState.deleteScreenshot(resolved);
  });

  safeHandle("take-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeScreenshot();
      const preview = await appState.getImagePreview(screenshotPath);
      return { path: screenshotPath, preview };
    } catch (error) {
      throw error;
    }
  });

  safeHandle("take-selective-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeSelectiveScreenshot();
      const preview = await appState.getImagePreview(screenshotPath);
      return { path: screenshotPath, preview };
    } catch (error) {
      if ((error as Error).message === "Selection cancelled") {
        return { cancelled: true };
      }
      throw error;
    }
  });

  safeHandle("get-screenshots", async () => {
    try {
      let previews = [];
      if (appState.getView() === "queue") {
        previews = await Promise.all(
          appState.getScreenshotQueue().map(async (p) => ({
            path: p,
            preview: await appState.getImagePreview(p),
          }))
        );
      } else {
        previews = await Promise.all(
          appState.getExtraScreenshotQueue().map(async (p) => ({
            path: p,
            preview: await appState.getImagePreview(p),
          }))
        );
      }
      return previews;
    } catch (error) {
      throw error;
    }
  });

  safeHandle("reset-queues", async () => {
    try {
      appState.clearQueues();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("analyze-image-file", async (event, filePath: string) => {
    const userDataDir = app.getPath("userData");
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(userDataDir + path.sep)) {
      console.warn("[IPC] analyze-image-file: path outside userData rejected:", filePath);
      throw new Error("Path not allowed");
    }
    try {
      const result = await appState.processingHelper.getLLMHelper().analyzeImageFiles([resolved]);
      return result;
    } catch (error: any) {
      throw error;
    }
  });
}
