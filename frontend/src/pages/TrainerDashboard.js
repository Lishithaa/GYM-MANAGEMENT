import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell, LogOut, Users, DollarSign, Calendar, MapPin, QrCode, Star, ArrowLeft, History, MessageSquareWarning, Pencil, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';
import { goBack } from '@/utils/goBack';
import { TrainerShowcaseCard } from '@/components/TrainerShowcaseCard';

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
  const [sessionReviews, setSessionReviews] = useState([]);
  const [geoWorking, setGeoWorking] = useState(false);
  const [locationDisplayName, setLocationDisplayName] = useState('');
  const [qrBooking, setQrBooking] = useState(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [editPhotoPreviewFailed, setEditPhotoPreviewFailed] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const profilePhotoFileInputRef = useRef(null);
  const [profileEditForm, setProfileEditForm] = useState({
    bio: '',
    photo: '',
    specialty: '',
    hourly_rate: '',
    city: '',
    area: '',
    gender: '',
    languages_csv: '',
    travel_radius: '10',
    available_days: DAY_OPTIONS,
    service_areas_csv: '',
    availability_slots_csv: '',
    certifications: '',
    video_intro: '',
    experience_brief: '',
    certification_upload_urls_csv: '',
    photo_branding_enabled: true
  });
  const [trainerComplaintMine, setTrainerComplaintMine] = useState({ filed_by_me: [], about_me: [] });
  const [trainerComplaintForm, setTrainerComplaintForm] = useState({
    about_user_id: '',
    subject: '',
    body: ''
  });
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

  const fetchSessionReviews = useCallback(async () => {
    if (!myProfile?.trainer_id) return;
    try {
      const { data } = await axios.get(`${API}/reviews`, {
        params: { target_type: 'trainer', target_id: myProfile.trainer_id }
      });
      setSessionReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setSessionReviews([]);
    }
  }, [myProfile?.trainer_id]);

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
    if (myProfile?.trainer_id) {
      fetchSessionReviews();
    }
  }, [myProfile?.trainer_id, fetchSessionReviews]);

  useEffect(() => {
    const lat = myProfile?.lat;
    const lng = myProfile?.lng;
    if (lat == null || lng == null) {
      setLocationDisplayName('');
      return;
    }
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json`,
          { signal: ac.signal, headers: { Accept: 'application/json' } }
        );
        const j = await res.json();
        setLocationDisplayName(j.display_name || '');
      } catch {
        if (!ac.signal.aborted) setLocationDisplayName('');
      }
    }, 600);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [myProfile?.lat, myProfile?.lng]);

  const bookingClientUserIds = useMemo(() => {
    const ids = [...new Set((bookings || []).map((b) => b.user_id).filter(Boolean))];
    return ids;
  }, [bookings]);

  const fetchTrainerComplaints = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/complaints/mine`);
      setTrainerComplaintMine({
        filed_by_me: data?.filed_by_me || [],
        about_me: data?.about_me || []
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'trainer' || !myProfile?.trainer_id) return;
    fetchTrainerComplaints();
  }, [user?.role, myProfile?.trainer_id, fetchTrainerComplaints]);

  useEffect(() => {
    calculateEarnings();
  }, [calculateEarnings]);

  const submitTrainerComplaint = async (e) => {
    e.preventDefault();
    if (
      !trainerComplaintForm.about_user_id ||
      !trainerComplaintForm.subject.trim() ||
      !trainerComplaintForm.body.trim()
    ) {
      toast.error('Choose a client and enter subject and details');
      return;
    }
    try {
      await axios.post(`${API}/complaints`, {
        about_user_id: trainerComplaintForm.about_user_id,
        subject: trainerComplaintForm.subject.trim(),
        body: trainerComplaintForm.body.trim(),
      });
      toast.success('Complaint submitted');
      setTrainerComplaintForm({ about_user_id: '', subject: '', body: '' });
      fetchTrainerComplaints();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not submit complaint');
    }
  };

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
    navigate('/', { replace: true });
  };

  const captureAndSaveLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser');
      return;
    }
    setGeoWorking(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await axios.patch(`${API}/trainers/me/location`, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          toast.success('Saved your current location');
          fetchMyProfile();
        } catch (err) {
          toast.error(err?.response?.data?.detail || 'Could not save location');
        } finally {
          setGeoWorking(false);
        }
      },
      () => {
        toast.error('Location permission denied or unavailable');
        setGeoWorking(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
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

  const openProfileEdit = () => {
    if (!myProfile) return;
    const langs = Array.isArray(myProfile.languages) ? myProfile.languages.join(', ') : '';
    const days =
      Array.isArray(myProfile.available_days) && myProfile.available_days.length
        ? myProfile.available_days
        : [...DAY_OPTIONS];
    setProfileEditForm({
      bio: myProfile.bio || '',
      photo: myProfile.photo || '',
      specialty: myProfile.specialty || '',
      hourly_rate: String(myProfile.hourly_rate ?? ''),
      city: myProfile.city || '',
      area: myProfile.area || '',
      gender: myProfile.gender || '',
      languages_csv: langs,
      travel_radius: String(myProfile.travel_radius ?? 10),
      available_days: days,
      service_areas_csv: Array.isArray(myProfile.service_areas) ? myProfile.service_areas.join(', ') : '',
      availability_slots_csv: Array.isArray(myProfile.availability_slots)
        ? myProfile.availability_slots.join(', ')
        : '',
      certifications: myProfile.certifications || '',
      video_intro: myProfile.video_intro || '',
      experience_brief: myProfile.experience_brief || '',
      certification_upload_urls_csv: Array.isArray(myProfile.certification_upload_urls)
        ? myProfile.certification_upload_urls.join(', ')
        : '',
      photo_branding_enabled: myProfile.photo_branding_enabled !== false
    });
    if (myProfile.city) fetchAreas(myProfile.city);
    setEditPhotoPreviewFailed(false);
    setShowProfileEdit(true);
  };

  const uploadProfilePhotoFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Choose an image file (JPEG, PNG, WebP, or GIF)');
      return;
    }
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axios.post(`${API}/trainers/me/photo`, fd);
      setProfileEditForm((f) => ({ ...f, photo: data.photo || '' }));
      setEditPhotoPreviewFailed(false);
      toast.success('Photo uploaded and saved to your profile');
      fetchMyProfile();
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : err?.message || 'Upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

  const onProfilePhotoDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onProfilePhotoDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadProfilePhotoFile(file);
  };

  const saveProfileEdit = async (e) => {
    e?.preventDefault();
    if (!profileEditForm.city || !profileEditForm.area || !String(profileEditForm.specialty || '').trim()) {
      toast.error('City, area, and specialty are required');
      return;
    }
    const rate = parseFloat(profileEditForm.hourly_rate, 10);
    if (Number.isNaN(rate) || rate < 0) {
      toast.error('Enter a valid hourly rate');
      return;
    }
    if (!profileEditForm.available_days?.length) {
      toast.error('Select at least one available day');
      return;
    }
    const langList = parseCsv(profileEditForm.languages_csv);
    const languages = langList.length ? langList : ['English', 'Hindi'];
    setProfileSaving(true);
    try {
      await axios.patch(`${API}/trainers/me`, {
        bio: profileEditForm.bio.trim(),
        photo: profileEditForm.photo.trim(),
        specialty: profileEditForm.specialty.trim(),
        hourly_rate: rate,
        city: profileEditForm.city,
        area: profileEditForm.area,
        gender: profileEditForm.gender || 'unspecified',
        languages,
        certifications: profileEditForm.certifications.trim() || null,
        video_intro: profileEditForm.video_intro.trim() || null,
        travel_radius: parseInt(profileEditForm.travel_radius, 10) || 10,
        available_days: profileEditForm.available_days,
        service_areas: parseCsv(profileEditForm.service_areas_csv),
        availability_slots: parseCsv(profileEditForm.availability_slots_csv),
        experience_brief: profileEditForm.experience_brief.trim() || null,
        certification_upload_urls: parseCsv(profileEditForm.certification_upload_urls_csv),
        photo_branding_enabled: profileEditForm.photo_branding_enabled
      });
      toast.success('Profile updated');
      setShowProfileEdit(false);
      fetchMyProfile();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not update profile');
    } finally {
      setProfileSaving(false);
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

  const historyBookings = bookings.filter((b) =>
    ['completed', 'cancelled'].includes(String(b.status || '').toLowerCase())
  );
  const activeBookings = bookings.filter(
    (b) => !['completed', 'cancelled'].includes(String(b.status || '').toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => goBack(navigate, '/')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
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
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="bookings">Active bookings</TabsTrigger>
                <TabsTrigger value="history">Booking history</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="support">
                  <MessageSquareWarning className="w-4 h-4 mr-1 inline" />
                  Support
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <Card className="border-zinc-200">
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
                    <CardTitle>{myProfile.specialty} Trainer</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={openProfileEdit}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit profile
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-8">
                      <div className="shrink-0 w-full max-w-[280px] mx-auto sm:mx-0">
                        <TrainerShowcaseCard trainer={myProfile} variant="compact" />
                      </div>
                      <div className="space-y-4 flex-1">
                        <div>
                          <p className="text-sm text-zinc-600">City / area</p>
                          <p className="font-medium">
                            {myProfile.area}, {myProfile.city}
                          </p>
                        </div>
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
                {activeBookings.length === 0 ? (
                  <Card className="border-zinc-200">
                    <CardContent className="p-12 text-center">
                      <p className="text-zinc-600">No active bookings</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {activeBookings.map((booking) => (
                      <Card key={booking.booking_id} className="border-zinc-200">
                        <CardContent className="p-6 space-y-4">
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
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => setQrBooking(booking)}>
                              <QrCode className="w-4 h-4 mr-1" />
                              Show QR
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/booking/${booking.booking_id}`)}
                            >
                              Full details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                {historyBookings.length === 0 ? (
                  <Card className="border-zinc-200">
                    <CardContent className="p-12 text-center">
                      <History className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
                      <p className="text-zinc-600">No completed or cancelled sessions yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {historyBookings.map((booking) => (
                      <Card key={booking.booking_id} className="border-zinc-200">
                        <CardContent className="p-6 space-y-4">
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
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => setQrBooking(booking)}>
                              <QrCode className="w-4 h-4 mr-1" />
                              QR code
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/booking/${booking.booking_id}`)}
                            >
                              Full details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                {sessionReviews.length === 0 ? (
                  <Card className="border-zinc-200">
                    <CardContent className="p-12 text-center">
                      <Star className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
                      <p className="text-zinc-600">No reviews on your profile yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {sessionReviews.map((r) => (
                      <Card key={r.review_id} className="border-zinc-200">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="font-semibold">{r.rating}/5</span>
                            <span className="text-sm text-zinc-500">· {r.user_name}</span>
                          </div>
                          <p className="text-sm text-zinc-800 whitespace-pre-wrap">{r.comment}</p>
                          <p className="text-xs text-zinc-500 mt-2">
                            {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="location" className="mt-6">
                <Card className="border-zinc-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Live location on profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-zinc-600">
                      Use your device GPS to update the coordinates stored on your trainer profile (for distance search
                      and session planning). Your browser will ask for location permission.
                    </p>
                    <div className="text-sm space-y-1">
                      <p className="text-zinc-600">Saved coordinates (from your device GPS)</p>
                      <p className="font-mono text-zinc-900">
                        {myProfile.lat != null && myProfile.lng != null
                          ? `${Number(myProfile.lat).toFixed(5)}, ${Number(myProfile.lng).toFixed(5)}`
                          : 'Not set yet'}
                      </p>
                      {locationDisplayName ? (
                        <div className="pt-2 border-t border-zinc-100">
                          <p className="text-zinc-600 text-xs uppercase tracking-wide">Approx. address</p>
                          <p className="text-zinc-800">{locationDisplayName}</p>
                          <p className="text-xs text-zinc-400 mt-1">Resolved via OpenStreetMap (Nominatim).</p>
                        </div>
                      ) : myProfile.lat != null && myProfile.lng != null ? (
                        <p className="text-xs text-zinc-400">Loading address…</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      onClick={captureAndSaveLocation}
                      disabled={geoWorking}
                      className="bg-black text-white hover:bg-zinc-800 rounded-md"
                    >
                      {geoWorking ? 'Getting location…' : 'Update from this device'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="support" className="mt-6 space-y-6">
                <Card className="border-zinc-200">
                  <CardHeader>
                    <CardTitle>File a complaint about a client</CardTitle>
                    <p className="text-sm text-zinc-500 font-normal">
                      Select someone you had a booking with. For disputes, admins see both sides under Complaints.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={submitTrainerComplaint} className="space-y-4 max-w-lg">
                      <div>
                        <Label>Client (from your bookings)</Label>
                        {bookingClientUserIds.length === 0 ? (
                          <p className="text-sm text-zinc-500 mt-1">You need at least one booking to select a client.</p>
                        ) : (
                          <Select
                            value={trainerComplaintForm.about_user_id || undefined}
                            onValueChange={(v) => setTrainerComplaintForm({ ...trainerComplaintForm, about_user_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              {bookingClientUserIds.map((uid) => (
                                <SelectItem key={uid} value={uid}>
                                  Client · …{String(uid).slice(-6)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div>
                        <Label>Subject</Label>
                        <Input
                          value={trainerComplaintForm.subject}
                          onChange={(e) => setTrainerComplaintForm({ ...trainerComplaintForm, subject: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Details</Label>
                        <Textarea
                          value={trainerComplaintForm.body}
                          onChange={(e) => setTrainerComplaintForm({ ...trainerComplaintForm, body: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <Button type="submit" className="bg-black text-white hover:bg-zinc-800 rounded-md">
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
                    <CardContent className="text-sm space-y-3 max-h-80 overflow-y-auto">
                      {(trainerComplaintMine.filed_by_me || []).length === 0 ? (
                        <p className="text-zinc-500">None yet.</p>
                      ) : (
                        trainerComplaintMine.filed_by_me.map((c) => (
                          <div key={c.complaint_id} className="border-b border-zinc-100 pb-2">
                            <p className="font-medium">{c.subject}</p>
                            <p className="text-zinc-600 text-xs mt-1">{c.status}</p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border-zinc-200">
                    <CardHeader>
                      <CardTitle className="text-base">About you</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3 max-h-80 overflow-y-auto">
                      {(trainerComplaintMine.about_me || []).length === 0 ? (
                        <p className="text-zinc-500">None yet.</p>
                      ) : (
                        trainerComplaintMine.about_me.map((c) => (
                          <div key={c.complaint_id} className="border-b border-zinc-100 pb-2">
                            <p className="font-medium">{c.subject}</p>
                            <p className="text-zinc-600 text-xs mt-1">{c.status}</p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <Dialog open={!!qrBooking} onOpenChange={(open) => !open && setQrBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Booking QR</DialogTitle>
          </DialogHeader>
          {qrBooking?.qr_code ? (
            <div className="text-center space-y-3">
              <img
                src={`data:image/png;base64,${qrBooking.qr_code}`}
                alt="Booking QR"
                className="w-56 h-56 mx-auto border border-zinc-200 rounded-md p-2"
              />
              <p className="text-xs font-mono text-zinc-600">{qrBooking.booking_id}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">No QR image is available for this booking.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showProfileEdit}
        onOpenChange={(open) => {
          setShowProfileEdit(open);
          if (!open) setEditPhotoPreviewFailed(false);
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          aria-describedby="edit-profile-desc"
        >
          <div className="shrink-0 px-6 pt-6 pb-2 pr-14">
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
            </DialogHeader>
            <p id="edit-profile-desc" className="sr-only">
              Update your public trainer details. KYC and bank details are changed through onboarding revision if
              required.
            </p>
          </div>
          <form onSubmit={saveProfileEdit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Select
                  value={profileEditForm.city || undefined}
                  onValueChange={(val) => {
                    setProfileEditForm({ ...profileEditForm, city: val, area: '' });
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
                  value={profileEditForm.area || undefined}
                  onValueChange={(val) => setProfileEditForm({ ...profileEditForm, area: val })}
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
              <Label>Specialty</Label>
              <Input
                value={profileEditForm.specialty}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, specialty: e.target.value })}
                placeholder="e.g. Yoga, Strength"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Hourly rate (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={profileEditForm.hourly_rate}
                  onChange={(e) => setProfileEditForm({ ...profileEditForm, hourly_rate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={profileEditForm.gender || undefined}
                  onValueChange={(val) => setProfileEditForm({ ...profileEditForm, gender: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="unspecified">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Profile photo</Label>
              <input
                ref={profilePhotoFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadProfilePhotoFile(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onDragOver={onProfilePhotoDragOver}
                onDrop={onProfilePhotoDrop}
                onClick={() => profilePhotoFileInputRef.current?.click()}
                disabled={photoUploading}
                className="mt-1 w-full rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-100 disabled:opacity-50"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                <span className="font-medium text-zinc-800">
                  {photoUploading ? 'Uploading…' : 'Drop an image here or click to browse'}
                </span>
                <span className="block text-xs text-zinc-500 mt-1">JPEG, PNG, WebP or GIF · max 5MB</span>
                <span className="block text-xs text-zinc-500 mt-2 leading-relaxed">
                  For the coach gallery look, use a <strong>waist-up portrait</strong>. A <strong>PNG with a transparent
                  background</strong> blends into the branded panel like a studio cutout.
                </span>
              </button>
              <p className="text-xs text-zinc-500 mt-3 mb-1">Or paste a direct image URL:</p>
              <Input
                value={profileEditForm.photo}
                onChange={(e) => {
                  setEditPhotoPreviewFailed(false);
                  setProfileEditForm({ ...profileEditForm, photo: e.target.value });
                }}
                placeholder="https://example.com/your-photo.jpg"
              />
              {profileEditForm.photo?.trim() ? (
                <div className="mt-3 flex items-start gap-4">
                  <img
                    src={profileEditForm.photo.trim()}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border border-zinc-200 bg-zinc-100 shrink-0"
                    onLoad={() => setEditPhotoPreviewFailed(false)}
                    onError={() => setEditPhotoPreviewFailed(true)}
                  />
                  {editPhotoPreviewFailed ? (
                    <p className="text-xs text-amber-700 pt-1">
                      Preview failed — this URL is probably not a raw image. Right-click the image on the source site,
                      copy image address, or download and host the file somewhere that gives you a direct .jpg/.png link.
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 pt-1">If you see your photo here, Save changes will use it.</p>
                  )}
                </div>
              ) : null}
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={profileEditForm.bio}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, bio: e.target.value })}
                rows={3}
                required
              />
            </div>
            <div>
              <Label>Experience brief</Label>
              <Textarea
                value={profileEditForm.experience_brief}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, experience_brief: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Languages (comma separated)</Label>
              <Input
                value={profileEditForm.languages_csv}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, languages_csv: e.target.value })}
                placeholder="English, Hindi"
              />
            </div>
            <div>
              <Label>Travel radius (km)</Label>
              <Input
                type="number"
                min={1}
                value={profileEditForm.travel_radius}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, travel_radius: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Available days</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((d) => (
                  <label key={d} className="text-sm flex items-center gap-2 border rounded px-2 py-1">
                    <input
                      type="checkbox"
                      checked={profileEditForm.available_days.includes(d)}
                      onChange={(e) =>
                        setProfileEditForm({
                          ...profileEditForm,
                          available_days: e.target.checked
                            ? [...profileEditForm.available_days, d]
                            : profileEditForm.available_days.filter((x) => x !== d)
                        })
                      }
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Service areas (comma separated)</Label>
              <Input
                value={profileEditForm.service_areas_csv}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, service_areas_csv: e.target.value })}
              />
            </div>
            <div>
              <Label>Availability slots (comma separated)</Label>
              <Input
                value={profileEditForm.availability_slots_csv}
                onChange={(e) =>
                  setProfileEditForm({ ...profileEditForm, availability_slots_csv: e.target.value })
                }
                placeholder="06:00-07:00, 07:00-08:00"
              />
            </div>
            <div>
              <Label>Certifications</Label>
              <Input
                value={profileEditForm.certifications}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, certifications: e.target.value })}
              />
            </div>
            <div>
              <Label>Certification document URLs (comma separated)</Label>
              <Input
                value={profileEditForm.certification_upload_urls_csv}
                onChange={(e) =>
                  setProfileEditForm({ ...profileEditForm, certification_upload_urls_csv: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Intro video URL</Label>
              <Input
                value={profileEditForm.video_intro}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, video_intro: e.target.value })}
              />
            </div>
            <label className="text-sm flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={profileEditForm.photo_branding_enabled}
                onChange={(e) =>
                  setProfileEditForm({ ...profileEditForm, photo_branding_enabled: e.target.checked })
                }
              />
              <span>
                Photo branding enabled — teal showcase card on the public trainer directory (uncheck for a simple white
                card)
              </span>
            </label>
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t border-zinc-200 bg-background px-6 py-4 sm:justify-end">
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
