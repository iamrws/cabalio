'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'x_post' | 'blog' | 'art';
  title: string;
  content_text: string;
  points_awarded: number;
  normalized_score: number | null;
  created_at: string;
  wallet_address: string;
  users?: { display_name: string | null } | null;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

const TYPE_FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'x_post' as const, label: 'X Posts' },
  { value: 'blog' as const, label: 'Blog' },
  { value: 'art' as const, label: 'Art' },
] as const;

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  x_post: { label: 'X Post', color: 'text-accent-text' },
  blog: { label: 'Blog', color: 'text-[var(--positive)]' },
  art: { label: 'Art', color: 'text-[var(--caution)]' },
};

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'x_post' | 'blog' | 'art' | undefined>(undefined);
  const [sort, setSort] = useState<'recent' | 'top'>('recent');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string, type: typeof typeFilter, sortBy: typeof sort) => {
      if (searchQuery.length < 2) {
        setResults([]);
        setTotal(0);
        setIsOpen(false);
        setHasSearched(false);
        return;
      }

      // Cancel any in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setIsOpen(true);
      try {
        const params = new URLSearchParams({ q: searchQuery, sort: sortBy, limit: '20' });
        if (type) params.set('type', type);

        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('Search failed');
        }

        const data: SearchResponse = await res.json();
        setResults(data.results);
        setTotal(data.total);
        setHasSearched(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Search error:', err);
        setResults([]);
        setTotal(0);
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query, typeFilter, sort);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, typeFilter, sort, performSearch]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          placeholder="Search submissions..."
          className="w-full pl-10 pr-4 py-2.5 bg-bg-raised border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-border transition-colors"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-accent-border border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Filter Pills & Sort */}
      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setTypeFilter(filter.value)}
              className={`px-3 py-1 text-xs rounded-sm border transition-colors ${
                typeFilter === filter.value
                  ? 'bg-accent-muted border-accent-border text-accent-text'
                  : 'bg-bg-raised border-border-subtle text-text-secondary hover:border-text-muted'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {(['recent', 'top'] as const).map((sortOption) => (
            <button
              key={sortOption}
              type="button"
              onClick={() => setSort(sortOption)}
              className={`px-3 py-1 text-xs rounded-sm border transition-colors ${
                sort === sortOption
                  ? 'bg-accent-muted border-accent-border text-accent-text'
                  : 'bg-bg-raised border-border-subtle text-text-secondary hover:border-text-muted'
              }`}
            >
              {sortOption === 'recent' ? 'Recent' : 'Top'}
            </button>
          ))}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-bg-surface border border-border-default rounded-lg shadow-lg max-h-96 overflow-auto">
          {loading && results.length === 0 && (
            <div className="p-6 text-center">
              <div className="w-5 h-5 border-2 border-accent-border border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs text-text-muted mt-2">Searching...</div>
            </div>
          )}

          {hasSearched && !loading && results.length === 0 && (
            <div className="p-6 text-center">
              <div className="text-sm text-text-muted">No results found for &ldquo;{query}&rdquo;</div>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs text-text-muted border-b border-border-subtle">
                {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
              </div>
              {results.map((result) => {
                const badge = TYPE_BADGES[result.type] || { label: result.type, color: 'text-text-secondary' };
                return (
                  <div
                    key={result.id}
                    className="px-4 py-3 hover:bg-bg-raised border-b border-border-subtle last:border-b-0 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {result.title}
                      </div>
                      <span className={`text-xs font-mono shrink-0 ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {result.content_text}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-text-muted">
                        {result.users?.display_name || result.wallet_address.slice(0, 8) + '...'}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-accent-text">
                          {result.points_awarded} pts
                        </span>
                        <span className="text-xs font-mono text-text-muted">
                          {new Date(result.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
