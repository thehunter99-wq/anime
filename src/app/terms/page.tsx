import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Gavel, Globe, User, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of Service for ${SITE_NAME}. By accessing this website, you agree to these terms. Content is embedded from third-party servers.`,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Terms of Service',
    description: `Terms of Service for ${SITE_NAME}. Please read before using our service.`,
    type: 'website',
    url: `${SITE_URL}/terms`,
  },
};

export default function TermsPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          </header>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-foreground/80 space-y-2">
              <p className="font-medium"><strong>{SITE_NAME} is a free streaming index that embeds content from third-party servers.</strong></p>
              <p>We do not host, upload, or store any video files. All content is embedded from publicly available third-party sources. By using this site, you agree to these terms.</p>
            </CardContent>
          </Card>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Gavel className="h-5 w-5" /> 1. Acceptance of Terms
            </h2>
            <p className="text-foreground/80">By accessing or using {SITE_NAME} ("the Site", "we", "us", "our"), you ("User", "you") agree to be bound by these Terms of Service ("Terms"). If you disagree with any part, do not use the Site.</p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" /> 2. Nature of Service
            </h2>
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="text-foreground/80 space-y-3">
                <p className="font-medium"><strong>Critical Disclaimer:</strong> {SITE_NAME} does not host, store, upload, or transmit any video, audio, or media files.</p>
                <p>All movies, TV shows, anime, and other media are <strong>embedded via iframes or direct links from third-party hosting providers</strong> (e.g., VidSrc, VidLink, 2Embed, AutoEmbed, Vidsrc.pm, etc.).</p>
                <p>We act solely as an <strong>index and aggregator</strong> of publicly available embed links. We have no control over the content, availability, quality, or legality of the streams provided by these third parties.</p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" /> 3. User Conduct
            </h2>
            <ul className="list-disc list-inside space-y-3 pl-4 text-foreground/80">
              <li>Use the Site only for personal, non-commercial purposes.</li>
              <li>Do not attempt to scrape, download, or redistribute content systematically.</li>
              <li>Do not interfere with the Site's operation, security, or embed functionality.</li>
              <li>Do not use automated tools, bots, or scripts to access the Site.</li>
              <li>Respect all applicable laws, including copyright laws in your jurisdiction.</li>
            </ul>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> 4. Copyright & DMCA
            </h2>
            <div className="space-y-3 text-foreground/80">
              <p>We respect intellectual property rights. Our <a href="/dmca" className="text-primary hover:underline">DMCA Policy</a> explains how to report infringing content.</p>
              <p><strong>Repeat infringer policy:</strong> We will terminate access for users who repeatedly receive valid DMCA notices.</p>
              <p>If you are a copyright owner, please note that <strong>the actual infringing files are hosted on third-party servers, not ours</strong>. You may need to contact the hosting provider directly for fastest removal.</p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" /> 5. Disclaimers & No Warranties
            </h2>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="text-foreground/80 space-y-3">
                <p className="font-medium"><strong>THE SITE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.</strong></p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>No guarantee of content availability, quality, or accuracy</li>
                  <li>No warranty that streams will be uninterrupted, error-free, or virus-free</li>
                  <li>No endorsement of third-party content or hosting providers</li>
                  <li>No liability for any damages arising from use or inability to use the Site</li>
                  <li>Third-party embeds may contain ads, popups, or tracking — we do not control these</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" /> 6. Limitation of Liability
            </h2>
            <p className="text-foreground/80">To the maximum extent permitted by law, {SITE_NAME} and its operators shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including loss of data, revenue, or goodwill, arising from your use of the Site.</p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" /> 7. Indemnification
            </h2>
            <p className="text-foreground/80">You agree to indemnify and hold harmless {SITE_NAME}, its operators, and affiliates from any claims, damages, or expenses (including legal fees) arising from your use of the Site or violation of these Terms.</p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Gavel className="h-5 w-5" /> 8. Governing Law & Jurisdiction
            </h2>
            <p className="text-foreground/80">These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India. If any provision is found unenforceable, the remaining provisions continue in effect.</p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> 9. Changes & Termination
            </h2>
            <p className="text-foreground/80">We may modify these Terms at any time. Continued use after changes constitutes acceptance. We may terminate or suspend your access at any time, without notice, for violations of these Terms.</p>
          </section>

          <section className="space-y-6 border-t pt-8">
            <h2 className="text-2xl font-semibold">Contact</h2>
            <p className="text-foreground/80">Questions about these Terms? Contact us at:</p>
            <div className="flex items-center gap-2">
              <a href="mailto:parthaforwork@outlook.com" className="text-primary hover:underline">parthaforwork@outlook.com</a>
            </div>
          </section>

          <div className="text-center pt-8 border-t">
            <Link href="/" className="text-primary hover:underline inline-flex items-center gap-2">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}