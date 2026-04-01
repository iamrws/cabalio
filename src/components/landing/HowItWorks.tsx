'use client';

import { useEffect, useRef, useState } from 'react';
import NeonCard from '../shared/NeonCard';

const steps = [
  {
    number: '01',
    title: 'Connect & Verify',
    description: 'Connect your Solana wallet and verify your Jito Cabal NFT ownership to enter the inner circle.',
    accent: 'var(--accent)',
  },
  {
    number: '02',
    title: 'Submit Content',
    description: 'Share your Jito content, blog articles, or artwork. Up to 3 submissions per day to keep quality high.',
    accent: 'var(--accent)',
  },
  {
    number: '03',
    title: 'AI Scores Your Work',
    description: 'Claude AI evaluates your content on 5 dimensions: relevance, originality, effort, engagement, and accuracy.',
    accent: 'var(--accent-text)',
  },
  {
    number: '04',
    title: 'Earn & Rise',
    description: 'Accumulate points with streak bonuses and quest multipliers. Climb the tiered leaderboard and claim rewards.',
    accent: 'var(--accent)',
  },
];

function useInView(ref: React.RefObject<HTMLElement | null>, once = true) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, once]);
  return inView;
}

export default function HowItWorks() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef);

  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div
          ref={headerRef}
          className="text-center mb-16 transition-all duration-700 ease-out"
          style={{
            opacity: headerInView ? 1 : 0,
            transform: headerInView ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <h2 className="font-display text-3xl md:text-5xl mb-4 text-text-primary font-semibold">
            How it works
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            A new way to engage with the Jito ecosystem. Create value, get recognized, earn rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, index }: { step: typeof steps[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${index * 150}ms`,
      }}
    >
      <NeonCard accent={step.accent} className="p-6 h-full">
        <span className="font-mono text-sm text-text-tertiary">{step.number}</span>
        <h3 className="text-lg font-semibold mb-2 text-text-primary mt-2 font-display">
          {step.title}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          {step.description}
        </p>
      </NeonCard>
    </div>
  );
}
