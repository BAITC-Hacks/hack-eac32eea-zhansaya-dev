import Link from "next/link";

const steps = [
  ["Describe", "Start with a business problem, even if the details are still taking shape."],
  ["Improve with AI", "Answer clarification questions and refine an editable task card."],
  ["Get Readiness Score", "Understand what is complete and what still needs a little more detail."],
  ["Publish", "Review and manually confirm your challenge before sharing it."],
  ["Receive Proposals", "Explore student ideas and choose the right team yourself."],
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 sm:px-10 sm:py-22 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div>
          <p className="mb-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]"><span className="size-2 rounded-full bg-[#7b9850]" /> Real problems. Fresh perspectives.</p>
          <h1 className="max-w-2xl text-5xl leading-[1.08] font-semibold tracking-[-0.055em] sm:text-6xl lg:text-[68px]">Turn business problems into <span className="text-[#6c8650]">student-ready challenges</span></h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-muted">AI helps businesses structure their challenges, measure readiness, and connect with student teams.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/challenges/new" className="rounded-lg bg-ink px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#285447]">Create a Challenge <span aria-hidden="true" className="ml-3">↗</span></Link>
            <Link href="/challenges" className="rounded-lg border border-ink/20 px-6 py-3.5 text-sm font-semibold hover:bg-white">Explore Challenges</Link>
          </div>
          <p className="mt-6 text-xs text-muted">AI assists. People make the decisions.</p>
        </div>
        <div className="relative rounded-3xl border border-ink/10 bg-[#edf0e5] p-6 sm:p-9">
          <div className="mb-6 flex items-center justify-between text-xs"><span className="font-semibold uppercase tracking-widest">From a thought to a brief</span><span className="rounded-full border border-ink/15 px-3 py-1">Illustration</span></div>
          <div className="rounded-xl border border-ink/10 bg-white/70 p-5">
            <p className="text-[10px] font-bold tracking-widest text-muted">01 / YOUR STARTING POINT</p>
            <p className="mt-3 text-lg tracking-tight">“We have a problem. Where do we start?”</p>
          </div>
          <div aria-hidden="true" className="py-3 text-center text-2xl text-[#6c8650]">↓</div>
          <div className="rounded-xl bg-ink p-6 text-white shadow-lg shadow-ink/10">
            <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold tracking-widest text-accent">02 / A CLEARER CHALLENGE</span><span aria-hidden="true" className="text-xl text-accent">✳</span></div>
            <h2 className="mt-4 text-2xl font-medium tracking-tight">Clarity before solutions.</h2>
            <div className="mt-6 space-y-3 text-sm text-white/80">
              {["A defined problem and its context", "An expected result and success criteria", "The details a student team needs"].map((item) => <p key={item} className="flex gap-3"><span aria-hidden="true" className="text-accent">↗</span>{item}</p>)}
            </div>
            <div className="mt-7 border-t border-white/15 pt-4 text-xs text-accent">Refined with AI · Confirmed by you</div>
          </div>
          <p className="mt-5 text-center text-xs text-muted">A preview of the journey we’re building.</p>
        </div>
      </section>
      <section aria-labelledby="flow-heading" className="border-y border-ink/10 bg-white/60">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">The journey</p><h2 id="flow-heading" className="text-3xl font-semibold tracking-tight">A small start. A clear path forward.</h2></div><span className="text-xs text-muted">Planned workflow</span></div>
          <ol className="grid gap-7 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map(([title, text], i) => <li key={title} className="border-t border-ink/15 pt-5"><div className="mb-5 flex items-center justify-between"><span className="grid size-9 place-items-center rounded-full bg-[#edf0e5] text-xs font-semibold">0{i + 1}</span>{i < 4 && <span aria-hidden="true" className="text-muted">→</span>}</div><h3 className="text-base font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-muted">{text}</p></li>)}
          </ol>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-14 sm:px-10 md:grid-cols-2">
        <Link href="/business" className="group rounded-2xl border border-ink/10 bg-[#edf0e5] p-7 hover:border-ink/30"><p className="text-xs font-bold uppercase tracking-widest text-muted">For Business</p><h2 className="mt-4 text-2xl font-semibold tracking-tight">Bring the problem.</h2><p className="mt-3 max-w-md text-sm leading-6 text-muted">Give student teams the context to work on something that matters to your business.</p><p className="mt-6 text-sm font-semibold">Shape your challenge <span aria-hidden="true">↗</span></p></Link>
        <Link href="/students" className="group rounded-2xl border border-ink/10 bg-[#f2f0e9] p-7 hover:border-ink/30"><p className="text-xs font-bold uppercase tracking-widest text-muted">For Students</p><h2 className="mt-4 text-2xl font-semibold tracking-tight">Bring a fresh perspective.</h2><p className="mt-3 max-w-md text-sm leading-6 text-muted">Find a clear challenge, propose your approach, and turn your skills into practical experience.</p><p className="mt-6 text-sm font-semibold">Discover your next challenge <span aria-hidden="true">↗</span></p></Link>
      </section>
    </>
  );
}
