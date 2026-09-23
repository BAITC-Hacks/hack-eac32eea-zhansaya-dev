"use client";

import { useRef, useState } from "react";
import { ProposalMilestones } from "@/components/proposal-milestones";
import type { TeamProposal } from "@/types/team-proposal";
import { decideProposal, proposalFields } from "@/lib/proposals";

export function ProposalReview({ proposal, acceptedId, onDecided }: {
  proposal: TeamProposal; acceptedId?: string; onDecided: (items: TeamProposal[]) => void;
}) {
  const [choice, setChoice] = useState<"accepted" | "rejected" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  async function confirmDecision() {
    if (!choice || inFlight.current) return;
    inFlight.current = true; setSaving(true); setError("");
    try { onDecided(await decideProposal(proposal.id, choice)); setChoice(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save the decision. Check browser storage and retry."); }
    finally { inFlight.current = false; setSaving(false); }
  }
  return <article aria-label={`Proposal from ${proposal.teamName}`} className="rounded-xl border border-ink/15 bg-paper p-5">
    <div className="flex flex-wrap justify-between gap-3"><h3 className="break-words text-xl font-semibold">{proposal.teamName}</h3><span className="rounded-full bg-accent/60 px-3 py-1 text-sm capitalize">{proposal.status}</span></div>
    <p className="mt-2 text-xs text-muted">Submitted <time dateTime={proposal.submittedAt}>{new Date(proposal.submittedAt).toLocaleString()}</time></p>
    <dl className="mt-5 space-y-4">{proposalFields.filter(([field]) => field !== "teamName").map(([field, label]) => <div key={field}><dt className="text-sm font-semibold">{label}</dt><dd className="mt-1 break-words whitespace-pre-wrap text-sm leading-6">{proposal[field]}</dd></div>)}<div><dt className="text-sm font-semibold">Prototype link</dt><dd className="mt-1 break-words text-sm">{proposal.prototypeLink ? <a href={proposal.prototypeLink} target="_blank" rel="noopener noreferrer" className="underline">{proposal.prototypeLink}</a> : "Not provided"}</dd></div></dl>
    {proposal.status !== "pending" ? <p className="mt-5 text-sm font-semibold">Final manual decision: {proposal.status} on {new Date(proposal.businessDecision!.decidedAt).toLocaleString()}. Decisions cannot be changed in this MVP.</p> : <>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={saving || !!acceptedId} onClick={() => { setChoice("accepted"); setError(""); }} className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Accept</button><button type="button" disabled={saving} onClick={() => { setChoice("rejected"); setError(""); }} className="rounded-lg border border-ink/25 px-5 py-3 text-sm font-semibold disabled:opacity-50">Reject</button></div>
      {!!acceptedId && <p className="mt-3 text-sm text-muted">Another team is accepted. This proposal stays pending unless you explicitly reject it.</p>}
      {choice && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4" role="group" aria-label="Confirm business decision"><p className="text-sm">{choice === "accepted" ? "Accept" : "Reject"} {proposal.teamName} for this challenge? This is a final manual decision. Other proposals will not be changed.</p><div className="mt-4 flex flex-wrap gap-4"><button type="button" disabled={saving || (choice === "accepted" && !!acceptedId)} onClick={() => void confirmDecision()} className="font-semibold underline disabled:opacity-50">{saving ? "Saving decision…" : choice === "accepted" ? "Confirm acceptance" : "Confirm rejection"}</button><button type="button" disabled={saving} onClick={() => { setChoice(null); setError(""); }} className="font-semibold underline">Cancel decision</button></div></div>}
    </>}
    <ProposalMilestones proposal={proposal} canConfirm />
    {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
  </article>;
}
