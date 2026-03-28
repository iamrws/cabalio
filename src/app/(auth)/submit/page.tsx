'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
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

export default function SubmitPage() {
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

  const resetAll = () => {
    setUrl('');
    setTitle('');
    setContentText('');
    setArtFile(null);
    setUploadedImagePath('');
    setError('');
  };

  const uploadArtworkImage = async (): Promise<string> => {
    if (!artFile) {
      throw new Error('Please upload an artwork image');
    }

    setIsUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', artFile);

      const uploadResponse = await fetch('/api/uploads/image', {
        method: 'POST',
        body: uploadFormData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Image upload failed');
      }
      if (!uploadData.image_path) {
        throw new Error('Image upload completed but no image path was returned');
      }

      setUploadedImagePath(uploadData.image_path);
      return uploadData.image_path as string;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const imagePath = activeTab === 'art' ? await uploadArtworkImage() : undefined;
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
      <div className="flex gap-2 p-1 bg-bg-surface rounded-xl border border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setError('');
              setSuccess('');
              if (tab.id !== 'art') {
                setArtFile(null);
                setUploadedImagePath('');
              }
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-bg-raised text-accent-text border border-accent-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {success ? (
        <NeonCard hover={false} className="p-4">
          <div className="text-sm text-positive">{success}</div>
        </NeonCard>
      ) : null}

      {error ? (
        <NeonCard hover={false} className="p-4 border border-negative-border">
          <div className="text-sm text-negative">{error}</div>
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
              className="w-full px-4 py-3 rounded-lg bg-bg-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm"
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
              className="w-full px-4 py-3 rounded-lg bg-bg-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm"
            />
          </div>

          {activeTab === 'art' ? (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Artwork Image</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(event) => {
                  setArtFile(event.target.files?.[0] || null);
                  setUploadedImagePath('');
                }}
                required
                className="w-full px-4 py-3 rounded-lg bg-bg-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm"
              />
              <p className="mt-1.5 text-xs text-text-muted">
                Max file size: {MAX_IMAGE_SIZE_MB}MB. Image is scanned for suspicious scam or malware payloads before storage.
              </p>
              {artFile ? (
                <p className="mt-1.5 text-xs text-text-secondary">
                  Selected: {artFile.name} ({(artFile.size / 1024).toFixed(1)} KB)
                </p>
              ) : null}
              {uploadedImagePath ? (
                <p className="mt-1.5 text-xs text-positive">Uploaded to: {uploadedImagePath}</p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {activeTab === 'blog' ? 'Article Summary' : 'Content Description'}
            </label>
            <textarea
              id="content-text"
              aria-describedby="content-char-count"
              maxLength={5000}
              value={contentText}
              onChange={(event) => setContentText(event.target.value)}
              placeholder={placeholderByType[activeTab]}
              required
              rows={6}
              className="w-full px-4 py-3 rounded-lg bg-bg-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm resize-none"
            />
            <div id="content-char-count" className="mt-1 text-xs text-text-muted text-right">{contentText.length}/5000 characters</div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent py-3.5 rounded-[var(--radius-sm)] font-semibold text-[#08080a] hover:bg-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploadingImage ? 'Scanning & Uploading Image...' : isSubmitting ? 'Submitting...' : 'Submit For Review'}
          </motion.button>
        </NeonCard>
      </form>

      <NeonCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3 font-display">Review Pipeline</h3>
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
