import { getServerSession } from "next-auth";

import { authOptions, googleAuthConfigured } from "@/auth";
import { LearningShell } from "@/components/LearningShell";
import { loadCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [result, session] = await Promise.all([
    loadCatalog(),
    getServerSession(authOptions),
  ]);
  const account = session?.user?.id
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
      }
    : null;

  return (
    <LearningShell
      catalog={result.catalog}
      error={result.error}
      account={account}
      authConfigured={googleAuthConfigured}
    />
  );
}
