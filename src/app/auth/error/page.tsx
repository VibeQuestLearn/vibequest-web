import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

const messages: Record<string, string> = {
  AccessDenied: "This Google account could not be used.",
  Configuration: "Google authentication is not configured.",
  OAuthCallback: "Google could not complete the callback.",
  OAuthSignin: "Google sign-in could not start.",
  Verification: "The sign-in response could not be verified.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const code = Array.isArray(params.error) ? params.error[0] : params.error;
  const message =
    (code ? messages[code] : null) ?? "Authentication could not complete.";

  return (
    <main className="min-h-screen bg-white px-5 py-16 text-[#17191d]">
      <div className="mx-auto max-w-2xl border-t-4 border-[#c64b3c] pt-8">
        <AlertTriangle className="h-8 w-8 text-[#c64b3c]" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-black">Sign-in failed</h1>
        <p className="mt-3 text-sm leading-6 text-black/60">{message}</p>
        <Link
          href="/"
          className="mt-8 inline-flex h-10 items-center gap-2 bg-black px-4 text-sm font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Return to track
        </Link>
      </div>
    </main>
  );
}
