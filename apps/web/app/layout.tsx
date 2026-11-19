import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fulad/ui-tokens/tokens.css';
import './globals.css';

export const metadata: Metadata = { title: 'فولاد' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
