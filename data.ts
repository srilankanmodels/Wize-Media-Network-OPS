

import { Step, Role, Project, StaffMember, WorkflowTemplate, ProjectType, ServiceItem, Client, Channel, Message, Notification, Todo, CalendarEvent, LeaveRequest, PettyCashTransaction, Procedure, MeetingNote } from './types';

export const SERVICE_CATALOG: ServiceItem[] = [
  // Annual Reports
  { id: 'srv-ar-1', name: 'Annual Report Concept & Theme', defaultPrice: 75000, category: 'Annual Reports' },
  { id: 'srv-ar-2', name: 'Annual Report Layout Design (Per Page)', defaultPrice: 4500, category: 'Annual Reports' },
  { id: 'srv-ar-3', name: 'Financial Table Formatting', defaultPrice: 15000, category: 'Annual Reports' },
  { id: 'srv-ar-4', name: 'Photography - Board of Directors', defaultPrice: 45000, category: 'Annual Reports' },
  { id: 'srv-ar-5', name: 'Printing - 200 GSM Art Board Cover', defaultPrice: 120000, category: 'Annual Reports' },
  
  // Advertising
  { id: 'srv-adv-1', name: 'Social Media Campaign Strategy', defaultPrice: 50000, category: 'Advertising' },
  { id: 'srv-adv-2', name: 'Digital Ad Creative (Set of 5)', defaultPrice: 25000, category: 'Advertising' },
  { id: 'srv-adv-3', name: 'TV Commercial Production (Basic)', defaultPrice: 450000, category: 'Advertising' },
  { id: 'srv-adv-4', name: 'Billboard Design & Adaptation', defaultPrice: 35000, category: 'Advertising' },
  { id: 'srv-adv-5', name: 'Media Buying Commission (15%)', defaultPrice: 0, category: 'Advertising' },

  // General Creative
  { id: 'srv-1', name: 'Concept Development', defaultPrice: 50000, category: 'Creative' },
  { id: 'srv-2', name: 'Graphic Design (Hourly)', defaultPrice: 5000, category: 'Design' },
  { id: 'srv-3', name: 'Copywriting (Standard)', defaultPrice: 20000, category: 'Content' },
  { id: 'srv-4', name: 'Photography (Half Day)', defaultPrice: 35000, category: 'Production' },
  { id: 'srv-5', name: 'Video Editing (Per Minute)', defaultPrice: 15000, category: 'Production' },
];

const DEFAULT_STEPS = (type: string): Step[] => [
  { id: 1, title: 'Planning', description: 'Initial setup', durationWeeks: 1, tasks: [{ id: 't1', text: 'Kickoff', completed: false, role: Role.AE, timeAllocated: 60, timeSpent: 0 }] },
  { id: 2, title: 'Execution', description: 'Production phase', durationWeeks: 2, tasks: [{ id: 't2', text: 'Drafting', completed: false, role: Role.DESIGNER, timeAllocated: 120, timeSpent: 0 }] },
  { id: 3, title: 'Review', description: 'Quality control', durationWeeks: 1, tasks: [{ id: 't3', text: 'Proofread', completed: false, role: Role.PROOFREADER, timeAllocated: 45, timeSpent: 0 }] },
  { id: 4, title: 'Delivery', description: 'Final handover', durationWeeks: 1, tasks: [{ id: 't4', text: 'Send Invoice', completed: false, role: Role.ACCOUNTS, timeAllocated: 30, timeSpent: 0 }] },
];

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  'Annual Reports', 'Advertising', 'Podcast Studio', 'Public Relations', 
  'Digital & Media Strategy', 'Event Management', 'Production House', 'Wize Studio', 'WizeTV'
].map(type => ({
  type: type as ProjectType,
  description: `${type} Workflow`,
  steps: DEFAULT_STEPS(type)
}));

export const getTemplateSteps = (type: ProjectType): Step[] => {
  return [
    { id: 1, title: "Discovery", description: "Research & Planning", durationWeeks: 1, tasks: [
        { id: '1-1', text: "Client Brief", completed: false, role: Role.AE, timeAllocated: 60, timeSpent: 0 },
        { id: '1-2', text: "Budget Approval", completed: false, role: Role.MANAGEMENT, timeAllocated: 30, timeSpent: 0 }
    ]},
    { id: 2, title: "Concept", description: "Creative Direction", durationWeeks: 2, tasks: [
        { id: '2-1', text: "Visual Identity & Layout Concept", completed: false, role: Role.DESIGNER, timeAllocated: 120, timeSpent: 0 },
        { id: '2-2', text: "Strategic Copywriting & Headline Themes", completed: false, role: Role.COPYWRITER, timeAllocated: 180, timeSpent: 0 },
        { id: '2-3', text: "Client Presentation Deck", completed: false, role: Role.AE, timeAllocated: 90, timeSpent: 0 }
    ]},
    { id: 3, title: "Production", description: "Execution Phase", durationWeeks: 3, tasks: [
        { id: '3-1', text: "Draft High-Res Assets & Typesetting", completed: false, role: Role.DESIGNER, timeAllocated: 240, timeSpent: 0 },
        { id: '3-2', text: "Full Editorial Copy & Captions", completed: false, role: Role.COPYWRITER, timeAllocated: 150, timeSpent: 0 },
        { id: '3-3', text: "Internal QA & Proofreading", completed: false, role: Role.PROOFREADER, timeAllocated: 60, timeSpent: 0 }
    ]},
    { id: 4, title: "Completion", description: "Delivery & Billing", durationWeeks: 1, tasks: [
        { id: '4-1', text: "Final Handover", completed: false, role: Role.AE, timeAllocated: 30, timeSpent: 0 },
        { id: '4-2', text: "Invoicing", completed: false, role: Role.ACCOUNTS, timeAllocated: 15, timeSpent: 0 }
    ]}
  ];
};

export const INITIAL_STAFF: StaffMember[] = [
  { id: 's0', staffId: 'MW-000', name: 'Master Super Admin', email: 'superadmin@agency.com', role: Role.SUPER_ADMIN, department: 'Management', password: 'password123', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', phone: '+94 77 000 0000', joinedDate: new Date('2018-01-01'), permissions: { canViewFinance: true, canViewProjects: true, canViewAllProjects: true, canViewClientContacts: true, canManageTeam: true, canApproveLeaves: true, canManageAccessControl: true, canAccessCalendar: true, canAccessGmail: true, canAccessDrive: true, canViewWorkload: true } },
  { id: 's1', staffId: 'MW-001', name: 'Sarah Admin', email: 'sarah@agency.com', role: Role.ADMIN, department: 'Management', password: 'password123', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', phone: '+94 77 123 4567', joinedDate: new Date('2022-01-15'), bloodGroup: 'O+', allergies: 'None', permissions: { canViewFinance: true, canViewProjects: true, canViewAllProjects: true, canViewClientContacts: true, canManageTeam: true, canApproveLeaves: true, canAccessCalendar: true, canAccessGmail: true, canAccessDrive: true, canViewWorkload: true } },
  { id: 's4', staffId: 'MW-004', name: 'Mr. Thilanka (GM)', email: 'thilanka@agency.com', role: Role.GM, department: 'Directors', password: 'password123', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', phone: '+94 77 111 2222', joinedDate: new Date('2018-05-20'), permissions: { canViewFinance: true, canViewProjects: true, canViewAllProjects: true, canViewClientContacts: true, canManageTeam: true, canApproveLeaves: true, canAccessCalendar: true, canAccessGmail: true, canAccessDrive: true, canViewWorkload: true } },
  { id: 's7', staffId: 'MW-007', name: 'Alex Creative Lead', email: 'alex@agency.com', role: Role.MANAGEMENT, department: 'Creative', password: 'password123', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', phone: '+94 77 333 4444', joinedDate: new Date('2021-06-15'), permissions: { canViewProjects: true, canViewAllProjects: false, canViewClientContacts: true, canApproveLeaves: true, canAccessCalendar: true, canAccessGmail: true, canAccessDrive: true, canViewWorkload: true } },
  { id: 's2', staffId: 'MW-002', name: 'Tom Designer', email: 'tom@agency.com', role: Role.DESIGNER, department: 'Creative', password: 'password123', avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80', phone: '+94 77 987 6543', joinedDate: new Date('2023-03-10'), bloodGroup: 'A-', permissions: { canViewClientContacts: true, canAccessCalendar: true, canAccessGmail: true, canAccessDrive: true } },
  { id: 's8', staffId: 'MW-008', name: 'Maya Copywriter', email: 'maya@agency.com', role: Role.COPYWRITER, department: 'Creative', password: 'password123', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80', phone: '+94 77 555 6677', joinedDate: new Date('2023-01-10'), permissions: { canViewClientContacts: true, canAccessCalendar: true, canAccessGmail: true, canAccessDrive: true } },
  { id: 's3', staffId: 'MW-003', name: 'Emily HR', email: 'emily@agency.com', role: Role.HR, department: 'Human Resources', password: 'password123', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', phone: '+94 71 222 3333', joinedDate: new Date('2021-11-05'), permissions: { canManageTeam: true, canApproveLeaves: true, canViewClientContacts: true, canAccessCalendar: true, canAccessGmail: true, canAccessDrive: true } },
  { id: 's5', staffId: 'MW-005', name: 'Account Exec Jane', email: 'jane@agency.com', role: Role.AE, department: 'Client Servicing', password: 'password123', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80', joinedDate: new Date('2023-08-01'), permissions: { canViewProjects: true, canViewClientContacts: true, canAccessCalendar: true, canAccessGmail: true, canAccessDrive: true, canViewWorkload: true } },
  { id: 's6', staffId: 'MW-006', name: 'Fin Manager', email: 'finance@agency.com', role: Role.ACCOUNTS, department: 'Finance', password: 'password123', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', joinedDate: new Date('2020-05-01'), permissions: { canViewFinance: true, canViewProjects: true, canViewClientContacts: true, canAccessCalendar: true, canAccessGmail: true, canAccessDrive: true } }
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  { 
    id: 'lr1', 
    staffId: 's2', 
    staffName: 'Tom Designer', 
    department: 'Creative', 
    type: 'Annual', 
    startDate: new Date(Date.now() + 86400000 * 5), 
    endDate: new Date(Date.now() + 86400000 * 7), 
    status: 'Pending', 
    reason: 'Family trip to Kandy', 
    timestamp: new Date(Date.now() - 3600000 * 4),
    assignedWorkloadToId: 's8',
    assignedWorkloadToName: 'Maya Copywriter',
    assignedWorkloadToRole: 'Copywriter',
    managerApproval: {
      approved: true,
      approvedBy: 'Alex Creative Lead',
      approvedById: 's7',
      role: 'Management',
      department: 'Creative',
      timestamp: new Date(Date.now() - 3600000 * 2),
      note: 'Creative assets covered by Maya. Division approved.'
    }
    // directorApproval is still pending -> 1 of 2 approvals completed!
  },
  { 
    id: 'lr2', 
    staffId: 's5', 
    staffName: 'Account Exec Jane', 
    department: 'Client Servicing', 
    type: 'Sick', 
    startDate: new Date(Date.now() - 86400000), 
    endDate: new Date(), 
    status: 'Approved', 
    reason: 'Fever and medical rest', 
    timestamp: new Date(Date.now() - 172800000),
    assignedWorkloadToId: 's1',
    assignedWorkloadToName: 'Sarah Admin',
    assignedWorkloadToRole: 'Admin',
    managerApproval: {
      approved: true,
      approvedBy: 'Sarah Admin',
      approvedById: 's1',
      role: 'Admin',
      department: 'Management',
      timestamp: new Date(Date.now() - 160000000),
      note: 'Client communications redirected.'
    },
    directorApproval: {
      approved: true,
      approvedBy: 'Mr. Thilanka (GM)',
      approvedById: 's4',
      role: 'General Manager',
      department: 'Directors',
      timestamp: new Date(Date.now() - 150000000),
      note: 'Director sign-off granted. Recover well.'
    },
    reviewedBy: 'Sarah Admin (Manager) & Mr. Thilanka (Director)'
  },
  { 
    id: 'lr3', 
    staffId: 's2', 
    staffName: 'Tom Designer', 
    department: 'Creative', 
    type: 'Short', 
    startDate: new Date(), 
    endDate: new Date(), 
    status: 'Pending', 
    reason: 'Personal urgent appointment', 
    timestamp: new Date(Date.now() - 3600000),
    assignedWorkloadToId: 's7',
    assignedWorkloadToName: 'Alex Creative Lead',
    assignedWorkloadToRole: 'Management'
    // 0 of 2 approvals
  }
];

export const INITIAL_PETTY_CASH: PettyCashTransaction[] = [
  { id: 'pc1', date: new Date(), description: 'Office Milk & Snacks', amount: 2500, type: 'Expense', category: 'Supplies', handledBy: 'Emily HR' },
  { id: 'pc2', date: new Date(), description: 'Initial Float Top-up', amount: 20000, type: 'Income', category: 'Float', handledBy: 'Fin Manager' }
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', companyName: 'Alpha Corp', contactPerson: 'John Doe', email: 'john@alphacorp.com', phone: '+94 11 222 3333', address: '123 Business Park', industry: 'Finance' },
  { id: 'c2', companyName: 'Gamma Global', contactPerson: 'Jane Smith', email: 'jane@gammaglobal.com', phone: '+94 11 444 5555', address: '456 Tech City', industry: 'Technology' }
];

export const INITIAL_CHANNELS: Channel[] = [
    { id: 'ch-1', name: 'General', type: 'public', description: 'Agency wide announcements', members: [] },
    { id: 'ch-2', name: 'Random', type: 'public', description: 'Watercooler talk', members: [] },
    { id: 'ch-ai', name: 'AI Strategist', type: 'public', description: 'Direct link to WizeMind Intelligence', members: [] },
    { id: 'ch-p1', name: 'Annual Report 23/24', type: 'project', projectId: 'p1', description: 'Project discussion', members: [] },
    { id: 'ch-p2', name: 'Q2 Digital Push', type: 'project', projectId: 'p2', description: 'Project discussion', members: [] },
];

export const INITIAL_MESSAGES: Message[] = [
    { id: 'm1', channelId: 'ch-1', text: 'Welcome to the new Mediawize system!', senderId: 's1', senderName: 'Sarah Admin', senderAvatar: INITIAL_STAFF[0].avatarUrl, timestamp: new Date(Date.now() - 86400000) },
    { id: 'm2', channelId: 'ch-p1', text: '@Tom please check the latest assets for review.', senderId: 's5', senderName: 'Account Exec Jane', senderAvatar: INITIAL_STAFF[4].avatarUrl, timestamp: new Date(Date.now() - 3600000), mentions: ['s2'] },
    { id: 'm3', channelId: 'ch-2', text: 'Anyone for coffee?', senderId: 's2', senderName: 'Tom Designer', senderAvatar: INITIAL_STAFF[1].avatarUrl, timestamp: new Date(Date.now() - 1800000) },
];

export const INITIAL_MESSAGES_AI: Message[] = [
    { id: 'm-ai-1', channelId: 'ch-ai', text: 'WizeMind Strategic Intelligence initialized. How can I assist with Mediawize operations today?', senderId: 'bot', senderName: 'WizeMind AI', timestamp: new Date() },
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
    { id: 'n1', userId: 's2', text: 'You were mentioned in Annual Report 23/24', type: 'mention', read: false, timestamp: new Date(), link: 'ch-p1' }
];

export const INITIAL_TODOS: Todo[] = [
    { id: 'td-1', text: 'Update timesheets', completed: false, userId: 's1' },
    { id: 'td-2', text: 'Review quarterly goals', completed: true, userId: 's1' },
    { id: 'td-3', text: 'Call Alpha Corp regarding Phase 2', completed: false, userId: 's2' },
];

export const INITIAL_EVENTS: CalendarEvent[] = [
    { id: 'ev-1', title: 'Team Meeting', date: new Date(), type: 'meeting' }, 
    { id: 'ev-2', title: 'Alpha Corp Deadline', date: new Date(Date.now() + 86400000 * 5), type: 'deadline' }, 
];

export const INITIAL_MEETING_NOTES: MeetingNote[] = [
  {
    id: 'mn-1',
    title: 'ALPHA CORP // ANNUAL REPORT KICKOFF & TYPOGRAPHY DIRECTION',
    text: 'Client team reviewed initial concept moodboards. Board of Directors photography scheduled for next Tuesday. @Tom Designer to complete cover page grid systems and typeface variations by Thursday. @Account Exec Jane to follow up on audited balance sheet drafts.',
    category: 'Meeting',
    timestamp: new Date(Date.now() - 3600000 * 24),
    author: 'Sarah Admin',
    authorId: 's1',
    projectId: 'p1',
    projectName: 'Annual Report 2023/24',
    isSavedToWize: true,
    attendees: ['Sarah Admin', 'Tom Designer', 'Account Exec Jane', 'John Doe (Alpha Corp)'],
    taggedStaffIds: ['s2', 's5'],
    taggedStaffNames: ['Tom Designer', 'Account Exec Jane'],
    duration: 45,
    agenda: '1. Theme review\n2. Photography timeline\n3. Financial data milestones',
    actionItems: [
      { id: 'act-1', text: 'Deliver 3 cover design route explorations', assignedTo: 'Tom Designer', completed: true },
      { id: 'act-2', text: 'Obtain high-res signature files from Alpha Corp', assignedTo: 'Account Exec Jane', completed: false }
    ]
  },
  {
    id: 'mn-2',
    title: 'GAMMA GLOBAL // Q2 DIGITAL CAMPAIGN STRATEGY & AD SPEND',
    text: 'Agreed on multi-channel digital distribution. Meta and LinkedIn ad formats approved. @Tom Designer needs to prepare motion graphics storyboard for 15s shorts. @Sarah Admin to confirm budget allocation and client contract sign-off.',
    category: 'Client',
    timestamp: new Date(Date.now() - 3600000 * 48),
    author: 'Account Exec Jane',
    authorId: 's5',
    projectId: 'p2',
    projectName: 'Q2 Digital Push',
    isSavedToWize: true,
    attendees: ['Account Exec Jane', 'Tom Designer', 'Sarah Admin', 'Jane Smith (Gamma Global)'],
    taggedStaffIds: ['s1', 's2'],
    taggedStaffNames: ['Sarah Admin', 'Tom Designer'],
    duration: 30,
    agenda: 'Audience segment analysis, creative formats, budget authorization',
    actionItems: [
      { id: 'act-3', text: 'Finalize motion graphic teaser cut', assignedTo: 'Tom Designer', completed: false },
      { id: 'act-4', text: 'Generate updated quotation and advance invoice', assignedTo: 'Sarah Admin', completed: true }
    ]
  },
  {
    id: 'mn-3',
    title: 'INTERNAL ALL-HANDS // STUDIO WORKFLOW & PRODUCTION GATES',
    text: 'Weekly operational synchronization across creative, accounts, and HR. Discussion on new procedure matrix implementation. @Emily HR reminded all department leads on health checkup logs. @Sarah Admin reviewing quarter capacity.',
    category: 'Internal',
    timestamp: new Date(Date.now() - 3600000 * 72),
    author: 'Tom Designer',
    authorId: 's2',
    isSavedToWize: true,
    attendees: ['Tom Designer', 'Sarah Admin', 'Emily HR', 'Account Exec Jane'],
    taggedStaffIds: ['s1', 's3', 's5'],
    taggedStaffNames: ['Sarah Admin', 'Emily HR', 'Account Exec Jane'],
    duration: 25,
    agenda: '1. Workload balancing\n2. Health insurance submissions\n3. Client satisfaction scores',
    actionItems: [
      { id: 'act-5', text: 'Submit medical documentation to HR vault', assignedTo: 'Emily HR', completed: false }
    ]
  }
];

export const INITIAL_PROJECTS: Project[] = (() => {
  const now = Date.now();
  const list: Project[] = [
    {
      id: 'p1',
      jobNumber: 'MW-J-2024-0001',
      clientName: "Alpha Corp",
      projectName: "Annual Report 2023/24",
      type: 'Annual Reports',
      dueDate: new Date(now + 86400000 * 20),
      year: "2023-2024",
      status: 'In Progress',
      currentStep: 2,
      progress: 35,
      tasksCompleted: { '1-1': true },
      comments: { 1: [] },
      memos: [],
      lastUpdated: new Date(),
      steps: [
        {
          id: 1,
          title: "Discovery & Planning",
          description: "Research & scope authorization",
          durationWeeks: 1,
          tasks: [
            { id: '1-1', text: "Client Brief & Scope Authorization", completed: true, role: Role.AE, assignedTo: 's5', timeAllocated: 60, timeSpent: 60 },
            { id: '1-2', text: "Budget & Milestone Sign-off", completed: false, role: Role.MANAGEMENT, assignedTo: 's1', priority: 'Critical', deadline: new Date(now + 86400000 * 2).toISOString(), timeAllocated: 60, timeSpent: 20 }
          ]
        },
        {
          id: 2,
          title: "Concept & Art Direction",
          description: "Creative direction and layout exploration",
          durationWeeks: 2,
          tasks: [
            { id: '2-1', text: "Visual Identity & Annual Report Grid Concepts", completed: false, role: Role.DESIGNER, assignedTo: 's2', priority: 'Critical', deadline: new Date(now - 86400000 * 2).toISOString(), timeAllocated: 120, timeSpent: 40 },
            { id: '2-2', text: "Strategic Copywriting & Executive Highlights", completed: false, role: Role.ADMIN, assignedTo: 's1', priority: 'High', deadline: new Date(now - 86400000 * 1).toISOString(), timeAllocated: 90, timeSpent: 25 },
            { id: '2-3', text: "Governance Audit & Board Photo Schedule", completed: false, role: Role.ADMIN, assignedTo: 's1', priority: 'Medium', deadline: new Date(now + 86400000 * 4).toISOString(), originalDeadline: new Date(now - 86400000 * 2).toISOString(), postponedReason: 'Alpha Corp requested rescheduled photography window due to board meeting delay', timeAllocated: 60, timeSpent: 10 },
            { id: '2-4', text: "Client Review Deck & Presentation", completed: false, role: Role.AE, assignedTo: 's5', priority: 'High', deadline: new Date(now + 86400000 * 3).toISOString(), timeAllocated: 90, timeSpent: 0 }
          ]
        },
        {
          id: 3,
          title: "Production & Typesetting",
          description: "Execution of 120-page financial report",
          durationWeeks: 3,
          tasks: [
            { id: '3-1', text: "Typesetting & High-Resolution Print Master", completed: false, role: Role.DESIGNER, assignedTo: 's2', priority: 'Medium', deadline: new Date(now + 86400000 * 7).toISOString(), timeAllocated: 240, timeSpent: 0 },
            { id: '3-2', text: "Financial Tables QA & Compliance Proofreading", completed: false, role: Role.PROOFREADER, assignedTo: 's1', priority: 'Low', deadline: new Date(now + 86400000 * 8).toISOString(), timeAllocated: 60, timeSpent: 0 }
          ]
        },
        {
          id: 4,
          title: "Delivery & Archival",
          description: "Final print verification and invoicing",
          durationWeeks: 1,
          tasks: [
            { id: '4-1', text: "Final Client Sign-off & Delivery Note", completed: false, role: Role.AE, assignedTo: 's5', priority: 'Medium', deadline: new Date(now + 86400000 * 12).toISOString(), timeAllocated: 30, timeSpent: 0 },
            { id: '4-2', text: "Final Invoicing & Account Reconciliation", completed: false, role: Role.ACCOUNTS, assignedTo: 's1', priority: 'Medium', deadline: new Date(now + 86400000 * 14).toISOString(), timeAllocated: 20, timeSpent: 0 }
          ]
        }
      ],
      quotations: [],
      documents: [],
      channelId: 'ch-p1',
      advanceReceived: true,
      advanceAmount: 150000,
      createdBy: 's1',
      createdByName: 'Sarah Admin',
      createdByRole: 'Admin',
      createdByStaffId: 'MW-001',
      createdByDepartment: 'Management',
      createdByAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      createdAt: new Date('2024-01-15')
    },
    {
      id: 'p2',
      jobNumber: 'MW-J-2024-0002',
      clientName: "Gamma Global",
      projectName: "Q2 Digital Push",
      type: 'Digital & Media Strategy',
      dueDate: new Date(now + 86400000 * 15),
      year: "2024",
      status: 'In Progress',
      currentStep: 1,
      progress: 10,
      tasksCompleted: {},
      comments: {},
      memos: [],
      lastUpdated: new Date(),
      steps: [
        {
          id: 1,
          title: "Strategic Discovery",
          description: "Audience insights and channel mapping",
          durationWeeks: 1,
          tasks: [
            { id: '2p-1', text: "Target Audience Matrix & Ad Placement Specs", completed: false, role: Role.ADMIN, assignedTo: 's1', priority: 'Critical', deadline: new Date(now + 86400000 * 1).toISOString(), timeAllocated: 75, timeSpent: 0 },
            { id: '2p-2', text: "Creative Motion Graphics Storyboard", completed: false, role: Role.DESIGNER, assignedTo: 's2', priority: 'High', deadline: new Date(now - 86400000 * 3).toISOString(), timeAllocated: 120, timeSpent: 20 },
            { id: '2p-3', text: "Digital Media Budget Allocation & Channel Mix", completed: false, role: Role.AE, assignedTo: 's5', priority: 'Medium', deadline: new Date(now + 86400000 * 5).toISOString(), originalDeadline: new Date(now - 86400000 * 1).toISOString(), postponedReason: 'Awaiting revised marketing spend cap from Gamma Global CFO', timeAllocated: 45, timeSpent: 10 }
          ]
        }
      ],
      quotations: [],
      documents: [],
      channelId: 'ch-p2',
      advanceReceived: false,
      createdBy: 's5',
      createdByName: 'Account Exec Jane',
      createdByRole: 'Account Executive',
      createdByStaffId: 'MW-005',
      createdByDepartment: 'Client Servicing',
      createdByAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
      createdAt: new Date('2024-02-10')
    }
  ];
  return list;
})();

// Added AGENCY_PROCEDURES to fix the import error in components/Procedures.tsx
export const AGENCY_PROCEDURES: Procedure[] = [
  {
    id: 'proc-1',
    category: 'Operations',
    department: 'Client Servicing & Operations',
    title: 'Project Initiation & Job Registry Protocol',
    description: 'Mandatory standard procedure for onboarding a new client job before any creative or production work begins.',
    roleResponsible: 'Account Executive & Operations Lead',
    sla: '24 hours from client brief',
    priority: 'High',
    requiredInputs: [
      'Written brief or signed scope of work from client',
      'Target delivery date & milestone schedule',
      'Client billing details and point of contact'
    ],
    deliverables: [
      'Allocated MW-J Job Number in Wize Registry',
      'Initialized Project Hub with template steps',
      'Internal kickoff channel created in Communication Hub'
    ],
    tags: ['Kickoff', 'Registry', 'Operations', 'Account Management'],
    lastUpdated: '2024-03-15',
    acknowledgedBy: ['s1', 's4'],
    steps: [
      { id: 's1', text: 'Receive client brief, clarify objectives, and document scope boundaries.', role: 'Account Executive', timeEstimate: '30 mins', checkpoint: 'Brief signed or confirmed via email' },
      { id: 's2', text: 'Generate official Job Number in Wize Registry (Format: MW-J-YYYY-XXXX).', role: 'Account Executive / Admin', timeEstimate: '5 mins', checkpoint: 'Registry entry active' },
      { id: 's3', text: 'Assign core team members (Lead Designer, Copywriter, Production Specialist).', role: 'Operations Lead', timeEstimate: '15 mins', checkpoint: 'Resource allocation verified' },
      { id: 's4', text: 'Set up Project Channel in Communication Hub and schedule internal 15-min sync.', role: 'Account Executive', timeEstimate: '10 mins', checkpoint: 'Channel active with team pinged' }
    ]
  },
  {
    id: 'proc-2',
    category: 'Finance',
    department: 'Finance & Accounts',
    title: 'Invoicing, Advance & Payment Verification Protocol',
    description: 'Financial compliance rules governing client advances, milestone billing, and tax invoice dispatch.',
    roleResponsible: 'Finance Manager & Account Executive',
    sla: '48 hours before project execution starts',
    priority: 'Critical',
    requiredInputs: [
      'Approved Job Number from Registry',
      'Quotation breakdown itemized from Service Catalog',
      'Client TIN / VAT / Billing Registration if applicable'
    ],
    deliverables: [
      'Official Mediawize Pro-forma / Quotation PDF',
      'Recorded Advance receipt in Finance Hub',
      'Verified payment confirmation stamp in project files'
    ],
    tags: ['Finance', 'Quotation', 'Billing', 'Advance', 'Compliance'],
    lastUpdated: '2024-03-20',
    acknowledgedBy: ['s1', 's6'],
    steps: [
      { id: 's1', text: 'Compile formal Quotation using the Quotation Builder with standard agency margins.', role: 'Account Executive / Accounts', timeEstimate: '20 mins', checkpoint: 'Service catalog pricing verified' },
      { id: 's2', text: 'Transmit Quotation to client and secure signed agreement or formal PO.', role: 'Account Executive', timeEstimate: 'Variable', checkpoint: 'Written approval archived' },
      { id: 's3', text: 'Enforce mandatory 50% advance payment prior to commencing third-party procurement.', role: 'Finance Manager', timeEstimate: '1 day', checkpoint: 'Bank deposit / cheque cleared' },
      { id: 's4', text: 'Flag project as Advance Received in Wize OS to unlock production phase.', role: 'Finance Manager', timeEstimate: '5 mins', checkpoint: 'Finance status updated' }
    ]
  },
  {
    id: 'proc-3',
    category: 'Operations',
    department: 'Creative & Production',
    title: 'Annual Report Publishing & Typesetting Lifecycle',
    description: 'End-to-end publishing pipeline for corporate annual reports from concept to print & digital flipbook.',
    roleResponsible: 'Creative Director & Lead Editorial Designer',
    sla: '4 - 6 Weeks per publishing cycle',
    priority: 'High',
    requiredInputs: [
      'Audited financial statements and board report text',
      'High-res Director portraits & corporate imagery',
      'Client corporate brand guidelines & color profiles'
    ],
    deliverables: [
      'Concept themes & approved cover layout',
      'Formatted financial tables and notes to the accounts',
      'High-resolution prepress print-ready PDF and interactive flipbook'
    ],
    tags: ['Annual Report', 'Publishing', 'Print', 'Proofreading'],
    lastUpdated: '2024-03-22',
    acknowledgedBy: ['s2', 's4'],
    steps: [
      { id: 's1', text: 'Develop 3 distinct cover and thematic layout concepts for Board presentation.', role: 'Lead Designer', timeEstimate: '3 days', checkpoint: 'Concept deck signed off' },
      { id: 's2', text: 'Coordinate photography session for Board of Directors with standard lighting grid.', role: 'Production Specialist', timeEstimate: '1 day', checkpoint: 'RAW & retouched assets archived' },
      { id: 's3', text: 'Import audited financial statements; cross-verify mathematical sum totals and notes.', role: 'Typesetter / Proofreader', timeEstimate: '4 days', checkpoint: 'Zero discrepancies with audited sheet' },
      { id: 's4', text: 'Produce client dummy proof for final sign-off before CTP plate making and press run.', role: 'Production Lead', timeEstimate: '2 days', checkpoint: 'Signed physical proof returned' }
    ]
  },
  {
    id: 'proc-4',
    category: 'Creative',
    department: 'Creative & Quality Control',
    title: 'Creative Review, Proofing & Brand Gate',
    description: 'Quality assurance protocol ensuring zero typographical errors and brand consistency across all client deliverables.',
    roleResponsible: 'Proofreader & Creative Director',
    sla: 'Within 4 hours of design completion',
    priority: 'Critical',
    requiredInputs: [
      'Draft creative artwork in PDF or review link',
      'Original client brief and copy documents',
      'Client master typography and palette guidelines'
    ],
    deliverables: [
      'Marked-up correction sheet or Figma review comments',
      'Approved stamp on final art before client dispatch'
    ],
    tags: ['Quality Control', 'Proofreading', 'Creative', 'Brand Gate'],
    lastUpdated: '2024-03-10',
    acknowledgedBy: ['s1', 's2'],
    steps: [
      { id: 's1', text: 'Check layout against client brief and specifications (dimensions, bleeds, resolution).', role: 'Designer', timeEstimate: '15 mins', checkpoint: 'Pre-flight check passed' },
      { id: 's2', text: 'Complete rigorous copy audit for spelling, grammar, punctuation, legal disclaimers, and dates.', role: 'Proofreader', timeEstimate: '45 mins', checkpoint: 'Proofing notes compiled' },
      { id: 's3', text: 'Designer addresses all corrections; secondary verification by Proofreader.', role: 'Designer & Proofreader', timeEstimate: '30 mins', checkpoint: 'All red flags cleared' },
      { id: 's4', text: 'Creative Director signs off on aesthetic harmony and brand standards.', role: 'Creative Director', timeEstimate: '15 mins', checkpoint: 'Approved stamp granted' }
    ]
  },
  {
    id: 'proc-5',
    category: 'Digital',
    department: 'Digital Strategy & Advertising',
    title: 'Advertising & Social Media Campaign Protocol',
    description: 'Operational guidelines for launching paid digital ads, social campaigns, and campaign analytics.',
    roleResponsible: 'Digital Strategist & Account Executive',
    sla: 'Monthly calendar submitted 7 days prior to month start',
    priority: 'Normal',
    requiredInputs: [
      'Approved monthly ad budget and client target demographics',
      'Campaign thematic goals and brand key messages',
      'Access to client Meta / Google / LinkedIn Business Manager'
    ],
    deliverables: [
      'Monthly social media content calendar with visual mockups',
      'Paid campaign setup with UTM tracking links',
      'Monthly performance analytics dashboard & ROI debrief'
    ],
    tags: ['Digital', 'Advertising', 'Social Media', 'Paid Media', 'Analytics'],
    lastUpdated: '2024-03-18',
    acknowledgedBy: ['s5'],
    steps: [
      { id: 's1', text: 'Formulate monthly campaign schedule with content pillars and creative hooks.', role: 'Digital Strategist', timeEstimate: '2 days', checkpoint: 'Calendar approved by client' },
      { id: 's2', text: 'Coordinate with Design team to create responsive multi-format assets (1:1, 9:16, 16:9).', role: 'Designer & Strategist', timeEstimate: '3 days', checkpoint: 'Assets formatted and named' },
      { id: 's3', text: 'Configure campaign targeting, ad spend distribution, pixel tracking, and A/B variants.', role: 'Media Buyer', timeEstimate: '2 hours', checkpoint: 'Ad sets scheduled' },
      { id: 's4', text: 'Monitor live ad spend daily to prevent budget overruns; compile monthly KPI summary.', role: 'Digital Strategist', timeEstimate: 'Continuous', checkpoint: 'Monthly report delivered' }
    ]
  },
  {
    id: 'proc-6',
    category: 'Production',
    department: 'Production House & Wize Studio',
    title: 'Podcast Studio & Audio/Visual Production SOP',
    description: 'Studio booking, equipment calibration, multi-track recording, and post-production workflow for podcast & video shoots.',
    roleResponsible: 'Studio Manager & Sound Engineer',
    sla: 'Studio calibrated 45 mins prior to shoot',
    priority: 'Normal',
    requiredInputs: [
      'Studio booking confirmation and guest roster',
      'Microphone and lighting configuration checklist',
      'Episode run of show and topic breakdown'
    ],
    deliverables: [
      'Multi-track WAV audio stems',
      'Multi-angle 4K video footage backed up on local NAS',
      'Mastered audio file and social media highlight clips'
    ],
    tags: ['Podcast', 'Production', 'Studio', 'Audio', 'Video'],
    lastUpdated: '2024-03-25',
    acknowledgedBy: ['s1'],
    steps: [
      { id: 's1', text: 'Check acoustic environment, test XLR inputs, calibrate gain levels, and format SD cards.', role: 'Sound Engineer', timeEstimate: '30 mins', checkpoint: 'Levels within -12dB to -6dB headroom' },
      { id: 's2', text: 'Set 3-point studio lighting and balance color temperatures across camera sensors.', role: 'Videographer', timeEstimate: '25 mins', checkpoint: 'Color temperature synced at 5600K' },
      { id: 's3', text: 'Conduct 2-minute test recording with host and guest to verify headphone monitor clarity.', role: 'Studio Manager', timeEstimate: '10 mins', checkpoint: 'Host/guest sound check approved' },
      { id: 's4', text: 'Execute live session, log timestamp markers for highlights, and perform dual-drive backup.', role: 'Crew', timeEstimate: '2 hours', checkpoint: 'Data mirrored to safe storage' }
    ]
  },
  {
    id: 'proc-7',
    category: 'HR',
    department: 'Human Resources & Administration',
    title: 'Staff Onboarding, Welfare & Workstation Setup',
    description: 'Standard procedure for integrating new team members into Mediawize OS, equipment handover, and welfare vault registration.',
    roleResponsible: 'HR Manager & System Admin',
    sla: 'Day 1 of employment',
    priority: 'Normal',
    requiredInputs: [
      'Signed employment contract and employee personal info form',
      'Emergency contacts, medical conditions, and blood group details',
      'Workstation equipment inventory allocation'
    ],
    deliverables: [
      'Active Mediawize OS login and communication channels',
      'Signed equipment handover receipt',
      'Completed Health & Welfare Vault profile'
    ],
    tags: ['HR', 'Onboarding', 'Welfare', 'Admin'],
    lastUpdated: '2024-03-01',
    acknowledgedBy: ['s3', 's4'],
    steps: [
      { id: 's1', text: 'Create staff profile in Staff Management with assigned role and department permissions.', role: 'Admin', timeEstimate: '10 mins', checkpoint: 'Staff ID generated' },
      { id: 's2', text: 'Provision company hardware (laptop, monitor, peripherals) and issue equipment receipt.', role: 'Admin / IT', timeEstimate: '30 mins', checkpoint: 'Asset register signed' },
      { id: 's3', text: 'Record emergency contact, blood group, and health notes in the Welfare Vault.', role: 'HR Manager', timeEstimate: '15 mins', checkpoint: 'Confidential vault updated' },
      { id: 's4', text: 'Conduct orientation on Wize OS workflow, job numbers, and time-tracking practices.', role: 'HR & Team Lead', timeEstimate: '1 hour', checkpoint: 'Orientation checklist completed' }
    ]
  },
  {
    id: 'proc-8',
    category: 'Finance',
    department: 'Finance & Administration',
    title: 'Petty Cash Voucher & Expense Reimbursement',
    description: 'Protocol for requesting and disbursing office supplies, shoot refreshments, courier fees, and travel expenses.',
    roleResponsible: 'HR / Admin & Finance Manager',
    sla: 'Same day for under Rs. 10,000',
    priority: 'Normal',
    requiredInputs: [
      'Original tax receipt, bill, or cash memo',
      'Explanation of expenditure purpose and associated Job Number',
      'Approval from Department Head or Project AE'
    ],
    deliverables: [
      'Signed Petty Cash Voucher',
      'Updated Petty Cash Ledger in Finance Dashboard',
      'Cash disbursement or bank reimbursement'
    ],
    tags: ['Petty Cash', 'Expenses', 'Reimbursement', 'Finance'],
    lastUpdated: '2024-03-12',
    acknowledgedBy: ['s3', 's6'],
    steps: [
      { id: 's1', text: 'Submit receipt or invoice attached to a standard Petty Cash Voucher request.', role: 'Requesting Staff', timeEstimate: '5 mins', checkpoint: 'Legible receipt attached' },
      { id: 's2', text: 'Verify that the expense corresponds to legitimate agency operations or project costs.', role: 'Department Head', timeEstimate: '10 mins', checkpoint: 'Sign-off received' },
      { id: 's3', text: 'Disburse funds from the office float and enter entry into Wize OS Petty Cash Ledger.', role: 'HR / Finance', timeEstimate: '5 mins', checkpoint: 'Ledger balance updated' },
      { id: 's4', text: 'Reconcile physical cash drawer weekly against the recorded system balance.', role: 'Finance Manager', timeEstimate: '30 mins', checkpoint: 'Zero balance discrepancy' }
    ]
  },
  {
    id: 'proc-9',
    category: 'Operations',
    department: 'Client Servicing',
    title: 'Client Servicing, Meeting Minutes & Scope Changes',
    description: 'Documentation discipline for all client interactions, change requests, and action item follow-ups.',
    roleResponsible: 'Account Executive',
    sla: 'Minutes sent within 4 hours of meeting conclusion',
    priority: 'High',
    requiredInputs: [
      'Meeting agenda and attendee list',
      'Notes taken during client discussion',
      'Action items and agreed deadlines'
    ],
    deliverables: [
      'Formatted Meeting Minutes in Meeting Notes module',
      'Email summary dispatched to client stakeholders',
      'Logged tasks in Wize OS for internal follow-up'
    ],
    tags: ['Meeting Notes', 'Client Servicing', 'Communication', 'Scope Control'],
    lastUpdated: '2024-03-28',
    acknowledgedBy: ['s5', 's1'],
    steps: [
      { id: 's1', text: 'Record discussion points, key decisions, and designated task owners during meeting.', role: 'Account Executive', timeEstimate: 'Meeting duration', checkpoint: 'Raw notes captured' },
      { id: 's2', text: 'Create structured Meeting Minutes in Wize OS with attendee list and action items.', role: 'Account Executive', timeEstimate: '20 mins', checkpoint: 'Saved to Meeting Intelligence' },
      { id: 's3', text: 'Email formal minutes to client for confirmation and record in client portal notes.', role: 'Account Executive', timeEstimate: '10 mins', checkpoint: 'Client email sent' },
      { id: 's4', text: 'If scope changes exceed quotation by >15%, issue an Addendum Quotation immediately.', role: 'Account Executive & Accounts', timeEstimate: '1 hour', checkpoint: 'Change order approved' }
    ]
  },
  {
    id: 'proc-10',
    category: 'Operations',
    department: 'Management & Directors',
    title: 'Critical Incident, Deadline Emergency & Escalation Matrix',
    description: 'Crisis protocol when project deadlines are endangered, client conflicts arise, or technical failure occurs.',
    roleResponsible: 'Executive Management & Directors',
    sla: 'Immediate response (< 30 minutes)',
    priority: 'Critical',
    requiredInputs: [
      'Description of risk (e.g. printing defect, data corruption, severe delay)',
      'Impact assessment on client delivery and financial exposure',
      'Immediate mitigation alternatives'
    ],
    deliverables: [
      'Incident containment action plan',
      'Client transparent notification and revised delivery milestone',
      'Post-mortem corrective action note'
    ],
    tags: ['Escalation', 'Emergency', 'Management', 'Risk'],
    lastUpdated: '2024-03-29',
    acknowledgedBy: ['s4', 's1'],
    steps: [
      { id: 's1', text: 'Notify Account Lead and Management immediately via high-priority alert or phone.', role: 'Discovering Staff', timeEstimate: '5 mins', checkpoint: 'Management notified' },
      { id: 's2', text: 'Convene 10-minute emergency standup with relevant department leads to map solutions.', role: 'Operations Lead', timeEstimate: '10 mins', checkpoint: 'Containment plan formed' },
      { id: 's3', text: 'Senior management calls client directly with transparent facts and concrete resolution.', role: 'Management / Director', timeEstimate: '15 mins', checkpoint: 'Client agreement secured' },
      { id: 's4', text: 'Conduct root cause analysis to update SOP preventing similar recurrence in the future.', role: 'Management', timeEstimate: '1 hour', checkpoint: 'SOP updated in Wize OS' }
    ]
  }
];

