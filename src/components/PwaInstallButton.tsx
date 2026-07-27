"use client";

import { Download, LoaderCircle, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallButtonProps = {
  variant?: "compact" | "full";
  className?: string;
};

let serviceWorkerRegistrationStarted = false;

export function PwaInstallButton({ variant = "compact", className = "" }: PwaInstallButtonProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    registerVibeQuestServiceWorker();
    setInstalled(isStandaloneApp());

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
    const fallbackTimer = window.setTimeout(() => setReady(true), 900);

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

    setHelpOpen((open) => !open);
  }

  if (installed || !ready) return null;

  const full = variant === "full";

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={startInstall}
        disabled={installing}
        aria-expanded={helpOpen}
        title={installPrompt ? "Install VibeQuest on this device" : "How to install VibeQuest on this device"}
        className={
          full
            ? "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-electric-blue/35 bg-electric-blue/10 px-4 text-sm font-black text-electric-blue shadow-[0_0_20px_rgba(0,240,255,0.12)] transition hover:border-electric-blue hover:bg-electric-blue/15 disabled:opacity-50"
            : "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#071210] px-3 text-sm font-black text-white/68 transition hover:border-electric-blue/35 hover:text-electric-blue disabled:opacity-50"
        }
      >
        {installing ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : installPrompt ? (
          <Download className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Smartphone className="h-4 w-4" aria-hidden="true" />
        )}
        <span className={full ? "" : "hidden sm:inline"}>{installPrompt ? "Install app" : "Install"}</span>
      </button>

      {helpOpen ? (
        <div className="absolute right-0 top-full z-[95] mt-3 w-72 rounded-xl border border-white/10 bg-[#061410] p-4 text-left shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
          <p className="text-sm font-black text-white">Install VibeQuest</p>
          <p className="mt-2 text-xs leading-5 text-white/62">
            If your browser does not show the native install prompt, use the browser menu and choose <span className="font-bold text-white">Install app</span> or <span className="font-bold text-white">Add to Home Screen</span>.
          </p>
          <p className="mt-2 text-xs leading-5 text-white/45">
            On iPhone/iPad: tap Share, then Add to Home Screen.
          </p>
        </div>
      ) : null}
    </div>
  );
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
