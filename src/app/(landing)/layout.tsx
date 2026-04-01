import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNav />
      <main className="min-h-screen pt-14">
        {children}
      </main>
      <LandingFooter />
    </>
  );
}
