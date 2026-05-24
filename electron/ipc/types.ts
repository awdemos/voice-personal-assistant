// electron/ipc/types.ts
// Shared types and helpers for domain-specific IPC modules.

import { IpcMain, BrowserWindow } from "electron";

/**
 * Safe wrapper around ipcMain.handle that removes any existing handler
 * before registering a new one — prevents duplicate-handler crashes.
 */
export type SafeHandle = (
  channel: string,
  listener: (event: any, ...args: any[]) => Promise<any> | any
) => void;

export function createSafeHandle(ipcMain: IpcMain): SafeHandle {
  return (channel, listener) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, listener);
  };
}

/**
 * Returns true if the user has an active premium license OR an unexpired free trial.
 * Used to gate profile intelligence features (resume upload, JD upload, company research, etc.).
 */
export function isProOrTrialActive(): boolean {
  // 1. Full premium license (Dodo / Gumroad / Natively API subscription)
  try {
    const { LicenseManager } = require("../premium/electron/services/LicenseManager");
    if (LicenseManager.getInstance().isPremium()) return true;
  } catch {
    /* premium module not available */
  }

  // 2. Active free trial (token present and not expired)
  try {
    const { CredentialsManager } = require("../services/CredentialsManager");
    const cm = CredentialsManager.getInstance();
    const token = cm.getTrialToken();
    if (!token) return false;
    const expiresAt = cm.getTrialExpiresAt();
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() > Date.now();
  } catch {
    return false;
  }
}

/**
 * Clears the active mode when the pro license is lost so non-general mode prompts
 * and reference files stop being injected into LLM calls.
 */
export function clearActiveModeOnLicenseLoss(): void {
  try {
    const { DatabaseManager } = require("../db/DatabaseManager");
    DatabaseManager.getInstance().setActiveMode(null);
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.webContents.send("modes-active-cleared");
    });
    console.log("[IPC] Active mode cleared due to license loss");
  } catch (e) {
    /* non-fatal */
  }
}

/**
 * Helper to sanitize error messages (remove API key references).
 */
export function sanitizeErrorMessage(msg: string): string {
  // Remove patterns like ": sk-***...***" or ": sdasdada***...dwwC"
  return msg.replace(/:\s*[a-zA-Z0-9*]+\*+[a-zA-Z0-9*]+\.?$/g, "").trim();
}
