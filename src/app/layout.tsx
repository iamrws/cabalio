import type { Metadata, Viewport } from 'next';
import './globals.css';
import FeatureRequestMount from '@/components/widgets/FeatureRequestMount';

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
  themeColor: '#08080a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* Preload critical fonts — self-hosted, no external origin */}
        <link rel="preload" href="/fonts/clash-display-600.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/satoshi-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/satoshi-600.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased bg-bg-base text-text-primary">
        {children}
        <FeatureRequestMount />
      </body>
    </html>
  );
}
