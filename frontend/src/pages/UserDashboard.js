import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dumbbell, Calendar, LogOut, Star, Gift, MessageSquareWarning, Pencil, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

const USER_AVATAR_FALLBACK =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="36" r="16" fill="#a1a1aa"/><path d="M24 78c4-16 44-16 48 0" fill="#a1a1aa"/></svg>'
  );

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, checkAuth } = useAuth();
  const profilePhotoInputRef = useRef(null);
  const [bookings, setBookings] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState({
    target_id: '',
    target_type: '',
    rating: 5,
    comment: ''
  });
  const [complaintMine, setComplaintMine] = useState({ filed_by_me: [], about_me: [] });
  const [complaintForm, setComplaintForm] = useState({
    about_trainer_id: '',
    subject: '',
    body: ''
  });
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [userProfileForm, setUserProfileForm] = useState({ name: '', phone: '', picture: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [myInvitations, setMyInvitations] = useState([]);
  const { notifications, unreadCount, markRead } = useRealtimeNotifications(user?.role === 'user');

  const fetchMyComplaints = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/complaints/mine`);
      setComplaintMine({
        filed_by_me: data?.filed_by_me || [],
        about_me: data?.about_me || []
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/bookings`, {
        withCredentials: true
      });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, []);

  const fetchMyInvitations = useCallback(async () => {
    if (user?.role !== 'user') return;
    try {
      const { data } = await axios.get(`${API}/locality/invitations/mine`);
      setMyInvitations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, [user?.role]);

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
    if (user?.role === 'user') {
      fetchBookings();
      fetchMyInvitations();
    }
  }, [user, navigate, fetchBookings, fetchMyInvitations]);

  useEffect(() => {
    if (user?.role !== 'user' || !user?.user_id) return;
    checkAuth();
    fetchMyComplaints();
  }, [user?.user_id, user?.role, checkAuth, fetchMyComplaints]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const openProfileEdit = () => {
    if (!user) return;
    setUserProfileForm({
      name: user.name || '',
      phone: user.phone || '',
      picture: user.picture || ''
    });
    setShowProfileEdit(true);
  };

  const onProfilePhotoDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onProfilePhotoDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadUserProfilePhoto(file);
  };

  const uploadUserProfilePhoto = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Choose an image file (JPEG, PNG, WebP, or GIF)');
      return;
    }
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post(`${API}/auth/me/photo`, fd);
      setUserProfileForm((f) => ({ ...f, picture: data.picture || '' }));
      await checkAuth();
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Upload failed'));
    } finally {
      setPhotoUploading(false);
    }
  };

  const saveUserProfile = async (e) => {
    e.preventDefault();
    if (!userProfileForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setProfileSaving(true);
    try {
      await axios.patch(`${API}/auth/me`, {
        name: userProfileForm.name.trim(),
        phone: userProfileForm.phone.trim() || null,
        picture: userProfileForm.picture.trim() || null
      });
      await checkAuth();
      toast.success('Profile saved');
      setShowProfileEdit(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save profile'));
    } finally {
      setProfileSaving(false);
    }
  };

  const copyReferralLink = () => {
    const code = user?.referral_code || '';
    if (!code) return;
    const url = `${window.location.origin}/login?ref=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    toast.success('Referral link copied');
  };

  const submitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintForm.about_trainer_id || !complaintForm.subject.trim() || !complaintForm.body.trim()) {
      toast.error('Choose a trainer and fill subject and details');
      return;
    }
    try {
      await axios.post(`${API}/complaints`, {
        about_trainer_id: complaintForm.about_trainer_id,
        subject: complaintForm.subject.trim(),
        body: complaintForm.body.trim()
      });
      toast.success('Complaint submitted');
      setComplaintForm({ about_trainer_id: '', subject: '', body: '' });
      fetchMyComplaints();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not submit');
    }
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

  const startOfToday = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  };

  const upcomingBookings = bookings.filter((b) => {
    const d = new Date(b.date);
    d.setHours(0, 0, 0, 0);
    if (d < startOfToday()) return false;
    return b.status === 'confirmed' || b.status === 'initiated';
  });

  const pastBookings = bookings.filter((b) => {
    if (b.status === 'completed' || b.status === 'cancelled') return true;
    const d = new Date(b.date);
    d.setHours(0, 0, 0, 0);
    return d < startOfToday();
  });

  const trainerIdsFromBookings = [
    ...new Set(bookings.filter((b) => b.target_type === 'trainer').map((b) => b.target_id))
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')} data-testid="logo-link">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 -ml-2 text-left outline-none transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  data-testid="user-menu-trigger"
                  aria-label="Account menu"
                >
                  <img
                    src={user?.picture || USER_AVATAR_FALLBACK}
                    alt=""
                    className="w-10 h-10 rounded-full border-2 border-zinc-200 object-cover bg-zinc-100 pointer-events-none"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = USER_AVATAR_FALLBACK;
                    }}
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-zinc-600 truncate max-w-[200px] sm:max-w-[240px]">{user?.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={openProfileEdit} data-testid="edit-profile-button">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="upcoming" data-testid="upcoming-tab">Upcoming Bookings</TabsTrigger>
            <TabsTrigger value="past" data-testid="past-tab">Past Bookings</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="support">Complaints</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="notifications">Notifications ({unreadCount})</TabsTrigger>
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
                    Select Apartment & Browse Trainers
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
                      <p className="text-sm text-zinc-600 mb-2">
                        <strong>Amount:</strong> ₹{booking.amount}
                      </p>
                      {booking.status === 'initiated' && (
                        <p className="text-xs text-amber-700 mb-3">Payment pending — finish checkout or cancel this hold.</p>
                      )}
                      <Button
                        onClick={() => navigate(`/booking/${booking.booking_id}`)}
                        className="w-full bg-black text-white hover:bg-zinc-800 rounded-md"
                        size="sm"
                        data-testid={`view-booking-${booking.booking_id}`}
                      >
                        {booking.status === 'initiated' ? 'View / manage' : 'View QR Code'}
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

          <TabsContent value="referrals" className="mt-6">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Invite friends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-600">
                  Share your code so new members can sign up with your referral. You will see how many people joined
                  using your link.
                </p>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Your code</p>
                  <p className="text-2xl font-mono font-bold">{user?.referral_code || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Successful referrals</p>
                  <p className="text-xl font-semibold">{user?.referrals_count ?? 0}</p>
                </div>
                <Button type="button" variant="outline" onClick={copyReferralLink} disabled={!user?.referral_code}>
                  Copy invite link
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="mt-6 space-y-8">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareWarning className="w-5 h-5" />
                  Report an issue about a trainer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitComplaint} className="space-y-4 max-w-lg">
                  <div>
                    <Label>Trainer (from your bookings)</Label>
                    <Select
                      value={complaintForm.about_trainer_id}
                      onValueChange={(v) => setComplaintForm({ ...complaintForm, about_trainer_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trainer ID" />
                      </SelectTrigger>
                      <SelectContent>
                        {trainerIdsFromBookings.map((tid) => (
                          <SelectItem key={tid} value={tid}>
                            {tid}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {trainerIdsFromBookings.length === 0 ? (
                      <p className="text-xs text-zinc-500 mt-1">Book a trainer first to enable this form.</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="csub">Subject</Label>
                    <Input
                      id="csub"
                      value={complaintForm.subject}
                      onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cbody">Details</Label>
                    <Textarea
                      id="cbody"
                      rows={4}
                      value={complaintForm.body}
                      onChange={(e) => setComplaintForm({ ...complaintForm, body: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-md">
                    Submit complaint
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-zinc-200">
                <CardHeader>
                  <CardTitle className="text-base">Filed by you</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {(complaintMine.filed_by_me || []).length === 0 ? (
                    <p className="text-zinc-500">None yet</p>
                  ) : (
                    complaintMine.filed_by_me.map((c) => (
                      <div key={c.complaint_id} className="border-b border-zinc-100 pb-2">
                        <p className="font-medium">{c.subject}</p>
                        <p className="text-zinc-600 text-xs capitalize">Status: {c.status}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="border-zinc-200">
                <CardHeader>
                  <CardTitle className="text-base">About you</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {(complaintMine.about_me || []).length === 0 ? (
                    <p className="text-zinc-500">None</p>
                  ) : (
                    complaintMine.about_me.map((c) => (
                      <div key={c.complaint_id} className="border-b border-zinc-100 pb-2">
                        <p className="font-medium">{c.subject}</p>
                        <p className="text-zinc-600 text-xs capitalize">Status: {c.status}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invitations" className="mt-6">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>Trainer invitations</CardTitle>
              </CardHeader>
              <CardContent>
                {myInvitations.length === 0 ? (
                  <p className="text-sm text-zinc-600">No invitations sent yet.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {myInvitations.map((inv) => (
                      <li key={inv.invitation_id} className="rounded border border-zinc-200 p-3">
                        <p>
                          {inv.date} {inv.start_time} - {inv.end_time}
                        </p>
                        <p className="text-zinc-600">Status: {inv.status}</p>
                        {inv.booking_id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => navigate(`/booking/${inv.booking_id}`)}
                          >
                            View class details
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>Realtime notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-sm text-zinc-600">No notifications yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {notifications.map((n) => (
                      <li key={n.notification_id} className="rounded border border-zinc-200 p-3">
                        <p className="font-medium">{n.title}</p>
                        <p className="text-sm text-zinc-600">{n.body}</p>
                        {!n.is_read ? (
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => markRead(n.notification_id)}>
                            Mark read
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showProfileEdit} onOpenChange={setShowProfileEdit}>
        <DialogContent className="max-h-[90vh] flex flex-col" aria-describedby="user-profile-edit-desc">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <p id="user-profile-edit-desc" className="sr-only">
            Update your name, phone, profile photo, or picture URL
          </p>
          <form onSubmit={saveUserProfile} className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            <div>
              <Label>Profile photo</Label>
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (f) uploadUserProfilePhoto(f);
                  ev.target.value = '';
                }}
              />
              <button
                type="button"
                onDragOver={onProfilePhotoDragOver}
                onDrop={onProfilePhotoDrop}
                onClick={() => profilePhotoInputRef.current?.click()}
                disabled={photoUploading}
                className="mt-1 w-full rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-100 disabled:opacity-50"
              >
                <Upload className="w-7 h-7 mx-auto mb-2 text-zinc-400" />
                <span className="font-medium text-zinc-800">
                  {photoUploading ? 'Uploading…' : 'Drop a photo here or click to browse'}
                </span>
                <span className="block text-xs text-zinc-500 mt-1">JPEG, PNG, WebP or GIF · max 5MB</span>
              </button>
            </div>
            <div>
              <Label htmlFor="user-picture-url">Or picture URL (optional)</Label>
              <Input
                id="user-picture-url"
                value={userProfileForm.picture}
                onChange={(e) => setUserProfileForm({ ...userProfileForm, picture: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label htmlFor="user-edit-name">Name</Label>
              <Input
                id="user-edit-name"
                value={userProfileForm.name}
                onChange={(e) => setUserProfileForm({ ...userProfileForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="user-edit-phone">Phone (optional)</Label>
              <Input
                id="user-edit-phone"
                value={userProfileForm.phone}
                onChange={(e) => setUserProfileForm({ ...userProfileForm, phone: e.target.value })}
                placeholder="+91…"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="bg-zinc-50 text-zinc-500" readOnly />
              <p className="text-xs text-zinc-500 mt-1">Email cannot be changed here.</p>
            </div>
            <DialogFooter className="gap-2 sm:justify-end pt-2 border-t border-zinc-200">
              <Button type="button" variant="outline" onClick={() => setShowProfileEdit(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-black text-white hover:bg-zinc-800" disabled={profileSaving}>
                {profileSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
