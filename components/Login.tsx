import React, { useState } from 'react';
import { StaffMember } from '../types';
import { Lock, Mail, ArrowRight, ShieldCheck, Hexagon } from 'lucide-react';

interface LoginProps {
  onLogin: (user: StaffMember) => void;
  staffList: StaffMember[];
}

const Login: React.FC<LoginProps> = ({ onLogin, staffList }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = staffList.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (user && user.password === password) {
      onLogin(user);
    } else {
      setError('INVALID AUTHENTICATION CREDENTIALS');
    }
  };

  const handleDemoLogin = (email: string) => {
    setEmail(email);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden bg-grid-pattern selection:bg-white selection:text-black">
      
      <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm shadow-2xl w-full max-w-md overflow-hidden z-10 relative">
        
        {/* Header */}
        <div className="bg-[#0e0f14] p-8 text-center border-b border-neutral-800 relative overflow-hidden">
          <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-[0.25em] mb-3">
            PROPRIETARY ECOSYSTEM // V4.0.2
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
              className="w-full bg-white text-black hover:bg-neutral-200 font-black font-mono text-xs uppercase tracking-wider py-3 rounded-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              Sign In to Workspace <ArrowRight className="w-4 h-4" />
            </button>
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
