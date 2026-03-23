import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dumbbell, MapPin, Clock, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/gyms" className="text-sm font-medium hover:text-blue-600 transition-colors" data-testid="nav-gyms-link">
              Gyms
            </Link>
            <Link to="/trainers" className="text-sm font-medium hover:text-blue-600 transition-colors" data-testid="nav-trainers-link">
              Trainers
            </Link>
            <Link to="/contact" className="text-sm font-medium hover:text-blue-600 transition-colors" data-testid="nav-contact-link">
              Contact
            </Link>
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

      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-6xl font-bold font-['Outfit'] tracking-tighter text-zinc-900 mb-6">
                Book Gyms & Trainers by the Hour
              </h1>
              <p className="text-lg font-['Manrope'] leading-relaxed text-zinc-600 mb-8">
                Flexible fitness on your schedule. Access premium gyms and certified trainers across Hyderabad, Bangalore, and Guntur.
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => navigate('/gyms')}
                  size="lg"
                  className="bg-blue-600 text-white hover:bg-blue-700 rounded-md px-8"
                  data-testid="hero-browse-gyms-button"
                >
                  Browse Gyms
                </Button>
                <Button
                  onClick={() => navigate('/trainers')}
                  size="lg"
                  variant="outline"
                  className="border-zinc-300 rounded-md px-8"
                  data-testid="hero-browse-trainers-button"
                >
                  Find Trainers
                </Button>
              </div>
            </div>
            <div>
              <img
                src="https://images.unsplash.com/photo-1761971975769-97e598bf526b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNDR8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBneW0lMjBpbnRlcmlvcnxlbnwwfHx8fDE3NzQyODE2NzJ8MA&ixlib=rb-4.1.0&q=85"
                alt="Modern gym interior"
                className="w-full h-[500px] object-cover rounded-md border border-zinc-200"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-zinc-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold font-['Outfit'] tracking-tight text-center mb-16">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 border border-zinc-200 rounded-md">
              <div className="w-12 h-12 bg-blue-600 rounded-md flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold font-['Outfit'] mb-3">Choose Location</h3>
              <p className="font-['Manrope'] leading-relaxed text-zinc-600">
                Select your city and area to find gyms and trainers near you.
              </p>
            </div>
            <div className="bg-white p-8 border border-zinc-200 rounded-md">
              <div className="w-12 h-12 bg-blue-600 rounded-md flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold font-['Outfit'] mb-3">Book by Hour</h3>
              <p className="font-['Manrope'] leading-relaxed text-zinc-600">
                Pick your date and time slot. Pay securely with Razorpay.
              </p>
            </div>
            <div className="bg-white p-8 border border-zinc-200 rounded-md">
              <div className="w-12 h-12 bg-blue-600 rounded-md flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold font-['Outfit'] mb-3">Check-in & Train</h3>
              <p className="font-['Manrope'] leading-relaxed text-zinc-600">
                Show your QR code at the gym and start your workout.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-6">
            Are you a Gym Owner or Trainer?
          </h2>
          <p className="text-lg font-['Manrope'] text-zinc-600 mb-8">
            Join HourlyGym to list your gym or offer training sessions
          </p>
          <Button
            onClick={() => navigate('/login')}
            size="lg"
            className="bg-black text-white hover:bg-zinc-800 rounded-md px-8"
            data-testid="partner-login-button"
          >
            Partner Login
          </Button>
        </div>
      </section>

      <footer className="bg-zinc-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Dumbbell className="w-6 h-6" strokeWidth={2} />
            <span className="text-xl font-bold font-['Outfit']">HourlyGym</span>
          </div>
          <p className="text-zinc-400 font-['Manrope']">
            © 2024 HourlyGym. Flexible fitness across India.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
