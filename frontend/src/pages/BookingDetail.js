import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';
import { goBack } from '@/utils/goBack';

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/bookings/${id}`, {
        withCredentials: true
      });
      setBooking(response.data);
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const cancelInitiated = async () => {
    try {
      await axios.post(`${API}/bookings/${id}/cancel`);
      toast.success('Booking cancelled — slot released');
      fetchBooking();
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : 'Could not cancel');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Booking not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')} data-testid="logo-link">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </div>
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-black text-white hover:bg-zinc-800 rounded-md"
            data-testid="dashboard-button"
          >
            Dashboard
          </Button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <Button
          onClick={() => {
            const fallback =
              user?.role === 'trainer'
                ? '/trainer/dashboard'
                : user?.role === 'admin'
                  ? '/admin'
                  : '/dashboard';
            goBack(navigate, fallback);
          }}
          variant="ghost"
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="border-zinc-200">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold font-['Outfit'] tracking-tight mb-6">
              Booking Confirmation
            </h1>

            {booking.status === 'initiated' && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-medium">Payment not completed</p>
                <p className="mt-1 text-amber-800">
                  This slot is on hold until you finish Razorpay checkout. If you closed the payment window, cancel this
                  hold and book again.
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={cancelInitiated}>
                  Cancel unpaid booking
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-sm text-zinc-600 mb-2">Booking Type</p>
                <p className="text-lg font-bold capitalize">{booking.target_type} Booking</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2">Status</p>
                <p className="text-lg font-bold capitalize">{booking.status}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2">Date</p>
                <p className="text-lg font-bold">{booking.date}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2">Time</p>
                <p className="text-lg font-bold">{booking.start_time} - {booking.end_time}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2">Amount Paid</p>
                <p className="text-lg font-bold text-blue-600">₹{booking.amount}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600 mb-2">Payment ID</p>
                <p className="text-sm font-mono">{booking.payment_id}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-md border border-zinc-200 text-center">
              <h2 className="text-xl font-bold font-['Outfit'] mb-4">
                Check-in QR Code
              </h2>
              <p className="text-sm text-zinc-600 mb-6">
                Show this QR code at the gym for check-in
              </p>
              <div className="flex justify-center mb-4">
                {booking.qr_code ? (
                  <img
                    src={`data:image/png;base64,${booking.qr_code}`}
                    alt="Booking QR Code"
                    className="w-64 h-64 border-2 border-zinc-200 p-4"
                    data-testid="qr-code-image"
                  />
                ) : (
                  <p className="text-sm text-zinc-500">QR not available for this booking.</p>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-mono">{booking.booking_id}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingDetail;
