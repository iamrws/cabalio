import BehavioralLanding from '@/components/landing/BehavioralLanding';

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;

  return <BehavioralLanding authState={params.auth} />;
}
