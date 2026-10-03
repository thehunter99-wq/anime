'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, Phone, Globe, Shield, CheckCircle, Loader2 } from 'lucide-react';

export default function DMCAForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    copyrightedWork: '',
    infringingUrls: '',
    goodFaithStatement: false,
    accuracyStatement: false,
    authorizedStatement: false,
    signature: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mailtoLink, setMailtoLink] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full legal name is required';
    if (!formData.email.trim()) newErrors.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Physical address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State/Province is required';
    if (!formData.zip.trim()) newErrors.zip = 'ZIP/Postal code is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.copyrightedWork.trim()) newErrors.copyrightedWork = 'Description of copyrighted work is required';
    if (!formData.infringingUrls.trim()) newErrors.infringingUrls = 'Infringing URL(s) are required';
    if (!formData.goodFaithStatement) newErrors.goodFaithStatement = 'You must confirm good faith belief';
    if (!formData.accuracyStatement) newErrors.accuracyStatement = 'You must confirm accuracy of information';
    if (!formData.authorizedStatement) newErrors.authorizedStatement = 'You must confirm authorization';
    if (!formData.signature.trim()) newErrors.signature = 'Electronic signature is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/dmca', {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const openMailto = () => {
    if (mailtoLink) {
      window.location.href = mailtoLink;
    }
  };

  return (
    <>
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <CheckCircle className="h-5 w-5" /> DMCA Takedown Form
        </h2>
        <p className="text-muted-foreground">
          Use the form below to generate a properly formatted DMCA notice. Upon submission, your default email client will open with the notice pre-filled for you to send to our designated agent.
        </p>

        {submitted && mailtoLink && (
          <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300" onClick={openMailto} style={{ cursor: 'pointer' }}>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Form Ready to Send - Click to Open Email</AlertTitle>
            <AlertDescription>
              Your email client should open with the complete DMCA notice. Please review and send it to complete the process.
            </AlertDescription>
          </Alert>
        )}

        {errors.submit && (
          <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
            <AlertTitle>Submission Error</AlertTitle>
            <AlertDescription>{errors.submit}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>All fields are required for a valid DMCA notice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Legal Name *</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" aria-invalid={!!errors.name} disabled={isSubmitting} />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" aria-invalid={!!errors.email} disabled={isSubmitting} />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" aria-invalid={!!errors.phone} disabled={isSubmitting} />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company / Organization (if applicable)</Label>
                <Input id="company" name="company" value={formData.company} onChange={handleChange} placeholder="Example Corp" disabled={isSubmitting} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address *</Label>
                  <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="123 Main Street" aria-invalid={!!errors.address} disabled={isSubmitting} />
                  {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="New York" aria-invalid={!!errors.city} disabled={isSubmitting} />
                  {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province *</Label>
                  <Input id="state" name="state" value={formData.state} onChange={handleChange} placeholder="NY" aria-invalid={!!errors.state} disabled={isSubmitting} />
                  {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP/Postal Code *</Label>
                  <Input id="zip" name="zip" value={formData.zip} onChange={handleChange} placeholder="10001" aria-invalid={!!errors.zip} disabled={isSubmitting} />
                  {errors.zip && <p className="text-sm text-red-500">{errors.zip}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input id="country" name="country" value={formData.country} onChange={handleChange} placeholder="United States" aria-invalid={!!errors.country} disabled={isSubmitting} />
                  {errors.country && <p className="text-sm text-red-500">{errors.country}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Copyrighted Work Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="copyrightedWork">Description of Copyrighted Work *</Label>
                <Textarea
                  id="copyrightedWork"
                  name="copyrightedWork"
                  value={formData.copyrightedWork}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Title: Movie/Show Name
Year: 2024
Type: Feature Film / TV Series / Anime
Your Rights: Exclusive distribution rights for [region]"
                  aria-invalid={!!errors.copyrightedWork}
                  disabled={isSubmitting}
                />
                {errors.copyrightedWork && <p className="text-sm text-red-500">{errors.copyrightedWork}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="infringingUrls">Infringing URL(s) on this site *</Label>
                <Textarea
                  id="infringingUrls"
                  name="infringingUrls"
                  value={formData.infringingUrls}
                  onChange={handleChange}
                  rows={4}
                  placeholder="https://example.com/watch/12345/movie-title
https://example.com/watch/tv/67890/show-title
(One URL per line)"
                  aria-invalid={!!errors.infringingUrls}
                  disabled={isSubmitting}
                />
                {errors.infringingUrls && <p className="text-sm text-red-500">{errors.infringingUrls}</p>}
                <p className="text-sm text-muted-foreground">Provide the exact URL(s) on our site where the infringing embed appears.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Required Legal Statements
              </CardTitle>
              <CardDescription>All three statements must be confirmed for a valid notice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="goodFaithStatement"
                    checked={formData.goodFaithStatement}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    aria-invalid={!!errors.goodFaithStatement}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-foreground">
                    <strong>Good Faith Belief:</strong> I have a good faith belief that the use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.
                  </span>
                </label>
                {errors.goodFaithStatement && <p className="text-sm text-red-500 pl-7">{errors.goodFaithStatement}</p>}
              </div>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="accuracyStatement"
                    checked={formData.accuracyStatement}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    aria-invalid={!!errors.accuracyStatement}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-foreground">
                    <strong>Accuracy Under Penalty of Perjury:</strong> The information in this notification is accurate, and under penalty of perjury, I am authorized to act on behalf of the owner of the exclusive right that is allegedly infringed.
                  </span>
                </label>
                {errors.accuracyStatement && <p className="text-sm text-red-500 pl-7">{errors.accuracyStatement}</p>}
              </div>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="authorizedStatement"
                    checked={formData.authorizedStatement}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    aria-invalid={!!errors.authorizedStatement}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-foreground">
                    <strong>Authorization:</strong> I am the copyright owner or authorized to act on behalf of the copyright owner.
                  </span>
                </label>
                {errors.authorizedStatement && <p className="text-sm text-red-500 pl-7">{errors.authorizedStatement}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Electronic Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="signature">Your Full Legal Name (Electronic Signature) *</Label>
                <Input id="signature" name="signature" value={formData.signature} onChange={handleChange} placeholder="John Doe" aria-invalid={!!errors.signature} disabled={isSubmitting} />
                {errors.signature && <p className="text-sm text-red-500">{errors.signature}</p>}
                <p className="text-sm text-muted-foreground">By typing your full legal name, you acknowledge this constitutes your electronic signature under the ESIGN Act and UETA.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button type="submit" size="lg" className="w-full sm:w-auto min-w-[280px]" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Notice...
                </>
              ) : (
                'Generate & Send DMCA Notice'
              )}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}