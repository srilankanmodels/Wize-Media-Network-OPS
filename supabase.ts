import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuditLog, EmployeeAccessRequest, StaffMember, Role, AccountStatus, DEFAULT_DEPARTMENTS } from './types';
import { canAssignRole, DEFAULT_ROLE_PERMISSIONS } from './utils/permissions';

const getEnv = (key: string, fallback: string = ''): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
      return (import.meta as any).env[key];
    }
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
  } catch {
    // fallback
  }
  return fallback;
};

const supabaseUrl = 
  getEnv('VITE_SUPABASE_URL') || 
  getEnv('SUPABASE_URL') || 
  'https://hriyiiuxlnzpbzgucbga.supabase.co';

const supabaseAnonKey = 
  getEnv('VITE_SUPABASE_ANON_KEY') || 
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || 
  getEnv('SUPABASE_PUBLISHABLE_KEY') || 
  'sb_publishable_xW0mHd93ynTyMwwlInNuFA_J-RYQJfB';

let client: SupabaseClient | null = null;
try {
  if (supabaseUrl && supabaseAnonKey) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
    console.log("🟢 Supabase Protocol: Cloud Database Connected", supabaseUrl);
  }
} catch (err) {
  console.error("🔴 Supabase Protocol: Initialization Failure", err);
}

export const supabase = client;
export const isSupabaseEnabled = !!supabase;

/**
 * Extracts browser, operating system, and device telemetry
 */
export function getClientTelemetry(): { browser: string; os: string; device: string; userAgent: string } {
  if (typeof window === 'undefined') {
    return { browser: 'Server', os: 'Unknown', device: 'Desktop', userAgent: '' };
  }
  const ua = navigator.userAgent;
  let browser = 'Chrome';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Chrome/')) browser = 'Google Chrome';

  let os = 'Windows';
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'Desktop';
  return { browser, os, device, userAgent: ua };
}

// Cached IP to prevent spamming IP lookup on every action
let cachedClientIP: string | null = null;

export async function fetchClientIP(): Promise<string> {
  if (cachedClientIP) return cachedClientIP;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        cachedClientIP = data.ip;
        return data.ip;
      }
    }
  } catch (e) {
    // Fallback if offline or blocked
  }
  cachedClientIP = '127.0.0.1 (Localhost)';
  return cachedClientIP;
}

/**
 * Records a complete security audit log:
 * 1. Inserts into Supabase `audit_logs` table
 * 2. Backs up into Supabase `app_data` table
 * 3. Persists in localStorage `mw_audit_logs`
 */
export async function recordAuditLog(
  logInput: Partial<AuditLog> & {
    userId: string;
    userName: string;
    userEmail: string;
    action: string;
  }
): Promise<AuditLog> {
  const telemetry = getClientTelemetry();
  let ip = '127.0.0.1';
  try {
    ip = await fetchClientIP();
  } catch (e) {
    // ignore
  }

  const logEntry: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: logInput.userId,
    userName: logInput.userName,
    userEmail: logInput.userEmail,
    userRole: logInput.userRole || 'Staff',
    userAvatar: logInput.userAvatar || '',
    action: logInput.action,
    method: logInput.method || 'google_oauth',
    status: logInput.status || 'SUCCESS',
    ipAddress: ip,
    userAgent: telemetry.userAgent,
    browser: telemetry.browser,
    os: telemetry.os,
    device: telemetry.device,
    details: logInput.details || `User ${logInput.userName} (${logInput.userEmail}) performed ${logInput.action}`,
    timestamp: new Date().toISOString(),
    metadata: {
      screen: typeof window !== 'undefined' ? `${window.screen?.width}x${window.screen?.height}` : 'unknown',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      ...(logInput.metadata || {})
    }
  };

  // 1. Save locally first
  try {
    const existing = localStorage.getItem('mw_audit_logs');
    const logs: AuditLog[] = existing ? JSON.parse(existing) : [];
    logs.unshift(logEntry);
    localStorage.setItem('mw_audit_logs', JSON.stringify(logs.slice(0, 300)));
  } catch (e) {
    console.error('Local audit log save error:', e);
  }

  // 2. Save to Supabase Cloud
  if (supabase) {
    try {
      const { error } = await supabase.from('audit_logs').insert([{
        id: logEntry.id,
        user_id: logEntry.userId,
        user_name: logEntry.userName,
        user_email: logEntry.userEmail,
        user_role: logEntry.userRole,
        action: logEntry.action,
        method: logEntry.method,
        status: logEntry.status,
        ip_address: logEntry.ipAddress,
        user_agent: logEntry.userAgent,
        browser: logEntry.browser,
        os: logEntry.os,
        device: logEntry.device,
        details: logEntry.details,
        metadata: logEntry.metadata,
        created_at: logEntry.timestamp
      }]);

      if (error) {
        // Fallback: Store in unified app_data table
        await supabase.from('app_data').upsert({
          key: `audit_${logEntry.id}`,
          value: logEntry,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.debug('Supabase cloud audit log sync fallback:', e);
    }
  }

  return logEntry;
}

/**
 * Loads audit logs from Supabase or LocalStorage
 */
export async function loadAuditLogs(): Promise<AuditLog[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          userName: d.user_name,
          userEmail: d.user_email,
          userRole: d.user_role,
          userAvatar: d.user_avatar || '',
          action: d.action,
          method: d.method,
          status: d.status,
          ipAddress: d.ip_address,
          userAgent: d.user_agent,
          browser: d.browser,
          os: d.os,
          device: d.device,
          details: d.details,
          timestamp: d.created_at || d.timestamp,
          metadata: d.metadata
        }));
      }
    } catch (e) {
      // continue to local fallback
    }
  }

  try {
    const local = localStorage.getItem('mw_audit_logs');
    if (local) return JSON.parse(local);
  } catch (e) {
    // ignore
  }
  return [];
}

/**
 * Syncs an entire dictionary of app data into Supabase `app_data` table
 */
export async function syncAllAppDataToSupabase(dataMap: Record<string, any>): Promise<void> {
  if (!supabase) return;
  try {
    const entries = Object.entries(dataMap).map(([key, value]) => ({
      key: `dataset_${key}`,
      value: value,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('app_data').upsert(entries);
  } catch (e) {
    console.debug('Failed to sync all app data to Supabase:', e);
  }
}

/**
 * Loads entire cloud dataset from Supabase `app_data` table
 */
export async function loadAllAppDataFromSupabase(): Promise<Record<string, any> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('app_data').select('*');
    if (error || !data) return null;
    const result: Record<string, any> = {};
    data.forEach((row: any) => {
      if (row.key && row.key.startsWith('dataset_')) {
        const cleanKey = row.key.replace('dataset_', '');
        result[cleanKey] = row.value;
      }
    });

    // Merge verified employee profiles from dedicated Supabase table
    try {
      const { data: profileRows } = await supabase.from('employee_profiles').select('*');
      if (profileRows && profileRows.length > 0) {
        const staffList: StaffMember[] = Array.isArray(result.staff) ? [...result.staff] : [];
        profileRows.forEach((p: any) => {
          const formatted: StaffMember = {
            id: p.id,
            staffId: p.staff_id || `MW-${p.id.slice(-3)}`,
            name: p.full_name,
            email: p.email,
            role: p.role_name as Role,
            avatarUrl: p.avatar_url,
            department: p.department_name,
            joinedDate: p.approved_at ? new Date(p.approved_at) : new Date(),
            authUserId: p.auth_user_id,
            accountStatus: p.account_status,
            permissions: p.permissions
          };
          const existingIdx = staffList.findIndex(s => s.id === formatted.id || s.email.toLowerCase() === formatted.email.toLowerCase());
          if (existingIdx > -1) {
            staffList[existingIdx] = { ...staffList[existingIdx], ...formatted };
          } else {
            staffList.push(formatted);
          }
        });
        result.staff = staffList;
      }
    } catch (e) {
      // ignore
    }

    return result;
  } catch (e) {
    return null;
  }
}

/**
 * Attempts to sync document to Supabase dedicated table or app_data
 */
export async function syncToSupabase(collectionName: string, id: string, data: any): Promise<void> {
  if (!supabase) return;
  try {
    if (collectionName === 'projects') {
      await supabase.from('projects').upsert({
        id,
        job_number: data.jobNumber || '',
        client_name: data.clientName || '',
        project_name: data.projectName || '',
        type: data.type || '',
        status: data.status || 'In Progress',
        progress: typeof data.progress === 'number' ? data.progress : 0,
        data: data,
        updated_at: new Date().toISOString()
      });
    } else if (collectionName === 'clients') {
      await supabase.from('clients').upsert({
        id,
        company_name: data.companyName || '',
        contact_person: data.contactPerson || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        industry: data.industry || '',
        notes: data.notes || '',
        created_at: data.createdAt || new Date().toISOString()
      });
    } else if (collectionName === 'messages') {
      await supabase.from('messages').upsert({
        id,
        channel_id: data.channelId || '',
        sender_id: data.senderId || '',
        sender_name: data.senderName || '',
        sender_avatar: data.senderAvatar || '',
        text: data.text || '',
        created_at: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString()
      });
    } else if (collectionName === 'staff') {
      await saveOrUpdateUserProfile(data);
    }

    await supabase.from('app_data').upsert({
      key: `${collectionName}_${id}`,
      value: data,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.debug(`Supabase sync failure for ${collectionName}:`, e);
  }
}

/**
 * Attempts to delete document from Supabase dedicated table or app_data
 */
export async function deleteFromSupabase(collectionName: string, id: string): Promise<void> {
  if (!supabase) return;
  try {
    if (collectionName === 'projects') {
      await supabase.from('projects').delete().eq('id', id);
    } else if (collectionName === 'clients') {
      await supabase.from('clients').delete().eq('id', id);
    } else if (collectionName === 'messages') {
      await supabase.from('messages').delete().eq('id', id);
    } else if (collectionName === 'staff') {
      await supabase.from('employee_profiles').delete().eq('id', id);
    }
    await supabase.from('app_data').delete().eq('key', `${collectionName}_${id}`);
  } catch (e) {
    console.debug(`Supabase delete failure for ${collectionName}:`, e);
  }
}

// =========================================================================
// EMPLOYEE ONBOARDING & ACCESS CONTROL (SUPABASE & APP_DATA SYNCHRONIZED)
// =========================================================================

/**
 * Retrieves all employee access requests (Pending, Approved, Rejected)
 */
export async function loadAllAccessRequests(): Promise<EmployeeAccessRequest[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('employee_access_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          authUserId: r.auth_user_id,
          email: r.email,
          fullName: r.full_name,
          avatarUrl: r.avatar_url,
          provider: r.provider || 'google',
          status: r.request_status as AccountStatus,
          requestedAt: r.requested_at,
          reviewedAt: r.reviewed_at,
          reviewedBy: r.reviewed_by,
          reviewedByName: r.reviewed_by_name,
          reviewNotes: r.review_notes,
          assignedDepartment: r.assigned_department,
          assignedRole: r.assigned_role
        }));
      }
    } catch (e) {
      // Continue to app_data fallback
    }

    try {
      const { data } = await supabase.from('app_data').select('value').eq('key', 'access_requests_store').maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        return data.value;
      }
    } catch (e) {
      // fallback
    }
  }

  // Local storage fallback
  try {
    const local = localStorage.getItem('mw_access_requests');
    if (local) return JSON.parse(local);
  } catch (e) {
    // ignore
  }
  return [];
}

/**
 * Creates or retrieves an existing employee access request for a Google sign-in.
 * If user already requested, returns the existing record to prevent duplicates.
 */
export async function createOrGetAccessRequest(input: {
  authUserId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  provider?: string;
}): Promise<EmployeeAccessRequest> {
  const existingRequests = await loadAllAccessRequests();
  const existing = existingRequests.find(
    r => r.authUserId === input.authUserId || r.email.toLowerCase() === input.email.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  const newRequest: EmployeeAccessRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    authUserId: input.authUserId,
    email: input.email.toLowerCase(),
    fullName: input.fullName || input.email.split('@')[0],
    avatarUrl: input.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    provider: input.provider || 'google',
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  const updatedRequests = [newRequest, ...existingRequests];

  // 1. Save to local storage
  try {
    localStorage.setItem('mw_access_requests', JSON.stringify(updatedRequests));
  } catch (e) {
    // ignore
  }

  // 2. Save to Supabase Cloud
  if (supabase) {
    try {
      const { error } = await supabase.from('employee_access_requests').insert([{
        id: newRequest.id,
        auth_user_id: newRequest.authUserId,
        email: newRequest.email,
        full_name: newRequest.fullName,
        avatar_url: newRequest.avatarUrl,
        provider: newRequest.provider,
        request_status: newRequest.status,
        requested_at: newRequest.requestedAt
      }]);

      if (error) {
        // Fallback to app_data
        await supabase.from('app_data').upsert({
          key: 'access_requests_store',
          value: updatedRequests,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.debug('Supabase access request cloud save fallback:', e);
    }
  }

  // Record security audit log
  await recordAuditLog({
    userId: newRequest.authUserId,
    userName: newRequest.fullName,
    userEmail: newRequest.email,
    userRole: 'Guest (Pending)',
    userAvatar: newRequest.avatarUrl,
    action: 'ACCESS_REQUEST_CREATED',
    method: 'google_oauth',
    status: 'SUCCESS',
    details: `Employee onboarding access request submitted via Google account: ${newRequest.email}`
  });

  return newRequest;
}

/**
 * Checks if a Super Admin is already configured in the system.
 */
export async function hasSuperAdminConfigured(): Promise<boolean> {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('employee_profiles')
        .select('id, role_name, account_status')
        .eq('role_name', 'Super Admin')
        .eq('account_status', 'approved')
        .limit(1);

      if (data && data.length > 0) return true;
    } catch (e) {
      // fallback
    }

    try {
      const { data } = await supabase.from('app_data').select('value').eq('key', 'dataset_staff').maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        const found = data.value.some((s: any) => s.role === Role.SUPER_ADMIN || s.role === 'Super Admin');
        if (found) return true;
      }
    } catch (e) {
      // fallback
    }
  }

  try {
    const local = localStorage.getItem('mw_staff');
    if (local) {
      const staff: StaffMember[] = JSON.parse(local);
      return staff.some(s => s.role === Role.SUPER_ADMIN || s.role === 'Super Admin');
    }
  } catch (e) {
    // ignore
  }

  return false;
}

/**
 * Admin action: Approves an employee request, assigns role and department, and activates the profile.
 */
export async function approveEmployeeAccess(
  requestId: string,
  department: string,
  role: Role,
  adminUser: StaffMember
): Promise<{ success: boolean; employee: StaffMember; error?: string }> {
  // Privilege escalation protection
  if (!canAssignRole(adminUser.role, role)) {
    await recordAuditLog({
      userId: adminUser.id,
      userName: adminUser.name,
      userEmail: adminUser.email,
      userRole: String(adminUser.role),
      action: 'PRIVILEGE_ESCALATION_BLOCKED',
      method: 'security_guard',
      status: 'FAILED',
      details: `Admin ${adminUser.name} attempted unauthorized assignment of restricted role ${role}`
    });
    return {
      success: false,
      employee: null as any,
      error: `Privilege Escalation Blocked: Your role (${adminUser.role}) is not authorized to grant '${role}' privileges.`
    };
  }

  const allRequests = await loadAllAccessRequests();
  const targetReq = allRequests.find(r => r.id === requestId);
  if (!targetReq) {
    return { success: false, employee: null as any, error: 'Access request not found.' };
  }

  const approvalTimestamp = new Date().toISOString();

  // Create or resolve active StaffMember
  const newStaffId = `MW-${Math.floor(100 + Math.random() * 900)}`;
  const approvedEmployee: StaffMember = {
    id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    staffId: newStaffId,
    name: targetReq.fullName,
    email: targetReq.email,
    role: role,
    avatarUrl: targetReq.avatarUrl,
    department: department || 'Operations',
    joinedDate: new Date(),
    authUserId: targetReq.authUserId,
    accountStatus: 'approved',
    approvedAt: approvalTimestamp,
    approvedBy: adminUser.id,
    approvedByName: adminUser.name,
    permissions: {
      canViewFinance: role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.GM || role === Role.ACCOUNTS,
      canViewProjects: true,
      canViewAllProjects: role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.GM,
      canViewClientContacts: true,
      canManageTeam: role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.GM || role === Role.HR,
      canApproveLeaves: role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.GM || role === Role.HR || role === Role.MANAGEMENT,
      canAccessCalendar: true,
      canAccessGmail: true,
      canAccessDrive: true,
      canAccessProcedures: true,
      canManageClients: role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.GM || role === Role.AE,
      canManageAccessControl: role === Role.SUPER_ADMIN,
      canViewWorkload: role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.GM || role === Role.AE || role === Role.MANAGEMENT,
      granular: (DEFAULT_ROLE_PERMISSIONS[String(role)] || []).reduce((acc, perm) => {
        acc[perm] = true;
        return acc;
      }, {} as any)
    }
  };

  // Update request in store
  targetReq.status = 'approved';
  targetReq.assignedDepartment = department;
  targetReq.assignedRole = role;
  targetReq.reviewedAt = approvalTimestamp;
  targetReq.reviewedBy = adminUser.id;
  targetReq.reviewedByName = adminUser.name;

  // 1. Update LocalStorage
  let updatedStaffList: StaffMember[] = [];
  try {
    localStorage.setItem('mw_access_requests', JSON.stringify(allRequests));
    const localStaff = localStorage.getItem('mw_staff');
    updatedStaffList = localStaff ? JSON.parse(localStaff) : [];
    const existingIdx = updatedStaffList.findIndex(s => s.email.toLowerCase() === approvedEmployee.email.toLowerCase());
    if (existingIdx > -1) {
      updatedStaffList[existingIdx] = { ...updatedStaffList[existingIdx], ...approvedEmployee };
    } else {
      updatedStaffList.push(approvedEmployee);
    }
    localStorage.setItem('mw_staff', JSON.stringify(updatedStaffList));
  } catch (e) {
    // ignore
  }

  // 2. Update Supabase Cloud
  if (supabase) {
    try {
      // Update request table
      await supabase.from('employee_access_requests').update({
        request_status: 'approved',
        assigned_department: department,
        assigned_role: String(role),
        reviewed_at: approvalTimestamp,
        reviewed_by: adminUser.id,
        reviewed_by_name: adminUser.name
      }).eq('id', requestId);

      // Upsert into employee_profiles
      await supabase.from('employee_profiles').upsert({
        id: approvedEmployee.id,
        auth_user_id: approvedEmployee.authUserId,
        full_name: approvedEmployee.name,
        email: approvedEmployee.email,
        avatar_url: approvedEmployee.avatarUrl,
        department_name: approvedEmployee.department,
        role_name: String(approvedEmployee.role),
        account_status: 'approved',
        permissions: approvedEmployee.permissions,
        approved_at: approvalTimestamp,
        approved_by: adminUser.id,
        approved_by_name: adminUser.name,
        updated_at: approvalTimestamp
      });

      // Update app_data backup
      await supabase.from('app_data').upsert([
        {
          key: 'access_requests_store',
          value: allRequests,
          updated_at: approvalTimestamp
        },
        {
          key: 'dataset_staff',
          value: updatedStaffList,
          updated_at: approvalTimestamp
        }
      ]);
    } catch (e) {
      console.debug('Cloud employee approval sync fallback:', e);
    }
  }

  // 3. Security Audit Log
  await recordAuditLog({
    userId: adminUser.id,
    userName: adminUser.name,
    userEmail: adminUser.email,
    userRole: String(adminUser.role),
    action: 'EMPLOYEE_APPROVED',
    method: 'admin_console',
    status: 'SUCCESS',
    details: `Admin ${adminUser.name} approved employee ${approvedEmployee.name} (${approvedEmployee.email}) -> Role: ${role}, Dept: ${department}`
  });

  return { success: true, employee: approvedEmployee };
}

/**
 * Admin action: Rejects an employee access request.
 */
export async function rejectEmployeeAccess(
  requestId: string,
  notes: string,
  adminUser: StaffMember
): Promise<{ success: boolean; error?: string }> {
  const allRequests = await loadAllAccessRequests();
  const targetReq = allRequests.find(r => r.id === requestId);
  if (!targetReq) return { success: false, error: 'Request not found.' };

  const timestamp = new Date().toISOString();
  targetReq.status = 'rejected';
  targetReq.reviewedAt = timestamp;
  targetReq.reviewedBy = adminUser.id;
  targetReq.reviewedByName = adminUser.name;
  targetReq.reviewNotes = notes || 'Declined by administration';

  // 1. LocalStorage
  try {
    localStorage.setItem('mw_access_requests', JSON.stringify(allRequests));
  } catch (e) {
    // ignore
  }

  // 2. Supabase
  if (supabase) {
    try {
      await supabase.from('employee_access_requests').update({
        request_status: 'rejected',
        reviewed_at: timestamp,
        reviewed_by: adminUser.id,
        reviewed_by_name: adminUser.name,
        review_notes: targetReq.reviewNotes
      }).eq('id', requestId);

      await supabase.from('app_data').upsert({
        key: 'access_requests_store',
        value: allRequests,
        updated_at: timestamp
      });
    } catch (e) {
      console.debug('Cloud reject sync fallback:', e);
    }
  }

  // 3. Audit Log
  await recordAuditLog({
    userId: adminUser.id,
    userName: adminUser.name,
    userEmail: adminUser.email,
    userRole: String(adminUser.role),
    action: 'EMPLOYEE_REJECTED',
    method: 'admin_console',
    status: 'SUCCESS',
    details: `Admin ${adminUser.name} declined employee access request for ${targetReq.fullName} (${targetReq.email}). Reason: ${notes || 'Not specified'}`
  });

  return { success: true };
}

/**
 * Admin action: Suspends an employee's access immediately.
 */
export async function suspendEmployeeAccess(
  staffId: string,
  adminUser: StaffMember
): Promise<{ success: boolean; error?: string }> {
  let staffList: StaffMember[] = [];
  try {
    const local = localStorage.getItem('mw_staff');
    if (local) staffList = JSON.parse(local);
  } catch (e) {
    // ignore
  }

  const target = staffList.find(s => s.id === staffId || s.staffId === staffId);
  if (!target) return { success: false, error: 'Employee not found.' };

  // Protection: Cannot suspend someone of higher or equal privilege unless Super Admin
  if (adminUser.role !== Role.SUPER_ADMIN && !canAssignRole(adminUser.role, target.role)) {
    return {
      success: false,
      error: `Permission Denied: You cannot suspend an administrator of equal or higher privilege (${target.role}).`
    };
  }

  target.accountStatus = 'suspended';

  try {
    localStorage.setItem('mw_staff', JSON.stringify(staffList));
  } catch (e) {
    // ignore
  }

  if (supabase) {
    try {
      await supabase.from('employee_profiles').update({
        account_status: 'suspended',
        updated_at: new Date().toISOString()
      }).eq('email', target.email);

      await supabase.from('app_data').upsert({
        key: 'dataset_staff',
        value: staffList,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.debug('Cloud suspend fallback:', e);
    }
  }

  await recordAuditLog({
    userId: adminUser.id,
    userName: adminUser.name,
    userEmail: adminUser.email,
    userRole: String(adminUser.role),
    action: 'EMPLOYEE_SUSPENDED',
    method: 'admin_console',
    status: 'SUCCESS',
    details: `Admin ${adminUser.name} suspended account for employee ${target.name} (${target.email})`
  });

  return { success: true };
}

/**
 * Admin action: Reactivates a suspended employee.
 */
export async function reactivateEmployeeAccess(
  staffId: string,
  adminUser: StaffMember
): Promise<{ success: boolean; error?: string }> {
  let staffList: StaffMember[] = [];
  try {
    const local = localStorage.getItem('mw_staff');
    if (local) staffList = JSON.parse(local);
  } catch (e) {
    // ignore
  }

  const target = staffList.find(s => s.id === staffId || s.staffId === staffId);
  if (!target) return { success: false, error: 'Employee not found.' };

  target.accountStatus = 'approved';

  try {
    localStorage.setItem('mw_staff', JSON.stringify(staffList));
  } catch (e) {
    // ignore
  }

  if (supabase) {
    try {
      await supabase.from('employee_profiles').update({
        account_status: 'approved',
        updated_at: new Date().toISOString()
      }).eq('email', target.email);

      await supabase.from('app_data').upsert({
        key: 'dataset_staff',
        value: staffList,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.debug('Cloud reactivate fallback:', e);
    }
  }

  await recordAuditLog({
    userId: adminUser.id,
    userName: adminUser.name,
    userEmail: adminUser.email,
    userRole: String(adminUser.role),
    action: 'EMPLOYEE_REACTIVATED',
    method: 'admin_console',
    status: 'SUCCESS',
    details: `Admin ${adminUser.name} restored active status for employee ${target.name} (${target.email})`
  });

  return { success: true };
}

/**
 * Super Admin action: Bootstraps the first founding Super Admin account.
 */
export async function bootstrapFirstSuperAdmin(
  authUserId: string,
  email: string,
  fullName: string,
  avatarUrl?: string
): Promise<StaffMember> {
  const timestamp = new Date().toISOString();
  const superAdminUser: StaffMember = {
    id: `superadmin_root_${Date.now()}`,
    staffId: 'MW-000',
    name: fullName || 'Master Super Admin',
    email: email.toLowerCase(),
    role: Role.SUPER_ADMIN,
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    department: 'Management',
    joinedDate: new Date(),
    authUserId: authUserId,
    accountStatus: 'approved',
    approvedAt: timestamp,
    approvedBy: 'SYSTEM_BOOTSTRAP',
    approvedByName: 'Initial System Provisioning',
    permissions: {
      canViewFinance: true,
      canViewProjects: true,
      canViewAllProjects: true,
      canViewClientContacts: true,
      canManageTeam: true,
      canApproveLeaves: true,
      canAccessCalendar: true,
      canAccessGmail: true,
      canAccessDrive: true,
      canAccessProcedures: true,
      canManageClients: true,
      canManageAccessControl: true,
      canViewWorkload: true,
      granular: (DEFAULT_ROLE_PERMISSIONS[Role.SUPER_ADMIN] || []).reduce((acc, p) => {
        acc[p] = true;
        return acc;
      }, {} as any)
    }
  };

  // 1. Save to local
  try {
    const local = localStorage.getItem('mw_staff');
    const list: StaffMember[] = local ? JSON.parse(local) : [];
    const idx = list.findIndex(s => s.email.toLowerCase() === superAdminUser.email.toLowerCase());
    if (idx > -1) list[idx] = superAdminUser;
    else list.unshift(superAdminUser);
    localStorage.setItem('mw_staff', JSON.stringify(list));
  } catch (e) {
    // ignore
  }

  // 2. Save to cloud
  if (supabase) {
    try {
      await supabase.from('employee_profiles').upsert({
        id: superAdminUser.id,
        auth_user_id: superAdminUser.authUserId,
        full_name: superAdminUser.name,
        email: superAdminUser.email,
        avatar_url: superAdminUser.avatarUrl,
        department_name: superAdminUser.department,
        role_name: String(superAdminUser.role),
        account_status: 'approved',
        permissions: superAdminUser.permissions,
        approved_at: timestamp,
        approved_by: 'SYSTEM_BOOTSTRAP',
        approved_by_name: 'Initial System Provisioning',
        updated_at: timestamp
      });
    } catch (e) {
      console.debug('Cloud bootstrap fallback:', e);
    }
  }

  await recordAuditLog({
    userId: superAdminUser.id,
    userName: superAdminUser.name,
    userEmail: superAdminUser.email,
    userRole: String(superAdminUser.role),
    action: 'SUPER_ADMIN_BOOTSTRAPPED',
    method: 'bootstrap_protocol',
    status: 'SUCCESS',
    details: `Master Super Admin successfully provisioned and bound to verified Google identity: ${superAdminUser.email}`
  });

  return superAdminUser;
}

// =========================================================================
// GOOGLE WORKSPACE PROTOCOL VIA SUPABASE OAUTH (CALENDAR, GMAIL, DRIVE)
// =========================================================================

/**
 * Automatically saves or updates the authenticated employee profile in Supabase database.
 * Upserts into `employee_profiles` table and updates `dataset_staff` in `app_data`.
 */
export async function saveOrUpdateUserProfile(user: StaffMember, authUserId?: string): Promise<void> {
  if (!supabase) return;
  try {
    const payload: any = {
      id: user.id || `staff_${Date.now()}`,
      auth_user_id: authUserId || user.authUserId || user.id,
      full_name: user.name,
      email: user.email.toLowerCase(),
      avatar_url: user.avatarUrl || null,
      department_name: user.department || 'General',
      role_name: String(user.role),
      account_status: user.accountStatus || 'approved',
      permissions: user.permissions || {},
      updated_at: new Date().toISOString()
    };

    // Upsert into dedicated Supabase employee_profiles table
    await supabase.from('employee_profiles').upsert(payload, { onConflict: 'email' });

    // Sync to dataset_staff backup in app_data
    const { data } = await supabase.from('app_data').select('value').eq('key', 'dataset_staff').maybeSingle();
    let staff: StaffMember[] = Array.isArray(data?.value) ? data.value : [];
    const idx = staff.findIndex(s => s.email.toLowerCase() === user.email.toLowerCase());
    if (idx > -1) {
      staff[idx] = { ...staff[idx], ...user };
    } else {
      staff.push(user);
    }
    await supabase.from('app_data').upsert({
      key: 'dataset_staff',
      value: staff,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.debug('saveOrUpdateUserProfile notice:', e);
  }
}

export const GOOGLE_WORKSPACE_SCOPES = {
  CALENDAR: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
  GMAIL: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
  DRIVE: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file'
};

/**
 * Initiates Supabase Google OAuth for Google Workspace features (Calendar, Gmail, Drive).
 * Bypasses Firebase entirely.
 */
export async function connectGoogleViaSupabase(scopes: string = GOOGLE_WORKSPACE_SCOPES.CALENDAR): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase client is not initialized.') };
  }
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes,
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    return { error: error ? new Error(error.message) : null };
  } catch (err: any) {
    return { error: new Error(err.message || 'Supabase Google OAuth initialization failed.') };
  }
}

/**
 * Disconnects Google Workspace token from session
 */
export function disconnectGoogleWorkspaceToken(): void {
  sessionStorage.removeItem('mw_google_calendar_token');
  sessionStorage.removeItem('mw_google_calendar_email');
  sessionStorage.removeItem('mw_google_provider_token');
  sessionStorage.removeItem('mw_google_gmail_token');
  sessionStorage.removeItem('mw_google_drive_token');
}
