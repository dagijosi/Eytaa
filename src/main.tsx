import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import "./index.css";

// Reveal the window immediately after the splash has painted, so the user sees
// instant feedback instead of a blank/hidden window during startup.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    getCurrentWindow()
      .show()
      .catch(() => {});
  });
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
