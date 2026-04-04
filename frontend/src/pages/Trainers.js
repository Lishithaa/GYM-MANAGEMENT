import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Dumbbell, ArrowLeft } from 'lucide-react';
import { TrainerShowcaseCard } from '@/components/TrainerShowcaseCard';
import { useAuth } from '@/contexts/AuthContext';
import { API } from '@/config';
import { goBack } from '@/utils/goBack';

const Trainers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/trainers`);
      setTrainers(response.data);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-zinc-900" data-testid="logo-link">
            <Dumbbell className="w-8 h-8 text-zinc-900" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/trainers" className="text-sm font-medium text-zinc-800" data-testid="nav-trainers-link">
              Trainers
            </Link>
            <Link
              to="/contact"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              data-testid="nav-contact-link"
            >
              Contact
            </Link>
            {user ? (
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="rounded-md border-zinc-300 text-zinc-800 bg-white hover:bg-zinc-50"
                data-testid="nav-dashboard-button"
              >
                Dashboard
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                variant="outline"
                className="rounded-md border-zinc-300 text-zinc-800 bg-white hover:bg-zinc-50"
                data-testid="nav-login-button"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Button
            onClick={() => goBack(navigate, '/')}
            variant="ghost"
            className="mb-4 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-5xl font-bold font-['Outfit'] tracking-tight mb-4 text-zinc-900">
            Meet our coaches
          </h1>
          <p className="text-lg font-['Manrope'] text-zinc-600 max-w-2xl">
            Portrait photos use a waist-up crop on a branded panel. For the sleekest look, upload a PNG with a
            transparent background.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">Loading trainers...</p>
          </div>
        ) : trainers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">No trainers available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {trainers.map((trainer) => (
              <TrainerShowcaseCard
                key={trainer.trainer_id}
                trainer={trainer}
                variant="grid"
                onClick={() => navigate(`/trainers/${trainer.trainer_id}`)}
                data-testid={`trainer-card-${trainer.trainer_id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trainers;
