import React, { useState } from 'react';
import { Project, ProjectType, StaffMember, Role, Notification, MeetingNote } from '../types';
import { 
  Search, Archive, Briefcase, ChevronRight, Activity, Calendar, Download, Eye, 
  FileText, Clock, CheckCircle2, Zap, Plus, ArrowUpRight, PauseCircle, XCircle, 
  PlayCircle, Edit2, X, AlertTriangle, ShieldAlert, MessageSquare 
} from 'lucide-react';

interface JobRegistryProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onNewProjectTrigger: () => void;
  currentUser?: StaffMember | null;
  onUpdateProject?: (project: Project) => void;
  onAddNotification?: (notification: Notification) => void;
  onAddMeetingNote?: (note: MeetingNote) => void;
}

const JobRegistry: React.FC<JobRegistryProps> = ({ 
  projects, 
  onSelectProject, 
  onNewProjectTrigger,
  currentUser,
  onUpdateProject,
  onAddNotification,
  onAddMeetingNote
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'In Progress' | 'Paused' | 'Cancelled' | 'Completed'>('ALL');

  // Status Override Modal State
  const [statusModalProject, setStatusModalProject] = useState<Project | null>(null);
  const [targetStatus, setTargetStatus] = useState<'In Progress' | 'Completed' | 'On Hold' | 'Paused' | 'Cancelled'>('Paused');
  const [statusNote, setStatusNote] = useState('');
  const [statusError, setStatusError] = useState('');

  const normRole = (currentUser?.role || '').toLowerCase();
  const isSuperAdmin = normRole === 'super admin' || currentUser?.role === Role.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || normRole === 'admin' || currentUser?.role === Role.ADMIN;
  const isGM = normRole === 'general manager' || normRole === 'gm' || currentUser?.role === Role.GM;
  const isManager = normRole === 'management' || currentUser?.role === Role.MANAGEMENT || normRole.includes('lead') || normRole.includes('manager');
  const isAE = normRole === 'account executive' || currentUser?.role === Role.AE;

  // New campaign can be created only by AE / managers / admins / super admins / general managers
  const canCreateCampaign = isSuperAdmin || isAdmin || isGM || isManager || isAE;
  const canManageStatus = isSuperAdmin || isAdmin || isGM || isManager;

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.status.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'ALL' ? true :
      statusFilter === 'Paused' ? (p.status === 'Paused' || p.status === 'On Hold') :
      p.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

  const handleOpenStatusModal = (project: Project, defaultTarget?: 'Paused' | 'Cancelled' | 'In Progress' | 'Completed') => {
    setStatusModalProject(project);
    if (defaultTarget) {
      setTargetStatus(defaultTarget);
    } else if (project.status === 'Paused' || project.status === 'On Hold' || project.status === 'Cancelled') {
      setTargetStatus('In Progress');
    } else {
      setTargetStatus('Paused');
    }
    setStatusNote('');
    setStatusError('');
  };

  const handleSaveStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalProject || !onUpdateProject) return;

    if (!statusNote.trim()) {
      setStatusError('A mandatory operational note is required to pause, cancel, or modify job pipeline status.');
      return;
    }

    const logEntry = {
      id: `sc-${Date.now()}`,
      previousStatus: statusModalProject.status,
      newStatus: targetStatus,
      reason: statusNote.trim(),
      changedBy: currentUser?.name || 'Administrator',
      changedByRole: currentUser?.role || 'Management',
      timestamp: new Date()
    };

    const updatedHistory = [...(statusModalProject.statusChangeHistory || []), logEntry];
    
    // Create an immutable formatted memo for project history
    const statusMemo = {
      id: `memo-${Date.now()}`,
      text: `[STATUS OVERRIDE: ${targetStatus.toUpperCase()}] Reason: ${statusNote.trim()} (Authorized by ${currentUser?.name || 'Authorized Lead'} [${currentUser?.role || 'Management'}])`,
      author: currentUser?.name || 'Authorized Lead',
      timestamp: new Date()
    };
    const updatedMemos = [...(statusModalProject.memos || []), statusMemo];

    const updatedProject: Project = {
      ...statusModalProject,
      status: targetStatus,
      lastUpdated: new Date(),
      statusChangeHistory: updatedHistory,
      memos: updatedMemos
    };

    onUpdateProject(updatedProject);

    // Synchronize to Meeting Notes / Agency intelligence log
    if (onAddMeetingNote) {
      const meetingNote: MeetingNote = {
        id: `note-${Date.now()}`,
        title: `[PIPELINE ${targetStatus.toUpperCase()}] ${statusModalProject.jobNumber} - ${statusModalProject.projectName}`,
        text: `Campaign "${statusModalProject.projectName}" (${statusModalProject.clientName}) pipeline status transitioned from ${statusModalProject.status} to ${targetStatus}.\n\nMandatory Operational Log Note:\n${statusNote.trim()}\n\nAuthorized by: ${currentUser?.name || 'Admin'} (${currentUser?.role || 'Management'})`,
        author: currentUser?.name || 'Admin',
        authorId: currentUser?.id,
        category: 'Client',
        timestamp: new Date(),
        projectId: statusModalProject.id,
        projectName: statusModalProject.projectName,
        isSavedToWize: true
      };
      onAddMeetingNote(meetingNote);
    }

    // Send system alert notification
    if (onAddNotification) {
      const notif: Notification = {
        id: `notif-${Date.now()}`,
        userId: 'all',
        text: `[${targetStatus.toUpperCase()}] ${statusModalProject.jobNumber} (${statusModalProject.projectName}) updated by ${currentUser?.name || 'Admin'}: "${statusNote.trim()}"`,
        type: 'system',
        read: false,
        timestamp: new Date(),
        link: 'registry'
      };
      onAddNotification(notif);
    }

    setStatusModalProject(null);
    setStatusNote('');
    setStatusError('');
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={12} /> COMPLETED
          </span>
        );
      case 'Paused':
      case 'On Hold':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[9px] font-mono uppercase bg-amber-500/15 text-amber-400 border border-amber-500/40">
            <PauseCircle size={12} /> PAUSED
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[9px] font-mono uppercase bg-rose-500/15 text-rose-400 border border-rose-500/40">
            <XCircle size={12} /> CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[9px] font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock size={12} /> IN PROGRESS
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-8 sm:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.25em] mb-2">
            PROPRIETARY ECOSYSTEM // STRATEGY DIRECTORY
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-heading leading-none">
            JOB <span className="text-neutral-500">REGISTRY</span>
          </h1>
          <p className="text-neutral-400 text-xs font-mono uppercase tracking-wider mt-3">
            Master Strategic Deployment Database & Pipeline Archives
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-6 py-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-left">
            <div className="text-[9px] text-neutral-400 uppercase tracking-widest">SYSTEM NODES</div>
            <div className="text-2xl font-black text-white leading-none mt-1">{projects.length}</div>
          </div>

          {canCreateCampaign && (
            <button 
              onClick={onNewProjectTrigger}
              className="bg-white text-black hover:bg-neutral-200 px-6 py-3.5 font-black text-xs uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} strokeWidth={3} /> INITIALIZE CAMPAIGN
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input 
            type="text" 
            placeholder="SEARCH REGISTRY BY JOB CODE (MW-J-...), CLIENT OR CAMPAIGN NAME..." 
            className="w-full pl-12 pr-6 py-3.5 bg-[#0a0b0e] border border-neutral-800 focus:border-white font-mono text-xs uppercase tracking-wider text-white outline-none rounded-sm transition-colors placeholder:text-neutral-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Category Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0a0b0e] border border-neutral-800 rounded-sm overflow-x-auto">
          {(['ALL', 'In Progress', 'Paused', 'Cancelled', 'Completed'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-2 font-mono text-[10px] uppercase rounded-xs transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white text-black font-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              {tab === 'ALL' ? 'ALL STATUS' : tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Modern Table Layout */}
      <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="py-24 text-center opacity-30 font-mono text-xs uppercase tracking-widest">
            <Archive size={48} className="mx-auto mb-3" />
            Zero Registry Matches Found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0e0f14] border-b border-neutral-800 font-mono text-[9px] font-black uppercase text-neutral-400 tracking-[0.25em]">
                <tr>
                  <th className="px-6 py-4">PROTOCOL ID</th>
                  <th className="px-6 py-4">CAMPAIGN METADATA</th>
                  <th className="px-6 py-4">PIPELINE STATUS</th>
                  <th className="px-6 py-4">CYCLE PROGRESS</th>
                  <th className="px-6 py-4">LAST SYNC</th>
                  <th className="px-6 py-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filteredProjects.map(p => {
                  const latestNote = p.statusChangeHistory && p.statusChangeHistory.length > 0 
                    ? p.statusChangeHistory[p.statusChangeHistory.length - 1] 
                    : null;

                  return (
                    <tr key={p.id} className="hover:bg-[#12141a] transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-white px-2.5 py-1 bg-[#14151c] border border-neutral-700/80 rounded-sm">
                          {p.jobNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-sm uppercase text-white tracking-tight group-hover:text-neutral-200 transition-colors font-heading truncate max-w-xs">
                          {p.projectName}
                        </div>
                        <div className="font-mono text-[10px] text-neutral-400 uppercase mt-0.5">
                          CLIENT: {p.clientName} // TYPE: {p.type}
                        </div>
                        {p.createdByName && (
                          <div className="font-mono text-[9px] text-emerald-400/90 uppercase mt-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className="text-neutral-500">INITIATOR:</span>
                            <span className="text-neutral-200 font-semibold">{p.createdByName}</span>
                            {p.createdByRole && <span className="text-neutral-400 font-normal">({p.createdByRole})</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {canManageStatus ? (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(p)}
                              className="group/badge text-left flex items-center gap-1.5 transition-all outline-none hover:scale-[1.02] cursor-pointer"
                              title="Admins & Managers: Click to pause, cancel, or modify pipeline status"
                            >
                              {renderStatusBadge(p.status)}
                              <span className="opacity-0 group-hover/badge:opacity-100 p-1 text-neutral-400 hover:text-white rounded transition-opacity">
                                <Edit2 size={11} />
                              </span>
                            </button>
                          ) : (
                            renderStatusBadge(p.status)
                          )}
                        </div>

                        {/* Recent Status Note / Directive preview */}
                        {latestNote && (
                          <div 
                            className="font-mono text-[9px] text-neutral-400 truncate max-w-[240px] mt-1.5 flex items-center gap-1.5 bg-[#12141a] px-2 py-0.5 rounded-xs border border-neutral-800"
                            title={`Status Log Note: "${latestNote.reason}" — ${latestNote.changedBy} (${latestNote.changedByRole})`}
                          >
                            <FileText size={9} className="text-neutral-500 shrink-0" />
                            <span className="truncate text-neutral-300">
                              "{latestNote.reason}"
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 w-36">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="text-neutral-400">STEP {p.currentStep}/{p.steps.length}</span>
                            <span className="font-bold text-white">{p.progress}%</span>
                          </div>
                          <div className="w-full bg-[#12141a] h-1 rounded-none overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-700 ${
                                p.status === 'Cancelled' ? 'bg-rose-500' :
                                p.status === 'Paused' || p.status === 'On Hold' ? 'bg-amber-400' :
                                'bg-white'
                              }`} 
                              style={{ width: `${p.progress}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-neutral-400">
                        <div>{new Date(p.lastUpdated).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</div>
                        <div className="text-[9px] text-neutral-500">YEAR: {p.year}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canManageStatus && (
                            <div className="flex items-center gap-1">
                              {p.status !== 'Paused' && p.status !== 'Cancelled' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatusModal(p, 'Paused')}
                                  className="px-2 py-1 bg-[#14151c] hover:bg-amber-950/40 text-neutral-400 hover:text-amber-400 border border-neutral-700 hover:border-amber-700/60 font-mono text-[10px] uppercase rounded-sm transition-all flex items-center gap-1 cursor-pointer"
                                  title="Pause Job Pipeline"
                                >
                                  <PauseCircle size={11} /> PAUSE
                                </button>
                              )}
                              {p.status !== 'Cancelled' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatusModal(p, 'Cancelled')}
                                  className="px-2 py-1 bg-[#14151c] hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 border border-neutral-700 hover:border-rose-700/60 font-mono text-[10px] uppercase rounded-sm transition-all flex items-center gap-1 cursor-pointer"
                                  title="Cancel Job Pipeline"
                                >
                                  <XCircle size={11} /> CANCEL
                                </button>
                              )}
                              {(p.status === 'Paused' || p.status === 'Cancelled') && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatusModal(p, 'In Progress')}
                                  className="px-2 py-1 bg-[#14151c] hover:bg-cyan-950/40 text-neutral-400 hover:text-cyan-400 border border-neutral-700 hover:border-cyan-700/60 font-mono text-[10px] uppercase rounded-sm transition-all flex items-center gap-1 cursor-pointer"
                                  title="Resume Job Pipeline"
                                >
                                  <PlayCircle size={11} /> RESUME
                                </button>
                              )}
                            </div>
                          )}

                          <button 
                            onClick={() => onSelectProject(p)}
                            className="px-4 py-1.5 bg-[#14151c] hover:bg-white text-neutral-300 hover:text-black border border-neutral-700 font-mono text-xs uppercase tracking-wider rounded-sm transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            OPEN <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mandatory Status Change & Note Logging Modal */}
      {statusModalProject && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0b0c0f] border border-neutral-800 w-full max-w-xl rounded-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-neutral-800 bg-[#0e0f14] flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert size={12} className="text-amber-400" />
                  EXECUTIVE OVERRIDE // PIPELINE DIRECTIVE
                </div>
                <h3 className="text-base font-black uppercase text-white font-heading mt-0.5">
                  Update Campaign Status & Log Reason
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalProject(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStatusChange} className="p-6 space-y-5">
              {/* Target Campaign Overview */}
              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 uppercase">PROTOCOL ID:</span>
                  <span className="font-bold text-white">{statusModalProject.jobNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 uppercase">CAMPAIGN:</span>
                  <span className="font-bold text-white truncate max-w-[280px]">{statusModalProject.projectName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 uppercase">CLIENT:</span>
                  <span className="text-neutral-300">{statusModalProject.clientName}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase">CURRENT STATUS:</span>
                  <div>{renderStatusBadge(statusModalProject.status)}</div>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-2">
                  Select Target Pipeline Status *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTargetStatus('Paused'); setStatusError(''); }}
                    className={`p-3 rounded-sm border text-left font-mono transition-all cursor-pointer ${
                      targetStatus === 'Paused'
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-300 shadow-sm'
                        : 'bg-[#12141a] border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-black">
                      <PauseCircle size={14} className="text-amber-400" /> PAUSE
                    </div>
                    <div className="text-[8px] text-neutral-400 leading-tight uppercase">Temporary hold on workflow</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTargetStatus('Cancelled'); setStatusError(''); }}
                    className={`p-3 rounded-sm border text-left font-mono transition-all cursor-pointer ${
                      targetStatus === 'Cancelled'
                        ? 'bg-rose-950/40 border-rose-500/80 text-rose-300 shadow-sm'
                        : 'bg-[#12141a] border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-black">
                      <XCircle size={14} className="text-rose-400" /> CANCEL
                    </div>
                    <div className="text-[8px] text-neutral-400 leading-tight uppercase">Terminate and archive job</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTargetStatus('In Progress'); setStatusError(''); }}
                    className={`p-3 rounded-sm border text-left font-mono transition-all cursor-pointer ${
                      targetStatus === 'In Progress'
                        ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-300 shadow-sm'
                        : 'bg-[#12141a] border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-black">
                      <PlayCircle size={14} className="text-cyan-400" /> RESUME
                    </div>
                    <div className="text-[8px] text-neutral-400 leading-tight uppercase">Active execution status</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTargetStatus('Completed'); setStatusError(''); }}
                    className={`p-3 rounded-sm border text-left font-mono transition-all cursor-pointer ${
                      targetStatus === 'Completed'
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300 shadow-sm'
                        : 'bg-[#12141a] border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-black">
                      <CheckCircle2 size={14} className="text-emerald-400" /> COMPLETE
                    </div>
                    <div className="text-[8px] text-neutral-400 leading-tight uppercase">Close all deliverables</div>
                  </button>
                </div>
              </div>

              {/* Mandatory Status Note */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
                    Mandatory Operational Reason / Note *
                  </label>
                  <span className="font-mono text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-xs uppercase">
                    Audit Note Required
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={statusNote}
                  onChange={(e) => {
                    setStatusNote(e.target.value);
                    if (statusError) setStatusError('');
                  }}
                  placeholder="Document specific justification (e.g. 'Client requested 2-week pause due to board review', 'Cancelled by client after strategy pivot', or 'Resumed execution after receiving signed approval')..."
                  className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2.5 text-xs text-white font-mono outline-none rounded-sm transition-colors resize-none placeholder:text-neutral-600"
                />
                {statusError && (
                  <p className="text-rose-400 text-xs font-mono mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> {statusError}
                  </p>
                )}
                <div className="mt-1 text-[9px] font-mono text-neutral-500 flex items-center gap-1">
                  <MessageSquare size={10} />
                  This note will be recorded to project memos, team intelligence logs, and audit trails.
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStatusModalProject(null)}
                  className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                    targetStatus === 'Cancelled' ? 'bg-rose-600 hover:bg-rose-500 text-white' :
                    targetStatus === 'Paused' ? 'bg-amber-500 hover:bg-amber-400 text-black' :
                    'bg-white hover:bg-neutral-200 text-black'
                  }`}
                >
                  <Edit2 size={13} /> Log Directive & Apply Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobRegistry;
