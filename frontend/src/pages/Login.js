import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      const dashboardMap = {
        gym_owner: '/gym-owner/dashboard',
        trainer: '/trainer/dashboard',
        admin: '/admin',
        user: '/dashboard'
      };
      navigate(dashboardMap[loggedInUser?.role] || '/dashboard');
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message =
        detail ||
        (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error'
          ? 'Cannot reach API. Is the backend running on port 8000 and REACT_APP_BACKEND_URL correct?'
          : error?.message || 'Login failed');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
      <Card className="w-full max-w-md border-zinc-200">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </div>
          
          <h2 className="text-2xl font-bold font-['Outfit'] tracking-tight text-center mb-2">
            Welcome Back
          </h2>
          <p className="text-center text-zinc-600 font-['Manrope'] mb-8">
            Sign in to book trainers
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                data-testid="email-input"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                data-testid="password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-zinc-800 rounded-md"
              size="lg"
              data-testid="email-login-button"
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-500 font-['Manrope'] mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
