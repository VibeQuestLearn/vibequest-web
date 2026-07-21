import { LearningShell } from "@/components/LearningShell";
import { loadCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const result = await loadCatalog();

  return <LearningShell catalog={result.catalog} error={result.error} />;
}
