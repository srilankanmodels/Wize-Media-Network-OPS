
export const Role = {
  SUPER_ADMIN: 'Super Admin',
  AE: 'Account Executive',
  DESIGNER: 'Designer',
  CLIENT: 'Client',
  ACCOUNTS: 'Accounts',
  PROOFREADER: 'Proofreader',
  MANAGEMENT: 'Management',
  ALL: 'All Team',
  HR: 'HR',
  ADMIN: 'Admin',
  GM: 'General Manager',
  INTERNAL_COMMS: 'Internal Communications',
  CAMERAMAN: 'Cameraman',
  ASSISTANT: 'Assistant',
  DRIVER: 'Driver',
  HELPER: 'Helper',
  GEN_STAFF: 'General Staff',
  EDITOR: 'Video Editor',
  SOUND_ENGINEER: 'Sound Engineer',
  COPYWRITER: 'Copywriter'
} as const;

export type Role = typeof Role[keyof typeof Role] | string;

export const DEFAULT_DEPARTMENTS = [
  'Management', 'Creative', 'Client Servicing', 'Production', 
  'Finance', 'Human Resources', 'Digital Strategy', 
  'Media Buying', 'IT / Tech', 'Logistics', 'Directors'
];

export const DEFAULT_ROLES = Object.values(Role);

export interface AgencyProfile {
  name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  taxNumber?: string;
  logoUrl?: string;
  signatureUrl?: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  role: Role;
  requiredApproval?: boolean;
  assignedTo?: string;
  timeAllocated?: number; 
  timeSpent?: number; 
  timerStart?: number; 
  notes?: string; 
  deadline?: Date; 
}

export interface Step {
  id: number;
  title: string;
  description: string;
  tasks: Task[];
  durationWeeks?: number; 
  deadline?: Date; 
  subSteps?: { tasks: Task[] }[];
}

export interface PaymentUpdate {
  id: string;
  projectId: string;
  projectName: string;
  amount: number;
  type: 'Advance' | 'Final' | 'Partial' | 'Retainer';
  status: 'Pending Verification' | 'Verified' | 'Issue';
  method: 'Cheque' | 'Transfer' | 'Cash';
  submittedBy: string;
  timestamp: Date;
  notes?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  url: string;
  size: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedBy: string;
  uploadDate: Date;
  size: string;
}

export interface Message {
  id: string;
  channelId: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  attachments?: Attachment[];
  mentions?: string[]; 
  isSystem?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'project';
  projectId?: string;
  description?: string;
  members: string[]; 
  unreadCount?: number;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  type: 'mention' | 'system' | 'assignment' | 'overdue' | 'payment' | 'chat';
  read: boolean;
  timestamp: Date;
  link?: string;
}

export interface QuoteItem {
  id: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  date: Date;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Approved';
}

export type ProjectType = 
  | 'Annual Reports' 
  | 'Advertising' 
  | 'Podcast Studio' 
  | 'Public Relations' 
  | 'Digital & Media Strategy' 
  | 'Event Management' 
  | 'Production House' 
  | 'Wize Studio' 
  | 'WizeTV';

export interface WorkflowTemplate {
  type: ProjectType;
  description: string;
  steps: Step[];
}

export interface Project {
  id: string;
  jobNumber: string; // Auto-generated
  clientName: string;
  projectName: string;
  projectNotes?: string; 
  type: ProjectType;
  dueDate: Date;
  year: string;
  status: 'In Progress' | 'Completed' | 'On Hold' | 'Paused' | 'Cancelled';
  currentStep: number;
  progress: number;
  tasksCompleted: Record<string, boolean>;
  lastUpdated: Date;
  steps: Step[];
  quotations?: Quotation[];
  documents?: Document[]; 
  channelId?: string; 
  advanceReceived?: boolean;
  paymentUpdates?: PaymentUpdate[];
  comments?: Record<number, any[]>;
  memos?: any[];
  advanceAmount?: number;
  statusChangeHistory?: {
    id: string;
    previousStatus: string;
    newStatus: string;
    reason: string;
    changedBy: string;
    changedByRole: string;
    timestamp: Date | string;
  }[];
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  createdByAvatar?: string;
  createdByDepartment?: string;
  createdByEmail?: string;
  createdByStaffId?: string;
  createdAt?: Date;
}

export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type PermissionKey = 
  // Dashboard
  | 'dashboard.view.personal'
  | 'dashboard.view.executive'
  | 'dashboard.view.analytics'
  // Projects
  | 'projects.view.assigned'
  | 'projects.view.all'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.delete'
  | 'projects.tasks.assign'
  | 'projects.steps.approve'
  // Clients
  | 'clients.view.assigned'
  | 'clients.view.all'
  | 'clients.create'
  | 'clients.edit'
  | 'clients.delete'
  // Finance
  | 'finance.quotes.view'
  | 'finance.quotes.create'
  | 'finance.invoices.view'
  | 'finance.payments.manage'
  | 'finance.petty_cash.manage'
  | 'finance.analytics.view'
  // HR
  | 'hr.staff.view'
  | 'hr.employees.manage'
  | 'hr.leaves.review'
  | 'hr.records.restricted'
  // Communication
  | 'comm.channels.access'
  | 'comm.messages.send'
  | 'comm.channels.create'
  // Meetings
  | 'meetings.view'
  | 'meetings.create'
  | 'meetings.edit'
  | 'meetings.actions.assign'
  // System Administration
  | 'system.employees.view_requests'
  | 'system.employees.approve'
  | 'system.employees.reject'
  | 'system.employees.roles_assign'
  | 'system.employees.suspend'
  | 'system.roles.manage'
  | 'system.audit_logs.view'
  | 'system.backups.manage';

export interface EmployeeAccessRequest {
  id: string;
  authUserId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  provider: string; // 'google'
  status: AccountStatus;
  requestedAt: string; // ISO
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  assignedDepartment?: string;
  assignedRole?: Role;
}

export interface EmployeeAccessAudit {
  id: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  targetEmployeeId: string;
  targetEmployeeName: string;
  targetEmployeeEmail: string;
  action: 'REQUEST_CREATED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'REACTIVATED' | 'ROLE_CHANGED' | string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface StaffPermissions {
  canViewFinance?: boolean;           // Unlocked for Super Admin, Admin, GM, Accounts (or explicitly granted)
  canViewProjects?: boolean;          // Projects visible to Super Admin, Admin, GM, Managers, AEs, and Finance (or explicitly granted)
  canViewClientContacts?: boolean;    // Unlocked for Admin, GM, Management, AE, Designers (or explicitly granted)
  canViewAllProjects?: boolean;       // Unlocked for Super Admin, Admin, GM (Managers are scoped to department)
  canManageTeam?: boolean;            // Unlocked for Super Admin, Admin, GM, HR to add/delete staff
  canApproveLeaves?: boolean;         // Unlocked for Super Admin, Admin, GM, HR, and relevant Department Managers
  canAccessCalendar?: boolean;        // Access to calendar (personal Google Calendar + Agency schedule)
  canAccessGmail?: boolean;           // Access to user's personal Gmail inbox
  canAccessDrive?: boolean;           // Access to user's personal Google Drive
  canAccessProcedures?: boolean;      // Default: true
  canManageClients?: boolean;         // Unlocked for Admin, GM, Management, AE
  canManageAccessControl?: boolean;   // Super Admin ONLY
  canViewWorkload?: boolean;          // Unlocked for AE, Managers, Admin, Super Admin, GM
  // Granular RBAC keys map
  granular?: Partial<Record<PermissionKey, boolean>>;
}

export interface StaffMember {
  id: string;
  staffId: string; // Auto-generated
  name: string;
  email: string;
  role: Role; 
  avatarUrl?: string;
  department: string;
  password?: string;
  phone?: string;
  joinedDate?: Date;
  bloodGroup?: string;
  allergies?: string;
  medicalConditions?: string;
  mentalHealth?: string;
  lifestyleHabits?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  permissions?: StaffPermissions;
  // Google Auth & Employee Verification fields
  authUserId?: string;
  googleId?: string;
  accountStatus?: AccountStatus;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
}

export interface ActionItem {
  id: string;
  text: string;
  assignedTo?: string;
  completed: boolean;
}

export interface MeetingNote {
  id: string;
  title: string;
  text: string;
  category?: 'Meeting' | 'Internal' | 'Client' | 'Brainstorm';
  timestamp: Date;
  author: string;
  authorId?: string;
  projectId?: string; 
  projectName?: string;
  isSavedToWize?: boolean;
  // Meeting Minutes & Tagging
  attendees?: string[];
  taggedStaffIds?: string[];
  taggedStaffNames?: string[];
  agenda?: string;
  actionItems?: ActionItem[];
  duration?: number; // minutes
}

export interface LeaveApprovalTier {
  approved: boolean;
  approvedBy: string;
  approvedById?: string;
  role?: string;
  department?: string;
  email?: string;
  timestamp: Date | string;
  note?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  department?: string;
  staffRole?: string;
  staffEmail?: string;
  type: 'Annual' | 'Sick' | 'Casual' | 'Unpaid' | 'Short';
  startDate: Date;
  endDate: Date;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  timestamp: Date;
  
  // Automatic applicant capture
  appliedBy?: string;
  appliedById?: string;
  appliedByRole?: string;
  appliedByDepartment?: string;
  appliedByEmail?: string;
  appliedAt?: Date | string;
  
  // Workload Handover / Duty Assignment
  assignedWorkloadToId?: string;
  assignedWorkloadToName?: string;
  assignedWorkloadToRole?: string;
  
  // Two-Person Approval Chain (Division Manager & Director)
  managerApproval?: LeaveApprovalTier;
  directorApproval?: LeaveApprovalTier;
  
  // Rejection Audit (Mandatory Reason)
  rejectedBy?: string;
  rejectedById?: string;
  rejectedByRole?: string;
  rejectedByDepartment?: string;
  rejectedByEmail?: string;
  rejectedAt?: Date | string;
  rejectionReason?: string;
  
  // Legacy / backward compatibility
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNote?: string;
}

export interface PettyCashTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  handledBy: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  defaultPrice: number;
  category: string;
}

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  industry?: string;
  notes?: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  deadline?: Date;
  userId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'deadline' | 'meeting' | 'personal';
  userId?: string; 
}

// Procedure interfaces for company-wide SOP and operational protocols
export interface ProcedureStep {
  id: string;
  text: string;
  role?: string;
  timeEstimate?: string;
  checkpoint?: string;
}

export interface Procedure {
  id: string;
  category: 'Operations' | 'Finance' | 'Creative' | 'HR' | 'Production' | 'Digital' | 'Client Servicing' | string;
  title: string;
  description: string;
  department?: string;
  roleResponsible?: string;
  sla?: string;
  priority?: 'High' | 'Normal' | 'Critical';
  requiredInputs?: string[];
  deliverables?: string[];
  steps: ProcedureStep[];
  acknowledgedBy?: string[]; // IDs of staff who acknowledged
  lastUpdated?: string;
  tags?: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  userAvatar?: string;
  action: 'LOGIN' | 'LOGOUT' | 'SESSION_RESTORE' | 'DATABASE_BACKUP' | string;
  method: 'google_oauth' | 'password' | 'demo' | 'session' | 'system' | string;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  status: 'SUCCESS' | 'FAILED';
  details?: string;
  timestamp: string; // ISO String
  metadata?: Record<string, any>;
}

export type JarvisPresetId =
  | 'arc-cyan'
  | 'mark-crimson'
  | 'friday-emerald'
  | 'veronica-violet'
  | 'solar-amber'
  | 'stealth-chrome'
  | 'custom';

export interface JarvisThemeConfig {
  presetId: JarvisPresetId;
  name: string;
  tagline: string;
  primaryAccent: string;
  secondaryAccent: string;
  bgDark: string;
  glassBlur: 'subtle' | 'liquid' | 'deep';
  glowIntensity: 'subtle' | 'medium' | 'high';
  glassOpacity: number;
  ambientOrbs: boolean;
  audioFeedback: boolean;
  scanlineEffect: boolean;
  hudBorders: boolean;
}
