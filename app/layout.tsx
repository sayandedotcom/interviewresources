import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { siteConfig } from "@/site";

import { Analytics } from "@/components/analytics";
import { CookieConsentBanner } from "@/components/cookie-consent";

import { organizationJsonLd, webApplicationJsonLd } from "@/lib/seo/json-ld";
import { siteTitle } from "@/lib/seo/metadata";

import { ToastProvider } from "@/hooks/use-toast";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Site-wide defaults only. Note the absence of `alternates.canonical` and
 * `openGraph.url`: metadata is inherited, so setting either here would point
 * every child route's canonical at the homepage and de-index the whole site.
 * Per-page canonicals come from `buildMetadata` in lib/seo/metadata.ts.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteTitle,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.copy.metaDescription,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteTitle,
    description: siteConfig.copy.metaDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteConfig.copy.metaDescription,
    creator: siteConfig.copy.twitterCreator,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground flex min-h-full flex-col`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([webApplicationJsonLd, organizationJsonLd]),
          }}
        />
        <ToastProvider>
          {children}
          <Analytics />
          <CookieConsentBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
