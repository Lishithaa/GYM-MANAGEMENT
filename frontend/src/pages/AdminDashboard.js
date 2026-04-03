import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Dumbbell, LogOut, Check, X, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API } from '@/config';

const emptyPromoForm = { code: '', discount_percent: '', max_uses: '', valid_until: '' };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [onboardingPending, setOnboardingPending] = useState([]);
  const [cityStats, setCityStats] = useState([]);
  const [promos, setPromos] = useState([]);
  const [promoForm, setPromoForm] = useState(emptyPromoForm);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decision, setDecision] = useState({ action: 'approve', onboardingId: null, reason: '' });

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/dashboard`);
      setDashboard(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Could not load dashboard metrics');
    }
  }, []);

  const fetchOnboarding = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/trainers/onboarding/pending`);
      setOnboardingPending(data);
    } catch (error) {
      console.error('Error fetching onboarding queue:', error);
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

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchDashboard();
    fetchOnboarding();
    fetchCityStats();
    fetchPromos();
  }, [user, navigate, fetchDashboard, fetchOnboarding, fetchCityStats, fetchPromos]);

  const refreshAll = () => {
    fetchDashboard();
    fetchOnboarding();
    fetchCityStats();
    fetchPromos();
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
              Onboarding ({onboardingPending.length})
            </TabsTrigger>
            <TabsTrigger value="cities" data-testid="stats-tab">
              City statistics
            </TabsTrigger>
            <TabsTrigger value="promos" data-testid="promos-tab">
              Promo codes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="onboarding" className="mt-6">
            {onboardingPending.length === 0 ? (
              <Card className="border-zinc-200">
                <CardContent className="p-12 text-center">
                  <p className="text-zinc-600">No trainer applications awaiting review.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {onboardingPending.map((o) => {
                  const s = summarizeProfile(o);
                  return (
                    <Card key={o.onboarding_id} className="border-zinc-200">
                      <CardHeader>
                        <CardTitle className="text-lg">{s.title}</CardTitle>
                        <p className="text-xs text-zinc-500 font-mono">{o.onboarding_id}</p>
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
