import { ChallengeDetails } from "./challenge-details";

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChallengeDetails id={id} />;
}
