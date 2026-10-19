import { Role, StaffMember, PermissionKey, StaffPermissions } from '../types';

/**
 * Hierarchy of privilege levels to enforce strict server & client authorization.
 * High-privilege accounts cannot be modified or assigned by lower-privilege roles.
 */
export const PRIVILEGE_LEVELS: Record<string, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.GM]: 90,
  'GM': 90,
  [Role.ADMIN]: 80,
  [Role.HR]: 60,
  'HR Lead': 60,
  'Creative Lead': 60,
  [Role.MANAGEMENT]: 60,
  [Role.ACCOUNTS]: 60,
  'Finance Manager': 60,
  [Role.AE]: 50,
  'AE': 50,
  'Studio Manager': 40,
  [Role.DESIGNER]: 30,
  'Graphic Designer': 30,
  [Role.COPYWRITER]: 30,
  [Role.EDITOR]: 30,
  'Editor': 30,
  [Role.PROOFREADER]: 30,
  [Role.CAMERAMAN]: 25,
  [Role.SOUND_ENGINEER]: 25,
  [Role.GEN_STAFF]: 10,
};

export const getPrivilegeLevel = (role: Role | string): number => {
  return PRIVILEGE_LEVELS[role] || 10;
};

/**
 * Checks whether an acting administrator is authorized to assign a target role.
 * Admins CANNOT assign roles equal to or greater than their own privilege level.
 * Only Super Admin (Level 100) can assign Super Admin or General Manager.
 */
export const canAssignRole = (actorRole: Role | string, targetRole: Role | string): boolean => {
  const actorLevel = getPrivilegeLevel(actorRole);
  const targetLevel = getPrivilegeLevel(targetRole);

  // Super Admin can assign any role
  if (actorLevel >= 100) return true;

  // Regular Admins cannot self-elevate or assign Super Admin, GM, or equal Admin roles
  return actorLevel > targetLevel;
};

/**
 * Default permission matrix mapped to specific agency job roles.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  [Role.SUPER_ADMIN]: [
    'dashboard.view.personal', 'dashboard.view.executive', 'dashboard.view.analytics',
    'projects.view.assigned', 'projects.view.all', 'projects.create', 'projects.edit', 'projects.delete', 'projects.tasks.assign', 'projects.steps.approve',
    'clients.view.assigned', 'clients.view.all', 'clients.create', 'clients.edit', 'clients.delete',
    'finance.quotes.view', 'finance.quotes.create', 'finance.invoices.view', 'finance.payments.manage', 'finance.petty_cash.manage', 'finance.analytics.view',
    'hr.staff.view', 'hr.employees.manage', 'hr.leaves.review', 'hr.records.restricted',
    'comm.channels.access', 'comm.messages.send', 'comm.channels.create',
    'meetings.view', 'meetings.create', 'meetings.edit', 'meetings.actions.assign',
    'system.employees.view_requests', 'system.employees.approve', 'system.employees.reject', 'system.employees.roles_assign', 'system.employees.suspend', 'system.roles.manage', 'system.audit_logs.view', 'system.backups.manage'
  ],

  [Role.GM]: [
    'dashboard.view.personal', 'dashboard.view.executive', 'dashboard.view.analytics',
    'projects.view.assigned', 'projects.view.all', 'projects.create', 'projects.edit', 'projects.tasks.assign', 'projects.steps.approve',
    'clients.view.assigned', 'clients.view.all', 'clients.create', 'clients.edit',
    'finance.quotes.view', 'finance.quotes.create', 'finance.invoices.view', 'finance.payments.manage', 'finance.analytics.view',
    'hr.staff.view', 'hr.employees.manage', 'hr.leaves.review',
    'comm.channels.access', 'comm.messages.send', 'comm.channels.create',
    'meetings.view', 'meetings.create', 'meetings.edit', 'meetings.actions.assign',
    'system.employees.view_requests', 'system.employees.approve', 'system.employees.reject', 'system.audit_logs.view'
  ],

  [Role.ADMIN]: [
    'dashboard.view.personal', 'dashboard.view.executive', 'dashboard.view.analytics',
    'projects.view.assigned', 'projects.view.all', 'projects.create', 'projects.edit', 'projects.tasks.assign', 'projects.steps.approve',
    'clients.view.assigned', 'clients.view.all', 'clients.create', 'clients.edit',
    'finance.quotes.view', 'finance.invoices.view',
    'hr.staff.view', 'hr.employees.manage', 'hr.leaves.review',
    'comm.channels.access', 'comm.messages.send', 'comm.channels.create',
    'meetings.view', 'meetings.create', 'meetings.edit',
    'system.employees.view_requests', 'system.employees.approve', 'system.employees.reject', 'system.employees.roles_assign', 'system.employees.suspend', 'system.audit_logs.view'
  ],

  [Role.HR]: [
    'dashboard.view.personal',
    'hr.staff.view', 'hr.employees.manage', 'hr.leaves.review', 'hr.records.restricted',
    'comm.channels.access', 'comm.messages.send',
    'meetings.view', 'meetings.create'
  ],

  'Creative Lead': [
    'dashboard.view.personal', 'dashboard.view.analytics',
    'projects.view.assigned', 'projects.view.all', 'projects.edit', 'projects.tasks.assign', 'projects.steps.approve',
    'clients.view.assigned',
    'comm.channels.access', 'comm.messages.send', 'comm.channels.create',
    'meetings.view', 'meetings.create', 'meetings.actions.assign'
  ],

  [Role.MANAGEMENT]: [
    'dashboard.view.personal', 'dashboard.view.analytics',
    'projects.view.assigned', 'projects.view.all', 'projects.create', 'projects.edit', 'projects.tasks.assign', 'projects.steps.approve',
    'clients.view.assigned', 'clients.view.all',
    'comm.channels.access', 'comm.messages.send',
    'meetings.view', 'meetings.create'
  ],

  [Role.ACCOUNTS]: [
    'dashboard.view.personal', 'dashboard.view.analytics',
    'projects.view.assigned', 'projects.view.all',
    'finance.quotes.view', 'finance.quotes.create', 'finance.invoices.view', 'finance.payments.manage', 'finance.petty_cash.manage', 'finance.analytics.view',
    'comm.channels.access', 'comm.messages.send',
    'meetings.view'
  ],

  [Role.AE]: [
    'dashboard.view.personal',
    'projects.view.assigned', 'projects.create', 'projects.edit',
    'clients.view.assigned', 'clients.view.all', 'clients.create', 'clients.edit',
    'finance.quotes.view', 'finance.quotes.create',
    'comm.channels.access', 'comm.messages.send',
    'meetings.view', 'meetings.create', 'meetings.actions.assign'
  ],

  [Role.DESIGNER]: [
    'dashboard.view.personal',
    'projects.view.assigned',
    'comm.channels.access', 'comm.messages.send',
    'meetings.view'
  ],

  [Role.COPYWRITER]: [
    'dashboard.view.personal',
    'projects.view.assigned',
    'comm.channels.access', 'comm.messages.send',
    'meetings.view'
  ],

  [Role.EDITOR]: [
    'dashboard.view.personal',
    'projects.view.assigned',
    'comm.channels.access', 'comm.messages.send',
    'meetings.view'
  ],

  'Studio Manager': [
    'dashboard.view.personal',
    'projects.view.assigned',
    'comm.channels.access', 'comm.messages.send',
    'meetings.view'
  ],

  [Role.GEN_STAFF]: [
    'dashboard.view.personal',
    'comm.channels.access', 'comm.messages.send'
  ]
};

/**
 * Checks whether an employee has a specific permission.
 */
export const hasPermission = (user: StaffMember | null, permission: PermissionKey): boolean => {
  if (!user) return false;

  const role = String(user.role);

  // Super Admin has unrestricted access to all functions
  if (role === Role.SUPER_ADMIN || role === 'Super Admin') {
    return true;
  }

  // Check custom granular override if explicitly defined
  if (user.permissions?.granular && user.permissions.granular[permission] !== undefined) {
    return !!user.permissions.granular[permission];
  }

  // Legacy boolean permission mapping bridge
  if (permission.startsWith('finance.') && user.permissions?.canViewFinance) return true;
  if (permission === 'projects.view.all' && user.permissions?.canViewAllProjects) return true;
  if (permission.startsWith('projects.view') && user.permissions?.canViewProjects) return true;
  if (permission.startsWith('clients.view') && user.permissions?.canViewClientContacts) return true;
  if (permission.startsWith('hr.') && user.permissions?.canManageTeam) return true;
  if (permission === 'hr.leaves.review' && user.permissions?.canApproveLeaves) return true;
  if (permission.startsWith('system.employees.') && user.permissions?.canManageAccessControl) return true;

  // Fallback to role defaults
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS[Role.GEN_STAFF] || [];
  return rolePermissions.includes(permission);
};

/**
 * Checks if a user can access a specific application module/view.
 */
export const canAccessModule = (user: StaffMember | null, view: string): boolean => {
  if (!user) return false;

  const role = String(user.role);
  if (role === Role.SUPER_ADMIN || role === 'Super Admin') return true;

  switch (view) {
    case 'dashboard':
      return hasPermission(user, 'dashboard.view.personal') || hasPermission(user, 'dashboard.view.executive');
    case 'calendar':
      return user.permissions?.canAccessCalendar !== false;
    case 'registry':
      return hasPermission(user, 'projects.view.assigned') || hasPermission(user, 'projects.view.all') || !!user.permissions?.canViewProjects;
    case 'detail':
      return hasPermission(user, 'projects.view.assigned') || hasPermission(user, 'projects.view.all');
    case 'workload':
      return hasPermission(user, 'projects.view.all') || !!user.permissions?.canViewWorkload;
    case 'procedures':
      return user.permissions?.canAccessProcedures !== false;
    case 'finance':
      return hasPermission(user, 'finance.invoices.view') || hasPermission(user, 'finance.analytics.view') || !!user.permissions?.canViewFinance;
    case 'staff':
      return hasPermission(user, 'hr.staff.view') || true; // Directory is visible to team
    case 'clients':
      return hasPermission(user, 'clients.view.all') || hasPermission(user, 'clients.view.assigned') || !!user.permissions?.canViewClientContacts;
    case 'notes':
      return hasPermission(user, 'meetings.view') || true;
    case 'hr':
      return hasPermission(user, 'hr.leaves.review') || hasPermission(user, 'hr.employees.manage') || !!user.permissions?.canApproveLeaves || !!user.permissions?.canManageTeam;
    case 'access':
      // Access Control: Super Admin or Admins with explicit system.employees.view_requests permission
      return role === Role.SUPER_ADMIN || role === 'Super Admin' || hasPermission(user, 'system.employees.view_requests');
    default:
      return true;
  }
};
