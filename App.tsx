
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Project, StaffMember, Role, PaymentUpdate, ServiceItem, Client, Todo, CalendarEvent, Channel, Message, Notification, AgencyProfile, LeaveRequest, LeaveApprovalTier, PettyCashTransaction, ProjectType, Task, DEFAULT_DEPARTMENTS, DEFAULT_ROLES, MeetingNote, Procedure, EmployeeAccessRequest } from './types';
import { INITIAL_PROJECTS as MOCK_PROJECTS, INITIAL_STAFF, SERVICE_CATALOG, INITIAL_CLIENTS, INITIAL_TODOS, INITIAL_EVENTS, INITIAL_CHANNELS, INITIAL_MESSAGES, INITIAL_NOTIFICATIONS, INITIAL_LEAVE_REQUESTS, INITIAL_PETTY_CASH, getTemplateSteps, AGENCY_PROCEDURES, INITIAL_MEETING_NOTES } from './data';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import Login from './components/Login';
import StaffManagement from './components/StaffManagement';
import ClientManagement from './components/ClientManagement';
import FinanceDashboard from './components/FinanceDashboard';
import HRDashboard from './components/HRDashboard';
import CommunicationHub from './components/CommunicationHub';
import JobRegistry from './components/JobRegistry';
import MeetingNotes from './components/MeetingNotes';
import Procedures from './components/Procedures';
import MonthlyCalendar from './components/MonthlyCalendar';
import AccessManagement from './components/AccessManagement';
import EmployeeAccessControl from './components/EmployeeAccessControl';
import WorkloadDashboard from './components/WorkloadDashboard';
import Footer from './components/Footer';
import PendingApprovalScreen from './components/PendingApprovalScreen';
import RejectedAccessScreen from './components/RejectedAccessScreen';
import SuspendedAccessScreen from './components/SuspendedAccessScreen';
import { db, isFirebaseEnabled, auth, logoutGoogle } from './firebase';
import { supabase, isSupabaseEnabled, loadAllAccessRequests, disconnectGoogleWorkspaceToken, saveOrUpdateUserProfile, loadAllAppDataFromSupabase, syncToSupabase, deleteFromSupabase, syncAllAppDataToSupabase } from './supabase';
import { doc, setDoc, onSnapshot, collection, updateDoc, addDoc, query, orderBy, limit, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { LogOut, Users, FileText, Hexagon, Building2, Bell, Clock, DollarSign, UserCircle, MessageSquare, ListTodo, X, Building, Zap, Target, CheckCircle2, Plus, Calendar, Timer, AlertCircle, Archive, LayoutGrid, Heart, ChevronRight, ChevronLeft, Search, Check, Trash2, StickyNote, Send, Link as LinkIcon, Bookmark, Briefcase, ChevronDown, CloudOff, Cloud, RefreshCw, Database, ServerCrash, ShieldCheck, HardDrive, Cpu, Bot, CheckCircle, Compass, Circle, Menu, ArrowRight, Layers, Radio, RadioTower, Video, Mic, Globe, ShieldAlert, Lock, BarChart2, Sliders, Sparkles, Sun, Flame } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { JarvisThemeConfig } from './types';
import { loadSavedJarvisTheme, saveJarvisTheme, applyJarvisThemeToDOM } from './utils/jarvisTheme';
import { playJarvisSound } from './utils/jarvisAudio';
import JARVISSettingsModal from './components/JARVISSettingsModal';
import DailyReportSettingsModal from './components/DailyReportSettingsModal';
import { 
  sendTaskMentionEmail, 
  sendTaskAssignmentEmail, 
  getStoredDailyReportConfig, 
  dispatchDailyReport,
  checkAndDispatchOverdueEscalations
} from './utils/emailDispatcher';

type ViewState = 'dashboard' | 'detail' | 'staff' | 'clients' | 'finance' | 'hr' | 'registry' | 'notes' | 'procedures' | 'calendar' | 'access' | 'workload';
type StorageMode = 'cloud' | 'local';

const INITIAL_AGENCY_PROFILE: AgencyProfile = {
  name: 'MEDIAWIZE',
  address: '17, KIRIMANDALA MAWATHA, NAWALA',
  email: 'contact@mediawize.lk',
  phone: '+94 770 655 665',
  website: 'www.mediawize.lk'
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(() => {
    try {
      const saved = localStorage.getItem('mw_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      const { password: _, ...safeUser } = currentUser;
      localStorage.setItem('mw_current_user', JSON.stringify(safeUser));
    }
  }, [currentUser]);
  const [storageMode, setStorageMode] = useState<StorageMode>((isSupabaseEnabled || isFirebaseEnabled) ? 'cloud' : 'local');
  
  // App-wide state
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [clientList, setClientList] = useState<Client[]>(INITIAL_CLIENTS);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceItem[]>(SERVICE_CATALOG);
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS);
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile>(INITIAL_AGENCY_PROFILE);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [pettyCash, setPettyCash] = useState<PettyCashTransaction[]>(INITIAL_PETTY_CASH);
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>(INITIAL_MEETING_NOTES);
  const [procedures, setProcedures] = useState<Procedure[]>(AGENCY_PROCEDURES);
  const [lastRead, setLastRead] = useState<Record<string, string>>({});
  const [accessRequests, setAccessRequests] = useState<EmployeeAccessRequest[]>([]);
  const [accessSubTab, setAccessSubTab] = useState<'employees' | 'permissions'>('employees');

  // UI State
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>('dashboard');
  const [sidebarTab, setSidebarTab] = useState<'focus' | 'hub' | 'notes' | 'menu'>('menu');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState<string>('ch-1');
  const [quickTodoText, setQuickTodoText] = useState('');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectStep, setNewProjectStep] = useState(1);
  const [projectForm, setProjectForm] = useState({ name: '', client: '', type: 'Annual Reports' as ProjectType });
  const [newClientDetails, setNewClientDetails] = useState({ contactPerson: '', email: '', phone: '', industry: '', address: '' });
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [isBriefSearchOpen, setIsBriefSearchOpen] = useState(false);
  const [briefSearchQuery, setBriefSearchQuery] = useState('');
  const [jarvisTheme, setJarvisTheme] = useState<JarvisThemeConfig>(loadSavedJarvisTheme);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDailyReportSettingsOpen, setIsDailyReportSettingsOpen] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [dbSyncMessage, setDbSyncMessage] = useState<string | null>(null);

  const handleSyncAllToDatabase = async () => {
    setIsSyncingDb(true);
    setDbSyncMessage(null);
    try {
      await syncAllAppDataToSupabase({
        projects,
        staff: staffList,
        clients: clientList,
        todos,
        events,
        notes: meetingNotes,
        procedures,
        leaves: leaveRequests,
        pettyCash,
        channels,
        messages,
        notifications,
        agency: agencyProfile
      });
      setDbSyncMessage('DATABASE SYNC COMPLETE // ALL ENTITIES UPDATED');
      setTimeout(() => setDbSyncMessage(null), 3500);
    } catch (e: any) {
      setDbSyncMessage('DATABASE NOTICE // LOCAL RETENTION ACTIVE');
      setTimeout(() => setDbSyncMessage(null), 3500);
    } finally {
      setIsSyncingDb(false);
    }
  };

  useEffect(() => {
    applyJarvisThemeToDOM(jarvisTheme);
  }, [jarvisTheme]);

  const handleSaveTheme = (newConfig: JarvisThemeConfig) => {
    setJarvisTheme(newConfig);
    saveJarvisTheme(newConfig);
  };

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const briefDropdownRef = useRef<HTMLDivElement>(null);
  const briefSearchInputRef = useRef<HTMLInputElement>(null);

  const loadLocalData = () => {
    const keys = ['projects', 'staff', 'clients', 'todos', 'events', 'notes', 'agency', 'messages', 'channels', 'notifications', 'procedures', 'leaves', 'pettyCash'];
    keys.forEach(key => {
        const saved = localStorage.getItem(`mw_${key}`);
        if (saved) {
            const data = JSON.parse(saved);
            if (key === 'projects') setProjects(data);
            if (key === 'staff') setStaffList(data);
            if (key === 'clients') setClientList(data);
            if (key === 'todos') setTodos(data);
            if (key === 'events') setEvents(data);
            if (key === 'notes') setMeetingNotes((data && data.length > 0) ? data : INITIAL_MEETING_NOTES);
            if (key === 'agency') {
              const merged = {
                ...INITIAL_AGENCY_PROFILE,
                ...data,
                address: (!data.address || data.address.includes('Creative Avenue')) ? INITIAL_AGENCY_PROFILE.address : data.address,
                phone: (!data.phone || data.phone.includes('222 3333')) ? INITIAL_AGENCY_PROFILE.phone : data.phone
              };
              setAgencyProfile(merged);
              saveLocalData('agency', merged);
            }
            if (key === 'messages') setMessages(data);
            if (key === 'channels') setChannels(data);
            if (key === 'notifications') setNotifications(data);
            if (key === 'procedures') setProcedures(data);
            if (key === 'leaves') setLeaveRequests(data);
            if (key === 'pettyCash') setPettyCash(data);
        }
    });
  };

  const saveLocalData = (key: string, data: any) => {
    localStorage.setItem(`mw_${key}`, JSON.stringify(data));
  };

  useEffect(() => {
    loadLocalData();
    if (isSupabaseEnabled && supabase) {
      loadAllAppDataFromSupabase().then(cloudData => {
        if (!cloudData) return;
        
        let hasData = false;
        if (Array.isArray(cloudData.projects) && cloudData.projects.length > 0) {
          setProjects(cloudData.projects);
          saveLocalData('projects', cloudData.projects);
          hasData = true;
        }
        if (Array.isArray(cloudData.staff) && cloudData.staff.length > 0) {
          setStaffList(cloudData.staff);
          saveLocalData('staff', cloudData.staff);
          hasData = true;
        }
        if (Array.isArray(cloudData.clients) && cloudData.clients.length > 0) {
          setClientList(cloudData.clients);
          saveLocalData('clients', cloudData.clients);
          hasData = true;
        }
        if (Array.isArray(cloudData.todos) && cloudData.todos.length > 0) {
          setTodos(cloudData.todos);
          saveLocalData('todos', cloudData.todos);
          hasData = true;
        }
        if (Array.isArray(cloudData.events) && cloudData.events.length > 0) {
          setEvents(cloudData.events);
          saveLocalData('events', cloudData.events);
          hasData = true;
        }
        const notesData = cloudData.notes || cloudData.meetingNotes;
        if (Array.isArray(notesData) && notesData.length > 0) {
          setMeetingNotes(notesData);
          saveLocalData('notes', notesData);
          hasData = true;
        }
        if (Array.isArray(cloudData.procedures) && cloudData.procedures.length > 0) {
          setProcedures(cloudData.procedures);
          saveLocalData('procedures', cloudData.procedures);
          hasData = true;
        }
        const leavesData = cloudData.leaves || cloudData.leaveRequests;
        if (Array.isArray(leavesData) && leavesData.length > 0) {
          setLeaveRequests(leavesData);
          saveLocalData('leaves', leavesData);
          hasData = true;
        }
        if (Array.isArray(cloudData.pettyCash) && cloudData.pettyCash.length > 0) {
          setPettyCash(cloudData.pettyCash);
          saveLocalData('pettyCash', cloudData.pettyCash);
          hasData = true;
        }
        if (Array.isArray(cloudData.channels) && cloudData.channels.length > 0) {
          setChannels(cloudData.channels);
          saveLocalData('channels', cloudData.channels);
          hasData = true;
        }
        if (Array.isArray(cloudData.messages) && cloudData.messages.length > 0) {
          setMessages(cloudData.messages);
          saveLocalData('messages', cloudData.messages);
          hasData = true;
        }
        if (Array.isArray(cloudData.notifications) && cloudData.notifications.length > 0) {
          setNotifications(cloudData.notifications);
          saveLocalData('notifications', cloudData.notifications);
          hasData = true;
        }
        if (cloudData.agency && typeof cloudData.agency === 'object') {
          setAgencyProfile(cloudData.agency);
          saveLocalData('agency', cloudData.agency);
          hasData = true;
        }

        // If newly connected database without datasets yet, seed initial agency datasets into Supabase
        if (!hasData) {
          syncAllAppDataToSupabase({
            projects: MOCK_PROJECTS,
            staff: INITIAL_STAFF,
            clients: INITIAL_CLIENTS,
            todos: INITIAL_TODOS,
            events: INITIAL_EVENTS,
            notes: INITIAL_MEETING_NOTES,
            procedures: AGENCY_PROCEDURES,
            leaves: INITIAL_LEAVE_REQUESTS,
            pettyCash: INITIAL_PETTY_CASH,
            channels: INITIAL_CHANNELS,
            messages: INITIAL_MESSAGES,
            notifications: INITIAL_NOTIFICATIONS,
            agency: INITIAL_AGENCY_PROFILE
          }).catch(e => console.debug('Initial Supabase dataset seed notice:', e));
        }
      }).catch(err => console.debug('Supabase initial cloud sync notice:', err));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (briefDropdownRef.current && !briefDropdownRef.current.contains(event.target as Node)) {
        setIsBriefSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isBriefSearchOpen) {
      setTimeout(() => {
        briefSearchInputRef.current?.focus();
      }, 50);
    } else {
      setBriefSearchQuery('');
    }
  }, [isBriefSearchOpen]);

  useEffect(() => {
    if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0;
    }
  }, [view, activeProjectId]);

  // Automated SLA Breach Escalation Protocol:
  // Every task that is assigned automatically triggers an email notification to Manager, GM, Director, and Admin if deadlines are not met
  useEffect(() => {
    if (!projects || projects.length === 0 || !staffList || staffList.length === 0) return;

    const runEscalationCheck = () => {
      checkAndDispatchOverdueEscalations(projects, staffList).catch(err => 
        console.debug('Automated SLA breach check notice:', err)
      );
    };

    runEscalationCheck();
    const interval = setInterval(runEscalationCheck, 60000); // Verify on 60-second cycle
    return () => clearInterval(interval);
  }, [projects, staffList]);

  // Automated synchronization: ensure all assigned project tasks are represented in assignees' todo lists
  useEffect(() => {
    if (!projects || projects.length === 0) return;

    const todoMap = new Map<string, Todo>();
    todos.forEach(t => {
      if (t.projectId && t.taskId) {
        todoMap.set(`${t.projectId}-${t.taskId}`, t);
      }
    });

    const newTodosToAdd: Todo[] = [];
    projects.forEach(p => {
      (p.steps || []).forEach(s => {
        const stepTasks = [...(s.tasks || []), ...(s.subSteps?.flatMap(ss => ss.tasks) || [])];
        stepTasks.forEach(t => {
          if (t.assignedTo) {
            const key = `${p.id}-${t.id}`;
            const existing = todoMap.get(key);
            const isDone = !!(p.tasksCompleted && p.tasksCompleted[t.id]) || !!t.completed;
            const effDeadline = t.deadline || s.deadline || p.dueDate;
            const deadlineStr = effDeadline ? (typeof effDeadline === 'string' ? effDeadline : new Date(effDeadline).toISOString()) : undefined;

            if (!existing) {
              const staff = staffList.find(st => st.id === t.assignedTo);
              newTodosToAdd.push({
                id: `todo-task-${p.id}-${t.id}`,
                text: `[${p.jobNumber || p.projectName}] ${t.text}`,
                completed: isDone,
                userId: t.assignedTo,
                assignedTo: t.assignedTo,
                assignedToName: staff?.name,
                assignedToAvatar: staff?.avatarUrl,
                isDaily: true,
                deadline: deadlineStr,
                createdAt: new Date().toISOString(),
                projectId: p.id,
                projectName: p.projectName,
                projectJobNumber: p.jobNumber,
                stepId: s.id,
                taskId: t.id
              });
            }
          }
        });
      });
    });

    if (newTodosToAdd.length > 0) {
      setTodos(prev => {
        const existingIds = new Set(prev.map(td => td.id));
        const filteredNew = newTodosToAdd.filter(td => !existingIds.has(td.id));
        if (filteredNew.length === 0) return prev;
        const combined = [...prev, ...filteredNew];
        saveLocalData('todos', combined);
        return combined;
      });
    }
  }, [projects, staffList, todos]);

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId) || null, [projects, activeProjectId]);
  const filteredBriefs = useMemo(() => {
    if (!briefSearchQuery.trim()) return projects;
    const q = briefSearchQuery.toLowerCase();
    return projects.filter(p => 
      p.projectName?.toLowerCase().includes(q) ||
      p.clientName?.toLowerCase().includes(q) ||
      (p.jobNumber && p.jobNumber.toLowerCase().includes(q)) ||
      (p.type && p.type.toLowerCase().includes(q))
    );
  }, [projects, briefSearchQuery]);
  const sortedTodos = useMemo(() => {
    if (!currentUser) return [];
    return todos.filter(t => 
      t.userId === currentUser.id || 
      t.assignedTo === currentUser.id || 
      (t.taggedStaffIds && t.taggedStaffIds.includes(currentUser.id))
    ).sort((a, b) => { 
      if (a.completed && !b.completed) return 1; 
      if (!a.completed && b.completed) return -1; 
      return 0; 
    });
  }, [todos, currentUser]);
  const currentBalance = useMemo(() => pettyCash.reduce((sum, tx) => sum + (tx.type === 'Income' ? tx.amount : -tx.amount), 0), [pettyCash]);

  const writeData = async (col: string, id: string, data: any, localArraySetter?: any, currentArray?: any[]) => {
    let updatedArray: any[] | null = null;
    if (localArraySetter) {
      localArraySetter((prev: any[]) => {
        const base = Array.isArray(prev) ? prev : (currentArray || []);
        const index = base.findIndex(item => item.id === id);
        let newArr: any[];
        if (index > -1) {
          newArr = [...base];
          newArr[index] = { ...newArr[index], ...data };
        } else {
          newArr = [...base, { ...data, id }];
        }
        updatedArray = newArr;
        saveLocalData(col, newArr);
        return newArr;
      });
    }

    // 1. Supabase Database Realtime Write
    if (isSupabaseEnabled && supabase) {
      syncToSupabase(col, id, data).catch(err => console.debug(`Supabase write notice for ${col}:`, err));
      if (updatedArray) {
        supabase.from('app_data').upsert({
          key: `dataset_${col}`,
          value: updatedArray,
          updated_at: new Date().toISOString()
        }).then(() => {}, (err: any) => console.debug(`Supabase dataset update error for ${col}:`, err));
      }
    }

    // 2. Firebase Cloud Write
    if (storageMode === 'cloud' && isFirebaseEnabled && db) { 
      try { await setDoc(doc(db, col, id), data); } catch (err) { console.error(`Cloud write failure:`, err); } 
    }
  };

  const deleteData = async (col: string, id: string, localArraySetter?: any, currentArray?: any[]) => {
    let updatedArray: any[] | null = null;
    if (localArraySetter) {
      localArraySetter((prev: any[]) => {
        const base = Array.isArray(prev) ? prev : (currentArray || []);
        const newArr = base.filter(item => String(item.id) !== String(id));
        updatedArray = newArr;
        saveLocalData(col, newArr);
        return newArr;
      });
    }

    // 1. Supabase Database Delete
    if (isSupabaseEnabled && supabase) {
      deleteFromSupabase(col, id).catch(err => console.debug(`Supabase delete notice for ${col}:`, err));
      if (updatedArray) {
        supabase.from('app_data').upsert({
          key: `dataset_${col}`,
          value: updatedArray,
          updated_at: new Date().toISOString()
        }).then(() => {}, (err: any) => console.debug(`Supabase dataset update error for ${col}:`, err));
      }
    }

    // 2. Firebase Cloud Delete
    if (storageMode === 'cloud' && isFirebaseEnabled && db) { 
      try { await deleteDoc(doc(db, col, id)); } catch (err) { console.error(`Cloud delete failure:`, err); } 
    }
  };

  const handleSendMessage = async (text: string, channelId: string) => {
    if (!currentUser) return;
    const userMessage: Message = { 
      id: Date.now().toString(), 
      channelId, 
      text, 
      senderId: currentUser.id, 
      senderName: currentUser.name, 
      senderAvatar: currentUser.avatarUrl, 
      timestamp: new Date() 
    };
    await writeData('messages', userMessage.id, userMessage, setMessages, messages);
  };

  const handleCreateChannel = async (name: string, type: 'public' | 'private' | 'project', description: string) => {
    const newChan: Channel = {
      id: `ch-${Date.now()}`,
      name,
      type,
      description,
      members: [currentUser?.id || ''],
      unreadCount: 0
    };
    await writeData('channels', newChan.id, newChan, setChannels, channels);
    setCurrentChannelId(newChan.id);
  };

  const handleUpdateProject = async (updatedProject: Project) => { await writeData('projects', updatedProject.id, updatedProject, setProjects, projects); };
  const handleUpdatePayment = useCallback(async (update: PaymentUpdate) => { const project = projects.find(p => p.id === update.projectId); if (project) { const updatedProject: Project = { ...project, paymentUpdates: [...(project.paymentUpdates || []), update], advanceReceived: update.type === 'Advance' ? true : project.advanceReceived }; handleUpdateProject(updatedProject); } }, [projects]);

  const handleAddProject = async (
    name: string, 
    clientName: string, 
    type: ProjectType,
    extraClientDetails?: { contactPerson?: string; email?: string; phone?: string; industry?: string; address?: string }
  ) => {
    if (!canCreateCampaign) {
      console.warn('Unauthorized campaign creation attempt blocked');
      return;
    }
    const trimmedClient = clientName.trim();
    const existingClient = clientList.find(
      c => c.companyName.trim().toLowerCase() === trimmedClient.toLowerCase()
    );

    let resolvedClientName = trimmedClient;
    if (existingClient) {
      resolvedClientName = existingClient.companyName;
    } else if (trimmedClient) {
      // Auto-register new client into the Client Directory
      const cleanSlug = trimmedClient.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client';
      const newClient: Client = {
        id: `c-${Date.now()}`,
        companyName: trimmedClient,
        contactPerson: extraClientDetails?.contactPerson?.trim() || 'Primary Contact',
        email: extraClientDetails?.email?.trim() || `contact@${cleanSlug}.com`,
        phone: extraClientDetails?.phone?.trim() || '',
        address: extraClientDetails?.address?.trim() || 'Colombo, Sri Lanka',
        industry: extraClientDetails?.industry?.trim() || (type === 'Annual Reports' ? 'Finance / Corporate' : type === 'Digital & Media Strategy' ? 'Digital Marketing' : 'Enterprise'),
        notes: `Auto-registered to Client Directory upon campaign deployment (${name}).`
      };
      await writeData('clients', newClient.id, newClient, setClientList, clientList);

      // Create a notification for the agency team
      const newNotif: Notification = {
        id: `n-${Date.now()}`,
        userId: currentUser?.id || 'all',
        text: `New client "${trimmedClient}" was added to the Client Directory.`,
        type: 'system',
        read: false,
        timestamp: new Date(),
        link: 'clients'
      };
      await writeData('notifications', newNotif.id, newNotif, setNotifications, notifications);
    }

    const year = new Date().getFullYear().toString();
    const count = projects.length + 1;
    const jobNumber = `MW-J-${year}-${count.toString().padStart(4, '0')}`;
    const now = new Date();
    const newProject: Project = { 
      id: `p-${Date.now()}`, 
      jobNumber, 
      clientName: resolvedClientName, 
      projectName: name, 
      type, 
      dueDate: new Date(Date.now() + 86400000 * 30), 
      year, 
      status: 'In Progress', 
      currentStep: 1, 
      progress: 0, 
      tasksCompleted: {}, 
      lastUpdated: now,
      createdAt: now,
      createdBy: currentUser?.id,
      createdByName: currentUser?.name || 'System Operator',
      createdByRole: currentUser?.role || 'Operator',
      createdByAvatar: currentUser?.avatarUrl,
      createdByStaffId: currentUser?.staffId,
      createdByDepartment: currentUser?.department,
      createdByEmail: currentUser?.email,
      steps: getTemplateSteps(type), 
      comments: {}, 
      memos: [], 
      quotations: [], 
      documents: [], 
      advanceReceived: false 
    };
    await writeData('projects', newProject.id, newProject, setProjects, projects);
    setIsNewProjectModalOpen(false);
    setNewProjectStep(1);
    setProjectForm({ name: '', client: '', type: 'Annual Reports' });
    setNewClientDetails({ contactPerson: '', email: '', phone: '', industry: '', address: '' });
    setShowNewClientForm(false);
    setActiveProjectId(newProject.id);
    setView('detail');
  };

  const handleAddTodoItem = async (text: string, due?: Date, taggedStaffIds?: string[], isDaily: boolean = true) => {
    if (!text.trim() || !currentUser) return;
    const taggedStaff = (staffList || []).filter(s => taggedStaffIds?.includes(s.id));
    const newTodo: Todo = {
      id: `todo-${Date.now()}`,
      text: text.trim(),
      completed: false,
      userId: currentUser.id,
      createdById: currentUser.id,
      createdByName: currentUser.name,
      isDaily: isDaily,
      deadline: due ? due.toISOString() : undefined,
      taggedStaffIds: taggedStaffIds || [],
      taggedStaffNames: taggedStaff.map(s => s.name),
      assignedTo: taggedStaffIds?.[0],
      assignedToName: taggedStaff[0]?.name,
      assignedToAvatar: taggedStaff[0]?.avatarUrl,
      createdAt: new Date().toISOString()
    };
    await writeData('todos', newTodo.id, newTodo, setTodos, todos);

    // If people are tagged, dispatch notifications & email notifications
    if (taggedStaffIds && taggedStaffIds.length > 0) {
      taggedStaffIds.forEach(staffId => {
        if (staffId !== currentUser.id) {
          const notif: Notification = {
            id: `n-${Date.now()}-${staffId}`,
            userId: staffId,
            text: `${currentUser.name} tagged you in a ${isDaily ? 'daily ' : ''}task: "${text.trim()}"`,
            type: 'mention',
            read: false,
            timestamp: new Date(),
            link: 'dashboard'
          };
          writeData('notifications', notif.id, notif, setNotifications, notifications);

          // Automated email notification to tagged individual
          const taggedMember = (staffList || []).find(s => s.id === staffId);
          if (taggedMember) {
            sendTaskMentionEmail({
              taskText: text.trim(),
              taggedStaff: taggedMember,
              authorName: currentUser.name,
              isDaily,
              deadline: due
            }).catch(e => console.debug('Task mention email dispatch notice:', e));
          }
        }
      });
    }

    // If assigned to a staff member who wasn't tagged, send assignment email
    if (newTodo.assignedTo && newTodo.assignedTo !== currentUser.id && (!taggedStaffIds || !taggedStaffIds.includes(newTodo.assignedTo))) {
      const assignedMember = (staffList || []).find(s => s.id === newTodo.assignedTo);
      if (assignedMember) {
        sendTaskAssignmentEmail({
          taskText: text.trim(),
          deadline: due,
          assignee: assignedMember,
          assignerName: currentUser.name
        }).catch(e => console.debug('Task assignment email dispatch notice:', e));
      }
    }
  };

  const handleAddTodo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!quickTodoText.trim() || !currentUser) return;
    await handleAddTodoItem(quickTodoText, undefined, [], true);
    setQuickTodoText('');
  };

  const handleSyncTaskAssignmentToTodo = useCallback(async (params: {
    taskId: string;
    assigneeId: string;
    taskText: string;
    deadline?: Date | string;
    projectId: string;
    projectName: string;
    projectJobNumber?: string;
    stepId?: number;
    isCompleted?: boolean;
  }) => {
    const { taskId, assigneeId, taskText, deadline, projectId, projectName, projectJobNumber, stepId, isCompleted = false } = params;
    const todoId = `todo-task-${projectId}-${taskId}`;

    if (!assigneeId) {
      // If task was unassigned, remove the generated todo entry from todos list
      const existing = todos.find(t => t.id === todoId || (t.projectId === projectId && t.taskId === taskId));
      if (existing) {
        await deleteData('todos', existing.id, setTodos, todos);
      }
      return;
    }

    const assignedMember = (staffList || []).find(s => s.id === assigneeId);
    const deadlineStr = deadline ? (typeof deadline === 'string' ? deadline : new Date(deadline).toISOString()) : undefined;
    const existingTodo = todos.find(t => t.id === todoId || (t.projectId === projectId && t.taskId === taskId));

    const updatedTodo: Todo = {
      id: todoId,
      text: `[${projectJobNumber || projectName}] ${taskText}`,
      completed: isCompleted,
      userId: assigneeId, // Assignee owns this todo in their personal and daily list
      assignedTo: assigneeId,
      assignedToName: assignedMember?.name,
      assignedToAvatar: assignedMember?.avatarUrl,
      createdById: currentUser?.id,
      createdByName: currentUser?.name || 'Authorized Lead',
      isDaily: true,
      deadline: deadlineStr,
      createdAt: existingTodo?.createdAt || new Date().toISOString(),
      projectId,
      projectName,
      projectJobNumber,
      stepId,
      taskId
    };

    await writeData('todos', todoId, updatedTodo, setTodos, todos);
  }, [todos, staffList, currentUser]);

  const handleToggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const nextCompleted = !todo.completed;
    const updated = { ...todo, completed: nextCompleted };
    await writeData('todos', id, updated, setTodos, todos);

    // If this todo is linked to a project task, automatically sync the project's task status
    if (todo.projectId && todo.taskId) {
      const proj = projects.find(p => p.id === todo.projectId);
      if (proj) {
        const newTasksCompleted = { ...(proj.tasksCompleted || {}) };
        newTasksCompleted[todo.taskId] = nextCompleted;

        const updatedSteps = proj.steps.map(s => ({
          ...s,
          tasks: s.tasks.map(t => t.id === todo.taskId ? { ...t, completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : undefined } : t),
          subSteps: s.subSteps ? s.subSteps.map(ss => ({
            ...ss,
            tasks: ss.tasks.map(t => t.id === todo.taskId ? { ...t, completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : undefined } : t)
          })) : undefined
        }));

        const allTasks = updatedSteps.flatMap(s => [...s.tasks, ...(s.subSteps?.flatMap(ss => ss.tasks) || [])]);
        const total = allTasks.length;
        const completedCount = allTasks.filter(t => newTasksCompleted[t.id] || t.completed).length;
        const prog = total === 0 ? 0 : Math.round((completedCount / total) * 100);

        const updatedProj: Project = {
          ...proj,
          steps: updatedSteps,
          tasksCompleted: newTasksCompleted,
          progress: prog,
          lastUpdated: new Date()
        };
        await writeData('projects', updatedProj.id, updatedProj, setProjects, projects);
      }
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('mw_current_user');
      if (isFirebaseEnabled && auth) {
        await logoutGoogle().catch(() => {});
      }
      if (isSupabaseEnabled && supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
      disconnectGoogleWorkspaceToken();
    } catch (e) {
      console.debug('Logout notice:', e);
    }
    setCurrentUser(null);
    setView('dashboard');
    setIsSidebarOpen(false);
  };

  const handleNav = (targetView: ViewState) => {
    setView(targetView);
    setActiveProjectId(null);
    setIsSidebarOpen(false);
  };

  const handleOpenHub = () => {
    setSidebarTab('hub');
    setIsSidebarOpen(true);
  };

  const handleUpdateLeave = async (
    requestId: string, 
    status: 'Approved' | 'Rejected', 
    reviewNote?: string,
    tier?: 'manager' | 'director' | 'both'
  ) => {
    const req = leaveRequests.find(l => l.id === requestId);
    if (!req) return;

    const normRole = (currentUser?.role || '').toLowerCase();
    const normDept = (currentUser?.department || '').toLowerCase();
    const isDirectorUser = normRole.includes('director') || normDept.includes('director') || normRole.includes('gm') || normRole.includes('general manager') || normRole.includes('super admin');
    const isManagerUser = normRole.includes('manager') || normRole.includes('lead') || currentUser?.role === Role.MANAGEMENT || normDept.includes('management') || normRole.includes('admin') || normRole.includes('super admin');

    let updatedReq: LeaveRequest = { ...req };

    if (status === 'Rejected') {
      const reason = reviewNote?.trim() || 'No reason specified';
      updatedReq = {
        ...req,
        status: 'Rejected',
        rejectedBy: currentUser?.name || 'Authorized Reviewer',
        rejectedById: currentUser?.id,
        rejectedByRole: currentUser?.role,
        rejectedByDepartment: currentUser?.department,
        rejectedByEmail: currentUser?.email,
        rejectedAt: new Date(),
        rejectionReason: reason,
        reviewNote: reason
      };

      await writeData('leaves', requestId, updatedReq, setLeaveRequests, leaveRequests);

      const notif: Notification = {
        id: `notif-${Date.now()}`,
        userId: req.staffId,
        text: `Your ${req.type} leave (${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}) was REJECTED by ${currentUser?.name || 'Reviewer'}. Reason: "${reason}".`,
        type: 'system',
        read: false,
        timestamp: new Date(),
        link: 'hr'
      };
      await writeData('notifications', notif.id, notif, setNotifications, notifications);
      return;
    }

    // Handling Approval - Approver identity captured automatically from currentUser session
    let selectedTier = tier;
    if (!selectedTier) {
      if (!req.managerApproval?.approved && (isManagerUser || !isDirectorUser)) {
        selectedTier = 'manager';
      } else if (!req.directorApproval?.approved && isDirectorUser) {
        selectedTier = 'director';
      } else {
        selectedTier = 'both';
      }
    }

    const approvalRecord: LeaveApprovalTier = {
      approved: true,
      approvedBy: currentUser?.name || 'Authorized Reviewer',
      approvedById: currentUser?.id,
      role: currentUser?.role,
      department: currentUser?.department,
      email: currentUser?.email,
      timestamp: new Date(),
      note: reviewNote?.trim() || undefined
    };

    if (selectedTier === 'manager') {
      updatedReq.managerApproval = approvalRecord;
    } else if (selectedTier === 'director') {
      updatedReq.directorApproval = approvalRecord;
    } else if (selectedTier === 'both') {
      if (!updatedReq.managerApproval?.approved) {
        updatedReq.managerApproval = approvalRecord;
      }
      updatedReq.directorApproval = approvalRecord;
    }

    // A leave is ONLY fully Approved when BOTH Division Manager AND Director have approved:
    const hasManagerApproval = !!updatedReq.managerApproval?.approved;
    const hasDirectorApproval = !!updatedReq.directorApproval?.approved;

    if (hasManagerApproval && hasDirectorApproval) {
      updatedReq.status = 'Approved';
      updatedReq.reviewedBy = `${updatedReq.managerApproval?.approvedBy} (Division Manager) & ${updatedReq.directorApproval?.approvedBy} (Director)`;
      updatedReq.reviewedAt = new Date();
      updatedReq.reviewNote = reviewNote || 'Fully authorized by Division Manager & Director';
    } else {
      updatedReq.status = 'Pending';
    }

    await writeData('leaves', requestId, updatedReq, setLeaveRequests, leaveRequests);

    if (hasManagerApproval && hasDirectorApproval) {
      const notif: Notification = {
        id: `notif-${Date.now()}`,
        userId: req.staffId,
        text: `Your ${req.type} leave (${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}) is FULLY APPROVED by both Division Manager (${updatedReq.managerApproval?.approvedBy}) and Director (${updatedReq.directorApproval?.approvedBy}).`,
        type: 'system',
        read: false,
        timestamp: new Date(),
        link: 'hr'
      };
      await writeData('notifications', notif.id, notif, setNotifications, notifications);

      if (updatedReq.assignedWorkloadToId) {
        const handoverNotif: Notification = {
          id: `notif-${Date.now()}-handover`,
          userId: updatedReq.assignedWorkloadToId,
          text: `Duty Coverage Active: ${req.staffName}'s leave (${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}) is approved. You are designated to cover their workload.`,
          type: 'system',
          read: false,
          timestamp: new Date(),
          link: 'hr'
        };
        await writeData('notifications', handoverNotif.id, handoverNotif, setNotifications, notifications);
      }
    } else {
      const approvedRoleTitle = selectedTier === 'director' ? 'Director' : 'Division Manager';
      const notif: Notification = {
        id: `notif-${Date.now()}`,
        userId: req.staffId,
        text: `Leave approval progress: ${currentUser?.name} signed off as ${approvedRoleTitle}. Awaiting remaining approval.`,
        type: 'system',
        read: false,
        timestamp: new Date(),
        link: 'hr'
      };
      await writeData('notifications', notif.id, notif, setNotifications, notifications);
    }
  };

  const handleAddLeave = async (newLeave: Partial<LeaveRequest>) => {
    if (!currentUser) return;
    const targetStaff = staffList.find(s => s.id === (newLeave.staffId || currentUser.id)) || currentUser;
    const dept = newLeave.department || targetStaff.department || currentUser.department || 'General';
    const req: LeaveRequest = {
      id: `lr-${Date.now()}`,
      staffId: targetStaff.id,
      staffName: targetStaff.name,
      department: dept,
      staffRole: targetStaff.role,
      staffEmail: targetStaff.email,
      type: newLeave.type || 'Annual',
      startDate: newLeave.startDate || new Date(),
      endDate: newLeave.endDate || new Date(),
      status: 'Pending',
      reason: newLeave.reason || 'Absence authorization request',
      timestamp: new Date(),
      
      // Automatic capture of applicant identity and timestamp
      appliedBy: currentUser.name,
      appliedById: currentUser.id,
      appliedByRole: currentUser.role,
      appliedByDepartment: currentUser.department,
      appliedByEmail: currentUser.email,
      appliedAt: new Date(),

      assignedWorkloadToId: newLeave.assignedWorkloadToId,
      assignedWorkloadToName: newLeave.assignedWorkloadToName,
      assignedWorkloadToRole: newLeave.assignedWorkloadToRole
    };
    await writeData('leaves', req.id, req, setLeaveRequests, leaveRequests);

    // Notify Workload Handover Assignee
    if (req.assignedWorkloadToId) {
      const assigneeNotif: Notification = {
        id: `notif-${Date.now()}-assigned`,
        userId: req.assignedWorkloadToId,
        text: `Workload Handover Assigned: ${req.staffName} has selected you to cover their duties during upcoming ${req.type} leave (${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}).`,
        type: 'system',
        read: false,
        timestamp: new Date(),
        link: 'hr'
      };
      await writeData('notifications', assigneeNotif.id, assigneeNotif, setNotifications, notifications);
    }

    // Notify Division Managers, Directors, HR and Admins
    const approvers = staffList.filter(s => {
      const r = (s.role || '').toLowerCase();
      const d = (s.department || '').toLowerCase();
      const isDirector = d.includes('director') || r.includes('director') || r === 'super admin' || r === 'admin' || r === 'general manager' || r === 'gm';
      const isMyDeptManager = (r === 'management' || r.includes('lead') || r.includes('manager')) && d === dept.toLowerCase();
      return isDirector || isMyDeptManager || r === 'hr';
    });

    for (const approver of approvers) {
      if (approver.id !== currentUser.id && approver.id !== req.assignedWorkloadToId) {
        const notif: Notification = {
          id: `notif-${Date.now()}-${approver.id}`,
          userId: approver.id,
          text: `Leave approval required: ${req.staffName} (${dept}) requested ${req.type} leave (Duty Coverage: ${req.assignedWorkloadToName || 'Unassigned'}). Two approvals required (Division Manager & Director).`,
          type: 'system',
          read: false,
          timestamp: new Date(),
          link: 'hr'
        };
        await writeData('notifications', notif.id, notif, setNotifications, notifications);
      }
    }
  };

  const handleDeleteLeave = async (requestId: string) => {
    await deleteData('leaves', requestId, setLeaveRequests, leaveRequests);
  };

  const handleNotifyStaff = async (staffIds: string[], text: string) => {
    for (const sid of staffIds) {
      const notif: Notification = {
        id: `notif-${Date.now()}-${sid}`,
        userId: sid,
        text,
        type: 'mention',
        read: false,
        timestamp: new Date(),
        link: 'calendar'
      };
      await writeData('notifications', notif.id, notif, setNotifications, notifications);
    }
  };

  const handleUpdateStaffPermissions = async (staffId: string, permissions: any) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;
    const updated = { ...staff, permissions };
    await writeData('staff', staffId, updated, setStaffList, staffList);
    if (currentUser?.id === staffId) {
      setCurrentUser(updated);
    }
    // Sync permissions to Supabase employee profile
    saveOrUpdateUserProfile(updated).catch(err => console.debug('Sync permissions notice:', err));
  };

  const PROJECT_TYPE_NODES = [
    { type: 'Annual Reports', icon: FileText, desc: 'Corporate publishing protocols' },
    { type: 'Advertising', icon: RadioTower, desc: 'Campaign logic & outreach' },
    { type: 'Podcast Studio', icon: Mic, desc: 'Audio synchronization' },
    { type: 'Public Relations', icon: Globe, desc: 'Reputation management nodes' },
    { type: 'Digital & Media Strategy', icon: Zap, desc: 'Web & social intelligence' },
    { type: 'Event Management', icon: Target, desc: 'Live operational execution' },
    { type: 'Production House', icon: Video, desc: 'Visual artifact generation' },
  ];

  const normRole = (currentUser?.role || '').toLowerCase();
  const normDept = (currentUser?.department || '').toLowerCase();
  const isSuperAdmin = normRole === 'super admin' || currentUser?.role === Role.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || normRole === 'admin' || currentUser?.role === Role.ADMIN;
  const isGM = normRole === 'general manager' || normRole === 'gm' || currentUser?.role === Role.GM;
  const isDirector = normRole.includes('director') || normDept.includes('director');
  const isAccounts = normRole === 'accounts' || currentUser?.role === Role.ACCOUNTS || normDept === 'finance';
  const isAE = normRole === 'account executive' || currentUser?.role === Role.AE;
  const isHR = normRole === 'hr' || currentUser?.role === Role.HR;
  const isManager = normRole === 'management' || currentUser?.role === Role.MANAGEMENT || normRole.includes('lead') || normRole.includes('manager') || normDept.includes('management');

  // Rule: Only admins, GM or finance person have access to finance
  const canViewFinance = isSuperAdmin || isAdmin || isGM || isAccounts || !!currentUser?.permissions?.canViewFinance;
  // Rule: Projects should only be visible to admins, managers, AEs and Finance
  const canViewProjects = isSuperAdmin || isAdmin || isGM || isManager || isAE || isAccounts || !!currentUser?.permissions?.canViewProjects;

  // Rule: New campaign can be created ONLY by Super Admin and Admin
  const canCreateCampaign = isSuperAdmin || isAdmin;

  // Rule: Theme settings & color customizer should be accessed ONLY by Super Admin and Admin
  const canAccessSettings = isSuperAdmin || isAdmin;
  const canAccessDailyReportSettings = isSuperAdmin || isAdmin || isGM || isDirector || isManager;
  // Rule: Access Control & Employee Management console accessible to Super Admin and Admin
  const canAccessAccessControl = isSuperAdmin || isAdmin;

  const refreshAccessRequests = useCallback(async () => {
    try {
      const reqs = await loadAllAccessRequests();
      setAccessRequests(reqs);
    } catch (e) {
      console.debug('Error loading access requests:', e);
    }
  }, []);

  useEffect(() => {
    if (currentUser && canAccessAccessControl) {
      refreshAccessRequests();
    }
  }, [currentUser, canAccessAccessControl, refreshAccessRequests]);

  // Automated 7:00 PM EOD Daily Reporting Scheduler
  useEffect(() => {
    const checkDailyReportSchedule = async () => {
      if (!currentUser) return;
      const config = getStoredDailyReportConfig();
      if (!config.enabled) return;

      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayDateStr = now.toISOString().split('T')[0];

      const targetTime = config.scheduleTime || '19:00';

      if (currentTimeStr >= targetTime && config.lastCompiledDate !== todayDateStr) {
        try {
          const result = await dispatchDailyReport({
            config,
            projects,
            todos,
            staffList,
            triggeredBy: 'SYSTEM_DAEMON_7PM'
          });

          if (isSuperAdmin || isAdmin || isGM || isDirector || isManager) {
            const adminNotif: Notification = {
              id: `daily-report-alert-${Date.now()}`,
              userId: currentUser.id,
              text: `[AUTOMATED EOD REPORT] Daily report compiled and emailed to leadership (${result.recipientsCount} recipients).`,
              type: 'system',
              read: false,
              timestamp: new Date(),
              link: 'dashboard'
            };
            writeData('notifications', adminNotif.id, adminNotif, setNotifications, notifications);
          }
        } catch (err) {
          console.error('Automated 7:00 PM daily report compilation error:', err);
        }
      }
    };

    checkDailyReportSchedule();
    const interval = setInterval(checkDailyReportSchedule, 30000);
    return () => clearInterval(interval);
  }, [currentUser, projects, todos, staffList]);

  // Rule: Management buttons (Directives Simulator) displayed ONLY for Managers / GM / Directors / Admins / Super Admins
  const canViewManagerButtons = isSuperAdmin || isAdmin || isGM || isDirector || isManager;

  // Rule: Workload dashboard page access for AE / managers / admins / super admins / general managers
  const canAccessWorkload = isSuperAdmin || isAdmin || isGM || isManager || isAE || !!currentUser?.permissions?.canViewWorkload;

  // Rule: Managers have access to only their departments. Admins and GM have full access.
  const accessibleProjects = useMemo(() => {
    if (!canViewProjects) return [];
    if (isSuperAdmin || isAdmin || isGM || currentUser?.permissions?.canViewAllProjects) {
      return projects;
    }
    if (isManager && currentUser?.department) {
      const dept = currentUser.department.toLowerCase();
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
  }, [projects, canViewProjects, isSuperAdmin, isAdmin, isGM, isManager, currentUser?.permissions, currentUser?.department, staffList]);

  const getViewMeta = () => {
    switch (view) {
      case 'dashboard':
        return {
          badge: 'PU',
          title: 'PULSE ANALYTICS',
          tag: 'PIPELINE ACTIVE',
          subtitle: 'Unmask True Revenue Attribution & Creative Pipeline'
        };
      case 'calendar':
        return {
          badge: 'CA',
          title: 'MONTHLY & GOOGLE CALENDAR',
          tag: 'TEMPORAL MATRIX',
          subtitle: 'Synchronized Google Calendar Events, Colleague Tagging & Deliverables'
        };
      case 'access':
        return {
          badge: 'AC',
          title: 'ACCESS CONTROL CONSOLE',
          tag: 'SUPER ADMIN ONLY',
          subtitle: 'Granular Role-Based Permissions, Scoping & Privacy Enforcements'
        };
      case 'procedures':
        return {
          badge: 'PR',
          title: 'PROCEDURES MATRIX',
          tag: 'SYSTEM COMPLIANT',
          subtitle: 'Company-Wide Standard Operating Protocols & Quality Gates'
        };
      case 'registry':
        return {
          badge: 'JR',
          title: 'JOB REGISTRY',
          tag: 'NODES ACTIVE',
          subtitle: 'Master Strategic Deployment & Job Code Directory'
        };
      case 'finance':
        return {
          badge: 'FN',
          title: 'FINANCE INTELLIGENCE',
          tag: 'FLOAT VERIFIED',
          subtitle: 'Revenue Attribution, Invoicing & Cash Float Management'
        };
      case 'staff':
        return {
          badge: 'TM',
          title: 'TEAM DIRECTORY',
          tag: 'ROSTER SYNCED',
          subtitle: 'Operational Personnel, Roles & Health Vault'
        };
      case 'clients':
        return {
          badge: 'CL',
          title: 'CLIENT PORTALS',
          tag: 'ACCOUNTS ACTIVE',
          subtitle: 'Corporate Client Accounts, POCs & Industry Portfolios'
        };
      case 'notes':
        return {
          badge: 'MN',
          title: 'MEETING INTELLIGENCE',
          tag: 'MINUTES LOGGED',
          subtitle: 'Action Items, Decision Logs & Client Servicing Notes'
        };
      case 'hr':
        return {
          badge: 'HR',
          title: 'HUMAN RESOURCES & LEAVE PORTAL',
          tag: 'PERSONNEL SYNCED',
          subtitle: 'Employee Absence Governance, Quotas, Approvals & Health Vault'
        };
      case 'workload':
        return {
          badge: 'WL',
          title: 'WORKLOAD & CAPACITY BALANCER',
          tag: 'RESOURCE OPTIMIZED',
          subtitle: 'Individual Task Allocations, Creative Swarm Radar & Bandwidth Balancing'
        };
      case 'detail':
        return {
          badge: 'CP',
          title: activeProject?.projectName?.toUpperCase() || 'CAMPAIGN PROTOCOL',
          tag: activeProject?.jobNumber || 'ACTIVE NODE',
          subtitle: `Client: ${activeProject?.clientName || 'Agency Partner'} // Status: ${activeProject?.status || 'In Progress'}`
        };
      default:
        return {
          badge: 'MW',
          title: 'MEDIAWIZE OPS',
          tag: 'SYSTEM ACTIVE',
          subtitle: 'Proprietary Creative Workflow Engine'
        };
    }
  };

  const viewMeta = getViewMeta();

  const navItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Intelligence', code: '01' },
      { id: 'calendar', label: 'Calendar', code: '02' }
    ];

    if (canViewProjects) {
      items.push({ id: 'registry', label: 'Job Reg', code: '03' });
    }

    if (canAccessWorkload) {
      items.push({ id: 'workload', label: 'Workload', code: '04' });
    }

    items.push({ id: 'procedures', label: 'Procedures', code: '05' });

    if (canViewFinance) {
      items.push({ id: 'finance', label: 'Analytics', code: '06' });
    }

    items.push({ id: 'staff', label: 'Team', code: '07' });
    items.push({ id: 'clients', label: 'Clients', code: '08' });
    items.push({ id: 'notes', label: 'Notes', code: '09' });
    items.push({ id: 'hr', label: 'HR', code: '10' });

    // Access control console for Super Admins and Admins
    if (canAccessAccessControl) {
      items.push({ id: 'access', label: 'Access Control', code: '11' });
    }

    return items;
  }, [canViewProjects, canAccessWorkload, canViewFinance, canAccessAccessControl]);

  if (!currentUser) return <Login onLogin={setCurrentUser} staffList={staffList} />;

  // Google Onboarding / Access Status Gates
  if (currentUser.accountStatus === 'pending') {
    return (
      <PendingApprovalScreen
        request={{
          email: currentUser.email,
          fullName: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
          requestedAt: currentUser.joinedDate ? new Date(currentUser.joinedDate).toISOString() : new Date().toISOString()
        }}
        onRefresh={async () => {
          try {
            const reqs = await loadAllAccessRequests();
            const found = reqs.find(r => r.email.toLowerCase() === currentUser.email.toLowerCase());
            if (found && found.status === 'approved') {
              const updated: StaffMember = {
                ...currentUser,
                accountStatus: 'approved',
                role: found.assignedRole || currentUser.role,
                department: found.assignedDepartment || currentUser.department
              };
              setCurrentUser(updated);
              localStorage.setItem('mw_current_user', JSON.stringify(updated));
            } else if (found && found.status === 'rejected') {
              const updated = { ...currentUser, accountStatus: 'rejected' as const };
              setCurrentUser(updated);
              localStorage.setItem('mw_current_user', JSON.stringify(updated));
            }
          } catch (e) {
            console.debug('Refresh status error:', e);
          }
        }}
        onSignOut={handleLogout}
      />
    );
  }

  if (currentUser.accountStatus === 'rejected') {
    return <RejectedAccessScreen email={currentUser.email} onSignOut={handleLogout} />;
  }

  if (currentUser.accountStatus === 'suspended') {
    return <SuspendedAccessScreen email={currentUser.email} onSignOut={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-[var(--jarvis-bg-dark)] text-white flex flex-col font-sans selection:bg-white selection:text-black overflow-hidden relative">
      {/* Dynamic JARVIS Ambient Floating Liquid Glass Orbs */}
      {jarvisTheme.ambientOrbs && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div 
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[120px] opacity-25 animate-orb-1"
            style={{ background: `radial-gradient(circle, var(--jarvis-primary) 0%, transparent 70%)` }}
          />
          <div 
            className="absolute top-1/3 -right-40 w-[550px] h-[550px] rounded-full blur-[130px] opacity-20 animate-orb-2"
            style={{ background: `radial-gradient(circle, var(--jarvis-secondary) 0%, transparent 70%)` }}
          />
          <div 
            className="absolute -bottom-40 left-1/4 w-[700px] h-[700px] rounded-full blur-[140px] opacity-20 animate-orb-3"
            style={{ background: `radial-gradient(circle, var(--jarvis-primary) 0%, transparent 70%)` }}
          />
        </div>
      )}

      {/* Holographic Scanline CRT Effect */}
      {jarvisTheme.scanlineEffect && (
        <div className="fixed inset-0 pointer-events-none z-[80] opacity-[0.035] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
      )}

      <div ref={mainScrollRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar relative z-10 transition-all duration-300">
        
        {/* Precision Dual-Layer Header matching JARVIS liquid glass specification */}
        <header className="fixed top-0 left-0 right-0 z-[60] liquid-glass border-b border-[var(--jarvis-border)] transition-all">
          {/* Top Row: System telemetry & primary nav */}
          <div className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-black/40 gap-4">
            <div className="flex items-center gap-6 shrink-0">
              <div className="cursor-pointer group" onClick={() => handleNav('dashboard')}>
                <div className="font-mono text-[9px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] leading-none mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-ping" />
                  <span>PROPRIETARY ECOSYSTEM // JARVIS V4.0.2</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg sm:text-xl tracking-tight uppercase text-white font-heading">MEDIAWIZE</span>
                  <span className="font-light text-lg sm:text-xl tracking-widest text-[var(--jarvis-primary)] hud-glow-text">OPS</span>
                </div>
              </div>

              {/* Status pill tag */}
              <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 bg-black/50 border border-[var(--jarvis-border)] rounded-full text-[10px] font-mono text-neutral-300 shadow-[0_0_10px_rgba(var(--jarvis-primary-rgb),0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] shadow-[0_0_8px_var(--jarvis-primary)] animate-pulse"></span>
                <span>{jarvisTheme.name.toUpperCase()}</span>
              </div>

              {/* Live Database Sync Badge */}
              {isSupabaseEnabled && (
                <button
                  type="button"
                  onClick={handleSyncAllToDatabase}
                  disabled={isSyncingDb}
                  title="Click to force-sync all application records with Supabase database"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-400 rounded-full text-[10px] font-mono text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
                >
                  <Database size={11} className={isSyncingDb ? "animate-spin text-emerald-300" : "text-emerald-400"} />
                  <span>{isSyncingDb ? 'SYNCING...' : 'DB // LIVE'}</span>
                </button>
              )}
            </div>

            {/* Center Numbered Navigation */}
            <nav className="hidden xl:flex items-center gap-6">
              {navItems.map(nav => {
                const isActive = view === nav.id;
                return (
                  <button
                    key={nav.id}
                    onClick={() => {
                      handleNav(nav.id as any);
                      playJarvisSound('click', !jarvisTheme.audioFeedback);
                    }}
                    className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider transition-all py-1 ${
                      isActive 
                        ? 'text-[var(--jarvis-primary)] font-bold border-b-2 border-[var(--jarvis-primary)] hud-glow-text' 
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] opacity-70">{nav.code}</span>
                    <span>{nav.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Telemetry & Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden 2xl:block text-right font-mono text-[9px] text-neutral-400 leading-tight">
                <div className="text-[var(--jarvis-primary)]">[ 6.9271° N, 79.8612° E ]</div>
                <div className="text-neutral-400">NODE: COLOMBO 07</div>
              </div>

              {/* Hub Icon */}
              <button
                onClick={handleOpenHub}
                className="w-9 h-9 border border-[var(--jarvis-border)] bg-black/40 text-neutral-300 hover:text-white hover:border-[var(--jarvis-primary)] rounded-sm flex items-center justify-center transition-all relative"
                title="Communication Hub"
              >
                <MessageSquare size={16} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              </button>

              {/* Menu Drawer */}
              <button
                onClick={() => { setSidebarTab('menu'); setIsSidebarOpen(true); playJarvisSound('click', !jarvisTheme.audioFeedback); }}
                className="w-9 h-9 border border-[var(--jarvis-border)] bg-black/40 text-neutral-300 hover:text-white hover:border-[var(--jarvis-primary)] rounded-sm flex items-center justify-center transition-all"
                title="System Menu"
              >
                <Menu size={16} />
              </button>

              {/* User Avatar */}
              <div className="flex items-center gap-2 border border-[var(--jarvis-border)] bg-black/40 pl-1.5 pr-3 py-1 rounded-sm">
                <img src={currentUser.avatarUrl} className="w-6 h-6 rounded-sm object-cover border border-[var(--jarvis-primary)]/40" alt="" />
                <span className="hidden sm:inline font-mono text-[10px] text-neutral-300 uppercase">{currentUser.name.split(' ')[0]}</span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-9 h-9 border border-neutral-800 bg-black/40 text-neutral-400 hover:text-rose-400 hover:border-rose-900/50 rounded-sm flex items-center justify-center transition-all"
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Subheader Row: Module title & Switch Brief control */}
          <div className="h-14 px-4 sm:px-8 bg-black/40 border-t border-[var(--jarvis-border)]/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 jarvis-btn-primary text-black font-black text-xs flex items-center justify-center rounded-sm shrink-0 shadow-[0_0_12px_rgba(var(--jarvis-primary-rgb),0.4)]">
                {viewMeta.badge}
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white uppercase truncate font-heading">
                  {viewMeta.title}
                </h2>
                <span className="px-2 py-0.5 bg-[var(--jarvis-primary)] text-black font-black text-[9px] uppercase tracking-wider rounded-none shrink-0 shadow-[0_0_10px_rgba(var(--jarvis-primary-rgb),0.3)]">
                  {viewMeta.tag}
                </span>
                <span className="hidden md:inline text-xs text-neutral-300 font-medium truncate">
                  {viewMeta.subtitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest hidden lg:inline">
                SWITCH BRIEF:
              </span>
              <div ref={briefDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsBriefSearchOpen(prev => !prev)}
                  className="bg-[#12141a] border border-neutral-700 hover:border-neutral-500 text-white font-mono text-xs px-3 py-1.5 rounded-sm outline-none flex items-center justify-between gap-2 w-[180px] sm:w-[260px] text-left transition-colors cursor-pointer"
                  title="Search & Switch Brief"
                  aria-expanded={isBriefSearchOpen}
                >
                  <div className="truncate flex-1">
                    {activeProject ? (
                      <span className="font-bold text-white uppercase text-[11px]">
                        {activeProject.projectName} <span className="text-neutral-400 font-normal">({activeProject.clientName})</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400 text-[11px]">SELECT BRIEF / CAMPAIGN...</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-400 shrink-0">
                    <Search size={12} />
                    <ChevronDown size={13} className={`transition-transform duration-200 ${isBriefSearchOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Searchable Dropdown Popover */}
                {isBriefSearchOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-[280px] sm:w-[350px] bg-[#0c0d12] border border-neutral-700 rounded-sm shadow-2xl z-[90] overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-mono">
                    {/* Search Input Box */}
                    <div className="p-2 border-b border-neutral-800 bg-[#12141a] flex items-center gap-2">
                      <Search size={13} className="text-neutral-400 shrink-0" />
                      <input
                        ref={briefSearchInputRef}
                        type="text"
                        value={briefSearchQuery}
                        onChange={(e) => setBriefSearchQuery(e.target.value)}
                        placeholder="SEARCH CAMPAIGN, CLIENT, JOB..."
                        className="w-full bg-transparent text-white text-xs uppercase placeholder:text-neutral-500 outline-none"
                      />
                      {briefSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setBriefSearchQuery('')}
                          className="text-neutral-400 hover:text-white p-0.5 cursor-pointer"
                          title="Clear search query"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Briefs List */}
                    <div className="max-h-[260px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                      {/* Option to clear selection & return to overview */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProjectId(null);
                          setView('dashboard');
                          setIsBriefSearchOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-sm text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          !activeProjectId
                            ? 'bg-white text-black font-bold'
                            : 'text-neutral-400 hover:bg-[#181a24] hover:text-white'
                        }`}
                      >
                        <span className="uppercase text-[11px] tracking-wider">ALL BRIEFS // DASHBOARD</span>
                        {!activeProjectId && <span className="text-[9px] font-black uppercase px-1 bg-black text-white">ACTIVE</span>}
                      </button>

                      <div className="h-px bg-neutral-800/80 my-1" />

                      {filteredBriefs.length === 0 ? (
                        <div className="py-6 text-center text-neutral-500 text-[11px] uppercase tracking-wider">
                          No matching campaigns found
                        </div>
                      ) : (
                        filteredBriefs.map(p => {
                          const isSelected = activeProjectId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setActiveProjectId(p.id);
                                setView('detail');
                                setIsBriefSearchOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-sm text-xs transition-colors group flex flex-col gap-0.5 border cursor-pointer ${
                                isSelected
                                  ? 'bg-[#181a24] border-neutral-600 text-white'
                                  : 'border-transparent hover:bg-[#14161f] text-neutral-300 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold uppercase tracking-tight truncate text-white">
                                  {p.projectName}
                                </span>
                                <span className="text-[9px] font-mono text-neutral-400 shrink-0">
                                  {p.jobNumber || 'ACTIVE'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-400">
                                <span className="truncate">{p.clientName}</span>
                                <span className="text-[9px] uppercase px-1.5 py-0.2 bg-[#090a0d] border border-neutral-800 rounded-xs text-neutral-300 shrink-0">
                                  {p.status || 'Active'}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              {canCreateCampaign && (
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="w-8 h-8 border border-neutral-700 bg-[#12141a] text-white hover:bg-neutral-800 flex items-center justify-center rounded-sm text-xs transition-colors cursor-pointer"
                  title="Initialize New Campaign"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 pt-32 px-4 sm:px-8 pb-16 w-full max-w-[1920px] mx-auto">
          {view === 'dashboard' && (
            <Dashboard 
              projects={accessibleProjects} 
              onSelectProject={(p) => { setActiveProjectId(p.id); setView('detail'); }} 
              onNewProject={() => setIsNewProjectModalOpen(true)} 
              currentUser={currentUser} 
              todos={todos} 
              onToggleTodo={handleToggleTodo} 
              onAddTodo={handleAddTodoItem} 
              onUpdateTodo={(todo) => writeData('todos', todo.id, todo, setTodos, todos)}
              onDeleteTodo={(id) => deleteData('todos', id, setTodos, todos)}
              staffList={staffList} 
              events={events} 
              onAddEvent={(ev) => writeData('events', ev.id, ev, setEvents, events)} 
              onUpdateEvent={(ev) => writeData('events', ev.id, ev, setEvents, events)} 
              onDeleteEvent={(id) => deleteData('events', id, setEvents, events)}
              onUpdatePayment={handleUpdatePayment} 
              pettyCash={pettyCash} 
              clientList={clientList} 
              onSendMessage={handleSendMessage} 
              leaveRequests={leaveRequests}
              onUpdateLeave={handleUpdateLeave}
              onUpdateProject={handleUpdateProject}
              onNavigateToHR={() => handleNav('hr')}
              onNavigateToWorkload={() => handleNav('workload')}
              onOpenDailyReportSettings={() => setIsDailyReportSettingsOpen(true)}
            />
          )}

          {view === 'workload' && (
            canAccessWorkload ? (
              <WorkloadDashboard 
                projects={accessibleProjects} 
                staffList={staffList} 
                currentUser={currentUser} 
                onUpdateProject={handleUpdateProject} 
                onAddNotification={(notif) => writeData('notifications', notif.id, notif, setNotifications, notifications)}
                onSelectProject={(p) => { setActiveProjectId(p.id); setView('detail'); }} 
                onAssignTaskToTodo={handleSyncTaskAssignmentToTodo}
              />
            ) : (
              <div className="p-12 text-center bg-[#0e0f14] border border-rose-500/30 rounded-sm space-y-4 max-w-lg mx-auto mt-12">
                <ShieldAlert size={48} className="text-rose-500 mx-auto" />
                <h2 className="text-xl font-black uppercase text-white font-heading">Workload Restricted</h2>
                <p className="font-mono text-xs text-neutral-400">
                  Capacity management and individual task queue allocations are restricted exclusively to Account Executives (AE), Department Managers, General Managers, and Administrators.
                </p>
                <button 
                  onClick={() => handleNav('dashboard')}
                  className="px-4 py-2 bg-white text-black font-mono text-xs font-bold uppercase rounded-sm hover:bg-neutral-200 transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            )
          )}

          {view === 'calendar' && (
            <MonthlyCalendar 
              events={events} 
              projects={accessibleProjects} 
              staffList={staffList} 
              leaveRequests={leaveRequests} 
              onAddEvent={(ev) => writeData('events', ev.id, ev, setEvents, events)} 
              onUpdateEvent={(ev) => writeData('events', ev.id, ev, setEvents, events)} 
              onDeleteEvent={(id) => deleteData('events', id, setEvents, events)}
              currentUser={currentUser} 
              onNotifyStaff={handleNotifyStaff}
            />
          )}

          {view === 'access' && (
            canAccessAccessControl ? (
              <div className="space-y-6">
                {/* Header Navigation between Employee Access & Permissions */}
                <div className="bg-[#0e0f14] border border-neutral-800 rounded-sm p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white">
                      <ShieldCheck size={22} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-heading font-black text-sm tracking-wider uppercase text-white">
                          Access Control & Employee Management
                        </h2>
                        <span className="px-2 py-0.5 rounded-sm bg-neutral-800 border border-neutral-700 text-[10px] font-mono text-neutral-300">
                          {isSuperAdmin ? 'SUPER ADMIN PRIVILEGES' : 'ADMIN PRIVILEGES'}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-neutral-400">
                        Review Google onboarding requests, activate employees, assign departments & roles, and adjust permissions.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAccessSubTab('employees')}
                      className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 cursor-pointer ${
                        accessSubTab === 'employees'
                          ? 'bg-white text-black font-bold shadow-md'
                          : 'bg-[#12141a] text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      <Users size={14} />
                      Employees & Onboarding
                      {accessRequests.filter(r => r.status === 'pending').length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-black font-black leading-none">
                          {accessRequests.filter(r => r.status === 'pending').length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccessSubTab('permissions')}
                      className={`px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 cursor-pointer ${
                        accessSubTab === 'permissions'
                          ? 'bg-white text-black font-bold shadow-md'
                          : 'bg-[#12141a] text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      <Sliders size={14} />
                      Permission Matrix
                    </button>
                  </div>
                </div>

                {accessSubTab === 'employees' ? (
                  <EmployeeAccessControl
                    requests={accessRequests}
                    staffList={staffList}
                    currentUser={currentUser}
                    onRefreshData={refreshAccessRequests}
                    onUpdateStaffList={async (updated) => {
                      setStaffList(updated);
                      saveLocalData('staff', updated);
                      if (isSupabaseEnabled && supabase) {
                        try {
                          await supabase.from('app_data').upsert({
                            key: 'dataset_staff',
                            value: updated,
                            updated_at: new Date().toISOString()
                          });
                        } catch (err) {
                          console.debug('Sync staff error:', err);
                        }
                      }
                    }}
                  />
                ) : (
                  <AccessManagement
                    staffList={staffList}
                    onUpdateStaffPermissions={handleUpdateStaffPermissions}
                    currentUser={currentUser}
                    departments={departments}
                  />
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-[#0e0f14] border border-rose-500/30 rounded-sm space-y-4 max-w-lg mx-auto mt-12">
                <ShieldAlert size={48} className="text-rose-500 mx-auto" />
                <h2 className="text-xl font-black uppercase text-white font-heading">Access Control Restricted</h2>
                <p className="font-mono text-xs text-neutral-400">
                  Access Control is exclusive to Administrator and Super Admin authorization. You do not have clearance to modify security matrices.
                </p>
                <button 
                  onClick={() => handleNav('dashboard')}
                  className="px-4 py-2 bg-white text-black font-mono text-xs font-bold uppercase rounded-sm hover:bg-neutral-200 transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            )
          )}

          {view === 'detail' && activeProject && (
            <ProjectDetail 
              project={activeProject} 
              onBack={() => setView('dashboard')} 
              onUpdateProject={handleUpdateProject} 
              staffList={staffList} 
              serviceCatalog={serviceCatalog} 
              onUpdateCatalog={setServiceCatalog} 
              currentUser={currentUser} 
              channels={channels} 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              onSelectChannel={setCurrentChannelId} 
              activeChannelId={currentChannelId || activeProject.channelId || 'ch-1'} 
              agencyProfile={agencyProfile} 
              onUpdatePayment={handleUpdatePayment} 
              onAddNotification={(notif) => {
                const nid = `notif-${Date.now()}`;
                writeData('notifications', nid, { ...notif, id: nid, timestamp: new Date(), read: false }, setNotifications, notifications);
              }} 
              todos={todos}
              onUpdateTodo={(todo) => writeData('todos', todo.id, todo, setTodos, todos)}
              onAssignTaskToTodo={handleSyncTaskAssignmentToTodo}
            />
          )}

          {view === 'registry' && (
            <JobRegistry 
              projects={accessibleProjects} 
              onSelectProject={(p) => { setActiveProjectId(p.id); setView('detail'); }} 
              onNewProjectTrigger={() => setIsNewProjectModalOpen(true)}
              currentUser={currentUser}
              onUpdateProject={handleUpdateProject}
              onAddNotification={(notif) => writeData('notifications', notif.id, notif, setNotifications, notifications)}
              onAddMeetingNote={(note) => writeData('notes', note.id, note, setMeetingNotes, meetingNotes)}
            />
          )}

          {view === 'procedures' && (
            <Procedures 
              procedures={procedures}
              currentUser={currentUser}
              staffList={staffList}
              onUpdateProcedure={(updated) => writeData('procedures', updated.id, updated, setProcedures, procedures)}
              onAddProcedure={(newProc) => writeData('procedures', newProc.id, newProc, setProcedures, procedures)}
              onDeleteProcedure={(id) => deleteData('procedures', id, setProcedures, procedures)}
              onNavigate={(targetView) => handleNav(targetView as ViewState)}
            />
          )}

          {view === 'staff' && (
            <StaffManagement 
              staffList={staffList} 
              onAddStaff={(s) => writeData('staff', s.id, s, setStaffList, staffList)} 
              onUpdateStaff={(s) => writeData('staff', s.id, s, setStaffList, staffList)} 
              onDeleteStaff={(id) => deleteData('staff', id, setStaffList, staffList)} 
              currentUserRole={currentUser.role} 
              departments={departments} 
              roles={roles} 
              onUpdateDepartments={setDepartments} 
              onUpdateRoles={setRoles} 
              agencyProfile={agencyProfile} 
              onUpdateAgencyProfile={setAgencyProfile}
            />
          )}

          {view === 'clients' && (
            <ClientManagement 
              clientList={clientList} 
              onAddClient={(c) => writeData('clients', c.id, c, setClientList, clientList)} 
              onUpdateClient={(c) => writeData('clients', c.id, c, setClientList, clientList)} 
              onDeleteClient={(id) => deleteData('clients', id, setClientList, clientList)} 
              currentUserRole={currentUser.role}
              currentUser={currentUser}
            />
          )}

          {view === 'finance' && (
            canViewFinance ? (
              <FinanceDashboard 
                projects={accessibleProjects} 
                pettyCash={pettyCash} 
                onUpdateProject={handleUpdateProject} 
                onAddPettyCash={(tx) => writeData('pettyCash', tx.id, tx, setPettyCash, pettyCash)} 
                staffList={staffList} 
              />
            ) : (
              <div className="p-12 text-center bg-[#0e0f14] border border-rose-500/30 rounded-sm space-y-4 max-w-lg mx-auto mt-12">
                <DollarSign size={48} className="text-rose-500 mx-auto" />
                <h2 className="text-xl font-black uppercase text-white font-heading">Finance Restricted</h2>
                <p className="font-mono text-xs text-neutral-400">
                  Financial analytics, cash float, and revenue matrices are restricted exclusively to Admins and Finance personnel.
                </p>
                <button 
                  onClick={() => handleNav('dashboard')}
                  className="px-4 py-2 bg-white text-black font-mono text-xs font-bold uppercase rounded-sm hover:bg-neutral-200 transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            )
          )}

          {view === 'hr' && (
            <HRDashboard 
              staffList={staffList} 
              leaveRequests={leaveRequests} 
              onUpdateLeave={handleUpdateLeave} 
              currentUser={currentUser} 
              onAddLeave={handleAddLeave}
              onDeleteLeave={handleDeleteLeave}
            />
          )}

          {view === 'notes' && (
            <MeetingNotes 
              notes={meetingNotes}
              onAddNote={(note) => writeData('notes', note.id, note, setMeetingNotes, meetingNotes)}
              onDeleteNote={(id) => deleteData('notes', id, setMeetingNotes, meetingNotes)}
              onUpdateNote={(note) => writeData('notes', note.id, note, setMeetingNotes, meetingNotes)}
              projects={projects}
              staffList={staffList}
              currentUserName={currentUser.name}
              currentUserId={currentUser.id}
            />
          )}
        </main>
        <Footer agencyProfile={agencyProfile} meetingNotes={meetingNotes} projects={projects} onAddNote={(text, pid, pname, saved) => writeData('notes', `note-${Date.now()}`, { id: `note-${Date.now()}`, title: text.split('\n')[0].substring(0, 30), text, projectId: pid, projectName: pname, isSavedToWize: saved, timestamp: new Date(), author: currentUser.name, category: 'Internal' }, setMeetingNotes, meetingNotes)} onDeleteNote={(id) => deleteData('notes', id, setMeetingNotes, meetingNotes)} currentUserName={currentUser.name} />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
           <div className="ml-auto w-full max-w-[500px] bg-[#0b0c10] border-l border-neutral-800 text-white h-full shadow-2xl relative flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
              <div className="bg-[#0e0f14] pt-8 px-6 pb-5 shrink-0 border-b border-neutral-800">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-[0.25em]">
                      PROPRIETARY ECOSYSTEM // WIZE OS
                    </div>
                    <h2 className="text-white font-black uppercase tracking-tight text-lg font-heading">
                      COMMAND CONSOLE
                    </h2>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors">
                    <X size={20}/>
                  </button>
                </div>
                <div className="flex items-center gap-1 bg-[#14151c] p-1 rounded border border-neutral-800">
                    {[{ id: 'menu', icon: Menu, label: 'Menu' }, { id: 'focus', icon: Target, label: 'Focus' }, { id: 'hub', icon: MessageSquare, label: 'Hub' }].map(tab => (
                      <button key={tab.id} onClick={() => setSidebarTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-[10px] font-mono uppercase tracking-wider transition-all ${sidebarTab === tab.id ? 'bg-white text-black font-black shadow-md' : 'text-neutral-400 hover:text-white'}`}>
                        <tab.icon size={14} /> {tab.label}
                      </button>
                    ))}
                </div>
              </div>
              <div className={`flex-1 overflow-y-auto bg-[#0b0c10] custom-scrollbar ${sidebarTab === 'hub' ? 'p-0' : 'p-6'}`}>
                  {sidebarTab === 'menu' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* JARVIS Theme & System Settings Action in Menu - Restricted to Super Admin and Admin */}
                        {canAccessSettings && (
                          <button 
                            onClick={() => {
                              setIsSettingsOpen(true);
                              setIsSidebarOpen(false);
                              playJarvisSound('sonar', !jarvisTheme.audioFeedback);
                            }}
                            className="w-full flex items-center justify-between p-4 rounded-sm border border-[var(--jarvis-primary)] bg-[rgba(var(--jarvis-primary-rgb),0.1)] text-white shadow-[0_0_20px_-3px_rgba(var(--jarvis-primary-rgb),0.35)] transition-all text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-8 h-8 rounded-sm bg-black/60 border border-[var(--jarvis-primary)] flex items-center justify-center text-[var(--jarvis-primary)] group-hover:rotate-90 transition-transform shadow-[0_0_10px_rgba(var(--jarvis-primary-rgb),0.5)]">
                                <Sliders size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-xs uppercase tracking-wider text-[var(--jarvis-primary)] font-heading flex items-center gap-2">
                                  <span>JARVIS THEME & OPTICS</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-ping" />
                                </div>
                                <div className="text-[10px] text-neutral-300 truncate font-mono">
                                  Calibrate Colors // {jarvisTheme.name}
                                </div>
                              </div>
                            </div>
                            <Sparkles size={16} className="text-[var(--jarvis-primary)] animate-pulse shrink-0" />
                          </button>
                        )}

                        {/* Daily Report Settings Action in Menu - Accessible to Super Admin, Admin, GM, Directors & Managers */}
                        {canAccessDailyReportSettings && (
                          <button 
                            onClick={() => {
                              setIsDailyReportSettingsOpen(true);
                              setIsSidebarOpen(false);
                              playJarvisSound('sonar', !jarvisTheme.audioFeedback);
                            }}
                            className="w-full flex items-center justify-between p-4 rounded-sm border border-amber-500/60 bg-amber-950/20 text-white shadow-[0_0_20px_-3px_rgba(245,158,11,0.25)] hover:border-amber-400 transition-all text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-8 h-8 rounded-sm bg-black/60 border border-amber-500/60 flex items-center justify-center text-amber-400 group-hover:rotate-45 transition-transform shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                                <Clock size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-xs uppercase tracking-wider text-amber-400 font-heading flex items-center gap-2">
                                  <span>DAILY REPORT SETTINGS</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                </div>
                                <div className="text-[10px] text-neutral-300 truncate font-mono">
                                  7:00 PM Schedule & Executive Recipients
                                </div>
                              </div>
                            </div>
                            <Send size={15} className="text-amber-400 shrink-0" />
                          </button>
                        )}

                        {/* Database Telemetry & Cloud Sync Panel */}
                        {isSupabaseEnabled && (
                          <div className="p-4 rounded-sm border border-emerald-500/30 bg-emerald-950/20 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Database size={15} className="text-emerald-400" />
                                <span className="font-heading font-black text-xs uppercase tracking-wider text-white">
                                  SUPABASE CLOUD DATABASE
                                </span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded-xs bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono text-emerald-400">
                                ACTIVE
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-neutral-400">
                              <div className="bg-[#12141a] p-2 border border-neutral-800 rounded-xs">
                                <span className="text-neutral-500 block">CAMPAIGNS</span>
                                <span className="text-white font-bold">{projects.length} Registered</span>
                              </div>
                              <div className="bg-[#12141a] p-2 border border-neutral-800 rounded-xs">
                                <span className="text-neutral-500 block">CLIENTS</span>
                                <span className="text-white font-bold">{clientList.length} Portals</span>
                              </div>
                              <div className="bg-[#12141a] p-2 border border-neutral-800 rounded-xs">
                                <span className="text-neutral-500 block">PERSONNEL</span>
                                <span className="text-white font-bold">{staffList.length} Staff</span>
                              </div>
                              <div className="bg-[#12141a] p-2 border border-neutral-800 rounded-xs">
                                <span className="text-neutral-500 block">DIRECTIVES</span>
                                <span className="text-white font-bold">{todos.length} Todos</span>
                              </div>
                            </div>

                            {dbSyncMessage && (
                              <div className="p-2 bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] rounded-xs text-center">
                                {dbSyncMessage}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={handleSyncAllToDatabase}
                              disabled={isSyncingDb}
                              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-mono text-xs uppercase font-black tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                            >
                              <RefreshCw size={13} className={isSyncingDb ? "animate-spin" : ""} />
                              {isSyncingDb ? 'SYNCHRONIZING...' : 'FORCE DATABASE SYNC & BACKUP'}
                            </button>
                          </div>
                        )}

                        <div className="space-y-3">
                            <h3 className="font-mono text-[10px] uppercase text-neutral-400 tracking-[0.3em] px-1">System Modules</h3>
                            <div className="grid grid-cols-1 gap-2.5">
                                {[
                                    { id: 'dashboard', code: '01', icon: LayoutGrid, label: 'Pulse Intelligence', desc: 'Real-time telemetry & revenue', visible: true },
                                    { id: 'calendar', code: '02', icon: Calendar, label: 'Google & Monthly Calendar', desc: 'Sync events, tagging & video calls', visible: true },
                                    { id: 'registry', code: '03', icon: Briefcase, label: 'Job Reg', desc: 'Campaign codes & project registry', visible: canViewProjects },
                                    { id: 'workload', code: '04', icon: Target, label: 'Workload Balancer', desc: 'Staff task queues & capacity balance', visible: canAccessWorkload },
                                    { id: 'procedures', code: '05', icon: FileText, label: 'Procedures Matrix', desc: 'SOPs, quality gates & SLAs', visible: true },
                                    { id: 'finance', code: '06', icon: DollarSign, label: 'Analytics / Finance', desc: 'Cash float, advances & invoices', visible: canViewFinance },
                                    { id: 'staff', code: '07', icon: Users, label: 'Team Deployment', desc: 'Roster, load & health vault', visible: true },
                                    { id: 'clients', code: '08', icon: Building2, label: 'Client Portals', desc: 'Accounts & brand contacts', visible: true },
                                    { id: 'notes', code: '09', icon: StickyNote, label: 'Meeting Intelligence', desc: 'Decision minutes & action items', visible: true },
                                    { id: 'hr', code: '10', icon: Heart, label: 'HR & Personnel', desc: 'Leave tracking, approvals & roster', visible: true },
                                    { id: 'access', code: '11', icon: ShieldCheck, label: 'Access Control', desc: 'Admin & Super Admin security matrix & employee onboarding', visible: canAccessAccessControl }
                                ].filter(mod => mod.visible).map(mod => (
                                    <button 
                                        key={mod.id} 
                                        onClick={() => handleNav(mod.id as any)}
                                        className={`w-full flex items-center justify-between p-4 rounded-sm border transition-all text-left ${
                                          view === mod.id 
                                            ? 'bg-neutral-900 border-white text-white shadow-md' 
                                            : 'bg-[#101217] border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-[#14161d]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="font-mono text-xs text-neutral-400 font-bold shrink-0">{mod.code}</div>
                                            <div className="min-w-0">
                                              <div className="font-black text-xs uppercase tracking-wider text-white font-heading">{mod.label}</div>
                                              <div className="text-[10px] text-neutral-400 truncate">{mod.desc}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className={view === mod.id ? 'text-white' : 'text-neutral-400'} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                  )}
                  {sidebarTab === 'focus' && (
                    <div className="space-y-6">
                       <div className="space-y-3">
                          <h3 className="font-mono text-[10px] uppercase text-neutral-400 tracking-[0.3em]">Priority Directives</h3>
                          <form onSubmit={handleAddTodo} className="relative">
                             <input value={quickTodoText} onChange={e => setQuickTodoText(e.target.value)} placeholder="New operational directive..." className="w-full bg-[#12141a] border border-neutral-800 px-4 py-3 pr-12 text-xs font-semibold text-white outline-none rounded-sm focus:border-white transition-colors" />
                             <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-sm hover:bg-neutral-200"><Plus size={16}/></button>
                          </form>
                       </div>
                       <div className="space-y-2">
                          {sortedTodos.map(todo => (
                            <div key={todo.id} className={`flex items-center gap-3 p-3.5 rounded-sm border transition-all ${todo.completed ? 'bg-[#0f1014] border-neutral-800/60 opacity-50' : 'bg-[#12141a] border-neutral-800'}`}>
                                <button onClick={() => handleToggleTodo(todo.id)} className={`transition-all ${todo.completed ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'}`}>
                                   {todo.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>
                                <span className={`flex-1 font-mono text-xs uppercase ${todo.completed ? 'text-neutral-400 line-through' : 'text-neutral-200'}`}>{todo.text}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
                  {sidebarTab === 'hub' && (
                    <div className="h-full flex flex-col">
                      <CommunicationHub 
                        channels={channels} 
                        messages={messages} 
                        currentUser={currentUser} 
                        onSendMessage={handleSendMessage} 
                        onSelectChannel={setCurrentChannelId} 
                        activeChannelId={currentChannelId} 
                        staffList={staffList} 
                        onCreateChannel={handleCreateChannel} 
                      />
                    </div>
                  )}
              </div>
           </div>
        </div>
      )}
      
      {/* New Campaign / Project Modal matching the screenshot theme */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b0c0f] border border-neutral-800 w-full max-w-xl rounded-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-[#0e0f14]">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-[0.25em] mb-1">
                  PROPRIETARY ECOSYSTEM // REGISTRY INTEGRATION
                </div>
                <h3 className="text-xl font-black uppercase text-white tracking-tight font-heading">
                  Initialize Campaign Node
                </h3>
              </div>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-white rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!projectForm.name || !projectForm.client) return;
              handleAddProject(projectForm.name, projectForm.client, projectForm.type, newClientDetails);
            }} className="p-6 sm:p-7 space-y-6 bg-[#0a0b0e] border-t border-neutral-800/80">
              {/* Creator Auto-Captured Card */}
              <div className="p-4 bg-gradient-to-r from-emerald-950/20 via-[#10121a] to-[#12141c] border border-emerald-500/30 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                  <div className="relative shrink-0">
                    <img 
                      src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} 
                      alt={currentUser?.name || ''} 
                      className="w-11 h-11 rounded-sm border border-emerald-500/60 object-cover shadow-md" 
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0a0b0e] rounded-full flex items-center justify-center shadow-sm">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 mb-0.5">
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <ShieldCheck size={12} className="text-emerald-400" />
                        PROJECT CREATOR // AUTO-CAPTURED
                      </span>
                      <span className="text-[8px] font-mono px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xs uppercase">
                        LIVE SESSION
                      </span>
                    </div>
                    <div className="text-sm font-black text-white font-mono truncate flex items-center gap-2">
                      <span>{currentUser?.name || 'System Operator'}</span>
                      {currentUser?.staffId && (
                        <span className="text-[10px] bg-neutral-900 border border-neutral-700/80 text-neutral-300 px-1.5 py-0.5 rounded-xs font-mono font-normal">
                          {currentUser.staffId}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-neutral-400 truncate mt-0.5">
                      <span className="text-neutral-300">{currentUser?.role}</span> • Division: <span className="text-neutral-300">{currentUser?.department}</span>
                    </div>
                  </div>
                </div>

                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider shrink-0 sm:text-right border-t sm:border-t-0 sm:border-l border-neutral-800/80 pt-2 sm:pt-0 sm:pl-4 relative z-10">
                  <div className="text-neutral-500 text-[8px] flex items-center sm:justify-end gap-1">
                    <Lock size={9} className="text-emerald-400" />
                    AUDIT SIGNATURE
                  </div>
                  <div className="text-emerald-400 font-bold flex items-center sm:justify-end gap-1 mt-0.5">
                    <CheckCircle2 size={10} /> BOUND TO USER
                  </div>
                  <div className="text-[8px] text-neutral-500 mt-0.5">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • NO MANUAL OVERRIDE
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                  Campaign / Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="e.g. ANNUAL REPORT 2024/25 or Q3 REVENUE PUSH"
                  className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2.5 text-sm font-semibold text-white outline-none rounded-sm transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
                    Client Organization *
                  </label>
                  {projectForm.client.trim() && (
                    clientList.some(c => c.companyName.trim().toLowerCase() === projectForm.client.trim().toLowerCase()) ? (
                      <span className="font-mono text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-xs uppercase tracking-wider flex items-center gap-1">
                        <Check size={10} className="text-emerald-400" />
                        In Client Directory
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-xs uppercase tracking-wider flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        + Will Add to Client Directory
                      </span>
                    )
                  )}
                </div>
                <input
                  type="text"
                  required
                  list="registered-clients-list"
                  value={projectForm.client}
                  onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })}
                  placeholder="e.g. ALPHA CORP, GAMMA GLOBAL, or new client name"
                  className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2.5 text-sm font-semibold text-white outline-none rounded-sm transition-colors"
                />
                <datalist id="registered-clients-list">
                  {clientList.map(c => (
                    <option key={c.id} value={c.companyName}>
                      {c.industry ? `${c.industry} • Contact: ${c.contactPerson}` : c.contactPerson}
                    </option>
                  ))}
                </datalist>

                {/* Quick suggestions if client input is empty */}
                {clientList.length > 0 && !projectForm.client && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">Directory Clients:</span>
                    {clientList.slice(0, 4).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setProjectForm(prev => ({ ...prev, client: c.companyName }))}
                        className="text-[10px] font-mono bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white px-2 py-0.5 rounded-xs transition-colors"
                      >
                        {c.companyName}
                      </button>
                    ))}
                  </div>
                )}

                {/* If new client detected, show live preview banner and optional profile fields */}
                {projectForm.client.trim() && !clientList.some(c => c.companyName.trim().toLowerCase() === projectForm.client.trim().toLowerCase()) && (
                  <div className="mt-2.5 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xs space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-neutral-300 flex items-center gap-1.5">
                        <Building2 size={13} className="text-emerald-400 shrink-0" />
                        <span>
                          <strong className="text-emerald-400 font-semibold font-mono">"{projectForm.client.trim()}"</strong> will be added to the <strong>Client Directory</strong> automatically.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNewClientForm(prev => !prev)}
                        className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-2 whitespace-nowrap shrink-0"
                      >
                        {showNewClientForm ? 'Hide Details' : '+ Directory Details (Optional)'}
                      </button>
                    </div>

                    {showNewClientForm && (
                      <div className="pt-2.5 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[9px] font-mono text-neutral-400 uppercase mb-1">Contact Person</label>
                          <input
                            type="text"
                            value={newClientDetails.contactPerson}
                            onChange={(e) => setNewClientDetails(prev => ({ ...prev, contactPerson: e.target.value }))}
                            placeholder="e.g. John Doe / Director"
                            className="w-full bg-[#0a0b0e] border border-neutral-800 focus:border-neutral-600 px-2.5 py-1.5 text-xs text-white rounded-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-neutral-400 uppercase mb-1">Email</label>
                          <input
                            type="email"
                            value={newClientDetails.email}
                            onChange={(e) => setNewClientDetails(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="contact@company.com"
                            className="w-full bg-[#0a0b0e] border border-neutral-800 focus:border-neutral-600 px-2.5 py-1.5 text-xs text-white rounded-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-neutral-400 uppercase mb-1">Phone</label>
                          <input
                            type="tel"
                            value={newClientDetails.phone}
                            onChange={(e) => setNewClientDetails(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+94 77 123 4567"
                            className="w-full bg-[#0a0b0e] border border-neutral-800 focus:border-neutral-600 px-2.5 py-1.5 text-xs text-white rounded-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-neutral-400 uppercase mb-1">Industry</label>
                          <input
                            type="text"
                            value={newClientDetails.industry}
                            onChange={(e) => setNewClientDetails(prev => ({ ...prev, industry: e.target.value }))}
                            placeholder="e.g. Financial Services, Retail, Logistics"
                            className="w-full bg-[#0a0b0e] border border-neutral-800 focus:border-neutral-600 px-2.5 py-1.5 text-xs text-white rounded-xs outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                  Strategic Domain Classification *
                </label>
                <select
                  value={projectForm.type}
                  onChange={(e) => setProjectForm({ ...projectForm, type: e.target.value as ProjectType })}
                  className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2.5 text-sm font-semibold text-white outline-none rounded-sm transition-colors"
                >
                  {PROJECT_TYPE_NODES.map(p => (
                    <option key={p.type} value={p.type}>{p.type.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95"
                >
                  + Deploy Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JARVIS System & Theme Settings Modal - Restricted to Super Admin and Admin */}
      <JARVISSettingsModal
        isOpen={isSettingsOpen && canAccessSettings}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={jarvisTheme}
        onSaveTheme={handleSaveTheme}
      />

      {/* Daily Report Settings & 7:00 PM Scheduler Modal */}
      {currentUser && (
        <DailyReportSettingsModal
          isOpen={isDailyReportSettingsOpen && canAccessDailyReportSettings}
          onClose={() => setIsDailyReportSettingsOpen(false)}
          staffList={staffList}
          projects={projects}
          todos={todos}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default App;
