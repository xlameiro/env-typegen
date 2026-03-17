import { ThemeProvider } from "@/components/theme-provider";
import { ANTI_FOUC_SCRIPT } from "@/lib/anti-fouc-script";
import {
  APP_DESCRIPTION,
  APP_LOCALE,
  APP_NAME,
  LINKEDIN_URL,
  SITE_URL,
} from "@/lib/constants";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
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
  applicationName: APP_NAME,
  description: APP_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  keywords: [
    "env-typegen",
    "env validation",
    "config drift detection",
    "environment governance",
    "TypeScript",
    "environment variables",
    ".env",
    "Zod",
    "t3-env",
    "code generation",
    "CLI",
    "Node.js",
  ],
  authors: [{ name: "Xabier Lameiro", url: LINKEDIN_URL }],
  creator: "Xabier Lameiro",
  category: "developer tools",
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
    // Hardcoded for single-locale apps. For multi-locale (Tier 2/3 i18n),
    // move to app/[locale]/layout.tsx and derive from params.locale.
    locale: "en_US",
    url: SITE_URL,
    siteName: APP_NAME,
    images: [
      { url: "/opengraph-image", width: 1200, height: 630, alt: APP_NAME },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
    creator: "@xlameiro",
    site: "@xlameiro",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
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
  githubStars,
}: Readonly<{
  children: ReactNode;
  githubStars: ReactNode;
}>) {
  return (
    <html lang={APP_LOCALE} suppressHydrationWarning>
      <head>
        {/*
         * Apply the dark class before first paint to prevent a flash of the light
         * theme for users who have manually selected dark mode via ThemeToggle.
         * Script content lives in lib/anti-fouc-script.ts — its sha256 hash is
         * allow-listed in proxy.ts script-src, so no per-request nonce is needed.
         * This keeps the root layout synchronous, which is required for PPR.
         */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NuqsAdapter>
          {/*
           * Disable fumadocs' built-in next-themes wrapper so it does not fight
           * our Zustand ThemeProvider over the html.dark class. Our ThemeProvider
           * (components/theme-provider.tsx) is the single source of truth for the
           * dark mode class. The fumadocs ThemeToggle is replaced with our own
           * ThemeToggle component (passed via themeSwitch.component in the docs layout).
           */}
          <RootProvider theme={{ enabled: false }}>
            <ThemeProvider>
              {children}
              {githubStars}
            </ThemeProvider>
          </RootProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
