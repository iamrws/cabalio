import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import CommunityStats from '@/components/landing/CommunityStats';
import Footer from '@/components/landing/Footer';

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;
  const authState = params.auth;

  return (
    <main className="min-h-screen bg-bg-primary">
      {authState === 'required' ? (
        <div className="mx-auto max-w-5xl px-6 pt-6">
          <div className="rounded-lg border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-sm text-neon-orange">
            Login required. Connect your wallet and verify holder access to continue.
          </div>
        </div>
      ) : null}
      <Hero />
      <HowItWorks />
      <CommunityStats />

      {/* Tiers section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Tiered <span className="gradient-text">Leaderboard</span>
          </h2>
          <p className="text-text-secondary text-lg mb-12">
            Not a zero-sum game. Multiple members can reach the top tier each week.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                tier: 'Cabal Elite',
                points: '50+ pts/week',
                color: 'border-yellow-500/40 shadow-[0_0_30px_rgba(255,215,0,0.15)]',
                textColor: 'text-yellow-400',
                bg: 'bg-yellow-500/5',
              },
              {
                tier: 'Cabal Member',
                points: '25+ pts/week',
                color: 'border-neon-cyan/40 shadow-[0_0_30px_rgba(0,240,255,0.15)]',
                textColor: 'text-neon-cyan',
                bg: 'bg-neon-cyan/5',
              },
              {
                tier: 'Cabal Initiate',
                points: 'Any submission',
                color: 'border-neon-green/40 shadow-[0_0_30px_rgba(57,255,20,0.15)]',
                textColor: 'text-neon-green',
                bg: 'bg-neon-green/5',
              },
            ].map((item) => (
              <div
                key={item.tier}
                className={`rounded-xl border p-8 ${item.color} ${item.bg} transition-all duration-300 hover:scale-105`}
              >
                <div className={`text-2xl font-bold mb-2 ${item.textColor}`}>{item.tier}</div>
                <div className="text-sm text-text-secondary font-mono">{item.points}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-bg-secondary/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to join the <span className="gradient-text">Cabal</span>?
          </h2>
          <p className="text-text-secondary text-lg mb-8">
            Connect your wallet, verify your NFT, and start earning today.
            Your content shapes the community. Your effort earns real rewards.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-neon-purple/10 border border-neon-purple/30 px-5 py-2 text-sm text-neon-purple font-mono">
            Powered by JitoSOL Yield
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
