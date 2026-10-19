import React, { useState } from 'react';
import { EmployeeAccessRequest } from '../types';
import { ShieldAlert, RefreshCw, LogOut, Clock, Mail, User, CheckCircle2, ShieldCheck, Hexagon } from 'lucide-react';

interface PendingApprovalScreenProps {
  request: Partial<EmployeeAccessRequest> | null;
  onRefresh: () => void;
  onSignOut: () => void;
}

const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  request,
  onRefresh,
  onSignOut
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const formattedDate = request?.requestedAt 
    ? new Date(request.requestedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : new Date().toLocaleString();

  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden bg-grid-pattern selection:bg-white selection:text-black">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm shadow-2xl w-full max-w-lg overflow-hidden z-10 relative">
        
        {/* Header */}
        <div className="bg-[#0e0f14] p-8 text-center border-b border-neutral-800 relative overflow-hidden">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="font-mono text-[9px] text-amber-400 uppercase tracking-[0.25em] flex items-center gap-1.5">
              <Clock size={12} className="animate-spin text-amber-400" />
              <span>SECURITY PROTOCOL // GATE 01</span>
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/30 text-[9px] font-mono text-amber-400">
              PENDING APPROVAL
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-heading">
            Identity Verification Pending
          </h1>
          <p className="font-mono text-xs text-neutral-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Your Google identity has authenticated successfully. Your employee access request is awaiting review by MediaWize administration.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6">
          
          {/* Identity Card */}
          <div className="bg-[#12141a] border border-neutral-800 p-5 rounded-sm flex items-center gap-4">
            <img
              src={request?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
              alt={request?.fullName || 'Employee'}
              className="w-14 h-14 rounded-sm object-cover border border-neutral-700 shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white truncate font-heading">{request?.fullName || 'Google User'}</span>
                <span className="px-1.5 py-0.5 rounded-sm bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[9px] font-mono uppercase">
                  Google Verified
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono truncate">
                <Mail size={12} className="shrink-0 text-neutral-500" />
                <span className="truncate">{request?.email || 'N/A'}</span>
              </div>
              <div className="text-[10px] text-neutral-500 font-mono">
                Requested: {formattedDate}
              </div>
            </div>
          </div>

          {/* Status Details */}
          <div className="bg-[#0a0b0e] border border-amber-500/20 p-4 rounded-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 uppercase tracking-wider">Access Status</span>
              <span className="text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Pending Verification
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 uppercase tracking-wider">Assigned Department</span>
              <span className="text-neutral-500 uppercase">Awaiting Lead Assignment</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 uppercase tracking-wider">Assigned Job Role</span>
              <span className="text-neutral-500 uppercase">Awaiting Administrator</span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 text-center font-mono leading-relaxed">
            Notice: Company operational protocols, financial ledgers, and project nodes remain encrypted until verified by authorized personnel.
          </p>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-full bg-white text-black hover:bg-neutral-200 font-black font-mono text-xs uppercase tracking-wider py-3 rounded-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Checking Status...' : 'Refresh Verification Status'}</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full bg-[#12141a] hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-800/50 font-mono text-xs uppercase tracking-wider py-2.5 rounded-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out of Google Identity</span>
            </button>
          </div>

        </div>

      </div>

      <p className="mt-8 font-mono text-neutral-500 text-[10px] uppercase tracking-widest">
        [ 6.9271° N, 79.8612° E ] NODE: COLOMBO 07 // MEDIAWIZE OS
      </p>
    </div>
  );
};

export default PendingApprovalScreen;
