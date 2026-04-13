import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Dumbbell, ArrowLeft } from 'lucide-react';
import { TrainerShowcaseCard } from '@/components/TrainerShowcaseCard';
import { useAuth } from '@/contexts/AuthContext';
import { API } from '@/config';
import { goBack } from '@/utils/goBack';
import { toast } from 'sonner';

const Trainers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [city, setCity] = useState(String(location.state?.city || ''));
  const [apartment, setApartment] = useState(String(location.state?.apartment || ''));
  const [apartmentId, setApartmentId] = useState(String(location.state?.apartment_id || ''));
  const [workout, setWorkout] = useState(String(location.state?.workout || ''));
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apartmentOptions, setApartmentOptions] = useState([]);
  const [sendingInviteId, setSendingInviteId] = useState('');

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    try {
      if (apartmentId) {
        const response = await axios.get(`${API}/locality/apartments/${apartmentId}/trainers`);
        setTrainers(response.data);
      } else {
        const response = await axios.get(`${API}/trainers`, {
          params: {
            city: city || undefined,
            area: apartment || undefined,
            specialty: workout || undefined,
            lat: lat || undefined,
            lng: lng || undefined,
            radius_km: 20,
          },
        });
        setTrainers(response.data);
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
    } finally {
      setLoading(false);
    }
  }, [city, apartment, workout, lat, lng, apartmentId]);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  useEffect(() => {
    let cancelled = false;
    const loadApartments = async () => {
      if (!apartment || apartment.trim().length < 1) {
        setApartmentOptions([]);
        return;
      }
      try {
        const { data } = await axios.get(`${API}/locality/apartments`, {
          params: { q: apartment, city: city || undefined, limit: 8 },
        });
        if (!cancelled) setApartmentOptions(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) setApartmentOptions([]);
      }
    };
    loadApartments();
    return () => {
      cancelled = true;
    };
  }, [apartment, city]);

  const locateUser = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(Number(pos.coords.latitude).toFixed(6)));
        setLng(String(Number(pos.coords.longitude).toFixed(6)));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const sendInvitation = async (trainerId) => {
    if (!user || user.role !== 'user') {
      toast.error('Please login as user to invite a trainer');
      navigate('/login');
      return;
    }
    if (!apartmentId) {
      toast.error('Please select an apartment/locality from suggestions first');
      return;
    }
    const date = window.prompt('Enter class date (YYYY-MM-DD):');
    if (!date) return;
    const start = window.prompt('Enter start time (HH:MM)', '06:00');
    if (!start) return;
    const end = window.prompt('Enter end time (HH:MM)', '07:00');
    if (!end) return;
    setSendingInviteId(trainerId);
    try {
      await axios.post(`${API}/locality/invitations`, {
        trainer_id: trainerId,
        apartment_id: apartmentId,
        date,
        start_time: start,
        end_time: end,
        amount: Number(
          trainers.find((t) => t.trainer_id === trainerId)?.hourly_rate || 0
        ),
        workout: workout || null,
        note: `Invite from ${apartment}`,
      });
      toast.success('Invitation sent to trainer');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not send invitation');
    } finally {
      setSendingInviteId('');
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
        <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Hyderabad"
                className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Apartment / Locality</label>
              <input
                value={apartment}
                onChange={(e) => {
                  const next = e.target.value;
                  setApartment(next);
                  const matched = apartmentOptions.find((a) => `${a.name} (${a.locality})` === next);
                  setApartmentId(matched?.apartment_id || '');
                }}
                placeholder="Aparna, Gachibowli..."
                className="h-10 rounded-md border border-zinc-300 px-3 text-sm min-w-[200px]"
                list="apartment-suggestions"
              />
              <datalist id="apartment-suggestions">
                {apartmentOptions.map((a) => (
                  <option key={a.apartment_id} value={`${a.name} (${a.locality})`} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Workout</label>
              <input
                value={workout}
                onChange={(e) => setWorkout(e.target.value)}
                placeholder="Strength, Yoga..."
                className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
              />
            </div>
            <Button
              type="button"
              onClick={locateUser}
              variant="outline"
              className="rounded-md border-zinc-300 bg-white"
            >
              {locating ? 'Locating...' : 'Use my location'}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Select city/apartment or use location to see nearby trainers only.
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
              <div key={trainer.trainer_id} className="space-y-2">
                <TrainerShowcaseCard
                  trainer={trainer}
                  variant="grid"
                  onClick={() => navigate(`/trainers/${trainer.trainer_id}`)}
                  data-testid={`trainer-card-${trainer.trainer_id}`}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => sendInvitation(trainer.trainer_id)}
                  disabled={sendingInviteId === trainer.trainer_id}
                >
                  {sendingInviteId === trainer.trainer_id ? 'Sending invite...' : 'Invite trainer for this locality'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trainers;
