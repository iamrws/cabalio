import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

// L7: Validate required env vars at module load time (startup).
// Log a warning instead of crashing so the fallback path still works.
if (!process.env.YOUTUBE_API_KEY) {
  console.warn(
    '[game/shorts] YOUTUBE_API_KEY is not set. The shorts endpoint will serve fallback content only.'
  );
}

const YOUTUBE_API_BASE = 'https://youtube.googleapis.com/youtube/v3';
const EXTERNAL_API_TIMEOUT_MS = 10_000; // 10 seconds

// Search queries that produce a good mix of AI-generated and real content
const SEARCH_QUERIES = [
  'AI generated video',
  'AI art animation',
  'sora AI video',
  'midjourney art',
  'stable diffusion video',
  'runway gen 3',
  'real life satisfying',
  'nature shorts',
  'street photography',
  'wildlife caught on camera',
  'timelapse city',
  'drone footage',
  'CGI short film',
  'unreal engine 5 short',
  'digital art process',
];

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default: { url: string };
    };
    publishedAt: string;
  };
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default: { url: string };
    };
    publishedAt: string;
    description: string;
    tags?: string[];
  };
  contentDetails: {
    duration: string;
  };
  statistics?: {
    viewCount: string;
    likeCount?: string;
  };
}

export interface YouTubeShort {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
}

// In-memory cache (persists across requests in the same server process)
let cachedShorts: YouTubeShort[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

// Generate a YouTube thumbnail URL from a video ID.
// YouTube always serves these deterministic URLs for any public video.
function ytThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

const FALLBACK_SHORTS: YouTubeShort[] = [
  { videoId: 'dQw4w9WgXcQ', title: 'Classic viral video', channelTitle: 'RickAstley', thumbnailUrl: ytThumbnail('dQw4w9WgXcQ'), publishedAt: '2009-10-25T00:00:00Z', viewCount: 1500000000 },
  { videoId: 'kJQP7kiw5Fk', title: 'Despacito', channelTitle: 'LuisFonsiVEVO', thumbnailUrl: ytThumbnail('kJQP7kiw5Fk'), publishedAt: '2017-01-12T00:00:00Z', viewCount: 8000000000 },
];

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || '0') * 3600) +
         (parseInt(match[2] || '0') * 60) +
         parseInt(match[3] || '0');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchYouTubeShorts(apiKey: string): Promise<YouTubeShort[]> {
  const results = new Map<string, YouTubeShort>();

  // Pick 3 random queries to stay within quota (each search = 100 units)
  const queries = shuffle(SEARCH_QUERIES).slice(0, 3);

  for (const query of queries) {
    try {
      // Step 1: Search for short videos
      const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', `${query} #shorts`);
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('videoDuration', 'short');
      searchUrl.searchParams.set('maxResults', '15');
      searchUrl.searchParams.set('order', 'viewCount');
      searchUrl.searchParams.set('key', apiKey);

      const searchRes = await fetch(searchUrl.toString(), {
        signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      });
      if (!searchRes.ok) continue;

      const searchData = await searchRes.json() as { items: YouTubeSearchItem[] };
      const videoIds = searchData.items.map(item => item.id.videoId).filter(Boolean);

      if (videoIds.length === 0) continue;

      // Step 2: Get video details to filter by duration
      const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
      detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
      detailsUrl.searchParams.set('id', videoIds.join(','));
      detailsUrl.searchParams.set('key', apiKey);

      const detailsRes = await fetch(detailsUrl.toString(), {
        signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
      });
      if (!detailsRes.ok) continue;

      const detailsData = await detailsRes.json() as { items: YouTubeVideoItem[] };

      for (const video of detailsData.items) {
        const duration = parseDuration(video.contentDetails.duration);
        // Only include actual Shorts (under 60 seconds)
        if (duration > 0 && duration <= 60) {
          results.set(video.id, {
            videoId: video.id,
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            thumbnailUrl: video.snippet.thumbnails.high?.url ||
                          video.snippet.thumbnails.medium?.url ||
                          video.snippet.thumbnails.default.url,
            publishedAt: video.snippet.publishedAt,
            viewCount: parseInt(video.statistics?.viewCount || '0'),
          });
        }
      }
    } catch (e) {
      console.error(`YouTube search failed for "${query}":`, e);
    }
  }

  return shuffle(Array.from(results.values()));
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;

    // Check cache first
    if (cachedShorts.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
      // Return a shuffled subset from cache
      return NextResponse.json({
        shorts: shuffle(cachedShorts).slice(0, 10),
        cached: true,
        total: cachedShorts.length,
      });
    }

    if (!apiKey) {
      // Return fallback shorts when no API key
      return NextResponse.json({
        shorts: FALLBACK_SHORTS,
        cached: false,
        fallback: true,
        total: FALLBACK_SHORTS.length,
      });
    }

    const shorts = await fetchYouTubeShorts(apiKey);

    if (shorts.length > 0) {
      cachedShorts = shorts;
      cacheTimestamp = Date.now();
    }

    return NextResponse.json({
      shorts: shorts.slice(0, 10),
      cached: false,
      total: shorts.length,
    });
  } catch (error) {
    console.error('Game shorts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shorts', shorts: FALLBACK_SHORTS },
      { status: 500 }
    );
  }
}
