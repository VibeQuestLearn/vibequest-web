"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle,
  AlertCircle,
  Ship,
  Activity,
  TrendingUp,
  Lock,
  ReceiptText,
  Zap,
} from "lucide-react";

import type { RewardClaimRecord } from "@/lib/legacy-api";
import type { QuestData, VerificationGate } from "@/lib/workbench-types";

interface ShipGateViewProps {
  walletBound: boolean;
  ckbRpcOnline: boolean;
  rewardLedgerOnline: boolean;
  questData: QuestData | null;
  gates: VerificationGate[];
  bossFightSolved: boolean;
  shipped: boolean;
  shipping: boolean;
  shipError: string | null;
  rewardClaim: RewardClaimRecord | null;
  onShip: (fiberInvoice: string) => Promise<void> | void;
}

export default function ShipGateView({
  walletBound,
  ckbRpcOnline,
  rewardLedgerOnline,
  questData,
  gates,
  bossFightSolved,
  shipped,
  shipping,
  shipError,
  rewardClaim,
  onShip,
}: ShipGateViewProps) {
  const [fiberInvoice, setFiberInvoice] = useState("");
  const [invoiceTouched, setInvoiceTouched] = useState(false);
  const isAllGatesPassed = gates.every((gate) => gate.isCompleted);
  const invoiceReady = fiberInvoice.trim().length > 0;
  const canShip = Boolean(walletBound && ckbRpcOnline && rewardLedgerOnline && bossFightSolved && isAllGatesPassed && questData && !shipped && invoiceReady && !shipping);
  const payoutDisabled = rewardClaim?.fiber_payment?.status === "verified-no-payout";
  const claimState = payoutDisabled ? "payout-unavailable" : rewardClaim?.status ?? (shipped ? "verified" : "locked");
  const statusTone = useMemo(() => claimTone(claimState), [claimState]);
  const payoutSummary = payoutDisabled
    ? "Claim verified. Automatic Fiber payout is disabled until a funded node is configured."
    : rewardClaim?.status === "paid"
      ? "Fiber payment completed."
      : rewardClaim?.status === "failed"
        ? "Payout failed. Review the claim error before retrying."
        : rewardClaim
          ? "Claim recorded and awaiting payout processing."
          : "Complete all gates and submit a Fiber invoice to create a claim.";

  const submitClaim = () => {
    setInvoiceTouched(true);
    if (!canShip) {
      return;
    }
    void onShip(fiberInvoice.trim());
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 bg-[#0B0C0E] p-4 font-sans text-on-surface md:p-8">
      <div className="border-b border-glass-border pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
          <Ship className="h-8 w-8 text-electric-blue" />
          Ship Gate
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
          Submit the verified quest envelope and bind the reward to a Fiber invoice. Automatic payout only runs when a funded Fiber node is configured.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatusCard
          icon={<Lock className="h-4 w-4 text-warning-amber" />}
          label="Reward Claim"
          value={claimState.toUpperCase()}
          detail={rewardClaim ? `${rewardClaim.amount_shannons} ${rewardClaim.currency}` : "Awaiting invoice"}
          toneClass={statusTone.text}
        />
        <StatusCard
          icon={<TrendingUp className="h-4 w-4 text-cyber-green" />}
          label="Proof Envelope"
          value={questData ? "READY" : "EMPTY"}
          detail="Generated and checked by vibequest-core"
          toneClass={questData ? "text-cyber-green" : "text-on-surface-variant"}
        />
        <StatusCard
          icon={<Activity className="h-4 w-4 text-electric-blue" />}
          label="Verification"
          value={`${gates.filter((gate) => gate.isCompleted).length}/${gates.length}`}
          detail={bossFightSolved ? "Boss solved" : "Boss pending"}
          toneClass={isAllGatesPassed && bossFightSolved ? "text-cyber-green" : "text-warning-amber"}
        />
        <StatusCard
          icon={<Zap className="h-4 w-4 text-electric-blue" />}
          label="Payout Rail"
          value={payoutDisabled ? "DISABLED" : rewardClaim?.status === "paid" ? "PAID" : "INVOICE"}
          detail={payoutDisabled ? "Funded Fiber node needed" : rewardClaim ? payoutSummary : "Invoice-bound claim"}
          toneClass={payoutDisabled ? "text-warning-amber" : rewardClaim?.status === "paid" ? "text-cyber-green" : "text-electric-blue"}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex flex-col gap-4 rounded-xl border border-glass-border bg-[#16181D] p-6">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-electric-blue" />
              <h2 className="text-lg font-bold tracking-tight text-white">Fiber Reward Invoice</h2>
            </div>
            <textarea
              value={fiberInvoice}
              onChange={(event) => setFiberInvoice(event.target.value)}
              onBlur={() => setInvoiceTouched(true)}
              disabled={shipped || shipping}
              rows={5}
              placeholder="Paste the Fiber invoice generated by your payout wallet or Fiber node."
              className="min-h-32 w-full resize-y rounded-lg border border-glass-border bg-[#0B0C0E] p-4 font-mono text-xs leading-relaxed text-white outline-none transition-colors placeholder:text-on-surface-variant focus:border-electric-blue disabled:cursor-not-allowed disabled:opacity-60"
            />
            {invoiceTouched && !invoiceReady && !shipped ? (
              <p className="text-xs font-medium text-red-300">A Fiber invoice is required before the backend can lock the reward claim.</p>
            ) : null}
            {shipError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {shipError}
              </div>
            ) : null}
            {rewardClaim?.error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {rewardClaim.error}
              </div>
            ) : null}
            {shipped ? (
              <div className={(payoutDisabled ? "border-warning-amber/20 bg-warning-amber/10 text-warning-amber" : "border-cyber-green/20 bg-cyber-green/5 text-cyber-green") + " rounded-lg border p-4 font-mono text-xs font-bold uppercase"}>
                {payoutSummary}
              </div>
            ) : (
              <button
                onClick={submitClaim}
                disabled={!canShip}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyber-green py-4 text-sm font-black uppercase tracking-widest text-[#0B0C0E] shadow-[0_0_20px_rgba(0,255,100,0.15)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:brightness-50"
              >
                <Zap className="h-5 w-5" />
                {shipping ? "Submitting Claim" : "Lock Claim And Request Payout"}
              </button>
            )}
            {!canShip && !shipped ? (
              <span className="block text-center font-mono text-[10px] uppercase leading-tight text-red-400">
                Complete the active quest and paste a Fiber invoice to lock the claim.
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <div className="flex flex-col gap-4 rounded-xl border border-glass-border bg-[#16181D] p-5">
            <h2 className="flex items-center gap-2 border-b border-glass-border pb-3 font-mono text-sm font-bold uppercase tracking-wider text-white">
              <Activity className="h-4 w-4 text-electric-blue" />
              Claim Receipt
            </h2>
            {rewardClaim ? (
              <div className="flex flex-col gap-3 font-mono text-xs">
                <LedgerRow label="Claim ID" value={shortId(rewardClaim.claim_id)} />
                <LedgerRow label="Run ID" value={shortId(rewardClaim.run_id)} />
                <LedgerRow label="Status" value={rewardClaim.status.toUpperCase()} valueClass={statusTone.text} />
                <LedgerRow label="Amount" value={`${rewardClaim.amount_shannons} ${rewardClaim.currency}`} />
                <LedgerRow label="Payment" value={rewardClaim.fiber_payment?.payment_hash ? shortId(rewardClaim.fiber_payment.payment_hash) : rewardClaim.fiber_payment?.status ?? "pending"} valueClass={payoutDisabled ? "text-warning-amber" : "text-white"} />
                <LedgerRow label="Updated" value={new Date(rewardClaim.updated_at).toLocaleString()} />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-glass-border p-5 text-center text-xs text-on-surface-variant">
                No reward claim exists for this run yet.
              </div>
            )}
          </div>

          <div className="relative flex h-72 select-none flex-col items-center justify-center gap-6 overflow-hidden rounded-xl border border-glass-border bg-[#0B0C0E]/80 p-5 text-center">
            <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10">
              <Ship className="h-48 w-48 text-electric-blue" />
            </div>
            <div className={`z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 ${statusTone.border} ${statusTone.bg}`}>
              {shipped || rewardClaim ? <CheckCircle className={`h-8 w-8 ${statusTone.text}`} /> : <AlertCircle className="h-8 w-8 text-warning-amber" />}
            </div>
            <div className="z-10">
              <h3 className="text-base font-bold uppercase text-white">{rewardClaim ? "Claim Recorded" : questData ? "Claim Preloaded" : "No Active Run"}</h3>
              <p className="mt-2 max-w-xs text-xs text-on-surface-variant">
                {rewardClaim
                  ? payoutSummary
                  : questData
                    ? "Finish the proof checks, solve the boss, and submit a Fiber invoice."
                    : "Generate a quest before opening the ship gate."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  detail,
  toneClass,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  toneClass: string;
}) {
  return (
    <div className="flex h-44 flex-col justify-between rounded-xl border border-glass-border bg-[#16181D] p-6">
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] font-bold uppercase text-on-surface-variant">{label}</span>
        {icon}
      </div>
      <div>
        <span className={`font-mono text-2xl font-black md:text-3xl ${toneClass}`}>{value}</span>
        <span className="mt-1 block font-mono text-[10px] uppercase text-on-surface-variant">{detail}</span>
      </div>
    </div>
  );
}

function LedgerRow({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-glass-border/70 bg-[#0B0C0E] p-3">
      <span className="text-[10px] uppercase text-on-surface-variant">{label}</span>
      <span className={`max-w-[220px] truncate text-right text-[11px] font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

function claimTone(status: string) {
  if (status === "paid") {
    return { text: "text-cyber-green", border: "border-cyber-green", bg: "bg-cyber-green/10" };
  }
  if (status === "failed") {
    return { text: "text-red-400", border: "border-red-500", bg: "bg-red-500/10" };
  }
  if (status === "payout-unavailable") {
    return { text: "text-warning-amber", border: "border-warning-amber", bg: "bg-warning-amber/10" };
  }
  if (status === "verified" || status === "paying") {
    return { text: "text-electric-blue", border: "border-electric-blue", bg: "bg-electric-blue/10" };
  }
  return { text: "text-warning-amber", border: "border-warning-amber", bg: "bg-warning-amber/10" };
}

function shortId(value: string) {
  if (value.length <= 18) {
    return value;
  }
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}
