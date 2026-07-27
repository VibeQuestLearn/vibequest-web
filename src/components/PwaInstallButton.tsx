"use client";

import { Download, LoaderCircle, MonitorDown, MoreVertical, Share, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallButtonProps = {
  variant?: "compact" | "full";
  className?: string;
  helperText?: string;
};

type DeviceInstallHint = "ios" | "android" | "desktop" | "generic";

let serviceWorkerRegistrationStarted = false;

export function PwaInstallButton({ variant = "compact", className = "", helperText }: PwaInstallButtonProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [deviceHint, setDeviceHint] = useState<DeviceInstallHint>("generic");

  useEffect(() => {
    registerVibeQuestServiceWorker();
    setInstalled(isStandaloneApp());
    setDeviceHint(detectInstallHint());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setReady(true);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setHelpOpen(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    const fallbackTimer = window.setTimeout(() => setReady(true), 350);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const installGuide = useMemo(() => installStepsForDevice(deviceHint), [deviceHint]);

  async function startInstall() {
    if (installPrompt) {
      setInstalling(true);
      setHelpOpen(false);
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice.catch(() => null);
        if (choice?.outcome === "accepted") {
          setInstalled(true);
        } else {
          setHelpOpen(true);
        }
      } finally {
        setInstallPrompt(null);
        setInstalling(false);
      }
      return;
    }

    setHelpOpen(true);
  }

  if (installed || !ready) return null;

  const full = variant === "full";
  const compactButtonLabel = deviceHint === "ios" ? "Add app" : "Install app";
  const fullButtonLabel = deviceHint === "ios" ? "Add to Home Screen" : "Install VibeQuest";
  const buttonLabel = full ? fullButtonLabel : compactButtonLabel;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={startInstall}
        disabled={installing}
        aria-expanded={helpOpen}
        aria-label={installPrompt ? "Install VibeQuest on this device" : "Show VibeQuest install steps for this device"}
        title={installPrompt ? "Install VibeQuest on this device" : "Show install steps for this device"}
        className={
          full
            ? "inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-electric-blue/55 bg-electric-blue px-5 text-sm font-black text-black shadow-[0_0_30px_rgba(0,240,255,0.22)] transition hover:brightness-110 disabled:opacity-50 sm:w-auto sm:rounded-full sm:bg-electric-blue/12 sm:text-electric-blue sm:hover:border-electric-blue sm:hover:bg-electric-blue/15"
            : "inline-flex min-h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-full border border-electric-blue/35 bg-[#071210] px-3 text-[12px] font-black text-electric-blue shadow-[0_0_16px_rgba(0,240,255,0.08)] transition hover:border-electric-blue/65 hover:bg-electric-blue/10 disabled:opacity-50 sm:min-w-0 sm:gap-2 sm:px-3 sm:text-sm"
        }
      >
        {installing ? (
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : installPrompt ? (
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="whitespace-nowrap">{buttonLabel}</span>
      </button>

      {helperText ? <p className="mt-2 text-center text-[11px] leading-5 text-white/55 sm:text-xs">{helperText}</p> : null}

      {helpOpen ? (
        <InstallHelpSheet
          installPromptAvailable={Boolean(installPrompt)}
          guide={installGuide}
          onClose={() => setHelpOpen(false)}
          onInstall={installPrompt ? startInstall : undefined}
          installing={installing}
        />
      ) : null}
    </div>
  );
}

function InstallHelpSheet({
  installPromptAvailable,
  guide,
  onClose,
  onInstall,
  installing,
}: {
  installPromptAvailable: boolean;
  guide: ReturnType<typeof installStepsForDevice>;
  onClose: () => void;
  onInstall?: () => void;
  installing: boolean;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close install instructions"
        onClick={onClose}
        className="fixed inset-0 z-[110] cursor-default bg-black/45 backdrop-blur-[1px] sm:hidden"
      />
      <div className="fixed inset-x-3 bottom-3 z-[120] rounded-2xl border border-electric-blue/25 bg-[#061410] p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.72)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-black text-white sm:text-sm">Install VibeQuest on this device</p>
            <p className="mt-1 text-xs leading-5 text-white/58">{guide.summary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/55 transition hover:border-electric-blue/35 hover:text-electric-blue"
            aria-label="Close install instructions"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {installPromptAvailable && onInstall ? (
          <button
            type="button"
            onClick={onInstall}
            disabled={installing}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-blue px-4 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {installing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            Install now
          </button>
        ) : null}

        <ol className="mt-4 space-y-3">
          {guide.steps.map((step, index) => (
            <li key={step} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 text-sm leading-5 text-white/72">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-electric-blue/25 bg-electric-blue/10 font-mono text-[11px] font-black text-electric-blue">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-[#020b0a] p-3 text-xs leading-5 text-white/52">
          {guide.icon}
          <span>{guide.note}</span>
        </div>
      </div>
    </>
  );
}

function installStepsForDevice(device: DeviceInstallHint) {
  if (device === "ios") {
    return {
      summary: "iPhone and iPad do not expose a browser install prompt. Use Safari’s Share menu.",
      icon: <Share className="h-4 w-4 shrink-0 text-electric-blue" aria-hidden="true" />,
      steps: [
        "Open VibeQuest in Safari.",
        "Tap the Share button at the bottom of Safari.",
        "Scroll and choose Add to Home Screen.",
        "Tap Add. VibeQuest will appear like a normal app.",
      ],
      note: "If you are inside Chrome on iOS, open the same link in Safari first.",
    };
  }

  if (device === "android") {
    return {
      summary: "Android browsers can install VibeQuest either through the native prompt or the browser menu.",
      icon: <MoreVertical className="h-4 w-4 shrink-0 text-electric-blue" aria-hidden="true" />,
      steps: [
        "Tap Install app above if the native prompt appears.",
        "If it does not, open the browser menu with the three dots.",
        "Choose Install app or Add to Home screen.",
        "Confirm Install. VibeQuest will open in standalone app mode.",
      ],
      note: "Chrome may show the native prompt only after the page finishes loading and the service worker is active.",
    };
  }

  if (device === "desktop") {
    return {
      summary: "Desktop Chrome and Edge usually show install inside the address bar or browser menu.",
      icon: <MonitorDown className="h-4 w-4 shrink-0 text-electric-blue" aria-hidden="true" />,
      steps: [
        "Open VibeQuest in Chrome or Edge.",
        "Click the install icon in the address bar, if shown.",
        "Or open the browser menu and choose Install VibeQuest.",
        "Confirm Install to launch it from your apps.",
      ],
      note: "Firefox desktop has limited PWA install support, so Chrome or Edge is more reliable.",
    };
  }

  return {
    summary: "Use your browser’s app install or home-screen option.",
    icon: <Smartphone className="h-4 w-4 shrink-0 text-electric-blue" aria-hidden="true" />,
    steps: [
      "Open the browser menu.",
      "Look for Install app or Add to Home Screen.",
      "Confirm the install.",
      "Launch VibeQuest from your home screen or app launcher.",
    ],
    note: "Install support depends on the browser and device.",
  };
}

function registerVibeQuestServiceWorker() {
  if (serviceWorkerRegistrationStarted) return;
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isSecureHost =
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (!isSecureHost) return;

  serviceWorkerRegistrationStarted = true;
  const register = () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      serviceWorkerRegistrationStarted = false;
    });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function detectInstallHint(): DeviceInstallHint {
  if (typeof window === "undefined") return "generic";
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIpadOsDesktopMode = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/.test(userAgent) || isIpadOsDesktopMode) return "ios";
  if (/android/.test(userAgent)) return "android";
  if (/windows|macintosh|linux|cros/.test(userAgent)) return "desktop";
  return "generic";
}
