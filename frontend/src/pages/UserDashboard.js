import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dumbbell, Calendar, LogOut, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState({
    target_id: '',
    target_type: '',
    rating: 5,
    comment: ''
  });

  useEffect(() => {
    if (user?.role && user.role !== 'user') {
      const dashboardMap = {
        trainer: '/trainer/dashboard',
        gym_owner: '/gym-owner/dashboard',
        admin: '/admin'
      };
      navigate(dashboardMap[user.role] || '/dashboard');
      return;
    }
    fetchBookings();
  }, [user, navigate]);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`, {
        withCredentials: true
      });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const openReviewDialog = (targetId, targetType) => {
    setReviewData({
      target_id: targetId,
      target_type: targetType,
      rating: 5,
      comment: ''
    });
    setShowReview(true);
  };

  const submitReview = async () => {
    if (!reviewData.comment) {
      toast.error('Please write a review comment');
      return;
    }

    try {
      await axios.post(
        `${API}/reviews`,
        reviewData,
        { withCredentials: true }
      );
      toast.success('Review submitted!');
      setShowReview(false);
    } catch (error) {
      console.error('Review error:', error);
      toast.error('Failed to submit review');
    }
  };

  const upcomingBookings = bookings.filter((b) => {
    const bookingDate = new Date(b.date);
    return bookingDate >= new Date() && b.status === 'confirmed';
  });

  const pastBookings = bookings.filter((b) => {
    const bookingDate = new Date(b.date);
    return bookingDate < new Date() || b.status !== 'confirmed';
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')} data-testid="logo-link">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={user?.picture || 'https://via.placeholder.com/40'}
                alt={user?.name}
                className="w-10 h-10 rounded-full border-2 border-zinc-200"
              />
              <div>
                <p className="font-bold text-sm">{user?.name}</p>
                <p className="text-xs text-zinc-600">{user?.email}</p>
              </div>
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
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-8">
          My Dashboard
        </h1>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming" data-testid="upcoming-tab">Upcoming Bookings</TabsTrigger>
            <TabsTrigger value="past" data-testid="past-tab">Past Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingBookings.length === 0 ? (
              <Card className="border-zinc-200">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                  <p className="text-zinc-600 mb-4">No upcoming bookings</p>
                  <Button
                    onClick={() => navigate('/trainers')}
                    className="bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                    data-testid="browse-trainers-button"
                  >
                    Browse Trainers
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingBookings.map((booking) => (
                  <Card key={booking.booking_id} className="border-zinc-200">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {booking.target_type === 'gym' ? 'Gym' : 'Trainer'} Booking
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-600 mb-2">
                        <strong>Date:</strong> {booking.date}
                      </p>
                      <p className="text-sm text-zinc-600 mb-2">
                        <strong>Time:</strong> {booking.start_time} - {booking.end_time}
                      </p>
                      <p className="text-sm text-zinc-600 mb-4">
                        <strong>Amount:</strong> ₹{booking.amount}
                      </p>
                      <Button
                        onClick={() => navigate(`/booking/${booking.booking_id}`)}
                        className="w-full bg-black text-white hover:bg-zinc-800 rounded-md"
                        size="sm"
                        data-testid={`view-booking-${booking.booking_id}`}
                      >
                        View QR Code
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastBookings.length === 0 ? (
              <Card className="border-zinc-200">
                <CardContent className="p-12 text-center">
                  <p className="text-zinc-600">No past bookings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastBookings.map((booking) => (
                  <Card key={booking.booking_id} className="border-zinc-200">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {booking.target_type === 'gym' ? 'Gym' : 'Trainer'} Booking
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-600 mb-2">
                        <strong>Date:</strong> {booking.date}
                      </p>
                      <p className="text-sm text-zinc-600 mb-2">
                        <strong>Time:</strong> {booking.start_time} - {booking.end_time}
                      </p>
                      <p className="text-sm text-zinc-600 mb-4">
                        <strong>Amount:</strong> ₹{booking.amount}
                      </p>
                      <Button
                        onClick={() => openReviewDialog(booking.target_id, booking.target_type)}
                        variant="outline"
                        className="w-full rounded-md"
                        size="sm"
                        data-testid={`rate-booking-${booking.booking_id}`}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Rate & Review
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent data-testid="review-dialog" aria-describedby="review-dialog-description">
          <DialogHeader>
            <DialogTitle>Rate & Review</DialogTitle>
          </DialogHeader>
          <p id="review-dialog-description" className="sr-only">Rate your experience and leave a review</p>
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewData({ ...reviewData, rating: star })}
                    data-testid={`rating-star-${star}`}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= reviewData.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-zinc-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                value={reviewData.comment}
                onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                placeholder="Share your experience..."
                rows={4}
                data-testid="review-comment-input"
              />
            </div>
            <Button
              onClick={submitReview}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              data-testid="submit-review-button"
            >
              Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;
