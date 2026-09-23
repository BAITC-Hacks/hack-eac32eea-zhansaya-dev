"use client";

import Link from "next/link";
import { useState } from "react";
import type { Challenge, TaskCard } from "@/types/challenge";
import { cardFields, confirmTaskCard, createTaskCard } from "@/lib/task-card";
import { calculateReadiness, hasReadinessInformation, readinessCriteria } from "@/lib/readiness";
import { ReadinessPanel } from "./readiness-panel";

interface Props {
  draft: Challenge;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
  onSave: (draft: Challenge) => void;
  onPublish: () => void;
}

export function TaskCardPanel({ draft, disabled, onBusy, onSave, onPublish }: Props) {
  const [destinations, setDestinations] = useState<Record<string, keyof TaskCard | "">>({});
  const [edits, setEdits] = useState<Partial<TaskCard> | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const answered = draft.clarificationQuestions.filter((item) => item.answer?.trim());
  const fields = edits ?? draft.taskCard;
  const rating = calculateReadiness(fields);
  const savedRating = calculateReadiness(draft.taskCard);
  const scoreChange = rating.score - savedRating.score;

  function save(next: Challenge): boolean {
    try {
      onSave({ ...next, updatedAt: new Date().toISOString() });
      setError("");
      return true;
    } catch {
      setError("Could not save in this browser. Your saved card is unchanged. Keep this page open and retry after checking browser storage.");
      return false;
    }
  }

  function saveEdits() {
    if (save({ ...draft, taskCard: fields })) {
      setEdits(null); onBusy(false); setNotice("Card edits saved. Review and confirm when ready.");
    }
  }

  return <section aria-labelledby="task-card-heading" className="mt-8 border-t border-ink/10 pt-6">
    <h2 id="task-card-heading" className="text-2xl font-semibold tracking-tight">Business Task Card</h2>
    {!draft.taskCardCreatedAt ? <>
      <p className="mt-3 text-sm leading-6 text-muted">Choose where your answers belong. We copy your words exactly, without another AI call. Unassigned answers remain in clarification history. Your description goes into Need/problem; unsupported fields stay blank.</p>
      {answered.map((item, index) => <div key={item.id} className="mt-4 rounded-lg bg-paper p-4 text-sm"><p className="font-semibold">{item.question}</p><p className="mt-2 whitespace-pre-wrap break-words">{item.answer}</p><label htmlFor={`destination-${item.id}`} className="mt-3 block font-semibold">Use answer {index + 1} in</label><select id={`destination-${item.id}`} disabled={disabled} value={destinations[item.id] ?? ""} onChange={(event) => setDestinations({ ...destinations, [item.id]: event.target.value as keyof TaskCard | "" })} className="mt-2 w-full rounded-lg border border-ink/20 bg-white p-3"><option value="">Keep in source answers only</option>{cardFields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>)}
      <button type="button" disabled={disabled || !answered.length} onClick={() => { if (save(createTaskCard(draft, destinations))) setNotice("Task card created. Review all fields before confirming."); }} className="mt-5 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Create Task Card</button>
      {!answered.length && <p className="mt-3 text-sm text-muted">Answer at least one clarification question to create a card. Unknown information can stay blank.</p>}
    </> : <>
      <p role="status" className="mt-4 font-semibold">{edits ? "Unconfirmed — unsaved edits" : draft.confirmation ? "Confirmed" : draft.taskCardNeedsReview ? "Unconfirmed — needs review" : "Unconfirmed"}</p>
      {draft.confirmation && !edits && <p className="mt-2 text-xs text-muted">Manually confirmed on {new Date(draft.confirmation.confirmedAt).toLocaleString()}. Confirmation does not publish changes.</p>}
      {draft.taskCardNeedsReview && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Source information or card fields changed. Your card text is preserved; compare it with your answers, make any updates, and confirm again.</p>}
      <p className="mt-3 text-sm leading-6 text-muted">Every field is editable. Blank fields need information, but do not prevent confirmation. Save edits before confirming.</p>
      <div role="status" aria-live="polite" aria-atomic="true" className="sticky top-2 z-10 mt-5 rounded-xl border border-ink/20 bg-ink p-4 text-white shadow-sm">
        <p className="text-lg font-semibold">Readiness: {rating.score} / 100 · {rating.level}</p>
        <p className="mt-1 text-xs">{edits ? `Unsaved card preview · ${scoreChange >= 0 ? "+" : ""}${scoreChange} points vs saved card (${savedRating.score}/100). Save Card Edits to keep changes.` : "Calculated from the saved card. Confirmation is separate."}</p>
      </div>
      <ReadinessPanel card={fields} />
      <div className="mt-5 space-y-5">{cardFields.map(([key, label]) => {
        const rule = readinessCriteria.flatMap((criterion) => criterion.fields).find((item) => item.field === key);
        return <div key={key}><label htmlFor={`card-${key}`} className="text-sm font-semibold">{label}</label>{!hasReadinessInformation(fields[key]) && <span className="ml-3 text-xs text-amber-800">Needs information</span>}<p className="mt-1 text-xs text-muted">{rule ? `${hasReadinessInformation(fields[key]) ? rule.points : 0}/${rule.points} readiness points` : "0 readiness points — title is not a weighted criterion"}</p><textarea id={`card-${key}`} rows={key === "title" ? 2 : 3} disabled={disabled} value={fields[key] ?? ""} onChange={(event) => { setEdits({ ...fields, [key]: event.target.value }); onBusy(true); setNotice(""); }} className="mt-2 w-full rounded-lg border border-ink/20 bg-paper p-3 text-base" /></div>;
      })}</div>
      <div className="mt-5 flex flex-wrap gap-4">
        <button type="button" disabled={disabled || !edits} onClick={saveEdits} className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Save Card Edits</button>
        {edits && <button type="button" onClick={() => { setEdits(null); onBusy(false); setError(""); }} className="text-sm font-semibold underline">Cancel card edits</button>}
        <button type="button" disabled={disabled || !!edits || !!draft.confirmation} onClick={() => { if (save(confirmTaskCard(draft))) setNotice("Card manually confirmed. Publication is a separate action."); }} className="rounded-lg border border-ink/25 px-5 py-3 text-sm font-semibold disabled:opacity-50">Confirm Card</button>
      </div>
      <div className="mt-6 rounded-xl border border-ink/15 bg-paper p-4">
        {draft.publishedSnapshot ? <><p className="font-semibold">Published version is fixed</p><p className="mt-2 text-sm leading-6 text-muted">The catalog keeps the card published on {new Date(draft.publishedAt!).toLocaleString()}. Editing or reconfirming this working copy will not update that version. Updating or replacing publications is not available in this step.</p><Link href={`/challenges/${encodeURIComponent(draft.id)}`} className="mt-3 inline-block text-sm font-semibold underline">View published challenge →</Link></> : <><p className="text-sm leading-6 text-muted">Publish this confirmed card at any readiness score. Publication creates a fixed snapshot in this browser’s catalog; later edits do not change it.</p>{draft.confirmation && !draft.taskCardNeedsReview && !edits && <button type="button" disabled={disabled} onClick={() => {
          try { onPublish(); setError(""); setNotice("Challenge published once in this browser’s catalog."); }
          catch (failure) { setError(failure instanceof Error ? failure.message : "Could not publish. Check browser storage and retry; saved work is unchanged."); }
        }} className="mt-4 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Publish Challenge</button>}{(!draft.confirmation || edits) && <p className="mt-3 text-xs text-muted">Review, save, and confirm the card to enable publishing.</p>}</>}
      </div>
      <p className="mt-3 text-xs text-muted">By clicking Confirm Card, you confirm you reviewed this version, including any incomplete fields.</p>
    </>}
    {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
    <p role="status" className="mt-3 text-sm text-[#466334]">{notice}</p>
    <details className="mt-6 rounded-lg border border-ink/10 p-4 text-sm"><summary className="cursor-pointer font-semibold">Source history ({draft.sourceHistory?.length ?? 0} earlier versions)</summary><p className="mt-3 text-muted">Original drafts and earlier questions/answers stay separate from your card. Current sources are shown above.</p>{draft.sourceHistory?.map((source, index) => <div key={index} className="mt-4 border-t border-ink/10 pt-3"><p className="font-semibold">Source version {index + 1}</p><p className="mt-2 whitespace-pre-wrap break-words">{source.draftDescription}</p>{source.clarificationQuestions.map((question) => <div key={question.id} className="mt-3"><p>{question.question}</p><p className="whitespace-pre-wrap break-words text-muted">{question.answer || "No answer provided"}</p></div>)}</div>)}</details>
  </section>;
}
