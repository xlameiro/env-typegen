import { ThemeProvider } from "@/components/theme-provider";
import {
  APP_DESCRIPTION,
  APP_LOCALE,
  APP_NAME,
  LINKEDIN_URL,
  SITE_URL,
} from "@/lib/constants";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: `${APP_NAME} — type-safe environment contracts for TypeScript teams`,
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/*
         * Runs before hydration and keeps dark-mode selection stable on first paint.
         * Loaded as a first-party static file so CSP can avoid relying on inline scripts.
         */}
        <Script src="/anti-fouc.js" strategy="beforeInteractive" />
        <a
          href="#maincontent"
          className="sr-only absolute left-4 top-4 z-100 rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Skip to main content
        </a>
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
