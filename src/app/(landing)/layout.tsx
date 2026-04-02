import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      <main className="min-h-screen mx-auto" style={{ paddingTop: 'calc(var(--header-height) + 1.5rem)' }}>
        {children}
      </main>
      <LandingFooter />
    </>
  );
}
