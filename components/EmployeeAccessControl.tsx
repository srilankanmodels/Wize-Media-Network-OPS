import React, { useState } from 'react';
import { 
  StaffMember, Role, EmployeeAccessRequest, AccountStatus, DEFAULT_DEPARTMENTS 
} from '../types';
import { 
  PRIVILEGE_LEVELS, canAssignRole, DEFAULT_ROLE_PERMISSIONS 
} from '../utils/permissions';
import { 
  approveEmployeeAccess, rejectEmployeeAccess, suspendEmployeeAccess, reactivateEmployeeAccess 
} from '../supabase';
import { 
  UserCheck, UserX, Clock, ShieldAlert, ShieldCheck, Mail, CheckCircle2, 
  XCircle, AlertTriangle, Search, Filter, SlidersHorizontal, Lock, 
  ArrowRight, Check, X, Eye, Edit3, RefreshCw, Loader2, Sparkles, UserPlus
} from 'lucide-react';

interface EmployeeAccessControlProps {
  requests: EmployeeAccessRequest[];
  staffList: StaffMember[];
  currentUser: StaffMember;
  onRefreshData: () => Promise<void>;
  onUpdateStaffList: (updatedList: StaffMember[]) => void;
}

export const AGENCY_DEPARTMENTS = [
  'Annual Reports',
  'Advertising & Creative',
  'TVC & Video Production',
  'Brand Identity',
  'Digital Marketing',
  'Podcast Studio',
  'Event Management',
  'Account Management',
  'Human Resources',
  'Finance',
  'Administration',
  'Executive Management'
];

export const ASSIGNABLE_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.GM,
  Role.ADMIN,
  'Creative Lead',
  Role.HR,
  'Finance Manager',
  Role.AE,
  'Studio Manager',
  Role.DESIGNER,
  Role.COPYWRITER,
  Role.EDITOR,
  Role.CAMERAMAN,
  Role.SOUND_ENGINEER,
  Role.GEN_STAFF
];

const EmployeeAccessControl: React.FC<EmployeeAccessControlProps> = ({
  requests,
  staffList,
  currentUser,
  onRefreshData,
  onUpdateStaffList
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'active' | 'suspended' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<EmployeeAccessRequest | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [targetStaffToEdit, setTargetStaffToEdit] = useState<StaffMember | null>(null);

  // Approval Form State
  const [selectedDept, setSelectedDept] = useState(AGENCY_DEPARTMENTS[0]);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.DESIGNER);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter requests
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');
  
  // Filter staff by status
  const activeStaff = staffList.filter(s => s.accountStatus !== 'suspended');
  const suspendedStaff = staffList.filter(s => s.accountStatus === 'suspended');

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const openApproveModal = (req: EmployeeAccessRequest) => {
    setSelectedRequest(req);
    setSelectedDept(req.assignedDepartment || AGENCY_DEPARTMENTS[0]);
    setSelectedRole(req.assignedRole || Role.DESIGNER);
    setIsApproveModalOpen(true);
  };

  const openRejectModal = (req: EmployeeAccessRequest) => {
    setSelectedRequest(req);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const openEditRoleModal = (staff: StaffMember) => {
    setTargetStaffToEdit(staff);
    setSelectedDept(staff.department || AGENCY_DEPARTMENTS[0]);
    setSelectedRole(staff.role);
    setIsEditRoleModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      const res = await approveEmployeeAccess(selectedRequest.id, selectedDept, selectedRole, currentUser);
      if (!res.success) {
        showNotification('error', res.error || 'Failed to approve employee.');
      } else {
        showNotification('success', `Employee ${res.employee.name} approved and activated as ${selectedRole} (${selectedDept}).`);
        setIsApproveModalOpen(false);

        // Immediately update staffList in UI state
        if (res.employee) {
          const updatedList = [...staffList];
          const existingIdx = updatedList.findIndex(
            s => s.id === res.employee.id || s.email.toLowerCase() === res.employee.email.toLowerCase()
          );
          if (existingIdx > -1) {
            updatedList[existingIdx] = res.employee;
          } else {
            updatedList.push(res.employee);
          }
          onUpdateStaffList(updatedList);
        }

        // Switch to the 'active' tab so the admin immediately sees the new employee in the table!
        setActiveSubTab('active');

        await onRefreshData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error occurred during approval.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      const res = await rejectEmployeeAccess(selectedRequest.id, rejectReason, currentUser);
      if (!res.success) {
        showNotification('error', res.error || 'Failed to decline request.');
      } else {
        showNotification('success', `Access request for ${selectedRequest.fullName} has been declined.`);
        setIsRejectModalOpen(false);
        await onRefreshData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error declining access request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspendStaff = async (staff: StaffMember) => {
    if (confirm(`Are you sure you want to suspend account access for ${staff.name}? They will be immediately locked out.`)) {
      setIsProcessing(true);
      try {
        const res = await suspendEmployeeAccess(staff.id, currentUser);
        if (!res.success) {
          showNotification('error', res.error || 'Failed to suspend staff.');
        } else {
          showNotification('success', `Account access for ${staff.name} has been suspended.`);
          await onRefreshData();
        }
      } catch (err: any) {
        showNotification('error', err.message || 'Error suspending staff.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReactivateStaff = async (staff: StaffMember) => {
    setIsProcessing(true);
    try {
      const res = await reactivateEmployeeAccess(staff.id, currentUser);
      if (!res.success) {
        showNotification('error', res.error || 'Failed to reactivate staff.');
      } else {
        showNotification('success', `Account access restored for ${staff.name}.`);
        await onRefreshData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error reactivating staff.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRoleEdit = async () => {
    if (!targetStaffToEdit) return;

    if (!canAssignRole(currentUser.role, selectedRole)) {
      showNotification('error', `Permission Denied: You cannot assign '${selectedRole}' with your current role level.`);
      return;
    }

    setIsProcessing(true);
    try {
      const updatedList = staffList.map(s => {
        if (s.id === targetStaffToEdit.id) {
          return {
            ...s,
            role: selectedRole,
            department: selectedDept
          };
        }
        return s;
      });
      onUpdateStaffList(updatedList);
      showNotification('success', `Role and department updated for ${targetStaffToEdit.name}.`);
      setIsEditRoleModalOpen(false);
      await onRefreshData();
    } catch (err: any) {
      showNotification('error', err.message || 'Error updating role.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sub-navigation tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('pending')}
            className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'pending'
                ? 'bg-amber-500 text-black font-black shadow-md'
                : 'bg-[#12141a] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <Clock size={13} />
            <span>Pending Requests</span>
            {pendingRequests.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeSubTab === 'pending' ? 'bg-black text-amber-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('active')}
            className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'active'
                ? 'bg-white text-black font-black shadow-md'
                : 'bg-[#12141a] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <UserCheck size={13} />
            <span>Active Employees</span>
            <span className="text-[10px] opacity-70">({activeStaff.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('suspended')}
            className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'suspended'
                ? 'bg-rose-500 text-white font-black shadow-md'
                : 'bg-[#12141a] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <Lock size={13} />
            <span>Suspended</span>
            {suspendedStaff.length > 0 && (
              <span className="text-[10px] opacity-70">({suspendedStaff.length})</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('rejected')}
            className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'rejected'
                ? 'bg-neutral-800 text-white font-black'
                : 'bg-[#12141a] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <XCircle size={13} />
            <span>Rejected</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="FILTER EMPLOYEES..."
            className="pl-8 pr-3 py-1 bg-[#12141a] border border-neutral-800 focus:border-white font-mono text-xs uppercase text-white rounded-sm outline-none placeholder:text-neutral-600 w-56"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Global feedback message banner */}
      {feedbackMessage && (
        <div className={`p-3 rounded-sm font-mono text-xs flex items-center justify-between ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-neutral-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* SECTION A: PENDING REQUESTS */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
              Awaiting Verification & Job Role Assignment ({pendingRequests.length})
            </div>
            <div className="text-[11px] font-mono text-neutral-500">
              Notice: Employees have authenticated via Google OAuth 2.0 and require administrator approval.
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-12 text-center bg-[#0a0b0e] border border-neutral-800/80 rounded-sm space-y-2">
              <CheckCircle2 size={28} className="text-emerald-400 mx-auto" />
              <div className="font-mono text-xs text-neutral-300 uppercase tracking-wider font-bold">
                No Pending Access Requests
              </div>
              <p className="font-mono text-[11px] text-neutral-500 max-w-sm mx-auto">
                All employee Google sign-ins have been verified and processed by administration.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-[#0e0f14] border border-amber-500/30 hover:border-amber-500/60 p-5 rounded-sm space-y-4 transition-all">
                  <div className="flex items-start gap-3.5">
                    <img
                      src={req.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                      alt={req.fullName}
                      className="w-12 h-12 rounded-sm object-cover border border-neutral-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-bold text-sm text-white font-heading truncate">{req.fullName}</div>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono truncate">
                        <Mail size={12} className="text-neutral-500 shrink-0" />
                        <span className="truncate">{req.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>Submitted {new Date(req.requestedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#0a0b0e] border border-neutral-800 rounded-sm font-mono text-[11px] text-neutral-400 flex items-center justify-between">
                    <span>Identity Source:</span>
                    <span className="text-white font-bold uppercase">{req.provider} OAuth 2.0</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openApproveModal(req)}
                      className="py-2 px-3 bg-white hover:bg-neutral-200 text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => openRejectModal(req)}
                      className="py-2 px-3 bg-[#181a24] hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-800/40 font-mono text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION B: ACTIVE EMPLOYEES */}
      {activeSubTab === 'active' && (
        <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#0e0f14] border-b border-neutral-800 text-[10px] text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Assigned Job Role</th>
                  <th className="p-3.5">Privilege Level</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {activeStaff
                  .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(staff => {
                    const level = PRIVILEGE_LEVELS[staff.role] || 10;
                    return (
                      <tr key={staff.id} className="hover:bg-[#12141a]/60 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img src={staff.avatarUrl} alt="" className="w-8 h-8 rounded-sm object-cover border border-neutral-800 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">{staff.name}</div>
                              <div className="text-[11px] text-neutral-500 truncate">{staff.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-neutral-300">{staff.department}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-sm bg-[#181a24] border border-neutral-700 text-white font-bold text-[11px]">
                            {staff.role}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`text-[11px] font-bold ${level >= 80 ? 'text-amber-400' : 'text-neutral-400'}`}>
                            Level {level}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Approved
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditRoleModal(staff)}
                              className="px-2.5 py-1 bg-[#181a24] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 rounded-sm text-[11px] uppercase transition-colors"
                            >
                              Edit Role
                            </button>
                            {staff.id !== currentUser.id && (
                              <button
                                type="button"
                                onClick={() => handleSuspendStaff(staff)}
                                className="px-2.5 py-1 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-sm text-[11px] uppercase transition-colors"
                              >
                                Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION C: SUSPENDED ACCOUNTS */}
      {activeSubTab === 'suspended' && (
        <div className="space-y-4">
          {suspendedStaff.length === 0 ? (
            <div className="p-12 text-center bg-[#0a0b0e] border border-neutral-800 rounded-sm font-mono text-xs text-neutral-500 uppercase">
              No suspended employee accounts.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suspendedStaff.map(staff => (
                <div key={staff.id} className="p-5 bg-[#0e0f14] border border-rose-500/30 rounded-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={staff.avatarUrl} alt="" className="w-10 h-10 rounded-sm object-cover border border-neutral-800 opacity-60" />
                    <div>
                      <div className="font-bold text-sm text-neutral-200">{staff.name}</div>
                      <div className="text-xs text-neutral-500 font-mono">{staff.email}</div>
                      <div className="text-[10px] text-rose-400 font-mono uppercase mt-0.5 font-bold">Access Revoked</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReactivateStaff(staff)}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Reactivate Account
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION D: REJECTED REQUESTS */}
      {activeSubTab === 'rejected' && (
        <div className="space-y-4">
          {rejectedRequests.length === 0 ? (
            <div className="p-12 text-center bg-[#0a0b0e] border border-neutral-800 rounded-sm font-mono text-xs text-neutral-500 uppercase">
              No declined access requests on record.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rejectedRequests.map(req => (
                <div key={req.id} className="p-4 bg-[#0e0f14] border border-neutral-800 rounded-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{req.fullName}</span>
                    <span className="px-1.5 py-0.5 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-mono uppercase">
                      Declined
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">{req.email}</div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    Reviewed: {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : 'N/A'} by {req.reviewedByName || 'Admin'}
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => openApproveModal(req)}
                      className="px-3 py-1 bg-white hover:bg-neutral-200 text-black font-mono text-xs uppercase rounded-sm font-bold"
                    >
                      Re-evaluate & Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: APPROVE EMPLOYEE ACCESS (CRITICAL REQUIREMENT)
         ========================================================================= */}
      {isApproveModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm shadow-2xl w-full max-w-lg overflow-hidden space-y-6">
            
            {/* Modal Header */}
            <div className="bg-[#0e0f14] p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] text-amber-400 uppercase tracking-[0.25em]">
                  ADMINISTRATIVE VERIFICATION PROTOCOL
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight font-heading mt-0.5">
                  Approve Employee Access
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              
              {/* Applicant Profile */}
              <div className="p-4 bg-[#12141a] border border-neutral-800 rounded-sm flex items-center gap-3.5">
                <img
                  src={selectedRequest.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt=""
                  className="w-12 h-12 rounded-sm object-cover border border-neutral-700"
                />
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm font-heading">{selectedRequest.fullName}</div>
                  <div className="font-mono text-xs text-neutral-400">{selectedRequest.email}</div>
                  <div className="font-mono text-[10px] text-sky-400 mt-0.5">Identity Verified via Google OAuth</div>
                </div>
              </div>

              {/* Department Selector */}
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                  Assign Operational Department *
                </label>
                <select
                  className="w-full p-2.5 bg-[#12141a] border border-neutral-800 focus:border-white font-mono text-xs text-white rounded-sm outline-none cursor-pointer [color-scheme:dark]"
                  style={{ colorScheme: 'dark' }}
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                >
                  {AGENCY_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept} style={{ backgroundColor: '#12141a', color: '#ffffff' }} className="bg-[#12141a] text-white py-1">
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Job Role Selector */}
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                  Assign Agency Job Role *
                </label>
                <select
                  className="w-full p-2.5 bg-[#12141a] border border-neutral-800 focus:border-white font-mono text-xs text-white rounded-sm outline-none cursor-pointer [color-scheme:dark]"
                  style={{ colorScheme: 'dark' }}
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as Role)}
                >
                  {ASSIGNABLE_ROLES.map(role => {
                    const disabled = !canAssignRole(currentUser.role, role);
                    return (
                      <option 
                        key={role} 
                        value={role} 
                        disabled={disabled}
                        style={{ backgroundColor: '#12141a', color: disabled ? '#737373' : '#ffffff' }}
                        className={disabled ? "bg-[#12141a] text-neutral-500 py-1" : "bg-[#12141a] text-white py-1"}
                      >
                        {role} {disabled ? '(Privilege Restricted)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] font-mono text-neutral-500 mt-1">
                  Note: Privilege escalation restrictions apply. Only Super Admin can assign Super Admin or GM roles.
                </p>
              </div>

              {/* Automatic Permission Preview */}
              <div className="p-3.5 bg-[#0e0f14] border border-neutral-800 rounded-sm space-y-2">
                <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Permission Profile Preview:</span>
                  <span className="text-amber-400 font-bold">Privilege Level {PRIVILEGE_LEVELS[selectedRole] || 10}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(DEFAULT_ROLE_PERMISSIONS[selectedRole] || []).slice(0, 6).map(perm => (
                    <span key={perm} className="px-1.5 py-0.5 bg-[#181a24] text-[9px] font-mono text-neutral-300 rounded-sm">
                      {perm}
                    </span>
                  ))}
                  {(DEFAULT_ROLE_PERMISSIONS[selectedRole] || []).length > 6 && (
                    <span className="px-1.5 py-0.5 bg-[#181a24] text-[9px] font-mono text-neutral-500 rounded-sm">
                      +{(DEFAULT_ROLE_PERMISSIONS[selectedRole] || []).length - 6} more
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(false)}
                  className="py-2.5 px-4 bg-[#181a24] hover:bg-neutral-800 text-neutral-300 font-mono text-xs uppercase rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  disabled={isProcessing}
                  className="py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Confirm Approval</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: REJECT ACCESS REQUEST
         ========================================================================= */}
      {isRejectModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm shadow-2xl w-full max-w-md overflow-hidden space-y-5">
            <div className="bg-[#0e0f14] p-5 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-base font-black text-rose-400 uppercase tracking-tight font-heading flex items-center gap-2">
                <XCircle size={18} /> Decline Access Request
              </h3>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-neutral-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-mono text-neutral-300 leading-relaxed">
                Are you sure you want to decline the employee access request for <strong className="text-white">{selectedRequest.fullName}</strong> ({selectedRequest.email})?
              </p>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                  Internal Administrative Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full p-2.5 bg-[#12141a] border border-neutral-800 focus:border-rose-500 font-mono text-xs text-white rounded-sm outline-none placeholder:text-neutral-600"
                  placeholder="e.g. Identity not confirmed by HR / Unknown external contractor..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="py-2.5 px-4 bg-[#181a24] hover:bg-neutral-800 text-neutral-300 font-mono text-xs uppercase rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  disabled={isProcessing}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black font-mono text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  <span>Decline Access</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: EDIT ROLE & DEPARTMENT
         ========================================================================= */}
      {isEditRoleModalOpen && targetStaffToEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm shadow-2xl w-full max-w-md overflow-hidden space-y-5">
            <div className="bg-[#0e0f14] p-5 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-base font-black text-white uppercase tracking-tight font-heading flex items-center gap-2">
                <Edit3 size={18} /> Modify Employee Role
              </h3>
              <button onClick={() => setIsEditRoleModalOpen(false)} className="text-neutral-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                  Department
                </label>
                <select
                  className="w-full p-2.5 bg-[#12141a] border border-neutral-800 focus:border-white font-mono text-xs text-white rounded-sm outline-none cursor-pointer [color-scheme:dark]"
                  style={{ colorScheme: 'dark' }}
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                >
                  {AGENCY_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept} style={{ backgroundColor: '#12141a', color: '#ffffff' }} className="bg-[#12141a] text-white py-1">
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                  Job Role
                </label>
                <select
                  className="w-full p-2.5 bg-[#12141a] border border-neutral-800 focus:border-white font-mono text-xs text-white rounded-sm outline-none cursor-pointer [color-scheme:dark]"
                  style={{ colorScheme: 'dark' }}
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as Role)}
                >
                  {ASSIGNABLE_ROLES.map(role => {
                    const disabled = !canAssignRole(currentUser.role, role);
                    return (
                      <option 
                        key={role} 
                        value={role} 
                        disabled={disabled}
                        style={{ backgroundColor: '#12141a', color: disabled ? '#737373' : '#ffffff' }}
                        className={disabled ? "bg-[#12141a] text-neutral-500 py-1" : "bg-[#12141a] text-white py-1"}
                      >
                        {role} {disabled ? '(Restricted)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditRoleModalOpen(false)}
                  className="py-2.5 px-4 bg-[#181a24] hover:bg-neutral-800 text-neutral-300 font-mono text-xs uppercase rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoleEdit}
                  disabled={isProcessing}
                  className="py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeAccessControl;
