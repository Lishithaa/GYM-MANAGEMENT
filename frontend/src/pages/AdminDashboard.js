import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, LogOut, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pendingGyms, setPendingGyms] = useState([]);
  const [pendingTrainers, setPendingTrainers] = useState([]);
  const [stats, setStats] = useState(null);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/pending-approvals`, {
        withCredentials: true
      });
      setPendingGyms(response.data.gyms);
      setPendingTrainers(response.data.trainers);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        withCredentials: true
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchPendingApprovals();
    fetchStats();
  }, [user, navigate, fetchPendingApprovals, fetchStats]);

  const approveItem = async (itemType, itemId) => {
    try {
      await axios.post(
        `${API}/admin/approve/${itemType}/${itemId}`,
        {},
        { withCredentials: true }
      );
      toast.success(`${itemType} approved!`);
      fetchPendingApprovals();
      fetchStats();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve');
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
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')} data-testid="logo-link">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym Admin</span>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-8">
          Admin Dashboard
        </h1>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-zinc-200">
              <CardContent className="p-6">
                <p className="text-sm text-zinc-600 mb-1">Total Gyms</p>
                <p className="text-3xl font-bold">{stats.total_gyms}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardContent className="p-6">
                <p className="text-sm text-zinc-600 mb-1">Total Trainers</p>
                <p className="text-3xl font-bold">{stats.total_trainers}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardContent className="p-6">
                <p className="text-sm text-zinc-600 mb-1">Total Bookings</p>
                <p className="text-3xl font-bold">{stats.total_bookings}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardContent className="p-6">
                <p className="text-sm text-zinc-600 mb-1">Active Cities</p>
                <p className="text-3xl font-bold">{stats.city_stats.length}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="gyms" className="w-full">
          <TabsList>
            <TabsTrigger value="gyms" data-testid="gyms-tab">
              Pending Gyms ({pendingGyms.length})
            </TabsTrigger>
            <TabsTrigger value="trainers" data-testid="trainers-tab">
              Pending Trainers ({pendingTrainers.length})
            </TabsTrigger>
            <TabsTrigger value="stats" data-testid="stats-tab">
              City Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gyms" className="mt-6">
            {pendingGyms.length === 0 ? (
              <Card className="border-zinc-200">
                <CardContent className="p-12 text-center">
                  <p className="text-zinc-600">No pending gym approvals</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingGyms.map((gym) => (
                  <Card key={gym.gym_id} className="border-zinc-200">
                    <CardHeader>
                      <CardTitle>{gym.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-600 mb-2">
                        <strong>Location:</strong> {gym.area}, {gym.city}
                      </p>
                      <p className="text-sm text-zinc-600 mb-2">
                        <strong>Rate:</strong> ₹{gym.hourly_rate}/hour
                      </p>
                      <p className="text-sm text-zinc-600 mb-4">
                        {gym.description.substring(0, 100)}...
                      </p>
                      <Button
                        onClick={() => approveItem('gym', gym.gym_id)}
                        className="w-full bg-green-600 text-white hover:bg-green-700 rounded-md"
                        data-testid={`approve-gym-${gym.gym_id}`}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trainers" className="mt-6">
            {pendingTrainers.length === 0 ? (
              <Card className="border-zinc-200">
                <CardContent className="p-12 text-center">
                  <p className="text-zinc-600">No pending trainer approvals</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingTrainers.map((trainer) => (
                  <Card key={trainer.trainer_id} className="border-zinc-200">
                    <CardHeader>
                      <CardTitle>{trainer.specialty} Trainer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-600 mb-2">
                        <strong>Rate:</strong> ₹{trainer.hourly_rate}/hour
                      </p>
                      <p className="text-sm text-zinc-600 mb-4">
                        {trainer.bio.substring(0, 100)}...
                      </p>
                      <Button
                        onClick={() => approveItem('trainer', trainer.trainer_id)}
                        className="w-full bg-green-600 text-white hover:bg-green-700 rounded-md"
                        data-testid={`approve-trainer-${trainer.trainer_id}`}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            {stats && stats.city_stats.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.city_stats.map((city) => (
                  <Card key={city.city} className="border-zinc-200">
                    <CardHeader>
                      <CardTitle>{city.city}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-600 mb-2">
                        <strong>Gyms:</strong> {city.gyms}
                      </p>
                      <p className="text-sm text-zinc-600">
                        <strong>Bookings:</strong> {city.bookings}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-zinc-200">
                <CardContent className="p-12 text-center">
                  <p className="text-zinc-600">No city data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
