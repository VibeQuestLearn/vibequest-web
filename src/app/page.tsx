import { getServerSession } from "next-auth";

import { authOptions, googleAuthConfigured } from "@/auth";
import { VibeQuestApp } from "@/components/VibeQuestApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const account = session?.user?.id
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
      }
    : null;

  return <VibeQuestApp account={account} authConfigured={googleAuthConfigured} />;
}
