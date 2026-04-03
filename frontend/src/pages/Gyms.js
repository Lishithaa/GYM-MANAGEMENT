import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell, MapPin, Star, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { API } from '@/config';

const Gyms = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gyms, setGyms] = useState([]);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCities = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/cities`);
      setCities(response.data.cities);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  }, []);

  const fetchAreas = useCallback(async (city) => {
    try {
      const response = await axios.get(`${API}/areas/${city}`);
      setAreas(response.data.areas);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  }, []);

  const fetchGyms = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCity && selectedCity !== '_all') params.city = selectedCity;
      if (selectedArea && selectedArea !== '_all') params.area = selectedArea;

      const response = await axios.get(`${API}/gyms`, { params });
      setGyms(response.data);
    } catch (error) {
      console.error('Error fetching gyms:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedArea]);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  useEffect(() => {
    if (selectedCity && selectedCity !== '_all') {
      setSelectedArea('');
      fetchAreas(selectedCity);
    } else {
      setAreas([]);
      setSelectedArea('');
    }
  }, [selectedCity, fetchAreas]);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/gyms" className="text-sm font-medium text-blue-600" data-testid="nav-gyms-link">
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
            Browse Gyms
          </h1>
          <p className="text-lg font-['Manrope'] text-zinc-600">
            Find the perfect gym near you
          </p>
        </div>

        <div className="flex gap-4 mb-8">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[200px]" data-testid="city-select">
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCity && selectedCity !== '_all' && (
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="w-[200px]" data-testid="area-select">
                <SelectValue placeholder="Select Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Areas</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-zinc-600">Loading gyms...</p>
          </div>
        ) : gyms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600">No gyms found. Try different filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gyms.map((gym) => (
              <Card
                key={gym.gym_id}
                className="border-zinc-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/gyms/${gym.gym_id}`)}
                data-testid={`gym-card-${gym.gym_id}`}
              >
                <img
                  src={gym.photos[0]}
                  alt={gym.name}
                  className="w-full h-48 object-cover"
                />
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold font-['Outfit'] mb-2">{gym.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{gym.area}, {gym.city}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {gym.rating > 0 ? gym.rating.toFixed(1) : 'New'}
                    </span>
                    {gym.reviews_count > 0 && (
                      <span className="text-sm text-zinc-500">({gym.reviews_count})</span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    ₹{gym.hourly_rate}/hour
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

export default Gyms;
