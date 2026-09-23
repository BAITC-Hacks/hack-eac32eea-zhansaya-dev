"use client";

import Link from "next/link";
import { useState } from "react";
import { useCatalog } from "./use-catalog";
import { filterCatalog } from "@/lib/catalog";
import type { ReadinessLevel } from "@/types/challenge";

export default function ChallengesPage() {
  const { items, loaded, error } = useCatalog();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<ReadinessLevel | "All">("All");
  const [sort, setSort] = useState<"highest" | "lowest">("highest");
  const filtered = filterCatalog(items, search, level, sort);
  return <section className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
    <p className="text-xs font-bold uppercase tracking-widest text-muted">Challenge catalog</p>
    <h1 className="mt-4 text-4xl font-semibold tracking-tight">Find a problem worth solving.</h1>
    <p className="mt-5 text-muted">Business-confirmed cards published in this browser. All readiness levels are welcome.</p>
    <p className="mt-2 text-xs text-muted">This local MVP does not share challenges across devices or browsers.</p>
    {!loaded ? <p role="status" className="mt-10">Loading published challenges…</p> : error ? <p role="alert" className="mt-10 text-red-800">{error}</p> : <>
      <div className="my-8 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">Search challenges<input value={search} onChange={(event) => setSearch(event.target.value)} type="search" className="mt-2 w-full rounded-lg border border-ink/20 bg-white p-3 font-normal" placeholder="Search published card text" /></label>
        <label className="text-sm font-semibold">Readiness level<select value={level} onChange={(event) => setLevel(event.target.value as ReadinessLevel | "All")} className="mt-2 w-full rounded-lg border border-ink/20 bg-white p-3 font-normal">{["All", "Draft", "Working", "Ready", "Priority"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm font-semibold">Sort by readiness<select value={sort} onChange={(event) => setSort(event.target.value as "highest" | "lowest")} className="mt-2 w-full rounded-lg border border-ink/20 bg-white p-3 font-normal"><option value="highest">Highest first</option><option value="lowest">Lowest first</option></select></label>
      </div>
      <p role="status" className="mb-5 text-sm text-muted">{filtered.length} of {items.length} published challenges</p>
      {!items.length ? <div className="rounded-2xl border border-ink/10 bg-white p-8"><h2 className="text-xl font-semibold">No challenges published yet</h2><p className="mt-3 text-muted">Create a task card, review it, confirm it, then publish at any readiness score.</p><Link href="/challenges/new" className="mt-5 inline-block font-semibold underline">Create a Challenge →</Link></div> : !filtered.length ? <div className="rounded-2xl border border-ink/10 bg-white p-8"><h2 className="text-xl font-semibold">No matching challenges</h2><button type="button" onClick={() => { setSearch(""); setLevel("All"); }} className="mt-4 font-semibold underline">Clear filters</button></div> : <div className="grid gap-5 md:grid-cols-2">{filtered.map(({ challenge, rating }) => <article key={challenge.id} className="min-w-0 rounded-2xl border border-ink/10 bg-white p-6"><p className="text-sm font-semibold">{rating.score} / 100 · {rating.level}</p><h2 className="mt-4 break-words text-2xl font-semibold"><Link href={`/challenges/${encodeURIComponent(challenge.id)}`} className="underline-offset-4 hover:underline">{challenge.taskCard.title?.trim() || "Title not provided"}</Link></h2><p className="mt-3 line-clamp-3 break-words whitespace-pre-wrap text-sm leading-6 text-muted">{challenge.taskCard.needOrProblem?.trim() || "Problem description not provided"}</p><p className="mt-5 text-xs text-muted">Published <time dateTime={challenge.publishedAt}>{new Date(challenge.publishedAt).toLocaleString()}</time></p><Link href={`/challenges/${encodeURIComponent(challenge.id)}`} className="mt-4 inline-block text-sm font-semibold">View challenge →</Link></article>)}</div>}
    </>}
  </section>;
}
