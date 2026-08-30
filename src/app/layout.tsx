import type { Metadata } from "next";
import { cookies } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { ThemeProvider, type SphereTheme } from '@/lib/theme/ThemeContext';

export const metadata: Metadata = {
  title: "Sphere | Insights to Reports",
  description: "Transform your data into beautiful visual reports instantly.",
  icons: {
    icon: [{ url: '/brand/favicon.png', type: 'image/png', sizes: '95x95' }],
    shortcut: '/brand/favicon.png'
  }
};

import { LanguageProvider } from '@/lib/i18n/LanguageContext';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get('sphere_theme')?.value;
  const initialTheme: SphereTheme = cookieTheme === 'light' || cookieTheme === 'dark' ? cookieTheme : 'dark';

  return (
    <html lang="en" className={initialTheme}>
      <body className={`${GeistSans.className} ${GeistSans.variable} ${GeistMono.variable}`}>
        <LanguageProvider>
          <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
