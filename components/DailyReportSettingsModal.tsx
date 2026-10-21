import React, { useState, useEffect } from 'react';
import { 
  DailyReportConfig, 
  DailyCompiledReport, 
  StaffMember, 
  Project, 
  Todo, 
  EmailDispatchRecord,
  Role
} from '../types';
import { 
  getStoredDailyReportConfig, 
  saveDailyReportConfig, 
  compileDailyReportData, 
  dispatchDailyReport, 
  getEmailDispatchLogs,
  DEFAULT_DAILY_REPORT_CONFIG
} from '../utils/emailDispatcher';
import { 
  X, Clock, Send, Users, Mail, CheckCircle2, AlertCircle, 
  Calendar, RefreshCw, Sparkles, Shield, UserCheck, 
  FileText, Check, Plus, Trash2, Search, Zap, ExternalLink
} from 'lucide-react';

interface DailyReportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  projects: Project[];
  todos: Todo[];
  currentUser: StaffMember;
  onReportDispatched?: (report: DailyCompiledReport) => void;
}

const PRESET_TIMES = [
  { label: '18:00 (6:00 PM)', value: '18:00' },
  { label: '19:00 (7:00 PM - Standard EOD)', value: '19:00' },
  { label: '19:30 (7:30 PM)', value: '19:30' },
  { label: '20:00 (8:00 PM)', value: '20:00' }
];

const AVAILABLE_ROLES = [
  { id: Role.GM, label: 'General Manager (GM)' },
  { id: Role.MANAGEMENT, label: 'Management' },
  { id: 'Director', label: 'Directors' },
  { id: Role.ADMIN, label: 'Admin' },
  { id: Role.SUPER_ADMIN, label: 'Super Admin' },
  { id: Role.ACCOUNTS, label: 'Accounts / Finance' },
  { id: Role.AE, label: 'Account Executives' }
];

export const DailyReportSettingsModal: React.FC<DailyReportSettingsModalProps> = ({
  isOpen,
  onClose,
  staffList,
  projects,
  todos,
  currentUser,
  onReportDispatched
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'preview' | 'logs'>('settings');
  const [config, setConfig] = useState<DailyReportConfig>(DEFAULT_DAILY_REPORT_CONFIG);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [previewReport, setPreviewReport] = useState<DailyCompiledReport | null>(null);
  const [dispatchLogs, setDispatchLogs] = useState<EmailDispatchRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredDailyReportConfig();
      setConfig(stored);
      setPreviewReport(compileDailyReportData({ projects, todos, staffList }));
      setDispatchLogs(getEmailDispatchLogs());
      setDispatchStatus(null);
    }
  }, [isOpen, projects, todos, staffList]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveDailyReportConfig(config);
    setDispatchStatus({ message: 'Daily reporting parameters saved successfully.', type: 'success' });
    setTimeout(() => {
      setDispatchStatus(null);
    }, 3000);
  };

  const handleToggleRole = (roleId: string) => {
    const roles = config.recipientRoles || [];
    const exists = roles.includes(roleId);
    const updated = exists 
      ? roles.filter(r => r !== roleId)
      : [...roles, roleId];
    setConfig(prev => ({ ...prev, recipientRoles: updated }));
  };

  const handleToggleStaff = (staffId: string) => {
    const current = config.specificStaffIds || [];
    const exists = current.includes(staffId);
    const updated = exists 
      ? current.filter(id => id !== staffId)
      : [...current, staffId];
    setConfig(prev => ({ ...prev, specificStaffIds: updated }));
  };

  const handleAddCustomEmail = () => {
    const email = customEmailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (!(config.customEmails || []).includes(email)) {
      setConfig(prev => ({
        ...prev,
        customEmails: [...(prev.customEmails || []), email]
      }));
    }
    setCustomEmailInput('');
  };

  const handleRemoveCustomEmail = (email: string) => {
    setConfig(prev => ({
      ...prev,
      customEmails: (prev.customEmails || []).filter(e => e !== email)
    }));
  };

  const handleManualDispatch = async () => {
    setIsDispatching(true);
    setDispatchStatus({ message: 'Compiling operational achievements and dispatching emails...', type: 'info' });
    
    // Save latest settings first
    saveDailyReportConfig(config);

    try {
      const result = await dispatchDailyReport({
        config,
        projects,
        todos,
        staffList,
        triggeredBy: currentUser.name
      });

      setPreviewReport(result.report);
      setDispatchLogs(getEmailDispatchLogs());
      if (onReportDispatched) {
        onReportDispatched(result.report);
      }

      setDispatchStatus({
        message: `Daily Report compiled and emailed to ${result.recipientsCount} recipients!`,
        type: 'success'
      });
    } catch (err: any) {
      setDispatchStatus({
        message: `Dispatch failed: ${err.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const filteredStaff = (staffList || []).filter(s => 
    s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#090a0f] border-2 border-[var(--jarvis-primary)] rounded-sm shadow-[0_0_50px_rgba(var(--jarvis-primary-rgb),0.35)] flex flex-col overflow-hidden text-white">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--jarvis-border)] bg-gradient-to-r from-[rgba(var(--jarvis-primary-rgb),0.2)] via-[#0d0e15] to-[#0d0e15] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-black/80 border border-[var(--jarvis-primary)] flex items-center justify-center text-[var(--jarvis-primary)] shadow-[0_0_15px_rgba(var(--jarvis-primary-rgb),0.5)]">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="font-mono text-[9px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] flex items-center gap-2">
                <span>ADMIN PROTOCOL // EOD TELEMETRY</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-ping" />
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white font-heading tracking-tight">
                Daily Report Settings & Scheduling
              </h2>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/80 rounded transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-[#0d0e14] px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 font-mono text-xs uppercase tracking-wider font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[var(--jarvis-primary)] text-[var(--jarvis-primary)]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Clock size={14} /> Schedule & Recipients
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('preview');
              setPreviewReport(compileDailyReportData({ projects, todos, staffList }));
            }}
            className={`py-3 px-4 font-mono text-xs uppercase tracking-wider font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'border-[var(--jarvis-primary)] text-[var(--jarvis-primary)]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText size={14} /> Today's Report Preview
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('logs');
              setDispatchLogs(getEmailDispatchLogs());
            }}
            className={`py-3 px-4 font-mono text-xs uppercase tracking-wider font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'border-[var(--jarvis-primary)] text-[var(--jarvis-primary)]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Send size={14} /> Email Dispatch Log ({dispatchLogs.length})
          </button>
        </div>

        {/* Status banner */}
        {dispatchStatus && (
          <div className={`px-6 py-2.5 flex items-center gap-2 text-xs font-mono border-b ${
            dispatchStatus.type === 'success' 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : dispatchStatus.type === 'error'
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
          }`}>
            {dispatchStatus.type === 'success' && <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />}
            {dispatchStatus.type === 'error' && <AlertCircle size={14} className="shrink-0 text-rose-400" />}
            {dispatchStatus.type === 'info' && <RefreshCw size={14} className="shrink-0 text-cyan-400 animate-spin" />}
            <span>{dispatchStatus.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              {/* Section 1: Automation & Time Schedule */}
              <div className="bg-[#0e0f16] border border-neutral-800 p-4 sm:p-5 rounded-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-white font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2">
                      <Clock size={16} className="text-[var(--jarvis-primary)]" />
                      Daily Reporting Schedule (End of Day)
                    </h3>
                    <p className="font-mono text-xs text-neutral-400 mt-1">
                      Compile everyone's accomplishments for the day and automatically email the executive report at this time.
                    </p>
                  </div>

                  {/* Master toggle */}
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-neutral-300">
                      Automated Dispatch: <strong className={config.enabled ? 'text-emerald-400' : 'text-rose-400'}>{config.enabled ? 'ACTIVE' : 'PAUSED'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                        config.enabled ? 'bg-[var(--jarvis-primary)]' : 'bg-neutral-700'
                      }`}
                    >
                      <span 
                        className={`absolute top-1 left-1 bg-black w-4 h-4 rounded-full transition-transform ${
                          config.enabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-neutral-800/80">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-neutral-400 mb-2">
                      Schedule Time (24h Clock - Default: 19:00 / 7:00 PM)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="time"
                        value={config.scheduleTime || '19:00'}
                        onChange={(e) => setConfig(prev => ({ ...prev, scheduleTime: e.target.value }))}
                        className="bg-black/60 border border-[var(--jarvis-primary)] text-white font-mono text-base px-3 py-2 rounded-sm outline-none focus:ring-1 focus:ring-[var(--jarvis-primary)]"
                      />
                      <span className="font-mono text-xs text-[var(--jarvis-primary)] font-bold">
                        {config.scheduleTime === '19:00' ? 'Standard 7:00 PM EOD' : `${config.scheduleTime}`}
                      </span>
                    </div>
                  </div>

                  {/* Preset quick buttons */}
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-neutral-400 mb-2">
                      Quick Preset Times
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_TIMES.map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, scheduleTime: preset.value }))}
                          className={`px-2.5 py-1 rounded-sm font-mono text-[11px] transition-all cursor-pointer ${
                            config.scheduleTime === preset.value
                              ? 'bg-[var(--jarvis-primary)] text-black font-bold shadow-sm'
                              : 'bg-black/40 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {config.lastDispatchedAt && (
                  <div className="font-mono text-[10px] text-neutral-400 pt-2 flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span>Last Daily Report Compiled: <strong>{new Date(config.lastDispatchedAt).toLocaleString()}</strong></span>
                  </div>
                )}
              </div>

              {/* Section 2: Whom the report should be sent to (Recipient Roles) */}
              <div className="bg-[#0e0f16] border border-neutral-800 p-4 sm:p-5 rounded-sm space-y-4">
                <div>
                  <h3 className="text-white font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2">
                    <Users size={16} className="text-[var(--jarvis-primary)]" />
                    Automated Recipient Roles
                  </h3>
                  <p className="font-mono text-xs text-neutral-400 mt-1">
                    Every individual assigned to these leadership roles will automatically receive the compiled EOD report:
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {AVAILABLE_ROLES.map(role => {
                    const isSelected = (config.recipientRoles || []).includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleToggleRole(role.id)}
                        className={`p-3 rounded-sm border text-left flex items-start justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[rgba(var(--jarvis-primary-rgb),0.15)] border-[var(--jarvis-primary)] text-white shadow-[0_0_15px_-3px_rgba(var(--jarvis-primary-rgb),0.3)]'
                            : 'bg-black/40 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        <div>
                          <div className={`font-mono text-xs font-bold ${isSelected ? 'text-[var(--jarvis-primary)]' : 'text-neutral-300'}`}>
                            {role.label}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                            {isSelected ? 'Enabled' : 'Excluded'}
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-[var(--jarvis-primary)] border-[var(--jarvis-primary)] text-black' : 'border-neutral-700'
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Specific Staff & Custom Email Addresses */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Specific Staff Selection */}
                <div className="bg-[#0e0f16] border border-neutral-800 p-4 sm:p-5 rounded-sm space-y-3 flex flex-col h-[280px]">
                  <div>
                    <h3 className="text-white font-heading font-black text-xs uppercase tracking-wide flex items-center gap-2">
                      <UserCheck size={14} className="text-[var(--jarvis-primary)]" />
                      Specific Team Member Recipients
                    </h3>
                    <p className="font-mono text-[10px] text-neutral-400">
                      Check specific individuals regardless of their role.
                    </p>
                  </div>

                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2.5 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Filter staff by name or role..."
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      className="w-full bg-black/60 border border-neutral-800 rounded-sm pl-8 pr-3 py-1.5 text-xs font-mono text-white outline-none focus:border-[var(--jarvis-primary)]"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {filteredStaff.map(staff => {
                      const isChecked = (config.specificStaffIds || []).includes(staff.id);
                      return (
                        <div
                          key={staff.id}
                          onClick={() => handleToggleStaff(staff.id)}
                          className={`flex items-center justify-between p-2 rounded-sm border cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-[rgba(var(--jarvis-primary-rgb),0.1)] border-[var(--jarvis-primary)] text-white'
                              : 'bg-black/30 border-neutral-850 hover:border-neutral-700 text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={staff.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${staff.id}`}
                              alt={staff.name}
                              className="w-6 h-6 rounded-full border border-neutral-700 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate leading-tight">{staff.name}</div>
                              <div className="text-[9px] font-mono text-neutral-400 truncate">{staff.role} // {staff.email}</div>
                            </div>
                          </div>

                          <div className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-[var(--jarvis-primary)] border-[var(--jarvis-primary)] text-black' : 'border-neutral-700'
                          }`}>
                            {isChecked && <Check size={10} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Custom Emails */}
                <div className="bg-[#0e0f16] border border-neutral-800 p-4 sm:p-5 rounded-sm space-y-3 flex flex-col h-[280px]">
                  <div>
                    <h3 className="text-white font-heading font-black text-xs uppercase tracking-wide flex items-center gap-2">
                      <Mail size={14} className="text-[var(--jarvis-primary)]" />
                      External / Direct Email Recipients
                    </h3>
                    <p className="font-mono text-[10px] text-neutral-400">
                      Add external executive or board email addresses (e.g. board@mediawize.com).
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="executive@company.com"
                      value={customEmailInput}
                      onChange={(e) => setCustomEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomEmail();
                        }
                      }}
                      className="flex-1 bg-black/60 border border-neutral-800 rounded-sm px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-[var(--jarvis-primary)]"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomEmail}
                      className="px-3 py-1.5 bg-[var(--jarvis-primary)] text-black font-mono font-bold text-xs uppercase rounded-sm hover:opacity-90 cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {(config.customEmails || []).length === 0 ? (
                      <div className="text-center py-8 font-mono text-[11px] text-neutral-500">
                        No custom external emails configured.
                      </div>
                    ) : (
                      config.customEmails.map(email => (
                        <div
                          key={email}
                          className="flex items-center justify-between p-2 rounded-sm bg-black/40 border border-neutral-800 font-mono text-xs text-white"
                        >
                          <span className="truncate">{email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomEmail(email)}
                            className="text-neutral-400 hover:text-rose-400 cursor-pointer p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Section 4: Content Inclusion Toggles */}
              <div className="bg-[#0e0f16] border border-neutral-800 p-4 rounded-sm">
                <div className="font-mono text-[10px] uppercase text-neutral-400 mb-2">
                  Report Telemetry Metrics
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-200">
                    <input
                      type="checkbox"
                      checked={config.includeCompletedTasks}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeCompletedTasks: e.target.checked }))}
                      className="accent-[var(--jarvis-primary)]"
                    />
                    Completed Tasks
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-200">
                    <input
                      type="checkbox"
                      checked={config.includeActiveDirectives}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeActiveDirectives: e.target.checked }))}
                      className="accent-[var(--jarvis-primary)]"
                    />
                    Active Directives
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-200">
                    <input
                      type="checkbox"
                      checked={config.includeTimeLogged}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeTimeLogged: e.target.checked }))}
                      className="accent-[var(--jarvis-primary)]"
                    />
                    Time Logged
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-200">
                    <input
                      type="checkbox"
                      checked={config.includeStaffEfficiency}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeStaffEfficiency: e.target.checked }))}
                      className="accent-[var(--jarvis-primary)]"
                    />
                    Velocity & Efficiency
                  </label>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-heading font-black text-sm uppercase">
                    Live EOD Compilation Preview
                  </h3>
                  <p className="font-mono text-[11px] text-neutral-400">
                    Aggregated telemetry of tasks finished today across all staff members and active directives.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewReport(compileDailyReportData({ projects, todos, staffList }))}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs rounded-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={12} /> Refresh Preview
                </button>
              </div>

              {previewReport ? (
                <div className="space-y-4 font-mono">
                  {/* Executive Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#0e0f16] border border-neutral-800 p-3 rounded-sm">
                      <div className="text-[10px] text-neutral-400 uppercase">Tasks Done Today</div>
                      <div className="text-2xl font-black text-[var(--jarvis-primary)] mt-1 font-heading">
                        {previewReport.totalCompletedToday}
                      </div>
                    </div>
                    <div className="bg-[#0e0f16] border border-neutral-800 p-3 rounded-sm">
                      <div className="text-[10px] text-neutral-400 uppercase">In Pipeline</div>
                      <div className="text-2xl font-black text-white mt-1 font-heading">
                        {previewReport.totalActiveDirectives}
                      </div>
                    </div>
                    <div className="bg-[#0e0f16] border border-neutral-800 p-3 rounded-sm">
                      <div className="text-[10px] text-neutral-400 uppercase">Hours Logged</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1 font-heading">
                        {previewReport.totalHoursLogged}h
                      </div>
                    </div>
                    <div className="bg-[#0e0f16] border border-neutral-800 p-3 rounded-sm">
                      <div className="text-[10px] text-neutral-400 uppercase">Team Velocity</div>
                      <div className="text-2xl font-black text-amber-400 mt-1 font-heading">
                        {previewReport.averageEfficiency}%
                      </div>
                    </div>
                  </div>

                  {/* Summary memo */}
                  <div className="bg-black/50 border border-neutral-800 p-3.5 rounded-sm text-xs text-neutral-300">
                    <strong className="text-[var(--jarvis-primary)]">DAILY MEMO:</strong> {previewReport.summaryMemo}
                  </div>

                  {/* Staff breakdown list */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase text-neutral-400">Staff Accomplishments Today:</div>
                    {previewReport.staffAccomplishments.map(staff => (
                      <div key={staff.staffId} className="bg-[#0e0f16] border border-neutral-800 p-3.5 rounded-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={staff.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${staff.staffId}`}
                              alt={staff.name}
                              className="w-6 h-6 rounded-full border border-neutral-700 object-cover"
                            />
                            <div>
                              <span className="font-bold text-white text-xs">{staff.name}</span>
                              <span className="text-[10px] text-neutral-400 ml-2">({staff.role} // {staff.department})</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-emerald-400 font-bold">{staff.completedTasks.length + staff.dailyTodosCompleted.length} Completed</span>
                            <span className="text-neutral-500">|</span>
                            <span className="text-neutral-400">{Math.round(staff.totalMinutesLogged / 60 * 10) / 10}h logged</span>
                          </div>
                        </div>

                        {/* Completed items */}
                        {(staff.completedTasks.length > 0 || staff.dailyTodosCompleted.length > 0) ? (
                          <div className="space-y-1 pl-8">
                            {staff.completedTasks.map(t => (
                              <div key={t.id} className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                                <span>{t.text}</span>
                                {t.projectName && <span className="text-neutral-500 text-[10px]">[{t.projectName}]</span>}
                              </div>
                            ))}
                            {staff.dailyTodosCompleted.map(t => (
                              <div key={t.id} className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                                <span>{t.text}</span>
                                <span className="text-neutral-500 text-[10px]">[Daily Task]</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-neutral-500 pl-8 italic">
                            No directives marked completed today yet.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 font-mono text-neutral-400">
                  Loading preview...
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4 font-mono">
              <div>
                <h3 className="text-white font-heading font-black text-sm uppercase">
                  Automated Email Notification Audit Trail
                </h3>
                <p className="text-[11px] text-neutral-400">
                  All automated task assignment emails, mention pings, and compiled EOD daily reports dispatched to recipients.
                </p>
              </div>

              {dispatchLogs.length === 0 ? (
                <div className="p-8 text-center bg-[#0e0f16] border border-neutral-800 rounded-sm text-neutral-500 text-xs">
                  No automated emails logged yet. Click "Compile & Send Today's Report Now" to test dispatch.
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar">
                  {dispatchLogs.map(log => (
                    <div 
                      key={log.id} 
                      className="p-3 bg-[#0e0f16] border border-neutral-800 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase ${
                            log.type === 'daily_report' 
                              ? 'bg-amber-950 text-amber-300 border border-amber-600/50'
                              : log.type === 'task_assignment'
                              ? 'bg-blue-950 text-blue-300 border border-blue-600/50'
                              : 'bg-purple-950 text-purple-300 border border-purple-600/50'
                          }`}>
                            {log.type.replace('_', ' ')}
                          </span>
                          <span className="font-bold text-white truncate">{log.subject}</span>
                        </div>
                        <div className="text-neutral-400 text-[10px] flex items-center gap-3">
                          <span>To: <strong className="text-neutral-200">{log.to}</strong> {log.toName && `(${log.toName})`}</span>
                          <span>•</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                          log.status === 'DELIVERED' 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/50'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-600/50'
                        }`}>
                          {log.deliveryChannel === 'GMAIL_API' ? 'Delivered via Gmail' : 'Logged to System Queue'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--jarvis-border)] bg-[#0c0d12] flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-xs text-neutral-400">
            Target Schedule: <strong className="text-[var(--jarvis-primary)]">{config.scheduleTime || '19:00'} (7:00 PM)</strong> daily
          </div>

          <div className="flex items-center gap-3">
            {/* Immediate manual trigger */}
            <button
              type="button"
              disabled={isDispatching}
              onClick={handleManualDispatch}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 disabled:opacity-50 text-black font-mono font-black text-xs uppercase rounded-sm flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Send size={14} className={isDispatching ? 'animate-spin' : ''} />
              {isDispatching ? 'Compiling & Sending...' : "Compile & Send Today's Report Now"}
            </button>

            {/* Save config */}
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[var(--jarvis-primary)] hover:opacity-90 text-black font-mono font-black text-xs uppercase rounded-sm flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(var(--jarvis-primary-rgb),0.4)]"
            >
              <Check size={14} strokeWidth={3} /> Save Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DailyReportSettingsModal;
