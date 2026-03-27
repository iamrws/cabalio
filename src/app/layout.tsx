import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/shared/Providers';

export const metadata: Metadata = {
  title: 'Jito Cabal | Community Engagement Platform',
  description:
    'The official engagement hub for Jito Cabal NFT holders. Submit content, earn points, climb the leaderboard, and claim rewards from the JitoSOL yield treasury.',
  keywords: ['Jito', 'Cabal', 'NFT', 'Solana', 'JitoSOL', 'Community', 'Engagement'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://cabal.jito.network'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Jito Cabal',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f2' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1917' },
  ],
  width: 'device-width',
  initialScale: 1,
};

/**
 * Theme initialization script.
 * Runs before React hydration to prevent flash of wrong theme.
 * Reads localStorage for manual override; otherwise follows system preference.
 * Adds `.dark` or `.light` class to <html> only when user has explicitly chosen.
 */
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (stored === 'light') {
      document.documentElement.classList.add('light');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-serif antialiased bg-surface-ground text-ink-primary">
        <Providers>
          {/* h-feed wrapper: microformat root for the content feed */}
          <div className="h-feed">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
