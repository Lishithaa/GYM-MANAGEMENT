import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, User, Users } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RoleSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selecting, setSelecting] = useState(false);
  const userData = location.state?.userData;

  const selectRole = async (role) => {
    setSelecting(true);
    try {
      await axios.post(
        `${API}/auth/set-role`,
        { role },
        { withCredentials: true }
      );

      const dashboardMap = {
        user: '/dashboard',
        gym_owner: '/gym-owner/dashboard',
        trainer: '/trainer/dashboard',
        admin: '/admin'
      };

      navigate(dashboardMap[role]);
    } catch (error) {
      console.error('Role selection error:', error);
      toast.error('Failed to set role');
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <Dumbbell className="w-12 h-12 mx-auto mb-4" strokeWidth={2} />
          <h1 className="text-4xl font-bold font-['Outfit'] tracking-tight mb-4">
            Welcome to HourlyGym!
          </h1>
          <p className="text-lg text-zinc-600 font-['Manrope']">
            Please select your role to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="border-zinc-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => selectRole('user')}
            data-testid="role-user"
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-blue-600" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold font-['Outfit'] mb-2">User</h3>
              <p className="text-sm text-zinc-600 font-['Manrope']">
                Book gyms and trainers by the hour
              </p>
            </CardContent>
          </Card>

          <Card
            className="border-zinc-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => selectRole('trainer')}
            data-testid="role-trainer"
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold font-['Outfit'] mb-2">Trainer</h3>
              <p className="text-sm text-zinc-600 font-['Manrope']">
                Offer training sessions and build your client base
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
