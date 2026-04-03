import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell, Star, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TrainerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trainer, setTrainer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: '',
    start_time: '',
    end_time: ''
  });
  const [loading, setLoading] = useState(true);

  const fetchTrainerDetails = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/trainers/${id}`);
      setTrainer(response.data);
    } catch (error) {
      console.error('Error fetching trainer:', error);
      toast.error('Failed to load trainer details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReviews = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/reviews/trainer/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchTrainerDetails();
    fetchReviews();
  }, [fetchTrainerDetails, fetchReviews]);

  const handleBooking = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!bookingData.date || !bookingData.start_time || !bookingData.end_time) {
      toast.error('Please fill all booking details');
      return;
    }

    const startHour = parseInt(bookingData.start_time.split(':')[0]);
    const endHour = parseInt(bookingData.end_time.split(':')[0]);
    const hours = endHour - startHour;

    if (hours <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    const amount = trainer.hourly_rate * hours;

    try {
      const response = await axios.post(
        `${API}/bookings`,
        {
          target_id: id,
          target_type: 'trainer',
          date: bookingData.date,
          start_time: bookingData.start_time,
          end_time: bookingData.end_time,
          amount
        },
        { withCredentials: true }
      );

      toast.success('Booking confirmed!');
      navigate(`/booking/${response.data.booking_id}`);
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Booking failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Trainer not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')} data-testid="logo-link">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </div>
          {user && (
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-black text-white hover:bg-zinc-800 rounded-md"
              data-testid="nav-dashboard-button"
            >
              Dashboard
            </Button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Button
          onClick={() => navigate('/trainers')}
          variant="ghost"
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Trainers
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <img
              src={trainer.photo}
              alt={trainer.specialty}
              className="w-full h-96 object-cover rounded-md border border-zinc-200 mb-6"
            />

            <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-4">
              {trainer.specialty} Trainer
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">
                  {trainer.rating > 0 ? trainer.rating.toFixed(1) : 'New'}
                </span>
                {trainer.reviews_count > 0 && (
                  <span className="text-zinc-500">({trainer.reviews_count} reviews)</span>
                )}
              </div>
            </div>

            <p className="text-lg font-['Manrope'] leading-relaxed text-zinc-700 mb-8">
              {trainer.bio}
            </p>

            <div>
              <h3 className="text-xl font-bold font-['Outfit'] mb-4">Reviews</h3>
              {reviews.length === 0 ? (
                <p className="text-zinc-600">No reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.review_id} className="border-zinc-200">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold">{review.user_name}</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-zinc-700">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Card className="border-zinc-200 sticky top-24">
              <CardContent className="p-6">
                <p className="text-3xl font-bold text-blue-600 mb-6">
                  ₹{trainer.hourly_rate}/hour
                </p>
                <Button
                  onClick={() => setShowBooking(true)}
                  className="w-full bg-black text-white hover:bg-zinc-800 rounded-md"
                  size="lg"
                  data-testid="book-now-button"
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent data-testid="booking-dialog" aria-describedby="booking-dialog-description">
          <DialogHeader>
            <DialogTitle>Book Trainer Session</DialogTitle>
          </DialogHeader>
          <p id="booking-dialog-description" className="sr-only">Select date and time to book a training session</p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={bookingData.date}
                onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                data-testid="booking-date-input"
              />
            </div>
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={bookingData.start_time}
                onChange={(e) => setBookingData({ ...bookingData, start_time: e.target.value })}
                data-testid="booking-start-time-input"
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={bookingData.end_time}
                onChange={(e) => setBookingData({ ...bookingData, end_time: e.target.value })}
                data-testid="booking-end-time-input"
              />
            </div>
            <Button
              onClick={handleBooking}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              data-testid="confirm-booking-button"
            >
              Confirm Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerDetail;
