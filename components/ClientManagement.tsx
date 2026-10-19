import React, { useState, useRef } from 'react';
import { Client, Role } from '../types';
import { Trash2, Edit2, Plus, Search, Mail, Phone, MapPin, X, Save, Building2, Upload, Camera, ExternalLink, ShieldCheck, ArrowUpRight, Lock } from 'lucide-react';
import { StaffMember } from '../types';

interface ClientManagementProps {
  clientList: Client[];
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  currentUserRole: Role;
  currentUser?: StaffMember | null;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ clientList, onAddClient, onUpdateClient, onDeleteClient, currentUserRole, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Client>>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    logoUrl: '',
    industry: '',
    notes: ''
  });

  const normRole = (currentUserRole || '').toLowerCase();
  const isSuperAdmin = normRole === 'super admin' || currentUserRole === Role.SUPER_ADMIN;
  const isAdmin = isSuperAdmin || normRole === 'admin' || currentUserRole === Role.ADMIN;
  const isGM = normRole === 'general manager' || normRole === 'gm' || currentUserRole === Role.GM;
  const isManagement = normRole === 'management' || currentUserRole === Role.MANAGEMENT;
  const isAE = normRole === 'account executive' || currentUserRole === Role.AE;
  
  // Rule: Admin, GM, Management, AE have contact access by default, OR if admin specifically granted canViewClientContacts (e.g. to Designers)
  const canViewContacts = isSuperAdmin || isAdmin || isGM || isManagement || isAE || !!currentUser?.permissions?.canViewClientContacts;
  
  const canEdit = isSuperAdmin || isAdmin || isGM || isManagement || normRole === 'hr' || currentUserRole === Role.HR || !!currentUser?.permissions?.canManageClients;
  const canAdd = isSuperAdmin || isAdmin || isGM || isManagement || isAE || normRole === 'hr' || currentUserRole === Role.HR || !!currentUser?.permissions?.canManageClients;

  const filteredClients = clientList.filter(c => 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.industry && c.industry.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({ ...client });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setFormData({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      logoUrl: '',
      industry: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) return;

    if (editingClient) {
      onUpdateClient({ ...editingClient, ...formData } as Client);
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        ...formData
      } as Client;
      onAddClient(newClient);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (client: Client) => {
    setClientToDelete(client);
  };

  const handleConfirmDelete = () => {
    if (clientToDelete) {
      onDeleteClient(clientToDelete.id);
      setClientToDelete(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Banner matching Screenshot Theme */}
      <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-8 sm:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.25em] mb-2">
            PROPRIETARY ECOSYSTEM // CLIENT DIRECTORY
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-heading leading-none">
            CLIENT <span className="text-neutral-500">REGISTRY</span>
          </h1>
          <p className="text-neutral-400 text-xs font-mono uppercase tracking-wider mt-3">
            Corporate Partner Profiles, Key Stakeholders & Contact Directives
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-6 py-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-left">
            <div className="text-[9px] text-neutral-400 uppercase tracking-widest">REGISTERED CLIENTS</div>
            <div className="text-2xl font-black text-white leading-none mt-1">{clientList.length}</div>
          </div>
          {canAdd && (
            <button 
              onClick={handleAddNew}
              className="bg-white text-black hover:bg-neutral-200 px-6 py-3.5 font-black text-xs uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> NEW CLIENT ACCOUNT
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input 
          type="text" 
          placeholder="SEARCH CLIENTS BY COMPANY NAME, CONTACT PERSON, OR INDUSTRY..." 
          className="w-full pl-12 pr-6 py-3.5 bg-[#0a0b0e] border border-neutral-800 focus:border-white font-mono text-xs uppercase tracking-wider text-white outline-none rounded-sm transition-colors placeholder:text-neutral-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <div 
            key={client.id} 
            className="bg-[#0a0b0e] border border-neutral-800 hover:border-neutral-700 rounded-sm p-6 flex flex-col justify-between transition-all group relative overflow-hidden"
          >
            {/* Top Bar inside Card */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-sm bg-[#12141a] border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 p-1">
                    {client.logoUrl ? (
                      <img src={client.logoUrl} alt={client.companyName} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Building2 className="text-neutral-500" size={26} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-black text-white text-lg leading-tight uppercase tracking-tight truncate">
                      {client.companyName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider bg-[#12141a] px-2 py-0.5 rounded-sm border border-neutral-800">
                        {client.industry || 'ENTERPRISE'}
                      </span>
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleEdit(client); }} 
                      className="p-1.5 bg-[#12141a] border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 rounded-sm transition-colors cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(client); }} 
                      className="p-1.5 bg-[#12141a] border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-900 rounded-sm transition-colors cursor-pointer"
                      title="Delete Profile"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Stakeholder Details */}
              <div className="space-y-2.5 pt-4 border-t border-neutral-800/80 font-mono text-xs">
                <div className="flex items-center justify-between text-neutral-300">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-widest">Lead Partner</span>
                  <span className="font-bold uppercase text-white truncate">{client.contactPerson || 'N/A'}</span>
                </div>
                {canViewContacts ? (
                  <>
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="text-[10px] text-neutral-400 uppercase tracking-widest">Email</span>
                      <a href={`mailto:${client.email}`} className="text-neutral-300 hover:text-white truncate hover:underline">{client.email}</a>
                    </div>
                    {client.phone && (
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-widest">Phone</span>
                        <span className="text-neutral-300">{client.phone}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-2.5 bg-[#12131a] border border-neutral-800 rounded-sm font-mono text-[10px] text-neutral-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-amber-400/90 font-bold">
                      <Lock size={12} /> CONTACTS RESTRICTED
                    </span>
                    <span className="text-[9px] text-neutral-500 uppercase">
                      Admin clearance needed
                    </span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest">Location</span>
                    <span className="text-neutral-400 truncate max-w-[200px] text-right">{client.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Strategic Notes */}
            {client.notes && (
              <div className="bg-[#12141a] p-3 rounded-sm border border-neutral-800/80 mt-5">
                <div className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest mb-1">
                  STRATEGIC DIRECTIVES // NOTES
                </div>
                <p className="text-xs text-neutral-300 line-clamp-2 font-mono">{client.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal for Add / Edit Client */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">CLIENT PROTOCOL</div>
                <h3 className="text-lg font-black uppercase text-white font-heading">
                  {editingClient ? 'Update Client Account' : 'Register New Client'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center mb-4">
                <div 
                  className="w-20 h-20 rounded-sm bg-[#12141a] border-2 border-dashed border-neutral-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-white transition-colors relative group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Preview" className="max-w-full max-h-full object-contain p-1" />
                  ) : (
                    <div className="text-center p-2">
                      <Building2 className="text-neutral-500 w-6 h-6 mx-auto mb-1" />
                      <span className="font-mono text-[8px] text-neutral-400 uppercase">Brand Logo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white w-5 h-5" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Company / Organization *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. ALPHA TECH GLOBAL"
                  value={formData.companyName} 
                  onChange={e => setFormData({...formData, companyName: e.target.value.toUpperCase()})} 
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Lead Contact Person *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. SARAH JAYAWARDENA"
                  value={formData.contactPerson} 
                  onChange={e => setFormData({...formData, contactPerson: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Email Address *</label>
                  <input 
                    required 
                    type="email" 
                    placeholder="contact@client.com"
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="+94 11 234 5678"
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Industry Classification</label>
                  <input 
                    type="text" 
                    placeholder="e.g. BANKING & FINANCE"
                    value={formData.industry} 
                    onChange={e => setFormData({...formData, industry: e.target.value.toUpperCase()})} 
                    className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Location / Address</label>
                  <input 
                    type="text" 
                    placeholder="e.g. COLOMBO 03"
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Operational & Strategic Notes</label>
                <textarea 
                  placeholder="Key corporate guidelines, brand expectations, or invoice terms..." 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-[#12141a] border border-neutral-800 font-mono text-xs text-white outline-none focus:border-white rounded-sm min-h-[90px] resize-none" 
                />
              </div>

              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2.5 font-mono text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm shadow-md transition-all flex items-center gap-2"
                >
                  <Save size={16} /> Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Replaces blocked window.confirm) */}
      {clientToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0b0c0f] border border-rose-900/60 w-full max-w-md rounded-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-800 bg-rose-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Trash2 size={16} />
                </div>
                <div>
                  <div className="font-mono text-[9px] text-rose-400 uppercase tracking-widest">
                    REGISTRY DIRECTIVE // EXPULSION
                  </div>
                  <h3 className="text-base font-black uppercase text-white font-heading">
                    Confirm Client Deletion
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Are you sure you want to permanently erase <strong className="text-white font-bold">{clientToDelete.companyName}</strong> from the Mediawize Client Directory?
              </p>

              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-[11px] space-y-1 text-neutral-400">
                <div><span className="text-neutral-500 uppercase">Lead Partner:</span> <span className="text-neutral-200">{clientToDelete.contactPerson || 'N/A'}</span></div>
                <div><span className="text-neutral-500 uppercase">Email:</span> <span className="text-neutral-200">{clientToDelete.email || 'N/A'}</span></div>
                <div><span className="text-neutral-500 uppercase">Industry:</span> <span className="text-neutral-200">{clientToDelete.industry || 'ENTERPRISE'}</span></div>
              </div>

              <p className="text-[10px] font-mono text-rose-400/80 uppercase">
                ⚠️ This protocol removes all stored registry telemetry for this client.
              </p>
            </div>

            <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white uppercase tracking-wider transition-colors"
              >
                Abort
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} /> Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
