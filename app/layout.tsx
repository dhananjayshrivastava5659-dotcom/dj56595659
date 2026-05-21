import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'iEvent – ICICI Bank Event Management',
  description: 'Enterprise event management platform for ICICI Bank premium banking events.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
