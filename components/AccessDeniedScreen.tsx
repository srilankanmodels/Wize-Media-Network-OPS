import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface AccessDeniedScreenProps {
  moduleName?: string;
  onReturn: () => void;
}

const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({ moduleName, onReturn }) => {
  return (
    <div className="p-8 max-w-2xl mx-auto my-12 bg-[#0a0b0e] border border-rose-500/30 rounded-sm space-y-6 text-center">
      <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-sm flex items-center justify-center mx-auto">
        <Lock size={22} />
      </div>

      <div className="space-y-1">
        <div className="font-mono text-[9px] text-rose-400 uppercase tracking-[0.25em]">
          SECURITY POLICY ENFORCEMENT // 403 FORBIDDEN
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-tight font-heading">
          Module Access Restricted
        </h2>
      </div>

      <p className="text-xs font-mono text-neutral-300 leading-relaxed max-w-md mx-auto">
        Your assigned job role does not possess the security clearance required to inspect {moduleName ? `the ${moduleName}` : 'this operational module'}.
      </p>

      <div className="pt-2">
        <button
          type="button"
          onClick={onReturn}
          className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 font-mono font-black text-xs uppercase tracking-wider rounded-sm inline-flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={14} /> Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AccessDeniedScreen;
