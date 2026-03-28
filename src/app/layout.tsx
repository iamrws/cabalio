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
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@200,300,400,500,600,700&f[]=satoshi@300,400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-bg-base text-text-primary">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
