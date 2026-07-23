"use client";

import { LoaderCircle, UserRound } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";

export type AccountSummary = {
  id: string;
  name: string | null;
  email: string | null;
};

export function AccountControl({
  account,
  authConfigured,
  showIdentity = false,
}: {
  account: AccountSummary | null;
  authConfigured: boolean;
  showIdentity?: boolean;
}) {
  const [pending, setPending] = useState<"sign-in" | "sign-out" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startSignIn() {
    setPending("sign-in");
    setError(null);

    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setPending(null);
      setError("Google sign-in could not start.");
    }
  }

  async function startSignOut() {
    setPending("sign-out");
    setError(null);

    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      setPending(null);
      setError("Sign-out could not complete.");
    }
  }

  if (account) {
    return (
      <div className="relative flex min-w-0 items-center gap-3">
        {showIdentity ? (
          <div className="hidden min-w-0 text-right sm:block">
            <p className="max-w-56 truncate text-sm font-black leading-5 text-white">
              {account.name || "Google account"}
            </p>
            <p className="max-w-56 truncate text-sm leading-5 text-white/55">
              {account.email || account.id}
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={startSignOut}
          disabled={pending !== null}
          title={`Signed in${account.email ? ` as ${account.email}` : ""}. Click to sign out.`}
          aria-label="Account menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#071210] text-white/58 transition hover:border-electric-blue/35 hover:text-electric-blue disabled:opacity-40"
        >
          {pending === "sign-out" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserRound className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        {error ? <p className="absolute right-0 top-full mt-2 w-56 rounded-md border border-red-500/25 bg-[#071210] p-2 text-right text-xs text-red-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={startSignIn}
        disabled={!authConfigured || pending !== null}
        title={
          authConfigured
            ? "Sign in with Google"
            : "Google authentication is not configured."
        }
        aria-label="Sign in with Google"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#071210] text-white/58 transition hover:border-electric-blue/35 hover:text-electric-blue disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending === "sign-in" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserRound className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      {error ? <p className="absolute right-0 top-full mt-2 w-56 rounded-md border border-red-500/25 bg-[#071210] p-2 text-right text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
