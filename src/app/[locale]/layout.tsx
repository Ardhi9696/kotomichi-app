import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import '../globals.css';
import { themeScript } from '@/app/theme-script';

export const metadata: Metadata = {
  title: 'Kotomichi — The Way of Words',
  description: 'SRS vocabulary learning for Japanese, the Kotomichi way.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh">
        {themeScript()}
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}