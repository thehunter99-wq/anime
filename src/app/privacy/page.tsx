import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, Cookie, Database, Globe, Link as LinkIcon, Mail, User } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy Policy for ${SITE_NAME}. We do not collect personal data. Third-party embeds may use cookies under their own policies.`,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Privacy Policy',
    description: `Privacy Policy for ${SITE_NAME}. We value your privacy and do not collect personal data.`,
    type: 'website',
    url: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
          </header>

          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Shield className="h-5 w-5" /> Our Commitment
              </CardTitle>
            </CardHeader>
            <CardContent className="text-foreground/80">
              <p className="font-medium text-lg mb-2"><strong>{SITE_NAME} does not collect, store, or share any personal data.</strong></p>
              <p>We do not use analytics, tracking pixels, cookies (except essential session cookies), advertising networks, or user profiling of any kind. Your visit to this site is private by default.</p>
            </CardContent>
          </Card>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" /> Data We Do Not Collect
            </h2>
            <ul className="list-disc list-inside space-y-3 pl-4 text-foreground/80">
              <li>No names, email addresses, or contact information</li>
              <li>No IP address logging beyond standard server logs (auto-deleted)</li>
              <li>No browsing history or viewing preferences</li>
              <li>No account creation or user profiles</li>
              <li>No payment or financial information</li>
              <li>No location data or device fingerprinting</li>
            </ul>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Cookie className="h-5 w-5" /> Cookies & Local Storage
            </h2>
            <div className="space-y-4 text-foreground/80">
              <p>We use only essential, first-party cookies/localStorage for:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Ad frequency capping (preventing excessive popups)</li>
                <li>User preference persistence (theme, language)</li>
                <li>Session state for video player</li>
              </ul>
              <p>These are <strong>never shared with third parties</strong> and contain no personally identifiable information. You can clear them at any time via your browser settings.</p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" /> Third-Party Embeds
            </h2>
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="text-foreground/80 space-y-3">
                <p className="font-medium"><strong>Important:</strong> This site embeds video content from third-party providers (VidSrc, VidLink, 2Embed, AutoEmbed, Vidsrc.pm, and similar services).</p>
                <p>When you play a video, your browser connects directly to these third-party servers. They may:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Set their own cookies</li>
                  <li>Track your IP address</li>
                  <li>Use analytics or advertising</li>
                  <li>Have their own privacy policies</li>
                </ul>
                <p><strong>We have no control over these third-party practices.</strong> We recommend using a VPN and privacy-focused browser extensions if this concerns you.</p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <LinkIcon className="h-5 w-5" /> External Links
            </h2>
            <p className="text-foreground/80">Our site may contain links to external websites. We are not responsible for the privacy practices or content of these sites. This privacy policy applies only to {SITE_NAME}.</p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" /> Children's Privacy
            </h2>
            <p className="text-foreground/80">Our site is not directed at children under 13. We do not knowingly collect any information from children. If you are a parent and believe your child has provided us information, please contact us.</p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" /> Your Rights
            </h2>
            <p className="text-foreground/80">Since we do not collect personal data, there is no personal data to access, delete, or port. If you have concerns about third-party embed data, please contact the respective provider directly.</p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5" /> Contact
            </h2>
            <p className="text-foreground/80">For privacy-related questions or concerns:</p>
            <div className="flex items-center gap-2">
              <a href="mailto:parthaforwork@outlook.com" className="text-primary hover:underline">parthaforwork@outlook.com</a>
            </div>
          </section>

          <section className="space-y-6 border-t pt-8">
            <h2 className="text-2xl font-semibold">Changes to This Policy</h2>
            <p className="text-foreground/80">We may update this policy occasionally. Changes will be posted here with an updated "Last updated" date. Continued use of the site constitutes acceptance.</p>
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