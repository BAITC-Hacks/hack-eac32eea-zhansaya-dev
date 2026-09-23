"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { readDrafts, saveDraft, publishChallenge } from "@/lib/draft-storage";
import { openCafeteriaDemo } from "@/lib/demo-draft";
import { TaskCardPanel } from "./task-card-panel";
import { ClarificationPanel } from "./clarification-panel";
import type { Challenge } from "@/types/challenge";

const inputClass = "mt-2 w-full rounded-lg border border-ink/25 bg-paper px-4 py-3 text-base text-ink";
const buttonClass = "rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-[#285447] disabled:cursor-not-allowed disabled:opacity-50";

export function DraftWorkspace() {
  const [cardBusy, setCardBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [drafts, setDrafts] = useState<Challenge[]>([]);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [editing, setEditing] = useState(true);
  const [description, setDescription] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contact, setContact] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState("");
  const [descriptionError, setDescriptionError] = useState(false);
  const [notice, setNotice] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    // Load after hydration; the server never accesses browser storage.
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const stored = readDrafts();
        setDrafts(stored);
        setSelected(stored[0] ?? null);
        setEditing(stored.length === 0);
      } catch {
        setLoadError(true);
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  function openDraft(draft: Challenge) {
    setSelected(draft);
    setEditing(false);
    setError("");
    setDescriptionError(false);
    setNotice("");
  }

  function editDraft() {
    if (!selected) return;
    setDescription(selected.draftDescription);
    setBusinessName(selected.businessName ?? "");
    setContact(selected.contactNameOrEmail ?? "");
    setEditing(true);
    setNotice("");
  }

  function newDraft() {
    setSelected(null);
    setDescription("");
    setBusinessName("");
    setContact("");
    setError("");
    setDescriptionError(false);
    setNotice("");
    setEditing(true);
  }

  function openDemo() {
    try {
      const demo = openCafeteriaDemo();
      setDrafts(readDrafts());
      openDraft(demo);
      setNotice("demo data — user-provided description only. No questions or answers were prefilled.");
    } catch {
      setError("Could not open demo data. Existing drafts were not replaced. Check browser storage and retry.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!description.trim()) {
      setDescriptionError(true);
      setError("Enter a short description of the problem before saving your draft.");
      descriptionRef.current?.focus();
      return;
    }
    setDescriptionError(false);
    try {
      const now = new Date().toISOString();
      const draft: Challenge = {
        ...(selected ?? {
          id: crypto.randomUUID(),
          status: "draft" as const,
          createdAt: now,
          clarificationQuestions: [],
          taskCard: {},
        }),
        draftDescription: description,
        businessName: businessName || undefined,
        contactNameOrEmail: contact || undefined,
        updatedAt: now,
      };
      const stored = saveDraft(draft);
      setDrafts(stored);
      setSelected(stored.find((item) => item.id === draft.id) ?? draft);
      setEditing(false);
      setError("");
      setNotice("Draft saved on this browser.");
    } catch {
      setError("We couldn’t save your draft in this browser. Your text is still here. Check that browser storage is available and has space, then try Save Draft again.");
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">For Business / Draft & clarification</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Every challenge starts with a problem.</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">Start with what you know. Save your own words as a draft and come back to refine them later.</p>
      <p className="mt-4 text-sm leading-6 text-muted">Drafts are saved only in this browser on this device. Publishing adds a fixed card snapshot to this browser’s catalog. Clearing browser data removes saved challenges.</p>

      {!loaded ? <p role="status" className="mt-10">Loading your drafts…</p> : loadError ? (
        <div role="alert" className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">We couldn’t load your saved drafts. Browser storage may be unavailable or the saved data may be unreadable. Existing data has not been replaced. Check your browser settings and refresh to try again.</div>
      ) : (
        <div className="mt-10 grid items-start gap-7 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-ink/10 bg-[#edf0e5] p-5" aria-label="Saved drafts">
            <h2 className="font-semibold">Your drafts <span className="text-muted">({drafts.length})</span></h2>
            <p className="mt-2 text-xs leading-5 text-muted">Return to Create a Challenge to find these again.</p>
            {drafts.length === 0 ? <p className="my-5 text-sm text-muted">Your first draft will appear here.</p> : (
              <ul className="my-5 space-y-2">
                {drafts.map((draft) => <li key={draft.id}><button type="button" disabled={editing || aiBusy || cardBusy} aria-pressed={selected?.id === draft.id} onClick={() => openDraft(draft)} className={`w-full rounded-lg border p-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60 ${selected?.id === draft.id ? "border-ink/30 bg-white" : "border-transparent hover:bg-white/70"}`}>{draft.demoData && <span className="mb-1 block text-xs font-bold">demo data</span>}<span className="line-clamp-2 break-words whitespace-pre-wrap">{draft.draftDescription}</span><span className="mt-2 block text-xs text-muted">{draft.status === "published" ? "Published" : "Draft"} · {new Date(draft.createdAt).toLocaleDateString()}</span></button></li>)}
              </ul>
            )}
            <button type="button" onClick={newDraft} disabled={editing || aiBusy || cardBusy} className="mt-3 text-sm font-semibold underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50">+ New draft</button>
            <button type="button" onClick={openDemo} disabled={aiBusy || cardBusy || (editing && (!!selected || !!description || !!businessName || !!contact))} className="mt-4 block text-sm font-semibold underline disabled:opacity-50">Open cafeteria demo data</button>
            <p className="mt-2 text-xs leading-5 text-muted">Creates a labeled draft with only the supplied problem description. No prefilled AI questions or business answers.</p>
            {editing && drafts.length > 0 && <p className="mt-3 text-xs leading-5 text-muted">Save or cancel your changes before switching drafts.</p>}
          </aside>

          <div className="min-w-0 rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
            <p role="status" className="text-sm font-semibold text-[#466334]">{notice}</p>
            {selected?.demoData && <p className="mt-3 text-sm font-bold">demo data</p>}
            {!editing && error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
            {editing ? (
              <form onSubmit={handleSubmit} noValidate>
                <h2 className="text-2xl font-semibold tracking-tight">{selected ? "Edit your draft" : "Describe your challenge"}</h2>
                <div className="mt-6">
                  <label htmlFor="description" className="text-sm font-semibold">Problem description <span className="font-normal text-muted">(required)</span></label>
                  <p id="description-help" className="mt-1 text-xs leading-5 text-muted">What problem or need would you like a student team to help with? We’ll keep your wording exactly as entered.</p>
                  <textarea ref={descriptionRef} id="description" name="description" required rows={6} value={description} onChange={(event) => setDescription(event.target.value)} aria-invalid={descriptionError} aria-describedby={`description-help${descriptionError ? " save-error" : ""}`} className={`${inputClass} resize-y`} />
                </div>
                <div className="mt-5"><label htmlFor="business-name" className="text-sm font-semibold">Business or organization name <span className="font-normal text-muted">(optional)</span></label><input id="business-name" name="organization" autoComplete="organization" value={businessName} onChange={(event) => setBusinessName(event.target.value)} className={inputClass} /></div>
                <div className="mt-5"><label htmlFor="contact" className="text-sm font-semibold">Contact name or email <span className="font-normal text-muted">(optional)</span></label><input id="contact" name="contact" type="text" value={contact} onChange={(event) => setContact(event.target.value)} className={inputClass} /></div>
                {error && <p id="save-error" role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>}
                <div className="mt-7 flex flex-wrap items-center gap-5"><button type="submit" className={buttonClass}>Save Draft</button>{drafts.length > 0 && <button type="button" onClick={() => openDraft(selected ?? drafts[0])} className="text-sm font-semibold underline underline-offset-4">Cancel</button>}</div>
              </form>
            ) : selected && (
              <div className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-semibold tracking-tight">Your saved draft</h2><span className="rounded-full bg-accent/60 px-3 py-1 text-xs font-semibold">{selected.status === "published" ? "Published · editable working copy" : "Draft"}</span></div>
                <dl className="mt-6 space-y-5 text-sm">
                  <div><dt className="font-semibold">Problem description</dt><dd className="mt-2 break-words whitespace-pre-wrap leading-7">{selected.draftDescription}</dd></div>
                  <div><dt className="font-semibold">Business or organization</dt><dd className="mt-1 break-words whitespace-pre-wrap text-muted">{selected.businessName || "Not provided"}</dd></div>
                  <div><dt className="font-semibold">Contact name or email</dt><dd className="mt-1 break-words whitespace-pre-wrap text-muted">{selected.contactNameOrEmail || "Not provided"}</dd></div>
                  <div><dt className="font-semibold">Created</dt><dd className="mt-1 text-muted"><time dateTime={selected.createdAt}>{new Date(selected.createdAt).toLocaleString()}</time></dd></div>
                  <div><dt className="font-semibold">Draft ID</dt><dd className="mt-1 break-all font-mono text-xs text-muted">{selected.id}</dd></div>
                </dl>
                <button type="button" disabled={aiBusy || cardBusy} onClick={editDraft} className={`${buttonClass} mt-7`}>Edit draft</button>
              </div>
            )}
            {!editing && selected ? <ClarificationPanel key={`${selected.id}:${selected.draftDescription}`} draft={selected} disabled={cardBusy} onBusy={setAiBusy} onSave={(draft) => {
              const stored = saveDraft(draft);
              setDrafts(stored);
              setSelected(stored.find((item) => item.id === draft.id) ?? draft);
            }} /> : <p className="mt-8 border-t border-ink/10 pt-6 text-sm text-muted">Save your draft to improve it with AI.</p>}
            {!editing && selected && <TaskCardPanel key={selected.id} draft={selected} disabled={aiBusy} onBusy={setCardBusy} onPublish={() => {
              const stored = publishChallenge(selected);
              setDrafts(stored);
              setSelected(stored.find((item) => item.id === selected.id) ?? selected);
            }} onSave={(draft) => {
              const stored = saveDraft(draft);
              setDrafts(stored);
              setSelected(stored.find((item) => item.id === draft.id) ?? draft);
            }} />}
          </div>
        </div>
      )}
    </section>
  );
}
