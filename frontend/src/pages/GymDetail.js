import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Dumbbell, MapPin, Star, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';
import { goBack } from '@/utils/goBack';
import { TrainerShowcaseCard } from '@/components/TrainerShowcaseCard';
import { BookingScheduleFields, parseBookingScheduleForm } from '@/components/BookingScheduleFields';
import { openRazorpayAndConfirm, sessionDurationHours } from '@/utils/razorpayCheckout';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

const GymDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gym, setGym] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingFormKey, setBookingFormKey] = useState(0);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const openBookingDialog = () => {
    setBookingFormKey((k) => k + 1);
    setShowBooking(true);
  };
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

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    const parsed = parseBookingScheduleForm(e.currentTarget);
    if (parsed.error) {
      toast.error(parsed.error);
      return;
    }
    const { date, start_time, end_time } = parsed;

    const hours = sessionDurationHours(start_time, end_time);
    if (hours <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    const amount = Math.round(Number(gym.hourly_rate) * hours * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Could not compute session price — refresh the page and try again.');
      return;
    }

    setBookingSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/bookings`, {
        target_id: id,
        target_type: 'gym',
        date,
        start_time,
        end_time,
        amount,
      });

      const { booking, razorpay_key_id, razorpay_order_id, amount: amountPaise } = data;
      if (!booking?.booking_id || !razorpay_key_id || !razorpay_order_id) {
        toast.error('Unexpected response from server');
        return;
      }

      await openRazorpayAndConfirm({
        keyId: razorpay_key_id,
        orderId: razorpay_order_id,
        amountPaise,
        bookingId: booking.booking_id,
        userName: user.name,
        userEmail: user.email,
        description: `Gym session · ${gym.name}`,
        navigate,
        toast,
      });
      setShowBooking(false);
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(getApiErrorMessage(error, 'Could not start booking. Please try again.'));
    } finally {
      setBookingSubmitting(false);
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
          onClick={() => goBack(navigate, '/gyms')}
          variant="ghost"
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {trainers.map((trainer) => (
                    <TrainerShowcaseCard
                      key={trainer.trainer_id}
                      trainer={trainer}
                      variant="compact"
                      onClick={() => navigate(`/trainers/${trainer.trainer_id}`)}
                      data-testid={`trainer-card-${trainer.trainer_id}`}
                    />
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
                  onClick={openBookingDialog}
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
          <form key={bookingFormKey} noValidate onSubmit={handleBookingSubmit} className="space-y-4">
            <BookingScheduleFields dateInputId="gym-book-date" dateTestId="booking-date-input" />
            <p className="text-xs text-zinc-500">Payment is completed with Razorpay before the booking is confirmed.</p>
            <Button
              type="submit"
              disabled={bookingSubmitting}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              data-testid="confirm-booking-button"
            >
              {bookingSubmitting ? 'Starting checkout…' : 'Pay with Razorpay'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GymDetail;
