import { app, BrowserWindow } from "electron";
import * as path from "path";
import * as fs from "fs";
import {
  MAIN_WINDOW_VITE_DEV_SERVER_URL,
  MAIN_WINDOW_VITE_PRELOAD,
} from "../vite-constants";

/**
 * Window management utilities
 */

let mainWindow: BrowserWindow | null = null;

/**
 * Create the application window
 */
export function createWindow(): void {
  console.log("[WINDOW] Creating browser window...");
  try {
    // Get icon path - works in both dev and production
    let iconPath: string | undefined;
    try {
      // Try to find icon in assets directory (relative to project root)
      // In dev: __dirname is .vite/build/main, so go up 3 levels to project root
      // In prod: __dirname is the app's resources path
      const iconPathDev = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "assets",
        "icon.png"
      );
      const iconPathProd = path.join(
        process.resourcesPath,
        "assets",
        "icon.png"
      );

      // Check if icon exists in dev location
      if (fs.existsSync(iconPathDev)) {
        iconPath = iconPathDev;
        console.log("[WINDOW] Using icon from assets directory:", iconPath);
      } else if (fs.existsSync(iconPathProd)) {
        iconPath = iconPathProd;
        console.log("[WINDOW] Using icon from production resources:", iconPath);
      } else {
        console.log("[WINDOW] Icon not found, using default Electron icon");
      }
    } catch (iconError) {
      console.log("[WINDOW] Could not load icon:", iconError);
    }

    // Create the browser window
    mainWindow = new BrowserWindow({
      height: 800,
      width: 1200,
      icon: iconPath, // Set icon for window (works in dev and production)
      webPreferences: {
        preload: MAIN_WINDOW_VITE_PRELOAD,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });
    console.log(
      "[WINDOW] Browser window created with preload:",
      MAIN_WINDOW_VITE_PRELOAD
    );

    // Load the index.html of the app
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // Load from dev server if available
      console.log(
        "[WINDOW] Loading URL from dev server:",
        MAIN_WINDOW_VITE_DEV_SERVER_URL
      );
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch((error) => {
        console.error("[WINDOW] Error loading URL:", error);
      });
    } else {
      // Load from file in production
      // __dirname is .vite/build, so we need to go up one level then into renderer
      const indexPath = path.join(
        __dirname,
        "..",
        "renderer",
        "main_window",
        "index.html"
      );
      console.log("[WINDOW] Loading from file:", indexPath);
      mainWindow.loadFile(indexPath).catch((error) => {
        console.error("[WINDOW] Error loading file:", error);
      });
    }

    // Open DevTools in development
    if (process.env.NODE_ENV === "development") {
      console.log("[WINDOW] Opening DevTools (development mode)");
      mainWindow.webContents.openDevTools();
    }

    mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription) => {
        console.error(
          "[WINDOW] Failed to load page:",
          errorCode,
          errorDescription
        );
      }
    );

    mainWindow.webContents.on("did-finish-load", () => {
      console.log("[WINDOW] Page finished loading");
    });

    mainWindow.webContents.on("dom-ready", () => {
      console.log("[WINDOW] DOM ready");
    });
  } catch (error) {
    console.error("[WINDOW] Error creating window:", error);
  }
}

/**
 * Get the main window instance
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Setup application lifecycle handlers
 */
export function setupAppLifecycle(): void {
  // This method will be called when Electron has finished initialization
  app.on("ready", () => {
    console.log("[APP] App ready event fired");
    createWindow();
  });

  // Quit when all windows are closed, except on macOS
  app.on("window-all-closed", () => {
    console.log("[APP] All windows closed");
    if (process.platform !== "darwin") {
      console.log("[APP] Quitting application");
      app.quit();
    }
  });

  app.on("activate", () => {
    console.log("[APP] App activated");
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log("[APP] No windows open, creating new window");
      createWindow();
    }
  });

  app.on("will-quit", () => {
    console.log("[APP] App will quit");
  });

  app.on("before-quit", () => {
    console.log("[APP] App before quit");
  });
}
