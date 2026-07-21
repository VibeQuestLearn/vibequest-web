"use client";

import { LoaderCircle, LogIn, LogOut, UserRound } from "lucide-react";
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
}: {
  account: AccountSummary | null;
  authConfigured: boolean;
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
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#e8ecef]">
          <UserRound className="h-4 w-4 text-black/55" aria-hidden="true" />
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-48 truncate text-xs font-semibold">
            {account.name || "Google account"}
          </p>
          <p className="max-w-48 truncate text-xs text-black/45">
            {account.email || account.id}
          </p>
          {error ? <p className="text-xs text-[#a12f24]">{error}</p> : null}
        </div>
        <button
          type="button"
          onClick={startSignOut}
          disabled={pending !== null}
          title="Sign out"
          aria-label="Sign out"
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-black/10 bg-white text-black/60 disabled:opacity-40"
        >
          {pending === "sign-out" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={startSignIn}
        disabled={!authConfigured || pending !== null}
        title={
          authConfigured
            ? "Sign in with Google"
            : "Google authentication is not configured."
        }
        className="inline-flex h-9 items-center justify-center gap-2 bg-black px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending === "sign-in" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden="true" />
        )}
        Sign in with Google
      </button>
      {error ? <p className="mt-1 text-xs text-[#a12f24]">{error}</p> : null}
    </div>
  );
}
