"use client";

import { Download, LoaderCircle, MonitorDown, MoreVertical, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

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
          deviceHint={deviceHint}
          installPromptAvailable={Boolean(installPrompt)}
          onClose={() => setHelpOpen(false)}
          onInstall={installPrompt ? startInstall : undefined}
          installing={installing}
        />
      ) : null}
    </div>
  );
}

function InstallHelpSheet({
  deviceHint,
  installPromptAvailable,
  onClose,
  onInstall,
  installing,
}: {
  deviceHint: DeviceInstallHint;
  installPromptAvailable: boolean;
  onClose: () => void;
  onInstall?: () => void;
  installing: boolean;
}) {
  const hasNativePrompt = installPromptAvailable && onInstall;
  const action = installActionForDevice(deviceHint, Boolean(hasNativePrompt));

  return (
    <>
      <button
        type="button"
        aria-label="Close install instructions"
        onClick={onClose}
        className="fixed inset-0 z-[110] cursor-default bg-black/55 backdrop-blur-[2px] sm:hidden"
      />
      <div className="fixed inset-x-4 bottom-4 z-[120] rounded-[22px] border border-electric-blue/25 bg-[#061410] p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,0.72)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xl font-black leading-tight text-white sm:text-base">Install VibeQuest</p>
            <p className="mt-1 text-sm leading-6 text-white/62 sm:text-xs sm:leading-5">{action.summary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/55 transition hover:border-electric-blue/35 hover:text-electric-blue"
            aria-label="Close install instructions"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {hasNativePrompt ? (
          <button
            type="button"
            onClick={onInstall}
            disabled={installing}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-electric-blue px-4 text-base font-black text-black transition hover:brightness-110 disabled:opacity-50 sm:text-sm"
          >
            {installing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            Install now
          </button>
        ) : deviceHint === "android" ? (
          <button
            type="button"
            onClick={openInChrome}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-electric-blue px-4 text-base font-black text-black transition hover:brightness-110 sm:text-sm"
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Open in Chrome
          </button>
        ) : null}

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#020b0a] p-4 text-sm leading-6 text-white/76 sm:p-3 sm:text-xs sm:leading-5">
          {action.icon}
          <span>{action.nextStep}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/10 px-4 text-sm font-bold text-white/70 transition hover:border-electric-blue/35 hover:text-electric-blue"
        >
          Done
        </button>
      </div>
    </>
  );
}

function installActionForDevice(device: DeviceInstallHint, hasNativePrompt: boolean) {
  if (hasNativePrompt) {
    return {
      summary: "Your browser is ready to install the app.",
      icon: <Download className="h-5 w-5 shrink-0 text-electric-blue" aria-hidden="true" />,
      nextStep: "Tap Install now. If the browser blocks it, use the browser menu and choose Install app.",
    };
  }

  if (device === "android") {
    return {
      summary: "This browser did not expose the install popup. Open the same page in Chrome first.",
      icon: <MoreVertical className="h-5 w-5 shrink-0 text-electric-blue" aria-hidden="true" />,
      nextStep: "In Chrome, tap the ⋮ menu and choose Install app or Add to Home screen.",
    };
  }

  if (device === "ios") {
    return {
      summary: "iPhone and iPad install through Safari’s Share menu.",
      icon: <Share className="h-5 w-5 shrink-0 text-electric-blue" aria-hidden="true" />,
      nextStep: "Open in Safari, tap Share, then choose Add to Home Screen.",
    };
  }

  if (device === "desktop") {
    return {
      summary: "Use Chrome or Edge to install VibeQuest from the browser UI.",
      icon: <MonitorDown className="h-5 w-5 shrink-0 text-electric-blue" aria-hidden="true" />,
      nextStep: "Click the install icon in the address bar, or open the browser menu and choose Install VibeQuest.",
    };
  }

  return {
    summary: "Install support depends on the browser and device.",
    icon: <Smartphone className="h-5 w-5 shrink-0 text-electric-blue" aria-hidden="true" />,
    nextStep: "Open the browser menu and choose Install app or Add to Home Screen.",
  };
}

function openInChrome() {
  if (typeof window === "undefined") return;
  const current = new URL(window.location.href);
  const target = `${current.host}${current.pathname}${current.search}`;
  const fallbackUrl = `${current.origin}${current.pathname}${current.search}${current.hash}`;
  window.location.assign(`intent://${target}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`);
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
