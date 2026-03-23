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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Contact = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

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
          onClick={() => navigate('/')}
          variant="ghost"
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
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
      </div>
    </div>
  );
};

export default Contact;
