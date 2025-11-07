import React from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline } from "@mui/material";
import App from "./App";

console.log("[RENDERER] Renderer script starting...");
console.log(
  "[RENDERER] window.electronAPI available:",
  typeof window.electronAPI !== "undefined"
);

const container = document.getElementById("root");
if (!container) {
  console.error("[RENDERER] Root element not found!");
  throw new Error("Root element not found");
}

console.log("[RENDERER] Root element found, creating React root...");
const root = createRoot(container);
console.log("[RENDERER] Rendering App component...");
root.render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);
console.log("[RENDERER] App component rendered");
