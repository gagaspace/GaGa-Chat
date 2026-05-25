import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ShieldCheck, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoSrc from '@/assets/logo.jpg';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type Mode = 'signin' | 'signup' | 'reset';

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

const evaluatePassword = (pw: string): PasswordStrength => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const map: PasswordStrength[] = [
    { score: 0, label: 'Too short', color: 'bg-red-500' },
    { score: 1, label: 'Weak', color: 'bg-orange-500' },
    { score: 2, label: 'Fair', color: 'bg-yellow-500' },
    { score: 3, label: 'Strong', color: 'bg-lime-500' },
    { score: 4, label: 'Excellent', color: 'bg-green-500' },
  ];

  return map[score];
};

const AuthGate = () => {
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const strength = evaluatePassword(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const toastError = (err: unknown) => {
      const message =
        typeof err === 'string'
          ? err
          : (err as { message?: string }).message ?? String(err);
      return toast.error(message);
    };

    if (mode === 'reset') {
      if (!email) return toast.error('Enter your email to reset.');
      setSubmitting(true);
      const { error } = await resetPassword(email);
      setSubmitting(false);
      if (error) {
        return toastError(error);
      }
      toast.success('Password reset link sent. Check your inbox.');
      setMode('signin');
      return;
    }

    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }

    if (mode === 'signup') {
      if (!agree) return toast.error('Please accept the Terms to continue.');
      if (strength.score < 2) return toast.error('Please choose a stronger password.');
      setSubmitting(true);
      const { error, needsConfirmation } = await signUp(email, password, displayName || undefined);
      setSubmitting(false);
      if (error) {
        return toastError(error);
      }

      if (needsConfirmation) {
        setSignupSuccess(true);
        toast.success('Account created! Check your email to confirm.');
      } else {
        toast.success('Welcome to GaGa Chat!');
      }
      return;
    }

    // signin
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      return toastError(error);
    }
    toast.success('Welcome back!');
  };

return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0b0b0b 0%, #0f0f0f 100%)'}}>

      <div className="absolute inset-0 pointer-events-none opacity-40" style={{background: 'radial-gradient(circle at 30% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)'}} />

      {/* Layout container */}
      <div className="relative z-10 w-full max-w-[420px] sm:max-w-[460px] px-4 py-4">
        {/* Logo / header */}
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center mb-5"
        >
          <div className="relative">
            <img
              src={logoSrc}
              alt="GaGa Chat"
              className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-full object-cover ring-4 ring-green-400/40 shadow-[0_0_40px_rgba(34,197,94,0.25)]"
            />
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-green-900 text-center">
            GaGa <span className="text-green-600">Chat</span>
          </h1>
          <p className="mt-1 text-sm text-green-700/60 text-center">
            Encrypted. Effortless. Always at your side.
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
className="relative rounded-[32px] border border-white/10 bg-[#0f0f0f] backdrop-blur-xl p-5 sm:p-6 shadow-[0_35px_90px_rgba(0,0,0,0.45)]"
        >
          {/* Tabs */}
          {mode !== 'reset' && (
            <div className="grid grid-cols-2 mb-6 p-1 rounded-2xl bg-white/5 border border-white/10">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`relative py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  mode === 'signin' ? 'text-green-900' : 'text-green-700/50 hover:text-green-700/80'
                }`}
              >
                {mode === 'signin' && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-xl bg-cyan-400/90 shadow-[0_10px_30px_rgba(56,189,248,0.18)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`relative py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  mode === 'signup' ? 'text-green-900' : 'text-green-700/50 hover:text-green-700/80'
                }`}
              >
                {mode === 'signup' && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-xl bg-cyan-400/90 shadow-[0_10px_30px_rgba(56,189,248,0.18)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">Create Account</span>
              </button>
            </div>
          )}
        

          <AnimatePresence mode="wait">
            {signupSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6"
              >
                <CheckCircle2 size={56} className="mx-auto text-green-600 mb-3" />
                <h3 className="text-green-900 text-xl font-bold mb-2">Confirm your email</h3>
                <p className="text-green-700/70 text-sm mb-6">
                  We sent a confirmation link to <span className="text-green-900 font-medium">{email}</span>. Click it
                  to activate your GaGa Chat account.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSignupSuccess(false);
                    setMode('signin');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm hover:opacity-95 transition-opacity"
                >
                  Back to Sign In
                </button>
              </motion.div>
            ) : (
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {mode === 'reset' && (
                  <div className="text-center mb-2">
                    <h3 className="text-green-900 text-lg font-bold">Reset your password</h3>
                    <p className="text-green-700/60 text-xs mt-1">We'll email you a secure reset link.</p>
                  </div>
                )}

                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-green-700/60 mb-1.5">Display name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-700/50" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="w-full pl-10 pr-3 py-3 rounded-xl bg-green-300/10 border border-green-300/20 text-green-900 placeholder:text-green-700/30 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-green-700/60 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-700/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20 transition"
                    />
                  </div>
                </div>

                {mode !== 'reset' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-green-700/60">Password</label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => setMode('reset')}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-700/50" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        required
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-green-300/10 border border-green-300/20 text-green-900 placeholder:text-green-700/30 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-green-700/50 hover:text-green-700/80"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {mode === 'signup' && password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1 h-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-full transition-colors ${
                                i < strength.score ? strength.color : 'bg-black/10'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="mt-1 text-[11px] text-white/50">
                          Strength: <span className="text-white/80 font-medium">{strength.label}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {mode === 'signup' && (
                  <label className="flex items-start gap-2.5 text-xs text-white/60 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-cyan-300 cursor-pointer"
                    />
                    <span>
                      I agree to the{' '}
                      <span className="text-cyan-300 hover:underline">Terms of Service</span> and{' '}
                      <span className="text-cyan-300 hover:underline">Privacy Policy</span>.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-bold text-sm overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.99] shadow-[0_25px_50px_rgba(20,184,166,0.25)]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Please wait...
                      </>
                    ) : (
                      <>
                        {mode === 'signin' && 'Sign In Securely'}
                        {mode === 'signup' && 'Create My Account'}
                        {mode === 'reset' && 'Send Reset Link'}
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </button>

                {mode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="w-full text-center text-xs text-white/60 hover:text-white/80 pt-1"
                  >
                    ← Back to sign in
                  </button>
                )}

                <div className="flex items-center justify-center gap-2 pt-3 text-[11px] text-white/40">
                  <ShieldCheck size={13} className="text-cyan-300" />
                  <span>End-to-end encrypted • Powered by Supabase</span>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="mt-6 text-center text-[11px] text-white/30">© {new Date().getFullYear()} GaGa Chat. All rights reserved.</p>
      </div>
    </div>
  );
};

export default AuthGate;

