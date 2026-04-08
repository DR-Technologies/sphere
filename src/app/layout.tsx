import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sphere | Insights to Reports",
  description: "Transform your data into beautiful visual reports instantly.",
};

import { LanguageProvider } from '@/lib/i18n/LanguageContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="dark">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
