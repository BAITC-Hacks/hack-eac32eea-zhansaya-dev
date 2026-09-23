"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCatalog } from "../challenges/use-catalog";
import { readProposals } from "@/lib/proposals";
import type { TeamProposal } from "@/types/team-proposal";
import { ProposalReview } from "./proposal-review";

export default function BusinessPage() {
  const catalog = useCatalog();
  const [proposals, setProposals] = useState<TeamProposal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    function load() {
      if (!active) return;
      try { setProposals(readProposals()); setError(""); }
      catch { setError("Could not read saved proposals. Data may be unavailable, invalid, or contain conflicting decisions. No data was changed. Check browser storage and refresh; decisions are disabled until it can be read."); }
      setLoaded(true);
    }
    Promise.resolve().then(load);
    window.addEventListener("storage", load); window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("storage", load); window.removeEventListener("focus", load); };
  }, []);
  const orphaned = proposals.filter((proposal) => !catalog.items.some((item) => item.id === proposal.challengeId && item.publishedAt === proposal.challengePublishedAt));
  return <section className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
    <p className="text-xs font-bold uppercase tracking-widest text-muted">For Business</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">Review your team proposals</h1>
    <p className="mt-5 text-sm leading-6 text-muted">You make every decision. Proposals are shown by submission date, oldest first; AI does not recommend or rank teams. Accepting or rejecting requires your confirmation and is final in this MVP.</p>
    <p className="mt-3 text-sm leading-6 text-muted">Only one proposal can be accepted per challenge. Other proposals stay pending until you explicitly reject them. This page shows all local challenges: there are no accounts, and different browsers or devices cannot share submissions or decisions.</p>
    <Link href="/challenges/new" className="mt-5 inline-block font-semibold underline">Create or edit a challenge →</Link>
    <p role="status" className="mt-5 text-sm text-[#466334]">{notice}</p>
    {!catalog.loaded || !loaded ? <p role="status" className="mt-8">Loading published challenges and proposals…</p> : catalog.error ? <p role="alert" className="mt-8 text-red-800">{catalog.error}</p> : <>
      {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {!error && orphaned.length > 0 && <p role="alert" className="mt-6 text-sm text-amber-900">{orphaned.length} saved proposal(s) reference a missing published version. They remain stored and visible on For Students, but cannot receive decisions here.</p>}
      {!catalog.items.length ? <div className="mt-8 rounded-xl border border-ink/15 bg-white p-6"><h2 className="text-xl font-semibold">No published challenges yet</h2><p className="mt-3 text-muted">Confirm and publish a task card to start receiving proposals in this browser.</p></div> : <div className="mt-8 space-y-8">{catalog.items.map((challenge) => {
        const received = proposals.filter((proposal) => proposal.challengeId === challenge.id && proposal.challengePublishedAt === challenge.publishedAt).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id));
        const acceptedId = received.find((proposal) => proposal.status === "accepted")?.id;
        return <section key={challenge.id} className="rounded-2xl border border-ink/15 bg-white p-6"><h2 className="break-words text-2xl font-semibold"><Link href={`/challenges/${encodeURIComponent(challenge.id)}`} className="underline-offset-4 hover:underline">{challenge.taskCard.title?.trim() || "Title not provided"}</Link></h2><p className="mt-2 text-xs text-muted">Published {new Date(challenge.publishedAt).toLocaleString()} · Published card remains unchanged by decisions.</p>
          {error ? <p className="mt-5 text-sm text-muted">Proposals unavailable until the storage issue is resolved.</p> : !received.length ? <p className="mt-5 text-sm text-muted">No proposals received for this challenge yet.</p> : <div className="mt-5 space-y-5">{received.map((proposal) => <ProposalReview key={proposal.id} proposal={proposal} acceptedId={acceptedId} onDecided={(items) => { setProposals(items); setNotice("Manual decision saved. Other proposals were left unchanged."); }} />)}</div>}
        </section>;
      })}</div>}
    </>}
  </section>;
}
