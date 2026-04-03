import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell, MapPin, Star, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GymDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gym, setGym] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: '',
    start_time: '',
    end_time: ''
  });
  const [loading, setLoading] = useState(true);

  const fetchGymDetails = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/gyms/${id}`);
      setGym(response.data);
    } catch (error) {
      console.error('Error fetching gym:', error);
      toast.error('Failed to load gym details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTrainers = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/trainers`, {
        params: { gym_id: id }
      });
      setTrainers(response.data);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  }, [id]);

  const fetchReviews = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/reviews/gym/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchGymDetails();
    fetchTrainers();
    fetchReviews();
  }, [fetchGymDetails, fetchTrainers, fetchReviews]);

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

    const amount = gym.hourly_rate * hours;

    try {
      const response = await axios.post(
        `${API}/bookings`,
        {
          target_id: id,
          target_type: 'gym',
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

  if (!gym) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Gym not found</p>
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
          onClick={() => navigate('/gyms')}
          variant="ghost"
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Gyms
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <img
              src={gym.photos[0]}
              alt={gym.name}
              className="w-full h-96 object-cover rounded-md border border-zinc-200 mb-6"
            />

            <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-4">
              {gym.name}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2 text-zinc-600">
                <MapPin className="w-5 h-5" />
                <span>{gym.area}, {gym.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">
                  {gym.rating > 0 ? gym.rating.toFixed(1) : 'New'}
                </span>
                {gym.reviews_count > 0 && (
                  <span className="text-zinc-500">({gym.reviews_count} reviews)</span>
                )}
              </div>
            </div>

            <p className="text-lg font-['Manrope'] leading-relaxed text-zinc-700 mb-8">
              {gym.description}
            </p>

            <div className="mb-8">
              <h3 className="text-xl font-bold font-['Outfit'] mb-4">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {gym.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-zinc-100 rounded-md text-sm font-medium"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>

            {trainers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold font-['Outfit'] mb-4">Trainers at this Gym</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trainers.map((trainer) => (
                    <Card
                      key={trainer.trainer_id}
                      className="border-zinc-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/trainers/${trainer.trainer_id}`)}
                      data-testid={`trainer-card-${trainer.trainer_id}`}
                    >
                      <CardContent className="p-4 flex gap-4">
                        <img
                          src={trainer.photo}
                          alt={trainer.user_id}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-bold">{trainer.specialty}</p>
                          <p className="text-sm text-zinc-600">₹{trainer.hourly_rate}/hour</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

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
                  ₹{gym.hourly_rate}/hour
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
            <DialogTitle>Book {gym.name}</DialogTitle>
          </DialogHeader>
          <p id="booking-dialog-description" className="sr-only">Select date and time to book this gym</p>
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

export default GymDetail;
