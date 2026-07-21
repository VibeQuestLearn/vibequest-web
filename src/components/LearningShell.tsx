import {
  BookOpenCheck,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  Database,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  AccountControl,
  type AccountSummary,
} from "@/components/AccountControl";
import {
  SHIELDED_PAYMENTS_TRACK_ID,
  ZCASH_ECOSYSTEM_ID,
  type CatalogResponse,
} from "@/lib/platform";

type LearningShellProps = {
  catalog: CatalogResponse | null;
  error: string | null;
  account: AccountSummary | null;
  authConfigured: boolean;
};

const lessonSequence = [
  "Unified addresses",
  "ZIP-321 requests",
  "View-only boundaries",
  "Payment lifecycle",
  "Privacy review",
];

export function LearningShell({
  catalog,
  error,
  account,
  authConfigured,
}: LearningShellProps) {
  const ecosystem = catalog?.ecosystems.find(
    (entry) => entry.ecosystem_id === ZCASH_ECOSYSTEM_ID,
  );
  const track = ecosystem?.tracks.find(
    (entry) => entry.track_id === SHIELDED_PAYMENTS_TRACK_ID,
  );
  const zcash = ecosystem?.configuration.configuration;

  return (
    <div className="min-h-screen bg-[#f5f6f7] text-[#17191d]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#f4b728] text-black">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">VibeQuestLearn</p>
              <p className="truncate text-xs text-black/50">
                Catalog v{catalog?.schema_version ?? 3}
              </p>
            </div>
          </div>

          <AccountControl account={account} authConfigured={authConfigured} />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-b border-black/10 bg-[#eef0f2] px-4 py-5 lg:border-b-0 lg:border-r lg:px-5">
          <p className="text-xs font-bold uppercase text-black/45">Ecosystems</p>
          <div className="mt-3 flex items-center gap-3 border-l-2 border-[#f4b728] bg-white px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-black text-sm font-black text-white">
              Z
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{ecosystem?.name ?? "Zcash"}</p>
              <p className="truncate text-xs text-black/45">
                {ecosystem?.enabled ? "Active catalog" : "Catalog unavailable"}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-bold uppercase text-black/45">Workspace</p>
            <nav className="mt-2 space-y-1" aria-label="Workspace">
              <ShellNavItem icon={<BookOpenCheck className="h-4 w-4" />} label="Track" active />
              <ShellNavItem icon={<Code2 className="h-4 w-4" />} label="Submissions" />
              <ShellNavItem icon={<Database className="h-4 w-4" />} label="Evidence" />
            </nav>
          </div>
        </aside>

        <main className="min-w-0 bg-white">
          <div className="border-b border-black/10 px-4 py-6 sm:px-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-black/45">
              <span>Zcash</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Developer track</span>
            </div>
            <div className="mt-4 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-[#fff4cf] px-2 py-1 text-xs font-bold text-[#6d4d00]">
                    <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                    {track?.status ?? "building"}
                  </span>
                  <span className="text-xs text-black/45">
                    Track {track?.track_version ?? "0.1.0"}
                  </span>
                </div>
                <h1 className="mt-3 max-w-4xl text-2xl font-black sm:text-3xl">
                  {track?.title ?? "Shielded Payments: Accept, Detect, and Defend"}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-black/58">
                  {track?.summary ??
                    "The catalog could not load the current track definition."}
                </p>
              </div>

              <button
                type="button"
                disabled
                title="This track is disabled until its verifier and scenarios are ready."
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-black px-4 text-sm font-bold text-white opacity-45"
              >
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                Track unavailable
              </button>
            </div>
          </div>

          {error ? (
            <div className="border-b border-[#c64b3c]/25 bg-[#fff1ee] px-4 py-3 text-sm text-[#8d2d22] sm:px-8">
              {error}
            </div>
          ) : null}

          <section className="grid border-b border-black/10 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Lessons" value={String(track?.lesson_count ?? 5)} />
            <Metric label="Network" value={zcash?.network ?? "testnet"} />
            <Metric label="Address standard" value={zcash?.address_standard ?? "ZIP-316"} />
            <Metric
              label="Payment requests"
              value={zcash?.payment_request_standard ?? "ZIP-321"}
            />
          </section>

          <section className="px-4 py-7 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black">Track sequence</h2>
                <p className="mt-1 text-sm text-black/50">
                  Content version {track?.content_version ?? "2026-07-21"}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-black/45">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                Not started
              </div>
            </div>

            <div className="mt-5 border-t border-black/10">
              {lessonSequence.map((lesson, index) => (
                <div
                  key={lesson}
                  className="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-black/10"
                >
                  <span className="text-sm font-black text-black/35">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 text-sm font-semibold">{lesson}</span>
                  <LockKeyhole className="h-4 w-4 text-black/25" aria-label="Locked" />
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ShellNavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={
        active
          ? "flex h-10 items-center gap-3 bg-white px-3 text-sm font-bold"
          : "flex h-10 items-center gap-3 px-3 text-sm font-semibold text-black/45"
      }
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-black/10 px-4 py-5 last:border-b-0 sm:border-r sm:px-8 xl:border-b-0">
      <p className="text-xs font-bold uppercase text-black/40">{label}</p>
      <p className="mt-2 truncate text-sm font-black">{value}</p>
    </div>
  );
}
