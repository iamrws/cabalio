'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useSubmitDrawer } from './SubmitDrawerProvider';
import { MAX_IMAGE_SIZE_MB } from '@/lib/constants';
import type { SubmissionType } from '@/lib/types';

type Tab = SubmissionType;

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'x_post', label: 'Jito Content', icon: 'X' },
  { id: 'blog', label: 'Blog Article', icon: 'B' },
  { id: 'art', label: 'Artwork', icon: 'A' },
];

const placeholderByType: Record<Tab, string> = {
  x_post: 'Paste the post text or your thread summary (minimum 50 characters)',
  blog: 'Paste a meaningful excerpt or summary of the article (minimum 200 words)',
  art: 'Describe the artwork, inspiration, and process (minimum 50 characters)',
};

export default function SubmitDrawer() {
  const { isOpen, close } = useSubmitDrawer();
  const [activeTab, setActiveTab] = useState<Tab>('x_post');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [contentText, setContentText] = useState('');
  const [artFile, setArtFile] = useState<File | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const resetAll = useCallback(() => {
    setUrl('');
    setTitle('');
    setContentText('');
    setArtFile(null);
    setUploadedImagePath('');
    setError('');
    setSuccess('');
  }, []);

  const uploadArtworkImage = async (): Promise<string> => {
    if (!artFile) throw new Error('Please upload an artwork image');
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', artFile);
      const res = await fetch('/api/uploads/image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image upload failed');
      if (!data.image_path) throw new Error('No image path returned');
      setUploadedImagePath(data.image_path);
      return data.image_path as string;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const imagePath = activeTab === 'art' ? await uploadArtworkImage() : undefined;
      const res = await fetch('/api/submissions', {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit content');
      setSuccess(data.message || 'Submission received and queued for review!');
      resetAll();
      setTimeout(() => { setSuccess(''); close(); }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full lg:max-w-lg max-h-[85vh] overflow-y-auto bg-bg-surface border border-border-default rounded-t-2xl lg:rounded-2xl shadow-[var(--shadow-2xl)]">
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-display font-semibold text-text-primary tracking-tight">Submit Content</h2>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-raised active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] transition-[color,background-color,transform] duration-150"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex gap-2 p-1 bg-bg-base rounded-xl border border-border-subtle">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); if (tab.id !== 'art') { setArtFile(null); setUploadedImagePath(''); } }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-[color,background-color,border-color] duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  activeTab === tab.id
                    ? 'bg-bg-raised text-accent-text border border-accent-border'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {success ? (
          <div className="mx-5 mt-3 p-3 rounded-lg bg-positive-muted border border-positive-border text-sm text-positive">{success}</div>
        ) : null}
        {error ? (
          <div className="mx-5 mt-3 p-3 rounded-lg bg-negative-muted border border-negative-border text-sm text-negative">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your submission a clear title"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-bg-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent/50 focus-visible:ring-1 focus-visible:ring-accent/20 transition-[border-color] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {activeTab === 'x_post' ? 'Post URL' : activeTab === 'blog' ? 'Blog URL' : 'Reference URL (Optional)'}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                activeTab === 'x_post'
                  ? 'https://x.com/yourhandle/status/...'
                  : activeTab === 'blog'
                    ? 'https://your-blog-url.com/post'
                    : 'https://example.com/portfolio'
              }
              required={activeTab !== 'art'}
              className="w-full px-3 py-2.5 rounded-lg bg-bg-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent/50 focus-visible:ring-1 focus-visible:ring-accent/20 transition-[border-color] text-sm"
            />
          </div>

          {activeTab === 'art' ? (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Artwork Image</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(e) => { setArtFile(e.target.files?.[0] || null); setUploadedImagePath(''); }}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-bg-raised border border-border-subtle text-text-primary text-sm"
              />
              <p className="mt-1 text-xs text-text-muted">Max: {MAX_IMAGE_SIZE_MB}MB</p>
              {artFile ? <p className="mt-1 text-xs text-text-secondary">Selected: {artFile.name}</p> : null}
              {uploadedImagePath ? <p className="mt-1 text-xs text-positive">Uploaded</p> : null}
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {activeTab === 'blog' ? 'Article Summary' : 'Content Description'}
            </label>
            <textarea
              maxLength={5000}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder={placeholderByType[activeTab]}
              required
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg bg-bg-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent/50 focus-visible:ring-1 focus-visible:ring-accent/20 transition-[border-color] text-sm resize-none"
            />
            <div className="mt-1 text-xs text-text-muted text-right">{contentText.length}/5000</div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent py-3 rounded-[var(--radius-sm)] font-semibold text-[var(--bg-base)] hover:bg-accent-dim active:scale-[0.99] transition-[color,background-color,transform,box-shadow] duration-150 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {isUploadingImage ? 'Uploading...' : isSubmitting ? 'Submitting...' : 'Submit For Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
