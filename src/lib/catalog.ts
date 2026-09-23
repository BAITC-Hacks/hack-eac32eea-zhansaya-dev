import type { PublishedChallenge, ReadinessLevel } from "@/types/challenge";
import { calculateReadiness } from "@/lib/readiness";

export function filterCatalog(challenges: PublishedChallenge[], search: string, level: ReadinessLevel | "All", sort: "highest" | "lowest" = "highest") {
  const query = search.trim().toLowerCase();
  return challenges.map((challenge) => ({ challenge, rating: calculateReadiness(challenge.taskCard) }))
    .filter(({ challenge, rating }) => (level === "All" || rating.level === level)
      && (!query || Object.values(challenge.taskCard).some((value) => value?.toLowerCase().includes(query))))
    .sort((a, b) => (sort === "highest" ? b.rating.score - a.rating.score : a.rating.score - b.rating.score)
      || b.challenge.publishedAt.localeCompare(a.challenge.publishedAt) || a.challenge.id.localeCompare(b.challenge.id));
}
