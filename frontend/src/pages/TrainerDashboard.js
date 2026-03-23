import React, { useState, useEffect } from 'react';
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
import { Dumbbell, LogOut, Users, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TrainerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [myProfile, setMyProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [earnings, setEarnings] = useState({ total: 0, monthly: 0 });
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    gym_id: '',
    bio: '',
    photo: '',
    specialty: '',
    hourly_rate: ''
  });

  useEffect(() => {
    if (user?.role !== 'trainer') {
      navigate('/dashboard');
      return;
    }
    fetchMyProfile();
    fetchGyms();
  }, [user]);

  useEffect(() => {
    if (myProfile) {
      fetchBookings();
      calculateEarnings();
    }
  }, [myProfile]);

  const fetchGyms = async () => {
    try {
      const response = await axios.get(`${API}/gyms`);
      setGyms(response.data);
    } catch (error) {
      console.error('Error fetching gyms:', error);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const response = await axios.get(`${API}/trainer/my-profile`, {
        withCredentials: true
      });
      if (response.data) {
        setMyProfile(response.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/trainer/bookings`, {
        withCredentials: true
      });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const calculateEarnings = () => {
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
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/trainers`,
        {
          ...profileForm,
          hourly_rate: parseFloat(profileForm.hourly_rate)
        },
        { withCredentials: true }
      );

      toast.success('Profile created! Waiting for admin approval.');
      setShowProfileForm(false);
      fetchMyProfile();
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
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
            <span className="text-sm text-zinc-500 ml-2">Trainer</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" data-testid="logout-button">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-8">
          Trainer Dashboard
        </h1>

        {!myProfile ? (
          <Card className="border-zinc-200">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
              <h3 className="text-xl font-bold mb-2">No Trainer Profile</h3>
              <p className="text-zinc-600 mb-6">Create your trainer profile to start offering sessions</p>
              <Button
                onClick={() => setShowProfileForm(true)}
                className="bg-black text-white hover:bg-zinc-800 rounded-md"
                data-testid="create-profile-button"
              >
                Create Trainer Profile
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
                    <p className="text-sm text-zinc-600">Total Sessions</p>
                  </div>
                  <p className="text-3xl font-bold">{bookings.length}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <Card className="border-zinc-200">
                  <CardHeader>
                    <CardTitle>{myProfile.specialty} Trainer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6">
                      <img
                        src={myProfile.photo}
                        alt={myProfile.specialty}
                        className="w-32 h-32 rounded-full object-cover"
                      />
                      <div className="space-y-4 flex-1">
                        <div>
                          <p className="text-sm text-zinc-600">Specialty</p>
                          <p className="font-medium">{myProfile.specialty}</p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-600">Hourly Rate</p>
                          <p className="font-medium">₹{myProfile.hourly_rate}/hour</p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-600">Status</p>
                          <p className="font-medium capitalize">
                            {myProfile.approved ? 'Approved' : 'Pending Approval'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-600">Bio</p>
                          <p>{myProfile.bio}</p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-600">Rating</p>
                          <p className="font-medium">
                            {myProfile.rating > 0 ? `${myProfile.rating} (${myProfile.reviews_count} reviews)` : 'No reviews yet'}
                          </p>
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
            </Tabs>
          </>
        )}
      </div>

      <Dialog open={showProfileForm} onOpenChange={setShowProfileForm}>
        <DialogContent className="max-w-2xl" aria-describedby="profile-form-description">
          <DialogHeader>
            <DialogTitle>Create Trainer Profile</DialogTitle>
          </DialogHeader>
          <p id="profile-form-description" className="sr-only">Fill in your trainer profile details</p>
          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div>
              <Label>Select Gym</Label>
              <Select
                value={profileForm.gym_id}
                onValueChange={(val) => setProfileForm({ ...profileForm, gym_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gym" />
                </SelectTrigger>
                <SelectContent>
                  {gyms.map((gym) => (
                    <SelectItem key={gym.gym_id} value={gym.gym_id}>
                      {gym.name} - {gym.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Specialty</Label>
              <Input
                value={profileForm.specialty}
                onChange={(e) => setProfileForm({ ...profileForm, specialty: e.target.value })}
                placeholder="e.g., Strength Training, Yoga, CrossFit"
                required
              />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                rows={3}
                placeholder="Tell clients about your experience and expertise"
                required
              />
            </div>
            <div>
              <Label>Photo URL</Label>
              <Input
                value={profileForm.photo}
                onChange={(e) => setProfileForm({ ...profileForm, photo: e.target.value })}
                placeholder="https://example.com/your-photo.jpg"
                required
              />
            </div>
            <div>
              <Label>Hourly Rate (₹)</Label>
              <Input
                type="number"
                value={profileForm.hourly_rate}
                onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-black text-white hover:bg-zinc-800 rounded-md">
              Create Profile
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerDashboard;
