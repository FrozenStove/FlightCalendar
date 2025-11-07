import Store from "electron-store";

// Initialize electron-store
console.log("[STORE] Initializing electron-store...");
const store = new Store();
console.log("[STORE] electron-store initialized");

export default store;
