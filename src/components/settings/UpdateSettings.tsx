import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { updaterService, UpdateStatus, isNewerVersion } from "../../services/updater/updaterService";
import { usePlayerStore } from "../../stores/playerStore";
import { EytaaLogo } from "../EytaaLogo";

interface UpdateSettingsProps {
  accentColor: string;
  accentGlow: string;
  accentText: string;
  appVersion: string;
  autoCheckUpdates: boolean;
  toggleAutoCheckUpdates: (enabled?: boolean) => Promise<void>;
}

export function UpdateSettings({
  accentColor,
  accentGlow,
  accentText,
  appVersion,
  autoCheckUpdates,
  toggleAutoCheckUpdates,
}: UpdateSettingsProps) {
  const availableUpdate = usePlayerStore((s) => s.availableUpdate);

  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(() => {
    const last = updaterService.getLastStatus();
    if (
      last &&
      last.state === "available" &&
      last.latestVersion &&
      isNewerVersion(last.latestVersion, appVersion)
    ) {
      return last;
    }
    if (last && last.state === "up-to-date") {
      return last;
    }
    const storeAvail = usePlayerStore.getState().availableUpdate;
    if (storeAvail?.version && isNewerVersion(storeAvail.version, appVersion)) {
      return {
        state: "available",
        currentVersion: appVersion,
        latestVersion: storeAvail.version,
        releaseNotes: storeAvail.releaseNotes,
      };
    }
    return {
      state: "idle",
      currentVersion: appVersion,
    };
  });

  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [installProgress, setInstallProgress] = useState<{ downloaded: number; total: number | null }>({
    downloaded: 0,
    total: null,
  });

  const handleCheckUpdate = async () => {
    await updaterService.checkForUpdates((status) => {
      setUpdateStatus(status);
      if (status.state === "available" && status.latestVersion) {
        usePlayerStore.setState({
          availableUpdate: {
            version: status.latestVersion,
            releaseNotes: status.releaseNotes,
          },
        });
      } else if (status.state === "up-to-date") {
        usePlayerStore.setState({ availableUpdate: null, showUpdateToast: false });
      }
    });
  };

  const handleInstallUpdate = async () => {
    setIsInstallingUpdate(true);
    try {
      await updaterService.installUpdate((downloaded, total) => {
        setInstallProgress({ downloaded, total });
      });
    } catch (err: any) {
      setIsInstallingUpdate(false);
      setUpdateStatus((prev) => ({
        ...prev,
        state: "error",
        errorMessage: err?.message || String(err),
      }));
    }
  };

  // Synchronize with updaterService cached status or store's availableUpdate on mount/change
  useEffect(() => {
    const last = updaterService.getLastStatus();
    if (
      last &&
      last.state === "available" &&
      last.latestVersion &&
      isNewerVersion(last.latestVersion, appVersion)
    ) {
      setUpdateStatus(last);
    } else if (last && last.state === "up-to-date") {
      setUpdateStatus(last);
    } else if (availableUpdate?.version && isNewerVersion(availableUpdate.version, appVersion)) {
      setUpdateStatus({
        state: "available",
        currentVersion: appVersion,
        latestVersion: availableUpdate.version,
        releaseNotes: availableUpdate.releaseNotes,
      });
    } else if (appVersion && availableUpdate?.version && !isNewerVersion(availableUpdate.version, appVersion)) {
      setUpdateStatus({
        state: "up-to-date",
        currentVersion: appVersion,
      });
      usePlayerStore.setState({ availableUpdate: null, showUpdateToast: false });
    } else if (!appVersion) {
      updaterService.getAppVersion().then((v) => {
        setUpdateStatus((prev) => ({ ...prev, currentVersion: v }));
      });
    }
  }, [availableUpdate, appVersion]);

  return (
    <div className="space-y-5">
      {/* Brand & Version Card */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <EytaaLogo className="w-full h-full" variant="color" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider text-white uppercase font-sans">
                EYTAA
              </span>
              <span
                style={{
                  backgroundColor: `${accentGlow}`,
                  color: accentColor,
                  borderColor: `${accentColor}40`,
                }}
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
              >
                v{appVersion}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Every story, in view • Powered by Tauri 2 and libmpv
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              await openUrl("https://github.com/dagijosi/Eytaa");
            } catch {
              window.open("https://github.com/dagijosi/Eytaa", "_blank");
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>GitHub Repository</span>
        </button>
      </div>

      {/* Updater Status Card */}
      <div
        style={{
          borderColor:
            updateStatus.state === "available"
              ? `${accentColor}70`
              : "rgba(255, 255, 255, 0.08)",
          background:
            updateStatus.state === "available"
              ? `linear-gradient(to right, ${accentGlow}, transparent)`
              : "rgba(255, 255, 255, 0.03)",
        }}
        className="p-5 rounded-2xl border space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Software Updates
              </span>
              <span className="text-[10px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                Current: <strong className="text-neutral-200">v{appVersion}</strong>
              </span>
            </div>

            <div className="text-sm font-bold text-white mt-1.5 flex items-center gap-2">
              {updateStatus.state === "checking" && "Checking GitHub Releases..."}
              {updateStatus.state === "up-to-date" && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>You're all up to date</span>
                </>
              )}
              {updateStatus.state === "available" && (
                <>
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Update Available: v{updateStatus.latestVersion}</span>
                </>
              )}
              {updateStatus.state === "error" && (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Unable to check for updates</span>
                </>
              )}
              {updateStatus.state === "idle" && "Check for the latest version"}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {updateStatus.state === "up-to-date" &&
                `EYTAA v${updateStatus.currentVersion || appVersion} is currently the latest version released on GitHub.`}
              {updateStatus.state === "available" &&
                `A newer version (v${updateStatus.latestVersion}) of EYTAA is available on GitHub Releases.`}
              {updateStatus.state === "error" &&
                (updateStatus.errorMessage ||
                  "Could not reach GitHub Releases. Ensure your network is connected or check the repository.")}
              {updateStatus.state === "idle" &&
                "Connects directly to github.com/dagijosi/Eytaa to verify signed release builds."}
            </p>
          </div>

          <div className="shrink-0">
            {updateStatus.state === "available" ? (
              <button
                onClick={handleInstallUpdate}
                disabled={isInstallingUpdate}
                style={{
                  backgroundColor: accentColor,
                  color: accentText,
                  boxShadow: `0 4px 16px ${accentGlow}`,
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isInstallingUpdate ? "Installing..." : "Install & Relaunch"}</span>
              </button>
            ) : (
              <button
                onClick={handleCheckUpdate}
                disabled={updateStatus.state === "checking"}
                style={{
                  backgroundColor: `${accentGlow}`,
                  color: accentColor,
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    updateStatus.state === "checking" ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {updateStatus.state === "checking"
                    ? "Checking..."
                    : "Check for Updates"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Live Download Progress bar if installing */}
        {isInstallingUpdate && (
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <div className="flex justify-between text-xs font-mono text-neutral-400">
              <span>Downloading update package...</span>
              <span>
                {installProgress.total
                  ? `${Math.round(
                      (installProgress.downloaded / installProgress.total) * 100
                    )}%`
                  : "Preparing..."}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                style={{
                  width: installProgress.total
                    ? `${(installProgress.downloaded / installProgress.total) * 100}%`
                    : "50%",
                  backgroundColor: accentColor,
                }}
                className="h-full rounded-full transition-all duration-150"
              />
            </div>
          </div>
        )}

        {/* Release Notes if update available */}
        {updateStatus.state === "available" && updateStatus.releaseNotes && (
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-xs text-neutral-300">
            <div className="font-bold text-white text-[11px] uppercase tracking-wider">
              Release Notes (v{updateStatus.latestVersion})
            </div>
            <div className="font-mono text-[11px] whitespace-pre-wrap text-neutral-400 max-h-36 overflow-y-auto">
              {updateStatus.releaseNotes}
            </div>
          </div>
        )}
      </div>

      {/* Automatic Update Background Preference */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
        <div>
          <div className="font-medium text-neutral-200 text-xs">
            Automatic Update Checks
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Check quietly once every 24 hours. If an update is detected, displays a subtle, auto-dismissing toast that never interrupts active playback.
          </p>
        </div>
        <input
          type="checkbox"
          checked={autoCheckUpdates}
          onChange={(e) => toggleAutoCheckUpdates(e.target.checked)}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer ml-4"
        />
      </div>

      {/* GitHub Releases Info & Instructions */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">
          Automated GitHub Releases Workflow
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          EYTAA uses GitHub Actions to automatically compile Windows installers and publish releases.
          When you push a git tag like <code className="text-amber-400 px-1 py-0.5 rounded bg-black/40 font-mono">v{appVersion}</code> to <span className="text-white font-medium">dagijosi/Eytaa</span>, the CI pipeline builds the signed executable and <code className="text-neutral-300 font-mono">latest.json</code> manifest so all running apps can update in place with one click.
        </p>
        <div className="pt-2 flex items-center gap-3 text-xs">
          <button
            onClick={async () => {
              try {
                await openUrl("https://github.com/dagijosi/Eytaa/releases");
              } catch {
                window.open("https://github.com/dagijosi/Eytaa/releases", "_blank");
              }
            }}
            style={{ color: accentColor }}
            className="flex items-center gap-1 hover:brightness-110 transition font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>View Releases on GitHub</span>
          </button>
          <span className="text-neutral-600">•</span>
          <button
            onClick={async () => {
              try {
                await openUrl("https://github.com/dagijosi/Eytaa/actions");
              } catch {
                window.open("https://github.com/dagijosi/Eytaa/actions", "_blank");
              }
            }}
            className="flex items-center gap-1 text-neutral-400 hover:text-white transition"
          >
            <span>View GitHub Actions Workflows</span>
          </button>
        </div>
      </div>
    </div>
  );
}
