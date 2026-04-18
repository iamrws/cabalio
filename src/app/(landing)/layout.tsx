import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import LazyLandingWalletShell from '@/components/landing/LazyLandingWalletShell';

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LazyLandingWalletShell>
      <LandingNav />
      <main className="min-h-screen w-full" style={{ paddingTop: 'calc(var(--header-height) + 1.5rem)' }}>
        {children}
      </main>
      <LandingFooter />
    </LazyLandingWalletShell>
  );
}
