import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Globe, Mail, Phone, CheckCircle } from 'lucide-react';
import DMCAForm from '@/components/dmca-form';

export const metadata: Metadata = {
  title: 'DMCA Notice & Takedown Policy',
  description: `DMCA Notice & Takedown Policy for ${SITE_NAME}. How to file a copyright infringement notice. We do not host any copyrighted content - all media is embedded from third-party servers.`,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'DMCA Notice & Takedown Policy',
    description: `DMCA Notice & Takedown Policy for ${SITE_NAME}. We do not host any copyrighted content.`,
    type: 'website',
    url: `${SITE_URL}/dmca`,
  },
};

export default function DMCAPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-4">DMCA Notice & Takedown Policy</h1>
            <p className="text-muted-foreground">
              {SITE_NAME} respects the intellectual property rights of others and expects its users to do the same.
            </p>
          </header>

          <Alert className="border-primary/20 bg-primary/5">
            <Shield className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Important Legal Disclaimer</AlertTitle>
            <AlertDescription className="text-foreground">
              <strong>{SITE_NAME} does not host, store, or upload any copyrighted media files on its servers.</strong> All movies, TV shows, anime, and other media content on this website are <strong>embedded from third-party servers</strong> (such as VidSrc, VidLink, 2Embed, AutoEmbed, and similar services). We function solely as an index and aggregator of publicly available embed links. We have no control over the content hosted on these third-party platforms. If you believe your copyrighted content is being infringed, you must contact the actual hosting provider directly. We will promptly remove or disable access to embed links upon receipt of a valid DMCA notice.
            </AlertDescription>
          </Alert>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5" /> How to File a DMCA Notice
            </h2>
            <p className="text-foreground/80">
              If you are a copyright owner or an authorized representative and believe that content accessible via our site infringes your copyright, please submit a written notification containing the following information (per 17 U.S.C. § 512(c)(3)):
            </p>
            <ul className="list-disc list-inside space-y-3 pl-4 text-foreground/80">
              <li><strong>Identification of the copyrighted work</strong> claimed to have been infringed (title, URL, or other identifying information).</li>
              <li><strong>Identification of the infringing material</strong> on our site, including the specific URL(s) where the embed/link appears.</li>
              <li><strong>Your contact information</strong>: full legal name, physical address, phone number, and email address.</li>
              <li><strong>A statement of good faith belief</strong> that the use of the material is not authorized by the copyright owner, its agent, or the law.</li>
              <li><strong>A statement of accuracy</strong> under penalty of perjury that the information in the notification is accurate.</li>
              <li><strong>A statement of authorization</strong> that you are authorized to act on behalf of the copyright owner.</li>
              <li><strong>Your physical or electronic signature</strong>.</li>
            </ul>
          </section>

          <DMCAForm />

          <section className="space-y-6 border-t pt-8">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" /> Designated Agent & Contact
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" /> Email
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a href="mailto:parthaforwork@outlook.com" className="text-primary hover:underline break-all">
                    parthaforwork@outlook.com
                  </a>
                  <p className="text-sm text-muted-foreground mt-2">Primary contact for DMCA notices</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" /> Response Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">We typically respond to valid DMCA notices within <strong>24-48 hours</strong>.</p>
                  <p className="text-sm text-muted-foreground mt-2">Invalid or incomplete notices may not receive a response.</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="h-5 w-5" /> Counter-Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground/80 space-y-3">
                <p>If you believe your content was removed in error, you may file a counter-notification under 17 U.S.C. § 512(g). Your counter-notification must include:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Identification of the material removed and its location before removal</li>
                  <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake or misidentification</li>
                  <li>Your name, address, phone number, and consent to jurisdiction of federal court in your district</li>
                  <li>Your physical or electronic signature</li>
                </ul>
                <p>Send counter-notifications to the same email address above.</p>
              </CardContent>
            </Card>
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