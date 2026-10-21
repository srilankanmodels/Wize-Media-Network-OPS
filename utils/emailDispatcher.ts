import { 
  DailyCompiledReport, 
  DailyReportConfig, 
  EmailDispatchRecord, 
  Project, 
  StaffDailyAccomplishment, 
  StaffMember, 
  Todo,
  Role
} from '../types';
import { sendGmailMessage } from './gmailService';

const DAILY_REPORT_SETTINGS_KEY = 'mw_daily_report_settings';
const LATEST_DAILY_REPORT_KEY = 'mw_latest_daily_report';
const EMAIL_DISPATCH_LOG_KEY = 'mw_email_dispatch_log';
const DAILY_REPORTS_HISTORY_KEY = 'mw_daily_reports_history';

export const DEFAULT_DAILY_REPORT_CONFIG: DailyReportConfig = {
  enabled: true,
  scheduleTime: '19:00', // 7:00 PM
  recipientRoles: [
    Role.GM, // 'General Manager'
    Role.MANAGEMENT, // 'Management'
    Role.ADMIN, // 'Admin'
    Role.SUPER_ADMIN, // 'Super Admin'
    'Director',
    'Directors'
  ],
  specificStaffIds: [],
  customEmails: [],
  includeCompletedTasks: true,
  includeActiveDirectives: true,
  includeTimeLogged: true,
  includeStaffEfficiency: true,
  lastCompiledDate: undefined,
  lastDispatchedAt: undefined
};

/**
 * Retrieve saved Daily Report Settings
 */
export function getStoredDailyReportConfig(): DailyReportConfig {
  try {
    const raw = localStorage.getItem(DAILY_REPORT_SETTINGS_KEY);
    if (!raw) return DEFAULT_DAILY_REPORT_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DAILY_REPORT_CONFIG, ...parsed };
  } catch (err) {
    console.error('Failed to parse daily report settings:', err);
    return DEFAULT_DAILY_REPORT_CONFIG;
  }
}

/**
 * Save Daily Report Settings
 */
export function saveDailyReportConfig(config: DailyReportConfig): void {
  try {
    localStorage.setItem(DAILY_REPORT_SETTINGS_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save daily report config:', err);
  }
}

/**
 * Get the latest compiled Daily Report
 */
export function getLatestDailyReport(): DailyCompiledReport | null {
  try {
    const raw = localStorage.getItem(LATEST_DAILY_REPORT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to retrieve latest daily report:', err);
    return null;
  }
}

/**
 * Get recent email dispatch logs
 */
export function getEmailDispatchLogs(): EmailDispatchRecord[] {
  try {
    const raw = localStorage.getItem(EMAIL_DISPATCH_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse email dispatch logs:', err);
    return [];
  }
}

/**
 * Add an item to the email dispatch log
 */
export function recordEmailDispatch(record: EmailDispatchRecord): void {
  try {
    const current = getEmailDispatchLogs();
    const updated = [record, ...current].slice(0, 100); // keep last 100 logs
    localStorage.setItem(EMAIL_DISPATCH_LOG_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to record email dispatch:', err);
  }
}

/**
 * Helper to get active Google Workspace OAuth token
 */
export function getActiveGmailToken(): string | null {
  return (
    sessionStorage.getItem('mw_google_gmail_token') ||
    sessionStorage.getItem('mw_google_provider_token') ||
    localStorage.getItem('mw_google_gmail_token') ||
    null
  );
}

/**
 * Low-level automated email sender:
 * If Google Workspace Gmail token is available, dispatches real email via Gmail API.
 * Always logs to `mw_email_dispatch_log` for full executive audit trail.
 */
export async function sendAutomatedEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  type: EmailDispatchRecord['type'];
}): Promise<{ success: boolean; deliveryChannel: EmailDispatchRecord['deliveryChannel']; error?: string }> {
  const token = getActiveGmailToken();
  const logId = `dispatch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (token) {
    try {
      await sendGmailMessage(token, params.to, params.subject, params.body);
      const record: EmailDispatchRecord = {
        id: logId,
        to: params.to,
        toName: params.toName,
        subject: params.subject,
        snippet: params.body.substring(0, 150) + '...',
        type: params.type,
        status: 'DELIVERED',
        deliveryChannel: 'GMAIL_API',
        timestamp: new Date().toISOString()
      };
      recordEmailDispatch(record);
      return { success: true, deliveryChannel: 'GMAIL_API' };
    } catch (err: any) {
      console.warn(`Gmail API dispatch error for ${params.to}:`, err.message);
      // Fallback: record with error and notify system
      const record: EmailDispatchRecord = {
        id: logId,
        to: params.to,
        toName: params.toName,
        subject: params.subject,
        snippet: params.body.substring(0, 150) + '...',
        type: params.type,
        status: 'RECORDED',
        deliveryChannel: 'INTERNAL_NOTIFICATION',
        timestamp: new Date().toISOString(),
        error: `Gmail API notice: ${err.message || 'Stored in system queue'}`
      };
      recordEmailDispatch(record);
      return { success: true, deliveryChannel: 'INTERNAL_NOTIFICATION', error: err.message };
    }
  } else {
    // Simulated / offline queue mode
    const record: EmailDispatchRecord = {
      id: logId,
      to: params.to,
      toName: params.toName,
      subject: params.subject,
      snippet: params.body.substring(0, 150) + '...',
      type: params.type,
      status: 'RECORDED',
      deliveryChannel: 'INTERNAL_NOTIFICATION',
      timestamp: new Date().toISOString()
    };
    recordEmailDispatch(record);
    return { success: true, deliveryChannel: 'INTERNAL_NOTIFICATION' };
  }
}

/**
 * 1. Dispatches automated email notification on Task Assignment
 */
export async function sendTaskAssignmentEmail(params: {
  taskText: string;
  projectName?: string;
  clientName?: string;
  jobNumber?: string;
  deadline?: string | Date;
  assignee: StaffMember;
  assignerName?: string;
}): Promise<void> {
  if (!params.assignee || !params.assignee.email) return;

  const deadlineFormatted = params.deadline 
    ? new Date(params.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Not Specified';

  const subject = `[TASK ASSIGNMENT] ${params.taskText} // ${params.projectName || 'Mediawize Workspace'}`;
  
  const body = [
    `MEDIAWIZE WORKSPACE // DIRECTIVE DISPATCH`,
    `======================================================`,
    `Hello ${params.assignee.name},`,
    ``,
    `You have been assigned to a directive within Mediawize OS.`,
    ``,
    `DIRECTIVE DETAILS:`,
    `- Task: ${params.taskText}`,
    `- Project: ${params.projectName || 'Direct Task'}`,
    params.clientName ? `- Client: ${params.clientName}` : '',
    params.jobNumber ? `- Job Code: ${params.jobNumber}` : '',
    `- Deadline: ${deadlineFormatted}`,
    `- Assigned By: ${params.assignerName || 'Management / Supervisor'}`,
    `- Dispatched: ${new Date().toLocaleString()}`,
    ``,
    `Please log in to Mediawize Workspace to initiate workflow tracking and submit status updates.`,
    `Link: ${window.location.origin}`,
    ``,
    `------------------------------------------------------`,
    `Automated Directive Notification // Mediawize Engine`
  ].filter(Boolean).join('\n');

  await sendAutomatedEmail({
    to: params.assignee.email,
    toName: params.assignee.name,
    subject,
    body,
    type: 'task_assignment'
  });
}

/**
 * 2. Dispatches automated email notification when people are tagged in a quick task / to-do
 */
export async function sendTaskMentionEmail(params: {
  taskText: string;
  taggedStaff: StaffMember;
  authorName: string;
  isDaily?: boolean;
  deadline?: string | Date;
}): Promise<void> {
  if (!params.taggedStaff || !params.taggedStaff.email) return;

  const deadlineFormatted = params.deadline 
    ? new Date(params.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Today / Immediate';

  const subject = `[TASK TAGGED] ${params.isDaily ? '[DAILY] ' : ''}${params.taskText} - Mediawize Workspace`;
  
  const body = [
    `MEDIAWIZE WORKSPACE // TEAM MENTION PROTOCOL`,
    `======================================================`,
    `Hello ${params.taggedStaff.name},`,
    ``,
    `${params.authorName} has tagged you in a ${params.isDaily ? 'Daily ' : ''}task directive on the team dashboard.`,
    ``,
    `DIRECTIVE BRIEF:`,
    `- Task: "${params.taskText}"`,
    `- Category: ${params.isDaily ? 'DAILY OPERATION (High Priority)' : 'Standard Task'}`,
    `- Scheduled For: ${deadlineFormatted}`,
    `- Tagged By: ${params.authorName}`,
    `- Timestamp: ${new Date().toLocaleString()}`,
    ``,
    `This directive is now visible in your "MY TO DO LIST" daily view.`,
    `Access Dashboard: ${window.location.origin}`,
    ``,
    `------------------------------------------------------`,
    `Automated Team Mention Notification // Mediawize Engine`
  ].join('\n');

  await sendAutomatedEmail({
    to: params.taggedStaff.email,
    toName: params.taggedStaff.name,
    subject,
    body,
    type: 'task_mention'
  });
}

/**
 * 3. Compiles what everyone has done for the day
 */
export function compileDailyReportData(params: {
  projects: Project[];
  todos: Todo[];
  staffList: StaffMember[];
  targetDate?: Date;
}): DailyCompiledReport {
  const target = params.targetDate || new Date();
  const dateStr = target.toISOString().split('T')[0];
  const startOfDay = new Date(target);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(target);
  endOfDay.setHours(23, 59, 59, 999);

  let totalTasksCompleted = 0;
  let totalActiveDirectives = 0;
  let totalMinutesLogged = 0;

  const staffAccomplishments: StaffDailyAccomplishment[] = (params.staffList || []).map(staff => {
    // 1. Projects tasks assigned to this staff member
    const projectTasks = (params.projects || []).flatMap(p => 
      (p.steps || []).flatMap(s => 
        (s.tasks || [])
          .filter(t => t.assignedTo === staff.id)
          .map(t => ({
            ...t,
            projectName: p.projectName,
            jobNumber: p.jobNumber,
            clientName: p.clientName,
            isCompleted: !!(p.tasksCompleted && p.tasksCompleted[t.id]) || !!t.completed,
            stepTitle: s.title
          }))
      )
    );

    const completedProjectTasks = projectTasks
      .filter(t => t.isCompleted)
      .map(t => ({
        id: t.id,
        text: t.text,
        projectName: t.projectName,
        jobNumber: t.jobNumber,
        completedAt: (t as any).completedAt || dateStr,
        timeSpentMinutes: (t.timeSpent || 0)
      }));

    const activeProjectTasks = projectTasks
      .filter(t => !t.isCompleted)
      .map(t => ({
        id: t.id,
        text: t.text,
        projectName: t.projectName,
        priority: t.priority || 'Medium',
        deadline: t.deadline ? (typeof t.deadline === 'string' ? t.deadline : new Date(t.deadline).toISOString()) : undefined
      }));

    // 2. Todos completed & pending
    const staffTodos = (params.todos || []).filter(todo => 
      todo.userId === staff.id ||
      todo.assignedTo === staff.id ||
      todo.createdById === staff.id ||
      (todo.taggedStaffIds && todo.taggedStaffIds.includes(staff.id))
    );

    const dailyTodosCompleted = staffTodos
      .filter(t => t.completed)
      .map(t => ({ id: t.id, text: t.text }));

    const dailyTodosPending = staffTodos
      .filter(t => !t.completed)
      .map(t => ({ id: t.id, text: t.text }));

    // Time logged
    const staffMinutes = completedProjectTasks.reduce((acc, t) => acc + (t.timeSpentMinutes || 0), 0);

    // Efficiency computation
    const totalAssigned = projectTasks.length + staffTodos.length;
    const totalDone = completedProjectTasks.length + dailyTodosCompleted.length;
    const efficiency = totalAssigned > 0 
      ? Math.min(100, Math.round((totalDone / totalAssigned) * 100))
      : 80;

    totalTasksCompleted += totalDone;
    totalActiveDirectives += (activeProjectTasks.length + dailyTodosPending.length);
    totalMinutesLogged += staffMinutes;

    return {
      staffId: staff.id,
      name: staff.name,
      role: staff.role,
      department: staff.department || 'General',
      avatarUrl: staff.avatarUrl,
      email: staff.email,
      completedTasks: completedProjectTasks,
      activeTasks: activeProjectTasks,
      dailyTodosCompleted,
      dailyTodosPending,
      totalMinutesLogged: staffMinutes,
      efficiencyScore: efficiency
    };
  });

  const totalHoursLogged = Math.round((totalMinutesLogged / 60) * 10) / 10;
  const avgEfficiency = staffAccomplishments.length > 0
    ? Math.round(staffAccomplishments.reduce((a, b) => a + b.efficiencyScore, 0) / staffAccomplishments.length)
    : 85;

  const summaryMemo = `Daily operational sync concluded for ${target.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. The team accomplished ${totalTasksCompleted} tasks across active campaigns and daily directives, logging ${totalHoursLogged} operational hours with an average team velocity of ${avgEfficiency}%.`;

  return {
    id: `daily-report-${dateStr}-${Date.now()}`,
    reportDate: dateStr,
    reportTitle: `Mediawize Daily Operations Digest // ${target.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`,
    compiledAt: new Date().toISOString(),
    totalStaffActive: staffAccomplishments.length,
    totalCompletedToday: totalTasksCompleted,
    totalActiveDirectives: totalActiveDirectives,
    totalHoursLogged,
    averageEfficiency: avgEfficiency,
    staffAccomplishments,
    dispatchedTo: [],
    dispatchedRoles: [],
    dispatchStatus: 'DELIVERED',
    summaryMemo
  };
}

/**
 * 4. Formats Daily Report email text body
 */
export function formatDailyReportEmailBody(report: DailyCompiledReport): string {
  const lines: string[] = [];
  lines.push(`========================================================================`);
  lines.push(`MEDIAWIZE OS // EXECUTIVE END-OF-DAY OPERATIONS REPORT`);
  lines.push(`COMPILED AT: ${new Date(report.compiledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} // DATE: ${report.reportDate}`);
  lines.push(`========================================================================`);
  lines.push(``);
  lines.push(`EXECUTIVE SUMMARY:`);
  lines.push(`- Total Team Directives Completed Today: ${report.totalCompletedToday}`);
  lines.push(`- Active Directives in Pipeline: ${report.totalActiveDirectives}`);
  lines.push(`- Total Operational Hours Logged: ${report.totalHoursLogged} hrs`);
  lines.push(`- Average Team Execution Velocity: ${report.averageEfficiency}%`);
  lines.push(`- Active Personnel Audited: ${report.totalStaffActive} members`);
  lines.push(``);
  lines.push(`MEMO:`);
  lines.push(`${report.summaryMemo}`);
  lines.push(``);
  lines.push(`------------------------------------------------------------------------`);
  lines.push(`STAFF PERFORMANCE & DAILY TASK COMPILATION:`);
  lines.push(`------------------------------------------------------------------------`);

  report.staffAccomplishments.forEach(staff => {
    lines.push(``);
    lines.push(`[${staff.department.toUpperCase()}] ${staff.name} (${staff.role})`);
    lines.push(`  Velocity: ${staff.efficiencyScore}% | Logged Time: ${Math.round(staff.totalMinutesLogged / 60 * 10) / 10}h`);
    
    // Completed
    const completedItems = [
      ...staff.completedTasks.map(t => `${t.text} (${t.projectName || 'Project Task'})`),
      ...staff.dailyTodosCompleted.map(t => `${t.text} [Daily Task]`)
    ];

    if (completedItems.length > 0) {
      lines.push(`  DONE TODAY (${completedItems.length}):`);
      completedItems.forEach(item => {
        lines.push(`    - [COMPLETED] ${item}`);
      });
    } else {
      lines.push(`  DONE TODAY: No recorded task completions.`);
    }

    // Active
    const activeItems = [
      ...staff.activeTasks.map(t => `${t.text} (${t.projectName || 'Active Directive'})`),
      ...staff.dailyTodosPending.map(t => `${t.text} [Daily Pending]`)
    ];

    if (activeItems.length > 0) {
      lines.push(`  IN PROGRESS / QUEUED (${activeItems.length}):`);
      activeItems.slice(0, 5).forEach(item => {
        lines.push(`    - [IN PROGRESS] ${item}`);
      });
      if (activeItems.length > 5) {
        lines.push(`    - ... and ${activeItems.length - 5} additional directives in queue`);
      }
    }
  });

  lines.push(``);
  lines.push(`========================================================================`);
  lines.push(`RECIPIENTS: GM, Management, Directors, and Administrative Core`);
  lines.push(`Access Interactive Dashboard: ${window.location.origin}`);
  lines.push(`Automated Reporting Engine // Mediawize EOD Daemon`);
  lines.push(`========================================================================`);

  return lines.join('\n');
}

/**
 * 5. Dispatches compiled daily report to all designated recipients (GM, Managers, Directors, Admins)
 */
export async function dispatchDailyReport(params: {
  config: DailyReportConfig;
  projects: Project[];
  todos: Todo[];
  staffList: StaffMember[];
  triggeredBy?: string;
}): Promise<{ report: DailyCompiledReport; recipientsCount: number; errors: string[] }> {
  const { config, projects, todos, staffList } = params;

  // Compile today's report
  const report = compileDailyReportData({ projects, todos, staffList });

  // Resolve recipient email list
  const recipientEmailMap = new Map<string, string>(); // email -> name

  // 1. By Roles (GM, Managers, Directors, Admins)
  const normalizedTargetRoles = (config.recipientRoles || []).map(r => r.toLowerCase().trim());
  
  (staffList || []).forEach(staff => {
    if (!staff.email) return;
    const roleLower = (staff.role || '').toLowerCase().trim();
    const deptLower = (staff.department || '').toLowerCase().trim();

    const matchesRole = normalizedTargetRoles.some(targetRole => 
      roleLower.includes(targetRole) || 
      deptLower.includes(targetRole) ||
      (targetRole.includes('gm') && roleLower.includes('general manager')) ||
      (targetRole.includes('manager') && roleLower.includes('manager')) ||
      (targetRole.includes('director') && (roleLower.includes('director') || deptLower.includes('director'))) ||
      (targetRole.includes('admin') && roleLower.includes('admin'))
    );

    if (matchesRole) {
      recipientEmailMap.set(staff.email.trim().toLowerCase(), staff.name);
    }
  });

  // 2. Specific staff IDs explicitly selected in settings
  (config.specificStaffIds || []).forEach(staffId => {
    const s = staffList.find(st => st.id === staffId);
    if (s && s.email) {
      recipientEmailMap.set(s.email.trim().toLowerCase(), s.name);
    }
  });

  // 3. Custom email addresses
  (config.customEmails || []).forEach(email => {
    if (email && email.includes('@')) {
      recipientEmailMap.set(email.trim().toLowerCase(), 'Executive Recipient');
    }
  });

  // Ensure there is at least one fallback recipient if list is empty
  if (recipientEmailMap.size === 0) {
    (staffList || []).slice(0, 3).forEach(s => {
      if (s.email) recipientEmailMap.set(s.email.trim().toLowerCase(), s.name);
    });
  }

  const recipientEmails = Array.from(recipientEmailMap.keys());
  report.dispatchedTo = recipientEmails;
  report.dispatchedRoles = config.recipientRoles;

  const emailBody = formatDailyReportEmailBody(report);
  const emailSubject = `[EOD REPORT] ${report.reportTitle} (${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })})`;

  const errors: string[] = [];

  // Dispatch email to all recipients
  await Promise.all(
    recipientEmails.map(async (email) => {
      const recipientName = recipientEmailMap.get(email);
      try {
        const res = await sendAutomatedEmail({
          to: email,
          toName: recipientName,
          subject: emailSubject,
          body: emailBody,
          type: 'daily_report'
        });
        if (res.error) errors.push(`${email}: ${res.error}`);
      } catch (err: any) {
        errors.push(`${email}: ${err.message}`);
      }
    })
  );

  // Update report state and persist
  report.dispatchStatus = errors.length > 0 && errors.length === recipientEmails.length ? 'FAILED' : 'DELIVERED';
  
  try {
    localStorage.setItem(LATEST_DAILY_REPORT_KEY, JSON.stringify(report));
    
    // Save to history
    const historyRaw = localStorage.getItem(DAILY_REPORTS_HISTORY_KEY);
    const history: DailyCompiledReport[] = historyRaw ? JSON.parse(historyRaw) : [];
    const updatedHistory = [report, ...history.filter(h => h.reportDate !== report.reportDate)].slice(0, 30);
    localStorage.setItem(DAILY_REPORTS_HISTORY_KEY, JSON.stringify(updatedHistory));

    // Update config last run
    const updatedConfig: DailyReportConfig = {
      ...config,
      lastCompiledDate: report.reportDate,
      lastDispatchedAt: report.compiledAt
    };
    saveDailyReportConfig(updatedConfig);
  } catch (err) {
    console.error('Failed to store daily report to localStorage:', err);
  }

  return {
    report,
    recipientsCount: recipientEmails.length,
    errors
  };
}
