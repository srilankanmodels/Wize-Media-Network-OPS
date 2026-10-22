import React, { useState } from 'react';
import { StaffMember, Role, StaffPermissions } from '../types';
import { 
  ShieldCheck, ShieldAlert, Lock, Unlock, Eye, EyeOff, Users, 
  Briefcase, DollarSign, Mail, HardDrive, Calendar, Search, 
  Filter, Check, AlertTriangle, RefreshCw, Sparkles, UserCheck, 
  SlidersHorizontal, CheckCircle2, XCircle, Info, Target
} from 'lucide-react';

interface AccessManagementProps {
  staffList: StaffMember[];
  onUpdateStaffPermissions: (staffId: string, permissions: StaffPermissions) => void;
  currentUser: StaffMember;
  departments: string[];
}

const AccessManagement: React.FC<AccessManagementProps> = ({
  staffList,
  onUpdateStaffPermissions,
  currentUser,
  departments
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');
  const [activePresetMessage, setActivePresetMessage] = useState<string | null>(null);

  // Filter staff
  const filteredStaff = staffList.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.staffId && s.staffId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchDept = filterDepartment === 'ALL' || s.department === filterDepartment;
    const matchRole = filterRole === 'ALL' || s.role === filterRole;
    return matchSearch && matchDept && matchRole;
  });

  const handleTogglePermission = (staff: StaffMember, key: keyof StaffPermissions) => {
    const current = staff.permissions || {};
    const updated: StaffPermissions = {
      ...current,
      [key]: !current[key]
    };
    onUpdateStaffPermissions(staff.id, updated);
  };

  const applyPreset = (presetName: string) => {
    if (presetName === 'designers_contacts') {
      // Grant designers client contact access
      staffList.forEach(s => {
        if (s.role === Role.DESIGNER || (s.department || '').toLowerCase() === 'creative') {
          onUpdateStaffPermissions(s.id, {
            ...(s.permissions || {}),
            canViewClientContacts: true
          });
        }
      });
      setActivePresetMessage('Designers granted Client Contacts access.');
    } else if (presetName === 'strict_security') {
      // Standard strict RBAC rules
      staffList.forEach(s => {
        const normRole = (s.role || '').toLowerCase();
        const isAdmin = normRole === 'admin' || s.role === Role.ADMIN || s.role === Role.SUPER_ADMIN;
        const isGM = normRole.includes('gm') || s.role === Role.GM;
        const isAccounts = normRole === 'accounts' || (s.department || '').toLowerCase() === 'finance';
        const isHR = normRole === 'hr' || s.role === Role.HR;
        const isManager = normRole === 'management' || s.role === Role.MANAGEMENT;
        const isAE = normRole === 'account executive' || s.role === Role.AE;

        onUpdateStaffPermissions(s.id, {
          canViewFinance: isAdmin || isGM || isAccounts,
          canViewProjects: isAdmin || isGM || isManager || isAE || isAccounts,
          canViewAllProjects: isAdmin || isGM,
          canViewClientContacts: isAdmin || isGM || isManager || isAE || s.role === Role.DESIGNER,
          canManageTeam: isAdmin || isGM || isHR,
          canApproveLeaves: isAdmin || isGM || isHR || isManager,
          canAccessCalendar: true,
          canAccessGmail: true,
          canAccessDrive: true
        });
      });
      setActivePresetMessage('Standard strict security policies synchronized across all personnel.');
    }
    setTimeout(() => setActivePresetMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Liquid Glass */}
      <div className="liquid-glass-card hud-frame border border-[var(--jarvis-border)] p-8 sm:p-10 rounded-sm relative overflow-hidden shadow-[0_0_40px_-10px_rgba(var(--jarvis-primary-rgb),0.2)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="font-mono text-[9px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-ping" />
              <ShieldCheck size={14} className="text-[var(--jarvis-primary)]" />
              <span>SUPER ADMIN CONSOLE // ACCESS MANAGEMENT PROTOCOL // JARVIS MATRIX</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight font-heading">
              ACCESS CONTROL <span className="text-[var(--jarvis-primary)] hud-glow-text">& PERMISSIONS</span>
            </h1>
            <p className="text-xs font-mono text-neutral-300 max-w-2xl leading-relaxed">
              Configure strict role-based authorization, give or recall module access for team members, enforce manager department boundaries, and protect private workspace data.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => applyPreset('designers_contacts')}
              className="px-3 py-1.5 bg-[#181a24] border border-neutral-700 hover:border-amber-400 text-neutral-200 hover:text-white font-mono text-[11px] uppercase rounded-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Eye size={12} className="text-amber-400" /> Allow Designers Contacts
            </button>
            <button
              type="button"
              onClick={() => applyPreset('strict_security')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black font-mono text-[11px] uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck size={14} /> Strict Security Matrix
            </button>
          </div>
        </div>

        {activePresetMessage && (
          <div className="mt-4 p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-sm font-mono text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{activePresetMessage}</span>
          </div>
        )}
      </div>

      {/* Rules Information Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0a0b0e] border border-neutral-800 rounded-sm space-y-1">
          <div className="font-mono text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1.5">
            <DollarSign size={12} /> Finance Perimeter
          </div>
          <p className="text-xs text-neutral-300 font-sans leading-relaxed">
            Finance dashboard & cash flow are restricted exclusively to Admins, GM, and Finance persons. Everyone else is locked out unless explicitly granted.
          </p>
        </div>

        <div className="p-4 bg-[#0a0b0e] border border-neutral-800 rounded-sm space-y-1">
          <div className="font-mono text-[10px] text-sky-400 uppercase font-bold flex items-center gap-1.5">
            <Briefcase size={12} /> Department Manager Scoping
          </div>
          <p className="text-xs text-neutral-300 font-sans leading-relaxed">
            Managers have access strictly to their department's projects, staff records, and leave approvals. Admins and GM maintain company-wide full access.
          </p>
        </div>

        <div className="p-4 bg-[#0a0b0e] border border-neutral-800 rounded-sm space-y-1">
          <div className="font-mono text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1.5">
            <Lock size={12} /> Isolated Google Vaults
          </div>
          <p className="text-xs text-neutral-300 font-sans leading-relaxed">
            Each user connects and accesses only their own private Gmail, Google Drive, and Google Calendar data. Cross-user data leakage is strictly prohibited.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e0f14] p-3 rounded-sm border border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="SEARCH PERSONNEL BY NAME, EMAIL, OR STAFF ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#12141a] border border-neutral-800 focus:border-white font-mono text-xs uppercase text-white rounded-sm outline-none placeholder:text-neutral-600"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="bg-[#12141a] border border-neutral-800 text-neutral-300 text-xs font-mono p-2 rounded-sm outline-none cursor-pointer [color-scheme:dark]"
            style={{ colorScheme: 'dark' }}
            value={filterDepartment}
            onChange={e => setFilterDepartment(e.target.value)}
          >
            <option value="ALL" style={{ backgroundColor: '#12141a', color: '#ffffff' }} className="bg-[#12141a] text-white py-1">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d} style={{ backgroundColor: '#12141a', color: '#ffffff' }} className="bg-[#12141a] text-white py-1">{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Personnel Access Table */}
      <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0e0f14] border-b border-neutral-800 text-[10px] text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Personnel</th>
                <th className="p-3.5">Role / Dept</th>
                <th className="p-3.5 text-center">Projects</th>
                <th className="p-3.5 text-center">Workload</th>
                <th className="p-3.5 text-center">Finance</th>
                <th className="p-3.5 text-center">Contacts</th>
                <th className="p-3.5 text-center">Team Mgmt</th>
                <th className="p-3.5 text-center">Leave Approvals</th>
                <th className="p-3.5 text-center">Drive / Gmail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850">
              {filteredStaff.map(staff => {
                const isSuperAdmin = staff.role === Role.SUPER_ADMIN;
                const isAdmin = staff.role === Role.ADMIN || (staff.role || '').toLowerCase() === 'admin';
                const isGM = staff.role === Role.GM || (staff.role || '').toLowerCase() === 'general manager';
                const isAccounts = staff.role === Role.ACCOUNTS || (staff.department || '').toLowerCase() === 'finance';
                const isHR = staff.role === Role.HR;
                const isManager = staff.role === Role.MANAGEMENT;

                const p = staff.permissions || {};

                // Calculated active states
                const hasFinance = isSuperAdmin || isAdmin || isGM || isAccounts || !!p.canViewFinance;
                const hasProjects = isSuperAdmin || isAdmin || isGM || isManager || staff.role === Role.AE || isAccounts || !!p.canViewProjects;
                const hasWorkload = isSuperAdmin || isAdmin || isGM || isManager || staff.role === Role.AE || !!p.canViewWorkload;
                const hasContacts = isSuperAdmin || isAdmin || isGM || isManager || staff.role === Role.AE || !!p.canViewClientContacts;
                const hasTeamMgmt = isSuperAdmin || isAdmin || isGM || isHR || !!p.canManageTeam;
                const hasLeaveApprove = isSuperAdmin || isAdmin || isGM || isHR || isManager || !!p.canApproveLeaves;

                return (
                  <tr key={staff.id} className="hover:bg-[#12141a]/60 transition-colors">
                    {/* Personnel Info */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={staff.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'}
                          alt={staff.name}
                          className="w-8 h-8 rounded-full border border-neutral-700 object-cover"
                        />
                        <div>
                          <div className="text-white font-bold flex items-center gap-1.5">
                            <span>{staff.name}</span>
                            {isSuperAdmin && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500 text-black font-black rounded-xs">SUPER</span>
                            )}
                          </div>
                          <div className="text-neutral-500 text-[10px]">{staff.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Dept */}
                    <td className="p-3.5">
                      <div className="text-neutral-300 font-bold">{staff.role}</div>
                      <div className="text-neutral-500 text-[10px]">{staff.department}</div>
                    </td>

                    {/* Projects Toggle */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        disabled={isSuperAdmin || isAdmin || isGM}
                        onClick={() => handleTogglePermission(staff, 'canViewProjects')}
                        className={`p-1.5 rounded-sm transition-all cursor-pointer ${
                          hasProjects 
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' 
                            : 'bg-neutral-900 text-neutral-600 border border-neutral-800 hover:text-neutral-400'
                        }`}
                        title={hasProjects ? 'Projects Visible' : 'Projects Hidden'}
                      >
                        {hasProjects ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </td>

                    {/* Workload Balancer Toggle */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        disabled={isSuperAdmin || isAdmin || isGM || isManager || staff.role === Role.AE}
                        onClick={() => handleTogglePermission(staff, 'canViewWorkload')}
                        className={`p-1.5 rounded-sm transition-all cursor-pointer ${
                          hasWorkload 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-neutral-900 text-neutral-600 border border-neutral-800 hover:text-neutral-400'
                        }`}
                        title={hasWorkload ? 'Workload Matrix Clearance Granted' : 'Workload Matrix Restricted'}
                      >
                        {hasWorkload ? <Target size={14} /> : <Lock size={14} />}
                      </button>
                    </td>

                    {/* Finance Toggle */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        disabled={isSuperAdmin || isAdmin || isGM}
                        onClick={() => handleTogglePermission(staff, 'canViewFinance')}
                        className={`p-1.5 rounded-sm transition-all cursor-pointer ${
                          hasFinance 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                            : 'bg-neutral-900 text-neutral-600 border border-neutral-800 hover:text-neutral-400'
                        }`}
                        title={hasFinance ? 'Finance Unlocked' : 'Finance Locked'}
                      >
                        {hasFinance ? <Unlock size={14} /> : <Lock size={14} />}
                      </button>
                    </td>

                    {/* Contacts Toggle (Designers / Others) */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        disabled={isSuperAdmin || isAdmin || isGM}
                        onClick={() => handleTogglePermission(staff, 'canViewClientContacts')}
                        className={`p-1.5 rounded-sm transition-all cursor-pointer ${
                          hasContacts 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-neutral-900 text-neutral-600 border border-neutral-800 hover:text-neutral-400'
                        }`}
                        title={hasContacts ? 'Contacts Visible' : 'Contacts Hidden'}
                      >
                        {hasContacts ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </td>

                    {/* Team Mgmt Toggle (Add / Delete Employers) */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        disabled={isSuperAdmin || isAdmin || isGM || isHR}
                        onClick={() => handleTogglePermission(staff, 'canManageTeam')}
                        className={`p-1.5 rounded-sm transition-all cursor-pointer ${
                          hasTeamMgmt 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                            : 'bg-neutral-900 text-neutral-600 border border-neutral-800 hover:text-neutral-400'
                        }`}
                        title={hasTeamMgmt ? 'Can Add/Delete Staff' : 'No Staff Mutation'}
                      >
                        {hasTeamMgmt ? <ShieldCheck size={14} /> : <Lock size={14} />}
                      </button>
                    </td>

                    {/* Leave Approvals Toggle */}
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        disabled={isSuperAdmin || isAdmin || isGM || isHR}
                        onClick={() => handleTogglePermission(staff, 'canApproveLeaves')}
                        className={`p-1.5 rounded-sm transition-all cursor-pointer ${
                          hasLeaveApprove 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                            : 'bg-neutral-900 text-neutral-600 border border-neutral-800 hover:text-neutral-400'
                        }`}
                        title={hasLeaveApprove ? 'Authorized to Approve Leaves' : 'Cannot Approve Leaves'}
                      >
                        {hasLeaveApprove ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      </button>
                    </td>

                    {/* Google Drive / Gmail Vault Isolation Badge */}
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 bg-[#14151e] border border-neutral-800 text-[10px] text-sky-400 uppercase rounded-xs font-mono">
                        User Vault
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccessManagement;
