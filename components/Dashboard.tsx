import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, StaffMember, Todo, CalendarEvent, PaymentUpdate, Role, PettyCashTransaction, ProjectType, Client, Task, LeaveRequest } from '../types';
import { 
  CheckCircle2, Clock, Briefcase, ListTodo, Calendar, ArrowLeft, X, DollarSign, 
  Target, Plus, Zap, Activity, Bot, Users, RefreshCw, AlertCircle, TrendingUp, 
  Search, Send, Timer, Play, Pause, ChevronRight, LayoutGrid, Layers, Hash, 
  StopCircle, Check, Gauge, Award, Eye, ExternalLink, ShieldCheck, ArrowUpRight,
  Mail, ShieldAlert, CheckCircle, ChevronDown, HardDrive, Lock, UserCheck,
  Bell, AlertTriangle, CalendarClock, History, Sparkles, RotateCcw
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
  onUpdateLeave?: (requestId: string, status: 'Approved' | 'Rejected', reviewNote?: string, tier?: 'manager' | 'director' | 'both') => void;
  onNavigateToHR?: () => void;
  onNavigateToWorkload?: () => void;
  onUpdateProject?: (project: Project) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  projects, onSelectProject, onNewProject, currentUser, todos, onToggleTodo, 
  onAddTodo, onUpdatePayment, pettyCash, clientList, staffList, events, 
  onAddEvent, onDeleteEvent, onSendMessage, leaveRequests = [], onUpdateLeave, onNavigateToHR,
  onNavigateToWorkload, onUpdateProject
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
  const [rejectModalLeave, setRejectModalLeave] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  const [aiInquiry, setAiInquiry] = useState('');
  const [aiChat, setAiChat] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: "Strategic Intelligence online. Mediawize positioning matrix synchronized." }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  const [activeTimerTask, setActiveTimerTask] = useState<{
    taskId?: string;
    projectId?: string;
    stepId?: number;
    taskName: string;
    projectName: string;
    startTime: number;
    initialTimeSpent?: number;
  } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerPickerOpen, setIsTimerPickerOpen] = useState(false);

  // Active Directives controls & postponement states
  const [directiveFilter, setDirectiveFilter] = useState<'ALL' | 'TRACKING' | 'CRITICAL' | 'OVERDUE' | 'POSTPONED'>('ALL');
  const [directiveSort, setDirectiveSort] = useState<'DEADLINE' | 'PRIORITY' | 'PROJECT'>('DEADLINE');
  const [postponeModalTask, setPostponeModalTask] = useState<{ task: any; project: Project; stepId: number; projectName: string } | null>(null);
  const [postponeNewDate, setPostponeNewDate] = useState('');
  const [postponeReason, setPostponeReason] = useState('');
  const [postponeError, setPostponeError] = useState<string | null>(null);
  const [priorityDropdownTaskId, setPriorityDropdownTaskId] = useState<string | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'directives' | 'ai'>('directives');

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
  const normDept = (currentUser.department || '').toLowerCase();
  const isSuperAdmin = normRole === 'super admin' || currentUser.role === Role.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || normRole === 'admin' || currentUser.role === Role.ADMIN;
  const isGM = normRole === 'general manager' || normRole === 'gm' || currentUser.role === Role.GM;
  const isDirector = normRole.includes('director') || normDept.includes('director');
  const isHR = normRole === 'hr' || currentUser.role === Role.HR;
  const isAccounts = normRole === 'accounts' || currentUser.role === Role.ACCOUNTS || normDept === 'finance';
  const isAE = normRole === 'account executive' || currentUser.role === Role.AE;
  const isManager = normRole === 'management' || currentUser.role === Role.MANAGEMENT || normRole.includes('lead') || normRole.includes('manager') || normDept.includes('management');

  // Rule: Only admins, GM or finance person have access to finance
  const canViewFinance = isSuperAdmin || isAdmin || isGM || isAccounts || !!currentUser.permissions?.canViewFinance;
  // Rule: Projects should only be visible to admins, managers, AEs and Finance
  const canViewProjects = isSuperAdmin || isAdmin || isGM || isManager || isAE || isAccounts || !!currentUser.permissions?.canViewProjects;

  // Rule: New campaign can be created ONLY by Super Admin and Admin
  const canCreateCampaign = isSuperAdmin || isAdmin;

  // Rule: Hero management buttons (Simulator directives) displayed ONLY for Managers / GM / Directors / Admins / Super Admins
  const canViewManagerButtons = isSuperAdmin || isAdmin || isGM || isDirector || isManager;

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
      return (projects || []).filter(p => {
        const hasDeptStaff = (p.steps || []).some(s => (s.tasks || []).some(t => {
          if (!t.assignedTo) return false;
          const assignedStaff = (staffList || []).find(st => st.id === t.assignedTo);
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
    return projects || [];
  }, [projects, canViewProjects, isSuperAdmin, isAdmin, isGM, isManager, currentUser.permissions, currentUser.department, staffList]);

  const activeProjects = (accessibleProjects || []).filter(p => p.status === 'In Progress');
  const balance = (pettyCash || []).reduce((sum, tx) => sum + (tx.type === 'Income' ? tx.amount : -tx.amount), 0);

  const canApproveLeaves = isSuperAdmin || isAdmin || isGM || isHR || isManager || !!currentUser.permissions?.canApproveLeaves;

  // Rule: When an employee requests for a leave it should show on the HR dashboard and on the relevant manager's dashboard for approvals
  const relevantPendingLeaves = useMemo(() => {
    if (!leaveRequests || !canApproveLeaves) return [];
    return leaveRequests.filter(l => {
      if (l.status !== 'Pending') return false;
      if (isSuperAdmin || isAdmin || isGM || isHR) return true;
      if (isManager || currentUser.permissions?.canApproveLeaves) {
        const staff = (staffList || []).find(s => s.id === l.staffId);
        const staffDept = (staff?.department || l.department || '').toLowerCase();
        const myDept = (currentUser.department || '').toLowerCase();
        return staffDept === myDept;
      }
      return false;
    });
  }, [leaveRequests, canApproveLeaves, isSuperAdmin, isAdmin, isGM, isHR, isManager, staffList, currentUser]);
  
  const teamStats = useMemo(() => (staffList || []).map(staff => {
    const staffTodos = (todos || []).filter(t => t.userId === staff.id);
    const allStaffTasks = (projects || []).flatMap(p => 
      (p.steps || []).flatMap(step => 
        (step.tasks || []).filter(t => t.assignedTo === staff.id)
          .map(task => ({ 
            ...task, 
            projectName: p.projectName, 
            clientName: p.clientName, 
            jobNumber: p.jobNumber,
            projectId: p.id,
            isCompleted: !!(p.tasksCompleted && p.tasksCompleted[task.id])
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
  const selectedStaffData = useMemo(() => teamStats.find(t => t.staff?.id === selectedStaffForWorkload?.id), [teamStats, selectedStaffForWorkload]);

  const formatOverdue = (ms: number) => {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const currentUserTasks = useMemo(() => {
    const now = Date.now();
    return (projects || []).flatMap(p => 
      (p.steps || []).flatMap(s => 
        (s.tasks || []).filter(t => {
          const isAssignedToMe = t.assignedTo === currentUser.id || t.role === currentUser.role || ((isAdmin || isSuperAdmin || isGM) && (t.assignedTo === currentUser.id || !t.assignedTo || t.role === currentUser.role || t.role === Role.MANAGEMENT));
          const isDone = !!(p.tasksCompleted && p.tasksCompleted[t.id]) || !!t.completed;
          return isAssignedToMe && !isDone;
        }).map(t => {
          const effectiveDeadline = t.deadline || s.deadline || p.dueDate;
          const deadlineMs = effectiveDeadline ? new Date(effectiveDeadline).getTime() : null;
          const isOverdue = deadlineMs ? deadlineMs < now : false;
          const isPostponed = !!t.originalDeadline && !!t.deadline && new Date(t.deadline).getTime() !== new Date(t.originalDeadline).getTime();
          const priority = t.priority || (isOverdue ? 'Critical' : 'Medium');

          return {
            ...t,
            projectName: p.projectName,
            projectId: p.id,
            jobNumber: p.jobNumber,
            clientName: p.clientName,
            stepId: s.id,
            stepTitle: s.title,
            effectiveDeadline,
            deadlineMs,
            isOverdue,
            isPostponed,
            priority,
            project: p
          };
        })
      )
    );
  }, [projects, currentUser, isAdmin, isSuperAdmin, isGM]);

  const filteredAndSortedDirectives = useMemo(() => {
    let list = [...currentUserTasks];

    if (directiveFilter === 'TRACKING') {
      list = list.filter(t => activeTimerTask?.taskId === t.id && (!activeTimerTask?.projectId || activeTimerTask?.projectId === t.projectId));
    } else if (directiveFilter === 'CRITICAL') {
      list = list.filter(t => t.priority === 'Critical' || t.priority === 'High');
    } else if (directiveFilter === 'OVERDUE') {
      list = list.filter(t => t.isOverdue);
    } else if (directiveFilter === 'POSTPONED') {
      list = list.filter(t => t.isPostponed);
    }

    if (directiveSort === 'PRIORITY') {
      const weight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      list.sort((a, b) => (weight[b.priority || 'Medium'] || 2) - (weight[a.priority || 'Medium'] || 2));
    } else if (directiveSort === 'DEADLINE') {
      list.sort((a, b) => {
        const da = a.deadlineMs || 9999999999999;
        const db = b.deadlineMs || 9999999999999;
        return da - db;
      });
    } else if (directiveSort === 'PROJECT') {
      list.sort((a, b) => a.projectName.localeCompare(b.projectName));
    }

    return list;
  }, [currentUserTasks, directiveFilter, directiveSort, activeTimerTask]);

  // Overdue directives across projects for Managers and Directors' Escalation Telemetry
  const overdueDirectives = useMemo(() => {
    const isDirectorUser = normRole.includes('director') || normDept.includes('director') || isGM || isSuperAdmin;
    const isManagerUser = isManager || isAdmin || isSuperAdmin;
    if (!isDirectorUser && !isManagerUser) return [];

    const now = Date.now();
    const list: Array<{
      task: Task;
      projectId: string;
      projectName: string;
      jobNumber: string;
      clientName: string;
      stepId: number;
      stepTitle: string;
      staff?: StaffMember;
      effectiveDeadline: Date | string;
      overdueMs: number;
      isPostponed: boolean;
    }> = [];

    (projects || []).forEach(p => {
      if (p.status === 'Completed' || p.status === 'Cancelled') return;
      (p.steps || []).forEach(s => {
        (s.tasks || []).forEach(t => {
          const isDone = !!(p.tasksCompleted && p.tasksCompleted[t.id]) || !!t.completed;
          if (isDone) return;

          const assignedStaff = staffList.find(st => st.id === t.assignedTo);
          const staffDept = (assignedStaff?.department || '').toLowerCase();
          const myDept = (currentUser.department || '').toLowerCase();

          // Division Manager can view their department tasks, Directors/GM/Admins view company-wide
          if (!isDirectorUser && staffDept && myDept && staffDept !== myDept) return;

          const effectiveDeadline = t.deadline || s.deadline || p.dueDate;
          if (!effectiveDeadline) return;

          const deadlineMs = new Date(effectiveDeadline).getTime();
          if (deadlineMs < now) {
            const isPostponed = !!t.originalDeadline && !!t.deadline && new Date(t.deadline).getTime() !== new Date(t.originalDeadline).getTime();
            list.push({
              task: t,
              projectId: p.id,
              projectName: p.projectName,
              jobNumber: p.jobNumber,
              clientName: p.clientName,
              stepId: s.id,
              stepTitle: s.title,
              staff: assignedStaff,
              effectiveDeadline,
              overdueMs: now - deadlineMs,
              isPostponed
            });
          }
        });
      });
    });

    return list.sort((a, b) => b.overdueMs - a.overdueMs);
  }, [projects, staffList, currentUser, normRole, normDept, isGM, isSuperAdmin, isManager, isAdmin]);

  // Task execution & auto tracking handlers
  const handleStartTaskTracking = (t: any) => {
    const now = Date.now();
    setActiveTimerTask({
      taskId: t.id,
      projectId: t.projectId,
      stepId: t.stepId,
      taskName: t.text,
      projectName: t.projectName,
      startTime: now,
      initialTimeSpent: (t.timeSpent || 0) * 60
    });
  };

  const handlePauseTaskTracking = (t: any) => {
    if (!activeTimerTask || activeTimerTask.taskId !== t.id) return;
    const finalSeconds = elapsedTime + (activeTimerTask.initialTimeSpent || 0);
    const minutes = Math.max(1, Math.round(finalSeconds / 60));
    
    const proj = projects.find(p => p.id === t.projectId);
    if (proj && onUpdateProject) {
      const updatedSteps = (proj.steps || []).map(s => {
        if (s.id !== t.stepId) return s;
        return {
          ...s,
          tasks: (s.tasks || []).map(task => {
            if (task.id !== t.id) return task;
            return {
              ...task,
              timeSpent: minutes,
              isTracking: false
            };
          })
        };
      });
      onUpdateProject({ ...proj, steps: updatedSteps, lastUpdated: new Date() });
    }
    setActiveTimerTask(null);
  };

  const handleFinishTask = (t: any) => {
    const proj = projects.find(p => p.id === t.projectId);
    if (!proj || !onUpdateProject) return;

    let minutes = t.timeSpent || 0;
    if (activeTimerTask && activeTimerTask.taskId === t.id) {
      const finalSeconds = elapsedTime + (activeTimerTask.initialTimeSpent || 0);
      minutes = Math.max(1, Math.round(finalSeconds / 60));
      setActiveTimerTask(null);
    }

    const updatedTasksCompleted: Record<string, boolean> = { ...(proj.tasksCompleted || {}), [t.id]: true };
    const allTasksCount = (proj.steps || []).flatMap(s => s.tasks || []).length;
    const completedTasksCount = Object.keys(updatedTasksCompleted).filter(k => updatedTasksCompleted[k]).length;
    const progress = allTasksCount > 0 ? Math.round((completedTasksCount / allTasksCount) * 100) : proj.progress;

    const updatedSteps = (proj.steps || []).map(s => {
      if (s.id !== t.stepId) return s;
      return {
        ...s,
        tasks: (s.tasks || []).map(task => {
          if (task.id !== t.id) return task;
          return {
            ...task,
            completed: true,
            timeSpent: minutes,
            completedAt: new Date().toISOString(),
            isTracking: false
          };
        })
      };
    });

    onUpdateProject({
      ...proj,
      steps: updatedSteps,
      tasksCompleted: updatedTasksCompleted,
      progress,
      lastUpdated: new Date()
    });
  };

  const handleUpdateTaskPriority = (projectId: string, stepId: number, taskId: string, priority: 'Critical' | 'High' | 'Medium' | 'Low') => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj || !onUpdateProject) return;

    const updatedSteps = (proj.steps || []).map(s => {
      if (s.id !== stepId) return s;
      return {
        ...s,
        tasks: (s.tasks || []).map(t => {
          if (t.id !== taskId) return t;
          return { ...t, priority };
        })
      };
    });

    onUpdateProject({ ...proj, steps: updatedSteps, lastUpdated: new Date() });
    setPriorityDropdownTaskId(null);
  };

  const handleConfirmPostpone = () => {
    if (!postponeModalTask || !onUpdateProject) return;
    if (!postponeNewDate) {
      setPostponeError('Please choose a valid revised deadline date and time.');
      return;
    }
    if (!postponeReason.trim()) {
      setPostponeError('A postponement reason is required so managers and directors are notified.');
      return;
    }

    const { project, stepId, task } = postponeModalTask;
    const originalDeadline = task.originalDeadline || task.deadline || task.effectiveDeadline || project.dueDate;

    const updatedSteps = (project.steps || []).map(s => {
      if (s.id !== stepId) return s;
      return {
        ...s,
        tasks: (s.tasks || []).map(t => {
          if (t.id !== task.id) return t;
          return {
            ...t,
            originalDeadline: originalDeadline ? new Date(originalDeadline).toISOString() : new Date().toISOString(),
            deadline: new Date(postponeNewDate).toISOString(),
            postponedReason: postponeReason.trim()
          };
        })
      };
    });

    onUpdateProject({ ...project, steps: updatedSteps, lastUpdated: new Date() });

    if (onSendMessage) {
      onSendMessage(`[DEADLINE RESCHEDULED] Directive "${task.text}" on ${project.projectName} postponed to ${new Date(postponeNewDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} by ${currentUser.name}. Reason: "${postponeReason.trim()}".`, project.channelId || 'ch-1');
    }

    setPostponeModalTask(null);
    setPostponeNewDate('');
    setPostponeReason('');
    setPostponeError(null);
  };

  const handleSendDirectReminder = (staffId: string, taskTitle: string, projectName: string) => {
    if (onSendMessage) {
      const staff = staffList.find(s => s.id === staffId);
      onSendMessage(`🚨 Urgent SLA Alert for @${staff?.name || 'Staff'}: Directive "${taskTitle}" on campaign ${projectName} is PAST SCHEDULED DEADLINE. Please finish or log updated timeline.`, 'ch-1');
    }
  };

  const handleAiAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInquiry.trim()) return;

    const userMsg = aiInquiry;
    setAiInquiry('');
    setAiChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAiTyping(true);

    try {
      const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
      if (!apiKey) {
        setAiChat(prev => [...prev, { role: 'bot', text: "AI link unavailable: Gemini API key is not configured. Add API_KEY to .env to enable." }]);
        setIsAiTyping(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
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
                  const isDirectorUser = isDirector || isGM || isSuperAdmin;
                  const isManagerUser = isManager || isAdmin || isSuperAdmin;

                  return (
                    <div key={leave.id} className="p-4 bg-[#0e0c0a] border border-amber-800/40 rounded-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-heading font-black text-white uppercase text-sm truncate">
                            {leave.staffName}
                          </span>
                          <span className={`px-2 py-0.5 rounded-sm font-mono text-[9px] uppercase border font-bold ${
                            leave.managerApproval?.approved && !leave.directorApproval?.approved
                              ? 'bg-sky-950/80 text-sky-300 border-sky-600/50'
                              : !leave.managerApproval?.approved && leave.directorApproval?.approved
                                ? 'bg-sky-950/80 text-sky-300 border-sky-600/50'
                                : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                          }`}>
                            {leave.managerApproval?.approved && !leave.directorApproval?.approved ? '1/2 (Awaiting Director)' :
                             !leave.managerApproval?.approved && leave.directorApproval?.approved ? '1/2 (Awaiting Manager)' :
                             '0/2 Approvals'}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-neutral-400 space-y-1.5">
                          <div>Division: <strong className="text-neutral-200">{staff?.department || leave.department || 'General'}</strong></div>
                          <div>Duration: <span className="text-white">{new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}</span></div>
                          <div className="text-neutral-300 italic truncate">"{leave.reason}"</div>

                          {/* Workload Coverage Assignee */}
                          {leave.assignedWorkloadToName ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono mt-1 bg-emerald-950/30 border border-emerald-500/20 px-2 py-1 rounded-xs">
                              <UserCheck size={12} className="shrink-0" />
                              <span className="text-neutral-400">Coverage:</span>
                              <strong className="text-white">{leave.assignedWorkloadToName}</strong>
                              <span className="text-neutral-400">({leave.assignedWorkloadToRole || 'Staff'})</span>
                            </div>
                          ) : (
                            <div className="text-[9px] text-amber-400/80 italic font-mono">
                              Workload: Unassigned
                            </div>
                          )}

                          {/* Two-Person Approval Progress */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1 font-mono text-[9px]">
                            <div className={`p-1.5 rounded-xs border flex items-center justify-between ${
                              leave.managerApproval?.approved ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                            }`}>
                              <span>1. Div Mgr:</span>
                              <strong>{leave.managerApproval?.approved ? '✓ Signed' : 'Pending'}</strong>
                            </div>
                            <div className={`p-1.5 rounded-xs border flex items-center justify-between ${
                              leave.directorApproval?.approved ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                            }`}>
                              <span>2. Director:</span>
                              <strong>{leave.directorApproval?.approved ? '✓ Signed' : 'Pending'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {onUpdateLeave && (
                        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-neutral-800">
                          {/* Approve as Division Manager */}
                          {!leave.managerApproval?.approved && isManagerUser && (
                            <button
                              onClick={() => onUpdateLeave(leave.id, 'Approved', `Approved by ${currentUser.name} (Division Manager)`, 'manager')}
                              className="flex-1 min-w-[100px] py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase rounded-sm flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                              title="Sign off as Division Manager (Approval 1 of 2)"
                            >
                              <Check size={12} /> Approve (Manager)
                            </button>
                          )}

                          {/* Approve as Director */}
                          {!leave.directorApproval?.approved && isDirectorUser && (
                            <button
                              onClick={() => onUpdateLeave(leave.id, 'Approved', `Approved by ${currentUser.name} (Director)`, 'director')}
                              className="flex-1 min-w-[100px] py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-mono text-[10px] font-bold uppercase rounded-sm flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                              title="Sign off as Director (Approval 2 of 2)"
                            >
                              <Check size={12} /> Approve (Director)
                            </button>
                          )}

                          {/* Super Admin / GM / Admin dual-approval override */}
                          {(isSuperAdmin || isAdmin || isGM) && !leave.managerApproval?.approved && !leave.directorApproval?.approved && (
                            <button
                              onClick={() => onUpdateLeave(leave.id, 'Approved', `Executive dual-authorization by ${currentUser.name}`, 'both')}
                              className="w-full py-1 bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-emerald-500/30 font-mono text-[9px] font-bold uppercase rounded-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                              title="Authorize Both Division Manager and Director Sign-offs"
                            >
                              <ShieldCheck size={11} /> Authorize Both Sign-offs
                            </button>
                          )}

                          {/* Reject Button - Triggers Mandatory Reason Modal */}
                          <button
                            onClick={() => {
                              setRejectModalLeave(leave);
                              setRejectReason('');
                              setRejectError(null);
                            }}
                            className="flex-1 min-w-[90px] py-1.5 bg-[#201014] hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 font-mono text-[10px] font-bold uppercase rounded-sm flex items-center justify-center gap-1 cursor-pointer transition-all"
                            title="Reject leave request (Mandatory reason required)"
                          >
                            <X size={12} /> Reject (Give Reason)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overdue Directives Escalation Telemetry for Managers & Directors */}
          {overdueDirectives.length > 0 && (
            <div className="bg-[#190c0f] border border-rose-500/50 rounded-sm p-6 relative overflow-hidden animate-in slide-in-from-top-4 duration-300 shadow-[0_0_35px_-5px_rgba(244,63,94,0.2)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-sm animate-pulse">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-rose-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span>ESCALATION TELEMETRY // {isDirector ? 'EXECUTIVE DIRECTORS RADAR' : `${currentUser.department?.toUpperCase()} MANAGEMENT`}</span>
                    </div>
                    <h3 className="font-heading font-black text-lg text-white uppercase tracking-tight">
                      {overdueDirectives.length} UNFINISHED DIRECTIVE{overdueDirectives.length > 1 ? 'S' : ''} PAST SCHEDULED DEADLINE
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase font-bold text-rose-300 bg-rose-950/80 border border-rose-500/40 px-3 py-1.5 rounded-sm">
                    MANAGEMENT INTERVENTION REQUIRED
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {overdueDirectives.map((item, idx) => {
                  return (
                    <div key={`${item.projectId}-${item.stepId}-${item.task.id}-${idx}`} className="p-4 bg-[#0e0a0b] border border-rose-900/60 rounded-sm flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={item.staff?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} className="w-7 h-7 rounded-sm object-cover border border-rose-500/40 shrink-0" alt="" />
                            <div className="min-w-0">
                              <p className="font-heading font-black text-white text-xs uppercase truncate">{item.staff?.name || 'Unassigned Staff'}</p>
                              <p className="font-mono text-[9px] text-neutral-400 uppercase">{item.staff?.role || 'Operator'} // {item.staff?.department || 'Agency'}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-xs bg-rose-950 text-rose-300 border border-rose-500/50 font-mono text-[9px] uppercase font-bold shrink-0">
                            {item.task.priority || 'CRITICAL'}
                          </span>
                        </div>

                        <div className="font-mono text-xs space-y-1.5 pt-1">
                          <div className="text-white font-bold text-xs">{item.task.text}</div>
                          <div className="text-[10px] text-neutral-400 uppercase">
                            Campaign: <strong className="text-neutral-200">{item.projectName}</strong> ({item.jobNumber})
                          </div>

                          <div className="p-2 bg-rose-950/30 border border-rose-500/30 rounded-xs text-[10px] text-rose-300 space-y-0.5">
                            <div><strong>SCHEDULED DEADLINE:</strong> {new Date(item.effectiveDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="text-rose-400 font-bold">
                              OVERDUE BY: {formatOverdue(item.overdueMs)}
                            </div>
                            {item.isPostponed && (
                              <div className="mt-1 pt-1 border-t border-rose-500/20 text-[9px] text-amber-300">
                                POSTPONED // REVISED DUE: {new Date(item.task.deadline!).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} {item.task.postponedReason ? `("${item.task.postponedReason}")` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            const proj = projects.find(p => p.id === item.projectId);
                            if (proj) onSelectProject(proj);
                          }}
                          className="flex-1 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 font-mono text-[10px] font-bold uppercase rounded-sm flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          Inspect Brief <ArrowUpRight size={11} />
                        </button>
                        {item.staff && (
                          <button
                            type="button"
                            onClick={() => handleSendDirectReminder(item.staff!.id, item.task.text, item.projectName)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold uppercase rounded-sm flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            title="Dispatch Urgent Reminder to Assignee"
                          >
                            <Bell size={11} /> Ping Staff
                          </button>
                        )}
                      </div>
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
                  {(staff.name || 'Member').split(' ')[0]}
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
                    STEP {project.currentStep} OF {project.steps?.length || 0}
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
        {/* 01 // MY ACTIVE DIRECTIVES & STRATEGIC CONSOLE */}
        <div className="lg:col-span-2 bg-[#0a0b0e] border border-neutral-800 rounded-sm flex flex-col h-[560px] overflow-hidden">
          {/* Top Command Bar & Tab Navigation */}
          <div className="p-3.5 border-b border-neutral-800 bg-[#0e0f14] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveConsoleTab('directives')}
                className={`px-3 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  activeConsoleTab === 'directives'
                    ? 'bg-white text-black font-black shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <ListTodo size={14} />
                <span>MY ACTIVE DIRECTIVES</span>
                <span className={`px-1.5 py-0.2 rounded-xs font-mono text-[9px] font-black ${
                  activeConsoleTab === 'directives' ? 'bg-black text-white' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {currentUserTasks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveConsoleTab('ai')}
                className={`px-3 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  activeConsoleTab === 'ai'
                    ? 'bg-[var(--jarvis-primary)] text-black font-black shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Bot size={14} />
                <span>WIZEMIND AI STRATEGIST</span>
              </button>
            </div>

            {/* Live Timer Indicator if tracking is active */}
            {activeTimerTask && (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-sm font-mono text-[11px] text-emerald-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold">AUTO-TRACKING:</span>
                <span className="tabular-nums font-black text-white">{formatTime(elapsedTime)}</span>
              </div>
            )}
          </div>

          {activeConsoleTab === 'directives' ? (
            <div className="flex-1 flex flex-col min-h-0 bg-[#0a0b0e]">
              {/* Filter Pills & Sort Controls */}
              <div className="p-3 border-b border-neutral-800/80 bg-[#0d0e13] flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['ALL', 'TRACKING', 'CRITICAL', 'OVERDUE', 'POSTPONED'] as const).map(f => {
                    const count = f === 'ALL' ? currentUserTasks.length
                      : f === 'TRACKING' ? currentUserTasks.filter(t => activeTimerTask?.taskId === t.id && (!activeTimerTask?.projectId || activeTimerTask?.projectId === t.projectId)).length
                      : f === 'CRITICAL' ? currentUserTasks.filter(t => t.priority === 'Critical' || t.priority === 'High').length
                      : f === 'OVERDUE' ? currentUserTasks.filter(t => t.isOverdue).length
                      : currentUserTasks.filter(t => t.isPostponed).length;

                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setDirectiveFilter(f)}
                        className={`px-2.5 py-1 rounded-xs font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                          directiveFilter === f
                            ? 'bg-neutral-200 text-black border-white'
                            : 'bg-[#12141a] text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        <span>{f}</span>
                        <span className={`px-1 py-0.2 rounded-xs text-[9px] ${directiveFilter === f ? 'bg-black text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="text-neutral-400 uppercase">SORT:</span>
                  <div className="flex items-center gap-1 bg-[#12141a] p-0.5 rounded-xs border border-neutral-800">
                    {(['DEADLINE', 'PRIORITY', 'PROJECT'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDirectiveSort(s)}
                        className={`px-2 py-0.5 rounded-xs font-bold uppercase transition-all cursor-pointer ${
                          directiveSort === s ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Directives List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredAndSortedDirectives.length === 0 ? (
                  <div className="text-center py-20 opacity-40 font-mono text-xs uppercase flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                    <span>ALL ACTIVE DIRECTIVES COMPLETED // SYSTEM NOMINAL</span>
                  </div>
                ) : (
                  filteredAndSortedDirectives.map((t, idx) => {
                    const isCurrentlyTracking = activeTimerTask?.taskId === t.id && (!activeTimerTask?.projectId || activeTimerTask?.projectId === t.projectId);
                    const taskKey = `${t.projectId || 'p'}-${t.stepId || 's'}-${t.id}`;
                    const priorityWeights: Record<string, string> = {
                      Critical: 'bg-rose-950 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
                      High: 'bg-amber-950 text-amber-300 border-amber-500/60',
                      Medium: 'bg-sky-950 text-sky-300 border-sky-500/60',
                      Low: 'bg-neutral-900 text-neutral-400 border-neutral-700'
                    };

                    return (
                      <div
                        key={`${taskKey}-${idx}`}
                        style={{ zIndex: priorityDropdownTaskId === taskKey ? 50 : Math.max(1, 40 - idx) }}
                        className={`p-4 rounded-sm border transition-all duration-200 relative ${
                          t.isOverdue 
                            ? 'bg-[#160c0e] border-rose-600/50 shadow-[0_0_15px_-3px_rgba(244,63,94,0.2)]'
                            : t.isPostponed 
                              ? 'bg-[#15110c] border-amber-600/50'
                              : isCurrentlyTracking
                                ? 'bg-[#0c1611] border-emerald-500/60 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]'
                                : 'bg-[#0f1117] border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {/* Header Row: Campaign Node & Priority Dropdown */}
                        <div className="flex items-start justify-between gap-3 mb-2 font-mono">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 bg-[#171922] border border-neutral-700 text-neutral-300 text-[10px] uppercase font-bold">
                              {t.projectName} ({t.jobNumber})
                            </span>
                            <span className="text-[10px] text-neutral-400 uppercase">
                              STEP {t.stepId}: {t.stepTitle}
                            </span>
                          </div>

                          {/* Interactive Priority Selector */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setPriorityDropdownTaskId(priorityDropdownTaskId === taskKey ? null : taskKey)}
                              className={`px-2.5 py-1 rounded-xs font-mono text-[9px] uppercase font-bold tracking-wider border flex items-center gap-1.5 cursor-pointer transition-all ${
                                priorityWeights[t.priority || 'Medium']
                              }`}
                              title="Click to adjust priority"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${t.priority === 'Critical' ? 'bg-rose-400 animate-ping' : t.priority === 'High' ? 'bg-amber-400' : 'bg-sky-400'}`} />
                              <span>{t.priority || 'MEDIUM'}</span>
                              <ChevronDown size={10} />
                            </button>

                            {priorityDropdownTaskId === taskKey && (
                              <div className="absolute right-0 top-full mt-1 w-32 bg-[#12141c] border border-neutral-700 rounded-sm shadow-xl z-50 p-1 space-y-1">
                                {(['Critical', 'High', 'Medium', 'Low'] as const).map(p => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateTaskPriority(t.projectId, t.stepId, t.id, p);
                                      setPriorityDropdownTaskId(null);
                                    }}
                                    className={`w-full text-left px-2 py-1 rounded-xs font-mono text-[10px] uppercase flex items-center justify-between cursor-pointer ${
                                      t.priority === p ? 'bg-white text-black font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                                    }`}
                                  >
                                    <span>{p}</span>
                                    {t.priority === p && <Check size={10} />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Directive Title */}
                        <div className="text-sm font-bold text-white uppercase tracking-tight mb-3">
                          {t.text}
                        </div>

                        {/* Deadline & SLA Status Banner */}
                        <div className="mb-3">
                          {t.isPostponed ? (
                            <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xs font-mono text-xs space-y-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[10px]">
                                  <CalendarClock size={13} /> POSTPONED / RESCHEDULED
                                </span>
                                {t.originalDeadline && (
                                  <span className="line-through text-neutral-500 text-[10px]">
                                    ORIGINAL: {new Date(t.originalDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <div className="text-amber-200 font-bold text-xs">
                                REVISED DEADLINE: {new Date(t.deadline || t.effectiveDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {t.postponedReason && (
                                <div className="text-neutral-300 text-[10px] italic border-t border-amber-500/20 pt-1">
                                  "{t.postponedReason}"
                                </div>
                              )}
                            </div>
                          ) : t.isOverdue ? (
                            <div className="p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-xs font-mono text-xs space-y-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-rose-400 font-bold uppercase text-[10px] animate-pulse">
                                  <AlertCircle size={13} /> OVERDUE BY {t.deadlineMs ? formatOverdue(Date.now() - t.deadlineMs) : 'UNKNOWN'} // SLA BREACH
                                </span>
                                <span className="text-[10px] text-rose-300 font-semibold">
                                  SCHEDULED: {new Date(t.effectiveDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                              <div className="text-[10px] text-rose-300/90 flex items-center gap-1">
                                <ShieldAlert size={11} className="shrink-0" />
                                <span>Escalated to Division Managers & Directors dashboard</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded-xs font-mono text-[11px] text-neutral-300 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-neutral-400" />
                                <span>SCHEDULED DEADLINE:</span>
                                <strong className="text-white">
                                  {new Date(t.effectiveDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </strong>
                              </div>
                              <span className="text-[10px] text-neutral-400 uppercase">On Schedule</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Row: Auto Time-Tracking & Actions */}
                        <div className="pt-2.5 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 font-mono">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-neutral-400 text-[10px] uppercase">TIME LOGGED:</span>
                            <span className="font-bold text-white bg-black/50 px-2 py-0.5 rounded-xs border border-neutral-800">
                              {t.timeSpent || 0}m
                            </span>
                            {isCurrentlyTracking && (
                              <span className="px-2 py-0.5 rounded-xs bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold uppercase flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>RECORDING {formatTime(elapsedTime)}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Start or Pause Live Stopwatch */}
                            {isCurrentlyTracking ? (
                              <button
                                type="button"
                                onClick={() => handlePauseTaskTracking(t)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider rounded-sm flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                                title="Pause auto tracking and log elapsed minutes"
                              >
                                <Pause size={12} fill="currentColor" /> Pause Tracking
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartTaskTracking(t)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider rounded-sm flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                                title="Start live tracking stopwatch for this directive"
                              >
                                <Play size={12} fill="currentColor" /> Start Task / Track Time
                              </button>
                            )}

                            {/* Mark Task Finished */}
                            <button
                              type="button"
                              onClick={() => handleFinishTask(t)}
                              className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black font-black text-[10px] uppercase tracking-wider rounded-sm flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                              title="Finish task, commit tracked time and update campaign progress"
                            >
                              <Check size={12} strokeWidth={3} /> Finish Task
                            </button>

                            {/* Postpone / Reschedule Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setPostponeModalTask({
                                  task: t,
                                  project: t.project,
                                  stepId: t.stepId,
                                  projectName: t.projectName
                                });
                                setPostponeNewDate('');
                                setPostponeReason('');
                                setPostponeError(null);
                              }}
                              className="px-3 py-1.5 bg-[#171922] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 font-bold text-[10px] uppercase tracking-wider rounded-sm flex items-center gap-1.5 cursor-pointer transition-all"
                              title="Reschedule directive with a new revised deadline and reason"
                            >
                              <CalendarClock size={12} /> Postpone
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* WizeMind AI Strategist Chat Pane */
            <div className="flex-1 flex flex-col min-h-0 bg-[#0a0b0e]">
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
                  className="px-5 py-2.5 bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm transition-colors cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}
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
                (events || []).slice().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(ev => (
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
                  <div key={`${t.projectId || 'p'}-${t.id || idx}-${idx}`} onClick={() => handleTaskJump(t.projectId)} className="p-3 bg-[#12141a] border border-neutral-800/80 hover:border-white rounded-sm cursor-pointer transition-colors flex items-center justify-between">
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
                  <div key={`${t.projectId || 'p'}-${t.stepId || 's'}-${t.id || idx}-${idx}`} onClick={() => t.projectId && handleTaskJump(t.projectId)} className="p-4 bg-[#12141a] border border-neutral-800 hover:border-white rounded-sm cursor-pointer transition-colors flex items-center justify-between">
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

      {/* MANDATORY REJECTION REASON MODAL */}
      {rejectModalLeave && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-rose-950/40 border-b border-neutral-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">LEAVE GOVERNANCE AUDIT</div>
                  <h3 className="text-base font-black uppercase text-white font-heading">
                    Decline Leave Request
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { setRejectModalLeave(null); setRejectError(null); }} 
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 font-mono">
              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm text-xs space-y-1">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <ShieldAlert size={12} className="text-rose-400" /> Reviewer Identity
                  </span>
                  <span className="px-1.5 py-0.5 bg-rose-950/80 border border-rose-500/30 text-rose-400 text-[8px] rounded-xs font-bold uppercase tracking-wider">
                    Captured Automatically
                  </span>
                </div>
                <div className="text-white font-bold flex items-center gap-1.5">
                  <span>{currentUser.name}</span>
                  <span className="text-neutral-400 font-normal text-[11px]">({currentUser.role} // {currentUser.department})</span>
                </div>
              </div>

              <div className="text-xs text-neutral-300">
                Declining <strong className="text-white">{rejectModalLeave.type} Leave</strong> requested by <strong className="text-white">{rejectModalLeave.staffName}</strong> ({new Date(rejectModalLeave.startDate).toLocaleDateString()} - {new Date(rejectModalLeave.endDate).toLocaleDateString()}).
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-sm text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-400 shrink-0" />
                <span>A clear operational reason is strictly mandatory so the employee understands why the leave was declined.</span>
              </div>

              <div>
                <label className="block text-[10px] text-rose-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1">
                    <ShieldAlert size={12} /> Rejection Reason * (Mandatory)
                  </span>
                  <span className="text-[9px] text-rose-400 font-semibold uppercase">Required</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specify reason for decline (e.g. Milestone delivery conflict, lack of department coverage, audit period)..."
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-rose-500/60 focus:border-rose-400 text-xs text-white outline-none rounded-sm resize-none"
                  value={rejectReason}
                  onChange={e => { setRejectReason(e.target.value); setRejectError(null); }}
                />
                {rejectError && (
                  <p className="mt-1.5 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle size={12} /> {rejectError}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex items-center justify-end gap-3 font-mono">
              <button
                type="button"
                onClick={() => { setRejectModalLeave(null); setRejectError(null); }}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={() => {
                  if (!rejectReason.trim()) {
                    setRejectError('A reason is strictly mandatory when rejecting a leave request.');
                    return;
                  }
                  if (onUpdateLeave) {
                    onUpdateLeave(rejectModalLeave.id, 'Rejected', rejectReason.trim());
                  }
                  setRejectModalLeave(null);
                  setRejectReason('');
                  setRejectError(null);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <X size={14} strokeWidth={3} /> Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POSTPONE / RESCHEDULE TASK MODAL */}
      {postponeModalTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-amber-600/50 rounded-sm w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-amber-950/40 border-b border-neutral-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <CalendarClock size={18} />
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">DIRECTIVE GOVERNANCE</div>
                  <h3 className="text-base font-black uppercase text-white font-heading">
                    Postpone / Reschedule Directive
                  </h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { setPostponeModalTask(null); setPostponeError(null); }} 
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 font-mono">
              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm text-xs space-y-1">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  Target Directive:
                </div>
                <div className="text-white font-bold">{postponeModalTask.task.text}</div>
                <div className="text-[10px] text-neutral-400">
                  Campaign: <strong className="text-neutral-200">{postponeModalTask.projectName}</strong>
                </div>
                <div className="text-[10px] text-neutral-400 pt-1">
                  Current Due Date: <span className="text-white">{new Date(postponeModalTask.task.deadline || postponeModalTask.task.effectiveDeadline || postponeModalTask.project.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-amber-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1">
                    <Calendar size={12} /> New Revised Deadline *
                  </span>
                  <span className="text-[9px] text-amber-400 font-semibold uppercase">Required</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={postponeNewDate}
                  onChange={e => { setPostponeNewDate(e.target.value); setPostponeError(null); }}
                  className="w-full px-4 py-2 bg-[#12141a] border border-neutral-700 focus:border-amber-400 text-xs text-white outline-none rounded-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] text-amber-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1">
                    <History size={12} /> Postponement Reason * (Mandatory)
                  </span>
                  <span className="text-[9px] text-amber-400 font-semibold uppercase">Mandatory</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specify reason for postponement (e.g. Client asset delay, milestone scope expansion, dependency on proofreading)..."
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-700 focus:border-amber-400 text-xs text-white outline-none rounded-sm resize-none"
                  value={postponeReason}
                  onChange={e => { setPostponeReason(e.target.value); setPostponeError(null); }}
                />
                {postponeError && (
                  <p className="mt-1.5 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle size={12} /> {postponeError}
                  </p>
                )}
              </div>

              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-sm text-[11px] text-amber-300 flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-400 shrink-0" />
                <span>The revised deadline and reason will be broadcast to the project channel and displayed on managerial radars.</span>
              </div>
            </div>

            <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex items-center justify-end gap-3 font-mono">
              <button
                type="button"
                onClick={() => { setPostponeModalTask(null); setPostponeError(null); }}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!postponeNewDate || !postponeReason.trim()}
                onClick={handleConfirmPostpone}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} strokeWidth={3} /> Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
