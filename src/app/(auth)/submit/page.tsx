'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import type { SubmissionType } from '@/lib/types';

type Tab = SubmissionType;

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'x_post', label: 'Jito Content', icon: '📢' },
  { id: 'blog', label: 'Blog Article', icon: '📝' },
  { id: 'art', label: 'Artwork', icon: '🎨' },
];

const placeholderByType: Record<Tab, string> = {
  x_post: 'Paste the post text or your thread summary (minimum 50 characters)',
  blog: 'Paste a meaningful excerpt or summary of the article (minimum 200 words)',
  art: 'Describe the artwork, inspiration, and process (minimum 50 characters)',
};

export default function SubmitPage() {
  const [activeTab, setActiveTab] = useState<Tab>('x_post');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [contentText, setContentText] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetAll = () => {
    setUrl('');
    setTitle('');
    setContentText('');
    setImagePath('');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          url: url || undefined,
          title,
          content_text: contentText,
          image_path: activeTab === 'art' ? imagePath : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit content');
      }

      setSuccess(data.message || 'Submission received and queued for review');
      resetAll();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex gap-2 p-1 bg-bg-secondary rounded-xl border border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setError('');
              setSuccess('');
            }}
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

      {success ? (
        <NeonCard glowColor="green" hover={false} className="p-4">
          <div className="text-sm text-neon-green">{success}</div>
        </NeonCard>
      ) : null}

      {error ? (
        <NeonCard hover={false} className="p-4 border border-red-500/30">
          <div className="text-sm text-red-400">{error}</div>
        </NeonCard>
      ) : null}

      <form onSubmit={handleSubmit}>
        <NeonCard hover={false} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Give your submission a clear title"
              required
              className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {activeTab === 'x_post' ? 'Post URL' : activeTab === 'blog' ? 'Blog URL' : 'Reference URL (Optional)'}
            </label>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={
                activeTab === 'x_post'
                  ? 'https://x.com/yourhandle/status/...'
                  : activeTab === 'blog'
                    ? 'https://your-blog-url.com/post'
                    : 'https://example.com/portfolio'
              }
              required={activeTab !== 'art'}
              className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-colors text-sm"
            />
          </div>

          {activeTab === 'art' ? (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Artwork Image Path</label>
              <input
                type="text"
                value={imagePath}
                onChange={(event) => setImagePath(event.target.value)}
                placeholder="/uploads/cabal-artwork.png"
                required
                className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-colors text-sm"
              />
              <p className="mt-1.5 text-xs text-text-muted">
                Storage upload integration is next phase. For now, provide stored image path.
              </p>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {activeTab === 'blog' ? 'Article Summary' : 'Content Description'}
            </label>
            <textarea
              value={contentText}
              onChange={(event) => setContentText(event.target.value)}
              placeholder={placeholderByType[activeTab]}
              required
              rows={6}
              className="w-full px-4 py-3 rounded-lg bg-bg-tertiary border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-colors text-sm resize-none"
            />
            <div className="mt-1 text-xs text-text-muted text-right">
              {contentText.length} characters
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full gradient-bg py-3.5 rounded-xl font-semibold text-white shadow-lg shadow-neon-cyan/20 hover:shadow-neon-cyan/40 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit For Review'}
          </motion.button>
        </NeonCard>
      </form>

      <NeonCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Review Pipeline</h3>
        <div className="space-y-2 text-sm text-text-secondary">
          <div>1. Submission enters moderation queue.</div>
          <div>2. Admin review approves, rejects, or flags content.</div>
          <div>3. Approved submissions are AI scored and points are credited to your ledger.</div>
          <div>4. Leaderboards update from approved submissions only.</div>
        </div>
      </NeonCard>
    </div>
  );
}
