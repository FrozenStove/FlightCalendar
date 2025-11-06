import * as path from "path";

// These constants are defined here instead of being injected
// The Electron Forge Vite plugin should inject these, but we provide defaults
// that work in both development and production

// Window name
export const MAIN_WINDOW_VITE_NAME = "main_window";

// Dev server URL - in development, Electron Forge Vite plugin runs on port 5173
// Check if we're in development mode (not packaged)
export const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | null =
  process.env.ELECTRON_VITE_DEV_SERVER_URL ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:5173/" : null);

// Preload path - construct based on environment
// In production: relative to built main.js (which is in .vite/build/)
// In development: will be provided by the plugin or use default
export const MAIN_WINDOW_VITE_PRELOAD: string =
  process.env.ELECTRON_VITE_PRELOAD || path.join(__dirname, "preload.js");
