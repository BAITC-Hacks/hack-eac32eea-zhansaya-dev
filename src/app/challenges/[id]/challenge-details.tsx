"use client";

import Link from "next/link";
import { useCatalog } from "../use-catalog";
import { cardFields } from "@/lib/task-card";
import { calculateReadiness, hasReadinessInformation } from "@/lib/readiness";
import { ReadinessPanel } from "../new/readiness-panel";
import { ProposalForm } from "./proposal-form";

export function ChallengeDetails({ id }: { id: string }) {
  const { items, loaded, error } = useCatalog();
  const challenge = items.find((item) => item.id === id);
  const rating = challenge ? calculateReadiness(challenge.taskCard) : null;
  return <section className="mx-auto max-w-4xl px-6 py-14 sm:px-10"><Link href="/challenges" className="text-sm font-semibold underline">← Challenge catalog</Link>
    {!loaded ? <p role="status" className="mt-10">Loading published challenge…</p> : error ? <p role="alert" className="mt-10 text-red-800">{error}</p> : !challenge || !rating ? <><h1 className="mt-8 text-3xl font-semibold">Challenge not found in this browser</h1><p className="mt-4 text-muted">Only challenges published on this browser and origin are available. This link does not transfer local data.</p></> : <>
      <p className="mt-8 text-xs font-bold uppercase tracking-widest text-muted">Published challenge</p>
      <h1 className="mt-4 break-words text-4xl font-semibold tracking-tight">{challenge.taskCard.title?.trim() || "Title not provided"}</h1>
      <p className="mt-4 text-lg font-semibold">Readiness: {rating.score} / 100 · {rating.level}</p>
      <p className="mt-3 text-sm text-muted">Published <time dateTime={challenge.publishedAt}>{new Date(challenge.publishedAt).toLocaleString()}</time></p>
      <p className="mt-3 text-sm text-muted">This is a fixed, manually confirmed snapshot. Later business edits do not change it.</p>
      <dl className="mt-8 space-y-6 rounded-2xl border border-ink/10 bg-white p-6">{cardFields.map(([field, label]) => <div key={field}><dt className="font-semibold">{label}</dt><dd className="mt-2 break-words whitespace-pre-wrap text-sm leading-7">{challenge.taskCard[field]?.trim() ? challenge.taskCard[field] : "Not provided"}</dd>{!hasReadinessInformation(challenge.taskCard[field]) && <p className="mt-1 text-xs text-amber-800">Needs information</p>}</div>)}</dl>
      <ReadinessPanel card={challenge.taskCard} />
      <ProposalForm key={challenge.id} challengeId={challenge.id} />
    </>}
  </section>;
}
