import React, { useState, useRef } from 'react';
import { StaffMember, Role, AgencyProfile, StaffPermissions } from '../types';
import { Trash2, Edit2, Plus, Search, Mail, Phone, Shield, X, Save, User, Camera, Upload, CreditCard, Lock, Printer, Settings, ChevronDown, Building, Globe, MapPin, Pencil, Download, Calendar, CheckCircle2, AlertCircle, Info, ShieldCheck, Heart, ShieldAlert, ArrowUpRight, Check, Sliders, DollarSign } from 'lucide-react';

interface StaffManagementProps {
  staffList: StaffMember[];
  onAddStaff: (staff: StaffMember) => void;
  onUpdateStaff: (staff: StaffMember) => void;
  onDeleteStaff: (id: string) => void;
  currentUserRole: Role;
  departments: string[];
  roles: string[];
  onUpdateDepartments: (depts: string[]) => void;
  onUpdateRoles: (roles: string[]) => void;
  agencyProfile: AgencyProfile;
  onUpdateAgencyProfile: (profile: AgencyProfile) => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ 
    staffList, onAddStaff, onUpdateStaff, onDeleteStaff, currentUserRole,
    departments, roles, onUpdateDepartments, onUpdateRoles, agencyProfile, onUpdateAgencyProfile
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIDCardOpen, setIsIDCardOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false); 
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedStaffForAccess, setSelectedStaffForAccess] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedForID, setSelectedForID] = useState<StaffMember | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [newItemText, setnewItemText] = useState('');
  const [configTab, setConfigTab] = useState<'departments' | 'roles' | 'agency'>('agency');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<StaffMember>>({
    name: '',
    email: '',
    role: roles[0] || Role.AE,
    department: departments[0] || '',
    phone: '',
    avatarUrl: '',
    staffId: '',
    password: '',
    joinedDate: new Date()
  });

  const [agencyFormData, setAgencyFormData] = useState<AgencyProfile>(agencyProfile);

  const normRole = (currentUserRole || '').toLowerCase();
  const isSuperAdmin = normRole === 'super admin' || currentUserRole === Role.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || normRole === 'admin' || currentUserRole === Role.ADMIN;
  const isGM = normRole === 'general manager' || normRole === 'gm' || currentUserRole === Role.GM;
  const isHR = normRole === 'hr' || currentUserRole === Role.HR;

  // Rule: Only admins, GM or HR should be able to add or delete employers
  const canAddDeleteStaff = isSuperAdmin || isAdmin || isGM || isHR;

  // Rule: Admins and GM have full access & access management to give/recall access
  const canManageAccess = isAdmin || isGM;
  const canManage = canAddDeleteStaff || canManageAccess || normRole === 'management' || currentUserRole === Role.MANAGEMENT;

  const filteredStaff = staffList.filter(s => {
    const search = searchTerm.toLowerCase();
    return (
        (s.name?.toLowerCase() || '').includes(search) || 
        (s.email?.toLowerCase() || '').includes(search) ||
        (s.role?.toLowerCase() || '').includes(search) ||
        (s.department?.toLowerCase() || '').includes(search) ||
        (s.staffId?.toLowerCase() || '').includes(search)
    );
  });

  const handleEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({ ...staff, password: staff.password || '', joinedDate: staff.joinedDate ? new Date(staff.joinedDate) : new Date() });
    setConfirmPassword(staff.password || '');
    setIsModalOpen(true);
  };

  const handleOpenIDCard = (staff: StaffMember) => {
    setSelectedForID(staff);
    setIsIDCardOpen(true);
  };

  const handleAddNew = () => {
    setEditingStaff(null);
    setFormData({
      name: '', email: '', role: roles[0] || Role.AE, department: departments[0] || '', phone: '', avatarUrl: '',
      staffId: 'AUTO-GENERATED', password: '', joinedDate: new Date()
    });
    setConfirmPassword('');
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAgencyFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAgencyFormData(prev => ({ ...prev, signatureUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    
    const finalAvatar = formData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || '')}&background=random`;
    
    const baseStaff: StaffMember = {
        id: editingStaff?.id || Date.now().toString(),
        name: formData.name || '',
        email: formData.email || '',
        role: formData.role || roles[0] || Role.AE,
        department: formData.department || departments[0] || '',
        avatarUrl: finalAvatar,
        staffId: editingStaff?.staffId || `MW-S-${(staffList.length + 1).toString().padStart(4, '0')}`,
        password: formData.password || 'password123',
        phone: formData.phone || '',
        joinedDate: formData.joinedDate || new Date(),
        bloodGroup: formData.bloodGroup || '',
        emergencyContactName: formData.emergencyContactName || '',
        emergencyContactPhone: formData.emergencyContactPhone || '',
        allergies: formData.allergies || '',
        medicalConditions: formData.medicalConditions || '',
        mentalHealth: formData.mentalHealth || '',
        lifestyleHabits: formData.lifestyleHabits || ''
    };

    if (editingStaff) {
      onUpdateStaff(baseStaff);
    } else {
      onAddStaff(baseStaff);
    }
    setIsModalOpen(false);
  };

  const handleSaveAgencyProfile = (e: React.FormEvent) => {
      e.preventDefault();
      onUpdateAgencyProfile(agencyFormData);
      setIsConfigOpen(false);
  };

  const handleAddConfigItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemText.trim()) return;
      if (configTab === 'departments') {
          onUpdateDepartments([...departments, newItemText.trim()]);
      } else if (configTab === 'roles') {
          onUpdateRoles([...roles, newItemText.trim()]);
      }
      setnewItemText('');
  };

  const handleDeleteConfigItem = (item: string) => {
      if (configTab === 'departments') {
          onUpdateDepartments(departments.filter(d => d !== item));
      } else {
          onUpdateRoles(roles.filter(r => r !== item));
      }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Banner matching Screenshot */}
      <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-8 sm:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.25em] mb-2">
            PROPRIETARY ECOSYSTEM // PERSONNEL ROSTER
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-heading leading-none">
            TEAM <span className="text-neutral-500">DEPLOYMENT</span>
          </h1>
          <p className="text-neutral-400 text-xs font-mono uppercase tracking-wider mt-3">
            Strategic Personnel Directory, Access Control & Deployment Logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-6 py-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-left">
            <div className="text-[9px] text-neutral-400 uppercase tracking-widest">ACTIVE SPECIALISTS</div>
            <div className="text-2xl font-black text-white leading-none mt-1">{staffList.length}</div>
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => { setAgencyFormData(agencyProfile); setIsConfigOpen(true); }} 
                className="bg-[#12141a] hover:bg-[#181a22] text-neutral-300 border border-neutral-800 px-4 py-3.5 font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Settings size={15} /> SETTINGS
              </button>
              {canManageAccess && (
                <button 
                  onClick={() => setIsAccessModalOpen(true)} 
                  className="bg-[#141624] hover:bg-[#1c1f33] text-indigo-300 border border-indigo-500/40 px-4 py-3.5 font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  title="Admin Access Management: Grant or recall permissions for any employee"
                >
                  <ShieldCheck size={15} className="text-indigo-400" /> ACCESS MATRIX
                </button>
              )}
              {canAddDeleteStaff && (
                <button 
                  onClick={handleAddNew}
                  className="bg-white text-black hover:bg-neutral-200 px-6 py-3.5 font-black text-xs uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={16} strokeWidth={3} /> DEPLOY MEMBER
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input 
          type="text" 
          placeholder="SEARCH SPECIALISTS BY NAME, STAFF ID, DIVISION OR ROLE..." 
          className="w-full pl-12 pr-6 py-3.5 bg-[#0a0b0e] border border-neutral-800 focus:border-white font-mono text-xs uppercase tracking-wider text-white outline-none rounded-sm transition-colors placeholder:text-neutral-600"
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map(staff => (
          <div 
            key={staff.id} 
            className="bg-[#0a0b0e] border border-neutral-800 hover:border-neutral-700 rounded-sm p-6 flex flex-col justify-between transition-all group relative overflow-hidden"
          >
            <div>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-sm bg-[#12141a] border border-neutral-700 overflow-hidden shrink-0">
                    <img src={staff.avatarUrl} alt={staff.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-black text-white text-lg leading-tight uppercase tracking-tight truncate">
                      {staff.name || 'Unknown Name'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider bg-[#12141a] px-2 py-0.5 rounded-sm border border-neutral-800">
                        {staff.role}
                      </span>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {canManageAccess && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedStaffForAccess(staff);
                          setIsAccessModalOpen(true);
                        }} 
                        className="p-1.5 bg-[#141624] border border-indigo-500/40 text-indigo-400 hover:text-white hover:bg-indigo-600/30 rounded-sm transition-colors cursor-pointer"
                        title="Configure Access & Permissions"
                      >
                        <ShieldCheck size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleEdit(staff)} 
                      className="p-1.5 bg-[#12141a] border border-neutral-800 text-neutral-400 hover:text-white rounded-sm transition-colors"
                      title="Edit Profile"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleOpenIDCard(staff)} 
                      className="p-1.5 bg-[#12141a] border border-neutral-800 text-neutral-400 hover:text-indigo-400 rounded-sm transition-colors cursor-pointer"
                      title="Generate ID Card"
                    >
                      <CreditCard size={14} />
                    </button>
                    {canAddDeleteStaff && (
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setStaffToDelete(staff); }} 
                        className="p-1.5 bg-[#12141a] border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-900 rounded-sm transition-colors cursor-pointer"
                        title="Decommission Staff Member (Admin, GM or HR only)"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Specialist Info */}
              <div className="space-y-2.5 pt-4 border-t border-neutral-800/80 font-mono text-xs">
                <div className="flex items-center justify-between text-neutral-300">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Protocol ID</span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-[#12141a] border border-neutral-800 text-white font-mono text-[10px]">
                    {staff.staffId || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-300">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Division</span>
                  <span className="text-white uppercase font-bold truncate max-w-[200px] text-right">{staff.department}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-300">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Email</span>
                  <a href={`mailto:${staff.email}`} className="text-neutral-300 hover:text-white truncate max-w-[200px] hover:underline text-right">{staff.email}</a>
                </div>
                {staff.phone && (
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Phone</span>
                    <span className="text-neutral-300">{staff.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Permissions Summary Badges */}
            <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex flex-wrap gap-1.5 font-mono text-[9px]">
              {staff.permissions?.canViewClientContacts && (
                <span className="px-1.5 py-0.5 rounded-sm bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  Contacts Unlocked
                </span>
              )}
              {staff.permissions?.canViewFinance && (
                <span className="px-1.5 py-0.5 rounded-sm bg-amber-950/60 text-amber-400 border border-amber-800/40">
                  Finance Unlocked
                </span>
              )}
              {staff.permissions?.canViewAllProjects && (
                <span className="px-1.5 py-0.5 rounded-sm bg-blue-950/60 text-blue-400 border border-blue-800/40">
                  All Projects
                </span>
              )}
              {staff.permissions?.canApproveLeaves && (
                <span className="px-1.5 py-0.5 rounded-sm bg-purple-950/60 text-purple-400 border border-purple-800/40">
                  Leave Approver
                </span>
              )}
              {!staff.permissions?.canViewClientContacts && !staff.permissions?.canViewFinance && !staff.permissions?.canViewAllProjects && !staff.permissions?.canApproveLeaves && (
                <span className="px-1.5 py-0.5 rounded-sm bg-[#12141a] text-neutral-500 border border-neutral-800">
                  Standard Scope ({staff.department})
                </span>
              )}
            </div>

            {/* Emergency & Health pill if present */}
            {staff.bloodGroup && (
              <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between font-mono text-[10px] text-neutral-400">
                <span>BLOOD TYPE: <strong className="text-rose-400">{staff.bloodGroup}</strong></span>
                {staff.emergencyContactPhone && <span>ICE: {staff.emergencyContactPhone}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* SYSTEM CONFIG MODAL */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-neutral-400" />
                <div>
                  <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">SYSTEM ARCHITECTURE</div>
                  <h3 className="text-lg font-black uppercase text-white font-heading">Command Settings</h3>
                </div>
              </div>
              <button onClick={() => setIsConfigOpen(false)} className="text-neutral-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-full md:w-56 bg-[#08090c] border-b md:border-b-0 md:border-r border-neutral-800 p-4 space-y-2 shrink-0">
                {[
                  { id: 'agency', label: 'Agency Profile', icon: Building },
                  { id: 'departments', label: 'Divisions Matrix', icon: Shield },
                  { id: 'roles', label: 'Roles Matrix', icon: User }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setConfigTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm font-mono text-xs uppercase tracking-wider transition-all border ${
                      configTab === tab.id 
                        ? 'bg-white text-black font-black border-white shadow-md' 
                        : 'bg-transparent text-neutral-400 hover:text-white border-transparent hover:border-neutral-800'
                    }`}
                  >
                    <tab.icon size={15} /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Config Content Area */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0b0c0f]">
                {configTab === 'agency' && (
                  <form onSubmit={handleSaveAgencyProfile} className="space-y-6">
                    <div className="flex flex-wrap gap-6 items-center">
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-24 h-24 rounded-sm bg-[#12141a] border-2 border-dashed border-neutral-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-white transition-colors relative group"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          {agencyFormData.logoUrl ? (
                            <img src={agencyFormData.logoUrl} className="w-full h-full object-contain p-2" alt="Logo" />
                          ) : (
                            <Building className="text-neutral-500 w-8 h-8" />
                          )}
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white w-6 h-6" />
                          </div>
                        </div>
                        <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">Master Logo</span>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-40 h-24 rounded-sm bg-[#12141a] border-2 border-dashed border-neutral-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-white transition-colors relative group"
                          onClick={() => signatureInputRef.current?.click()}
                        >
                          {agencyFormData.signatureUrl ? (
                            <img src={agencyFormData.signatureUrl} className="w-full h-full object-contain p-2" alt="Signature" />
                          ) : (
                            <Pencil className="text-neutral-500 w-8 h-8" />
                          )}
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white w-6 h-6" />
                          </div>
                        </div>
                        <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">Auth Signature</span>
                        <input type="file" ref={signatureInputRef} className="hidden" accept="image/*" onChange={handleSignatureUpload} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Legal Agency Entity</label>
                        <input value={agencyFormData.name} onChange={e => setAgencyFormData({...agencyFormData, name: e.target.value})} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Official Email</label>
                        <input type="email" value={agencyFormData.email} onChange={e => setAgencyFormData({...agencyFormData, email: e.target.value})} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Hotline / Telephone</label>
                        <input value={agencyFormData.phone} onChange={e => setAgencyFormData({...agencyFormData, phone: e.target.value})} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Website URL</label>
                        <input value={agencyFormData.website} onChange={e => setAgencyFormData({...agencyFormData, website: e.target.value})} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Corporate Physical Address</label>
                        <input value={agencyFormData.address} onChange={e => setAgencyFormData({...agencyFormData, address: e.target.value})} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-800 flex justify-end">
                      <button type="submit" className="px-6 py-2.5 bg-white text-black font-black font-mono text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm shadow-md transition-all flex items-center gap-2">
                        <Save size={16} /> Save Settings
                      </button>
                    </div>
                  </form>
                )}

                {(configTab === 'departments' || configTab === 'roles') && (
                  <div className="space-y-6">
                    <form onSubmit={handleAddConfigItem} className="flex gap-3">
                      <input 
                        placeholder={`Add new ${configTab === 'departments' ? 'division' : 'role'} identifier...`}
                        className="flex-1 px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm"
                        value={newItemText}
                        onChange={e => setnewItemText(e.target.value)}
                      />
                      <button type="submit" className="bg-white text-black font-black font-mono text-xs uppercase px-5 py-2 rounded-sm hover:bg-neutral-200 flex items-center gap-1.5">
                        <Plus size={15} /> Add
                      </button>
                    </form>

                    <div className="space-y-2">
                      <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
                        Configured {configTab === 'departments' ? 'Divisions' : 'Roles'}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {(configTab === 'departments' ? departments : roles).map(item => (
                          <div key={item} className="bg-[#12141a] border border-neutral-800 px-4 py-3 rounded-sm flex justify-between items-center group hover:border-neutral-700">
                            <span className="font-mono text-xs uppercase text-white font-bold">{item}</span>
                            <button onClick={() => handleDeleteConfigItem(item)} className="p-1 text-neutral-500 hover:text-rose-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACCESS MATRIX / PERMISSIONS MODAL FOR ADMIN & GM */}
      {isAccessModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-indigo-500/30 rounded-sm w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 bg-[#0e0f18] border-b border-indigo-900/40 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-950/60 border border-indigo-600/40 rounded-sm text-indigo-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="font-mono text-[9px] text-indigo-400 uppercase tracking-widest">EXECUTIVE ACCESS CONTROL</div>
                  <h3 className="text-lg font-black uppercase text-white font-heading">
                    Access Governance Matrix
                  </h3>
                </div>
              </div>
              <button onClick={() => { setIsAccessModalOpen(false); setSelectedStaffForAccess(null); }} className="text-neutral-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar bg-[#090a0e]">
              <div className="bg-[#10121a] border border-neutral-800 p-4 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5">
                    Select Specialist Node to Inspect & Grant/Recall Access:
                  </label>
                  <select 
                    value={selectedStaffForAccess?.id || ''} 
                    onChange={e => {
                      const found = staffList.find(s => s.id === e.target.value);
                      setSelectedStaffForAccess(found || null);
                    }}
                    className="px-4 py-2 bg-[#08090d] border border-neutral-700 font-mono text-xs text-white rounded-sm outline-none focus:border-indigo-400 min-w-[280px]"
                  >
                    <option value="">-- Choose Specialist Node --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role} // {s.department})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStaffForAccess && (
                  <div className="flex items-center gap-3 bg-[#0c0d14] px-4 py-2 border border-neutral-800 rounded-sm font-mono text-xs">
                    <img src={selectedStaffForAccess.avatarUrl} className="w-8 h-8 rounded-sm object-cover" alt="" />
                    <div>
                      <div className="text-white font-bold uppercase">{selectedStaffForAccess.name}</div>
                      <div className="text-[10px] text-indigo-400 uppercase">{selectedStaffForAccess.role} • {selectedStaffForAccess.department}</div>
                    </div>
                  </div>
                )}
              </div>

              {selectedStaffForAccess ? (
                <div className="space-y-6">
                  {/* Preset Quick Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest mr-2">Quick Presets:</span>
                    <button 
                      type="button"
                      onClick={() => {
                        const updated: StaffMember = {
                          ...selectedStaffForAccess,
                          permissions: {
                            ...selectedStaffForAccess.permissions,
                            canViewClientContacts: true,
                            canViewAllProjects: false,
                            canViewFinance: false
                          }
                        };
                        setSelectedStaffForAccess(updated);
                        onUpdateStaff(updated);
                      }}
                      className="px-3 py-1.5 bg-[#121422] border border-indigo-500/40 text-indigo-300 hover:text-white rounded-sm font-mono text-[10px] uppercase tracking-wider"
                    >
                      Designer (Contacts Unlocked)
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const updated: StaffMember = {
                          ...selectedStaffForAccess,
                          permissions: {
                            ...selectedStaffForAccess.permissions,
                            canViewClientContacts: true,
                            canViewAllProjects: false,
                            canViewFinance: false,
                            canApproveLeaves: true
                          }
                        };
                        setSelectedStaffForAccess(updated);
                        onUpdateStaff(updated);
                      }}
                      className="px-3 py-1.5 bg-[#121422] border border-purple-500/40 text-purple-300 hover:text-white rounded-sm font-mono text-[10px] uppercase tracking-wider"
                    >
                      Dept Manager
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const updated: StaffMember = {
                          ...selectedStaffForAccess,
                          permissions: {
                            canViewFinance: true,
                            canViewClientContacts: true,
                            canViewAllProjects: true,
                            canManageTeam: true,
                            canApproveLeaves: true,
                            canManageClients: true,
                            canAccessProcedures: true
                          }
                        };
                        setSelectedStaffForAccess(updated);
                        onUpdateStaff(updated);
                      }}
                      className="px-3 py-1.5 bg-white text-black font-bold rounded-sm font-mono text-[10px] uppercase tracking-wider hover:bg-neutral-200"
                    >
                      Full Admin Clearance
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const updated: StaffMember = {
                          ...selectedStaffForAccess,
                          permissions: {}
                        };
                        setSelectedStaffForAccess(updated);
                        onUpdateStaff(updated);
                      }}
                      className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white rounded-sm font-mono text-[10px] uppercase tracking-wider"
                    >
                      Reset to Default
                    </button>
                  </div>

                  {/* Matrix of granular permissions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        key: 'canViewClientContacts',
                        title: 'Client Contacts Disclosure',
                        desc: 'Grants access to client emails, phone numbers, and direct stakeholder communication channels (e.g. for Designers or Production Specialists).',
                        icon: Phone,
                        highlight: 'text-emerald-400'
                      },
                      {
                        key: 'canViewFinance',
                        title: 'Finance & Analytics Isolation',
                        desc: 'Unlocks the financial dashboard, petty cash, invoices, revenue metrics, and quotation cost structures. Isolated from others by default.',
                        icon: DollarSign,
                        highlight: 'text-amber-400'
                      },
                      {
                        key: 'canViewAllProjects',
                        title: 'Global Projects Clearance',
                        desc: 'Allows viewing all projects agency-wide instead of restricting visibility strictly to their assigned department or personal tasks.',
                        icon: Globe,
                        highlight: 'text-blue-400'
                      },
                      {
                        key: 'canApproveLeaves',
                        title: 'Leave Approver Authority',
                        desc: 'Enables reviewing, approving, and rejecting leave requests for team members in their relevant division.',
                        icon: Calendar,
                        highlight: 'text-purple-400'
                      },
                      {
                        key: 'canManageTeam',
                        title: 'Personnel Deployment & Deletion',
                        desc: 'Allows deploying new specialists and removing team members. Reserved by default to Admin, GM, or HR.',
                        icon: User,
                        highlight: 'text-rose-400'
                      },
                      {
                        key: 'canManageClients',
                        title: 'Client Portfolio Governance',
                        desc: 'Enables creating new client partner profiles, updating corporate logos, and deleting clients.',
                        icon: Building,
                        highlight: 'text-indigo-400'
                      }
                    ].map(perm => {
                      const isGranted = !!(selectedStaffForAccess.permissions as any)?.[perm.key];
                      return (
                        <div 
                          key={perm.key}
                          onClick={() => {
                            const newPermissions: StaffPermissions = {
                              ...(selectedStaffForAccess.permissions || {}),
                              [perm.key]: !isGranted
                            };
                            const updated: StaffMember = {
                              ...selectedStaffForAccess,
                              permissions: newPermissions
                            };
                            setSelectedStaffForAccess(updated);
                            onUpdateStaff(updated);
                          }}
                          className={`p-4 rounded-sm border cursor-pointer transition-all flex items-start gap-4 ${
                            isGranted 
                              ? 'bg-[#0f1422] border-indigo-500/60 shadow-sm' 
                              : 'bg-[#0c0d12] border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          <div className={`mt-0.5 p-2 rounded-sm border ${
                            isGranted 
                              ? 'bg-indigo-950/80 border-indigo-600/50 text-indigo-400' 
                              : 'bg-[#12141a] border-neutral-800 text-neutral-500'
                          }`}>
                            <perm.icon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-heading font-black text-sm text-white uppercase tracking-tight">
                                {perm.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider font-bold ${
                                isGranted 
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
                                  : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                              }`}>
                                {isGranted ? 'GRANTED' : 'RECALLED'}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                              {perm.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-neutral-800 rounded-sm">
                  <ShieldCheck size={36} className="text-neutral-600 mx-auto mb-3" />
                  <div className="font-heading font-black text-white uppercase text-base">Select a Specialist Node Above</div>
                  <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mt-1">
                    Choose any employee to review their department clearance, contacts disclosure, and authorization states
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#08090d] border-t border-neutral-800 flex justify-between items-center shrink-0">
              <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">
                Changes take effect immediately across all client views & API calls
              </span>
              <button 
                type="button" 
                onClick={() => { setIsAccessModalOpen(false); setSelectedStaffForAccess(null); }}
                className="px-6 py-2 bg-white text-black font-black font-mono text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF DECOMMISSION / DELETE CONFIRMATION MODAL */}
      {staffToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-rose-900/60 rounded-sm w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#160d10] border-b border-rose-900/40 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} className="text-rose-500" />
                <div>
                  <div className="font-mono text-[9px] text-rose-400 uppercase tracking-widest">DECOMMISSION PROTOCOL</div>
                  <h3 className="text-base font-black uppercase text-white font-heading">
                    Confirm Specialist Removal
                  </h3>
                </div>
              </div>
              <button onClick={() => setStaffToDelete(null)} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="font-mono text-xs text-neutral-300 leading-relaxed">
                Are you sure you want to permanently decommission <strong className="text-white uppercase font-bold">{staffToDelete.name}</strong> ({staffToDelete.role} // {staffToDelete.department})?
              </p>
              <div className="p-3 bg-[#120a0d] border border-rose-900/40 rounded-sm font-mono text-[11px] text-rose-300/80 space-y-1">
                <div>• Employee will be removed from active personnel rosters.</div>
                <div>• All active project step assignments will require reassignment.</div>
                <div>• Only Admins, GM, or HR are authorized to perform this operation.</div>
              </div>
            </div>

            <div className="p-4 bg-[#0a0608] border-t border-rose-900/40 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setStaffToDelete(null)} 
                className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  onDeleteStaff(staffToDelete.id);
                  setStaffToDelete(null);
                }} 
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black font-mono text-xs uppercase tracking-wider rounded-sm flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Trash2 size={15} /> Confirm Decommission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF DETAIL / DEPLOY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white shrink-0">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">PERSONNEL PROTOCOL</div>
                <h3 className="text-lg font-black uppercase text-white font-heading">
                  {editingStaff ? 'Update Specialist Node' : 'Deploy Specialist Node'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center">
                <div 
                  className="w-20 h-20 rounded-sm bg-[#12141a] border-2 border-dashed border-neutral-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-white transition-colors relative group" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-neutral-500 w-8 h-8" />
                  )}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white w-6 h-6" />
                  </div>
                </div>
                <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest mt-2">Avatar Graphic Node</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Staff ID</label>
                  <input readOnly value={formData.staffId} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-neutral-500 rounded-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Full Legal Name *</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Email Address *</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Telephone / Mobile</label>
                  <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Division *</label>
                  <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm">
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Assigned Role *</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm">
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Health and ICE Data */}
              <div className="p-4 bg-[#12141a] border border-neutral-800 rounded-sm space-y-4">
                <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
                  CONFIDENTIAL HEALTH & EMERGENCY PROTOCOL
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-mono text-[9px] text-neutral-500 uppercase tracking-widest mb-1">Blood Group</label>
                    <input placeholder="e.g. O+" value={formData.bloodGroup || ''} onChange={e => setFormData({...formData, bloodGroup: e.target.value.toUpperCase()})} className="w-full px-3 py-1.5 bg-[#0b0c0f] border border-neutral-800 font-mono text-xs text-white outline-none rounded-sm" />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] text-neutral-500 uppercase tracking-widest mb-1">ICE Contact Name</label>
                    <input value={formData.emergencyContactName || ''} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} className="w-full px-3 py-1.5 bg-[#0b0c0f] border border-neutral-800 font-mono text-xs text-white outline-none rounded-sm" />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] text-neutral-500 uppercase tracking-widest mb-1">ICE Phone</label>
                    <input value={formData.emergencyContactPhone || ''} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} className="w-full px-3 py-1.5 bg-[#0b0c0f] border border-neutral-800 font-mono text-xs text-white outline-none rounded-sm" />
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-[9px] text-neutral-500 uppercase tracking-widest mb-1">Known Allergies / Medical Notes</label>
                  <input placeholder="e.g. Penicillin, Asthma, etc." value={formData.allergies || ''} onChange={e => setFormData({...formData, allergies: e.target.value})} className="w-full px-3 py-1.5 bg-[#0b0c0f] border border-neutral-800 font-mono text-xs text-white outline-none rounded-sm" />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-white text-black font-black font-mono text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm shadow-md transition-all flex items-center gap-2">
                  <Save size={16} /> Save Specialist Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ID CARD MODAL */}
      {isIDCardOpen && selectedForID && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4 overflow-y-auto">
          <div className="flex flex-col gap-6 items-center py-6 w-full max-w-4xl relative z-10">
            <div id="staff-id-card" className="w-[780px] h-[460px] bg-[#0c0d12] border-2 border-neutral-700 rounded-sm overflow-hidden shadow-2xl relative flex font-mono text-white">
              {/* Left Identity Bar */}
              <div className="w-[230px] bg-[#07080b] p-6 flex flex-col justify-between border-r border-neutral-800 relative">
                <div>
                  <div className="w-14 h-14 bg-white text-black font-black flex items-center justify-center rounded-sm font-heading text-xl mb-4">
                    {agencyProfile.name.slice(0, 2).toUpperCase()}
                  </div>
                  <h3 className="font-heading font-black text-white text-base tracking-tight uppercase leading-tight">
                    {agencyProfile.name}
                  </h3>
                  <div className="text-[9px] text-neutral-400 uppercase tracking-widest mt-1">OPERATIONAL AGENT</div>
                </div>
                <div className="space-y-1.5 text-[9px] text-neutral-400 uppercase">
                  <div>{agencyProfile.address}</div>
                  <div>{agencyProfile.phone}</div>
                  <div className="text-neutral-500 pt-2 border-t border-neutral-800">SECURITY PROTOCOL L-1</div>
                </div>
              </div>

              {/* Right Details */}
              <div className="flex-1 p-8 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-sm bg-[#12141a] border border-neutral-700 overflow-hidden shrink-0">
                      <img src={selectedForID.avatarUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <h2 className="font-heading font-black text-2xl uppercase tracking-tight text-white">
                        {selectedForID.name}
                      </h2>
                      <div className="text-xs uppercase text-neutral-400 font-bold mt-1">
                        {selectedForID.role} // {selectedForID.department}
                      </div>
                      <div className="inline-block mt-2 px-2 py-0.5 bg-[#141620] border border-neutral-800 text-[10px] text-white">
                        ID: {selectedForID.staffId}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-neutral-800/80 pt-4 text-[10px]">
                  <div>
                    <span className="text-neutral-500 uppercase block">Division</span>
                    <span className="text-neutral-300 font-bold uppercase">{selectedForID.department}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 uppercase block">Blood Type</span>
                    <span className="text-rose-400 font-bold">{selectedForID.bloodGroup || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 uppercase block">Emergency ICE</span>
                    <span className="text-neutral-300">{selectedForID.emergencyContactPhone || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                  <div className="text-[9px] text-neutral-500 uppercase">
                    ISSUED BY MEDIAWIZE CREATIVE OS // VERIFIED
                  </div>
                  <div className="h-10 flex items-center">
                    {agencyProfile.signatureUrl ? (
                      <img src={agencyProfile.signatureUrl} className="max-h-full max-w-[140px] object-contain invert" alt="Sig" />
                    ) : (
                      <span className="text-[10px] text-neutral-500 italic">OFFICIAL SIGNATURE</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 w-full max-w-md">
              <button onClick={() => setIsIDCardOpen(false)} className="flex-1 py-3 bg-[#12141a] hover:bg-[#181a24] text-neutral-400 hover:text-white rounded-sm font-mono text-xs uppercase tracking-wider border border-neutral-800 transition-all">
                Dismiss
              </button>
              <button onClick={() => window.print()} className="flex-1 py-3 bg-white text-black hover:bg-neutral-200 rounded-sm font-black font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md">
                <Download size={15} /> Print Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
