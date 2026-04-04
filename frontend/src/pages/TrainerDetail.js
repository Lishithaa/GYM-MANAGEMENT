import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Dumbbell, Star, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';
import { goBack } from '@/utils/goBack';
import { TrainerShowcaseCard } from '@/components/TrainerShowcaseCard';
import { BookingScheduleFields, parseBookingScheduleForm } from '@/components/BookingScheduleFields';
import { openRazorpayAndConfirm, sessionDurationHours } from '@/utils/razorpayCheckout';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

const TrainerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trainer, setTrainer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  /** Remount booking form on each open — Safari + controlled type="time"/"date" often leaves real DOM values empty. */
  const [bookingFormKey, setBookingFormKey] = useState(0);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const openBookingDialog = () => {
    setBookingFormKey((k) => k + 1);
    setShowBooking(true);
  };
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
    if (!id) return;
    try {
      const { data } = await axios.get(`${API}/reviews`, {
        params: { target_type: 'trainer', target_id: id },
      });
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Could not load reviews');
      setReviews([]);
    }
  }, [id]);

  useEffect(() => {
    fetchTrainerDetails();
    fetchReviews();
  }, [fetchTrainerDetails, fetchReviews]);

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

    const amount = Math.round(Number(trainer.hourly_rate) * hours * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Could not compute session price — refresh the page and try again.');
      return;
    }

    setBookingSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/bookings`, {
        target_id: id,
        target_type: 'trainer',
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
        description: `Trainer session · ${trainer.specialty}`,
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
          onClick={() => goBack(navigate, '/trainers')}
          variant="ghost"
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-8">
              <TrainerShowcaseCard trainer={trainer} variant="hero" className="mb-6" />
              <p className="text-sm text-zinc-500 font-['Manrope']">
                {trainer.specialty}
                {trainer.city ? ` · ${trainer.area}, ${trainer.city}` : ''}
              </p>
            </div>

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
            <DialogTitle>Book Trainer Session</DialogTitle>
          </DialogHeader>
          <p id="booking-dialog-description" className="sr-only">Select date and time to book a training session</p>
          <form key={bookingFormKey} noValidate onSubmit={handleBookingSubmit} className="space-y-4">
            <BookingScheduleFields dateInputId="trainer-book-date" dateTestId="booking-date-input" />
            <p className="text-xs text-zinc-500">
              You will be redirected to Razorpay to complete payment. The booking is confirmed only after payment
              succeeds.
            </p>
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

export default TrainerDetail;
