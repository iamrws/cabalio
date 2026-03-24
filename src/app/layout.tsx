import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/shared/Providers';

export const metadata: Metadata = {
  title: 'Jito Cabal | Community Engagement Platform',
  description:
    'The official engagement hub for Jito Cabal NFT holders. Submit content, earn points, climb the leaderboard, and claim rewards from the JitoSOL yield treasury.',
  keywords: ['Jito', 'Cabal', 'NFT', 'Solana', 'JitoSOL', 'Community', 'Engagement'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-bg-primary text-text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
