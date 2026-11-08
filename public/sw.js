// Minimal service worker: makes the app installable. Network-only on purpose,
// so auth and sheet data are never served stale.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
