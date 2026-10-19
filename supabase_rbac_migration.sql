-- =========================================================================
-- MEDIAWIZE OPS v4.0.2 - ENTERPRISE RBAC & EMPLOYEE VERIFICATION MIGRATION
-- Run this migration in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- =========================================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial MediaWize departments
INSERT INTO public.departments (id, name, description) VALUES
    ('dept_mgmt', 'Management', 'Executive oversight, strategic decision making and general management'),
    ('dept_ar', 'Annual Reports', 'Corporate disclosures, publication layout, typesetting and financial formatting'),
    ('dept_creative', 'Advertising & Creative', 'Brand ideation, copywriting, visual identity and creative art direction'),
    ('dept_tvc', 'TVC & Video Production', 'Commercial video production, post-production, editing and audio engineering'),
    ('dept_brand', 'Brand Identity', 'Corporate positioning, logo systems and brand asset guidelines'),
    ('dept_digital', 'Digital Marketing', 'Digital media buying, social media strategy and performance analytics'),
    ('dept_podcast', 'Podcast Studio', 'Audio podcast recording, sound mixing and video podcast broadcasting'),
    ('dept_events', 'Event Management', 'Corporate activations, press conferences and stage productions'),
    ('dept_cs', 'Account Management', 'Client servicing, brief inception, brand relationships and pitch presentations'),
    ('dept_hr', 'Human Resources', 'Personnel records, employee health vault, leave quotas and recruitment'),
    ('dept_finance', 'Finance', 'Revenue recognition, petty cash float, quotations and invoices'),
    ('dept_admin', 'Administration', 'Office facilities, logistics and operational administration')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description;

-- 2. System Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    privilege_level INTEGER NOT NULL DEFAULT 10,
    is_system_role BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standardized agency job roles with privilege hierarchy
INSERT INTO public.roles (id, name, description, privilege_level, is_system_role) VALUES
    ('role_super_admin', 'Super Admin', 'Full unrestricted enterprise authority, security policy control and database administration', 100, true),
    ('role_gm', 'General Manager', 'Executive operations, high-level financial approvals, and agency governance', 90, true),
    ('role_admin', 'Admin', 'Operational management, employee verification, CRM, and system administration', 80, true),
    ('role_hr', 'HR Lead', 'Staff directory, employee records, leave approvals, and personnel health vault', 60, true),
    ('role_creative_lead', 'Creative Lead', 'Creative campaign oversight, workflow task assignments, and review approvals', 60, true),
    ('role_finance_mgr', 'Finance Manager', 'Quotations, invoicing, client payment updates, petty cash ledger, and revenue analytics', 60, true),
    ('role_ae', 'Account Executive', 'Client brand servicing, new campaign brief inception, client communications, and meetings', 50, true),
    ('role_studio_mgr', 'Studio Manager', 'Studio space scheduling, gear bookings, and production asset operations', 40, true),
    ('role_designer', 'Graphic Designer', 'Assigned production tasks, graphic deliverables, layout proofing, and timesheets', 30, true),
    ('role_copywriter', 'Copywriter', 'Editorial content, headline themes, script development, and proofreading', 30, true),
    ('role_editor', 'Video Editor', 'Post-production editing, motion graphics, video mastering, and render deliverables', 30, true),
    ('role_staff', 'General Staff', 'Standard employee access to personal profile, team directory, and general communication', 10, true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    privilege_level = EXCLUDED.privilege_level;

-- 3. System Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
    id TEXT PRIMARY KEY,
    permission_key TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed granular permission definitions
INSERT INTO public.permissions (id, permission_key, module, description) VALUES
    ('perm_dash_personal', 'dashboard.view.personal', 'dashboard', 'View personal dashboard with assigned tasks and calendar'),
    ('perm_dash_exec', 'dashboard.view.executive', 'dashboard', 'View executive agency performance metrics and pipeline'),
    ('perm_dash_analytics', 'dashboard.view.analytics', 'dashboard', 'View high-level agency telemetry and efficiency matrices'),
    
    ('perm_proj_assigned', 'projects.view.assigned', 'projects', 'View projects where user is assigned tasks'),
    ('perm_proj_all', 'projects.view.all', 'projects', 'View all agency projects across all departments'),
    ('perm_proj_create', 'projects.create', 'projects', 'Initiate new campaign briefs and project job codes'),
    ('perm_proj_edit', 'projects.edit', 'projects', 'Modify project brief specifications and schedules'),
    ('perm_proj_delete', 'projects.delete', 'projects', 'Archive or delete project records'),
    ('perm_proj_assign', 'projects.tasks.assign', 'projects', 'Assign creative steps and tasks to staff'),
    ('perm_proj_approve', 'projects.steps.approve', 'projects', 'Sign off on workflow checkpoints and reviews'),
    
    ('perm_client_assigned', 'clients.view.assigned', 'clients', 'View client records associated with assigned projects'),
    ('perm_client_all', 'clients.view.all', 'clients', 'View full agency corporate client directory'),
    ('perm_client_create', 'clients.create', 'clients', 'Create new corporate client accounts'),
    ('perm_client_edit', 'clients.edit', 'clients', 'Edit client contact information and notes'),
    
    ('perm_fin_quotes_view', 'finance.quotes.view', 'finance', 'View cost estimations and quotations'),
    ('perm_fin_quotes_create', 'finance.quotes.create', 'finance', 'Generate branded PDF quotations from service catalog'),
    ('perm_fin_inv_view', 'finance.invoices.view', 'finance', 'View invoice billing status and payment schedules'),
    ('perm_fin_pay_manage', 'finance.payments.manage', 'finance', 'Record advance payments and client disbursements'),
    ('perm_fin_petty_manage', 'finance.petty_cash.manage', 'finance', 'Record petty cash expenses and float top-ups'),
    ('perm_fin_analytics', 'finance.analytics.view', 'finance', 'View financial margin reporting and department attribution'),
    
    ('perm_hr_view', 'hr.staff.view', 'hr', 'View operational staff roster and contact details'),
    ('perm_hr_manage', 'hr.employees.manage', 'hr', 'Create and manage employee profiles and health vault'),
    ('perm_hr_leaves_review', 'hr.leaves.review', 'hr', 'Approve or reject employee leave requests'),
    
    ('perm_comm_access', 'comm.channels.access', 'communication', 'Participate in team and project communication channels'),
    ('perm_comm_send', 'comm.messages.send', 'communication', 'Broadcast messages and media in team channels'),
    ('perm_comm_create', 'comm.channels.create', 'communication', 'Create new team communication channels'),
    
    ('perm_meet_view', 'meetings.view', 'meetings', 'View meeting minutes and decision logs'),
    ('perm_meet_create', 'meetings.create', 'meetings', 'Log minutes of meetings and assign action items'),
    
    ('perm_sys_view_req', 'system.employees.view_requests', 'system', 'View pending Google employee verification requests'),
    ('perm_sys_approve', 'system.employees.approve', 'system', 'Verify and approve employee access requests with role assignment'),
    ('perm_sys_reject', 'system.employees.reject', 'system', 'Decline employee access requests'),
    ('perm_sys_roles_assign', 'system.employees.roles_assign', 'system', 'Assign or edit employee job roles and departments'),
    ('perm_sys_suspend', 'system.employees.suspend', 'system', 'Suspend or reactivate employee accounts'),
    ('perm_sys_roles_manage', 'system.roles.manage', 'system', 'Configure role permission matrices and policy presets'),
    ('perm_sys_audit_view', 'system.audit_logs.view', 'system', 'Inspect security audit logs and telemetry history'),
    ('perm_sys_backups', 'system.backups.manage', 'system', 'Trigger master database cloud snapshots and restores')
ON CONFLICT (id) DO UPDATE SET 
    permission_key = EXCLUDED.permission_key,
    module = EXCLUDED.module,
    description = EXCLUDED.description;

-- 4. Employee Profiles Table
CREATE TABLE IF NOT EXISTS public.employee_profiles (
    id TEXT PRIMARY KEY,
    auth_user_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    department_id TEXT REFERENCES public.departments(id),
    department_name TEXT,
    role_id TEXT REFERENCES public.roles(id),
    role_name TEXT,
    account_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    approved_by_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_profiles_auth_id ON public.employee_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_email ON public.employee_profiles(email);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_status ON public.employee_profiles(account_status);

-- 5. Employee Access Requests Table
CREATE TABLE IF NOT EXISTS public.employee_access_requests (
    id TEXT PRIMARY KEY,
    auth_user_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    provider TEXT DEFAULT 'google',
    request_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    reviewed_by_name TEXT,
    review_notes TEXT,
    assigned_department TEXT,
    assigned_role TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_requests_auth_user ON public.employee_access_requests(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.employee_access_requests(request_status);

-- 6. Employee Access Audit Table
CREATE TABLE IF NOT EXISTS public.employee_access_audit (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_name TEXT,
    actor_role TEXT,
    target_employee_id TEXT,
    target_employee_name TEXT,
    target_employee_email TEXT,
    action TEXT NOT NULL, -- 'REQUEST_CREATED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REACTIVATED', 'ROLE_CHANGED'
    previous_value JSONB,
    new_value JSONB,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_audit_created_at ON public.employee_access_audit(created_at DESC);

-- 7. Row Level Security Policies
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_access_audit ENABLE ROW LEVEL SECURITY;

-- Allow read access to reference data (departments, roles, permissions)
DROP POLICY IF EXISTS "Public and authenticated read for departments" ON public.departments;
CREATE POLICY "Public and authenticated read for departments" ON public.departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public and authenticated read for roles" ON public.roles;
CREATE POLICY "Public and authenticated read for roles" ON public.roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public and authenticated read for permissions" ON public.permissions;
CREATE POLICY "Public and authenticated read for permissions" ON public.permissions FOR SELECT USING (true);

-- Employee Profiles Policies
DROP POLICY IF EXISTS "Allow authenticated read employee_profiles" ON public.employee_profiles;
CREATE POLICY "Allow authenticated read employee_profiles" ON public.employee_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow full access employee_profiles" ON public.employee_profiles;
CREATE POLICY "Allow full access employee_profiles" ON public.employee_profiles FOR ALL USING (true) WITH CHECK (true);

-- Employee Access Requests Policies
DROP POLICY IF EXISTS "Allow read employee_access_requests" ON public.employee_access_requests;
CREATE POLICY "Allow read employee_access_requests" ON public.employee_access_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert and update employee_access_requests" ON public.employee_access_requests;
CREATE POLICY "Allow insert and update employee_access_requests" ON public.employee_access_requests FOR ALL USING (true) WITH CHECK (true);

-- Employee Access Audit Policies
DROP POLICY IF EXISTS "Allow read employee_access_audit" ON public.employee_access_audit;
CREATE POLICY "Allow read employee_access_audit" ON public.employee_access_audit FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert employee_access_audit" ON public.employee_access_audit;
CREATE POLICY "Allow insert employee_access_audit" ON public.employee_access_audit FOR INSERT WITH CHECK (true);
