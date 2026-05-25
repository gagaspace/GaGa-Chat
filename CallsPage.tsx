import { useState, useEffect, useCallback } from 'react';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, Plus, Search, X, Loader2 } from 'lucide-react';
import CallModal from '@/components/features/CallModal';
import { getUserById, formatTime, formatDuration } from '@/constants/mockData';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types'; // supabase

import logoSrc from '@/assets/logo.jpg';

interface CallRecord {
  id: string;
  userId: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: Date;
  duration?: number;
}

interface CallsRow {
  id: string;
  caller_id: string;
  receiver_id: string;
  type: 'voice' | 'video';
  status?: string;
  created_at: string;
  duration?: number;
}

const CallsPage = () => {
  const { user: currentUser, fetchAllUsers } = useAuth();
  const [activeCall, setActiveCall] = useState<{ user: User; type: 'voice' | 'video' } | null>(null);
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [showNewCall, setShowNewCall] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const fetchCalls = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching calls:', error);
    } else {
      const formatted: CallRecord[] = data.map((c: CallsRow) => {
        const isOutgoing = c.caller_id === currentUser.id;
        let direction: CallRecord['direction'] = isOutgoing ? 'outgoing' : 'incoming';
        if (c.status === 'missed') direction = 'missed';

        return {
          id: c.id,
          userId: isOutgoing ? c.receiver_id : c.caller_id,
          type: c.type,
          direction,
          timestamp: new Date(c.created_at),
          duration: c.duration,
        };
      });
      setCalls(formatted);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    fetchCalls();
    fetchAllUsers().then(setAllUsers);

    const channel = supabase
      .channel('public:calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => fetchCalls())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCalls, fetchAllUsers]);

  const filtered = calls.filter(r => {
    const matchesFilter = filter === 'all' || r.direction === 'missed';
    const user = allUsers.find(u => u.id === r.userId);
    const matchesSearch = !searchQuery || (user?.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const isEmpty = filtered.length === 0;

  if (loading && calls.length === 0) {
    return (
<div className="flex-1 flex items-center justify-center bg-[#0b0b0b] h-full">
        <Loader2 className="w-8 h-8 text-green-400/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="GaGa Chat" className="w-10 h-10 rounded-full gchat-logo-glow object-cover" />
          <h1 className="text-white text-xl font-bold">Calls</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={cn("p-2 transition-colors", showSearch ? "text-green-600" : "text-green-700/60 hover:text-green-700")}
            onClick={() => setShowSearch(s => !s)}
            aria-label="Search calls"
            title="Search calls"
          >
            <Search size={20} />
          </button>
          <button
            className="p-2 text-green-700/60 hover:text-green-700 transition-colors"
            onClick={() => setShowNewCall(true)}
            aria-label="New call"
            title="New call"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-4 pb-3 animate-fade-in">
          <div className="flex items-center bg-green-400/10 rounded-xl px-3 py-2 gap-2 border border-green-300/20">
            <Search size={15} className="text-green-600/40" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name"
              className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder-white/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Clear search" title="Clear search">
                <X size={14} className="text-green-600/40" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex px-5 gap-1 mb-2">
        {(['all', 'missed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              filter === f
                ? 'bg-green-300/20 text-green-700'
                : 'text-green-700/40 hover:text-green-700/60'
            )}
          >
            {f === 'all' ? 'All' : 'Missed'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isEmpty ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full px-8 text-center pb-20">
            <h2 className="text-white text-[22px] font-bold mb-2">
              Make a call anytime, anywhere
            </h2>
            <p className="text-green-700/40 text-[15px] leading-relaxed">
              Talk to your friends whenever{'\n'}with GaGa Chat voice calls.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(record => {
              const user = allUsers.find(u => u.id === record.userId);
              if (!user) return null;

              const DirectionIcon =
                record.direction === 'missed'
                  ? PhoneMissed
                  : record.direction === 'incoming'
                    ? PhoneIncoming
                    : PhoneOutgoing;

              return (
                <div
                  key={record.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-green-300/10 transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                    <div
                      className={cn(
                        'absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center',
                        record.type === 'video' ? 'bg-blue-500' : 'bg-cyan-400'
                      )}
                    >
                      {record.type === 'video' ? (
                        <Video size={10} className="text-white" />
                      ) : (
                        <Phone size={10} className="text-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'font-semibold text-[15px] truncate',
                        record.direction === 'missed' ? 'text-red-400' : 'text-white'
                      )}
                    >
                      {user.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <DirectionIcon
                        size={12}
                        className={cn(
                          record.direction === 'missed'
                            ? 'text-red-400'
                            : record.direction === 'incoming'
                              ? 'text-cyan-300'
                              : 'text-blue-400'
                        )}
                      />
                      <span className="text-[13px] text-green-700/40 capitalize">
                        {record.direction}
                        {record.duration ? ` · ${formatDuration(record.duration)}` : ''}
                      </span>
                      <span className="text-green-700/20 text-xs">·</span>
                      <span className="text-[13px] text-green-700/40">{formatTime(record.timestamp)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveCall({ user, type: record.type })}
                    aria-label={record.type === 'video' ? `Start video call with ${user.name}` : `Start voice call with ${user.name}`}
                    title={record.type === 'video' ? `Video call ${user.name}` : `Call ${user.name}`}
                    className="p-2.5 rounded-full text-green-700/60 hover:bg-green-300/10 hover:text-green-700 transition-colors flex-shrink-0"
                  >
                    {record.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Call Modal */}
      {activeCall && (
        <CallModal user={activeCall.user} type={activeCall.type} onEnd={() => setActiveCall(null)} />
      )}
      {/* New Call Modal */}
      {showNewCall && (
        <div className="fixed inset-0 z-50 bg-green-900/30 flex items-end animate-fade-in" onClick={e => e.target === e.currentTarget && setShowNewCall(false)}>
<div className="bg-[#0f0f0f] w-full max-h-[80vh] rounded-t-3xl overflow-hidden flex flex-col animate-slide-in border-t border-green-300/30">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">New Call</h2>
              <button onClick={() => setShowNewCall(false)} className="text-white/40" aria-label="Close new call modal" title="Close">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {allUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={user.avatar} alt="" className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-xs text-white/40">{user.statusMessage}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!currentUser) return;
                        await supabase.from('calls').insert({
                          caller_id: currentUser.id,
                          receiver_id: user.id,
                          type: 'voice',
                          status: 'completed',
                          duration: 0
                        });
                        setActiveCall({ user, type: 'voice' });
                        setShowNewCall(false);
                      }}
                      className="w-10 h-10 rounded-full bg-green-400/20 flex items-center justify-center text-green-600 hover:bg-green-400/30 transition-colors"
                      aria-label={`Start voice call with ${user.name}`}
                      title={`Call ${user.name}`}
                    >
                      <Phone size={18} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!currentUser) return;
                        await supabase.from('calls').insert({
                          caller_id: currentUser.id,
                          receiver_id: user.id,
                          type: 'video',
                          status: 'completed',
                          duration: 0
                        });
                        setActiveCall({ user, type: 'video' });
                        setShowNewCall(false);
                      }}
                      className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-600 hover:bg-blue-400/30 transition-colors"
                      aria-label={`Start video call with ${user.name}`}
                      title={`Video call ${user.name}`}
                    >
                      <Video size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallsPage;
