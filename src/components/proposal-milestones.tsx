"use client";

import { useEffect, useRef, useState } from "react";
import { confirmMilestone, MILESTONE_DESCRIPTION_LIMIT, MILESTONE_POINTS, readMilestones } from "@/lib/milestones";
import type { ProjectMilestone } from "@/types/milestone";
import type { TeamProposal } from "@/types/team-proposal";

export function ProposalMilestones({ proposal, canConfirm = false }: { proposal: TeamProposal; canConfirm?: boolean }) {
  const [items, setItems] = useState<ProjectMilestone[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const submissionId = useRef<string | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    function load() {
      if (!active) return;
      try { setItems(readMilestones()); setLoadError(""); }
      catch { setLoadError("Milestones and points are unavailable because saved data is invalid or inaccessible. No data was changed. Check browser storage and refresh."); }
      setLoaded(true);
    }
    Promise.resolve().then(load);
    window.addEventListener("storage", load); window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("storage", load); window.removeEventListener("focus", load); };
  }, [proposal.id, proposal.status]);

  async function save() {
    if (!reviewing || inFlight.current || success) return;
    inFlight.current = true; setSaving(true); setError("");
    try {
      submissionId.current ??= crypto.randomUUID();
      setItems(await confirmMilestone(submissionId.current, proposal.id, description));
      setSuccess(true); setReviewing(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save the milestone. Your text is still here; retry when browser storage is available."); }
    finally { inFlight.current = false; setSaving(false); }
  }
  const milestones = items.filter(item => item.acceptedProposalId === proposal.id && item.challengeId === proposal.challengeId);
  return <section aria-label={`Milestones for ${proposal.teamName}`} className="mt-6 border-t border-ink/15 pt-5">
    <h3 className="text-lg font-semibold">Confirmed milestones</h3>
    <p className="mt-2 text-xs leading-5 text-muted">{MILESTONE_POINTS} points per milestone confirmed by the business user. Acceptance alone earns 0 points. AI does not verify completion or award points. Saved only in this browser profile and origin; other browsers and devices cannot share milestones.</p>
    {!loaded ? <p role="status" className="mt-3 text-sm">Loading milestones…</p> : loadError ? <p role="alert" className="mt-3 text-sm text-red-800">{loadError}</p> : <>
      <p className="mt-4 font-semibold">Progress points: {proposal.status === "accepted" ? milestones.reduce((total, item) => total + item.points, 0) : 0}</p>
      {milestones.length ? <ul className="mt-4 space-y-3">{milestones.map(item => <li key={item.id} className="rounded-lg bg-accent/30 p-4"><p className="break-words whitespace-pre-wrap text-sm">{item.description}</p><p className="mt-2 text-xs text-muted">+{item.points} points · Confirmed by the business user · <time dateTime={item.confirmedAt}>{new Date(item.confirmedAt).toLocaleString()}</time></p></li>)}</ul> : <p className="mt-2 text-sm text-muted">No confirmed milestones yet.</p>}
      {proposal.status !== "accepted" ? <p className="mt-2 text-sm text-muted">Only accepted teams can receive milestone points.</p> : canConfirm && (success ? <div className="mt-5"><p role="status" className="text-sm font-semibold">Milestone confirmed. {MILESTONE_POINTS} points awarded once.</p><button type="button" className="mt-4 text-sm font-semibold underline" onClick={() => { setSuccess(false); setDescription(""); submissionId.current = null; setError(""); }}>Record another milestone</button></div> : <form className="mt-5" onSubmit={event => { event.preventDefault(); if (!description.trim()) { setError("Describe the completed milestone before confirming."); return; } setError(""); setReviewing(true); }}>
        <label htmlFor={`milestone-${proposal.id}`} className="block text-sm font-semibold">Completed milestone or result</label>
        <textarea id={`milestone-${proposal.id}`} value={description} maxLength={MILESTONE_DESCRIPTION_LIMIT} disabled={reviewing || saving} onChange={event => { setDescription(event.target.value); submissionId.current = null; setError(""); }} rows={3} className="mt-2 w-full rounded-lg border border-ink/25 bg-white p-3 text-sm disabled:opacity-70" />
        {!reviewing ? <button type="submit" className="mt-3 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white">Review milestone</button> : <div role="group" aria-label="Confirm completed milestone" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm">Confirm that {proposal.teamName} completed the milestone described above? This saves a final business confirmation and awards {MILESTONE_POINTS} points.</p><div className="mt-3 flex flex-wrap gap-4"><button type="button" disabled={saving} onClick={() => void save()} className="font-semibold underline disabled:opacity-50">{saving ? "Saving milestone…" : "Confirm milestone and award points"}</button><button type="button" disabled={saving} onClick={() => setReviewing(false)} className="font-semibold underline">Back to edit milestone</button></div></div>}
      </form>)}
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    </>}
  </section>;
}
