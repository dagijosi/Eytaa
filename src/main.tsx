import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { restoreWindowGeometry, startWindowGeometryTracking } from "./services/window/windowGeometry";
import "./index.css";

// Restore the user's last window position/size (or center on first run) before
// revealing the window, so it never flashes at the OS-default cascaded spot.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const reveal = () =>
      getCurrentWindow()
        .show()
        .catch(() => {});

    // Wait for geometry restoration before revealing and before tracking so
    // cold-boot IPC latency never overwrites saved geometry with the default size.
    Promise.race([
      restoreWindowGeometry(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]).finally(() => {
      reveal();
      window.setTimeout(() => startWindowGeometryTracking(), 250);
    });
  });
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
