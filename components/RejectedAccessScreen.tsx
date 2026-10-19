import React from 'react';
import { XCircle, LogOut, Mail, ShieldAlert } from 'lucide-react';

interface RejectedAccessScreenProps {
  email?: string;
  onSignOut: () => void;
}

const RejectedAccessScreen: React.FC<RejectedAccessScreenProps> = ({ email, onSignOut }) => {
  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden bg-grid-pattern selection:bg-white selection:text-black">
      
      <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm shadow-2xl w-full max-w-md overflow-hidden z-10 relative">
        
        {/* Header */}
        <div className="bg-[#0e0f14] p-8 text-center border-b border-neutral-800 relative">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-sm flex items-center justify-center mx-auto mb-3">
            <XCircle size={24} />
          </div>
          <div className="font-mono text-[9px] text-rose-400 uppercase tracking-[0.25em] mb-1">
            ACCESS PROTOCOL REJECTED
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight font-heading">
            Access Request Declined
          </h1>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 text-center">
          <p className="text-xs font-mono text-neutral-300 leading-relaxed">
            Your request to access MEDIAWIZE OPS has not been approved by administration.
          </p>

          {email && (
            <div className="bg-[#12141a] border border-neutral-800 p-3 rounded-sm font-mono text-xs text-neutral-400 flex items-center justify-center gap-2">
              <Mail size={13} className="text-neutral-500" />
              <span>{email}</span>
            </div>
          )}

          <p className="text-[11px] font-mono text-neutral-500 leading-relaxed">
            If you are an active employee or contractor requiring workspace access, please reach out directly to your department lead or HR administration.
          </p>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full bg-white text-black hover:bg-neutral-200 font-black font-mono text-xs uppercase tracking-wider py-3 rounded-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out & Return</span>
          </button>
        </div>

      </div>

      <p className="mt-8 font-mono text-neutral-500 text-[10px] uppercase tracking-widest">
        [ 6.9271° N, 79.8612° E ] NODE: COLOMBO 07 // MEDIAWIZE OS
      </p>
    </div>
  );
};

export default RejectedAccessScreen;
