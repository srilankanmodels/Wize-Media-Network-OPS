import React, { useState, useEffect } from 'react';
import { StaffMember, Role, AccountStatus } from '../types';
import { Lock, Mail, ArrowRight, ShieldCheck, Hexagon, Loader2, Sparkles, X, User } from 'lucide-react';
import { supabase, isSupabaseEnabled, getSupabase, recordAuditLog, createOrGetAccessRequest, saveOrUpdateUserProfile } from '../supabase';
import { INITIAL_STAFF } from '../data';

interface LoginProps {
  onLogin: (user: StaffMember) => void;
  staffList: StaffMember[];
}

// Security: Strip sensitive fields (passwords, private credentials) before storing in browser storage
const sanitizeUserForStorage = (user: StaffMember): StaffMember => {
  const { password: _, ...safeUser } = user;
  return safeUser as StaffMember;
};

const Login: React.FC<LoginProps> = ({ onLogin, staffList }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle successful Google User Authentication
  const handleSuccessfulGoogleUser = async (gUser: {
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
  }) => {
    const cleanEmail = gUser.email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('NO EMAIL ADDRESS ASSOCIATED WITH GOOGLE ACCOUNT');
      return;
    }

    // 1. Look for existing staff member in staffList or INITIAL_STAFF
    const matchedUser = staffList.find(s => s.email.toLowerCase() === cleanEmail)
      || INITIAL_STAFF.find(s => s.email.toLowerCase() === cleanEmail);

    if (matchedUser) {
      const activeUser: StaffMember = {
        ...matchedUser,
        avatarUrl: gUser.photoURL || matchedUser.avatarUrl,
        accountStatus: matchedUser.accountStatus || 'approved'
      };

      // Record audit log
      await recordAuditLog({
        userId: activeUser.id,
        userName: activeUser.name,
        userEmail: activeUser.email,
        userRole: String(activeUser.role),
        userAvatar: activeUser.avatarUrl,
        action: 'LOGIN',
        method: 'google_oauth',
        status: 'SUCCESS',
        details: `Google SSO Authentication as ${activeUser.role}`
      }).catch(err => console.debug('Audit log record error:', err));

      // Persist / update employee profile in Supabase database
      await saveOrUpdateUserProfile(activeUser, gUser.uid).catch(err => console.debug('Profile save notice:', err));

      localStorage.setItem('mw_current_user', JSON.stringify(sanitizeUserForStorage(activeUser)));
      onLogin(sanitizeUserForStorage(activeUser));
      return;
    }

    // 2. New employee signing in via Google - register access request
    let accessReq: any = null;
    try {
      accessReq = await createOrGetAccessRequest({
        authUserId: gUser.uid,
        email: cleanEmail,
        fullName: gUser.displayName || cleanEmail.split('@')[0],
        avatarUrl: gUser.photoURL || undefined,
        provider: 'google'
      });
    } catch (err) {
      console.debug('Access request creation note:', err);
    }

    // Auto-grant superadmin to designated master emails, else respect access request status
    const isSuperAdminEmail = cleanEmail === 'superadmin@agency.com' || cleanEmail === 'contact@mediawize.lk';
    const status: AccountStatus = isSuperAdminEmail 
      ? 'approved' 
      : (accessReq?.status || 'pending');
    const role: Role = isSuperAdminEmail 
      ? Role.SUPER_ADMIN 
      : (accessReq?.assignedRole || Role.GEN_STAFF);
    const department = isSuperAdminEmail 
      ? 'Management' 
      : (accessReq?.assignedDepartment || 'Pending Verification');

    const newStaffUser: StaffMember = {
      id: gUser.uid,
      staffId: accessReq?.id ? `MW-${accessReq.id.slice(-3).toUpperCase()}` : `MW-${Math.floor(100 + Math.random() * 900)}`,
      name: gUser.displayName || cleanEmail.split('@')[0],
      email: cleanEmail,
      role: role,
      department: department,
      avatarUrl: gUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      joinedDate: new Date(),
      accountStatus: status
    };

    await recordAuditLog({
      userId: newStaffUser.id,
      userName: newStaffUser.name,
      userEmail: newStaffUser.email,
      userRole: String(newStaffUser.role),
      userAvatar: newStaffUser.avatarUrl,
      action: 'LOGIN',
      method: 'google_oauth',
      status: 'SUCCESS',
      details: `Google SSO Login: ${status === 'approved' ? 'Access Granted' : 'Pending Administrative Approval'}`
    }).catch(err => console.debug('Audit log record error:', err));

    // Persist / update employee profile in Supabase database
    await saveOrUpdateUserProfile(newStaffUser, gUser.uid).catch(err => console.debug('Profile save notice:', err));

    localStorage.setItem('mw_current_user', JSON.stringify(sanitizeUserForStorage(newStaffUser)));
    onLogin(sanitizeUserForStorage(newStaffUser));
  };

  useEffect(() => {
    let isMounted = true;

    // Detect errors from Google OAuth redirect in URL hash or query params
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const errorMsg = params.get('error_description') || hashParams.get('error_description') || params.get('error') || hashParams.get('error');
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg.replace(/\+/g, ' ')).toUpperCase());
      // Security: Strip error parameters from browser address bar immediately
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check if user is returning from Supabase Google OAuth redirect with active session
    if (isSupabaseEnabled && supabase) {
      // 1. Check existing session immediately
      supabase.auth.getSession().then(({ data: { session }, error: sessionErr }) => {
        if (!isMounted) return;
        if (sessionErr) {
          console.debug('Supabase session load error:', sessionErr);
          return;
        }
        if (session?.user && session.user.email) {
          // Security: Clean up sensitive access_token/refresh_token/code from URL so they are never exposed to users
          if (window.location.hash || window.location.search.includes('code=')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          handleSuccessfulGoogleUser({
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
          });
        }
      }).catch(err => {
        console.debug('Supabase session catch notice:', err);
      });

      // 2. Subscribe to auth changes (captures async OAuth code exchange)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') && session?.user?.email) {
          // Security: Clean up sensitive tokens from address bar
          if (window.location.hash || window.location.search.includes('code=')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          await handleSuccessfulGoogleUser({
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
          });
        }
      });

      return () => {
        isMounted = false;
        subscription?.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [staffList]);

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

          // Save / update employee details in Supabase
          await saveOrUpdateUserProfile(matchedUser, data.user.id).catch(err => console.debug('Profile save notice:', err));

          localStorage.setItem('mw_current_user', JSON.stringify(sanitizeUserForStorage(matchedUser)));
          onLogin(sanitizeUserForStorage(matchedUser));
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

        // Save / update employee details in Supabase
        await saveOrUpdateUserProfile(user).catch(err => console.debug('Profile save notice:', err));

        localStorage.setItem('mw_current_user', JSON.stringify(sanitizeUserForStorage(user)));
        onLogin(sanitizeUserForStorage(user));
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
        await saveOrUpdateUserProfile(user).catch(err => console.debug('Profile save notice:', err));
        localStorage.setItem('mw_current_user', JSON.stringify(sanitizeUserForStorage(user)));
        onLogin(sanitizeUserForStorage(user));
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
      const activeClient = supabase || getSupabase();

      const redirectUri = window.location.origin.endsWith('/') 
        ? window.location.origin 
        : `${window.location.origin}/`;

      // 100% Pure Supabase Google OAuth SSO (Redirects directly to Google Identity)
      const { data, error: authError } = await activeClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });

      if (authError) {
        console.error('Supabase Google OAuth error:', authError);
        setError(`GOOGLE SIGN-IN ERROR: ${authError.message.toUpperCase()}`);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message?.toUpperCase() || 'AUTHENTICATION PROTOCOL ERROR');
    } finally {
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

      // Save / update employee details in Supabase
      await saveOrUpdateUserProfile(user).catch(err => console.debug('Profile save notice:', err));

      localStorage.setItem('mw_current_user', JSON.stringify(sanitizeUserForStorage(user)));
      onLogin(sanitizeUserForStorage(user));
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

        {/* Form Body */}
        <div className="p-8 space-y-6">

          {/* Primary Action: Google SSO Login */}
          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="w-full bg-white hover:bg-neutral-100 text-neutral-900 font-black font-mono text-xs uppercase tracking-wider py-3.5 px-4 rounded-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl cursor-pointer group"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-700" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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
                  <span className="tracking-wide">Sign In with Google</span>
                </>
              )}
            </button>
            <div className="flex justify-center items-center mt-2 px-1">
              <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Official Supabase SSO Connected
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-neutral-800 w-full"></div>
            <span className="bg-[#0a0b0e] px-3 font-mono text-[9px] text-neutral-500 uppercase tracking-widest relative">
              OR LOGIN WITH PASSWORD
            </span>
          </div>

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full bg-[#161821] hover:bg-[#1f2230] text-white border border-neutral-700 hover:border-neutral-500 font-bold font-mono text-xs uppercase tracking-wider py-2.5 rounded-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In with Password <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Rapid Demo Access */}
          <div className="pt-6 border-t border-neutral-800/80">
            <p className="font-mono text-[9px] text-center text-neutral-500 mb-3 uppercase tracking-widest">
              RAPID DEMO TELEMETRY ACCESS
            </p>
            <div className="flex justify-center gap-1.5 flex-wrap font-mono text-[10px]">
               <button type="button" onClick={() => handleDemoLogin('superadmin@agency.com')} className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/50 rounded-sm transition-colors font-bold cursor-pointer">⚡ Super Admin</button>
               <button type="button" onClick={() => handleDemoLogin('emily@agency.com')} className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-600/50 rounded-sm transition-colors font-bold cursor-pointer">👑 HR (Emily)</button>
               <button type="button" onClick={() => handleDemoLogin('sarah@agency.com')} className="px-2.5 py-1 bg-[#12141a] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-sm transition-colors cursor-pointer">Admin</button>
               <button type="button" onClick={() => handleDemoLogin('alex@agency.com')} className="px-2.5 py-1 bg-[#12141a] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-sm transition-colors cursor-pointer">Manager</button>
               <button type="button" onClick={() => handleDemoLogin('tom@agency.com')} className="px-2.5 py-1 bg-[#12141a] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-sm transition-colors cursor-pointer">Designer</button>
               <button type="button" onClick={() => handleDemoLogin('jane@agency.com')} className="px-2.5 py-1 bg-[#12141a] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-sm transition-colors cursor-pointer">AE</button>
               <button type="button" onClick={() => handleDemoLogin('finance@agency.com')} className="px-2.5 py-1 bg-[#12141a] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-sm transition-colors cursor-pointer">Finance</button>
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
