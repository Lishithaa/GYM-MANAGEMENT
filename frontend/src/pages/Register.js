import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/PasswordInput';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '@/config';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralFromUrl = useMemo(() => searchParams.get('ref')?.trim() || '', [searchParams]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error('Please fill in name, email, and password');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/auth/register`, {
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        phone: phone.trim() || null,
        role,
        referral_code: referralFromUrl || null,
      });
      toast.success('Account created. Check your email to verify, then sign in.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md border-zinc-200">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </div>

          <h2 className="text-2xl font-bold font-['Outfit'] tracking-tight text-center mb-2">Create account</h2>
          <p className="text-center text-zinc-600 font-['Manrope'] mb-6">
            Book trainers or sign up as a trainer
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label>I am signing up as</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'user'}
                    onChange={() => setRole('user')}
                  />
                  Member (book sessions)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'trainer'}
                    onChange={() => setRole('trainer')}
                  />
                  Trainer
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="reg-name">Full name</Label>
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                data-testid="register-name-input"
              />
            </div>
            <div>
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                data-testid="register-email-input"
              />
            </div>
            <div>
              <Label htmlFor="reg-phone">Phone (optional)</Label>
              <Input
                id="reg-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                data-testid="register-phone-input"
              />
            </div>
            <div>
              <Label htmlFor="reg-password">Password</Label>
              <PasswordInput
                id="reg-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                data-testid="register-password-input"
              />
              <p className="text-xs text-zinc-500 mt-1">At least 8 characters</p>
            </div>
            <div>
              <Label htmlFor="reg-confirm">Confirm password</Label>
              <PasswordInput
                id="reg-confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                data-testid="register-confirm-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-zinc-800 rounded-md"
              size="lg"
              disabled={submitting}
              data-testid="register-submit-button"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline" data-testid="register-login-link">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-zinc-500 font-['Manrope'] mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
