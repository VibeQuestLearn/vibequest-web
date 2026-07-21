import { getServerSession } from "next-auth";

import { authOptions, googleAuthConfigured } from "@/auth";
import { LearningShell } from "@/components/LearningShell";
import { loadCatalog, loadCurriculum } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [catalogResult, curriculumResult, session] = await Promise.all([
    loadCatalog(),
    loadCurriculum(),
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
      catalog={catalogResult.catalog}
      curriculum={curriculumResult.curriculum}
      error={catalogResult.error ?? curriculumResult.error}
      account={account}
      authConfigured={googleAuthConfigured}
    />
  );
}
