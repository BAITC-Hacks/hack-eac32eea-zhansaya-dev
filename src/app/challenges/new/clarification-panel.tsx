"use client";

import { useRef, useState } from "react";
import type { Challenge, ClarificationQuestion } from "@/types/challenge";
import { isClarificationQuestion } from "@/lib/clarification";

interface Props {
  draft: Challenge;
  disabled?: boolean;
  onSave: (draft: Challenge) => void;
  onBusy: (busy: boolean) => void;
}

export function ClarificationPanel({ draft, disabled = false, onSave, onBusy }: Props) {
  const [questions, setQuestions] = useState(draft.clarificationQuestions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef(false);

  function persist(next: ClarificationQuestion[]) {
    try {
      onSave({ ...draft, clarificationQuestions: next, updatedAt: new Date().toISOString() });
      setSaveError(false);
      onBusy(false);
      setNotice("Questions and answers saved in this browser.");
    } catch {
      setSaveError(true);
      onBusy(true);
      setNotice("");
    }
  }

  async function generate() {
    if (pending.current) return;
    pending.current = true;
    setConfirm(false);
    setLoading(true);
    onBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/clarify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: draft.draftDescription }),
        signal: AbortSignal.timeout(45000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not generate questions. Please retry.");
      if (!Array.isArray(result.questions) || result.questions.length < 3 || result.questions.length > 7
        || !result.questions.every(isClarificationQuestion)) throw new Error("Invalid AI response. Please retry.");
      // Persist first: a failed request/write must not discard previous answers.
      onSave({ ...draft, clarificationQuestions: result.questions, clarificationSourceDescription: draft.draftDescription, updatedAt: new Date().toISOString() });
      setQuestions(result.questions);
      setNotice("AI questions generated and saved. Review or edit each question, then add what you know.");
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== "TimeoutError" && failure.name !== "TypeError" ? failure.message : "The AI request failed or timed out. Please retry. Your saved draft and answers are unchanged.");
    } finally {
      pending.current = false;
      setLoading(false);
      onBusy(false);
    }
  }

  function requestGeneration() {
    if (questions.some((item) => item.answer?.trim())) setConfirm(true);
    else void generate();
  }

  function update(index: number, field: "question" | "answer", value: string) {
    const next = questions.map((item, i) => i === index ? { ...item, [field]: value } : item);
    setQuestions(next);
    if (next.some((item) => !item.question.trim())) {
      setSaveError(true);
      onBusy(true);
      setNotice("");
      return;
    }
    persist(next);
  }

  return <section className="mt-8 border-t border-ink/10 pt-6" aria-labelledby="clarification-title">
    <h2 id="clarification-title" className="text-2xl font-semibold tracking-tight">Improve with AI</h2>
    <p className="mt-3 text-sm leading-6 text-muted">Send only your saved problem description to OpenAI to find what’s missing. Questions and answers stay editable. Leave anything you don’t know blank.</p>
    {questions.length > 0 && draft.clarificationSourceDescription !== draft.draftDescription && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Your description has changed since these questions were generated. Review them or regenerate; existing answers are preserved until you replace them.</p>}
    <button type="button" disabled={disabled || loading || saveError} onClick={requestGeneration} className="mt-5 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Generating questions…" : error ? "Retry AI clarification" : questions.length ? "Regenerate questions" : "Improve with AI"}</button>
    {loading && <p role="status" className="mt-3 text-sm text-muted">Looking for gaps in your saved description…</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {confirm && <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"><p>Regenerating will replace these questions and their answers. Replacement happens only after new questions are successfully generated and saved.</p><div className="mt-4 flex flex-wrap gap-5"><button type="button" disabled={disabled} onClick={() => void generate()} className="font-semibold underline underline-offset-4">Replace questions and answers</button><button type="button" onClick={() => setConfirm(false)} className="font-semibold underline underline-offset-4">Keep current questions</button></div></div>}
    <p role="status" className="mt-3 text-sm text-[#466334]">{notice}</p>
    {saveError && <div role="alert" className="mt-4 text-sm text-red-800"><p>Changes are not saved. Keep each question nonempty and check browser storage. Your edits remain here; save before leaving.</p><button type="button" disabled={questions.some((item) => !item.question.trim())} onClick={() => persist(questions)} className="mt-2 font-semibold underline disabled:opacity-50">Retry saving answers</button></div>}
    <div className="mt-6 space-y-6">{questions.map((item, index) => <div key={item.id} className="rounded-xl border border-ink/10 bg-paper p-4"><label htmlFor={`question-${item.id}`} className="text-sm font-semibold">Question {index + 1}</label><textarea id={`question-${item.id}`} value={item.question} maxLength={1000} rows={3} disabled={disabled || loading} onChange={(event) => update(index, "question", event.target.value)} className="mt-2 w-full rounded-lg border border-ink/20 bg-white p-3 text-sm leading-6" /><label htmlFor={`answer-${item.id}`} className="mt-4 block text-sm font-semibold">Your answer to question {index + 1}</label><textarea id={`answer-${item.id}`} value={item.answer ?? ""} rows={3} disabled={disabled || loading} onChange={(event) => update(index, "answer", event.target.value)} className="mt-2 w-full rounded-lg border border-ink/20 bg-white p-3 text-base" /></div>)}</div>
    <p className="mt-5 text-xs leading-5 text-muted">Answers save as you type. Create a task card below when you have answered. The card includes a live readiness score. Confirm the card before publishing a fixed snapshot to the local catalog.</p>
  </section>;
}
