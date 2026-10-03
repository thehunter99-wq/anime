import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import Link from "next/link";
import DisclaimerModal from "@/components/disclaimer-modal";
import { AdSlot, NativeBannerAd } from "@/components/ads";
import AdUnderlays from "@/components/ad-underlays";
import AdConfigDiagnostic from "@/components/ad-config-diagnostic";
import { AdBlockDetector } from "@/components/adblock-detector";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PreconnectOrigins, PrefetchLinks } from "@/components/prefetch-links";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

/**
 * GA4 measurement ID. Overridable so the property can be swapped without a code
 * change — set NEXT_PUBLIC_GA_MEASUREMENT_ID in .env.local and in the
 * deployment provider's env settings.
 */
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-7S0357K6TW";

const SITE_DESCRIPTION =
  "Your one-stop platform for streaming the latest anime, reading popular manga, and watching movies. All for free, with sub and dub options available. Content embedded from third-party servers.";

/**
 * Default site title / share title. Reads as "<name> - <tagline>" so the brand
 * promise appears in the SERP and on shared links, not only inside the page.
 */
const SITE_TITLE = `${SITE_NAME} - ${SITE_TAGLINE}`;

/**
 * Fallback share image for routes that do not provide their own artwork
 * (homepage, Indian rails, static pages). Media view pages override this via
 * buildMediaMetadata with a real 1280x720 poster.
 */
const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/og-default.png`,
  width: 1200,
  height: 630,
  alt: SITE_TITLE,
};

/**
 * DMCA & Compliance meta tags for search engines and copyright agents.
 */
const DMCA_META = {
  'dcterms.rightsHolder': SITE_NAME,
  'dcterms.accessRights': 'Free access; content embedded from third-party providers',
  'dcterms.license': `${SITE_URL}/terms`,
  'dc.publisher': SITE_NAME,
  'dc.rights': `Copyright © ${new Date().getFullYear()} ${SITE_NAME}. All media embedded from third-party sources. DMCA: ${SITE_URL}/dmca`,
  'og:site_name': SITE_NAME,
} as const;

/**
 * Structured Data: WebSite with SearchAction for sitelinks searchbox
 */
const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/?query={search_term_string}&tab={tab}`,
    },
    queryInput: {
      "@type": "PropertyValueSpecification",
      valueRequired: true,
      valueName: "search_term_string",
    },
  },
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
    },
    sameAs: [
      "https://github.com/parthakashyap",
      "https://linkedin.com/in/partha-pratim-kashyap",
      "https://instagram.com/partha_kashyap__",
    ],
  },
};

export const metadata: Metadata = {
  title: {
    template: `%s | ${SITE_NAME}`,
    default: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  /**
   * No `icons` override: `src/app/favicon.ico` is the file-based convention
   * and Next.js serves it automatically. Pointing `icons` at `/logo.png` was
   * tried and removed because that file does not exist, which would have shipped
   * a second, permanently-404ing icon link next to the real one.
   */
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
  other: {
    // Rendered by Next into <head> itself. Using an explicit <head> tag in an
    // App Router root layout fights the router's own head management and is a
    // known source of hydration mismatches.
    "script:ld+json": JSON.stringify([
      // WebApplication schema
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "EntertainmentApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        creator: {
          "@type": "Person",
          "@id": "https://parthakashyap.com/#person",
          name: "Partha Pratim Kashyap",
          alternateName: [
            "Partha",
            "Partha Pratim",
            "Partha Kashyap",
            "Pratim Kashyap",
          ],
          jobTitle: "Web and Mobile Application Developer",
          email: "parthakashyal@gmail.com",
          url: "https://parthakashyap.com",
          sameAs: [
            "https://linkedin.com/in/partha-pratim-kashyap",
            "https://github.com/parthakashyap",
            "https://instagram.com/partha_kashyap__",
          ],
        },
      },
      // WebSite schema with SearchAction
      WEBSITE_SCHEMA,
      // Organization schema
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        sameAs: [
          "https://github.com/parthakashyap",
          "https://linkedin.com/in/partha-pratim-kashyap",
          "https://instagram.com/partha_kashyap__",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+1-000-000-0000",
          contactType: "customer service",
          availableLanguage: ["English", "Hindi"],
        },
      },
    ]),
    // DMCA & Compliance meta tags
    ...DMCA_META,
  },
};

function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-background text-sm text-muted-foreground">
      <div className="container mx-auto flex flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
          <p>
            &copy; {new Date().getFullYear()} {SITE_NAME}. All Rights Reserved.
          </p>
          <p className="max-w-md text-xs">
            All media content is provided by third-party services. {SITE_NAME} does
            not claim ownership of any anime, movies, TV shows, or manga linked
            or embedded on this site.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 text-center md:items-end md:text-right">
          <nav className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2">
            <Link href="/genre" className="hover:text-primary transition-colors">
              Genres
            </Link>
            <Link href="/dub" className="hover:text-primary transition-colors">
              Dubbed
            </Link>
            <Link href="/sub" className="hover:text-primary transition-colors">
              Subbed
            </Link>
            <Link
              href="/disclaimer"
              className="hover:text-primary transition-colors"
            >
              Disclaimer
            </Link>
            <Link href="/dmca" className="hover:text-primary transition-colors font-medium">
              DMCA Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-primary transition-colors"
            >
              Terms of Use
            </Link>
            <Link
              href="/privacy"
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/contact"
              className="hover:text-primary transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/diagnostics"
              className="hover:text-primary transition-colors"
            >
              System Status
            </Link>
          </nav>

          <div className="flex flex-col items-center md:items-end gap-1.5 mt-1 border-t border-border/20 pt-3 md:border-none md:pt-0">
            <p className="text-xs">Engineered by Partha Pratim Kashyap</p>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-3 gap-y-1 text-xs">
              <a
                href="https://github.com/parthakashyap"
                className="hover:text-primary transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://linkedin.com/in/partha-pratim-kashyap"
                className="hover:text-primary transition-colors"
              >
                LinkedIn
              </a>
              <a
                href="https://instagram.com/partha_kashyap__"
                className="hover:text-primary transition-colors"
              >
                Instagram
              </a>
              <a
                href="mailto:parthakashyal@gmail.com"
                className="hover:text-primary transition-colors"
              >
                Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const isBot = headersList.get('x-is-bot') === '1';

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="x-is-bot" content={isBot ? '1' : '0'} />
      </head>
      <body
        suppressHydrationWarning
        className={cn(
          "font-sans antialiased flex flex-col min-h-screen",
          nunito.variable,
        )}
      >
        <DisclaimerModal />
        <div className="flex-grow">{children}</div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Global ad stack. NativeBannerAd is a singleton — it lives here and
              only here; every other ad position uses AdSlot. Both declare their
              own reserved height so a blocked script cannot cause CLS. */}
          <AdSlot label="Advertisement" />
          <NativeBannerAd label="Advertisement" />
        </div>
        <Footer />
        <Toaster />
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
        {/* Underlays load afterInteractive so they never block first paint, and
            are chosen per route so the player stays usable. */}
        <AdUnderlays />
        {/* Dev-only report of which ad env vars are unset. Renders null. */}
        <AdConfigDiagnostic />
        {/* AdBlock detector - shows subtle overlay if extreme AdBlocker blocks ads */}
        <AdBlockDetector />
        {/* Service Worker for offline support and caching */}
        <ServiceWorkerRegistration />
        {/* Preconnect to critical third-party origins for faster resource loading */}
        <PreconnectOrigins />
        {/* Prefetch links when they enter viewport for instant navigation */}
        <PrefetchLinks />
      </body>
    </html>
  );
}
