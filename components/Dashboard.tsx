import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, StaffMember, Todo, CalendarEvent, PaymentUpdate, Role, PettyCashTransaction, ProjectType, Client, Task, LeaveRequest } from '../types';
import { 
  CheckCircle2, Clock, Briefcase, ListTodo, Calendar, ArrowLeft, X, DollarSign, 
  Target, Plus, Zap, Activity, Bot, Users, RefreshCw, AlertCircle, TrendingUp, 
  Search, Send, Timer, Play, Pause, ChevronRight, LayoutGrid, Layers, Hash, 
  StopCircle, Check, Gauge, Award, Eye, ExternalLink, ShieldCheck, ArrowUpRight,
  Mail, ShieldAlert, CheckCircle, ChevronDown, HardDrive, Lock
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import GameHub from './GameHub';
import GmailWidget from './GmailWidget';
import MonthlyCalendar from './MonthlyCalendar';
import GoogleDriveWidget from './GoogleDriveWidget';

interface DashboardProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
  currentUser: StaffMember;
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (text: string, due?: Date) => void;
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  staffList: StaffMember[];
  onUpdatePayment: (update: PaymentUpdate) => void;
  pettyCash: PettyCashTransaction[];
  clientList: Client[];
  onSendMessage?: (text: string, channelId: string) => void;
  leaveRequests?: LeaveRequest[];
  onUpdateLeave?: (requestId: string, status: 'Approved' | 'Rejected', reviewNote?: string) => void;
  onNavigateToHR?: () => void;
  onNavigateToWorkload?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  projects, onSelectProject, onNewProject, currentUser, todos, onToggleTodo, 
  onAddTodo, onUpdatePayment, pettyCash, clientList, staffList, events, 
  onAddEvent, onDeleteEvent, onSendMessage, leaveRequests = [], onUpdateLeave, onNavigateToHR,
  onNavigateToWorkload
}) => {
  const [dashboardTab, setDashboardTab] = useState<'telemetry' | 'gmail' | 'drive' | 'calendar'>('telemetry');
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isMyTasksOpen, setIsMyTasksOpen] = useState(false);
  const [selectedStaffForWorkload, setSelectedStaffForWorkload] = useState<StaffMember | null>(null);
  const [eventForm, setEventForm] = useState({ 
    title: '', 
    date: new Date().toISOString().split('T')[0], 
    time: '09:00', 
    type: 'meeting' as 'meeting' | 'deadline' | 'personal' 
  });
  const [isGameHubOpen, setIsGameHubOpen] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  const [aiInquiry, setAiInquiry] = useState('');
  const [aiChat, setAiChat] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: "Strategic Intelligence online. Mediawize positioning matrix synchronized." }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  const [activeTimerTask, setActiveTimerTask] = useState<{taskName: string, projectName: string, startTime: number} | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerPickerOpen, setIsTimerPickerOpen] = useState(false);

  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (activeTimerTask) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - activeTimerTask.startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [activeTimerTask]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChat]);

  const normRole = (currentUser.role || '').toLowerCase();
  const isSuperAdmin = normRole === 'super admin' || currentUser.role === Role.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || normRole === 'admin' || currentUser.role === Role.ADMIN;
  const isGM = normRole === 'general manager' || normRole === 'gm' || currentUser.role === Role.GM;
  const isHR = normRole === 'hr' || currentUser.role === Role.HR;
  const isAccounts = normRole === 'accounts' || currentUser.role === Role.ACCOUNTS || (currentUser.department || '').toLowerCase() === 'finance';
  const isAE = normRole === 'account executive' || currentUser.role === Role.AE;
  const isManager = normRole === 'management' || currentUser.role === Role.MANAGEMENT || (currentUser.role || '').toLowerCase().includes('lead') || (currentUser.role || '').toLowerCase().includes('manager');

  // Rule: Only admins, GM or finance person have access to finance
  const canViewFinance = isSuperAdmin || isAdmin || isGM || isAccounts || !!currentUser.permissions?.canViewFinance;
  // Rule: Projects should only be visible to admins, managers, AEs and Finance
  const canViewProjects = isSuperAdmin || isAdmin || isGM || isManager || isAE || isAccounts || !!currentUser.permissions?.canViewProjects;

  // Rule: New campaign can be created ONLY by Super Admin and Admin
  const canCreateCampaign = isSuperAdmin || isAdmin;

  // Rule: Hero management buttons (Simulator directives) displayed ONLY for Super Admin and Admin
  const canViewManagerButtons = isSuperAdmin || isAdmin;

  // Rule: Workload dashboard access for AE / managers / admins / super admins / general managers
  const canAccessWorkload = isSuperAdmin || isAdmin || isGM || isManager || isAE || !!currentUser.permissions?.canViewWorkload;

  // Rule: Managers have access to only their departments. Admins and GM have full access.
  const accessibleProjects = useMemo(() => {
    if (!canViewProjects) return [];
    if (isSuperAdmin || isAdmin || isGM || currentUser.permissions?.canViewAllProjects) {
      return projects;
    }
    if (isManager) {
      const dept = (currentUser.department || '').toLowerCase();
      return projects.filter(p => {
        const hasDeptStaff = p.steps.some(s => s.tasks.some(t => {
          if (!t.assignedTo) return false;
          const assignedStaff = staffList.find(st => st.id === t.assignedTo);
          return assignedStaff && (assignedStaff.department || '').toLowerCase() === dept;
        }));
        const matchesCategory = p.type && (
          (dept === 'creative' && ['Annual Reports', 'Advertising', 'Production House', 'Wize Studio', 'WizeTV'].includes(p.type)) ||
          (dept.includes('digital') && p.type === 'Digital & Media Strategy') ||
          (dept.includes('production') && ['Production House', 'Podcast Studio'].includes(p.type)) ||
          (dept.includes('client') && true)
        );
        return hasDeptStaff || matchesCategory;
      });
    }
    return projects;
  }, [projects, canViewProjects, isSuperAdmin, isAdmin, isGM, isManager, currentUser.permissions, currentUser.department, staffList]);

  const activeProjects = accessibleProjects.filter(p => p.status === 'In Progress');
  const balance = pettyCash.reduce((sum, tx) => sum + (tx.type === 'Income' ? tx.amount : -tx.amount), 0);

  const canApproveLeaves = isSuperAdmin || isAdmin || isGM || isHR || isManager || !!currentUser.permissions?.canApproveLeaves;

  // Rule: When an employee requests for a leave it should show on the HR dashboard and on the relevant manager's dashboard for approvals
  const relevantPendingLeaves = useMemo(() => {
    if (!leaveRequests || !canApproveLeaves) return [];
    return leaveRequests.filter(l => {
      if (l.status !== 'Pending') return false;
      if (isSuperAdmin || isAdmin || isGM || isHR) return true;
      if (isManager || currentUser.permissions?.canApproveLeaves) {
        const staff = staffList.find(s => s.id === l.staffId);
        const staffDept = (staff?.department || l.department || '').toLowerCase();
        const myDept = (currentUser.department || '').toLowerCase();
        return staffDept === myDept;
      }
      return false;
    });
  }, [leaveRequests, canApproveLeaves, isSuperAdmin, isAdmin, isGM, isHR, isManager, staffList, currentUser]);
  
  const teamStats = useMemo(() => staffList.map(staff => {
    const staffTodos = todos.filter(t => t.userId === staff.id);
    const allStaffTasks = projects.flatMap(p => 
      p.steps.flatMap(step => 
        step.tasks.filter(t => t.assignedTo === staff.id)
          .map(task => ({ 
            ...task, 
            projectName: p.projectName, 
            clientName: p.clientName, 
            jobNumber: p.jobNumber,
            projectId: p.id,
            isCompleted: !!p.tasksCompleted[task.id]
          }))
      )
    );

    const activeTasks = allStaffTasks.filter(t => !t.isCompleted);
    const completedTasks = allStaffTasks.filter(t => t.isCompleted);
    const completionRate = allStaffTasks.length > 0 ? (completedTasks.length / allStaffTasks.length) * 100 : 0;
    const todoRate = staffTodos.length > 0 ? (staffTodos.filter(t => t.completed).length / staffTodos.length) * 100 : 0;
    
    const efficiencyIndex = allStaffTasks.length > 0 ? (completionRate * 0.7 + todoRate * 0.3) : (todoRate || 0);

    return { 
      staff, 
      load: activeTasks.length + staffTodos.filter(t => !t.completed).length, 
      efficiency: Math.round(efficiencyIndex) || 75,
      activeTasks,
      completedCount: completedTasks.length,
      todos: staffTodos,
      projectTasks: allStaffTasks
    };
  }), [staffList, todos, projects]);

  const sortedEfficiency = useMemo(() => [...teamStats].sort((a,b) => b.efficiency - a.efficiency), [teamStats]);
  const selectedStaffData = useMemo(() => teamStats.find(t => t.staff.id === selectedStaffForWorkload?.id), [teamStats, selectedStaffForWorkload]);

  const currentUserTasks = useMemo(() => {
    return projects.flatMap(p => 
      p.steps.flatMap(s => 
        s.tasks.filter(t => (t.assignedTo === currentUser.id || t.role === currentUser.role) && !p.tasksCompleted[t.id])
          .map(t => ({ ...t, projectName: p.projectName, projectId: p.id, jobNumber: p.jobNumber }))
      )
    );
  }, [projects, currentUser]);

  const handleAiAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInquiry.trim()) return;

    const userMsg = aiInquiry;
    setAiInquiry('');
    setAiChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAiTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contextPrompt = `You are "WizeMind", official AI strategist for Mediawize. 
      CONTEXT:
      - ACTIVE JOBS: ${activeProjects.map(p => `${p.projectName} (${p.clientName})`).join(', ')}
      - TEAM EFFICIENCY: ${teamStats.map(t => `${t.staff.name}: ${t.efficiency}%`).join(', ')}
      - TEAM: ${staffList.length} members currently logged in.
      - FINANCES: LKR ${balance.toLocaleString()} available.
      INQUIRY: ${userMsg}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contextPrompt,
      });
      setAiChat(prev => [...prev, { role: 'bot', text: response.text || "No response received." }]);
    } catch (error) {
      setAiChat(prev => [...prev, { role: 'bot', text: "AI link interrupted. Check API connection." }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title) return;

    const eventDate = new Date(`${eventForm.date}T${eventForm.time}`);
    const newEvent: CalendarEvent = {
        id: `ev-${Date.now()}`,
        title: eventForm.title,
        date: eventDate,
        type: eventForm.type,
        userId: currentUser.id
    };

    onAddEvent(newEvent);
    setIsNewEventModalOpen(false);
    setEventForm({ title: '', date: new Date().toISOString().split('T')[0], time: '09:00', type: 'meeting' });
  };

  const handleTaskJump = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
        onSelectProject(project);
        setSelectedStaffForWorkload(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Precision Module Navigation Bar on Dashboard - Liquid Glass */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2.5 liquid-glass rounded-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setDashboardTab('telemetry')}
            className={`px-4 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              dashboardTab === 'telemetry'
                ? 'jarvis-btn-primary shadow-md'
                : 'bg-transparent text-neutral-400 hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
            }`}
          >
            <Activity size={14} /> 01 // PULSE TELEMETRY
          </button>
          <button
            onClick={() => setDashboardTab('gmail')}
            className={`px-4 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              dashboardTab === 'gmail'
                ? 'bg-rose-600 text-white font-black border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                : 'bg-transparent text-neutral-400 hover:text-rose-400 border-transparent hover:bg-[rgba(255,255,255,0.06)]'
            }`}
          >
            <Mail size={14} /> 02 // MY WORKSPACE GMAIL
          </button>
          <button
            onClick={() => setDashboardTab('calendar')}
            className={`px-4 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              dashboardTab === 'calendar'
                ? 'bg-indigo-600 text-white font-black border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                : 'bg-transparent text-neutral-400 hover:text-indigo-400 border-transparent hover:bg-[rgba(255,255,255,0.06)]'
            }`}
          >
            <Calendar size={14} /> 03 // GOOGLE & MONTHLY CALENDAR
          </button>
          <button
            onClick={() => setDashboardTab('drive')}
            className={`px-4 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
              dashboardTab === 'drive'
                ? 'bg-sky-600 text-white font-black border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]'
                : 'bg-transparent text-neutral-400 hover:text-sky-400 border-transparent hover:bg-[rgba(255,255,255,0.06)]'
            }`}
          >
            <HardDrive size={14} /> 04 // GOOGLE DRIVE VAULT
          </button>
        </div>

        <div className="flex items-center gap-3 px-3.5 py-1.5 bg-black/40 border border-[var(--jarvis-border)] rounded-sm font-mono text-[10px] text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-[var(--jarvis-primary)] animate-pulse shadow-[0_0_8px_var(--jarvis-primary)]" />
          <span>USER NODE: <strong className="text-white uppercase">{currentUser.name}</strong> (<span className="text-[var(--jarvis-primary)]">{currentUser.role}</span> // {currentUser.department})</span>
        </div>
      </div>

      {dashboardTab === 'gmail' && (
        <GmailWidget currentUser={currentUser} />
      )}

      {dashboardTab === 'drive' && (
        <GoogleDriveWidget currentUser={currentUser} />
      )}

      {dashboardTab === 'calendar' && (
        <MonthlyCalendar 
          events={events} 
          projects={accessibleProjects} 
          staffList={staffList} 
          leaveRequests={leaveRequests} 
          onAddEvent={onAddEvent} 
          onDeleteEvent={onDeleteEvent}
          currentUser={currentUser} 
        />
      )}

      {dashboardTab === 'telemetry' && (
        <>
          {/* Pending Leave Approvals Required Banner for Relevant Managers & HR */}
          {relevantPendingLeaves.length > 0 && (
            <div className="bg-[#18110b] border border-amber-600/40 rounded-sm p-6 relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-sm">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-amber-400 uppercase tracking-widest">
                      AUTHORIZATION QUEUE // {isHR ? 'COMPANY-WIDE HR ROSTER' : `${currentUser.department?.toUpperCase()} DIVISION`}
                    </div>
                    <h3 className="font-heading font-black text-lg text-white uppercase tracking-tight">
                      {relevantPendingLeaves.length} PENDING LEAVE APPROVAL{relevantPendingLeaves.length > 1 ? 'S' : ''} AWAITING YOUR DECISION
                    </h3>
                  </div>
                </div>
                {onNavigateToHR && (
                  <button
                    onClick={onNavigateToHR}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
                  >
                    Open Full HR Portal <ArrowUpRight size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {relevantPendingLeaves.map(leave => {
                  const staff = staffList.find(s => s.id === leave.staffId);
                  return (
                    <div key={leave.id} className="p-4 bg-[#0e0c0a] border border-amber-800/40 rounded-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-heading font-black text-white uppercase text-sm truncate">
                            {leave.staffName}
                          </span>
                          <span className="px-2 py-0.5 rounded-sm bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono text-[9px] uppercase">
                            {leave.type}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-neutral-400 space-y-1">
                          <div>Division: <strong className="text-neutral-200">{staff?.department || 'General'}</strong></div>
                          <div>Duration: <span className="text-white">{new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}</span></div>
                          <div className="text-neutral-300 italic truncate mt-1">"{leave.reason}"</div>
                        </div>
                      </div>

                      {onUpdateLeave && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-800">
                          <button
                            onClick={() => onUpdateLeave(leave.id, 'Approved', `Approved by ${currentUser.name}`)}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase rounded-sm flex items-center justify-center gap-1 cursor-pointer transition-all"
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            onClick={() => onUpdateLeave(leave.id, 'Rejected', `Rejected by ${currentUser.name}`)}
                            className="flex-1 py-1.5 bg-[#201014] hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 font-mono text-[10px] font-bold uppercase rounded-sm flex items-center justify-center gap-1 cursor-pointer transition-all"
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 1. HERO BLOCK: JARVIS Liquid Glass HUD */}
          <div className="liquid-glass-card hud-frame rounded-sm p-8 sm:p-12 relative overflow-hidden shadow-[0_0_50px_-10px_rgba(var(--jarvis-primary-rgb),0.25)]">
            {/* Ambient liquid subtle sheen */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[radial-gradient(circle,rgba(var(--jarvis-primary-rgb),0.18)_0%,transparent_70%)] pointer-events-none blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[radial-gradient(circle,rgba(var(--jarvis-secondary-rgb),0.15)_0%,transparent_70%)] pointer-events-none blur-3xl" />
            
            {/* Giant faint watermark in background */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[100px] sm:text-[180px] lg:text-[240px] text-white/[0.03] select-none uppercase tracking-tighter pointer-events-none font-heading leading-none">
              DISRUPT
            </div>

            <div className="relative z-10 max-w-3xl">
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--jarvis-primary)] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--jarvis-primary)] animate-ping" />
                <span className="font-bold">PROPRIETARY ECOSYSTEM // CREATIVE OPS SWARM // JARVIS HUD</span>
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight uppercase leading-none font-heading">
                MEDIAWIZE
                <span className="block text-[var(--jarvis-primary)] font-bold mt-2 hud-glow-text">CREATIVE OPS</span>
              </h1>

              <p className="text-xs sm:text-sm text-neutral-300 font-medium uppercase tracking-wider max-w-2xl mt-6 leading-relaxed">
                IMMERSIVE SPATIAL ADVERTISING, ANNUAL REPORTS & MULTI-CHANNEL CAMPAIGN ENGINE. AUTONOMOUS CREATIVE DIRECTIVES COORDINATE STRATEGY, PRODUCTION LOGIC, AND REAL-TIME BUDGET ATTRIBUTION.
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-8">
                {canCreateCampaign && (
                  <button
                    onClick={onNewProject}
                    className="jarvis-btn-primary px-7 py-3.5 font-black text-xs uppercase tracking-wider flex items-center gap-2.5 rounded-sm active:scale-95 transition-all cursor-pointer group"
                    title="Initialize New Campaign"
                  >
                    <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                    <Plus size={16} strokeWidth={3} />
                    <span>NEW CAMPAIGN</span>
                  </button>
                )}

                {canViewManagerButtons && (
                  <button
                    onClick={() => setIsMyTasksOpen(true)}
                    className="jarvis-btn-secondary px-7 py-3.5 font-bold text-xs uppercase tracking-wider flex items-center gap-2.5 rounded-sm active:scale-95 transition-all cursor-pointer group"
                    title="Launch Directives Simulator"
                  >
                    <Eye size={16} className="text-[var(--jarvis-primary)] group-hover:scale-110 transition-transform" />
                    <span>OPEN SIMULATOR ({currentUserTasks.length} DIRECTIVES)</span>
                  </button>
                )}

                {canAccessWorkload && onNavigateToWorkload && (
                  <button
                    onClick={onNavigateToWorkload}
                    className="px-6 py-3.5 rounded-sm font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer bg-[rgba(var(--jarvis-secondary-rgb),0.12)] border border-[var(--jarvis-border)] text-[var(--jarvis-primary)] hover:border-[var(--jarvis-primary)] hover:bg-[rgba(var(--jarvis-secondary-rgb),0.22)] shadow-[0_0_15px_-3px_rgba(var(--jarvis-secondary-rgb),0.3)]"
                  >
                    <Target size={15} /> WORKLOAD BALANCER
                  </button>
                )}
              </div>
            </div>
          </div>

      {/* 2. STRATEGY COORDINATOR // POSITIONING MATRIX: JARVIS Liquid Glass */}
      <div className="liquid-glass-card hud-frame rounded-sm p-8 sm:p-10 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="font-mono text-[10px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-pulse" />
              <span>STRATEGY COORDINATOR // POSITIONING MATRIX</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight font-heading">
              UNMASK TRUE REVENUE ATTRIBUTION
            </h2>
          </div>
          <div className="self-start sm:self-auto">
            <span className="px-3.5 py-1.5 bg-[var(--jarvis-primary)] text-black font-black text-[10px] uppercase tracking-wider rounded-none shadow-[0_0_15px_rgba(var(--jarvis-primary-rgb),0.4)]">
              TONE: PROFESSIONAL B2B // HUD ACTIVE
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black/40 border border-[var(--jarvis-border)] p-6 rounded-sm flex flex-col justify-between hover:border-[var(--jarvis-primary)] transition-all">
            <div>
              <div className="font-mono text-[10px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] mb-3">
                01 // CORE VALUE PROPOSITION
              </div>
              <p className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed">
                Stop guessing which marketing channels drive pipeline. Mediawize Pulse connects creative output to actual client revenue in real-time.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-800/80 flex items-center justify-between font-mono text-xs">
              <span className="text-neutral-400">LIQUID FLOAT:</span>
              <span className="font-black text-white">{canViewFinance ? `LKR ${balance.toLocaleString()}` : '[RESTRICTED - FINANCE ONLY]'}</span>
            </div>
          </div>

          <div className="bg-black/40 border border-[var(--jarvis-border)] p-6 rounded-sm flex flex-col justify-between hover:border-[var(--jarvis-primary)] transition-all">
            <div>
              <div className="font-mono text-[10px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] mb-3">
                02 // PSYCHOLOGICAL HOOK
              </div>
              <p className="text-xs sm:text-sm text-white font-bold italic leading-relaxed">
                "The average corporate client wastes 34% of creative budget on dark social attribution blind spots."
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-800/80 flex items-center justify-between font-mono text-xs">
              <span className="text-neutral-400">COMPLIANCE:</span>
              <span className="font-black text-emerald-400">100% SOP ADHERENCE</span>
            </div>
          </div>

          <div className="bg-black/40 border border-[var(--jarvis-border)] p-6 rounded-sm flex flex-col justify-between hover:border-[var(--jarvis-primary)] transition-all">
            <div>
              <div className="font-mono text-[10px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] mb-3">
                03 // PRODUCTION VELOCITY
              </div>
              <p className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed">
                Active workflow nodes spanning Annual Reports, Advertising, Podcast Studio, and Digital Campaigns.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-800/80 flex items-center justify-between font-mono text-xs">
              <span className="text-neutral-400">ACTIVE PIPELINES:</span>
              <span className="font-black text-[var(--jarvis-primary)] font-mono">{activeProjects.length} NODES LIVE</span>
            </div>
          </div>

          <div className="bg-black/40 border border-[var(--jarvis-border)] p-6 rounded-sm flex flex-col justify-between hover:border-[var(--jarvis-primary)] transition-all">
            <div>
              <div className="font-mono text-[10px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] mb-3">
                04 // SYSTEM UNIVERSAL SYNC
              </div>
              <div className="text-3xl font-mono font-black text-white tracking-tight tabular-nums mt-1 hud-glow-text">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </div>
              <p className="text-[10px] font-mono text-neutral-400 uppercase mt-2">
                {currentTime.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-800/80 flex items-center justify-between font-mono text-xs">
              <span className="text-neutral-400">STABILITY:</span>
              <span className="font-black text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> OPTIMAL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ACTIVE PROTOCOL TIMER & TELEMETRY ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Timer Card */}
        <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer size={18} className="text-white" />
              <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.25em]">
                {activeTimerTask ? 'PROTOCOL SYNC ACTIVE' : 'TASK TIMER PROTOCOL'}
              </span>
            </div>
            {activeTimerTask && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>

          <div className="my-3">
            {activeTimerTask ? (
              <div>
                <div className="text-4xl font-mono font-black text-white tracking-tight tabular-nums">
                  {formatTime(elapsedTime)}
                </div>
                <div className="text-xs font-mono text-neutral-300 mt-2 truncate">
                  {activeTimerTask.projectName} // {activeTimerTask.taskName}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-mono text-neutral-500 font-bold tracking-widest">
                  00:00:00
                </div>
                <p className="text-xs font-mono text-neutral-400 uppercase mt-1">
                  Standby // Awaiting Task Activation
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-800/80">
            {activeTimerTask ? (
              <button 
                onClick={() => setActiveTimerTask(null)}
                className="w-full py-2.5 bg-neutral-900 border border-neutral-700 hover:border-white text-white font-mono text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-colors"
              >
                <StopCircle size={14} /> Terminate Protocol Timer
              </button>
            ) : (
              <button 
                onClick={() => setIsTimerPickerOpen(true)}
                className="w-full py-2.5 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Play size={14} fill="currentColor" /> Select Task & Start
              </button>
            )}
          </div>

          {isTimerPickerOpen && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#0e0f14] border border-neutral-800 w-full max-w-md rounded-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <span className="font-mono text-xs text-white uppercase tracking-wider">Select Task Protocol</span>
                  <button onClick={() => setIsTimerPickerOpen(false)} className="text-neutral-400 hover:text-white"><X size={18} /></button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                  {currentUserTasks.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveTimerTask({ taskName: (t as any).text, projectName: (t as any).projectName, startTime: Date.now() });
                        setIsTimerPickerOpen(false);
                      }}
                      className="w-full text-left p-3 bg-[#14151c] hover:bg-[#1a1b24] border border-neutral-800 rounded-sm transition-colors"
                    >
                      <div className="font-mono text-[9px] text-neutral-400 uppercase">{(t as any).projectName}</div>
                      <div className="text-xs font-semibold text-white mt-0.5">{(t as any).text}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Team Utilization Load */}
        <div className="lg:col-span-2 bg-[#0a0b0e] border border-neutral-800 rounded-sm p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-white" />
              <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.25em]">
                TEAM DEPLOYMENT & LOAD PULSE
              </span>
            </div>
            <span className="px-2 py-0.5 bg-[#14161d] border border-neutral-800 font-mono text-[10px] text-neutral-300">
              {staffList.length} CONNECTED
            </span>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto py-2 custom-scrollbar">
            {teamStats.map(({ staff, load, efficiency }) => (
              <div 
                key={staff.id} 
                onClick={() => setSelectedStaffForWorkload(staff)}
                className="flex flex-col items-center min-w-[76px] p-2 hover:bg-[#12141a] rounded-sm transition-colors cursor-pointer group shrink-0"
              >
                <div className="relative mb-2">
                  <img src={staff.avatarUrl} className="w-11 h-11 rounded-sm object-cover border border-neutral-700 group-hover:border-white transition-colors" alt="" />
                  <div className={`absolute -bottom-1 -right-1 px-1 py-0.2 font-mono text-[8px] font-black ${efficiency > 80 ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-white'}`}>
                    {efficiency}%
                  </div>
                </div>
                <span className="font-mono text-[9px] text-neutral-300 uppercase truncate w-full text-center">
                  {staff.name.split(' ')[0]}
                </span>
                <span className="font-mono text-[8px] text-neutral-400 uppercase">
                  {load} TASKS
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between font-mono text-[10px] text-neutral-400">
            <span>VELOCITY: STABLE</span>
            {canAccessWorkload && onNavigateToWorkload && (
              <button
                type="button"
                onClick={onNavigateToWorkload}
                className="text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
              >
                OPEN WORKLOAD DASHBOARD <ArrowUpRight size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. ACTIVE CAMPAIGN NODES: Precision Dark Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <LayoutGrid size={18} className="text-white" />
            <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-white">
              ACTIVE CAMPAIGN PIPELINES ({activeProjects.length})
            </h3>
          </div>
          {canCreateCampaign && (
            <button 
              onClick={onNewProject}
              className="font-mono text-[10px] text-neutral-400 hover:text-white uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={12} /> ADD CAMPAIGN
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeProjects.map(project => (
            <div 
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="bg-[#0a0b0e] border border-neutral-800 hover:border-neutral-600 p-6 rounded-sm cursor-pointer transition-all group flex flex-col justify-between h-[230px]"
            >
              <div>
                <div className="flex items-center justify-between mb-3 font-mono text-[10px]">
                  <span className="px-2 py-0.5 bg-[#14151c] border border-neutral-800 text-neutral-300">
                    {project.jobNumber}
                  </span>
                  <span className="text-neutral-400 uppercase">
                    STEP {project.currentStep} OF {project.steps.length}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-white uppercase tracking-tight group-hover:text-neutral-200 transition-colors font-heading truncate">
                  {project.projectName}
                </h4>
                <p className="font-mono text-[10px] text-neutral-400 uppercase mt-1">
                  CLIENT: {project.clientName} // TYPE: {project.type}
                </p>
                {project.createdByName && (
                  <div className="font-mono text-[9px] text-neutral-400 uppercase mt-1.5 flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="text-neutral-500">BY:</span>
                    <span className="text-neutral-200 font-semibold truncate">{project.createdByName}</span>
                    {project.createdByRole && <span className="text-neutral-500">({project.createdByRole})</span>}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-neutral-800/80">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-neutral-400">PROGRESS</span>
                  <span className="font-black text-white">{project.progress}%</span>
                </div>
                <div className="w-full bg-[#12141a] h-1.5 rounded-none overflow-hidden">
                  <div 
                    className="bg-white h-full transition-all duration-700" 
                    style={{ width: `${project.progress}%` }} 
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1">
                  <span>DUE: {new Date(project.dueDate).toLocaleDateString([], { month: 'short', day: '2-digit' }).toUpperCase()}</span>
                  <span className="flex items-center gap-1 text-white group-hover:translate-x-0.5 transition-transform">
                    ENTER BRIEF <ArrowUpRight size={12} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. STRATEGIC INTELLIGENCE CONSOLE & EVENT HORIZON */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WizeMind AI Strategist */}
        <div className="lg:col-span-2 bg-[#0a0b0e] border border-neutral-800 rounded-sm flex flex-col h-[500px]">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#0e0f14]">
            <div className="flex items-center gap-3">
              <Bot size={18} className="text-white" />
              <div>
                <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest leading-none">
                  WIZEMIND INTELLIGENCE // AGENT SWARM
                </div>
                <div className="text-xs font-bold text-white uppercase mt-0.5 font-heading">
                  Autonomous Strategic Advisor
                </div>
              </div>
            </div>
            <span className="font-mono text-[9px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {aiChat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 text-xs font-mono leading-relaxed rounded-sm ${
                  msg.role === 'user' 
                    ? 'bg-white text-black font-semibold' 
                    : 'bg-[#12141a] border border-neutral-800 text-neutral-200'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isAiTyping && (
              <div className="flex gap-2 p-3 bg-[#12141a] border border-neutral-800 w-fit rounded-sm font-mono text-[10px] text-neutral-400">
                SYNCHRONIZING REASONING MATRIX...
              </div>
            )}
            <div ref={aiEndRef} />
          </div>

          <form onSubmit={handleAiAsk} className="p-4 border-t border-neutral-800 bg-[#0e0f14] flex gap-2">
            <input 
              value={aiInquiry} 
              onChange={e => setAiInquiry(e.target.value)} 
              placeholder="Query strategic pipeline, client telemetry, or campaign bottlenecks..." 
              className="flex-1 bg-[#14151c] border border-neutral-800 px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-white rounded-sm placeholder:text-neutral-500" 
            />
            <button 
              type="submit" 
              className="px-5 py-2.5 bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {/* Event Horizon */}
        <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-6 flex flex-col justify-between h-[500px]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-white" />
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.25em]">
                  EVENT HORIZON
                </span>
              </div>
              <button 
                onClick={() => setIsNewEventModalOpen(true)}
                className="w-7 h-7 bg-white text-black hover:bg-neutral-200 flex items-center justify-center rounded-sm text-xs font-bold"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[380px] custom-scrollbar pr-1">
              {events.length === 0 ? (
                <div className="text-center py-16 opacity-30 font-mono text-[10px] uppercase">
                  Zero Events Synced
                </div>
              ) : (
                events.slice().sort((a,b) => a.date.getTime() - b.date.getTime()).map(ev => (
                  <div key={ev.id} className="p-3 bg-[#101217] border border-neutral-800/80 rounded-sm flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#161822] border border-neutral-700/60 flex flex-col items-center justify-center shrink-0 rounded-sm font-mono text-white">
                      <span className="text-xs font-bold leading-none">{new Date(ev.date).getDate()}</span>
                      <span className="text-[8px] text-neutral-400 uppercase">{new Date(ev.date).toLocaleDateString([], { month: 'short' })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white uppercase truncate">{ev.title}</div>
                      <div className="font-mono text-[9px] text-neutral-400 uppercase mt-0.5 flex items-center justify-between">
                        <span>{ev.type}</span>
                        <span>{new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800/80 font-mono text-[9px] text-neutral-400 text-center">
            {events.length} CALENDAR NODES SYNCHRONIZED
          </div>
        </div>
      </div>
      </>
      )}

      {/* EVENT MODAL */}
      {isNewEventModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">TEMPORAL LOGIC</div>
                <h3 className="text-lg font-black uppercase text-white font-heading">Deploy Event Node</h3>
              </div>
              <button onClick={() => setIsNewEventModalOpen(false)} className="text-neutral-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleEventSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Event Identification</label>
                <input 
                  required 
                  placeholder="e.g. ALPHA CORP CAMPAIGN REVIEW"
                  value={eventForm.title} 
                  onChange={e => setEventForm({...eventForm, title: e.target.value.toUpperCase()})} 
                  className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Date</label>
                  <input 
                    required 
                    type="date" 
                    value={eventForm.date} 
                    onChange={e => setEventForm({...eventForm, date: e.target.value})} 
                    className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Time</label>
                  <input 
                    required 
                    type="time" 
                    value={eventForm.time} 
                    onChange={e => setEventForm({...eventForm, time: e.target.value})} 
                    className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                  />
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Classification</label>
                <div className="grid grid-cols-3 gap-2">
                  {['meeting', 'deadline', 'personal'].map(type => (
                    <button 
                      key={type} 
                      type="button" 
                      onClick={() => setEventForm({...eventForm, type: type as any})}
                      className={`py-2 rounded-sm font-mono text-[10px] uppercase tracking-wider border transition-all ${
                        eventForm.type === type ? 'bg-white text-black font-black border-white' : 'bg-[#12141a] text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-2">
                <button type="button" onClick={() => setIsNewEventModalOpen(false)} className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm">Sync Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF DETAIL MODAL */}
      {selectedStaffForWorkload && selectedStaffData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <img src={selectedStaffForWorkload.avatarUrl} className="w-12 h-12 rounded-sm object-cover border border-neutral-700" alt="" />
                <div>
                  <h3 className="text-lg font-black uppercase text-white font-heading">{selectedStaffForWorkload.name}</h3>
                  <div className="font-mono text-[10px] text-neutral-400 uppercase">{selectedStaffForWorkload.role} // {selectedStaffForWorkload.department}</div>
                </div>
              </div>
              <button onClick={() => setSelectedStaffForWorkload(null)} className="text-neutral-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
              <div className="grid grid-cols-3 gap-3 font-mono text-center">
                <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm">
                  <div className="text-[10px] text-neutral-400">ACTIVE DIRECTIVES</div>
                  <div className="text-xl font-black text-white mt-1">{selectedStaffData.load}</div>
                </div>
                <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm">
                  <div className="text-[10px] text-neutral-400">EFFICIENCY</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">{selectedStaffData.efficiency}%</div>
                </div>
                <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm">
                  <div className="text-[10px] text-neutral-400">COMPLETED</div>
                  <div className="text-xl font-black text-white mt-1">{selectedStaffData.completedCount}</div>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">Active Job Assignments:</div>
                {selectedStaffData.projectTasks.map((t: any, idx) => (
                  <div key={idx} onClick={() => handleTaskJump(t.projectId)} className="p-3 bg-[#12141a] border border-neutral-800/80 hover:border-white rounded-sm cursor-pointer transition-colors flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[9px] text-neutral-400 uppercase">{t.projectName} ({t.jobNumber})</div>
                      <div className="text-xs font-semibold text-white mt-0.5">{t.text}</div>
                    </div>
                    <ArrowUpRight size={14} className="text-neutral-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MY TASKS MODAL */}
      {isMyTasksOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">SIMULATOR DIRECTIVES</div>
                <h3 className="text-lg font-black uppercase text-white font-heading">My Active Directives</h3>
              </div>
              <button onClick={() => setIsMyTasksOpen(false)} className="text-neutral-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-2.5 custom-scrollbar">
              {currentUserTasks.length === 0 ? (
                <div className="text-center py-16 opacity-30 font-mono text-xs uppercase">All Directives Completed</div>
              ) : (
                currentUserTasks.map((t: any, idx) => (
                  <div key={idx} onClick={() => t.projectId && handleTaskJump(t.projectId)} className="p-4 bg-[#12141a] border border-neutral-800 hover:border-white rounded-sm cursor-pointer transition-colors flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[9px] text-neutral-400 uppercase">{t.projectName} // {t.jobNumber}</div>
                      <div className="text-xs font-semibold text-white mt-0.5">{t.text}</div>
                    </div>
                    <ArrowUpRight size={14} className="text-neutral-400" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
