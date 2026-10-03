'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, MessageSquare, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mailtoLink, setMailtoLink] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    else if (formData.message.trim().length < 10) newErrors.message = 'Message must be at least 10 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success && data.mailto) {
        setMailtoLink(data.mailto);
        setSubmitted(true);
      } else {
        setErrors({ submit: data.error || 'Submission failed. Please try again.' });
      }
    } catch {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const openMailto = () => {
    if (mailtoLink) {
      window.location.href = mailtoLink;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Send a Message
          </CardTitle>
          <CardDescription>We typically respond within 24-48 hours.</CardDescription>
        </CardHeader>
        <CardContent>
          {submitted && mailtoLink && (
            <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300 mb-6" onClick={openMailto} style={{ cursor: 'pointer' }}>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Message Ready to Send - Click to Open Email</AlertTitle>
              <AlertDescription>
                Your email client should open with your message pre-filled. Please review and send it to complete the process.
              </AlertDescription>
            </Alert>
          )}

          {errors.submit && (
            <Alert className="border-destructive/50 bg-destructive/10 text-destructive mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Submission Error</AlertTitle>
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  aria-invalid={!!errors.name}
                  disabled={isSubmitting}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  disabled={isSubmitting}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-invalid={!!errors.subject}
                disabled={isSubmitting}
              >
                <option value="">Select a topic</option>
                <option value="DMCA / Copyright">DMCA / Copyright Infringement</option>
                <option value="Content Request">Content Request (Movie/Show/Anime)</option>
                <option value="Broken Link / Embed">Broken Link or Embed Issue</option>
                <option value="Technical Issue">Technical Issue / Bug Report</option>
                <option value="Privacy">Privacy Concern</option>
                <option value="Advertising">Advertising / Partnership</option>
                <option value="General">General Inquiry</option>
                <option value="Other">Other</option>
              </select>
              {errors.subject && <p className="text-sm text-red-500">{errors.subject}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                placeholder="Describe your issue or request in detail..."
                aria-invalid={!!errors.message}
                disabled={isSubmitting}
              />
              {errors.message && <p className="text-sm text-red-500">{errors.message}</p>}
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[200px]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}