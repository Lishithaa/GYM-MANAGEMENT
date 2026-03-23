import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
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
            Sign in to book gyms and trainers
          </p>

          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-black text-white hover:bg-zinc-800 rounded-md"
            size="lg"
            data-testid="google-login-button"
          >
            Continue with Google
          </Button>

          <p className="text-center text-sm text-zinc-500 font-['Manrope'] mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
