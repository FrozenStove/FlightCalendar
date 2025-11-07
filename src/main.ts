import { app } from "electron";
import { setupAppLifecycle } from "./main/window";
import { setupGetApiKeyHandler, setupSetApiKeyHandler } from "./main/apiKey";
import { setupFetchFlightsHandler } from "./main/flightApi";
import { setupGenerateCalendarHandler } from "./main/calendar";

console.log("[MAIN] Starting main process...");

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  console.log("[MAIN] electron-squirrel-startup detected, quitting...");
  app.quit();
}

// Setup application lifecycle handlers
setupAppLifecycle();

// Setup IPC handlers
setupGetApiKeyHandler();
setupSetApiKeyHandler();
setupFetchFlightsHandler();
setupGenerateCalendarHandler();

console.log("[MAIN] All handlers registered");
