import "server-only";

import { createHmac } from "node:crypto";

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";


const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const identitySecret = process.env.IDENTITY_DERIVATION_SECRET;

export const googleAuthConfigured = Boolean(
  googleClientId &&
    googleClientSecret &&
    validSessionSecret(authSecret) &&
    validIdentitySecret(identitySecret),
);

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      checks: ["pkce", "state", "nonce"],
      authorization: {
        params: {
          access_type: "online",
          prompt: "select_account",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],
  pages: {
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!googleAuthConfigured || account?.provider !== "google") {
        return false;
      }
      const googleProfile = profile as
        | { sub?: unknown; email_verified?: unknown }
        | undefined;

      return (
        typeof googleProfile?.sub === "string" &&
        googleProfile.sub.length > 0 &&
        googleProfile.email_verified === true
      );
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "google") {
        const googleProfile = profile as { sub?: unknown } | undefined;
        const providerSubject =
          typeof googleProfile?.sub === "string"
            ? googleProfile.sub
            : account.providerAccountId;

        if (!identitySecret || !providerSubject) {
          throw new Error("Google identity configuration is incomplete.");
        }

        token.provider = "google";
        token.providerSubject = providerSubject;
        token.userId = deriveOpaqueUserId(providerSubject, identitySecret);
      }

      return token;
    },
    async session({ session, token }) {
      if (
        session.user &&
        typeof token.userId === "string" &&
        token.provider === "google"
      ) {
        session.user.id = token.userId;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return new URL(url, baseUrl).toString();
      }

      try {
        const target = new URL(url);
        if (target.origin === new URL(baseUrl).origin) {
          return target.toString();
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    },
  },
};

function deriveOpaqueUserId(providerSubject: string, secret: string): string {
  const digest = createHmac("sha256", Buffer.from(secret, "base64url"))
    .update(`google:${providerSubject}`)
    .digest("base64url");

  return `usr_${digest.slice(0, 32)}`;
}

function validSessionSecret(secret: string | undefined): secret is string {
  return typeof secret === "string" && Buffer.byteLength(secret, "utf8") >= 32;
}

function validIdentitySecret(secret: string | undefined): secret is string {
  if (!secret) {
    return false;
  }

  if (!/^[A-Za-z0-9_-]+$/.test(secret)) {
    return false;
  }

  try {
    return Buffer.from(secret, "base64url").byteLength >= 32;
  } catch {
    return false;
  }
}
