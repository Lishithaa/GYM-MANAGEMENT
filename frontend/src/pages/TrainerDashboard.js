import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell, LogOut, Users, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';

const WHAT_YOU_TEACH_OPTIONS = [
  'Fat Loss',
  'Muscle & Strength Gaining',
  'Yoga',
  'Physiotherapy',
  'Running Coaching',
  'Calisthenics',
  'Dance Fitness',
  'Pregnancy Training',
  'Boxing Training',
  'Senior Citizen Mobility',
  'Fitness for Children',
  'Home Workouts'
];

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const parseCsv = (value) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const TrainerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [myProfile, setMyProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState({ total: 0, monthly: 0 });
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [onboardingId, setOnboardingId] = useState(null);
  const [onboardingPage, setOnboardingPage] = useState(1);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  /** From GET /trainers/me/verification-status — distinguishes submitted onboarding vs generic pending */
  const [verificationInfo, setVerificationInfo] = useState(null);
  const [profileForm, setProfileForm] = useState({
    city: '',
    area: '',
    gender: '',
    whatYouTeach: [],
    bio: '',
    experience_brief: '',
    photo: '',
    hourly_rate: '',
    service_areas_csv: '',
    travel_radius: '10',
    available_days: DAY_OPTIONS,
    availability_slots_csv: '06:00-07:00, 07:00-08:00',
    video_verification_url: '',
    aadhar_number: '',
    digilocker_kyc: false,
    pan_number: '',
    pan_upload_url: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    certifications: '',
    certification_upload_urls_csv: '',
    video_intro: '',
    declaration_accepted: false
  });

  const fetchMyProfile = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/trainers/me`);
      if (response.data) {
        setMyProfile(response.data);
      }
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error('Error fetching profile:', error);
      }
      setMyProfile(null);
    }
  }, []);

  const fetchVerificationStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/trainers/me/verification-status`);
      setVerificationInfo(data);
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error('Error fetching verification status:', error);
      }
      setVerificationInfo(null);
    }
  }, []);

  const fetchCities = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/cities`);
      setCities(response.data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  }, []);

  const fetchAreas = useCallback(async (city) => {
    if (!city) return;
    try {
      const response = await axios.get(`${API}/areas/${city}`);
      setAreas(response.data || []);
    } catch (error) {
      console.error('Error fetching areas:', error);
      setAreas([]);
    }
  }, []);

  const startOnboarding = useCallback(async () => {
    const response = await axios.post(`${API}/trainers/onboarding/start`);
    setOnboardingId(response.data.onboarding_id);
    return response.data.onboarding_id;
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/trainer/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, []);

  const calculateEarnings = useCallback(() => {
    const total = bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.amount, 0);
    
    const currentMonth = new Date().getMonth();
    const monthly = bookings
      .filter(b => {
        const bookingMonth = new Date(b.created_at).getMonth();
        return bookingMonth === currentMonth && b.status === 'confirmed';
      })
      .reduce((sum, b) => sum + b.amount, 0);

    setEarnings({ total, monthly });
  }, [bookings]);

  useEffect(() => {
    if (user?.role !== 'trainer') {
      navigate('/dashboard');
      return;
    }
    fetchMyProfile();
    fetchVerificationStatus();
    fetchCities();
  }, [user, navigate, fetchMyProfile, fetchVerificationStatus]);

  useEffect(() => {
    if (myProfile) {
      fetchBookings();
    }
  }, [myProfile, fetchBookings]);

  useEffect(() => {
    calculateEarnings();
  }, [calculateEarnings]);

  /** True once DB says approved — includes verification API so we are not stuck on stale /trainers/me. */
  const isTrainerApproved =
    Boolean(myProfile?.approved) ||
    verificationInfo?.approved === true ||
    verificationInfo?.onboarding_status === 'approved';

  useEffect(() => {
    if (user?.role !== 'trainer') return undefined;
    let debounceTimer;
    const refresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchMyProfile();
        fetchVerificationStatus();
      }, 400);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.role, fetchMyProfile, fetchVerificationStatus]);

  useEffect(() => {
    if (user?.role !== 'trainer' || !myProfile || myProfile.approved) return undefined;
    const id = setInterval(() => {
      fetchMyProfile();
      fetchVerificationStatus();
    }, 25000);
    return () => clearInterval(id);
  }, [user?.role, myProfile?.approved, myProfile?.trainer_id, fetchMyProfile, fetchVerificationStatus]);

  const handleOnboardingNext = async (e) => {
    e.preventDefault();
    if (!profileForm.city || !profileForm.area || profileForm.whatYouTeach.length === 0) {
      toast.error('Please fill city, area and what you teach');
      return;
    }

    setSubmitting(true);
    try {
      const id = onboardingId || (await startOnboarding());
      await axios.patch(`${API}/trainers/onboarding/${id}/step`, {
        step: 'basic_profile',
        basic_profile: {
          bio: profileForm.bio,
          specialty: profileForm.whatYouTeach.join(', '),
          experience_brief: profileForm.experience_brief || profileForm.bio,
          photo: profileForm.photo,
          city: profileForm.city,
          area: profileForm.area,
          hourly_rate: parseFloat(profileForm.hourly_rate || '0'),
          gender: profileForm.gender || 'unspecified',
          languages: ['English', 'Hindi']
        }
      });
      await axios.patch(`${API}/trainers/onboarding/${id}/step`, {
        step: 'availability',
        availability: {
          available_days: profileForm.available_days,
          availability_slots: parseCsv(profileForm.availability_slots_csv),
          travel_radius: parseInt(profileForm.travel_radius || '10', 10),
          service_areas: parseCsv(profileForm.service_areas_csv)
        }
      });
      setOnboardingPage(2);
      toast.success('Step 1 saved');
    } catch (error) {
      console.error('Onboarding step 1 error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to save step 1');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.declaration_accepted) {
      toast.error('Please accept declaration before submitting');
      return;
    }
    setSubmitting(true);
    try {
      const id = onboardingId || (await startOnboarding());
      await axios.patch(`${API}/trainers/onboarding/${id}/step`, {
        step: 'kyc',
        kyc: {
          aadhar_number: profileForm.aadhar_number,
          digilocker_kyc: profileForm.digilocker_kyc,
          pan_number: profileForm.pan_number,
          pan_upload_url: profileForm.pan_upload_url,
          video_verification_url: profileForm.video_verification_url
        }
      });
      await axios.patch(`${API}/trainers/onboarding/${id}/step`, {
        step: 'bank',
        bank: {
          bank_account_name: profileForm.bank_account_name,
          bank_account_number: profileForm.bank_account_number,
          bank_ifsc: profileForm.bank_ifsc
        }
      });
      await axios.patch(`${API}/trainers/onboarding/${id}/step`, {
        step: 'certificates',
        certificates: {
          certifications: profileForm.certifications,
          certification_upload_urls: parseCsv(profileForm.certification_upload_urls_csv),
          video_intro: profileForm.video_intro,
          photo_branding_enabled: true,
          declaration_accepted: profileForm.declaration_accepted
        }
      });
      await axios.post(`${API}/trainers/onboarding/${id}/submit`);
      toast.success('Onboarding submitted successfully. Awaiting admin approval.');
      setShowOnboardingForm(false);
      setOnboardingPage(1);
      fetchMyProfile();
      fetchVerificationStatus();
    } catch (error) {
      console.error('Onboarding submit error:', error);
      toast.error(error?.response?.data?.detail || 'Failed to submit onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const openOnboardingForRevision = async () => {
    try {
      const response = await axios.post(`${API}/trainers/onboarding/start`);
      setOnboardingId(response.data.onboarding_id);
      setOnboardingPage(1);
      setShowOnboardingForm(true);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not open onboarding');
    }
  };

  const trainerStatusCopy = () => {
    if (isTrainerApproved) {
      return {
        label: 'Approved',
        hint: 'You can accept bookings from clients.',
      };
    }
    const os = verificationInfo?.onboarding_status;
    if (verificationInfo?.rejected || os === 'rejected') {
      return {
        label: 'Application not approved',
        hint: verificationInfo?.admin_reason || 'Contact support if you need help.',
      };
    }
    if (os === 'under_review') {
      return {
        label: 'Awaiting admin review',
        hint:
          'You already submitted onboarding. An admin will review it shortly; you will be able to take bookings after approval.',
      };
    }
    if (os === 'rework_required') {
      return {
        label: 'Changes requested',
        hint: verificationInfo?.admin_reason || 'Please update your application and submit again.',
      };
    }
    if (os === 'draft' || os === 'submitted') {
      return {
        label: 'Onboarding in progress',
        hint: 'Finish all steps and submit so our team can review your profile.',
      };
    }
    return {
      label: 'Pending approval',
      hint: 'Your profile will go live after verification.',
    };
  };

  const statusBlock = myProfile ? trainerStatusCopy() : null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym</span>
            <span className="text-sm text-zinc-500 ml-2">Trainer</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" data-testid="logout-button">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-8">
          Trainer Dashboard
        </h1>

        {!myProfile ? (
          <Card className="border-zinc-200">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
              <h3 className="text-xl font-bold mb-2">No Trainer Profile</h3>
              <p className="text-zinc-600 mb-6">Complete onboarding to start offering sessions</p>
              <Button
                onClick={() => setShowOnboardingForm(true)}
                className="bg-black text-white hover:bg-zinc-800 rounded-md"
                data-testid="create-profile-button"
              >
                Start Trainer Onboarding
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {verificationInfo?.onboarding_status === 'under_review' && !isTrainerApproved && (
              <Card className="border-amber-200 bg-amber-50/80 mb-6">
                <CardContent className="p-4 text-sm text-amber-950">
                  <p className="font-semibold">Onboarding submitted</p>
                  <p className="text-amber-900/90 mt-1">
                    Your application is in the admin queue. You do not need to submit again unless we ask for changes.
                  </p>
                </CardContent>
              </Card>
            )}
            {verificationInfo?.onboarding_status === 'rework_required' && !isTrainerApproved && (
              <Card className="border-orange-200 bg-orange-50/80 mb-6">
                <CardContent className="p-4 text-sm text-orange-950 space-y-3">
                  <div>
                    <p className="font-semibold">Admin requested updates</p>
                    {verificationInfo.admin_reason ? (
                      <p className="text-orange-900/90 mt-1 whitespace-pre-wrap">{verificationInfo.admin_reason}</p>
                    ) : (
                      <p className="text-orange-900/90 mt-1">Please revise your onboarding and submit again.</p>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={openOnboardingForRevision}>
                    Revise application
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-zinc-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-zinc-600">Total Earnings</p>
                  </div>
                  <p className="text-3xl font-bold">₹{earnings.total}</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-zinc-600">This Month</p>
                  </div>
                  <p className="text-3xl font-bold">₹{earnings.monthly}</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <p className="text-sm text-zinc-600">Total Sessions</p>
                  </div>
                  <p className="text-3xl font-bold">{bookings.length}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <Card className="border-zinc-200">
                  <CardHeader>
                    <CardTitle>{myProfile.specialty} Trainer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6">
                      <img
                        src={myProfile.photo}
                        alt={myProfile.specialty}
                        className="w-32 h-32 rounded-full object-cover"
                      />
                      <div className="space-y-4 flex-1">
                        <div>
                          <p className="text-sm text-zinc-600">Specialty</p>
                          <p className="font-medium">{myProfile.specialty}</p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-600">Hourly Rate</p>
                          <p className="font-medium">₹{myProfile.hourly_rate}/hour</p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-600">Status</p>
                          <p className="font-medium">{statusBlock?.label}</p>
                          {statusBlock?.hint ? (
                            <p className="text-sm text-zinc-500 mt-1">{statusBlock.hint}</p>
                          ) : null}
                        </div>
                        <div>
                          <p className="text-sm text-zinc-600">Bio</p>
                          <p>{myProfile.bio}</p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-600">Rating</p>
                          <p className="font-medium">
                            {myProfile.rating > 0 ? `${myProfile.rating} (${myProfile.reviews_count} reviews)` : 'No reviews yet'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bookings" className="mt-6">
                {bookings.length === 0 ? (
                  <Card className="border-zinc-200">
                    <CardContent className="p-12 text-center">
                      <p className="text-zinc-600">No bookings yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.booking_id} className="border-zinc-200">
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-zinc-600">Date</p>
                              <p className="font-medium">{booking.date}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-600">Time</p>
                              <p className="font-medium">{booking.start_time} - {booking.end_time}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-600">Amount</p>
                              <p className="font-medium">₹{booking.amount}</p>
                            </div>
                            <div>
                              <p className="text-sm text-zinc-600">Status</p>
                              <p className="font-medium capitalize">{booking.status}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <Dialog open={showOnboardingForm} onOpenChange={setShowOnboardingForm}>
        <DialogContent className="max-w-2xl" aria-describedby="profile-form-description">
          <DialogHeader>
            <DialogTitle>Trainer Onboarding (Step {onboardingPage} of 2)</DialogTitle>
          </DialogHeader>
          <p id="profile-form-description" className="sr-only">Fill in your trainer onboarding details</p>

          {onboardingPage === 1 ? (
            <form onSubmit={handleOnboardingNext} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Select
                    value={profileForm.city}
                    onValueChange={(val) => {
                      setProfileForm({ ...profileForm, city: val, area: '' });
                      fetchAreas(val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Area</Label>
                  <Select
                    value={profileForm.area}
                    onValueChange={(val) => setProfileForm({ ...profileForm, area: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>What do you teach? (select multiple)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {WHAT_YOU_TEACH_OPTIONS.map((opt) => (
                    <label key={opt} className="text-sm flex items-center gap-2 border rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={profileForm.whatYouTeach.includes(opt)}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            whatYouTeach: e.target.checked
                              ? [...profileForm.whatYouTeach, opt]
                              : profileForm.whatYouTeach.filter((v) => v !== opt)
                          })
                        }
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={profileForm.gender}
                    onValueChange={(val) => setProfileForm({ ...profileForm, gender: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hourly Rate (₹)</Label>
                  <Input
                    type="number"
                    value={profileForm.hourly_rate}
                    onChange={(e) => setProfileForm({ ...profileForm, hourly_rate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Brief Bio</Label>
                <Textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={2}
                  required
                />
              </div>

              <div>
                <Label>Experience Brief</Label>
                <Textarea
                  value={profileForm.experience_brief}
                  onChange={(e) => setProfileForm({ ...profileForm, experience_brief: e.target.value })}
                  rows={2}
                  required
                />
              </div>

              <div>
                <Label>Photo Upload URL</Label>
                <Input
                  value={profileForm.photo}
                  onChange={(e) => setProfileForm({ ...profileForm, photo: e.target.value })}
                  placeholder="https://..."
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">HourlyGym logo branding will be applied after upload.</p>
              </div>

              <div>
                <Label>Service areas (comma separated)</Label>
                <Input
                  value={profileForm.service_areas_csv}
                  onChange={(e) => setProfileForm({ ...profileForm, service_areas_csv: e.target.value })}
                  placeholder="Banjara Hills, Jubilee Hills"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Travel Radius (km)</Label>
                  <Input
                    type="number"
                    value={profileForm.travel_radius}
                    onChange={(e) => setProfileForm({ ...profileForm, travel_radius: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Availability slots</Label>
                  <Input
                    value={profileForm.availability_slots_csv}
                    onChange={(e) => setProfileForm({ ...profileForm, availability_slots_csv: e.target.value })}
                    placeholder="06:00-07:00, 18:00-19:00"
                  />
                </div>
              </div>

              <div>
                <Label>Available Days</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAY_OPTIONS.map((d) => (
                    <label key={d} className="text-sm flex items-center gap-1 border rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={profileForm.available_days.includes(d)}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            available_days: e.target.checked
                              ? [...profileForm.available_days, d]
                              : profileForm.available_days.filter((v) => v !== d)
                          })
                        }
                      />
                      {d}
                    </label>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-black text-white hover:bg-zinc-800 rounded-md"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Continue to KYC & Settlement'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Aadhaar Number</Label>
                  <Input
                    value={profileForm.aadhar_number}
                    onChange={(e) => setProfileForm({ ...profileForm, aadhar_number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>PAN Number</Label>
                  <Input
                    value={profileForm.pan_number}
                    onChange={(e) => setProfileForm({ ...profileForm, pan_number: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>PAN Upload URL</Label>
                <Input
                  value={profileForm.pan_upload_url}
                  onChange={(e) => setProfileForm({ ...profileForm, pan_upload_url: e.target.value })}
                  placeholder="https://..."
                  required
                />
              </div>

              <div>
                <Label>Video Verification URL</Label>
                <Input
                  value={profileForm.video_verification_url}
                  onChange={(e) => setProfileForm({ ...profileForm, video_verification_url: e.target.value })}
                  placeholder="https://..."
                  required
                />
              </div>

              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profileForm.digilocker_kyc}
                  onChange={(e) => setProfileForm({ ...profileForm, digilocker_kyc: e.target.checked })}
                />
                DigiLocker KYC completed
              </label>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Bank Account Name</Label>
                  <Input
                    value={profileForm.bank_account_name}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_account_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Bank Account Number</Label>
                  <Input
                    value={profileForm.bank_account_number}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_account_number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>IFSC</Label>
                  <Input
                    value={profileForm.bank_ifsc}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_ifsc: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Certifications</Label>
                <Input
                  value={profileForm.certifications}
                  onChange={(e) => setProfileForm({ ...profileForm, certifications: e.target.value })}
                  placeholder="ACE, NASM, CSCS"
                />
              </div>

              <div>
                <Label>Certification Upload URLs (comma separated)</Label>
                <Input
                  value={profileForm.certification_upload_urls_csv}
                  onChange={(e) => setProfileForm({ ...profileForm, certification_upload_urls_csv: e.target.value })}
                  placeholder="https://..., https://..."
                />
              </div>

              <div>
                <Label>Intro Video URL (optional)</Label>
                <Input
                  value={profileForm.video_intro}
                  onChange={(e) => setProfileForm({ ...profileForm, video_intro: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profileForm.declaration_accepted}
                  onChange={(e) => setProfileForm({ ...profileForm, declaration_accepted: e.target.checked })}
                />
                I confirm all provided details are valid.
              </label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/2 rounded-md"
                  onClick={() => setOnboardingPage(1)}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="w-1/2 bg-black text-white hover:bg-zinc-800 rounded-md"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Onboarding'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerDashboard;
