import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, X, Search, UserPlus, Check, MessageCircle } from 'lucide-react';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type Mode = 'scan' | 'search';
type ScanState = 'idle' | 'scanning' | 'found' | 'not-found';

interface QRScannerPageProps {
  onBack: () => void;
  onAddFriend: (userId: string) => void;
}

const QRScannerPage = ({ onBack, onAddFriend }: QRScannerPageProps) => {
  const [mode, setMode] = useState<Mode>('scan');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [gagaIdInput, setGagaIdInput] = useState('');
  const [flashOn, setFlashOn] = useState(false);
  const [added, setAdded] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode !== 'scan' || scanState !== 'idle') return;
    setScanState('scanning');
    setScanProgress(0);

    // Simulate active camera seeking
    progressRef.current = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) return 0; // Loop progress for "seeking" effect
        return p + 1;
      });
    }, 30);

    // Randomly "find" a user to simulate a successful scan
    scanTimeoutRef.current = setTimeout(async () => {
        if (progressRef.current) clearInterval(progressRef.current);
        setScanProgress(100);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .limit(20);

        const currentUserResponse = await supabase.auth.getUser();
        const currentUserId = currentUserResponse.data?.user?.id;

        if (profiles && profiles.length > 0) {
          // Find a profile that isn't the current user
          const otherProfiles = profiles.filter(p => p.id !== currentUserId);
          const randomProfile = otherProfiles[Math.floor(Math.random() * otherProfiles.length)] || profiles[0];

          setFoundUser({
            id: randomProfile.id,
            name: randomProfile.name,
            avatar: randomProfile.avatar_url,
            status: randomProfile.status,
            statusMessage: randomProfile.status_message,
          });
          setScanState('found');
          toast.success('QR Code Detected!', { icon: '✨' });
        } else {
          setScanState('not-found');
        }
      }, 3500);
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [mode, scanState]);

  const handleReset = () => {
    setFoundUser(null);
    setScanState('idle');
    setAdded(false);
    setScanProgress(0);
  };

  const handleModeChange = (m: Mode) => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setMode(m);
    setScanState('idle');
    setFoundUser(null);
    setAdded(false);
    setScanProgress(0);
    setGagaIdInput('');
  };

  const handleSearchById = async () => {
    if (!gagaIdInput.trim()) return;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('id', `${gagaIdInput.trim()}%`)
      .limit(1)
      .single();

    if (profile) {
      setFoundUser({
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar_url,
        status: profile.status,
        statusMessage: profile.status_message,
      });
      setScanState('found');
    } else {
      setScanState('not-found');
    }
  };

  const handleAddFriend = () => {
    if (!foundUser) return;
    onAddFriend(foundUser.id);
    setAdded(true);
    toast.success(`Added ${foundUser.name} as a friend!`);
  };

  const statusColors: Record<string, string> = {
    online: 'bg-emerald-400',
    busy: 'bg-amber-400',
    offline: 'bg-gray-500',
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="relative flex items-center px-4 pt-12 pb-4">
        <button onClick={onBack} className="p-2 -ml-2 text-white hover:text-white/70 transition-colors" aria-label="Back" title="Back">
          <ChevronLeft size={26} />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-white text-[17px] font-semibold">
          Add Friends
        </h1>
        {mode === 'scan' && (
          <button
            onClick={() => setFlashOn(f => !f)}
            className={cn(
              'ml-auto p-2 rounded-full transition-colors',
              flashOn ? 'text-yellow-400 bg-yellow-400/10' : 'text-white/50 hover:text-white'
            )}
            aria-label={flashOn ? 'Turn flash off' : 'Turn flash on'}
            title={flashOn ? 'Turn flash off' : 'Turn flash on'}
          >
            {/* Flash icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2v11h3v9l7-12h-4l4-8z" />
            </svg>
          </button>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="flex mx-4 mb-5 bg-white/8 rounded-xl p-1 gap-1">
        {([
          { id: 'scan' as Mode, label: 'Scan QR Code' },
          { id: 'search' as Mode, label: 'Search ID' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => handleModeChange(tab.id)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === tab.id
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SCAN MODE */}
      {mode === 'scan' && (
        <div className="flex-1 flex flex-col items-center px-6">
          {scanState !== 'found' ? (
            <>
              {/* Viewfinder */}
              <div className="relative w-64 h-64 mt-4">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] rounded-tl-lg" style={{ borderColor: '#22d3ee' }} />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] rounded-tr-lg" style={{ borderColor: '#22d3ee' }} />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] rounded-bl-lg" style={{ borderColor: '#22d3ee' }} />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] rounded-br-lg" style={{ borderColor: '#22d3ee' }} />

                {/* Camera background */}
                <div className="absolute inset-2 rounded-lg bg-white/5 overflow-hidden">
                  <div className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: 'url("https://api.dicebear.com/7.x/shapes/svg?seed=camera&backgroundColor=1a1a2e")',
                      backgroundSize: 'cover',
                      filter: 'blur(2px) brightness(0.3)',
                    }}
                  />
                  {/* Fake QR grid */}
                  <div className="absolute inset-6 grid grid-cols-8 gap-0.5 opacity-20">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-[1px]"
                        style={{ background: (i + Math.floor(i / 8) * 3 + i * 2) % 5 !== 0 ? '#fff' : 'transparent' }}
                      />
                    ))}
                  </div>

                  {/* Animated scan line */}
                  {scanState === 'scanning' && (
                    <div
                      className="absolute left-0 right-0 h-0.5"
                      style={{
                        background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)',
                        boxShadow: '0 0 8px 2px rgba(34,211,238,0.6)',
                        animation: 'scanLine 1.8s ease-in-out infinite',
                        top: '10%',
                      }}
                    />
                  )}
                </div>

                {flashOn && (
                  <div className="absolute inset-2 rounded-lg bg-yellow-400/5 pointer-events-none" />
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-6 w-64">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${scanProgress}%`,
                      background: 'linear-gradient(90deg, #38bdf8, #22d3ee, #38bdf8)',
                    }}
                  />
                </div>
              </div>

              <p className="mt-4 text-white/50 text-sm text-center">
                {scanState === 'scanning' ? 'Scanning for QR code...' : 'Point your camera at a GaGa Chat QR code'}
              </p>
              <p className="mt-2 text-white/25 text-xs text-center">Hold steady for best results</p>
            </>
          ) : (
            foundUser && (
              <FoundUserCard
                user={foundUser}
                added={added}
                statusColors={statusColors}
                onAdd={handleAddFriend}
                onReset={handleReset}
                onChat={() => { onAddFriend(foundUser.id); onBack(); }}
              />
            )
          )}
        </div>
      )}

      {/* SEARCH MODE */}
      {mode === 'search' && (
        <div className="flex-1 flex flex-col px-5">
          {scanState !== 'found' ? (
            <>
              <div className="flex items-center bg-white/10 rounded-xl px-4 py-3 gap-3 border border-white/10 focus-within:border-cyan-400 transition-colors">
                <Search size={18} className="text-white/40 flex-shrink-0" />
                <input
                  autoFocus
                  value={gagaIdInput}
                  onChange={e => { setGagaIdInput(e.target.value); setScanState('idle'); }}
                  onKeyDown={e => e.key === 'Enter' && handleSearchById()}
                  placeholder="Enter GaGa Chat ID"
                  className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder-white/30"
                />
                {gagaIdInput && (
                  <button onClick={() => { setGagaIdInput(''); setScanState('idle'); }} aria-label="Clear ID input" title="Clear">
                    <X size={15} className="text-white/40" />
                  </button>
                )}
              </div>

              <button
                onClick={handleSearchById}
                disabled={!gagaIdInput.trim()}
                className="mt-3 w-full gchat-btn py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
              >
                Search
              </button>

              {scanState === 'not-found' && (
                <div className="mt-6 flex flex-col items-center text-center py-8 bg-white/5 rounded-2xl animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3">
                    <Search size={28} className="text-white/30" />
                  </div>
                  <p className="text-white font-semibold">No results found</p>
                  <p className="text-white/40 text-sm mt-1">Check the ID and try again</p>
                </div>
              )}

              {scanState === 'idle' && (
                <div className="mt-8 text-white/40 text-sm">
                  Enter a GaGa Chat ID or scan a QR code to add a friend.
                </div>
              )}
            </>
          ) : (
            foundUser && (
              <FoundUserCard
                user={foundUser}
                added={added}
                statusColors={statusColors}
                onAdd={handleAddFriend}
                onReset={handleReset}
                onChat={() => { onAddFriend(foundUser.id); onBack(); }}
              />
            )
          )}
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 88%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/* ── Found User Card ── */
const FoundUserCard = ({
  user, added, statusColors, onAdd, onReset, onChat,
}: {
  user: User;
  added: boolean;
  statusColors: Record<string, string>;
  onAdd: () => void;
  onReset: () => void;
  onChat: () => void;
}) => (
  <div className="w-full animate-fade-in mt-2">
    <div className="flex items-center gap-2 border rounded-xl px-4 py-2.5 mb-4"
      style={{ background: 'rgba(34,211,238,0.1)', borderColor: 'rgba(34,211,238,0.3)' }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #38bdf8, #22d3ee)' }}>
        <Check size={12} className="text-black" strokeWidth={3} />
      </div>
      <p className="text-sm font-medium" style={{ color: '#22d3ee' }}>Profile found!</p>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Cover */}
      <div className="h-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.6), rgba(34,211,238,0.4), rgba(56,189,248,0.6))' }}>
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: `url(${user.avatar})`, backgroundSize: 'cover', filter: 'blur(20px) brightness(0.5)' }}
        />
      </div>

      {/* Avatar */}
      <div className="flex justify-center -mt-10 mb-3 relative z-10">
        <div className="relative">
          <img src={user.avatar} alt={user.name}
            className="w-20 h-20 rounded-full border-4 border-[#111] shadow-xl object-cover"
          />
          <div className={cn('absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#111]', statusColors[user.status])} />
        </div>
      </div>

      <div className="text-center px-5 pb-2">
        <h3 className="text-white text-xl font-bold">{user.name}</h3>
        <p className="text-white/40 text-sm mt-0.5">
          GaGa Chat ID: <span className="text-white/60 font-medium">
            {user.id.slice(0, 8)}
          </span>
        </p>
        {user.statusMessage && (
          <p className="text-white/40 text-sm mt-2 italic">"{user.statusMessage}"</p>
        )}
      </div>

      <div className="flex justify-center pb-4 mt-1">
        <span className={cn(
          'px-3 py-1 rounded-full text-xs font-medium capitalize',
          user.status === 'online' ? 'bg-emerald-500/15 text-emerald-400' :
            user.status === 'busy' ? 'bg-amber-500/15 text-amber-400' :
              'bg-white/10 text-white/40'
        )}>
          {user.status}
        </span>
      </div>

      <div className="h-px bg-white/10 mx-4" />

      <div className="flex gap-3 p-4">
        <button
          onClick={onAdd}
          disabled={added}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
            added ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'gchat-btn hover:opacity-90 active:scale-[0.98]'
          )}
        >
          {added ? <><Check size={16} strokeWidth={3} /> Added</> : <><UserPlus size={16} /> Add Friend</>}
        </button>
        <button
          onClick={onChat}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 active:scale-[0.98] transition-all"
        >
          <MessageCircle size={16} />
          Message
        </button>
      </div>
    </div>

    <button
      onClick={onReset}
      className="mt-3 w-full py-3 text-white/40 text-sm hover:text-white/60 transition-colors"
    >
      Scan again
    </button>
  </div>
);

export default QRScannerPage;
