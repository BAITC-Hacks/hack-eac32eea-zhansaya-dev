import Link from "next/link";

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  planned: string[];
}

export function PlaceholderPage({ eyebrow, title, description, planned }: PlaceholderPageProps) {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 sm:px-10 sm:py-24">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">{eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{description}</p>
      <div className="mt-10 rounded-2xl border border-ink/10 bg-white p-7">
        <span className="rounded-full bg-accent/60 px-3 py-1 text-xs font-semibold">Coming in a future step</span>
        <h2 className="mt-6 text-lg font-semibold">Planned for this space</h2>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-muted">{planned.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="mt-7 border-t border-ink/10 pt-5 text-xs leading-5 text-muted">This is a UI skeleton. No data is collected, generated, scored, submitted, or published.</p>
      </div>
      <Link href="/" className="mt-8 inline-block text-sm font-semibold underline underline-offset-4">← Back to Home</Link>
    </section>
  );
}
