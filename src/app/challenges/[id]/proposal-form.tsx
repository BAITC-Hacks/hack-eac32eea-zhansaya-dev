"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { proposalFields, submitProposal, validateProposal, type ProposalInput, type ProposalErrors } from "@/lib/proposals";
import type { TeamProposal } from "@/types/team-proposal";

export function ProposalForm({ challengeId }: { challengeId: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<ProposalInput>({ teamName: "", solutionIdea: "", plan: "", timeline: "", prototypeLink: "" });
  const [errors, setErrors] = useState<ProposalErrors>({});
  const [failure, setFailure] = useState("");
  const [submitted, setSubmitted] = useState<TeamProposal | null>(null);
  const [saving, setSaving] = useState(false);
  const submissionId = useRef<string | null>(null);
  const locked = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const problems = validateProposal(input);
    setErrors(problems); setFailure("");
    if (Object.keys(problems).length) return;
    locked.current = true; setSaving(true);
    try {
      submissionId.current ??= crypto.randomUUID();
      setSubmitted(submitProposal(submissionId.current, challengeId, input));
    } catch (error) {
      locked.current = false;
      setFailure(error instanceof Error ? `Submission was not saved. ${error.message}` : "Submission was not saved. Check browser storage and retry. Your text is still here.");
    } finally { setSaving(false); }
  }

  return <section aria-labelledby="proposal-heading" className="mt-8 rounded-2xl border border-ink/15 bg-white p-6">
    <h2 id="proposal-heading" className="text-2xl font-semibold">Propose your team’s approach</h2>
    <p className="mt-3 text-sm leading-6 text-muted">Submissions are saved only in this browser and origin. Different browsers and devices cannot share them yet. Submitting does not mean your team is selected. The business must manually accept or reject proposals; decisions are final in this MVP.</p>
    {submitted ? <div role="status" className="mt-5 rounded-xl bg-[#edf0e5] p-5"><h3 className="font-semibold">Proposal submitted · Pending</h3><p className="mt-2 break-words text-sm">{submitted.teamName} — saved on {new Date(submitted.submittedAt).toLocaleString()}.</p><Link href={`/students#proposal-${encodeURIComponent(submitted.id)}`} onClick={(event) => { if (event.detail > 1) event.preventDefault(); }} className="mt-4 inline-block text-sm font-semibold underline">View your submitted proposal →</Link></div> : !open ? <button type="button" onClick={() => setOpen(true)} className="mt-5 rounded-lg bg-ink px-5 py-3 font-semibold text-white">Submit Proposal</button> : <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
      {proposalFields.map(([field, label]) => <div key={field}><label htmlFor={`proposal-${field}`} className="text-sm font-semibold">{label} (required)</label>{field === "teamName" ? <input id={`proposal-${field}`} value={input[field]} onChange={(event) => setInput({ ...input, [field]: event.target.value })} required aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `error-${field}` : undefined} className="mt-2 w-full rounded-lg border border-ink/25 bg-paper p-3" /> : <textarea id={`proposal-${field}`} value={input[field]} onChange={(event) => setInput({ ...input, [field]: event.target.value })} required rows={3} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `error-${field}` : undefined} className="mt-2 w-full rounded-lg border border-ink/25 bg-paper p-3" />}{errors[field] && <p role="alert" id={`error-${field}`} className="mt-2 text-sm text-red-800">{errors[field]}</p>}</div>)}
      <div><label htmlFor="proposal-prototype" className="text-sm font-semibold">Prototype link (optional)</label><input id="proposal-prototype" type="url" value={input.prototypeLink} onChange={(event) => setInput({ ...input, prototypeLink: event.target.value })} aria-invalid={!!errors.prototypeLink} aria-describedby={errors.prototypeLink ? "error-prototype" : undefined} placeholder="https://example.com/prototype" className="mt-2 w-full rounded-lg border border-ink/25 bg-paper p-3" />{errors.prototypeLink && <p role="alert" id="error-prototype" className="mt-2 text-sm text-red-800">{errors.prototypeLink}</p>}</div>
      {failure && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{failure}</p>}
      <p className="text-xs text-muted">Review before submitting. Unsaved form text is not retained after leaving or refreshing this page.</p>
      <button type="submit" disabled={saving} className="rounded-lg bg-ink px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving proposal…" : "Submit Proposal"}</button>
    </form>}
    <Link href="/students" className="mt-5 inline-block text-sm font-semibold underline">View submissions saved in this browser</Link>
  </section>;
}
