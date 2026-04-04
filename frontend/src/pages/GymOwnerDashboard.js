import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell, LogOut, Building2, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';
import { TrainerShowcaseCard } from '@/components/TrainerShowcaseCard';

const GymOwnerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [myGym, setMyGym] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [earnings, setEarnings] = useState({ total: 0, monthly: 0 });
  const [showGymForm, setShowGymForm] = useState(false);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [gymForm, setGymForm] = useState({
    name: '',
    city: '',
    area: '',
    description: '',
    photos: '',
    amenities: '',
    hourly_rate: ''
  });

  const fetchCities = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/cities`);
      setCities(response.data.cities);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  }, []);

  const fetchAreas = async (city) => {
    try {
      const response = await axios.get(`${API}/areas/${city}`);
      setAreas(response.data.areas);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const fetchMyGym = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/gym-owner/my-gym`, {
        withCredentials: true
      });
      if (response.data) {
        setMyGym(response.data);
      }
    } catch (error) {
      console.error('Error fetching gym:', error);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/gym-owner/bookings`, {
        withCredentials: true
      });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, []);

  const fetchTrainers = useCallback(async () => {
    if (!myGym) return;
    try {
      const response = await axios.get(`${API}/trainers?gym_id=${myGym.gym_id}`);
      setTrainers(response.data);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  }, [myGym]);

  const calculateEarnings = useCallback(() => {
    const total = bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.amount, 0);
    
    const currentMonth = new Date().getMonth();
    const monthly = bookings
      .filter(b => {
        const bookingMonth = new Date(b.created_at).getMonth();
        return bookingMonth === currentMonth && b.status === 'confirmed';
      })
      .reduce((sum, b) => sum + b.amount, 0);

    setEarnings({ total, monthly });
  }, [bookings]);

  useEffect(() => {
    if (user?.role !== 'gym_owner') {
      navigate('/dashboard');
      return;
    }
    fetchMyGym();
    fetchCities();
  }, [user, navigate, fetchMyGym, fetchCities]);

  useEffect(() => {
    if (myGym) {
      fetchBookings();
      fetchTrainers();
    }
  }, [myGym, fetchBookings, fetchTrainers]);

  useEffect(() => {
    calculateEarnings();
  }, [calculateEarnings]);

  const handleCreateGym = async (e) => {
    e.preventDefault();
    try {
      const photos = gymForm.photos.split(',').map(p => p.trim());
      const amenities = gymForm.amenities.split(',').map(a => a.trim());

      await axios.post(
        `${API}/gyms`,
        {
          ...gymForm,
          photos,
          amenities,
          hourly_rate: parseFloat(gymForm.hourly_rate)
        },
        { withCredentials: true }
      );

      toast.success('Gym created! Waiting for admin approval.');
      setShowGymForm(false);
      fetchMyGym();
    } catch (error) {
      console.error('Error creating gym:', error);
      toast.error('Failed to create gym');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
            <span className="text-sm text-zinc-500 ml-2">Gym Owner</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" data-testid="logout-button">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-8">
          Gym Owner Dashboard
        </h1>

        {!myGym ? (
          <Card className="border-zinc-200">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
              <h3 className="text-xl font-bold mb-2">No Gym Listed</h3>
              <p className="text-zinc-600 mb-6">Create your gym profile to start receiving bookings</p>
              <Button
                onClick={() => setShowGymForm(true)}
                className="bg-black text-white hover:bg-zinc-800 rounded-md"
                data-testid="create-gym-button"
              >
                Create Gym Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-zinc-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-zinc-600">Total Earnings</p>
                  </div>
                  <p className="text-3xl font-bold">₹{earnings.total}</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-zinc-600">This Month</p>
                  </div>
                  <p className="text-3xl font-bold">₹{earnings.monthly}</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <p className="text-sm text-zinc-600">Total Bookings</p>
                  </div>
                  <p className="text-3xl font-bold">{bookings.length}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="gym" className="w-full">
              <TabsList>
                <TabsTrigger value="gym">Gym Profile</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="trainers">Trainers</TabsTrigger>
              </TabsList>

              <TabsContent value="gym" className="mt-6">
                <Card className="border-zinc-200">
                  <CardHeader>
                    <CardTitle>{myGym.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-zinc-600">Location</p>
                        <p className="font-medium">{myGym.area}, {myGym.city}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-600">Hourly Rate</p>
                        <p className="font-medium">₹{myGym.hourly_rate}/hour</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-600">Status</p>
                        <p className="font-medium capitalize">
                          {myGym.approved ? 'Approved' : 'Pending Approval'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-600">Description</p>
                        <p>{myGym.description}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-600">Amenities</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {myGym.amenities.map((amenity, idx) => (
                            <span key={idx} className="px-3 py-1 bg-zinc-100 rounded-md text-sm">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bookings" className="mt-6">
                {bookings.length === 0 ? (
                  <Card className="border-zinc-200">
                    <CardContent className="p-12 text-center">
                      <p className="text-zinc-600">No bookings yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.booking_id} className="border-zinc-200">
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-zinc-600">Date</p>
                              <p className="font-medium">{booking.date}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-600">Time</p>
                              <p className="font-medium">{booking.start_time} - {booking.end_time}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-600">Amount</p>
                              <p className="font-medium">₹{booking.amount}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-600">Status</p>
                              <p className="font-medium capitalize">{booking.status}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trainers" className="mt-6">
                {trainers.length === 0 ? (
                  <Card className="border-zinc-200">
                    <CardContent className="p-12 text-center">
                      <p className="text-zinc-600">No trainers at your gym yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {trainers.map((trainer) => (
                      <div key={trainer.trainer_id} className="space-y-2">
                        <TrainerShowcaseCard trainer={trainer} variant="compact" />
                        <p className="text-xs text-zinc-600 text-center">
                          {trainer.approved ? 'Approved' : 'Pending approval'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <Dialog open={showGymForm} onOpenChange={setShowGymForm}>
        <DialogContent className="max-w-2xl" aria-describedby="gym-form-description">
          <DialogHeader>
            <DialogTitle>Create Gym Profile</DialogTitle>
          </DialogHeader>
          <p id="gym-form-description" className="sr-only">Fill in your gym details</p>
          <form onSubmit={handleCreateGym} className="space-y-4">
            <div>
              <Label>Gym Name</Label>
              <Input
                value={gymForm.name}
                onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Select
                  value={gymForm.city}
                  onValueChange={(val) => {
                    setGymForm({ ...gymForm, city: val });
                    fetchAreas(val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Area</Label>
                <Select
                  value={gymForm.area}
                  onValueChange={(val) => setGymForm({ ...gymForm, area: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={gymForm.description}
                onChange={(e) => setGymForm({ ...gymForm, description: e.target.value })}
                rows={3}
                required
              />
            </div>
            <div>
              <Label>Photo URLs (comma-separated)</Label>
              <Input
                value={gymForm.photos}
                onChange={(e) => setGymForm({ ...gymForm, photos: e.target.value })}
                placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                required
              />
            </div>
            <div>
              <Label>Amenities (comma-separated)</Label>
              <Input
                value={gymForm.amenities}
                onChange={(e) => setGymForm({ ...gymForm, amenities: e.target.value })}
                placeholder="Free Weights, Cardio, Locker Rooms"
                required
              />
            </div>
            <div>
              <Label>Hourly Rate (₹)</Label>
              <Input
                type="number"
                value={gymForm.hourly_rate}
                onChange={(e) => setGymForm({ ...gymForm, hourly_rate: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-black text-white hover:bg-zinc-800 rounded-md">
              Create Gym
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GymOwnerDashboard;
