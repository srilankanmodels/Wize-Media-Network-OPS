
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Project, StaffMember, Role, PaymentUpdate, ServiceItem, Client, Todo, CalendarEvent, Channel, Message, Notification, AgencyProfile, LeaveRequest, PettyCashTransaction, ProjectType, Task, DEFAULT_DEPARTMENTS, DEFAULT_ROLES, MeetingNote, Procedure } from './types';
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
import WorkloadDashboard from './components/WorkloadDashboard';
import Footer from './components/Footer';
import FloatingAI from './components/FloatingAI';
import { db, isFirebaseEnabled } from './firebase';
import { doc, setDoc, onSnapshot, collection, updateDoc, addDoc, query, orderBy, limit, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { LogOut, Users, FileText, Hexagon, Building2, Bell, Clock, DollarSign, UserCircle, MessageSquare, ListTodo, X, Building, Zap, Target, CheckCircle2, Plus, Calendar, Timer, AlertCircle, Archive, LayoutGrid, Heart, ChevronRight, ChevronLeft, Search, Check, Trash2, StickyNote, Send, Link as LinkIcon, Bookmark, Briefcase, ChevronDown, CloudOff, Cloud, RefreshCw, Database, ServerCrash, ShieldCheck, HardDrive, Cpu, Bot, CheckCircle, Compass, Circle, Menu, ArrowRight, Layers, Radio, RadioTower, Video, Mic, Globe, ShieldAlert, Lock, BarChart2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

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
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>(isFirebaseEnabled ? 'cloud' : 'local');
  
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
  const sortedTodos = useMemo(() => currentUser ? todos.filter(t => t.userId === currentUser.id).sort((a, b) => { if (a.completed && !b.completed) return 1; if (!a.completed && b.completed) return -1; return 0; }) : [], [todos, currentUser]);
  const currentBalance = useMemo(() => pettyCash.reduce((sum, tx) => sum + (tx.type === 'Income' ? tx.amount : -tx.amount), 0), [pettyCash]);

  const writeData = async (col: string, id: string, data: any, localArraySetter?: any, currentArray?: any[]) => {
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
        saveLocalData(col, newArr);
        return newArr;
      });
    }
    if (storageMode === 'cloud' && isFirebaseEnabled && db) { 
      try { await setDoc(doc(db, col, id), data); } catch (err) { console.error(`Cloud write failure:`, err); } 
    }
  };

  const deleteData = async (col: string, id: string, localArraySetter?: any, currentArray?: any[]) => {
    if (localArraySetter) {
      localArraySetter((prev: any[]) => {
        const base = Array.isArray(prev) ? prev : (currentArray || []);
        const newArr = base.filter(item => String(item.id) !== String(id));
        saveLocalData(col, newArr);
        return newArr;
      });
    }
    if (storageMode === 'cloud' && isFirebaseEnabled && db) { 
      try { await deleteDoc(doc(db, col, id)); } catch (err) { console.error(`Cloud delete failure:`, err); } 
    }
  };

  const handleSendMessage = async (text: string, channelId: string) => {
    if (!currentUser) return;
    const userMessage: Message = { id: Date.now().toString(), channelId, text, senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatarUrl, timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveLocalData('messages', updatedMessages);
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

  const handleAddTodo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!quickTodoText.trim() || !currentUser) return;
    const newTodo = { id: Date.now().toString(), text: quickTodoText, completed: false, userId: currentUser.id };
    await writeData('todos', newTodo.id, newTodo, setTodos, todos);
    setQuickTodoText('');
  };

  const handleToggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo) { const updated = { ...todo, completed: !todo.completed }; await writeData('todos', id, updated, setTodos, todos); }
  };

  const handleLogout = () => { setCurrentUser(null); setView('dashboard'); setIsSidebarOpen(false); };

  const handleNav = (targetView: ViewState) => {
    setView(targetView);
    setActiveProjectId(null);
    setIsSidebarOpen(false);
  };

  const handleOpenHub = () => {
    setSidebarTab('hub');
    setIsSidebarOpen(true);
  };

  const handleUpdateLeave = async (requestId: string, status: 'Approved' | 'Rejected', reviewNote?: string) => {
    const req = leaveRequests.find(l => l.id === requestId);
    if (!req) return;
    const updatedReq: LeaveRequest = {
      ...req,
      status,
      reviewedBy: currentUser?.name || 'Authorized Lead',
      reviewedAt: new Date(),
      reviewNote: reviewNote || (status === 'Approved' ? 'Approved by HR / Management' : 'Declined per operational directives')
    };
    await writeData('leaves', requestId, updatedReq, setLeaveRequests, leaveRequests);
    
    const notif: Notification = {
      id: `notif-${Date.now()}`,
      userId: req.staffId,
      text: `Your ${req.type} leave (${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}) was ${status.toUpperCase()} by ${currentUser?.name || 'HR'}.`,
      type: 'system',
      read: false,
      timestamp: new Date(),
      link: 'hr'
    };
    await writeData('notifications', notif.id, notif, setNotifications, notifications);
  };

  const handleAddLeave = async (newLeave: Partial<LeaveRequest>) => {
    if (!currentUser) return;
    const staff = staffList.find(s => s.id === (newLeave.staffId || currentUser.id));
    const dept = newLeave.department || staff?.department || currentUser.department || 'General';
    const req: LeaveRequest = {
      id: `lr-${Date.now()}`,
      staffId: newLeave.staffId || currentUser.id,
      staffName: newLeave.staffName || currentUser.name,
      department: dept,
      type: newLeave.type || 'Annual',
      startDate: newLeave.startDate || new Date(),
      endDate: newLeave.endDate || new Date(),
      status: 'Pending',
      reason: newLeave.reason || 'Absence authorization request',
      timestamp: new Date()
    };
    await writeData('leaves', req.id, req, setLeaveRequests, leaveRequests);

    // Notify HR, Super Admin, Admin, GM and relevant Department Managers
    const approvers = staffList.filter(s => {
      const r = (s.role || '').toLowerCase();
      const isCompanyApprover = r === 'super admin' || r === 'admin' || r === 'hr' || r === 'general manager' || r === 'gm';
      const isMyDeptManager = (r === 'management' || r.includes('lead') || r.includes('manager')) &&
        (s.department || '').toLowerCase() === dept.toLowerCase();
      return isCompanyApprover || isMyDeptManager;
    });

    for (const approver of approvers) {
      if (approver.id !== currentUser.id) {
        const notif: Notification = {
          id: `notif-${Date.now()}-${approver.id}`,
          userId: approver.id,
          text: `Leave approval required: ${req.staffName} (${dept}) requested ${req.type} leave (${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}).`,
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
  const isSuperAdmin = normRole === 'super admin' || currentUser?.role === Role.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || normRole === 'admin' || currentUser?.role === Role.ADMIN;
  const isGM = normRole === 'general manager' || normRole === 'gm' || currentUser?.role === Role.GM;
  const isAccounts = normRole === 'accounts' || currentUser?.role === Role.ACCOUNTS || (currentUser?.department || '').toLowerCase() === 'finance';
  const isAE = normRole === 'account executive' || currentUser?.role === Role.AE;
  const isHR = normRole === 'hr' || currentUser?.role === Role.HR;
  const isManager = normRole === 'management' || currentUser?.role === Role.MANAGEMENT || normRole.includes('lead') || normRole.includes('manager');

  // Rule: Only admins, GM or finance person have access to finance
  const canViewFinance = isSuperAdmin || isAdmin || isGM || isAccounts || !!currentUser?.permissions?.canViewFinance;
  // Rule: Projects should only be visible to admins, managers, AEs and Finance
  const canViewProjects = isSuperAdmin || isAdmin || isGM || isManager || isAE || isAccounts || !!currentUser?.permissions?.canViewProjects;

  // Rule: New campaign can be created only by AE / managers / admins / super admins / general managers
  const canCreateCampaign = isSuperAdmin || isAdmin || isGM || isManager || isAE;

  // Rule: Management buttons displayed only for managers / admins / super admins / general managers
  const canViewManagerButtons = isSuperAdmin || isAdmin || isGM || isManager;

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

    // CRITICAL REQUIREMENT: "access control should only be displayed on the menu of super admin only. everyone else should not see access control."
    if (isSuperAdmin) {
      items.push({ id: 'access', label: 'Access Control', code: '11' });
    }

    return items;
  }, [canViewProjects, canAccessWorkload, canViewFinance, isSuperAdmin]);

  if (!currentUser) return <Login onLogin={setCurrentUser} staffList={staffList} />;

  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col font-sans selection:bg-white selection:text-black overflow-hidden relative">
      <div ref={mainScrollRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar relative transition-all duration-300">
        
        {/* Precision Dual-Layer Header matching screenshot */}
        <header className="fixed top-0 left-0 right-0 z-[60] bg-[#07080a]/95 backdrop-blur-md border-b border-neutral-800/80 transition-all">
          {/* Top Row: System telemetry & primary nav */}
          <div className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-neutral-900/90 gap-4">
            <div className="flex items-center gap-6 shrink-0">
              <div className="cursor-pointer group" onClick={() => handleNav('dashboard')}>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-[0.25em] leading-none mb-1">
                  PROPRIETARY ECOSYSTEM // V4.0.2
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg sm:text-xl tracking-tight uppercase text-white font-heading">MEDIAWIZE</span>
                  <span className="font-light text-lg sm:text-xl tracking-widest text-neutral-400">OPS</span>
                </div>
              </div>

              {/* Status pill tag */}
              <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 bg-[#101216] border border-neutral-800 rounded-full text-[10px] font-mono text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
                <span>Pulse Analytics</span>
              </div>
            </div>

            {/* Center Numbered Navigation */}
            <nav className="hidden xl:flex items-center gap-6">
              {navItems.map(nav => {
                const isActive = view === nav.id;
                return (
                  <button
                    key={nav.id}
                    onClick={() => handleNav(nav.id as any)}
                    className={`flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider transition-colors py-1 ${
                      isActive 
                        ? 'text-white font-bold border-b-2 border-white' 
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span className="text-[10px] text-neutral-400">{nav.code}</span>
                    <span>{nav.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Telemetry & Actions */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden 2xl:block text-right font-mono text-[9px] text-neutral-400 leading-tight">
                <div>[ 6.9271° N, 79.8612° E ]</div>
                <div className="text-neutral-400">NODE: COLOMBO 07</div>
              </div>

              {/* High Contrast White Action Button matching screenshot */}
              {canCreateCampaign && (
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="bg-white text-black hover:bg-neutral-200 px-4 py-2 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 rounded-sm transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                >
                  <Plus size={14} strokeWidth={3} /> NEW CAMPAIGN
                </button>
              )}

              {/* Hub Icon */}
              <button
                onClick={handleOpenHub}
                className="w-9 h-9 border border-neutral-800 bg-[#101216] text-neutral-300 hover:text-white hover:border-neutral-700 rounded-sm flex items-center justify-center transition-all relative"
                title="Communication Hub"
              >
                <MessageSquare size={16} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              </button>

              {/* Menu Drawer */}
              <button
                onClick={() => { setSidebarTab('menu'); setIsSidebarOpen(true); }}
                className="w-9 h-9 border border-neutral-800 bg-[#101216] text-neutral-300 hover:text-white hover:border-neutral-700 rounded-sm flex items-center justify-center transition-all"
                title="System Menu"
              >
                <Menu size={16} />
              </button>

              {/* User Avatar */}
              <div className="flex items-center gap-2 border border-neutral-800 bg-[#101216] pl-1.5 pr-3 py-1 rounded-sm">
                <img src={currentUser.avatarUrl} className="w-6 h-6 rounded-sm object-cover" alt="" />
                <span className="hidden sm:inline font-mono text-[10px] text-neutral-300 uppercase">{currentUser.name.split(' ')[0]}</span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-9 h-9 border border-neutral-800 bg-[#101216] text-neutral-400 hover:text-rose-400 hover:border-rose-900/50 rounded-sm flex items-center justify-center transition-all"
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Subheader Row: Module title & Switch Brief control */}
          <div className="h-14 px-4 sm:px-8 bg-[#0a0b0e] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-white text-black font-black text-xs flex items-center justify-center rounded-sm shrink-0">
                {viewMeta.badge}
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white uppercase truncate font-heading">
                  {viewMeta.title}
                </h2>
                <span className="px-2 py-0.5 bg-white text-black font-black text-[9px] uppercase tracking-wider rounded-none shrink-0">
                  {viewMeta.tag}
                </span>
                <span className="hidden md:inline text-xs text-neutral-400 font-medium truncate">
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
              onAddTodo={() => {}} 
              staffList={staffList} 
              events={events} 
              onAddEvent={(ev) => writeData('events', ev.id, ev, setEvents, events)} 
              onDeleteEvent={(id) => deleteData('events', id, setEvents, events)}
              onUpdatePayment={handleUpdatePayment} 
              pettyCash={pettyCash} 
              clientList={clientList} 
              onSendMessage={handleSendMessage} 
              leaveRequests={leaveRequests}
              onUpdateLeave={handleUpdateLeave}
              onNavigateToHR={() => handleNav('hr')}
              onNavigateToWorkload={() => handleNav('workload')}
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
              onDeleteEvent={(id) => deleteData('events', id, setEvents, events)}
              currentUser={currentUser} 
              onNotifyStaff={handleNotifyStaff}
            />
          )}

          {view === 'access' && (
            isSuperAdmin ? (
              <AccessManagement
                staffList={staffList}
                onUpdateStaffPermissions={handleUpdateStaffPermissions}
                currentUser={currentUser}
                departments={departments}
              />
            ) : (
              <div className="p-12 text-center bg-[#0e0f14] border border-rose-500/30 rounded-sm space-y-4 max-w-lg mx-auto mt-12">
                <ShieldAlert size={48} className="text-rose-500 mx-auto" />
                <h2 className="text-xl font-black uppercase text-white font-heading">Access Control Restricted</h2>
                <p className="font-mono text-xs text-neutral-400">
                  Access Control is exclusive to Super Admin authorization. You do not have clearance to modify security matrices.
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
              onAddNotification={() => {}} 
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
              onAddNote={(note) => writeData('meetingNotes', note.id, note, setMeetingNotes, meetingNotes)}
              onDeleteNote={(id) => deleteData('meetingNotes', id, setMeetingNotes, meetingNotes)}
              onUpdateNote={(note) => writeData('meetingNotes', note.id, note, setMeetingNotes, meetingNotes)}
              projects={projects}
              staffList={staffList}
              currentUserName={currentUser.name}
              currentUserId={currentUser.id}
            />
          )}
        </main>
        <Footer agencyProfile={agencyProfile} meetingNotes={meetingNotes} projects={projects} onAddNote={(text, pid, pname, saved) => writeData('meetingNotes', `note-${Date.now()}`, { id: `note-${Date.now()}`, title: text.split('\n')[0].substring(0, 30), text, projectId: pid, projectName: pname, isSavedToWize: saved, timestamp: new Date(), author: currentUser.name, category: 'Internal' }, setMeetingNotes, meetingNotes)} onDeleteNote={(id) => deleteData('meetingNotes', id, setMeetingNotes, meetingNotes)} currentUserName={currentUser.name} />
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
                                    // CRITICAL: access control should only be displayed on the menu of super admin only. everyone else should not see access control.
                                    { id: 'access', code: '11', icon: ShieldCheck, label: 'Access Control', desc: 'Super admin security matrix & permissions', visible: isSuperAdmin }
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
      <FloatingAI 
        projects={projects} 
        staffList={staffList} 
        balance={currentBalance} 
        currentUser={currentUser} 
        onOpenMenu={() => { setSidebarTab('menu'); setIsSidebarOpen(true); }}
        onOpenFocus={() => { setSidebarTab('focus'); setIsSidebarOpen(true); }}
        onOpenNotes={() => { setView('notes'); setActiveProjectId(null); }}
        onOpenHub={handleOpenHub}
      />
      
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
    </div>
  );
};

export default App;
