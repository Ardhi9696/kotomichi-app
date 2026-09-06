import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import '../globals.css';
import { ThemeScript } from '@/app/theme-script';
import { ThemeProvider } from '@/app/theme-provider';
import { RouteProgress } from '@/components/route-progress';

export const metadata: Metadata = {
  title: 'Kotomichi — The Way of Words',
  description: 'SRS vocabulary learning for Japanese, the Kotomichi way.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <Suspense fallback={null}>
              <RouteProgress />
            </Suspense>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}