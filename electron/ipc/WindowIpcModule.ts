import { IpcMain, app, BrowserWindow } from "electron";
import { AppState } from "../main";
import { createSafeHandle } from "./types";

export function register(ipcMain: IpcMain, appState: AppState): void {
  const safeHandle = createSafeHandle(ipcMain);

  safeHandle("update-content-dimensions", async (event, { width, height }: { width: number; height: number }) => {
    if (!width || !height) return;
    const senderWebContents = event.sender;
    const settingsWin = appState.settingsWindowHelper.getSettingsWindow();
    const overlayWin = appState.getWindowHelper().getOverlayWindow();
    const launcherWin = appState.getWindowHelper().getLauncherWindow();

    if (settingsWin && !settingsWin.isDestroyed() && settingsWin.webContents.id === senderWebContents.id) {
      appState.settingsWindowHelper.setWindowDimensions(settingsWin, width, height);
    } else if (overlayWin && !overlayWin.isDestroyed() && overlayWin.webContents.id === senderWebContents.id) {
      appState.getWindowHelper().setOverlayDimensions(width, height);
    } else if (launcherWin && !launcherWin.isDestroyed() && launcherWin.webContents.id === senderWebContents.id) {
      console.log(`[IPC] update-content-dimensions: launcher window resize request ${width}x${height} (ignored — launcher has fixed dimensions)`);
    }
  });

  safeHandle("update-content-dimensions-centered", async (event, { width, height }: { width: number; height: number }) => {
    if (!width || !height) return;
    const senderWebContents = event.sender;
    const overlayWin = appState.getWindowHelper().getOverlayWindow();
    if (overlayWin && !overlayWin.isDestroyed() && overlayWin.webContents.id === senderWebContents.id) {
      appState.getWindowHelper().setOverlayDimensionsCentered(width, height);
    }
  });

  safeHandle("set-window-mode", async (event, mode: "launcher" | "overlay", inactive?: boolean) => {
    appState.getWindowHelper().setWindowMode(mode, inactive);
    return { success: true };
  });

  safeHandle("toggle-window", async () => {
    appState.toggleMainWindow();
  });

  safeHandle("show-window", async (event, inactive?: boolean) => {
    appState.showMainWindow(inactive);
  });

  safeHandle("hide-window", async () => {
    appState.hideMainWindow();
  });

  safeHandle("show-overlay", async () => {
    appState.getWindowHelper().showOverlay();
  });

  safeHandle("hide-overlay", async () => {
    appState.getWindowHelper().hideOverlay();
  });

  safeHandle("move-window-left", async () => {
    appState.moveWindowLeft();
  });

  safeHandle("move-window-right", async () => {
    appState.moveWindowRight();
  });

  safeHandle("move-window-up", async () => {
    appState.moveWindowUp();
  });

  safeHandle("move-window-down", async () => {
    appState.moveWindowDown();
  });

  safeHandle("center-and-show-window", async () => {
    appState.centerAndShowWindow();
  });

  safeHandle("window-minimize", async () => {
    appState.getWindowHelper().minimizeWindow();
  });

  safeHandle("window-maximize", async () => {
    appState.getWindowHelper().maximizeWindow();
  });

  safeHandle("window-close", async () => {
    appState.getWindowHelper().closeWindow();
  });

  safeHandle("window-is-maximized", async () => {
    return appState.getWindowHelper().isMainWindowMaximized();
  });

  safeHandle("resize-launcher", async (_event, { width, height }: { width: number; height: number }) => {
    if (!width || !height) return;
    appState.getWindowHelper().setLauncherDimensions(width, height);
  });

  safeHandle("toggle-settings-window", (event, { x, y } = {} as any) => {
    appState.settingsWindowHelper.toggleWindow(x, y);
  });

  safeHandle("settings:open-tab", (_, tab: string) => {
    const launcherWin = appState.getWindowHelper().getLauncherWindow();
    if (launcherWin && !launcherWin.isDestroyed()) {
      launcherWin.webContents.send("settings:open-tab", tab);
      launcherWin.show();
      launcherWin.focus();
    }
  });

  safeHandle("close-settings-window", () => {
    appState.settingsWindowHelper.closeWindow();
  });

  safeHandle("set-undetectable", async (_, state: boolean) => {
    appState.setUndetectable(state);
    return { success: true };
  });

  safeHandle("set-disguise", async (_, mode: "terminal" | "settings" | "activity" | "none") => {
    appState.setDisguise(mode);
    return { success: true };
  });

  safeHandle("get-undetectable", async () => {
    return appState.getUndetectable();
  });

  safeHandle("set-overlay-mouse-passthrough", async (_, enabled: boolean) => {
    appState.setOverlayMousePassthrough(enabled);
    return { success: true };
  });

  safeHandle("toggle-overlay-mouse-passthrough", async () => {
    const enabled = appState.toggleOverlayMousePassthrough();
    return { success: true, enabled };
  });

  safeHandle("get-overlay-mouse-passthrough", async () => {
    return appState.getOverlayMousePassthrough();
  });

  safeHandle("get-disguise", async () => {
    return appState.getDisguise();
  });

  safeHandle("set-overlay-opacity", async (_, opacity: number) => {
    const clamped = Math.min(1.0, Math.max(0.35, opacity));
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("overlay-opacity-changed", clamped);
      }
    });
  });
}
