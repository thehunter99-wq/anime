import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import Link from "next/link";
import DisclaimerModal from "@/components/disclaimer-modal";
import { AdBanner, AdsterraSocialBar, AdsterraPopunder } from "@/components/ads";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: {
    template: "%s | AniMovie",
    default: "AniMovie - Watch Anime, Manga & Movies Online",
  },
  description:
    "Your one-stop platform for streaming the latest anime, reading popular manga, and watching movies. All for free, with sub and dub options available.",
  other: {
    // Rendered by Next into <head> itself. Using an explicit <head> tag in an
    // App Router root layout fights the router's own head management and is a
    // known source of hydration mismatches.
    "script:ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Animovie",
      url: "https://animovie.parthakashyap.com",
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
    }),
  },
};

function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-background text-sm text-muted-foreground">
      <div className="container mx-auto flex flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
          <p>
            &copy; {new Date().getFullYear()} AniMovie. All Rights Reserved.
          </p>
          <p className="max-w-md text-xs">
            All media content is provided by third-party services. AniMovie does
            not claim ownership of any anime, movies, TV shows, or manga linked
            or embedded on this site.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 text-center md:items-end md:text-right">
          <nav className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2">
            <Link
              href="/disclaimer"
              className="hover:text-primary transition-colors"
            >
              Disclaimer
            </Link>
            <Link href="/dmca" className="hover:text-primary transition-colors">
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          "font-sans antialiased flex flex-col min-h-screen",
          nunito.variable,
        )}
      >
        <DisclaimerModal />
        <div className="flex-grow">{children}</div>
        <div className="container mx-auto px-4 pb-4 sm:px-6 lg:px-8">
          <AdBanner label="Advertisement" />
        </div>
        <Footer />
        <Toaster />
        <AdsterraSocialBar />
        <AdsterraPopunder />
      </body>
    </html>
  );
}
