import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Star, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/gyms" className="text-sm font-medium hover:text-blue-600 transition-colors" data-testid="nav-gyms-link">
              Gyms
            </Link>
            <Link to="/trainers" className="text-sm font-medium text-blue-600" data-testid="nav-trainers-link">
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

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-4"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-5xl font-bold font-['Outfit'] tracking-tight mb-4">
            Browse Trainers
          </h1>
          <p className="text-lg font-['Manrope'] text-zinc-600">
            Find certified trainers to guide your fitness journey
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-zinc-600">Loading trainers...</p>
          </div>
        ) : trainers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600">No trainers available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.map((trainer) => (
              <Card
                key={trainer.trainer_id}
                className="border-zinc-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/trainers/${trainer.trainer_id}`)}
                data-testid={`trainer-card-${trainer.trainer_id}`}
              >
                <img
                  src={trainer.photo}
                  alt={trainer.specialty}
                  className="w-full h-48 object-cover"
                />
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold font-['Outfit'] mb-2">{trainer.specialty}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {trainer.rating > 0 ? trainer.rating.toFixed(1) : 'New'}
                    </span>
                    {trainer.reviews_count > 0 && (
                      <span className="text-sm text-zinc-500">({trainer.reviews_count})</span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    ₹{trainer.hourly_rate}/hour
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trainers;
