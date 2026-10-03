import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Globe, Mail, Phone, User, AlertTriangle, MessageSquare } from 'lucide-react';
import ContactForm from '@/components/contact-form';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Contact ${SITE_NAME} for DMCA notices, content requests, technical issues, or general inquiries.`,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Contact Us',
    description: `Get in touch with ${SITE_NAME} for DMCA, content requests, or technical support.`,
    type: 'website',
    url: `${SITE_URL}/contact`,
  },
};

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-4">Contact Us</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Have questions, suggestions, or need to report an issue? Use the form below or reach out directly via email.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ContactForm />
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" /> Direct Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <a href="mailto:parthaforwork@outlook.com" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                    <Mail className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">parthaforwork@outlook.com</p>
                      <p className="text-sm text-muted-foreground">Primary contact for all inquiries</p>
                    </div>
                  </a>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" /> Quick Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/dmca" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                    <Shield className="h-5 w-5" />
                    <span>DMCA Notice & Takedown Policy</span>
                  </Link>
                  <Link href="/privacy" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                    <Globe className="h-5 w-5" />
                    <span>Privacy Policy</span>
                  </Link>
                  <Link href="/terms" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                    <User className="h-5 w-5" />
                    <span>Terms of Service</span>
                  </Link>
                </CardContent>
              </Card>

              <Card className="mt-4 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <AlertTriangle className="h-5 w-5" /> Important Notice
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-foreground/80 space-y-2">
                  <p><strong>{SITE_NAME} does not host any media files.</strong> All content is embedded from third-party servers.</p>
                  <p>For content removal requests, you may need to contact the actual hosting provider (VidSrc, VidLink, etc.) directly for fastest action.</p>
                  <p>We respond to valid DMCA notices within 24-48 hours and remove/disable access to the reported embed links.</p>
                </CardContent>
              </Card>
            </div>
          </div>

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