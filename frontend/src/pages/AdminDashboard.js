import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Dumbbell, LogOut, Check, X, RotateCcw, Trash2, Users, Handshake, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';

const emptyPromoForm = { code: '', discount_percent: '', max_uses: '', valid_until: '' };
const emptyNewUserForm = { email: '', password: '', name: '', role: 'user', phone: '' };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [onboardingPending, setOnboardingPending] = useState([]);
  /** Unapproved trainers not tied to an onboarding row in review (e.g. legacy POST /trainers). */
  const [legacyPendingTrainers, setLegacyPendingTrainers] = useState([]);
  const [cityStats, setCityStats] = useState([]);
  const [promos, setPromos] = useState([]);
  const [promoForm, setPromoForm] = useState(emptyPromoForm);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decision, setDecision] = useState({ action: 'approve', onboardingId: null, reason: '' });
  const [adminUsers, setAdminUsers] = useState([]);
  const [managedTrainers, setManagedTrainers] = useState([]);
  const [partnerRequests, setPartnerRequests] = useState([]);
  const [adminComplaints, setAdminComplaints] = useState([]);
  const [newUserForm, setNewUserForm] = useState(emptyNewUserForm);
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/dashboard`);
      setDashboard(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Could not load dashboard metrics');
    }
  }, []);

  const fetchReviewQueues = useCallback(async () => {
    try {
      const [onbRes, pendRes] = await Promise.all([
        axios.get(`${API}/admin/trainers/onboarding/pending`),
        axios.get(`${API}/admin/pending-approvals`),
      ]);
      const onbData = onbRes.data || [];
      const trainerIdsInOnboarding = new Set(
        onbData.map((o) => o.trainer_id).filter(Boolean),
      );
      const legacy = (pendRes.data?.trainers || []).filter(
        (t) => t.trainer_id && !trainerIdsInOnboarding.has(t.trainer_id),
      );
      setOnboardingPending(onbData);
      setLegacyPendingTrainers(legacy);
    } catch (error) {
      console.error('Error fetching review queues:', error);
    }
  }, []);

  const fetchCityStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/stats/by-city`);
      setCityStats(data);
    } catch (error) {
      console.error('Error fetching city stats:', error);
    }
  }, []);

  const fetchPromos = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/promos`);
      setPromos(data);
    } catch (error) {
      console.error('Error fetching promos:', error);
    }
  }, []);

  const fetchAdminUsers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/users`);
      setAdminUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  const fetchManagedTrainers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/trainers/manage`);
      setManagedTrainers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  }, []);

  const fetchPartnerRequests = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/partner-requests`);
      setPartnerRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching partner requests:', error);
    }
  }, []);

  const fetchAdminComplaints = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/complaints`);
      setAdminComplaints(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchDashboard();
    fetchReviewQueues();
    fetchCityStats();
    fetchPromos();
    fetchAdminUsers();
    fetchManagedTrainers();
    fetchPartnerRequests();
    fetchAdminComplaints();
  }, [
    user,
    navigate,
    fetchDashboard,
    fetchReviewQueues,
    fetchCityStats,
    fetchPromos,
    fetchAdminUsers,
    fetchManagedTrainers,
    fetchPartnerRequests,
    fetchAdminComplaints,
  ]);

  const refreshAll = () => {
    fetchDashboard();
    fetchReviewQueues();
    fetchCityStats();
    fetchPromos();
    fetchAdminUsers();
    fetchManagedTrainers();
    fetchPartnerRequests();
    fetchAdminComplaints();
  };

  const approveLegacyTrainer = async (trainerId) => {
    try {
      await axios.post(`${API}/admin/approve/trainer/${trainerId}`, {});
      toast.success('Trainer approved');
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Approve failed');
    }
  };

  const banUser = async (userId) => {
    try {
      await axios.patch(`${API}/admin/users/${userId}/ban`);
      toast.success('User banned');
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ban failed');
    }
  };

  const unbanUser = async (userId) => {
    try {
      await axios.patch(`${API}/admin/users/${userId}/unban`);
      toast.success('User unbanned');
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unban failed');
    }
  };

  const createAdminUser = async (e) => {
    e.preventDefault();
    const { email, password, name, role, phone } = newUserForm;
    if (!email.trim() || !password || !name.trim()) {
      toast.error('Email, password, and name are required');
      return;
    }
    setCreatingUser(true);
    try {
      await axios.post(`${API}/admin/users`, {
        email: email.trim(),
        password,
        name: name.trim(),
        role,
        phone: phone.trim() || null,
      });
      toast.success('User created');
      setNewUserForm(emptyNewUserForm);
      fetchAdminUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const approveTrainerRow = async (trainerId) => {
    try {
      await axios.post(`${API}/admin/trainers/${trainerId}/approve`, { reason: 'Approved' });
      toast.success('Trainer approved');
      refreshAll();
    } catch (err) {
      try {
        await axios.post(`${API}/admin/approve/trainer/${trainerId}`, {});
        toast.success('Trainer approved');
        refreshAll();
      } catch (error) {
        toast.error(error.response?.data?.detail || err.response?.data?.detail || 'Approve failed');
      }
    }
  };

  const rejectTrainerRow = async (trainerId) => {
    const reason = window.prompt('Reason for rejection (optional):') || 'Rejected by admin';
    try {
      await axios.post(`${API}/admin/trainers/${trainerId}/reject`, { reason });
      toast.success('Trainer rejected');
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reject failed — try banning the account instead');
    }
  };

  const updatePartnerStatus = async (requestId, status) => {
    try {
      await axios.patch(`${API}/admin/partner-requests/${requestId}`, { status });
      toast.success('Partner request updated');
      fetchPartnerRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };

  const updateComplaintStatus = async (complaintId, status) => {
    try {
      await axios.patch(`${API}/admin/complaints/${complaintId}`, { status });
      toast.success('Complaint updated');
      fetchAdminComplaints();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };

  const openDecision = (action, onboardingId) => {
    const defaults = {
      approve: 'Approved',
      reject: '',
      rework: '',
    };
    setDecision({
      action,
      onboardingId,
      reason: defaults[action] ?? '',
    });
    setDecisionOpen(true);
  };

  const submitDecision = async () => {
    const { action, onboardingId, reason } = decision;
    if (!onboardingId) return;
    if ((action === 'reject' || action === 'rework') && !reason.trim()) {
      toast.error('Please enter a reason');
      return;
    }
    const path =
      action === 'approve'
        ? 'approve'
        : action === 'reject'
          ? 'reject'
          : 'rework';
    try {
      await axios.post(`${API}/admin/trainers/onboarding/${onboardingId}/${path}`, {
        reason: reason.trim() || 'Approved',
      });
      toast.success(
        action === 'approve'
          ? 'Trainer approved'
          : action === 'reject'
            ? 'Application rejected'
            : 'Rework requested',
      );
      setDecisionOpen(false);
      refreshAll();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Action failed');
    }
  };

  const createPromo = async (e) => {
    e.preventDefault();
    const discount = parseInt(promoForm.discount_percent, 10);
    const maxUses = parseInt(promoForm.max_uses, 10);
    if (!promoForm.code.trim() || Number.isNaN(discount) || Number.isNaN(maxUses) || !promoForm.valid_until.trim()) {
      toast.error('Fill all promo fields with valid numbers');
      return;
    }
    try {
      await axios.post(`${API}/admin/promos`, {
        code: promoForm.code.trim(),
        discount_percent: discount,
        max_uses: maxUses,
        valid_until: promoForm.valid_until.trim(),
      });
      toast.success('Promo created');
      setPromoForm(emptyPromoForm);
      fetchPromos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not create promo');
    }
  };

  const deletePromo = async (code) => {
    if (!window.confirm(`Delete promo ${code}?`)) return;
    try {
      await axios.delete(`${API}/admin/promos/${encodeURIComponent(code)}`);
      toast.success('Promo removed');
      fetchPromos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const summarizeProfile = (o) => {
    const bp = o.basic_profile || {};
    const bio = String(bp.bio || '');
    return {
      title: bp.specialty ? `${bp.specialty} · ${bp.city || '—'}` : 'Trainer application',
      lines: [
        bp.city && bp.area ? `${bp.area}, ${bp.city}` : bp.city || '',
        bp.hourly_rate != null ? `₹${bp.hourly_rate}/hr` : '',
        bio ? `${bio.slice(0, 160)}${bio.length > 160 ? '…' : ''}` : '',
      ].filter(Boolean),
    };
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
            data-testid="logo-link"
          >
            <Dumbbell className="w-8 h-8" strokeWidth={2} />
            <span className="text-2xl font-bold font-['Outfit'] tracking-tight">HourlyGym Admin</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" data-testid="logout-button">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-2">Admin dashboard</h1>
        <p className="text-zinc-600 mb-8 text-sm">
          Sign in as <span className="font-mono">hourly@admin.com</span> — trainer onboarding appears here after
          submit for review.
        </p>

        {dashboard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <Card className="border-zinc-200">
              <CardContent className="p-5">
                <p className="text-sm text-zinc-600 mb-1">Sessions completed today</p>
                <p className="text-3xl font-bold">{dashboard.sessions_completed_today}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardContent className="p-5">
                <p className="text-sm text-zinc-600 mb-1">Pending onboarding review</p>
                <p className="text-3xl font-bold">{dashboard.pending_onboarding_reviews}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardContent className="p-5">
                <p className="text-sm text-zinc-600 mb-1">Active approved trainers</p>
                <p className="text-3xl font-bold">{dashboard.active_approved_trainers}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardContent className="p-5">
                <p className="text-sm text-zinc-600 mb-1">Trainer profiles created today</p>
                <p className="text-3xl font-bold">{dashboard.trainers_profile_created_today}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardContent className="p-5">
                <p className="text-sm text-zinc-600 mb-1">Onboarding approved today</p>
                <p className="text-3xl font-bold">{dashboard.onboarding_approved_today}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardContent className="p-5">
                <p className="text-sm text-zinc-600 mb-1">Total users</p>
                <p className="text-3xl font-bold">{dashboard.total_users}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardContent className="p-5">
                <p className="text-sm text-zinc-600 mb-1">Total bookings</p>
                <p className="text-3xl font-bold">{dashboard.total_bookings}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200">
              <CardContent className="p-5">
                <p className="text-sm text-zinc-600 mb-1">Completed bookings (all time)</p>
                <p className="text-3xl font-bold">{dashboard.bookings_completed_all_time}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="onboarding" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="onboarding" data-testid="onboarding-tab">
              Onboarding ({onboardingPending.length + legacyPendingTrainers.length})
            </TabsTrigger>
            <TabsTrigger value="cities" data-testid="stats-tab">
              City statistics
            </TabsTrigger>
            <TabsTrigger value="promos" data-testid="promos-tab">
              Promo codes
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-1 inline" />
              Users
            </TabsTrigger>
            <TabsTrigger value="trainers_manage">Trainers</TabsTrigger>
            <TabsTrigger value="partners">
              <Handshake className="w-4 h-4 mr-1 inline" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="complaints">
              <AlertCircle className="w-4 h-4 mr-1 inline" />
              Complaints
            </TabsTrigger>
          </TabsList>

          <TabsContent value="onboarding" className="mt-6 space-y-10">
            {onboardingPending.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Submitted onboarding applications</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {onboardingPending.map((o) => {
                    const s = summarizeProfile(o);
                    return (
                      <Card key={o.onboarding_id} className="border-zinc-200">
                        <CardHeader>
                          <CardTitle className="text-lg">{s.title}</CardTitle>
                          <p className="text-xs text-zinc-500 font-mono">{o.onboarding_id}</p>
                          {o.status ? (
                            <p className="text-xs text-zinc-500">
                              Status: <span className="font-mono">{o.status}</span>
                            </p>
                          ) : null}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {s.lines.map((line, i) => (
                            <p key={i} className="text-sm text-zinc-600">
                              {line}
                            </p>
                          ))}
                          <p className="text-xs text-zinc-500">
                            Submitted: {o.submitted_at ? new Date(o.submitted_at).toLocaleString() : '—'}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => openDecision('approve', o.onboarding_id)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDecision('rework', o.onboarding_id)}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Request rework
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDecision('reject', o.onboarding_id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {legacyPendingTrainers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Trainer profiles pending (no onboarding queue row)</h2>
                <p className="text-sm text-zinc-500 mb-4 max-w-2xl">
                  These accounts have a trainer profile waiting for approval but are not linked to a submitted
                  onboarding application in review. Approve here to activate them, or ask the trainer to complete the
                  onboarding flow if you need full KYC data.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {legacyPendingTrainers.map((t) => (
                    <Card key={t.trainer_id} className="border-zinc-200 border-amber-200 bg-amber-50/30">
                      <CardHeader>
                        <CardTitle className="text-lg">{t.specialty || 'Trainer'} · legacy profile</CardTitle>
                        <p className="text-xs text-zinc-500 font-mono">{t.trainer_id}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-zinc-600">
                          <strong>Location:</strong> {t.area}, {t.city}
                        </p>
                        <p className="text-sm text-zinc-600">
                          <strong>Rate:</strong> ₹{t.hourly_rate}/hour
                        </p>
                        {t.bio ? (
                          <p className="text-sm text-zinc-600 line-clamp-3">{t.bio}</p>
                        ) : null}
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 w-full"
                          onClick={() => approveLegacyTrainer(t.trainer_id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve trainer
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {onboardingPending.length === 0 && legacyPendingTrainers.length === 0 && (
              <Card className="border-zinc-200">
                <CardContent className="p-12 text-center space-y-2">
                  <p className="text-zinc-600">Nothing in the review queue right now.</p>
                  <p className="text-sm text-zinc-500 max-w-lg mx-auto">
                    Onboarding submissions with status <span className="font-mono text-xs">under_review</span> appear
                    under &quot;Submitted onboarding&quot;. Trainers who created a profile without that flow appear under
                    &quot;Trainer profiles pending&quot;.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cities" className="mt-6">
            {cityStats.length === 0 ? (
              <Card className="border-zinc-200">
                <CardContent className="p-12 text-center">
                  <p className="text-zinc-600">No city data yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cityStats.map((row) => (
                  <Card key={row.city} className="border-zinc-200">
                    <CardHeader>
                      <CardTitle>{row.city}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-zinc-600 space-y-1">
                      <p>
                        <strong className="text-zinc-800">Approved trainers:</strong> {row.approved_trainers}
                      </p>
                      <p>
                        <strong className="text-zinc-800">All trainer profiles:</strong> {row.total_trainers}
                      </p>
                      <p>
                        <strong className="text-zinc-800">Bookings (trainer in city):</strong> {row.bookings}
                      </p>
                      <p>
                        <strong className="text-zinc-800">Sessions completed today:</strong>{' '}
                        {row.sessions_completed_today}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="promos" className="mt-6 space-y-8">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>Create promo</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createPromo} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label htmlFor="promo-code">Code</Label>
                    <Input
                      id="promo-code"
                      value={promoForm.code}
                      onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value }))}
                      placeholder="WELCOME10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="promo-pct">Discount %</Label>
                    <Input
                      id="promo-pct"
                      type="number"
                      min={1}
                      max={100}
                      value={promoForm.discount_percent}
                      onChange={(e) => setPromoForm((f) => ({ ...f, discount_percent: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="promo-max">Max uses</Label>
                    <Input
                      id="promo-max"
                      type="number"
                      min={1}
                      value={promoForm.max_uses}
                      onChange={(e) => setPromoForm((f) => ({ ...f, max_uses: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="promo-until">Valid until (YYYY-MM-DD)</Label>
                    <Input
                      id="promo-until"
                      value={promoForm.valid_until}
                      onChange={(e) => setPromoForm((f) => ({ ...f, valid_until: e.target.value }))}
                      placeholder="2026-12-31"
                    />
                  </div>
                  <Button type="submit" className="sm:col-span-2 lg:col-span-4 w-full sm:w-auto">
                    Add promo
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>Active codes</CardTitle>
              </CardHeader>
              <CardContent>
                {promos.length === 0 ? (
                  <p className="text-zinc-600 text-sm">No promo codes yet.</p>
                ) : (
                  <ul className="divide-y divide-zinc-200">
                    {promos.map((p) => (
                      <li
                        key={p.code}
                        className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div>
                          <span className="font-mono font-semibold">{p.code}</span>
                          <span className="text-zinc-600 text-sm ml-3">
                            {p.discount_percent}% · uses {p.uses}/{p.max_uses} · until {p.valid_until}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => deletePromo(p.code)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6 space-y-8">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>Add user</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createAdminUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={newUserForm.name}
                      onChange={(e) => setNewUserForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={newUserForm.role}
                      onValueChange={(v) => setNewUserForm((f) => ({ ...f, role: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="trainer">trainer</SelectItem>
                        <SelectItem value="gym_owner">gym_owner</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Phone (optional)</Label>
                    <Input
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={creatingUser}>
                      {creatingUser ? 'Creating…' : 'Create user'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>Accounts ({adminUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {adminUsers.length === 0 ? (
                  <p className="text-sm text-zinc-600">No users loaded.</p>
                ) : (
                  <ul className="divide-y divide-zinc-200 text-sm">
                    {adminUsers.map((u) => (
                      <li key={u.user_id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <span className="font-medium">{u.name}</span>
                          <span className="text-zinc-500 ml-2">{u.email}</span>
                          <span className="text-zinc-400 ml-2 font-mono text-xs">{u.role}</span>
                          {u.is_banned ? (
                            <span className="ml-2 text-red-600 text-xs font-semibold">Banned</span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {u.is_banned ? (
                            <Button size="sm" variant="outline" onClick={() => unbanUser(u.user_id)}>
                              Unban
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(`Ban ${u.email}?`)) banUser(u.user_id);
                              }}
                            >
                              Ban
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trainers_manage" className="mt-6">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>Trainer accounts</CardTitle>
                <p className="text-sm text-zinc-500 font-normal">
                  Approve pending profiles, reject with onboarding, or ban the underlying user to remove access.
                </p>
              </CardHeader>
              <CardContent>
                {managedTrainers.length === 0 ? (
                  <p className="text-sm text-zinc-600">No trainers.</p>
                ) : (
                  <ul className="divide-y divide-zinc-200 text-sm space-y-0">
                    {managedTrainers.map((t) => (
                      <li key={t.trainer_id} className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <p className="font-medium">{t.name || t.email}</p>
                          <p className="text-zinc-500 text-xs font-mono">{t.trainer_id}</p>
                          <p className="text-zinc-600">
                            {t.specialty} · {t.city} · approved: {t.approved ? 'yes' : 'no'}
                            {t.rejected ? ' · rejected' : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!t.approved ? (
                            <>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approveTrainerRow(t.trainer_id)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => rejectTrainerRow(t.trainer_id)}>
                                Reject
                              </Button>
                            </>
                          ) : null}
                          {t.is_banned ? (
                            <Button size="sm" variant="outline" onClick={() => unbanUser(t.user_id)}>
                              Unban user
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm('Ban this trainer’s user account? They will not be able to sign in.')) {
                                  banUser(t.user_id);
                                }
                              }}
                            >
                              Ban user
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partners" className="mt-6">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>Partnership requests</CardTitle>
              </CardHeader>
              <CardContent>
                {partnerRequests.length === 0 ? (
                  <p className="text-sm text-zinc-600">No requests yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {partnerRequests.map((p) => (
                      <li key={p.request_id} className="border border-zinc-200 rounded-lg p-4 space-y-2">
                        <p className="font-semibold">{p.organization_name}</p>
                        <p className="text-sm text-zinc-600">
                          {p.contact_name} · {p.email} {p.phone ? `· ${p.phone}` : ''}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{p.message}</p>
                        <p className="text-xs text-zinc-400">
                          {p.created_at ? new Date(p.created_at).toLocaleString() : ''} ·{' '}
                          <span className="font-mono">{p.status}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => updatePartnerStatus(p.request_id, 'reviewed')}>
                            Mark reviewed
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updatePartnerStatus(p.request_id, 'approved')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updatePartnerStatus(p.request_id, 'rejected')}>
                            Reject
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="complaints" className="mt-6">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>User ↔ trainer complaints</CardTitle>
                <p className="text-sm text-zinc-500 font-normal">
                  Filed by one account about another (trainers and members use the same complaint API).
                </p>
              </CardHeader>
              <CardContent>
                {adminComplaints.length === 0 ? (
                  <p className="text-sm text-zinc-600">No complaints.</p>
                ) : (
                  <ul className="space-y-4">
                    {adminComplaints.map((c) => (
                      <li key={c.complaint_id} className="border border-zinc-200 rounded-lg p-4 space-y-2 text-sm">
                        <p className="font-semibold">{c.subject}</p>
                        <p className="text-zinc-600 whitespace-pre-wrap">{c.body}</p>
                        <p className="text-xs text-zinc-500">
                          From: {c.from_name} ({c.from_email}) · About: {c.about_name} ({c.about_email})
                        </p>
                        <p className="text-xs font-mono text-zinc-400">{c.status}</p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => updateComplaintStatus(c.complaint_id, 'resolved')}>
                            Resolved
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateComplaintStatus(c.complaint_id, 'dismissed')}>
                            Dismissed
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => updateComplaintStatus(c.complaint_id, 'open')}>
                            Reopen
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision.action === 'approve' && 'Approve trainer'}
              {decision.action === 'reject' && 'Reject application'}
              {decision.action === 'rework' && 'Request changes'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-reason">Note to trainer / internal reason</Label>
            <Textarea
              id="admin-reason"
              value={decision.reason}
              onChange={(e) => setDecision((d) => ({ ...d, reason: e.target.value }))}
              rows={4}
              placeholder={
                decision.action === 'approve' ? 'Optional message' : 'Required — explain what is wrong or needed'
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitDecision}>
              {decision.action === 'approve' && 'Approve'}
              {decision.action === 'reject' && 'Reject'}
              {decision.action === 'rework' && 'Send rework request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
