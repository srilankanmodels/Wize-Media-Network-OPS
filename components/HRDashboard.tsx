import React, { useState, useMemo } from 'react';
import { StaffMember, LeaveRequest, Role } from '../types';
import { 
  Users, Calendar, Heart, ShieldAlert, Check, X, Search, Phone, FileText, 
  Activity, Plus, Clock, MessageSquare, Briefcase, ArrowUpRight, Trash2, 
  Filter, AlertCircle, CheckCircle2, XCircle, ChevronDown, UserCheck, 
  UserX, Award, ShieldCheck, HelpCircle, Layers, CalendarDays
} from 'lucide-react';

interface HRDashboardProps {
  staffList: StaffMember[];
  leaveRequests: LeaveRequest[];
  onUpdateLeave: (requestId: string, status: 'Approved' | 'Rejected', reviewNote?: string) => void;
  currentUser: StaffMember;
  onAddLeave: (request: Partial<LeaveRequest>) => void;
  onDeleteLeave?: (requestId: string) => void;
}

export const ANNUAL_LEAVE_ALLOWANCE = 14;
export const CASUAL_LEAVE_ALLOWANCE = 7;
export const SICK_LEAVE_ALLOWANCE = 7;

const calculateDays = (start: Date | string, end: Date | string) => {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  const diffTime = Math.abs(e.getTime() - s.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

const HRDashboard: React.FC<HRDashboardProps> = ({ 
  staffList, 
  leaveRequests, 
  onUpdateLeave, 
  currentUser, 
  onAddLeave,
  onDeleteLeave 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'employees' | 'my-leaves' | 'medical'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewModalRequest, setReviewModalRequest] = useState<{ req: LeaveRequest; action: 'Approved' | 'Rejected' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [leaveToDelete, setLeaveToDelete] = useState<LeaveRequest | null>(null);

  const [leaveForm, setLeaveForm] = useState<{
    staffId: string;
    staffName: string;
    type: 'Annual' | 'Sick' | 'Casual' | 'Unpaid' | 'Short';
    startDate: string;
    endDate: string;
    reason: string;
  }>({
    staffId: currentUser.id,
    staffName: currentUser.name,
    type: 'Annual',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const canApprove = ([Role.ADMIN, Role.HR, Role.MANAGEMENT] as string[]).includes(currentUser.role);

  // Departments list for filter
  const departments = useMemo(() => {
    const deps = new Set(staffList.map(s => s.department).filter(Boolean));
    return ['ALL', ...Array.from(deps)];
  }, [staffList]);

  // Active leaves today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentlyOnLeave = useMemo(() => {
    return leaveRequests.filter(req => {
      if (req.status !== 'Approved') return false;
      const start = new Date(req.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(req.endDate);
      end.setHours(23, 59, 59, 999);
      return today >= start && today <= end;
    });
  }, [leaveRequests, today]);

  const upcomingLeaves = useMemo(() => {
    return leaveRequests.filter(req => {
      if (req.status !== 'Approved') return false;
      const start = new Date(req.startDate);
      start.setHours(0, 0, 0, 0);
      return start > today;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [leaveRequests, today]);

  const pendingApprovals = useMemo(() => {
    return leaveRequests.filter(l => l.status === 'Pending')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [leaveRequests]);

  const myRequests = useMemo(() => {
    return leaveRequests.filter(l => l.staffId === currentUser.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [leaveRequests, currentUser.id]);

  // Employee Quotas calculation
  const employeeLeaveSummaries = useMemo(() => {
    return staffList.map(staff => {
      const staffLeaves = leaveRequests.filter(l => l.staffId === staff.id);
      const approved = staffLeaves.filter(l => l.status === 'Approved');
      const pending = staffLeaves.filter(l => l.status === 'Pending');

      const annualTaken = approved
        .filter(l => l.type === 'Annual')
        .reduce((sum, l) => sum + calculateDays(l.startDate, l.endDate), 0);

      const casualTaken = approved
        .filter(l => l.type === 'Casual')
        .reduce((sum, l) => sum + calculateDays(l.startDate, l.endDate), 0);

      const sickTaken = approved
        .filter(l => l.type === 'Sick')
        .reduce((sum, l) => sum + calculateDays(l.startDate, l.endDate), 0);

      const unpaidTaken = approved
        .filter(l => l.type === 'Unpaid')
        .reduce((sum, l) => sum + calculateDays(l.startDate, l.endDate), 0);

      const totalTaken = annualTaken + casualTaken + sickTaken + unpaidTaken;

      return {
        staff,
        annualTaken,
        annualRemaining: Math.max(0, ANNUAL_LEAVE_ALLOWANCE - annualTaken),
        casualTaken,
        casualRemaining: Math.max(0, CASUAL_LEAVE_ALLOWANCE - casualTaken),
        sickTaken,
        sickRemaining: Math.max(0, SICK_LEAVE_ALLOWANCE - sickTaken),
        unpaidTaken,
        totalTaken,
        pendingCount: pending.length,
        leaves: staffLeaves
      };
    });
  }, [staffList, leaveRequests]);

  // My Quota
  const myQuota = useMemo(() => {
    return employeeLeaveSummaries.find(e => e.staff.id === currentUser.id) || {
      annualTaken: 0,
      annualRemaining: ANNUAL_LEAVE_ALLOWANCE,
      casualTaken: 0,
      casualRemaining: CASUAL_LEAVE_ALLOWANCE,
      sickTaken: 0,
      sickRemaining: SICK_LEAVE_ALLOWANCE,
      totalTaken: 0,
      pendingCount: 0
    };
  }, [employeeLeaveSummaries, currentUser.id]);

  const handleOpenAddModal = (targetStaff?: StaffMember) => {
    setLeaveForm({
      staffId: targetStaff ? targetStaff.id : currentUser.id,
      staffName: targetStaff ? targetStaff.name : currentUser.name,
      type: 'Annual',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) return;

    onAddLeave({
      staffId: leaveForm.staffId,
      staffName: leaveForm.staffName,
      type: leaveForm.type,
      startDate: new Date(leaveForm.startDate),
      endDate: new Date(leaveForm.endDate),
      reason: leaveForm.reason.trim()
    });

    setIsModalOpen(false);
  };

  const handleConfirmReview = () => {
    if (!reviewModalRequest) return;
    onUpdateLeave(
      reviewModalRequest.req.id, 
      reviewModalRequest.action, 
      reviewNote.trim() || undefined
    );
    setReviewModalRequest(null);
    setReviewNote('');
  };

  const handleConfirmDelete = () => {
    if (leaveToDelete && onDeleteLeave) {
      onDeleteLeave(leaveToDelete.id);
      setLeaveToDelete(null);
    }
  };

  const filteredApprovals = useMemo(() => {
    return leaveRequests.filter(req => {
      const matchesSearch = 
        req.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' ? true : req.status === statusFilter;
      const staff = staffList.find(s => s.id === req.staffId);
      const matchesDept = departmentFilter === 'ALL' ? true : staff?.department === departmentFilter;
      return matchesSearch && matchesStatus && matchesDept;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [leaveRequests, searchTerm, statusFilter, departmentFilter, staffList]);

  const filteredEmployees = useMemo(() => {
    return employeeLeaveSummaries.filter(item => {
      const matchesSearch = 
        item.staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.staff.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.staff.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = departmentFilter === 'ALL' ? true : item.staff.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [employeeLeaveSummaries, searchTerm, departmentFilter]);

  const filteredMedical = useMemo(() => {
    return staffList.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.bloodGroup?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staffList, searchTerm]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-8 sm:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
            <span>PROPRIETARY ECOSYSTEM // HR MANAGEMENT</span>
            {canApprove && (
              <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[9px] rounded-xs font-bold">
                HR GOVERNANCE ACTIVE
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-heading leading-none">
            PEOPLE <span className="text-neutral-500">& LEAVE PORTAL</span>
          </h1>
          <p className="text-neutral-400 text-xs font-mono uppercase tracking-wider mt-3">
            Employee HR Management, Absence Tracking, Quotas & Executive Approvals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-5 py-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-left">
            <div className="text-[9px] text-neutral-400 uppercase tracking-widest">PENDING APPROVALS</div>
            <div className="text-2xl font-black text-amber-400 leading-none mt-1">{pendingApprovals.length}</div>
          </div>

          <div className="px-5 py-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-left">
            <div className="text-[9px] text-neutral-400 uppercase tracking-widest">ON LEAVE TODAY</div>
            <div className="text-2xl font-black text-white leading-none mt-1">{currentlyOnLeave.length}</div>
          </div>

          <button 
            onClick={() => handleOpenAddModal()}
            className="bg-white text-black hover:bg-neutral-200 px-6 py-3.5 font-black text-xs uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} /> REQUEST LEAVE
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'overview', label: 'HR Overview & Roster', icon: CalendarDays },
            ...(canApprove ? [{ id: 'approvals', label: 'Approvals Queue', count: pendingApprovals.length, icon: UserCheck }] : []),
            { id: 'employees', label: 'Employee HR Management', count: staffList.length, icon: Users },
            { id: 'my-leaves', label: 'My Leave History', count: myRequests.length, icon: Calendar },
            { id: 'medical', label: 'Medical & Welfare Vault', count: staffList.length, icon: Heart }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); }}
                className={`px-5 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-black font-black border-white shadow-md'
                    : 'bg-[#0a0b0e] text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-xs text-[9px] font-bold ${activeTab === tab.id ? 'bg-black text-white' : 'bg-neutral-800 text-neutral-200'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ROSTER */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-5 space-y-2">
              <div className="flex items-center justify-between text-neutral-400 font-mono text-[10px] uppercase tracking-widest">
                <span>Active On Leave Today</span>
                <UserX size={16} className="text-rose-400" />
              </div>
              <div className="text-3xl font-black text-white font-heading">{currentlyOnLeave.length}</div>
              <div className="text-[10px] font-mono text-neutral-500">
                Out of {staffList.length} total active personnel
              </div>
            </div>

            <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-5 space-y-2">
              <div className="flex items-center justify-between text-neutral-400 font-mono text-[10px] uppercase tracking-widest">
                <span>Pending Approvals</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-400 font-heading">{pendingApprovals.length}</div>
              <div className="text-[10px] font-mono text-neutral-500">
                Awaiting HR / Management review
              </div>
            </div>

            <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-5 space-y-2">
              <div className="flex items-center justify-between text-neutral-400 font-mono text-[10px] uppercase tracking-widest">
                <span>My Annual Leave Balance</span>
                <Award size={16} className="text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400 font-heading">
                {myQuota.annualRemaining} <span className="text-xs text-neutral-400 font-mono">/ {ANNUAL_LEAVE_ALLOWANCE} DAYS</span>
              </div>
              <div className="text-[10px] font-mono text-neutral-500">
                {myQuota.annualTaken} days utilized this annual cycle
              </div>
            </div>

            <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-5 space-y-2">
              <div className="flex items-center justify-between text-neutral-400 font-mono text-[10px] uppercase tracking-widest">
                <span>Total Leave Records</span>
                <Layers size={16} className="text-sky-400" />
              </div>
              <div className="text-3xl font-black text-white font-heading">{leaveRequests.length}</div>
              <div className="text-[10px] font-mono text-neutral-500">
                {leaveRequests.filter(l => l.status === 'Approved').length} approved leaves logged
              </div>
            </div>
          </div>

          {/* Currently On Leave & Upcoming Roster */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Absences */}
            <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <h3 className="font-heading font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                    <UserX size={16} className="text-rose-400" />
                    <span>Active Leaves Today</span>
                  </h3>
                  <p className="font-mono text-[10px] text-neutral-400 uppercase mt-0.5">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <span className="font-mono text-xs px-2.5 py-1 bg-[#12141a] border border-neutral-800 text-neutral-300 rounded-sm">
                  {currentlyOnLeave.length} Personnel
                </span>
              </div>

              {currentlyOnLeave.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500/50" />
                  Full operational complement on duty today
                </div>
              ) : (
                <div className="space-y-3">
                  {currentlyOnLeave.map(req => {
                    const staff = staffList.find(s => s.id === req.staffId);
                    return (
                      <div key={req.id} className="p-4 bg-[#12141a] border border-neutral-800 rounded-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-sm bg-[#1a1c24] border border-neutral-700 overflow-hidden shrink-0">
                            <img src={staff?.avatarUrl} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-heading font-black text-white text-sm uppercase truncate">{req.staffName}</h4>
                            <div className="font-mono text-[10px] text-neutral-400 uppercase mt-0.5">
                              {staff?.department || 'Operations'} // {req.type} LEAVE
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono text-xs shrink-0">
                          <span className="text-[10px] text-neutral-400 block">Until</span>
                          <span className="text-white font-bold">{new Date(req.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Leaves */}
            <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <h3 className="font-heading font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                    <Calendar size={16} className="text-sky-400" />
                    <span>Upcoming Approved Leaves</span>
                  </h3>
                  <p className="font-mono text-[10px] text-neutral-400 uppercase mt-0.5">
                    Forward capacity & operational scheduling
                  </p>
                </div>
                <span className="font-mono text-xs px-2.5 py-1 bg-[#12141a] border border-neutral-800 text-neutral-300 rounded-sm">
                  {upcomingLeaves.length} Scheduled
                </span>
              </div>

              {upcomingLeaves.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest">
                  <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                  No upcoming leaves scheduled in pipeline
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                  {upcomingLeaves.slice(0, 6).map(req => {
                    const days = calculateDays(req.startDate, req.endDate);
                    return (
                      <div key={req.id} className="p-4 bg-[#12141a] border border-neutral-800 rounded-sm flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-heading font-black text-white text-sm uppercase">{req.staffName}</h4>
                          <div className="font-mono text-[10px] text-neutral-400 uppercase mt-0.5">
                            {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()} ({days} {days === 1 ? 'day' : 'days'})
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-sm bg-[#1a1c24] border border-neutral-700 font-mono text-[10px] text-neutral-300 uppercase">
                          {req.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPROVALS QUEUE (FOR HR / MANAGEMENT / ADMIN) */}
      {activeTab === 'approvals' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input 
                type="text" 
                placeholder="SEARCH REQUESTS BY EMPLOYEE NAME, REASON, OR LEAVE TYPE..." 
                className="w-full pl-12 pr-6 py-3.5 bg-[#0a0b0e] border border-neutral-800 focus:border-white font-mono text-xs uppercase tracking-wider text-white outline-none rounded-sm transition-colors placeholder:text-neutral-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Status Tabs */}
              <div className="flex items-center gap-1 p-1 bg-[#0a0b0e] border border-neutral-800 rounded-sm">
                {(['ALL', 'Pending', 'Approved', 'Rejected'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase rounded-xs transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white text-black font-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {st === 'Pending' ? `Pending (${pendingApprovals.length})` : st}
                  </button>
                ))}
              </div>

              {/* Department Dropdown */}
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="bg-[#0a0b0e] border border-neutral-800 text-neutral-300 font-mono text-xs px-3 py-2 rounded-sm outline-none focus:border-white"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d === 'ALL' ? 'ALL DEPARTMENTS' : d.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Approvals Table / Card List */}
          {filteredApprovals.length === 0 ? (
            <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-24 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest">
              <Calendar size={48} className="mx-auto mb-3 opacity-30 text-neutral-400" />
              Zero leave requests found matching filters
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApprovals.map(req => {
                const staff = staffList.find(s => s.id === req.staffId);
                const days = calculateDays(req.startDate, req.endDate);

                return (
                  <div 
                    key={req.id} 
                    className="bg-[#0a0b0e] border border-neutral-800 hover:border-neutral-700 rounded-sm p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-colors"
                  >
                    <div className="flex items-center gap-5 min-w-0 lg:w-1/3 shrink-0">
                      <div className="w-14 h-14 rounded-sm bg-[#12141a] border border-neutral-700 overflow-hidden shrink-0">
                        <img src={staff?.avatarUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-heading font-black text-white uppercase text-base truncate">{req.staffName}</p>
                        <div className="font-mono text-[10px] text-neutral-400 uppercase mt-0.5">
                          {staff?.role || 'Staff'} // {staff?.department || 'Agency'}
                        </div>
                        <div className="flex items-center gap-2 mt-2 font-mono text-[9px] uppercase">
                          <span className="px-2 py-0.5 rounded-sm bg-[#12141a] text-neutral-300 border border-neutral-800 font-bold">
                            {req.type} LEAVE
                          </span>
                          <span className="text-neutral-400">
                            SUBMITTED {new Date(req.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 font-mono text-xs text-neutral-300 space-y-2">
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-400">
                        <span>PERIOD: <strong className="text-white">{new Date(req.startDate).toLocaleDateString()}</strong> TO <strong className="text-white">{new Date(req.endDate).toLocaleDateString()}</strong></span>
                        <span className="px-2 py-0.5 bg-[#14151c] border border-neutral-800 text-neutral-200 rounded-xs font-bold">
                          {days} {days === 1 ? 'DAY' : 'DAYS'}
                        </span>
                      </div>
                      <div className="p-3 bg-[#12141a] border border-neutral-800/80 rounded-sm text-neutral-300 text-xs italic font-sans">
                        "{req.reason}"
                      </div>
                      {req.reviewNote && (
                        <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5 pt-1">
                          <span className="text-neutral-500 uppercase">Review Directive:</span>
                          <span className="text-neutral-300">"{req.reviewNote}"</span>
                          {req.reviewedBy && <span className="text-neutral-500">({req.reviewedBy})</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                      {req.status === 'Pending' ? (
                        <>
                          <button 
                            type="button"
                            onClick={() => { setReviewModalRequest({ req, action: 'Approved' }); setReviewNote(''); }} 
                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                          >
                            <Check size={14} strokeWidth={3} /> Approve
                          </button>
                          <button 
                            type="button"
                            onClick={() => { setReviewModalRequest({ req, action: 'Rejected' }); setReviewNote(''); }} 
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                          >
                            <X size={14} strokeWidth={3} /> Reject
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`px-4 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wider border font-bold ${
                            req.status === 'Approved' ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' :
                            req.status === 'Rejected' ? 'bg-rose-950/60 border-rose-500/30 text-rose-400' :
                            'bg-neutral-900 border-neutral-800 text-neutral-400'
                          }`}>
                            {req.status}
                          </div>
                          {onDeleteLeave && (
                            <button
                              type="button"
                              onClick={() => setLeaveToDelete(req)}
                              className="p-2 text-neutral-400 hover:text-rose-400 rounded-sm hover:bg-neutral-900 transition-colors"
                              title="Delete Leave Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EMPLOYEE HR MANAGEMENT (ALL EMPLOYEES & QUOTAS) */}
      {activeTab === 'employees' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input 
                type="text" 
                placeholder="SEARCH EMPLOYEES BY NAME, DEPARTMENT, OR DESIGNATION..." 
                className="w-full pl-12 pr-6 py-3.5 bg-[#0a0b0e] border border-neutral-800 focus:border-white font-mono text-xs uppercase tracking-wider text-white outline-none rounded-sm transition-colors placeholder:text-neutral-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="bg-[#0a0b0e] border border-neutral-800 text-neutral-300 font-mono text-xs px-4 py-3 rounded-sm outline-none focus:border-white"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d === 'ALL' ? 'ALL DEPARTMENTS' : d.toUpperCase()}</option>
                ))}
              </select>

              <div className="px-4 py-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-xs text-neutral-300 shrink-0">
                ACTIVE ROSTER: <strong className="text-white">{filteredEmployees.length}</strong>
              </div>
            </div>
          </div>

          {/* Employee Quota Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEmployees.map(item => {
              const { staff } = item;
              return (
                <div 
                  key={staff.id}
                  className="bg-[#0a0b0e] border border-neutral-800 hover:border-neutral-700 rounded-sm p-6 space-y-5 transition-all flex flex-col justify-between"
                >
                  {/* Employee Identity */}
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-sm bg-[#12141a] border border-neutral-700 overflow-hidden shrink-0">
                          <img src={staff.avatarUrl} className="w-full h-full object-cover" alt={staff.name} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-heading font-black text-white text-base uppercase tracking-tight truncate">
                            {staff.name}
                          </h3>
                          <div className="font-mono text-[10px] text-neutral-400 uppercase mt-0.5 truncate">
                            {staff.role} // {staff.department}
                          </div>
                          <div className="font-mono text-[9px] text-neutral-500 mt-1">
                            STAFF ID: {staff.staffId || 'MW-00X'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(staff)}
                        className="p-2 bg-[#12141a] border border-neutral-800 hover:border-white text-neutral-300 hover:text-white rounded-sm text-xs transition-colors shrink-0"
                        title="Record Leave for this Employee"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Quota Progress & Metrics */}
                    <div className="mt-5 pt-4 border-t border-neutral-800/80 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between text-neutral-400 text-[10px] uppercase">
                        <span>Leave Allowance Utilization</span>
                        <span className="text-white font-bold">{item.totalTaken} Days Taken</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 bg-[#12141a] border border-neutral-800 rounded-sm text-center">
                          <div className="text-[9px] text-neutral-500 uppercase tracking-widest">ANNUAL</div>
                          <div className="text-sm font-black text-white mt-0.5">
                            {item.annualRemaining} <span className="text-[9px] text-neutral-500">/ {ANNUAL_LEAVE_ALLOWANCE}</span>
                          </div>
                          <div className="text-[8px] text-neutral-400 mt-0.5">{item.annualTaken} taken</div>
                        </div>

                        <div className="p-2.5 bg-[#12141a] border border-neutral-800 rounded-sm text-center">
                          <div className="text-[9px] text-neutral-500 uppercase tracking-widest">CASUAL</div>
                          <div className="text-sm font-black text-white mt-0.5">
                            {item.casualRemaining} <span className="text-[9px] text-neutral-500">/ {CASUAL_LEAVE_ALLOWANCE}</span>
                          </div>
                          <div className="text-[8px] text-neutral-400 mt-0.5">{item.casualTaken} taken</div>
                        </div>

                        <div className="p-2.5 bg-[#12141a] border border-neutral-800 rounded-sm text-center">
                          <div className="text-[9px] text-neutral-500 uppercase tracking-widest">SICK</div>
                          <div className="text-sm font-black text-white mt-0.5">
                            {item.sickRemaining} <span className="text-[9px] text-neutral-500">/ {SICK_LEAVE_ALLOWANCE}</span>
                          </div>
                          <div className="text-[8px] text-neutral-400 mt-0.5">{item.sickTaken} taken</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action / Contact Telemetry */}
                  <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between font-mono text-[10px] text-neutral-400">
                    <span className="truncate">{staff.email}</span>
                    {item.pendingCount > 0 && (
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xs font-bold shrink-0">
                        {item.pendingCount} PENDING
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: MY LEAVE REQUESTS & QUOTA */}
      {activeTab === 'my-leaves' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* User's Quota Breakdown */}
          <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-6">
            <h3 className="font-heading font-black text-white text-base uppercase tracking-tight mb-4 flex items-center gap-2">
              <Award size={18} className="text-emerald-400" />
              <span>My Annual Absence Quota Allocation</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-4 bg-[#12141a] border border-neutral-800 rounded-sm">
                <div className="text-[10px] text-neutral-400 uppercase tracking-widest">Annual Leave Quota</div>
                <div className="text-2xl font-black text-white mt-1">
                  {myQuota.annualRemaining} <span className="text-xs text-neutral-500 font-normal">/ {ANNUAL_LEAVE_ALLOWANCE} Days Left</span>
                </div>
                <div className="text-[10px] text-neutral-500 mt-1">{myQuota.annualTaken} days used this period</div>
              </div>

              <div className="p-4 bg-[#12141a] border border-neutral-800 rounded-sm">
                <div className="text-[10px] text-neutral-400 uppercase tracking-widest">Casual Leave Quota</div>
                <div className="text-2xl font-black text-white mt-1">
                  {myQuota.casualRemaining} <span className="text-xs text-neutral-500 font-normal">/ {CASUAL_LEAVE_ALLOWANCE} Days Left</span>
                </div>
                <div className="text-[10px] text-neutral-500 mt-1">{myQuota.casualTaken} days used this period</div>
              </div>

              <div className="p-4 bg-[#12141a] border border-neutral-800 rounded-sm">
                <div className="text-[10px] text-neutral-400 uppercase tracking-widest">Medical / Sick Quota</div>
                <div className="text-2xl font-black text-white mt-1">
                  {myQuota.sickRemaining} <span className="text-xs text-neutral-500 font-normal">/ {SICK_LEAVE_ALLOWANCE} Days Left</span>
                </div>
                <div className="text-[10px] text-neutral-500 mt-1">{myQuota.sickTaken} days used this period</div>
              </div>
            </div>
          </div>

          {/* List of User's Requests */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs text-neutral-400 uppercase tracking-widest">
                My Submitted Leave Directives ({myRequests.length})
              </h3>
              <button 
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2 bg-white text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm hover:bg-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> New Request
              </button>
            </div>

            {myRequests.length === 0 ? (
              <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-20 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest">
                <Calendar size={48} className="mx-auto mb-3 opacity-30 text-neutral-400" />
                Zero leave requests on file
              </div>
            ) : (
              myRequests.map(req => {
                const days = calculateDays(req.startDate, req.endDate);
                return (
                  <div 
                    key={req.id} 
                    className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    <div className="min-w-0 md:w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-white uppercase text-base">{req.type} Leave</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 bg-[#12141a] border border-neutral-800 text-neutral-300 rounded-xs">
                          {days} {days === 1 ? 'DAY' : 'DAYS'}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-neutral-400 uppercase mt-1">
                        Requested on {new Date(req.timestamp).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 font-mono text-xs text-neutral-300 space-y-1.5">
                      <div className="text-[11px] text-neutral-400">
                        FROM: <strong className="text-white">{new Date(req.startDate).toLocaleDateString()}</strong> TO: <strong className="text-white">{new Date(req.endDate).toLocaleDateString()}</strong>
                      </div>
                      <div className="p-2.5 bg-[#12141a] border border-neutral-800/80 rounded-sm italic font-sans text-xs">
                        "{req.reason}"
                      </div>
                      {req.reviewNote && (
                        <div className="text-[10px] text-neutral-400 font-mono pt-1">
                          <span className="text-neutral-500 uppercase">Reviewer Note:</span> "{req.reviewNote}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <div className={`px-4 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wider border font-bold ${
                        req.status === 'Approved' ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' :
                        req.status === 'Rejected' ? 'bg-rose-950/60 border-rose-500/30 text-rose-400' :
                        'bg-amber-950/60 border-amber-500/30 text-amber-400'
                      }`}>
                        {req.status}
                      </div>

                      {req.status === 'Pending' && onDeleteLeave && (
                        <button
                          type="button"
                          onClick={() => setLeaveToDelete(req)}
                          className="p-2 text-neutral-400 hover:text-rose-400 rounded-sm hover:bg-neutral-900 transition-colors"
                          title="Cancel / Delete Request"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: MEDICAL & WELFARE VAULT */}
      {activeTab === 'medical' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input 
              placeholder="SEARCH MEDICAL RECORDS BY SPECIALIST NAME, BLOOD GROUP OR DEPARTMENT..." 
              className="w-full pl-12 pr-6 py-3.5 bg-[#0a0b0e] border border-neutral-800 focus:border-white font-mono text-xs uppercase tracking-wider text-white outline-none rounded-sm transition-colors placeholder:text-neutral-600"
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredMedical.map(staff => (
              <div 
                key={staff.id} 
                className="bg-[#0a0b0e] border border-neutral-800 hover:border-neutral-700 rounded-sm p-6 space-y-5 transition-colors relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-sm bg-[#12141a] border border-neutral-700 overflow-hidden shrink-0">
                      <img src={staff.avatarUrl} className="w-full h-full object-cover" alt=""/>
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-white text-lg uppercase tracking-tight">{staff.name}</h3>
                      <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5">
                        {staff.role} // {staff.department}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[9px] text-neutral-500 uppercase block">Blood Group</span>
                    <span className="text-sm font-black text-rose-400">{staff.bloodGroup || 'UNRECORDED'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="space-y-3">
                    <div className="p-3 bg-[#12141a] border border-neutral-800/80 rounded-sm">
                      <div className="text-[9px] text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <ShieldAlert size={12} className="text-rose-400" /> Allergies
                      </div>
                      <div className="text-white text-xs font-semibold">{staff.allergies || 'No known allergies'}</div>
                    </div>

                    <div className="p-3 bg-[#12141a] border border-neutral-800/80 rounded-sm">
                      <div className="text-[9px] text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Heart size={12} className="text-rose-400" /> Medical Conditions
                      </div>
                      <div className="text-white text-xs font-semibold">{staff.medicalConditions || 'No existing conditions'}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#12141a] border border-neutral-800/80 rounded-sm flex flex-col justify-between">
                    <div>
                      <div className="text-[9px] text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Phone size={12} className="text-neutral-400" /> Emergency Contact
                      </div>
                      <div className="text-white font-bold text-xs uppercase">{staff.emergencyContactName || 'N/A'}</div>
                      <div className="text-neutral-400 text-xs mt-1">{staff.emergencyContactPhone || 'N/A'}</div>
                    </div>
                    {staff.lifestyleHabits && (
                      <div className="text-[10px] text-neutral-500 italic mt-3 pt-2 border-t border-neutral-800">
                        {staff.lifestyleHabits}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEAVE REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">HR ABSENCE DIRECTIVE</div>
                <h3 className="text-lg font-black uppercase text-white font-heading">Submit Leave Request</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              {/* Employee Selection (if HR/Admin) */}
              {canApprove && (
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                    Target Personnel
                  </label>
                  <select
                    value={leaveForm.staffId}
                    onChange={(e) => {
                      const selected = staffList.find(s => s.id === e.target.value);
                      if (selected) {
                        setLeaveForm({ ...leaveForm, staffId: selected.id, staffName: selected.name });
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm"
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role} - {s.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">Leave Classification</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['Annual', 'Casual', 'Sick', 'Unpaid', 'Short'] as const).map(type => (
                    <button 
                      key={type}
                      type="button"
                      onClick={() => setLeaveForm({...leaveForm, type})}
                      className={`py-2 rounded-sm font-mono text-[10px] uppercase tracking-wider border transition-all cursor-pointer ${
                        leaveForm.type === type 
                          ? 'bg-white text-black font-black border-white' 
                          : 'bg-[#12141a] text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Start Date *</label>
                  <input 
                    required
                    type="date" 
                    value={leaveForm.startDate}
                    className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                    onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">End Date *</label>
                  <input 
                    required
                    type="date" 
                    value={leaveForm.endDate}
                    className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                    onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Total Duration Calculated:</span>
                <span className="text-white font-bold">
                  {calculateDays(leaveForm.startDate, leaveForm.endDate)} {calculateDays(leaveForm.startDate, leaveForm.endDate) === 1 ? 'Working Day' : 'Working Days'}
                </span>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Operational Justification / Reason *</label>
                <textarea 
                  required
                  rows={3} 
                  placeholder="Details regarding your absence protocol, handover, or coverage..." 
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm resize-none" 
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-white text-black font-black font-mono text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={16} /> Submit Directive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW CONFIRMATION MODAL */}
      {reviewModalRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-6 border-b border-neutral-800 flex justify-between items-center text-white ${
              reviewModalRequest.action === 'Approved' ? 'bg-emerald-950/40' : 'bg-rose-950/40'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                  reviewModalRequest.action === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {reviewModalRequest.action === 'Approved' ? <Check size={16} /> : <X size={16} />}
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">HR REVIEW DIRECTIVE</div>
                  <h3 className="text-base font-black uppercase text-white font-heading">
                    {reviewModalRequest.action === 'Approved' ? 'Authorize Absence' : 'Decline Request'}
                  </h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setReviewModalRequest(null)} 
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-neutral-300">
                You are about to mark the <strong className="text-white">{reviewModalRequest.req.type} Leave</strong> requested by <strong className="text-white">{reviewModalRequest.req.staffName}</strong> ({new Date(reviewModalRequest.req.startDate).toLocaleDateString()} - {new Date(reviewModalRequest.req.endDate).toLocaleDateString()}) as <span className={reviewModalRequest.action === 'Approved' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{reviewModalRequest.action.toUpperCase()}</span>.
              </p>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                  Review Directive / Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder={reviewModalRequest.action === 'Approved' ? "e.g., Coverage approved by lead..." : "e.g., Operational sprint deadline conflict..."}
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm resize-none"
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewModalRequest(null)}
                className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                  reviewModalRequest.action === 'Approved'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {reviewModalRequest.action === 'Approved' ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                Confirm {reviewModalRequest.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {leaveToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-rose-950/40 border-b border-neutral-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Trash2 size={16} />
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-rose-400">EXPULSION DIRECTIVE</div>
                  <h3 className="text-base font-black uppercase text-white font-heading">Delete Leave Record</h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setLeaveToDelete(null)} 
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-neutral-300">
                Are you sure you want to permanently withdraw the <strong className="text-white">{leaveToDelete.type} leave</strong> record for <strong className="text-white">{leaveToDelete.staffName}</strong>?
              </p>
              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-[11px] text-neutral-400">
                <div>Period: {new Date(leaveToDelete.startDate).toLocaleDateString()} - {new Date(leaveToDelete.endDate).toLocaleDateString()}</div>
                <div>Status: {leaveToDelete.status}</div>
              </div>
            </div>

            <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setLeaveToDelete(null)}
                className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white uppercase cursor-pointer"
              >
                Abort
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} /> Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;
