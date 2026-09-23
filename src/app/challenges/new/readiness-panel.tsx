import type { TaskCard } from "@/types/challenge";
import { calculateReadiness, hasReadinessInformation, readinessCriteria } from "@/lib/readiness";

export function ReadinessPanel({ card }: { card: Partial<TaskCard> }) {
  const rating = calculateReadiness(card);
  return <section aria-labelledby="readiness-heading" className="mt-5 rounded-xl border border-ink/15 bg-[#edf0e5] p-5">
    <h3 id="readiness-heading" className="text-lg font-semibold">Readiness breakdown</h3>
    <p className="mt-2 text-xs leading-5 text-muted">{rating.explanation}</p>
    <ul className="mt-4 space-y-4">{readinessCriteria.map((criterion) => {
      const maximum = criterion.fields.reduce((total, rule) => total + rule.points, 0);
      return <li key={criterion.key} className="border-t border-ink/10 pt-3"><div className="flex justify-between gap-4 text-sm font-semibold"><span>{criterion.label}</span><span className="shrink-0">{rating.breakdown[criterion.key]} / {maximum}</span></div><p className="mt-1 text-xs leading-5 text-muted">{criterion.fields.map((rule) => `${rule.label}: ${hasReadinessInformation(card[rule.field]) ? rule.points : 0}/${rule.points}`).join(" · ")}</p></li>;
    })}</ul>
    <h4 className="mt-6 text-sm font-semibold">Missing information and how to improve</h4>
    {rating.missingInformation.length === 0 ? <p className="mt-2 text-sm text-muted">All weighted fields contain information. Review its accuracy and usefulness before confirming.</p> : <ul className="mt-3 space-y-3 text-sm">{readinessCriteria.flatMap((criterion) => criterion.fields).filter((rule) => !hasReadinessInformation(card[rule.field])).map((rule) => <li key={rule.field}><span className="font-semibold">{rule.label} (+{rule.points}): </span>{rule.suggestion}</li>)}</ul>}
    {!hasReadinessInformation(card.title) && <p className="mt-4 text-sm text-muted">Title needs information. Add a useful label for the card; it contributes 0 points.</p>}
    <p className="mt-4 text-xs leading-5 text-muted">Levels: 0–39 Draft · 40–69 Working · 70–89 Ready · 90–100 Priority. Contact earns 5 points and communication format earns 5, within the 10-point communication criterion. Longer text earns no extra points.</p>
  </section>;
}
