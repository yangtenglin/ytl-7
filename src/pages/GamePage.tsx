import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { useCountdown } from '../hooks/useCountdown';
import BaseSection from '../components/game/BaseSection';
import CrewPanel from '../components/game/CrewPanel';
import ControlPanel from '../components/game/ControlPanel';
import EventLog from '../components/game/EventLog';
import StatusBar from '../components/game/StatusBar';
import StoragePanel from '../components/game/StoragePanel';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function GamePage() {
  const { state, notification } = useGame();
  const navigate = useNavigate();
  useCountdown();

  useEffect(() => {
    if (state.status !== 'playing') {
      navigate('/result');
    }
  }, [state.status, navigate]);

  const getNotificationStyle = () => {
    if (!notification) return '';
    switch (notification.type) {
      case 'error':
        return 'bg-red-900/90 border-red-500 text-red-200';
      case 'success':
        return 'bg-green-900/90 border-green-500 text-green-200';
      default:
        return 'bg-cyan-900/90 border-cyan-500 text-cyan-200';
    }
  };

  const NotificationIcon = notification?.type === 'error'
    ? AlertCircle
    : notification?.type === 'success'
    ? CheckCircle
    : Info;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'linear-gradient(rgba(0,212,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.1) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}></div>
        </div>
      </div>

      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg border-2 shadow-xl backdrop-blur-sm flex items-center gap-3 animate-bounce ${getNotificationStyle()}`}>
          <NotificationIcon className="w-5 h-5" />
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      <div className="relative z-10 flex-1 p-4 pb-0">
        <div className="max-w-[1600px] mx-auto h-full">
          <div className="grid grid-cols-12 gap-4 h-full">
            <div className="col-span-3 flex flex-col gap-4">
              <CrewPanel />
              <EventLog />
            </div>

            <div className="col-span-5">
              <BaseSection />
            </div>

            <div className="col-span-4 flex flex-col gap-4">
              <StoragePanel />
              <ControlPanel />
            </div>
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
