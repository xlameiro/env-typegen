import { SkipLink } from "@/components/skip-link";
import { ThemeProvider } from "@/components/theme-provider";
import { ANTI_FOUC_SCRIPT } from "@/lib/anti-fouc-script";
import {
  APP_DESCRIPTION,
  APP_LOCALE,
  APP_NAME,
  SITE_URL,
} from "@/lib/constants";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: APP_NAME,
  },
  description: APP_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
    // Hardcoded for single-locale apps. For multi-locale (Tier 2/3 i18n),
    // move to app/[locale]/layout.tsx and derive from params.locale.
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

// When changing the app locale, update APP_LOCALE in lib/constants.ts.
// global-error.tsx also renders its own html tag and reads APP_LOCALE independently.
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang={APP_LOCALE} suppressHydrationWarning>
      {/*
       * Apply the dark class before first paint to prevent a flash of the light
       * theme for users who have manually selected dark mode via ThemeToggle.
       * Script content lives in lib/anti-fouc-script.ts — its sha256 hash is
       * allow-listed in proxy.ts script-src, so no per-request nonce is needed.
       * This keeps the root layout synchronous, which is required for PPR.
       */}
      <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }} />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkipLink />
        <NuqsAdapter>
          <ThemeProvider>{children}</ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
