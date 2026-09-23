"use client";

import Link from "next/link";
import { ProposalMilestones } from "@/components/proposal-milestones";
import { useEffect, useState } from "react";
import { readProposals, proposalFields } from "@/lib/proposals";
import type { TeamProposal } from "@/types/team-proposal";

export default function StudentsPage() {
  const [items, setItems] = useState<TeamProposal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    function load() {
      if (!active) return;
      try { setItems(readProposals().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))); setError(""); }
      catch { setError("Could not load saved proposals. Check browser storage and refresh. Existing data has not been changed."); }
      setLoaded(true);
    }
    Promise.resolve().then(load);
    window.addEventListener("storage", load); window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("storage", load); window.removeEventListener("focus", load); };
  }, []);
  useEffect(() => {
    if (loaded && window.location.hash.startsWith("#proposal-")) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [loaded]);
  return <section className="mx-auto max-w-4xl px-6 py-14 sm:px-10">
    <p className="text-xs font-bold uppercase tracking-widest text-muted">For Students</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">Your team proposals</h1>
    <p className="mt-5 text-sm leading-6 text-muted">All submissions saved in this browser are shown here. There are no accounts or team-specific access controls yet. Different browsers and devices cannot share submissions. Pending means no business decision yet. Accepted and rejected statuses are final manual business decisions in this MVP.</p>
    <Link href="/challenges" className="mt-5 inline-block font-semibold underline">Explore published challenges →</Link>
    {!loaded ? <p role="status" className="mt-8">Loading submitted proposals…</p> : error ? <p role="alert" className="mt-8 text-red-800">{error}</p> : !items.length ? <div className="mt-8 rounded-xl border border-ink/15 bg-white p-6"><h2 className="text-xl font-semibold">No proposals submitted yet</h2><p className="mt-3 text-muted">Open a published challenge and choose Submit Proposal to share your team’s approach locally.</p></div> : <><p role="status" className="mt-8 text-sm text-muted">{items.length} submitted {items.length === 1 ? "proposal" : "proposals"}</p><div className="mt-5 space-y-6">{items.map((item) => <article key={item.id} id={`proposal-${item.id}`} className="scroll-mt-6 rounded-2xl border border-ink/15 bg-white p-6 target:ring-2 target:ring-ink">
      <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="break-words text-2xl font-semibold">{item.teamName}</h2><span className="rounded-full bg-accent/60 px-3 py-1 text-sm capitalize">{item.status}</span></div>
      <p className="mt-3 text-sm">Challenge: <Link href={`/challenges/${encodeURIComponent(item.challengeId)}`} className="font-semibold underline">{item.challengeTitle.trim() || "Title not provided"}</Link></p>
      <p className="mt-2 text-xs text-muted">Submitted <time dateTime={item.submittedAt}>{new Date(item.submittedAt).toLocaleString()}</time> · Published version from {new Date(item.challengePublishedAt).toLocaleString()}</p>
      <dl className="mt-5 space-y-4">{proposalFields.filter(([field]) => field !== "teamName").map(([field, label]) => <div key={field}><dt className="text-sm font-semibold">{label}</dt><dd className="mt-1 break-words whitespace-pre-wrap text-sm leading-6 text-muted">{item[field]}</dd></div>)}<div><dt className="text-sm font-semibold">Prototype link</dt><dd className="mt-1 break-words text-sm">{item.prototypeLink ? <a href={item.prototypeLink} target="_blank" rel="noopener noreferrer" className="underline">{item.prototypeLink}</a> : "Not provided"}</dd></div></dl>
      {item.businessDecision && <p className="mt-4 text-sm text-muted">Manual business decision: {item.businessDecision.outcome} on {new Date(item.businessDecision.decidedAt).toLocaleString()}. This decision is final.</p>}
      <ProposalMilestones proposal={item} />
      <p className="mt-5 break-all text-xs text-muted">Proposal ID: {item.id}</p>
    </article>)}</div></>}
  </section>;
}
