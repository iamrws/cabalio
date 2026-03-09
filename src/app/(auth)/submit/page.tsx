'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import type { SubmissionType, ScoringBreakdown } from '@/lib/types';

type Tab = SubmissionType;

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'x_post', label: 'Jito Content', icon: '📢' },
  { id: 'blog', label: 'Blog Article', icon: '📝' },
  { id: 'art', label: 'Artwork', icon: '🎨' },
];

const scoreDimensions = [
  { key: 'relevance', label: 'Relevance', weight: '30%' },
  { key: 'originality', label: 'Originality', weight: '25%' },
  { key: 'effort', label: 'Effort', weight: '20%' },
  { key: 'engagement_potential', label: 'Engagement', weight: '15%' },
  { key: 'accuracy', label: 'Accuracy', weight: '10%' },
];

export default function SubmitPage() {
  const [activeTab, setActiveTab] = useState<Tab>('x_post');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState<ScoringBreakdown | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Simulate API call for now
    setTimeout(() => {
      setScore({
        relevance: { score: 8, rationale: 'Directly discusses JitoSOL staking mechanics and MEV infrastructure.' },
        originality: { score: 7, rationale: 'Provides personal analysis with some unique insights on yield comparison.' },
        effort: { score: 8, rationale: 'Well-structured thread with data points and detailed explanations.' },
        engagement_potential: { score: 7, rationale: 'Educational content that would interest DeFi-focused community members.' },
        accuracy: { score: 9, rationale: 'Technical claims about JitoSOL yields and MEV tips are accurate.' },
        weighted_total: 7.75,
        summary: 'A solid, well-researched thread about JitoSOL with accurate technical details and good educational value.',
      });
      setIsSubmitting(false);
    }, 2000);
  };

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setDescription('');
    setScore(null);
    setError('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Tab selector */}
      <div className="flex gap-2 p-1 bg-bg-secondary rounded-xl border border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); resetForm(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-bg-tertiary text-neon-cyan border border-neon-cyan/20'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Score result */}
      <AnimatePresence>
        {score && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <NeonCard glowColor="green" className="p-6">
              <div className="text-center mb-6">
                <div className="text-5xl font-mono font-bold text-neon-green mb-2">
                  {(score.weighted_total * 10).toFixed(0)}
                </div>
                <div className="text-sm text-text-secondary">{score.summary}</div>
              </div>

              <div className="space-y-3">
                {scoreDimensions.map((dim) => {
                  const dimScore = score[dim.key as keyof ScoringBreakdown] as { score: number; rationale: string };
                  if (!dimScore || typeof dimScore === 'number' || typeof dimScore === 'string') return null;
                  return (
                    <div key={dim.key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">{dim.label}</span>
                          <span className="text-xs text-text-muted font-mono">({dim.weight})</span>
                        </div>
                        <span className={`font-mono font-bold ${
                          dimScore.score >= 8 ? 'text-neon-green' :
                          dimScore.score >= 6 ? 'text-neon-cyan' :
                          'text-neon-orange'
                        }`}>
                          {dimScore.score}/10
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full bg-bg-tertiary mb-1">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${dimScore.score * 10}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            dimScore.score >= 8 ? 'bg-neon-green' :
                            dimScore.score >= 6 ? 'bg-neon-cyan' :
                            'bg-neon-orange'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-text-muted">{dimScore.rationale}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Points earned: <span className="font-mono font-bold text-neon-cyan">{Math.round(score.weighted_total * 10)}</span>
                </div>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors text-sm"
                >
                  Submit Another
                </button>
              </div>
            </NeonCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission form */}
      {!score && (
        <form onSubmit={handleSubmit}>
          <NeonCard hover={false} className="p-6 space-y-5">
            {/* Jito Content form */}
            {activeTab === 'x_post' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Content URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://x.com/yourhandle/status/..."
                    required
                    className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-colors font-mono text-sm"
                  />
                  <p className="mt-1.5 text-xs text-text-muted">
                    Link to your Jito-related content
                  </p>
                </div>

                {/* Preview placeholder */}
                {url && (
                  <div className="rounded-lg bg-bg-tertiary border border-border-subtle p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-bg-elevated" />
                      <div className="h-3 w-20 rounded bg-bg-elevated" />
                    </div>
                    <div className="text-sm text-text-muted">Post preview will appear here after fetching...</div>
                  </div>
                )}
              </>
            )}

            {/* Blog form */}
            {activeTab === 'blog' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Blog URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://medium.com/your-article or any blog URL"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-colors text-sm"
                  />
                  <p className="mt-1.5 text-xs text-text-muted">
                    Article must be at least 200 words
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's your article about?"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-colors text-sm"
                  />
                </div>
              </>
            )}

            {/* Art form */}
            {activeTab === 'art' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Upload Artwork
                  </label>
                  <div className="border-2 border-dashed border-border-subtle rounded-xl p-8 text-center hover:border-neon-cyan/30 transition-colors cursor-pointer">
                    <div className="text-4xl mb-3">🖼️</div>
                    <div className="text-sm text-text-secondary mb-1">
                      Drag and drop your image here, or click to browse
                    </div>
                    <div className="text-xs text-text-muted">
                      JPEG, PNG, WebP — Max 5MB
                    </div>
                    <input type="file" accept="image/*" className="hidden" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Name your artwork"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your artwork, the inspiration, and techniques used (min 50 characters)"
                    required
                    minLength={50}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-colors text-sm resize-none"
                  />
                  <div className="mt-1 text-xs text-text-muted text-right">
                    {description.length}/50 characters minimum
                  </div>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full gradient-bg py-3.5 rounded-xl font-semibold text-white shadow-lg shadow-neon-cyan/20 hover:shadow-neon-cyan/40 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Scoring with AI...
                </span>
              ) : (
                'Submit & Score'
              )}
            </motion.button>
          </NeonCard>
        </form>
      )}

      {/* Guidelines */}
      <NeonCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Scoring Guidelines</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {scoreDimensions.map((dim) => (
            <div key={dim.key} className="flex items-start gap-2">
              <span className="text-neon-cyan font-mono text-xs mt-0.5">{dim.weight}</span>
              <div>
                <div className="text-sm text-text-primary font-medium">{dim.label}</div>
                <div className="text-xs text-text-muted">
                  {dim.key === 'relevance' && 'Is it about Jito, Solana, MEV, or staking?'}
                  {dim.key === 'originality' && 'Unique take vs. reworded content'}
                  {dim.key === 'effort' && 'Depth and substance of the work'}
                  {dim.key === 'engagement_potential' && 'Would the community engage with this?'}
                  {dim.key === 'accuracy' && 'Are the facts and claims correct?'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </NeonCard>
    </div>
  );
}
