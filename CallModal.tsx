import { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Camera, CameraOff, Volume2, MessageCircle, RotateCcw } from 'lucide-react';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface CallModalProps {
  user: User;
  type: 'voice' | 'video';
  onEnd: () => void;
}

const CallModal = ({ user: otherUser, type, onEnd }: CallModalProps) => {
  const { user: currentUser } = useAuth();
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Broadcast incoming call to the other user
    if (callState === 'ringing' && currentUser && otherUser) {
      const channel = supabase.channel(`call:${otherUser.id}`);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'incoming-call',
            payload: {
              caller: {
                id: currentUser.id,
                name: currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0],
                avatar: currentUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`
              },
              type: type,
              callId: Math.random().toString(36).substring(7)
            }
          });
        }
      });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [callState, currentUser, otherUser, type]);

  useEffect(() => {
    const connectTimer = setTimeout(() => setCallState('connected'), 4000); // Wait a bit longer for "ringing"
    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    if (callState !== 'connected') return;
    const interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleEnd = async () => {
    if (callState === 'ended') return;

    setCallState('ended');

    if (currentUser) {
      await supabase.from('calls').insert({
        caller_id: currentUser.id,
        receiver_id: otherUser.id,
        type: type,
        status: duration > 0 ? 'completed' : 'cancelled',
        duration: duration,
      });
    }

    setTimeout(onEnd, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 animate-fade-in">
      {/* Background */}
      {type === 'video' ? (
        <div className="absolute inset-0">
          <img
            src={otherUser.avatar}
            alt=""
            className="w-full h-full object-cover opacity-25 scale-110"
            style={{ filter: 'blur(20px) brightness(0.4)' }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ) : (
        <div className="absolute inset-0 gchat-header opacity-90" />
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <div className="flex items-center gap-2">
            {type === 'video' && <Camera size={16} className="text-white/70" />}
            <span className="text-white/70 text-sm capitalize">{type} Call</span>
          </div>
          {callState === 'connected' && (
            <span className="text-white/70 text-sm font-mono">{formatDuration(duration)}</span>
          )}
        </div>

        {/* User info */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="relative">
            {/* Pulse rings when ringing */}
            {callState === 'ringing' && (
              <>
                <div className="absolute inset-0 -m-6 rounded-full border-4 border-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 -m-12 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '2s' }} />
              </>
            )}
            <img
              src={otherUser.avatar}
              alt={otherUser.name}
              className="w-28 h-28 rounded-full object-cover border-4 border-white/30 shadow-2xl"
            />
            {callState === 'connected' && (
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-cyan-400 rounded-full border-2 border-white" />
            )}
          </div>

          <div className="text-center">
            <h2 className="text-white text-2xl font-bold">{otherUser.name}</h2>
            <p className={cn('text-sm mt-1.5 font-medium', callState === 'connected' ? 'text-cyan-300' : 'text-white/70')}>
              {callState === 'ringing'
                ? (type === 'video' ? '📹 Video calling...' : '📞 Calling...')
                : callState === 'connected'
                  ? '● Connected'
                  : '✓ Call ended'}
            </p>
          </div>

          {/* Self preview for video */}
          {type === 'video' && callState === 'connected' && (
            <div className="absolute top-20 right-4 w-24 h-36 bg-[#1a1a1a] rounded-2xl border-2 border-white/20 overflow-hidden shadow-xl">
              <div className="w-full h-full flex items-center justify-center flex-col gap-1">
                {isCameraOff ? (
                  <CameraOff size={20} className="text-white/30" />
                ) : (
                  <Camera size={20} className="text-white/30" />
                )}
                <span className="text-white/30 text-[10px]">{isCameraOff ? 'Camera off' : 'You'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="pb-14 px-8">
          {callState === 'connected' && (
            <div className={cn('grid gap-4 mb-8', type === 'video' ? 'grid-cols-4' : 'grid-cols-3')}>
              <ControlBtn
                active={isMuted}
                icon={isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                label={isMuted ? 'Unmute' : 'Mute'}
                onClick={() => setIsMuted(m => !m)}
              />
              {type === 'video' && (
                <ControlBtn
                  active={isCameraOff}
                  icon={isCameraOff ? <CameraOff size={22} /> : <Camera size={22} />}
                  label="Camera"
                  onClick={() => setIsCameraOff(c => !c)}
                />
              )}
              <ControlBtn
                active={isSpeakerOn}
                icon={<Volume2 size={22} />}
                label="Speaker"
                onClick={() => setIsSpeakerOn(s => !s)}
              />
              <ControlBtn
                icon={<MessageCircle size={22} />}
                label="Chat"
                onClick={() => toast.success('During-call messaging comes in Q2 2026!')}
              />
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleEnd}
              aria-label="End call"
              title="End call"
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-all active:scale-95"
            >
              <PhoneOff size={26} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlBtn = ({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-2 p-3 rounded-2xl transition-all',
      active ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30'
    )}
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export default CallModal;
