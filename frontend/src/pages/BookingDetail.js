import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
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
          onClick={() => navigate('/dashboard')}
          variant="ghost"
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-zinc-200">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold font-['Outfit'] tracking-tight mb-6">
              Booking Confirmation
            </h1>

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
                <img
                  src={`data:image/png;base64,${booking.qr_code}`}
                  alt="Booking QR Code"
                  className="w-64 h-64 border-2 border-zinc-200 p-4"
                  data-testid="qr-code-image"
                />
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
