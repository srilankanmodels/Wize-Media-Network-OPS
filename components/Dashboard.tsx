import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, StaffMember, Todo, CalendarEvent, PaymentUpdate, Role, PettyCashTransaction, ProjectType, Client, Task, LeaveRequest } from '../types';
import { 
  CheckCircle2, Clock, Briefcase, ListTodo, Calendar, ArrowLeft, X, DollarSign, 
  Target, Plus, Zap, Activity, Bot, Users, RefreshCw, AlertCircle, TrendingUp, 
  Search, Send, Timer, Play, Pause, ChevronRight, LayoutGrid, Layers, Hash, 
  StopCircle, Check, Gauge, Award, Eye, ExternalLink, ShieldCheck, ArrowUpRight,
  Mail, ShieldAlert, CheckCircle, ChevronDown, HardDrive, Lock, UserCheck,
  Bell, AlertTriangle, CalendarClock, History, Sparkles, RotateCcw, Trash2
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import GameHub from './GameHub';
import GmailWidget from './GmailWidget';
import MonthlyCalendar from './MonthlyCalendar';
import GoogleDriveWidget from './GoogleDriveWidget';
import { DailyReportWidget } from './DailyReportWidget';
import { 
  getLatestDailyReport, 
  getStoredDailyReportConfig, 
  compileDailyReportData, 
  dispatchDailyReport,
  formatHrsMM,
  checkAndDispatchOverdueEscalations
} from '../utils/emailDispatcher';
import { DailyCompiledReport, DailyReportConfig } from '../types';

interface DashboardProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
  currentUser: StaffMember;
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (text: string, due?: Date, taggedStaffIds?: string[], isDaily?: boolean) => void;
  onUpdateTodo?: (todo: Todo) => void;
  onDeleteTodo?: (id: string) => void;
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onUpdateEvent?: (event: CalendarEvent) => void;
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
  onOpenDailyReportSettings?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  projects, onSelectProject, onNewProject, currentUser, todos, onToggleTodo, 
  onAddTodo, onUpdateTodo, onDeleteTodo, onUpdatePayment, pettyCash, clientList, staffList, events, 
  onAddEvent, onUpdateEvent, onDeleteEvent, onSendMessage, leaveRequests = [], onUpdateLeave, onNavigateToHR,
  onNavigateToWorkload, onUpdateProject, onOpenDailyReportSettings
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

  // Active Directives & To-Do List controls & postponement states
  const [directiveFilter, setDirectiveFilter] = useState<'DAILY' | 'COMPLETED' | 'ALL' | 'CRITICAL' | 'OVERDUE' | 'PERSONAL' | 'TRACKING' | 'POSTPONED'>('DAILY');
  const [directiveSort, setDirectiveSort] = useState<'DEADLINE' | 'PRIORITY' | 'PROJECT'>('DEADLINE');
  const [newQuickTodo, setNewQuickTodo] = useState('');
  const [quickTodoDeadline, setQuickTodoDeadline] = useState('');
  const [isDeadlineDropdownOpen, setIsDeadlineDropdownOpen] = useState(false);
  const deadlineDropdownRef = useRef<HTMLDivElement>(null);
  const [editingDeadlineTodo, setEditingDeadlineTodo] = useState<Todo | null>(null);
  const [editTodoDeadlineValue, setEditTodoDeadlineValue] = useState('');
  const [selectedTaggedStaffIds, setSelectedTaggedStaffIds] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isDailyQuickTask, setIsDailyQuickTask] = useState(true);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [postponeModalTask, setPostponeModalTask] = useState<{ task: any; project: Project; stepId: number; projectName: string } | null>(null);
  const [postponeNewDate, setPostponeNewDate] = useState('');
  const [postponeReason, setPostponeReason] = useState('');
  const [postponeError, setPostponeError] = useState<string | null>(null);
  const [priorityDropdownTaskId, setPriorityDropdownTaskId] = useState<string | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'directives' | 'ai'>('directives');

  // Quick Deadline Presets helper
  const getQuickDeadlinePreset = (type: 'today_eod' | 'tonight' | 'tomorrow_noon' | 'tomorrow_eod' | 'in_3_days' | 'end_of_week') => {
    const d = new Date();
    if (type === 'today_eod') {
      d.setHours(18, 0, 0, 0);
    } else if (type === 'tonight') {
      d.setHours(21, 0, 0, 0);
    } else if (type === 'tomorrow_noon') {
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
    } else if (type === 'tomorrow_eod') {
      d.setDate(d.getDate() + 1);
      d.setHours(18, 0, 0, 0);
    } else if (type === 'in_3_days') {
      d.setDate(d.getDate() + 3);
      d.setHours(18, 0, 0, 0);
    } else if (type === 'end_of_week') {
      const currentDay = d.getDay();
      const daysUntilFriday = (5 - currentDay + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntilFriday);
      d.setHours(18, 0, 0, 0);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Daily EOD Report state
  const [dailyReportConfig, setDailyReportConfig] = useState<DailyReportConfig>(() => getStoredDailyReportConfig());
  const [dailyReport, setDailyReport] = useState<DailyCompiledReport | null>(() => {
    return getLatestDailyReport() || compileDailyReportData({ projects, todos, staffList });
  });
  const [isDispatchingReport, setIsDispatchingReport] = useState(false);

  // Sync daily report when projects, todos, or staff change
  useEffect(() => {
    const latest = getLatestDailyReport();
    if (latest && latest.reportDate === new Date().toISOString().split('T')[0]) {
      setDailyReport(latest);
    } else {
      setDailyReport(compileDailyReportData({ projects, todos, staffList }));
    }
    setDailyReportConfig(getStoredDailyReportConfig());
  }, [projects, todos, staffList]);

  const handleManualDispatchReport = async () => {
    setIsDispatchingReport(true);
    try {
      const res = await dispatchDailyReport({
        config: dailyReportConfig,
        projects,
        todos,
        staffList,
        triggeredBy: currentUser.name
      });
      setDailyReport(res.report);
      setDailyReportConfig(getStoredDailyReportConfig());
    } catch (err) {
      console.error('Error dispatching daily report from dashboard:', err);
    } finally {
      setIsDispatchingReport(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setIsTagDropdownOpen(false);
      }
      if (deadlineDropdownRef.current && !deadlineDropdownRef.current.contains(e.target as Node)) {
        setIsDeadlineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      (p.steps || []).flatMap(step => {
        const stepTasks = [...(step.tasks || []), ...(step.subSteps?.flatMap(ss => ss.tasks) || [])];
        return stepTasks.filter(t => t.assignedTo === staff.id)
          .map(task => ({ 
            ...task, 
            projectName: p.projectName, 
            clientName: p.clientName, 
            jobNumber: p.jobNumber,
            projectId: p.id,
            isCompleted: !!(p.tasksCompleted && p.tasksCompleted[task.id]) || !!task.completed
          }));
      })
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
      (p.steps || []).flatMap(s => {
        // Traverse both step tasks and sub-step tasks
        const allStepTasks = [...(s.tasks || []), ...(s.subSteps?.flatMap(ss => ss.tasks) || [])];
        return allStepTasks.filter(t => {
          // Rule: Any task assigned to a person must reflect in that relevant person's task list
          // If assigned directly: only the assignee sees it in their assigned directives
          // If unassigned: role specialists and leadership see it in the unassigned queue
          const isAssignedToMe = t.assignedTo 
            ? t.assignedTo === currentUser.id 
            : (t.role === currentUser.role || ((isAdmin || isSuperAdmin || isGM) && (t.role === currentUser.role || t.role === Role.MANAGEMENT)));

          const isDone = !!(p.tasksCompleted && p.tasksCompleted[t.id]) || !!t.completed;
          return isAssignedToMe && !isDone;
        }).map(t => {
          // Task's own deadline takes highest precedence, followed by step deadline and project due date
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
        });
      })
    );
  }, [projects, currentUser, isAdmin, isSuperAdmin, isGM]);

  const isDueTodayOrOverdue = (dateVal?: Date | string) => {
    if (!dateVal) return true;
    const d = new Date(dateVal);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return d.getTime() <= todayEnd.getTime();
  };

  const myPersonalTodos = useMemo(() => {
    return (todos || []).filter(t => 
      t.userId === currentUser.id || 
      t.createdById === currentUser.id ||
      t.assignedTo === currentUser.id ||
      (t.taggedStaffIds && t.taggedStaffIds.includes(currentUser.id))
    );
  }, [todos, currentUser.id]);

  const dailyPersonalTodos = useMemo(() => {
    return myPersonalTodos.filter(t => t.isDaily !== false || isDueTodayOrOverdue(t.deadline));
  }, [myPersonalTodos]);

  // Dedicated Completed Tasks List (for COMPLETED tab next to DAILY tab)
  const allCompletedItems = useMemo(() => {
    const items: {
      id: string;
      text: string;
      completed: boolean;
      deadline?: Date | string;
      completedAt?: Date | string;
      projectName?: string;
      projectJobNumber?: string;
      projectId?: string;
      stepId?: number;
      stepTitle?: string;
      isProjectTask?: boolean;
      taskId?: string;
      sourceTodoId?: string;
      isDaily?: boolean;
      createdByName?: string;
      createdById?: string;
    }[] = [];

    const seenTaskKeys = new Set<string>();

    // 1. From personal and assigned todos that are completed
    (myPersonalTodos || []).filter(t => t.completed).forEach(t => {
      const taskKey = t.projectId && t.taskId ? `${t.projectId}-${t.taskId}` : t.id;
      seenTaskKeys.add(taskKey);
      items.push({
        id: t.id,
        text: t.text,
        completed: true,
        deadline: t.deadline,
        projectName: t.projectName,
        projectJobNumber: t.projectJobNumber,
        projectId: t.projectId,
        stepId: t.stepId,
        isProjectTask: !!t.projectId,
        taskId: t.taskId,
        sourceTodoId: t.id,
        isDaily: t.isDaily,
        createdByName: t.createdByName,
        createdById: t.createdById
      });
    });

    // 2. From project step tasks assigned to currentUser that were marked complete
    (projects || []).forEach(p => {
      (p.steps || []).forEach(s => {
        const allStepTasks = [...(s.tasks || []), ...(s.subSteps?.flatMap(ss => ss.tasks) || [])];
        allStepTasks.forEach(t => {
          const isAssignedToMe = t.assignedTo 
            ? t.assignedTo === currentUser.id 
            : (t.role === currentUser.role);
          const isDone = !!(p.tasksCompleted && p.tasksCompleted[t.id]) || !!t.completed;
          const taskKey = `${p.id}-${t.id}`;
          if (isAssignedToMe && isDone && !seenTaskKeys.has(taskKey)) {
            seenTaskKeys.add(taskKey);
            items.push({
              id: `completed-${p.id}-${t.id}`,
              text: `[${p.jobNumber || p.projectName}] ${t.text}`,
              completed: true,
              deadline: t.deadline || s.deadline || p.dueDate,
              completedAt: t.completedAt,
              projectName: p.projectName,
              projectJobNumber: p.jobNumber,
              projectId: p.id,
              stepId: s.id,
              stepTitle: s.title,
              isProjectTask: true,
              taskId: t.id
            });
          }
        });
      });
    });

    return items;
  }, [myPersonalTodos, projects, currentUser]);

  const dailyDirectivesCount = useMemo(() => {
    return currentUserTasks.filter(t => t.isOverdue || t.priority === 'Critical' || isDueTodayOrOverdue(t.effectiveDeadline)).length;
  }, [currentUserTasks]);

  const totalDailyPendingCount = dailyPersonalTodos.filter(t => !t.completed).length + dailyDirectivesCount;

  const totalMyPendingCount = currentUserTasks.length + myPersonalTodos.filter(t => !t.completed).length;

  const handleToggleTagStaff = (staffId: string) => {
    setSelectedTaggedStaffIds(prev => 
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const handleAddQuickTodo = () => {
    if (!newQuickTodo.trim()) return;
    const due = quickTodoDeadline ? new Date(quickTodoDeadline) : undefined;
    onAddTodo(newQuickTodo.trim(), due, selectedTaggedStaffIds, isDailyQuickTask);
    setNewQuickTodo('');
    setQuickTodoDeadline('');
    setSelectedTaggedStaffIds([]);
    setIsTagDropdownOpen(false);
    setIsDeadlineDropdownOpen(false);
  };

  const filteredAndSortedDirectives = useMemo(() => {
    let list = [...currentUserTasks];

    if (directiveFilter === 'DAILY') {
      list = list.filter(t => t.isOverdue || t.priority === 'Critical' || isDueTodayOrOverdue(t.effectiveDeadline));
    } else if (directiveFilter === 'COMPLETED') {
      return [];
    } else if (directiveFilter === 'TRACKING') {
      list = list.filter(t => activeTimerTask?.taskId === t.id && (!activeTimerTask?.projectId || activeTimerTask?.projectId === t.projectId));
    } else if (directiveFilter === 'CRITICAL') {
      list = list.filter(t => t.priority === 'Critical' || t.priority === 'High');
    } else if (directiveFilter === 'OVERDUE') {
      list = list.filter(t => t.isOverdue);
    } else if (directiveFilter === 'POSTPONED') {
      list = list.filter(t => t.isPostponed);
    } else if (directiveFilter === 'PERSONAL') {
      return [];
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

  const handleReopenTask = (item: {
    id: string;
    sourceTodoId?: string;
    projectId?: string;
    stepId?: number;
    taskId?: string;
    isProjectTask?: boolean;
  }) => {
    // 1. If it's linked to a personal or assigned todo, toggle it back
    if (item.sourceTodoId && onToggleTodo) {
      onToggleTodo(item.sourceTodoId);
    }
    // 2. If it's a project step task, reopen it in the project
    if (item.isProjectTask && item.projectId && item.taskId && onUpdateProject) {
      const proj = projects.find(p => p.id === item.projectId);
      if (proj) {
        const updatedTasksCompleted: Record<string, boolean> = { ...(proj.tasksCompleted || {}) };
        delete updatedTasksCompleted[item.taskId];
        const allTasksCount = (proj.steps || []).flatMap(s => s.tasks || []).length;
        const completedTasksCount = Object.keys(updatedTasksCompleted).filter(k => updatedTasksCompleted[k]).length;
        const progress = allTasksCount > 0 ? Math.round((completedTasksCount / allTasksCount) * 100) : proj.progress;

        const updatedSteps = (proj.steps || []).map(s => {
          if (item.stepId && s.id !== item.stepId) return s;
          return {
            ...s,
            tasks: (s.tasks || []).map(task => {
              if (task.id !== item.taskId) return task;
              return {
                ...task,
                completed: false,
                completedAt: undefined
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
      }
    }
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
          onUpdateEvent={onUpdateEvent}
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

          {/* TOP PRIORITY // HIGHLIGHTED: MY TO DO LIST & EVENT HORIZON */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-3 duration-300">
            {/* 01 // HIGHLIGHTED: MY TO DO LIST */}
            <div className="lg:col-span-2 bg-[#090a0f] border-2 border-[var(--jarvis-primary)] rounded-sm flex flex-col h-[620px] overflow-hidden shadow-[0_0_35px_-5px_rgba(var(--jarvis-primary-rgb),0.35)] relative">
              {/* Top Command Bar & Tab Navigation */}
              <div className="p-3.5 border-b border-[var(--jarvis-border)] bg-gradient-to-r from-[rgba(var(--jarvis-primary-rgb),0.18)] via-[#0d0e14] to-[#0d0e14] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveConsoleTab('directives')}
                    className={`px-4 py-2 rounded-sm font-mono text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeConsoleTab === 'directives'
                        ? 'bg-[var(--jarvis-primary)] text-black font-black shadow-[0_0_15px_rgba(var(--jarvis-primary-rgb),0.5)]'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                    }`}
                  >
                    <ListTodo size={16} strokeWidth={2.5} />
                    <span className="font-heading font-black tracking-tight text-sm">MY TO DO LIST</span>
                    <span className={`px-2 py-0.5 rounded-xs font-mono text-[10px] font-black ${
                      activeConsoleTab === 'directives' ? 'bg-black text-[var(--jarvis-primary)]' : 'bg-neutral-800 text-neutral-300'
                    }`}>
                      {totalMyPendingCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveConsoleTab('ai')}
                    className={`px-3 py-2 rounded-sm font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      activeConsoleTab === 'ai'
                        ? 'bg-white text-black font-black shadow-sm'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                    }`}
                  >
                    <Bot size={14} />
                    <span>WIZEMIND AI STRATEGIST</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {activeTimerTask && (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/50 rounded-sm font-mono text-[11px] text-emerald-300 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold">AUTO-TRACKING:</span>
                      <span className="tabular-nums font-black text-white">{formatTime(elapsedTime)}</span>
                    </div>
                  )}
                  <span className="px-2.5 py-1 bg-[rgba(var(--jarvis-primary-rgb),0.15)] border border-[var(--jarvis-primary)]/50 rounded-xs font-mono text-[9px] text-[var(--jarvis-primary)] uppercase tracking-widest font-black flex items-center gap-1.5 shadow-[0_0_10px_rgba(var(--jarvis-primary-rgb),0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-pulse" />
                    PRIMARY FOCUS
                  </span>
                </div>
              </div>

              {activeConsoleTab === 'directives' ? (
                <div className="flex-1 flex flex-col min-h-0 bg-[#0a0b0e]">
                  {/* Quick Add To-Do Item Bar with Staff Tagging & Daily Switch */}
                  <div className="p-3.5 bg-[#0b0c11] border-b border-neutral-800/80 space-y-2.5 relative">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-6 h-6 rounded-xs bg-[var(--jarvis-primary)]/10 border border-[var(--jarvis-primary)]/30 flex items-center justify-center text-[var(--jarvis-primary)] shrink-0">
                        <Plus size={13} strokeWidth={2.5} />
                      </div>

                      <input
                        type="text"
                        value={newQuickTodo}
                        onChange={e => setNewQuickTodo(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddQuickTodo();
                          }
                        }}
                        placeholder="Quick-add task to MY TO DO LIST (press Enter)..."
                        className="flex-1 min-w-[200px] bg-transparent text-xs font-mono text-white placeholder:text-neutral-500 outline-none"
                      />

                      {/* Daily Task Switch */}
                      <button
                        type="button"
                        onClick={() => setIsDailyQuickTask(!isDailyQuickTask)}
                        className={`px-2.5 py-1.5 rounded-xs font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isDailyQuickTask
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                            : 'bg-[#12141a] text-neutral-500 border-neutral-800 hover:text-neutral-300'
                        }`}
                        title="Include in DAILY tab (default: ON)"
                      >
                        <Clock size={11} />
                        <span>{isDailyQuickTask ? 'Daily: YES' : 'Daily: NO'}</span>
                      </button>

                      {/* Tag Staff Button & Popover */}
                      <div className="relative" ref={tagDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                          className={`px-2.5 py-1.5 rounded-xs font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                            selectedTaggedStaffIds.length > 0
                              ? 'bg-[var(--jarvis-primary)] text-black font-black border-[var(--jarvis-primary)] shadow-[0_0_12px_rgba(var(--jarvis-primary-rgb),0.35)]'
                              : 'bg-[#12141a] text-neutral-300 border-neutral-700 hover:border-neutral-500'
                          }`}
                          title="Tag staff members to assign or share this task"
                        >
                          <Users size={12} />
                          <span>{selectedTaggedStaffIds.length > 0 ? `@ Tagged (${selectedTaggedStaffIds.length})` : '@ Tag People'}</span>
                          <ChevronDown size={11} className={isTagDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </button>

                        {/* Staff Tagging Dropdown Popover */}
                        {isTagDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-72 bg-[#101218] border border-neutral-700 rounded-sm shadow-2xl z-[120] p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800 px-1 font-mono">
                              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                                Tag Team Members
                              </span>
                              {selectedTaggedStaffIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedTaggedStaffIds([])}
                                  className="text-[9px] text-rose-400 hover:underline uppercase cursor-pointer"
                                >
                                  Clear ({selectedTaggedStaffIds.length})
                                </button>
                              )}
                            </div>

                            <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                              {staffList.map(s => {
                                const isSelected = selectedTaggedStaffIds.includes(s.id);
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => handleToggleTagStaff(s.id)}
                                    className={`w-full text-left p-2 rounded-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                      isSelected 
                                        ? 'bg-[rgba(var(--jarvis-primary-rgb),0.15)] border border-[var(--jarvis-primary)]/50 text-white' 
                                        : 'hover:bg-neutral-800/70 border border-transparent text-neutral-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <img 
                                        src={s.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'} 
                                        alt="" 
                                        className="w-5 h-5 rounded-full object-cover border border-neutral-700 shrink-0" 
                                      />
                                      <div className="min-w-0 truncate">
                                        <div className="font-heading font-black text-xs uppercase leading-tight truncate">
                                          {s.name} {s.id === currentUser.id && '(You)'}
                                        </div>
                                        <div className="font-mono text-[9px] text-neutral-400 uppercase truncate">
                                          {s.role} // {s.department}
                                        </div>
                                      </div>
                                    </div>
                                    <div className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 ${
                                      isSelected 
                                        ? 'bg-[var(--jarvis-primary)] border-[var(--jarvis-primary)] text-black' 
                                        : 'border-neutral-700 text-transparent'
                                    }`}>
                                      <Check size={10} strokeWidth={3} />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Deadline Selector Button & Popover */}
                      <div className="relative" ref={deadlineDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsDeadlineDropdownOpen(!isDeadlineDropdownOpen)}
                          className={`px-2.5 py-1.5 rounded-xs font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                            quickTodoDeadline
                              ? 'bg-amber-400/20 text-amber-300 border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                              : 'bg-[#12141a] text-neutral-300 border-neutral-700 hover:border-neutral-500'
                          }`}
                          title="Set task deadline"
                        >
                          <CalendarClock size={12} className={quickTodoDeadline ? "text-amber-400" : "text-neutral-400"} />
                          <span>
                            {quickTodoDeadline 
                              ? `Due: ${new Date(quickTodoDeadline).toLocaleDateString([], { month: 'short', day: 'numeric' })} ${new Date(quickTodoDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'Set Deadline'}
                          </span>
                          {quickTodoDeadline ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickTodoDeadline('');
                              }}
                              className="text-neutral-400 hover:text-rose-400 p-0.5 rounded-xs cursor-pointer ml-0.5"
                              title="Clear deadline"
                            >
                              <X size={10} />
                            </span>
                          ) : (
                            <ChevronDown size={11} className={isDeadlineDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                          )}
                        </button>

                        {/* Deadline Dropdown Popover */}
                        {isDeadlineDropdownOpen && (
                          <div className="absolute right-0 top-full mt-2 w-72 bg-[#101218] border border-neutral-700 rounded-sm shadow-2xl z-[130] p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150 font-mono text-white">
                            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                <CalendarClock size={13} />
                                Set Task Deadline
                              </span>
                              {quickTodoDeadline && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickTodoDeadline('');
                                    setIsDeadlineDropdownOpen(false);
                                  }}
                                  className="text-[9px] text-rose-400 hover:underline uppercase cursor-pointer"
                                >
                                  Clear
                                </button>
                              )}
                            </div>

                            {/* Preset Buttons */}
                            <div className="space-y-1">
                              <div className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1">
                                Quick Presets:
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickTodoDeadline(getQuickDeadlinePreset('today_eod'));
                                    setIsDeadlineDropdownOpen(false);
                                  }}
                                  className="p-1.5 bg-[#171922] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xs text-[10px] text-left transition-colors cursor-pointer"
                                >
                                  Today 18:00 (EOD)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickTodoDeadline(getQuickDeadlinePreset('tonight'));
                                    setIsDeadlineDropdownOpen(false);
                                  }}
                                  className="p-1.5 bg-[#171922] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xs text-[10px] text-left transition-colors cursor-pointer"
                                >
                                  Tonight 21:00
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickTodoDeadline(getQuickDeadlinePreset('tomorrow_eod'));
                                    setIsDeadlineDropdownOpen(false);
                                  }}
                                  className="p-1.5 bg-[#171922] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xs text-[10px] text-left transition-colors cursor-pointer"
                                >
                                  Tomorrow 18:00
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickTodoDeadline(getQuickDeadlinePreset('in_3_days'));
                                    setIsDeadlineDropdownOpen(false);
                                  }}
                                  className="p-1.5 bg-[#171922] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xs text-[10px] text-left transition-colors cursor-pointer"
                                >
                                  In 3 Days (18:00)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickTodoDeadline(getQuickDeadlinePreset('end_of_week'));
                                    setIsDeadlineDropdownOpen(false);
                                  }}
                                  className="col-span-2 p-1.5 bg-[#171922] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xs text-[10px] text-left transition-colors cursor-pointer text-amber-300"
                                >
                                  End of Week (Friday 18:00)
                                </button>
                              </div>
                            </div>

                            {/* Custom Date & Time Picker */}
                            <div className="pt-2 border-t border-neutral-800 space-y-1.5">
                              <label className="block text-[9px] text-neutral-400 uppercase tracking-wider">
                                Custom Target Date & Time:
                              </label>
                              <input
                                type="datetime-local"
                                value={quickTodoDeadline}
                                onChange={(e) => setQuickTodoDeadline(e.target.value)}
                                className="w-full bg-[#181a24] border border-neutral-700 focus:border-amber-400 px-2.5 py-1.5 text-xs text-white rounded-xs outline-none cursor-pointer [color-scheme:dark]"
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-1 border-t border-neutral-800">
                              <button
                                type="button"
                                onClick={() => setIsDeadlineDropdownOpen(false)}
                                className="px-2.5 py-1 text-[10px] text-neutral-400 hover:text-white uppercase cursor-pointer"
                              >
                                Close
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsDeadlineDropdownOpen(false)}
                                className="px-3 py-1 bg-white hover:bg-neutral-200 text-black font-black text-[10px] uppercase rounded-xs transition-colors cursor-pointer"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        disabled={!newQuickTodo.trim()}
                        onClick={handleAddQuickTodo}
                        className="px-3.5 py-1.5 bg-[var(--jarvis-primary)] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed text-black font-mono font-black text-[10px] uppercase rounded-xs transition-all cursor-pointer shrink-0 shadow-sm"
                      >
                        + Add Task
                      </button>
                    </div>

                    {/* Active Tags and Deadline Chips row */}
                    {(selectedTaggedStaffIds.length > 0 || quickTodoDeadline) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-neutral-800/60 font-mono text-[10px]">
                        {quickTodoDeadline && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[10px]">
                            <CalendarClock size={11} className="text-amber-400" />
                            <span>Due: <strong className="text-white">{new Date(quickTodoDeadline).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(quickTodoDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                            <button
                              type="button"
                              onClick={() => setQuickTodoDeadline('')}
                              className="text-neutral-400 hover:text-rose-400 cursor-pointer ml-0.5"
                              title="Clear deadline"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        )}

                        {selectedTaggedStaffIds.length > 0 && (
                          <>
                            <span className="text-neutral-400 text-[9px] uppercase">Tagged:</span>
                            {selectedTaggedStaffIds.map(staffId => {
                              const staff = staffList.find(s => s.id === staffId);
                              return (
                                <span 
                                  key={staffId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-black/60 border border-[var(--jarvis-border)] text-white text-[10px]"
                                >
                                  <span className="text-[var(--jarvis-primary)] font-bold">@{staff?.name?.split(' ')[0] || 'Staff'}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTagStaff(staffId)}
                                    className="text-neutral-400 hover:text-rose-400 cursor-pointer ml-0.5"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Filter Pills & Sort Controls */}
                  <div className="p-3 border-b border-neutral-800/80 bg-[#0d0e13] flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(['DAILY', 'COMPLETED', 'ALL', 'CRITICAL', 'OVERDUE', 'PERSONAL', 'TRACKING', 'POSTPONED'] as const).map(f => {
                        const count = f === 'DAILY' ? totalDailyPendingCount
                          : f === 'COMPLETED' ? allCompletedItems.length
                          : f === 'ALL' ? totalMyPendingCount
                          : f === 'TRACKING' ? currentUserTasks.filter(t => activeTimerTask?.taskId === t.id && (!activeTimerTask?.projectId || activeTimerTask?.projectId === t.projectId)).length
                          : f === 'CRITICAL' ? currentUserTasks.filter(t => t.priority === 'Critical' || t.priority === 'High').length
                          : f === 'OVERDUE' ? currentUserTasks.filter(t => t.isOverdue).length
                          : f === 'PERSONAL' ? myPersonalTodos.filter(t => !t.completed).length
                          : currentUserTasks.filter(t => t.isPostponed).length;

                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setDirectiveFilter(f)}
                            className={`px-2.5 py-1 rounded-xs font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                              directiveFilter === f
                                ? f === 'COMPLETED'
                                  ? 'bg-emerald-400 text-black border-emerald-400 shadow-sm font-black'
                                  : 'bg-white text-black border-white shadow-sm'
                                : 'bg-[#12141a] text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                            }`}
                          >
                            {f === 'DAILY' && <Clock size={11} className={directiveFilter === 'DAILY' ? 'text-black' : 'text-amber-400'} />}
                            {f === 'COMPLETED' && <CheckCircle2 size={11} className={directiveFilter === 'COMPLETED' ? 'text-black' : 'text-emerald-400'} />}
                            <span>{f}</span>
                            <span className={`px-1 py-0.2 rounded-xs text-[9px] ${
                              directiveFilter === f 
                                ? 'bg-black text-white font-bold' 
                                : f === 'COMPLETED' 
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-neutral-800 text-neutral-400'
                            }`}>
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

                  {/* Directives & To-Dos List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {/* Dedicated Completed Tasks Tab View */}
                    {directiveFilter === 'COMPLETED' && (
                      <div className="space-y-2 mb-3">
                        <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest flex items-center justify-between px-1 mb-2">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span>COMPLETED DELIVERABLES & FINISHED DIRECTIVES ({allCompletedItems.length})</span>
                          </span>
                          <span className="text-neutral-500 text-[9px]">Click checkbox or reopen to restore task</span>
                        </div>

                        {allCompletedItems.length === 0 ? (
                          <div className="text-center py-20 opacity-50 font-mono text-xs uppercase flex flex-col items-center justify-center gap-2">
                            <CheckCircle2 size={32} className="text-emerald-500/50" />
                            <span>NO COMPLETED TASKS YET // FINISH DIRECTIVES TO ARCHIVE HERE</span>
                          </div>
                        ) : (
                          allCompletedItems.map((item, idx) => {
                            const projectObj = item.projectId ? projects.find(p => p.id === item.projectId) : undefined;
                            return (
                              <div
                                key={item.id || idx}
                                className="p-3.5 rounded-sm border bg-[#0b100d]/70 border-emerald-950/80 hover:border-emerald-700/50 transition-all flex flex-col gap-2 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => handleReopenTask(item)}
                                      className="w-5 h-5 mt-0.5 rounded-xs border border-emerald-500 bg-emerald-500 text-black flex items-center justify-center transition-all cursor-pointer shrink-0 hover:bg-emerald-400 hover:border-emerald-400"
                                      title="Click to uncheck and reopen task"
                                    >
                                      <Check size={13} strokeWidth={3} />
                                    </button>
                                    <div className="min-w-0">
                                      {(item.projectJobNumber || item.projectName) && (
                                        <div className="flex flex-wrap items-center gap-1.5 mb-1 font-mono text-[9px]">
                                          {item.projectJobNumber && (
                                            <button
                                              type="button"
                                              onClick={() => projectObj && onSelectProject && onSelectProject(projectObj)}
                                              className="px-1.5 py-0.2 bg-[#121d17] border border-emerald-800/60 text-emerald-300 font-bold uppercase rounded-xs hover:border-emerald-500 cursor-pointer flex items-center gap-1"
                                              title={projectObj ? `Jump to project ${projectObj.projectName}` : undefined}
                                            >
                                              <span>{item.projectJobNumber}</span>
                                              {projectObj && <ExternalLink size={8} />}
                                            </button>
                                          )}
                                          {item.projectName && (
                                            <span className="text-neutral-400 uppercase truncate font-semibold">
                                              {item.projectName}
                                            </span>
                                          )}
                                          {item.stepTitle && (
                                            <span className="text-neutral-500 uppercase text-[8px]">
                                              • {item.stepTitle}
                                            </span>
                                          )}
                                          <span className="text-emerald-400 font-bold text-[8px] uppercase tracking-wider">
                                            • COMPLETED
                                          </span>
                                        </div>
                                      )}
                                      <span className="text-xs font-mono font-medium block truncate line-through text-neutral-400">
                                        {item.text.startsWith('[') && (item.projectJobNumber || item.projectName)
                                          ? item.text.replace(/^\[.*?\]\s*/, '')
                                          : item.text}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px]">
                                    <span className="px-2 py-0.5 rounded-xs bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 uppercase tracking-wider font-bold flex items-center gap-1">
                                      <CheckCircle2 size={10} /> Finished
                                    </span>

                                    {item.completedAt ? (
                                      <span className="px-2 py-0.5 rounded-xs bg-black/60 border border-neutral-800 text-neutral-400 uppercase tracking-wider">
                                        {new Date(item.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    ) : item.deadline ? (
                                      <span className="px-2 py-0.5 rounded-xs bg-black/60 border border-neutral-800 text-neutral-400 uppercase tracking-wider">
                                        Due {new Date(item.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    ) : null}

                                    {/* Reopen Action Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleReopenTask(item)}
                                      className="px-2 py-0.5 rounded-xs bg-[#12141a] hover:bg-neutral-800 border border-neutral-700 hover:border-white text-neutral-300 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Restore to active to-do list"
                                    >
                                      <RotateCcw size={10} />
                                      <span>Reopen</span>
                                    </button>

                                    {/* Delete option if personal todo */}
                                    {item.sourceTodoId && onDeleteTodo && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteTodo(item.sourceTodoId!)}
                                        className="p-1 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer rounded-xs"
                                        title="Delete completed task"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Assigned / Created Details */}
                                {item.createdByName && item.createdById !== currentUser.id && (
                                  <div className="pl-8 font-mono text-[9px] text-neutral-500">
                                    Assigned by: <strong className="text-neutral-300">{item.createdByName}</strong>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Action Items Section (when in DAILY, ALL, or PERSONAL filter) */}
                    {(directiveFilter === 'DAILY' || directiveFilter === 'ALL' || directiveFilter === 'PERSONAL') && (
                      (() => {
                        const displayedTodos = directiveFilter === 'DAILY' ? dailyPersonalTodos : myPersonalTodos;
                        if (displayedTodos.length === 0) return null;

                        return (
                          <div className="space-y-2 mb-3">
                            <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest flex items-center justify-between px-1">
                              <span className="flex items-center gap-1.5 text-[var(--jarvis-primary)] font-bold">
                                <CheckCircle2 size={12} />
                                <span>{directiveFilter === 'DAILY' ? "DAILY TASK QUEUE // TODAY'S FOCUS" : "PERSONAL ACTION ITEMS"} ({displayedTodos.filter(t => !t.completed).length} pending)</span>
                              </span>
                              {displayedTodos.some(t => t.completed) && (
                                <span className="text-neutral-500 text-[9px]">{displayedTodos.filter(t => t.completed).length} completed</span>
                              )}
                            </div>
                            {displayedTodos.map(pt => (
                              <div
                                key={pt.id}
                                className={`p-3 rounded-sm border transition-all flex flex-col gap-2 ${
                                  pt.completed 
                                    ? 'bg-[#0c0d12]/60 border-neutral-800/40 opacity-50' 
                                    : 'bg-[#12141c] border-neutral-800 hover:border-[var(--jarvis-primary)]/60'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => onToggleTodo(pt.id)}
                                      className={`w-5 h-5 rounded-xs border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                        pt.completed 
                                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                          : 'border-neutral-700 hover:border-white text-transparent'
                                      }`}
                                    >
                                      <Check size={12} strokeWidth={3} className={pt.completed ? 'opacity-100' : 'opacity-0'} />
                                    </button>
                                    <div className="min-w-0">
                                      {(pt.projectJobNumber || pt.projectName) && (
                                        <div className="flex items-center gap-1.5 mb-1 font-mono text-[9px]">
                                          {pt.projectJobNumber && (
                                            <span className="px-1.5 py-0.2 bg-[#181a24] border border-neutral-700 text-amber-300 font-bold uppercase rounded-xs">
                                              {pt.projectJobNumber}
                                            </span>
                                          )}
                                          {pt.projectName && (
                                            <span className="text-neutral-400 uppercase truncate font-semibold">
                                              {pt.projectName}
                                            </span>
                                          )}
                                          <span className="text-emerald-400/90 text-[8px] uppercase tracking-wider font-bold">• ASSIGNED</span>
                                        </div>
                                      )}
                                      <span className={`text-xs font-mono font-medium block truncate ${pt.completed ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>
                                        {pt.text.startsWith('[') && (pt.projectJobNumber || pt.projectName) ? pt.text.replace(/^\[.*?\]\s*/, '') : pt.text}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {pt.deadline ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingDeadlineTodo(pt);
                                          const d = new Date(pt.deadline!);
                                          const pad = (n: number) => n.toString().padStart(2, '0');
                                          const dtStr = !isNaN(d.getTime()) 
                                            ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                                            : '';
                                          setEditTodoDeadlineValue(dtStr);
                                        }}
                                        className={`px-2 py-0.5 rounded-xs font-mono text-[9px] uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer ${
                                          new Date(pt.deadline).getTime() < Date.now() && !pt.completed
                                            ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 font-bold'
                                            : 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:border-amber-400'
                                        }`}
                                        title="Click to edit deadline"
                                      >
                                        <CalendarClock size={10} className={new Date(pt.deadline).getTime() < Date.now() && !pt.completed ? 'text-rose-400 animate-pulse' : 'text-amber-400'} />
                                        <span>
                                          {new Date(pt.deadline).getTime() < Date.now() && !pt.completed ? 'Overdue: ' : 'Due: '}
                                          {new Date(pt.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                          {new Date(pt.deadline).getHours() !== 0 || new Date(pt.deadline).getMinutes() !== 0 
                                            ? ` ${new Date(pt.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                                            : ''}
                                        </span>
                                      </button>
                                    ) : (
                                      onUpdateTodo && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingDeadlineTodo(pt);
                                            setEditTodoDeadlineValue(getQuickDeadlinePreset('today_eod'));
                                          }}
                                          className="px-2 py-0.5 rounded-xs bg-[#171922] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 font-mono text-[9px] text-neutral-400 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                                          title="Add deadline to this task"
                                        >
                                          <CalendarClock size={10} />
                                          <span>+ Due Date</span>
                                        </button>
                                      )
                                    )}

                                    {pt.projectId ? (
                                      <span className="px-2 py-0.5 rounded-xs bg-cyan-950/70 border border-cyan-500/40 font-mono text-[9px] text-cyan-300 uppercase tracking-wider font-bold">
                                        Assigned
                                      </span>
                                    ) : pt.isDaily ? (
                                      <span className="px-2 py-0.5 rounded-xs bg-amber-950/60 border border-amber-500/40 font-mono text-[9px] text-amber-300 uppercase tracking-wider font-bold">
                                        Daily
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-xs bg-black/60 border border-neutral-800 font-mono text-[9px] text-neutral-400 uppercase tracking-wider">
                                        Task
                                      </span>
                                    )}

                                    {onDeleteTodo && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteTodo(pt.id)}
                                        className="p-1 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer rounded-xs"
                                        title="Delete task"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Tagged People and Originator Info */}
                                {((pt.taggedStaffNames && pt.taggedStaffNames.length > 0) || (pt.createdByName && pt.createdById !== currentUser.id)) && (
                                  <div className="flex flex-wrap items-center gap-2 pl-8 font-mono text-[10px]">
                                    {pt.taggedStaffNames && pt.taggedStaffNames.length > 0 && (
                                      <div className="flex items-center gap-1 text-[var(--jarvis-primary)] bg-[rgba(var(--jarvis-primary-rgb),0.1)] px-2 py-0.5 rounded-xs border border-[var(--jarvis-primary)]/30">
                                        <Users size={11} className="shrink-0" />
                                        <span>Tagged: <strong className="text-white">{pt.taggedStaffNames.join(', ')}</strong></span>
                                      </div>
                                    )}
                                    {pt.createdByName && pt.createdById !== currentUser.id && (
                                      <span className="text-neutral-400 text-[9px]">
                                        Assigned by: <strong className="text-neutral-200">{pt.createdByName}</strong>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}

                    {directiveFilter === 'COMPLETED' ? null : filteredAndSortedDirectives.length === 0 && ((directiveFilter !== 'DAILY' && directiveFilter !== 'ALL' && directiveFilter !== 'PERSONAL') ? true : (directiveFilter === 'DAILY' ? dailyPersonalTodos.length === 0 : myPersonalTodos.length === 0)) ? (
                      <div className="text-center py-20 opacity-40 font-mono text-xs uppercase flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 size={32} className="text-emerald-400" />
                        <span>ALL {directiveFilter === 'DAILY' ? 'DAILY ' : ''}TO-DO ITEMS COMPLETED // SYSTEM NOMINAL</span>
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
                                <span className="px-2 py-0.5 bg-[#171922] border border-neutral-700 text-amber-300 text-[10px] uppercase font-bold tracking-wider" title="Estimated Duration (Hrs : MM)">
                                  EST {formatHrsMM(t.timeAllocated)} Hrs
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
                                    <ShieldAlert size={11} className="shrink-0 text-rose-400" />
                                    <span>Automated email notification dispatched to Manager, GM, Director & Admin</span>
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
                                <span className="text-neutral-400 text-[10px] uppercase">EST:</span>
                                <span className="font-bold text-amber-300 bg-black/50 px-2 py-0.5 rounded-xs border border-neutral-800 text-[10px]">
                                  {formatHrsMM(t.timeAllocated)} Hrs
                                </span>
                                <span className="text-neutral-400 text-[10px] uppercase ml-1">LOGGED:</span>
                                <span className="font-bold text-white bg-black/50 px-2 py-0.5 rounded-xs border border-neutral-800 text-[10px]">
                                  {formatHrsMM(t.timeSpent ? Math.floor(t.timeSpent / 60) : 0)} Hrs ({t.timeSpent || 0}m)
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
            <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-6 flex flex-col justify-between h-[620px]">
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

                <div className="space-y-2.5 overflow-y-auto max-h-[500px] custom-scrollbar pr-1">
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

          {/* EOD DAILY OPERATIONS COMPILATION // 7:00 PM AUTOMATED REPORTING (RESTRICTED TO ADMINS, DIRECTORS, GM) */}
          {(isSuperAdmin || isAdmin || isGM || isDirector) && (
            <DailyReportWidget
              report={dailyReport}
              config={dailyReportConfig}
              onOpenSettings={() => {
                if (onOpenDailyReportSettings) onOpenDailyReportSettings();
              }}
              onManualDispatch={handleManualDispatchReport}
              isDispatching={isDispatchingReport}
              canManageSettings={isSuperAdmin || isAdmin || isGM || isDirector}
            />
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

      {/* EDIT TODO DEADLINE MODAL */}
      {editingDeadlineTodo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-amber-500/50 rounded-sm w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-amber-950/30 border-b border-neutral-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <CalendarClock size={16} className="text-amber-400" />
                <h3 className="text-xs font-black uppercase text-white font-heading">
                  Task Deadline Adjustment
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingDeadlineTodo(null)} 
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 font-mono text-xs">
              <div className="p-2.5 bg-[#12141a] border border-neutral-800 rounded-xs text-[11px] text-neutral-300">
                <div className="text-[9px] text-neutral-500 uppercase">Directive:</div>
                <div className="font-bold text-white truncate">{editingDeadlineTodo.text}</div>
              </div>

              <div>
                <label className="block text-[9px] text-neutral-400 uppercase tracking-wider mb-1">
                  Choose New Deadline
                </label>
                <input
                  type="datetime-local"
                  value={editTodoDeadlineValue}
                  onChange={e => setEditTodoDeadlineValue(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12141a] border border-neutral-700 focus:border-amber-400 text-xs text-white outline-none rounded-xs [color-scheme:dark]"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditTodoDeadlineValue(getQuickDeadlinePreset('today_eod'))}
                  className="p-1.5 bg-[#171922] hover:bg-neutral-800 border border-neutral-800 rounded-xs text-[9px] text-left text-neutral-300 cursor-pointer"
                >
                  Today 18:00
                </button>
                <button
                  type="button"
                  onClick={() => setEditTodoDeadlineValue(getQuickDeadlinePreset('tomorrow_eod'))}
                  className="p-1.5 bg-[#171922] hover:bg-neutral-800 border border-neutral-800 rounded-xs text-[9px] text-left text-neutral-300 cursor-pointer"
                >
                  Tomorrow 18:00
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateTodo) {
                      onUpdateTodo({ ...editingDeadlineTodo, deadline: undefined });
                    }
                    setEditingDeadlineTodo(null);
                  }}
                  className="px-2.5 py-1 text-[10px] text-rose-400 hover:underline uppercase cursor-pointer"
                >
                  Remove Deadline
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDeadlineTodo(null)}
                    className="px-3 py-1.5 text-[10px] text-neutral-400 hover:text-white uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateTodo && editTodoDeadlineValue) {
                        onUpdateTodo({ ...editingDeadlineTodo, deadline: new Date(editTodoDeadlineValue).toISOString() });
                      }
                      setEditingDeadlineTodo(null);
                    }}
                    className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] uppercase rounded-xs transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
