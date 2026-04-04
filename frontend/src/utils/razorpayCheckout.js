import axios from 'axios';
import { API } from '@/config';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve();
      return;
    }
    const src = 'https://checkout.razorpay.com/v1/checkout.js';
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      const done = () => resolve();
      if (window.Razorpay) {
        done();
        return;
      }
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => reject(new Error('Razorpay script load failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Razorpay script load failed'));
    document.body.appendChild(s);
  });
}

/** Duration in fractional hours from HTML time values (HH:MM). */
export function sessionDurationHours(startHHMM, endHHMM) {
  const toMin = (t) => {
    const raw = (t || '').trim();
    if (!raw) return NaN;
    const parts = raw.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (Number.isNaN(h)) return NaN;
    return h * 60 + (Number.isNaN(m) ? 0 : m);
  };
  const a = toMin(startHHMM);
  const b = toMin(endHHMM);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return (b - a) / 60;
}

/**
 * Opens Razorpay Checkout for an order created by POST /api/bookings, then verifies payment on the server.
 */
export async function openRazorpayAndConfirm({
  keyId,
  orderId,
  amountPaise,
  bookingId,
  userName,
  userEmail,
  description,
  navigate,
  toast,
}) {
  await loadRazorpayScript();
  const Rz = window.Razorpay;
  if (!Rz) {
    toast.error('Could not load payment widget. Check your network or ad blocker.');
    return;
  }

  const options = {
    key: keyId,
    amount: amountPaise,
    currency: 'INR',
    order_id: orderId,
    name: 'HourlyGym',
    description: description || 'Session booking',
    prefill: {
      name: userName || '',
      email: userEmail || '',
    },
    theme: { color: '#18181b' },
    handler: async function (response) {
      try {
        await axios.post(`${API}/bookings/${bookingId}/confirm-payment`, {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        toast.success('Payment successful — booking confirmed');
        if (navigate) navigate(`/booking/${bookingId}`);
      } catch (err) {
        console.error(err);
        toast.error(
          getApiErrorMessage(
            err,
            'Could not verify payment. If money was debited, contact support with your payment ID.'
          )
        );
      }
    },
  };

  const rzp = new Rz(options);
  rzp.on('payment.failed', function (resp) {
    toast.error(resp?.error?.description || 'Payment failed');
  });
  rzp.open();
}
