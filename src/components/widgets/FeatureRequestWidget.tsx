'use client';

import { useCallback, useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MessageSquare, X } from 'lucide-react';

type FeedbackType = 'feature' | 'bug';
type SubmitState = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'success' } | { kind: 'error'; message: string };

const TITLE_MAX = 120;
const DESC_MAX = 2000;
const TITLE_MIN = 3;
const DESC_MIN = 10;

/**
 * Persistent floating feedback widget. Mounts once in the root layout and
 * appears on every route (landing, auth, dashboard, admin).
 *
 * Anonymous users can submit without a wallet; the server records session
 * info when available and falls back to an IP hash for spam triage.
 */
export default function FeatureRequestWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  // Reset transient state whenever the dialog closes so the next open starts fresh.
  useEffect(() => {
    if (!open) {
      // Delay slightly so the close animation can complete with the success message visible.
      const t = setTimeout(() => {
        setState({ kind: 'idle' });
        setTitle('');
        setDescription('');
        setEmail('');
        setType('feature');
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const canSubmit =
    title.trim().length >= TITLE_MIN &&
    title.trim().length <= TITLE_MAX &&
    description.trim().length >= DESC_MIN &&
    description.trim().length <= DESC_MAX &&
    state.kind !== 'submitting';

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSubmit) return;

      setState({ kind: 'submitting' });
      try {
        const response = await fetch('/api/feature-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            type,
            title: title.trim(),
            description: description.trim(),
            email: email.trim() || undefined,
          }),
        });

        if (!response.ok) {
          let message = 'Something went wrong. Please try again.';
          try {
            const data = await response.json();
            if (typeof data?.error === 'string') {
              message = data.error;
            } else if (response.status === 429) {
              message = 'Too many submissions. Please try again later.';
            }
          } catch {
            /* ignore parse errors */
          }
          setState({ kind: 'error', message });
          return;
        }

        setState({ kind: 'success' });
        setTitle('');
        setDescription('');
        setEmail('');
      } catch {
        setState({ kind: 'error', message: 'Network error. Please try again.' });
      }
    },
    [canSubmit, description, email, title, type]
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Send feedback"
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[500] group flex items-center gap-2 rounded-l-lg border border-r-0 border-accent-border bg-bg-surface/90 backdrop-blur px-2 py-3 text-accent-text shadow-[0_4px_20px_rgba(0,0,0,0.45)] transition-[background-color,color,transform] duration-200 hover:bg-accent-muted hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span
            className="text-[11px] font-semibold tracking-[0.18em] uppercase font-display"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Feedback
          </span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[600] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[601] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-default bg-bg-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(212,168,83,0.08)] focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-text-primary font-display">
                Send feedback
              </Dialog.Title>
              <p className="text-xs text-text-secondary mt-1">
                Spotted a bug or want to request a feature? Tell us.
              </p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {state.kind === 'success' ? (
            <div className="py-8 text-center">
              <div className="text-sm text-positive font-medium mb-2">Thanks — we got it.</div>
              <div className="text-xs text-text-secondary mb-4">
                Your feedback will land in the triage queue shortly.
              </div>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setState({ kind: 'idle' })}
                  className="rounded-lg bg-accent-muted border border-accent-border px-3 py-1.5 text-xs text-accent-text"
                >
                  Send another
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Close
                  </button>
                </Dialog.Close>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center gap-2">
                {(['feature', 'bug'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                      type === value
                        ? 'bg-accent-muted border-accent-border text-accent-text'
                        : 'bg-bg-raised border-border-subtle text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {value === 'feature' ? 'Feature request' : 'Bug report'}
                  </button>
                ))}
              </div>

              <label className="block text-xs text-text-muted">
                Title
                <input
                  required
                  maxLength={TITLE_MAX}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Short summary"
                  className="mt-1 w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-border focus:outline-none"
                />
                <span className="mt-1 block text-[10px] text-text-muted font-mono text-right">
                  {title.trim().length}/{TITLE_MAX}
                </span>
              </label>

              <label className="block text-xs text-text-muted">
                Description
                <textarea
                  required
                  maxLength={DESC_MAX}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder={
                    type === 'bug'
                      ? 'What happened? What did you expect? Steps to reproduce?'
                      : 'What would you like to see? Why would it matter?'
                  }
                  className="mt-1 w-full resize-y rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-border focus:outline-none"
                />
                <span className="mt-1 block text-[10px] text-text-muted font-mono text-right">
                  {description.trim().length}/{DESC_MAX}
                </span>
              </label>

              <label className="block text-xs text-text-muted">
                Email <span className="text-text-muted">(optional — if you&apos;d like a reply)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-border focus:outline-none"
                />
              </label>

              {state.kind === 'error' ? (
                <div className="rounded-lg border border-negative-border bg-negative-muted px-3 py-2 text-xs text-negative">
                  {state.message}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-lg bg-accent-muted border border-accent-border px-4 py-2 text-xs font-medium text-accent-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/20 transition-colors"
                >
                  {state.kind === 'submitting' ? 'Sending...' : 'Send feedback'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
