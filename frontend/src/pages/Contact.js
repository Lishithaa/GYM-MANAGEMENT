import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dumbbell, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';
import { goBack } from '@/utils/goBack';

const Contact = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    organization_name: '',
    contact_name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [partnerSubmitting, setPartnerSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/contact`, formData);
      toast.success('Message sent! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    if (!partnerForm.organization_name || !partnerForm.contact_name || !partnerForm.email || !partnerForm.message) {
      toast.error('Please fill organization, contact name, email, and message');
      return;
    }
    setPartnerSubmitting(true);
    try {
      await axios.post(`${API}/partner-requests`, partnerForm);
      toast.success('Partnership request received. We will contact you soon.');
      setPartnerForm({
        organization_name: '',
        contact_name: '',
        email: '',
        phone: '',
        message: ''
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not submit request');
    } finally {
      setPartnerSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')} data-testid="logo-link">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-black text-white hover:bg-zinc-800 rounded-md"
                data-testid="nav-dashboard-button"
              >
                Dashboard
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                className="bg-black text-white hover:bg-zinc-800 rounded-md"
                data-testid="nav-login-button"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <Button
          onClick={() => goBack(navigate, '/')}
          variant="ghost"
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-5xl font-bold font-['Outfit'] tracking-tight mb-4">
          Contact Us
        </h1>
        <p className="text-lg font-['Manrope'] text-zinc-600 mb-8">
          Have questions? We'd love to hear from you.
        </p>

        <Card className="border-zinc-200">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                  data-testid="contact-name-input"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  data-testid="contact-email-input"
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us how we can help..."
                  rows={6}
                  data-testid="contact-message-input"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                size="lg"
                disabled={submitting}
                data-testid="contact-submit-button"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold font-['Outfit'] tracking-tight mt-12 mb-4">Partner with us</h2>
        <p className="text-zinc-600 mb-6 text-sm">
          Gyms, corporates, and wellness brands — tell us about your partnership goals.
        </p>
        <Card className="border-zinc-200">
          <CardContent className="p-8">
            <form onSubmit={handlePartnerSubmit} className="space-y-6">
              <div>
                <Label htmlFor="org">Organization name</Label>
                <Input
                  id="org"
                  value={partnerForm.organization_name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, organization_name: e.target.value })}
                  placeholder="Company or gym name"
                />
              </div>
              <div>
                <Label htmlFor="pname">Contact name</Label>
                <Input
                  id="pname"
                  value={partnerForm.contact_name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, contact_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pemail">Email</Label>
                <Input
                  id="pemail"
                  type="email"
                  value={partnerForm.email}
                  onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pphone">Phone (optional)</Label>
                <Input
                  id="pphone"
                  value={partnerForm.phone}
                  onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="pmsg">Message</Label>
                <Textarea
                  id="pmsg"
                  rows={4}
                  value={partnerForm.message}
                  onChange={(e) => setPartnerForm({ ...partnerForm, message: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full bg-zinc-900 text-white hover:bg-zinc-800 rounded-md" disabled={partnerSubmitting}>
                {partnerSubmitting ? 'Sending…' : 'Submit partnership request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contact;
