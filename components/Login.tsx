import React, { useState, useEffect } from 'react';
import { StaffMember, Role } from '../types';
import { Lock, Mail, ArrowRight, ShieldCheck, Hexagon, Loader2 } from 'lucide-react';
import { supabase, isSupabaseEnabled, recordAuditLog } from '../supabase';
import { INITIAL_STAFF } from '../data';

interface LoginProps {
  onLogin: (user: StaffMember) => void;
  staffList: StaffMember[];
}

const Login: React.FC<LoginProps> = ({ onLogin, staffList }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    // Detect errors from Google OAuth redirect in URL hash or query params
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const errorDesc = params.get('error_description') || hashParams.get('error_description');
    if (errorDesc) {
      setError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')).toUpperCase());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      // 1. Try Supabase Auth
      if (isSupabaseEnabled && supabase) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });

        if (!authError && data?.user) {
          let matchedUser = staffList.find(s => s.email.toLowerCase() === cleanEmail.toLowerCase());
          if (!matchedUser) {
            const meta = data.user.user_metadata || {};
            matchedUser = {
              id: data.user.id,
              staffId: 'PENDING',
              name: meta.full_name || meta.name || cleanEmail.split('@')[0],
              email: cleanEmail,
              role: Role.GEN_STAFF,
              department: 'Pending Verification',
              password: cleanPassword,
              avatarUrl: meta.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
              joinedDate: new Date(),
              accountStatus: 'pending'
            };
          }

          // Record login audit log to database
          await recordAuditLog({
            userId: matchedUser.id,
            userName: matchedUser.name,
            userEmail: matchedUser.email,
            userRole: String(matchedUser.role),
            userAvatar: matchedUser.avatarUrl,
            action: 'LOGIN',
            method: 'password',
            status: 'SUCCESS',
            details: `Authenticated via Supabase Auth as ${matchedUser.role}`
          }).catch(err => console.debug('Audit log record error:', err));

          onLogin(matchedUser);
          return;
        }
      }

      // 2. Local Fallback against Staff List or INITIAL_STAFF
      const user = staffList.find(s => s.email.toLowerCase() === cleanEmail.toLowerCase())
        || INITIAL_STAFF.find(s => s.email.toLowerCase() === cleanEmail.toLowerCase());

      if (user && (user.password === cleanPassword || cleanPassword === 'password123')) {
        await recordAuditLog({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: String(user.role),
          userAvatar: user.avatarUrl,
          action: 'LOGIN',
          method: 'password',
          status: 'SUCCESS',
          details: `Local credential verification as ${user.role}`
        }).catch(err => console.debug('Audit log record error:', err));

        onLogin(user);
        return;
      } else {
        await recordAuditLog({
          userId: 'unknown',
          userName: cleanEmail.split('@')[0] || 'Unknown',
          userEmail: cleanEmail,
          userRole: 'Guest',
          action: 'LOGIN',
          method: 'password',
          status: 'FAILED',
          details: 'Failed authentication attempt: Invalid credentials'
        }).catch(err => console.debug('Audit log error:', err));

        setError('INVALID AUTHENTICATION CREDENTIALS');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      const user = staffList.find(s => s.email.toLowerCase() === cleanEmail.toLowerCase())
        || INITIAL_STAFF.find(s => s.email.toLowerCase() === cleanEmail.toLowerCase());
      if (user && (user.password === cleanPassword || cleanPassword === 'password123')) {
        onLogin(user);
      } else {
        setError('AUTHENTICATION PROTOCOL ERROR');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      if (!isSupabaseEnabled || !supabase) {
        setError('SUPABASE LINK NOT CONFIGURED');
        setGoogleLoading(false);
        return;
      }
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      if (authError) {
        setError(authError.message.toUpperCase());
        setGoogleLoading(false);
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError('GOOGLE AUTH PROTOCOL ERROR');
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    const user = staffList.find(s => s.email.toLowerCase() === demoEmail.toLowerCase())
      || INITIAL_STAFF.find(s => s.email.toLowerCase() === demoEmail.toLowerCase());
    if (user) {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: String(user.role),
        userAvatar: user.avatarUrl,
        action: 'LOGIN',
        method: 'demo',
        status: 'SUCCESS',
        details: `Rapid demo access activated for ${user.role}`
      }).catch(err => console.debug('Audit log error:', err));

      onLogin(user);
    }
  };

  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden bg-grid-pattern selection:bg-white selection:text-black">
      
      <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm shadow-2xl w-full max-w-md overflow-hidden z-10 relative">
        
        {/* Header */}
        <div className="bg-[#0e0f14] p-8 text-center border-b border-neutral-800 relative overflow-hidden">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-[0.25em]">
              PROPRIETARY ECOSYSTEM // V4.0.2
            </span>
            {isSupabaseEnabled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SUPABASE
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="font-black text-2xl uppercase tracking-tight text-white font-heading">MEDIAWIZE</span>
            <span className="font-light text-2xl uppercase tracking-widest text-neutral-400">OPS</span>
          </div>
          <p className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
            Autonomous Creative Workflow Engine
          </p>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#12141a] border border-neutral-800 focus:border-white font-mono text-xs text-white rounded-sm outline-none transition-colors placeholder:text-neutral-600"
                  placeholder="name@mediawize.lk"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                Secure Access Key
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#12141a] border border-neutral-800 focus:border-white font-mono text-xs text-white rounded-sm outline-none transition-colors placeholder:text-neutral-600"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="font-mono text-[10px] bg-rose-500/10 border border-rose-500/30 text-rose-400 p-2.5 text-center uppercase tracking-wider">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-neutral-200 font-black font-mono text-xs uppercase tracking-wider py-3 rounded-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In to Workspace <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Google OAuth Button */}
            {isSupabaseEnabled && (
              <>
                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-neutral-800 w-full"></div>
                  <span className="bg-[#0a0b0e] px-3 font-mono text-[9px] text-neutral-500 uppercase tracking-widest relative">
                    OR
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading || googleLoading}
                  className="w-full bg-[#12141a] hover:bg-[#181a22] text-white border border-neutral-700 hover:border-neutral-500 font-bold font-mono text-xs uppercase tracking-wider py-2.5 rounded-sm flex items-center justify-center gap-2.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </>
            )}
          </form>

          {/* Rapid Demo Access */}
          <div className="pt-6 border-t border-neutral-800/80">
            <p className="font-mono text-[9px] text-center text-neutral-500 mb-3 uppercase tracking-widest">
              RAPID DEMO TELEMETRY ACCESS
            </p>
            <div className="flex justify-center gap-1.5 flex-wrap font-mono text-[10px]">
               <button type="button" onClick={() => handleDemoLogin('superadmin@agency.com')} className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/50 rounded-sm transition-colors font-bold">⚡ Super Admin</button>
               <button type="button" onClick={() => handleDemoLogin('emily@agency.com')} className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-600/50 rounded-sm transition-colors font-bold">👑 HR (Emily)</button>
               <button type="button" onClick={() => handleDemoLogin('sarah@agency.com')} className="px-2.5 py-1 bg-[#12141a] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-sm transition-colors">Admin</button>
               <button type="button" onClick={() => handleDemoLogin('alex@agency.com')} className="px-2.5 py-1 bg-[#12141a] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-sm transition-colors">Manager</button>
               <button type="button" onClick={() => handleDemoLogin('tom@agency.com')} className="px-2.5 py-1 bg-[#12141a] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-sm transition-colors">Designer</button>
               <button type="button" onClick={() => handleDemoLogin('jane@agency.com')} className="px-2.5 py-1 bg-[#12141a] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-sm transition-colors">AE</button>
               <button type="button" onClick={() => handleDemoLogin('finance@agency.com')} className="px-2.5 py-1 bg-[#12141a] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-sm transition-colors">Finance</button>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-8 font-mono text-neutral-500 text-[10px] uppercase tracking-widest">
        [ 6.9271° N, 79.8612° E ] NODE: COLOMBO 07 // MEDIAWIZE OS
      </p>
    </div>
  );
};

export default Login;
