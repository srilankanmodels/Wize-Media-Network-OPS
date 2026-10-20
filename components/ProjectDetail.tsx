import React, { useState, useRef, useEffect } from 'react';
import { Project, StaffMember, ServiceItem, Channel, Message, Attachment, Step, AgencyProfile, Role, PaymentUpdate, Quotation, Document, Task, Notification } from '../types';
import StepCard from './StepCard';
import QuotationBuilder from './QuotationBuilder';
import CommunicationHub from './CommunicationHub';
import { generateQuotationPDF, generateVaultDocumentPDF } from '../utils/pdfGenerator';
import { ArrowLeft, Calendar, Briefcase, FileText, Folder, UploadCloud, Download, Clock, BarChart3, ChevronRight, X, MessageSquare, ShieldCheck, DollarSign, Send, CreditCard, FileCheck, Plus, Zap, ExternalLink, Eye, Hash, Activity, Check, Pencil, ArrowUpRight, PauseCircle, XCircle, PlayCircle, AlertTriangle, ShieldAlert, CheckCircle2, Edit2 } from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  staffList: StaffMember[];
  serviceCatalog: ServiceItem[];
  onUpdateCatalog: (items: ServiceItem[]) => void;
  currentUser: StaffMember;
  channels: Channel[];
  messages: Message[];
  onSendMessage: (text: string, channelId: string, attachments?: Attachment[]) => void;
  onSelectChannel: (id: string) => void;
  activeChannelId: string;
  agencyProfile: AgencyProfile;
  onUpdatePayment: (update: PaymentUpdate) => void;
  onAddNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ 
    project, onBack, onUpdateProject, staffList, serviceCatalog, onUpdateCatalog, currentUser,
    channels, messages, onSendMessage, onSelectChannel, activeChannelId, agencyProfile, onUpdatePayment,
    onAddNotification
}) => {
  const [activeTab, setActiveTab] = useState<'workflow' | 'payments' | 'quotations' | 'documents'>('workflow');
  const [paymentForm, setPaymentForm] = useState({ amount: '', type: 'Advance', method: 'Transfer', notes: '' });
  const [selectedFile, setSelectedFile] = useState<Document | null>(null);
  
  // Editing states for header
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(project.projectName);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [tempDate, setTempDate] = useState(new Date(project.dueDate).toISOString().split('T')[0]);
  // Status Management State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'In Progress' | 'Completed' | 'On Hold' | 'Paused' | 'Cancelled'>('Paused');
  const [statusNote, setStatusNote] = useState('');
  const [statusError, setStatusError] = useState('');

  const canManageStatus = ([Role.ADMIN, Role.MANAGEMENT] as string[]).includes(currentUser?.role || '');

  const handleOpenStatusModal = (initialTarget?: 'Paused' | 'Cancelled' | 'In Progress' | 'Completed') => {
    if (initialTarget) {
      setTargetStatus(initialTarget);
    } else if (project.status === 'Paused' || project.status === 'Cancelled' || project.status === 'On Hold') {
      setTargetStatus('In Progress');
    } else {
      setTargetStatus('Paused');
    }
    setStatusNote('');
    setStatusError('');
    setIsStatusModalOpen(true);
  };

  const handleSaveStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusNote.trim()) {
      setStatusError('A mandatory log note is required when pausing, cancelling, or modifying job pipeline status.');
      return;
    }

    const logEntry = {
      id: `sc-${Date.now()}`,
      previousStatus: project.status,
      newStatus: targetStatus,
      reason: statusNote.trim(),
      changedBy: currentUser?.name || 'Administrator',
      changedByRole: currentUser?.role || 'Management',
      timestamp: new Date()
    };

    const updatedHistory = [...(project.statusChangeHistory || []), logEntry];
    const statusMemo = {
      id: `memo-${Date.now()}`,
      text: `[STATUS OVERRIDE: ${targetStatus.toUpperCase()}] Reason: ${statusNote.trim()} (Authorized by ${currentUser?.name || 'Authorized Lead'} [${currentUser?.role || 'Management'}])`,
      author: currentUser?.name || 'Authorized Lead',
      timestamp: new Date()
    };
    const updatedMemos = [...(project.memos || []), statusMemo];

    onUpdateProject({
      ...project,
      status: targetStatus,
      lastUpdated: new Date(),
      statusChangeHistory: updatedHistory,
      memos: updatedMemos
    });

    onAddNotification({
      userId: 'all',
      text: `[${targetStatus.toUpperCase()}] ${project.jobNumber} (${project.projectName}) updated by ${currentUser?.name}: "${statusNote.trim()}"`,
      type: 'system',
      link: 'registry'
    });

    setIsStatusModalOpen(false);
    setStatusNote('');
    setStatusError('');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempName(project.projectName);
    setTempDate(new Date(project.dueDate).toISOString().split('T')[0]);
  }, [project.id]);

  const handleSaveName = () => {
    onUpdateProject({ ...project, projectName: tempName, lastUpdated: new Date() });
    setIsEditingName(false);
  };

  const handleSaveDate = () => {
    onUpdateProject({ ...project, dueDate: new Date(tempDate), lastUpdated: new Date() });
    setIsEditingDate(false);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount) return;
    const update: PaymentUpdate = {
        id: `upd-${Date.now()}`,
        projectId: project.id,
        projectName: project.projectName,
        amount: Number(paymentForm.amount),
        type: paymentForm.type as any,
        method: paymentForm.method as any,
        status: 'Pending Verification',
        submittedBy: currentUser.name,
        timestamp: new Date(),
        notes: paymentForm.notes
    };
    onUpdatePayment(update);
    setPaymentForm({ amount: '', type: 'Advance', method: 'Transfer', notes: '' });
    
    onAddNotification({
        userId: 's1', 
        text: `PAYMENT ALERT: ${project.clientName} submitted LKR ${Number(update.amount).toLocaleString()} for ${project.projectName}`,
        type: 'payment'
    });
  };

  const handleSaveQuotation = (quotation: Quotation) => {
    // Generate valid, standard-compliant vector PDF
    let pdfDataUri = '#';
    try {
      const pdfDoc = generateQuotationPDF(
        quotation,
        agencyProfile,
        project.clientName,
        project.projectName,
        project.jobNumber
      );
      pdfDataUri = pdfDoc.output('datauristring');
    } catch (err) {
      console.error('Failed to generate quotation PDF data URI:', err);
    }

    const newDoc: Document = {
        id: `doc-${Date.now()}`,
        name: `Quotation_${quotation.id}.pdf`,
        type: 'application/pdf',
        url: pdfDataUri, 
        uploadedBy: currentUser.name,
        uploadDate: new Date(),
        size: pdfDataUri !== '#' ? `${(pdfDataUri.length / (1024 * 1024)).toFixed(2)} MB` : '1.2 MB'
    };

    const updatedProject: Project = {
        ...project,
        quotations: [...(project.quotations || []), quotation],
        documents: [newDoc, ...(project.documents || [])]
    };

    onUpdateProject(updatedProject);
    setActiveTab('documents'); 
  };

  const handleToggleTimer = (taskId: string) => {
    const newSteps = project.steps.map(step => ({
        ...step,
        tasks: step.tasks.map(task => {
            if (task.id === taskId) {
                if (task.timerStart) {
                    const secondsSpent = Math.floor((Date.now() - task.timerStart) / 1000);
                    return {
                        ...task,
                        timeSpent: (task.timeSpent || 0) + secondsSpent,
                        timerStart: undefined
                    };
                } else {
                    return { ...task, timerStart: Date.now() };
                }
            }
            return task;
        })
    }));
    onUpdateProject({ ...project, steps: newSteps });
  };

  const handleAddStep = () => {
    const nextId = Math.max(0, ...project.steps.map(s => s.id)) + 1;
    const newStep: Step = {
      id: nextId,
      title: `Phase ${nextId}: Operational Milestone`,
      description: 'Strategic phase execution descriptor',
      tasks: []
    };
    onUpdateProject({ ...project, steps: [...project.steps, newStep] });
  };

  const handleDeleteStep = (stepId: number) => {
    onUpdateProject({ ...project, steps: project.steps.filter(s => s.id !== stepId) });
  };

  const downloadFile = (doc: Document) => {
    // 1. If document has a valid base64 data URL (e.g. from user upload or saved PDF)
    if (doc.url && doc.url.startsWith('data:')) {
      try {
        const parts = doc.url.split(';base64,');
        if (parts.length === 2) {
          const contentType = parts[0].split(':')[1] || 'application/pdf';
          const raw = window.atob(parts[1]);
          const rawLength = raw.length;
          const uInt8Array = new Uint8Array(rawLength);
          for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
          }
          const blob = new Blob([uInt8Array], { type: contentType });
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
          return;
        }
      } catch (err) {
        console.warn('Direct base64 blob parsing failed, generating fresh PDF:', err);
      }
    }

    // 2. If it's a quotation or named Quotation_*.pdf: Generate high-precision PDF on the fly
    if (doc.name.toLowerCase().includes('quotation') || (project.quotations && project.quotations.length > 0)) {
      const quoteId = doc.name.replace('Quotation_', '').replace('.pdf', '');
      const matchingQuote = project.quotations?.find(q => q.id === quoteId) || project.quotations?.[0] || {
        id: quoteId || `QT-${Date.now().toString().slice(-4)}`,
        date: doc.uploadDate || new Date(),
        items: [
          { 
            id: '1', 
            description: `${project.projectName} - Creative Strategy & Deployment`, 
            quantity: 1, 
            unitPrice: project.advanceAmount || 150000, 
            total: project.advanceAmount || 150000 
          }
        ],
        subtotal: project.advanceAmount || 150000,
        tax: Math.round((project.advanceAmount || 150000) * 0.18),
        total: Math.round((project.advanceAmount || 150000) * 1.18),
        status: 'Approved' as const
      };

      const pdf = generateQuotationPDF(
        matchingQuote,
        agencyProfile,
        project.clientName,
        project.projectName,
        project.jobNumber
      );
      pdf.save(doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.pdf`);
      return;
    }

    // 3. For any other vault document (or placeholder '#'): Generate a verified vault document PDF
    const vaultPdf = generateVaultDocumentPDF(
      doc.name,
      project.projectName,
      project.clientName,
      doc.uploadedBy,
      doc.uploadDate
    );
    vaultPdf.save(doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.pdf`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const newDoc: Document = {
        id: `vault-${Date.now()}`,
        name: file.name,
        type: file.type,
        url: result,
        uploadedBy: currentUser.name,
        uploadDate: new Date(),
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      };

      const updatedProject: Project = {
        ...project,
        documents: [newDoc, ...(project.documents || [])]
      };

      onUpdateProject(updatedProject);
    };
    reader.readAsDataURL(file);
  };

  const handleAssignTask = (tid: string, sid: string) => {
    let taskText = '';
    const newSteps = project.steps.map(s => ({ 
        ...s, 
        tasks: s.tasks.map(t => {
            if (t.id === tid) {
                taskText = t.text;
                return { ...t, assignedTo: sid };
            }
            return t;
        })
    }));
    
    onUpdateProject({ ...project, steps: newSteps });

    if (sid && sid !== currentUser.id) {
        onAddNotification({
            userId: sid,
            text: `ASSIGNMENT PROTOCOL: You have been assigned to "${taskText}" on project ${project.projectName}`,
            type: 'assignment',
            link: project.id 
        });
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 h-full items-start animate-in fade-in duration-500">
      <div className="flex-1 w-full space-y-8 min-w-0">
        
        {/* Project Header - Liquid Glass */}
        <div className="liquid-glass-card hud-frame border border-[var(--jarvis-border)] rounded-sm p-8 sm:p-10 relative overflow-hidden shadow-[0_0_40px_-10px_rgba(var(--jarvis-primary-rgb),0.2)]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5 flex-1 min-w-0">
              <button 
                onClick={onBack} 
                className="w-10 h-10 bg-[#12141a] border border-neutral-800 hover:border-neutral-600 rounded-sm transition-all flex items-center justify-center shrink-0 text-neutral-400 hover:text-white"
                title="Back to Dashboard"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 bg-[#12141a] p-1.5 rounded-sm border border-neutral-700">
                      <input 
                        autoFocus
                        value={tempName}
                        onChange={e => setTempName(e.target.value.toUpperCase())}
                        className="bg-transparent font-heading font-black text-2xl uppercase tracking-tight text-white outline-none min-w-[280px]"
                      />
                      <button onClick={handleSaveName} className="p-1 bg-white text-black rounded-sm hover:bg-neutral-200"><Check size={16}/></button>
                    </div>
                  ) : (
                    <h1 
                      onClick={() => setIsEditingName(true)}
                      className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase font-heading cursor-pointer hover:text-neutral-300 transition-colors truncate"
                    >
                      {project.projectName}
                    </h1>
                  )}

                  {canManageStatus ? (
                    <button
                      type="button"
                      onClick={() => handleOpenStatusModal()}
                      className={`px-2.5 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider border flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] ${
                        project.status === 'Completed' 
                          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' 
                          : project.status === 'Paused' || project.status === 'On Hold'
                          ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                          : project.status === 'Cancelled'
                          ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
                      }`}
                      title="Admins & Managers: Click to pause, cancel, or modify status"
                    >
                      {project.status === 'Completed' && <Check size={11} />}
                      {(project.status === 'Paused' || project.status === 'On Hold') && <PauseCircle size={11} />}
                      {project.status === 'Cancelled' && <XCircle size={11} />}
                      {project.status === 'In Progress' && <Clock size={11} />}
                      {project.status}
                      <Pencil size={9} className="opacity-60" />
                    </button>
                  ) : (
                    <span className={`px-2.5 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider border ${
                      project.status === 'Completed' 
                        ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' 
                        : project.status === 'Paused' || project.status === 'On Hold'
                        ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                        : project.status === 'Cancelled'
                        ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                        : 'bg-[#12141a] border-neutral-800 text-neutral-300'
                    }`}>
                      {project.status}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                  <span className="px-2.5 py-1 bg-[#12141a] border border-neutral-800 text-neutral-300 rounded-sm uppercase">
                    {project.clientName}
                  </span>
                  <span className="px-2.5 py-1 bg-[#12141a] border border-neutral-800 text-neutral-400 rounded-sm">
                    {project.jobNumber}
                  </span>
                  <span className="px-2.5 py-1 bg-[#12141a] border border-neutral-800 text-neutral-400 rounded-sm">
                    UPDATED: {new Date(project.lastUpdated).toLocaleDateString()}
                  </span>

                  {(project.createdByName || project.createdBy) && (
                    <span className="px-2.5 py-1 bg-gradient-to-r from-emerald-950/40 to-[#12141a] border border-emerald-500/30 text-emerald-300 rounded-sm flex items-center gap-2" title={`Campaign initialized by ${project.createdByName || 'Staff Member'} on ${project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {project.createdByAvatar && (
                        <img 
                          src={project.createdByAvatar} 
                          alt={project.createdByName || ''} 
                          className="w-3.5 h-3.5 rounded-full object-cover border border-emerald-500/40" 
                        />
                      )}
                      <span className="text-neutral-400 font-normal">CREATED BY:</span>
                      <strong className="text-white font-semibold">{project.createdByName || 'Staff Member'}</strong>
                      {project.createdByRole && (
                        <span className="text-neutral-400 font-normal">({project.createdByRole})</span>
                      )}
                    </span>
                  )}

                  {isEditingDate ? (
                    <div className="flex items-center gap-1.5 bg-[#12141a] p-1 rounded-sm border border-neutral-700">
                      <input 
                        type="date"
                        value={tempDate}
                        onChange={e => setTempDate(e.target.value)}
                        className="bg-transparent text-[10px] uppercase text-white outline-none px-1"
                      />
                      <button onClick={handleSaveDate} className="p-1 bg-white text-black rounded-sm"><Check size={12}/></button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsEditingDate(true)}
                      className="px-2.5 py-1 bg-[#12141a] border border-neutral-800 text-neutral-300 hover:text-white rounded-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Calendar size={11} /> DUE: {new Date(project.dueDate).toLocaleDateString()}
                      <Pencil size={9} className="text-neutral-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0 font-mono">
              <div className="text-4xl font-black text-white">{project.progress}%</div>
              <div className="text-[9px] text-neutral-500 uppercase tracking-widest mt-0.5">COMPLETION STATUS</div>
            </div>
          </div>

          {/* Paused or Cancelled Alert Banner with logged note */}
          {(project.status === 'Paused' || project.status === 'Cancelled' || project.status === 'On Hold') && (
            <div className={`p-4 rounded-sm border font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 ${
              project.status === 'Cancelled' 
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-200' 
                : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                {project.status === 'Cancelled' ? (
                  <XCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <PauseCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                    <span>PIPELINE DIRECTIVE // {project.status.toUpperCase()}</span>
                    {project.statusChangeHistory && project.statusChangeHistory.length > 0 && (
                      <span className="text-[9px] text-neutral-500 lowercase">
                        by {project.statusChangeHistory[project.statusChangeHistory.length - 1].changedBy} ({project.statusChangeHistory[project.statusChangeHistory.length - 1].changedByRole})
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold mt-1 text-white">
                    {project.statusChangeHistory && project.statusChangeHistory.length > 0
                      ? `"${project.statusChangeHistory[project.statusChangeHistory.length - 1].reason}"`
                      : `This campaign is currently ${project.status.toLowerCase()}.`}
                  </p>
                </div>
              </div>
              {canManageStatus && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenStatusModal('In Progress')}
                    className="px-3.5 py-1.5 bg-white text-black font-black text-xs uppercase tracking-wider rounded-sm hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlayCircle size={13} /> Resume Campaign
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-neutral-800 overflow-x-auto">
            {[
              { id: 'workflow', label: 'Workflow Directives', icon: BarChart3 },
              { id: 'payments', label: 'Financial Records', icon: DollarSign },
              { id: 'quotations', label: 'Quotations', icon: CreditCard },
              { id: 'documents', label: 'Asset Vault', icon: Folder }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-white text-white font-bold' 
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              {project.steps.map(step => (
                <StepCard 
                  key={step.id}
                  step={step}
                  completedTasks={project.tasksCompleted}
                  onToggleTask={(tid) => {
                    const newTasks = { ...project.tasksCompleted };
                    newTasks[tid] = !newTasks[tid];
                    const total = project.steps.reduce((sum, s) => sum + s.tasks.length, 0);
                    const prog = total === 0 ? 0 : Math.round((Object.keys(newTasks).filter(k => newTasks[k]).length / total) * 100);
                    onUpdateProject({ ...project, tasksCompleted: newTasks, progress: prog, lastUpdated: new Date() });
                  }}
                  comments={[]}
                  onAddComment={() => {}}
                  isActive={project.currentStep === step.id}
                  staffList={staffList}
                  onAssignTask={handleAssignTask}
                  assignedTasks={{}}
                  onToggleTimer={handleToggleTimer}
                  onUpdateTask={(tid, updates) => {
                    const newSteps = project.steps.map(s => ({ ...s, tasks: s.tasks.map(t => t.id === tid ? {...t, ...updates} : t)}));
                    onUpdateProject({ ...project, steps: newSteps });
                  }}
                  onUpdateStep={(sid, updates) => {
                    const newSteps = project.steps.map(s => s.id === sid ? {...s, ...updates} : s);
                    onUpdateProject({ ...project, steps: newSteps });
                  }}
                  onDeleteStep={handleDeleteStep}
                />
              ))}
              
              <button 
                onClick={handleAddStep}
                className="w-full py-8 bg-[#0a0b0e] border border-dashed border-neutral-800 hover:border-neutral-600 rounded-sm flex flex-col items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
              >
                <Zap size={20} className="text-neutral-500" />
                Initialize New Workflow Node
              </button>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to submit payment */}
              <div className="lg:col-span-1">
                <div className="bg-[#0a0b0e] border border-neutral-800 p-6 rounded-sm space-y-4">
                  <div className="flex items-center gap-2 text-white font-heading font-black text-sm uppercase">
                    <DollarSign size={16} /> Log Payment Update
                  </div>
                  <form onSubmit={handlePaymentSubmit} className="space-y-4 font-mono text-xs">
                    <div>
                      <label className="block text-[10px] uppercase text-neutral-400 tracking-widest mb-1">Amount (LKR) *</label>
                      <input 
                        required 
                        type="number" 
                        placeholder="50000"
                        className="w-full p-2.5 bg-[#12141a] border border-neutral-800 rounded-sm text-white outline-none focus:border-white" 
                        value={paymentForm.amount} 
                        onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-neutral-400 tracking-widest mb-1">Payment Method</label>
                      <select 
                        className="w-full p-2.5 bg-[#12141a] border border-neutral-800 rounded-sm text-white outline-none focus:border-white" 
                        value={paymentForm.method} 
                        onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}
                      >
                        <option value="Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-neutral-400 tracking-widest mb-1">Notes</label>
                      <textarea 
                        className="w-full p-2.5 bg-[#12141a] border border-neutral-800 rounded-sm text-white outline-none focus:border-white resize-none" 
                        rows={2} 
                        placeholder="Reference code or details..."
                        value={paymentForm.notes} 
                        onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} 
                      />
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-white text-black font-black uppercase tracking-wider rounded-sm hover:bg-neutral-200 transition-colors">
                      Submit for Verification
                    </button>
                  </form>
                </div>
              </div>

              {/* Payment history */}
              <div className="lg:col-span-2">
                <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm overflow-hidden">
                  <div className="p-4 bg-[#0e0f14] border-b border-neutral-800 font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
                    Campaign Payment Records
                  </div>
                  <div className="divide-y divide-neutral-800/80">
                    {(!project.paymentUpdates || project.paymentUpdates.length === 0) ? (
                      <div className="p-16 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest">
                        Zero remittances logged for this node
                      </div>
                    ) : (
                      project.paymentUpdates.map(upd => (
                        <div key={upd.id} className="p-4 flex items-center justify-between font-mono text-xs hover:bg-[#12141a]/60 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-sm flex items-center justify-center border ${
                              upd.status === 'Verified' ? 'bg-[#0f1f17] border-emerald-500/40 text-emerald-400' : 'bg-[#1c140f] border-amber-500/40 text-amber-400'
                            }`}>
                              <DollarSign size={14} />
                            </div>
                            <div>
                              <div className="text-white font-bold">LKR {upd.amount.toLocaleString()}</div>
                              <div className="text-[10px] text-neutral-500">{upd.type} VIA {upd.method.toUpperCase()}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`px-2 py-0.2 rounded-sm text-[9px] uppercase border ${
                              upd.status === 'Verified' 
                                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' 
                                : 'bg-amber-950/60 border-amber-500/30 text-amber-400'
                            }`}>
                              {upd.status}
                            </span>
                            <div className="text-[9px] text-neutral-500 mt-0.5">{new Date(upd.timestamp).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quotations' && (
            <QuotationBuilder 
              clientName={project.clientName} 
              projectName={project.projectName} 
              serviceCatalog={serviceCatalog} 
              onUpdateCatalog={onUpdateCatalog} 
              onSave={handleSaveQuotation} 
              agencyProfile={agencyProfile} 
            />
          )}

          {activeTab === 'documents' && (
            <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                <div>
                  <h3 className="font-heading font-black text-white uppercase text-base">Resource Vault</h3>
                  <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5">Project Assets & Verified Deliverables</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-black hover:bg-neutral-200 px-4 py-2 font-black font-mono text-xs uppercase tracking-wider rounded-sm transition-all flex items-center gap-2"
                >
                  <UploadCloud size={14} /> Upload Resource
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(project.documents || []).length === 0 ? (
                  <div className="col-span-full py-16 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest">
                    <Folder size={40} className="mx-auto mb-2 opacity-30 text-neutral-400" />
                    Zero documents stored in vault
                  </div>
                ) : (
                  (project.documents || []).map(doc => (
                    <div 
                      key={doc.id} 
                      onClick={() => setSelectedFile(doc)}
                      className="bg-[#12141a] border border-neutral-800 hover:border-neutral-700 rounded-sm p-4 flex flex-col justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-sm bg-[#0c0d12] border border-neutral-800 flex items-center justify-center shrink-0 text-neutral-400 group-hover:text-white">
                          {doc.type.includes('pdf') ? <FileCheck size={20} /> : <FileText size={20} />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-mono text-xs text-white font-bold uppercase truncate">{doc.name}</h4>
                          <span className="font-mono text-[9px] text-neutral-500 uppercase">{doc.size}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-neutral-800/80 font-mono text-[9px] text-neutral-500">
                        <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(doc); }}
                            className="text-neutral-400 hover:text-white"
                            title="View"
                          >
                            <Eye size={13} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); downloadFile(doc); }}
                            className="text-neutral-400 hover:text-white"
                            title="Download"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-center justify-center p-4" onClick={() => setSelectedFile(null)}>
          <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden font-mono text-xs" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-neutral-400" />
                <span className="uppercase font-bold truncate max-w-sm">{selectedFile.name}</span>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-neutral-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-6 bg-[#07080a] flex items-center justify-center min-h-[250px]">
              {selectedFile.type.startsWith('image') ? (
                <img src={selectedFile.url} className="max-w-full max-h-[50vh] rounded-sm object-contain" alt="Preview" />
              ) : (
                <div className="text-center space-y-4">
                  <Folder size={48} className="mx-auto text-neutral-600" />
                  <div className="text-neutral-300">File type: {selectedFile.type || 'Binary Document'}</div>
                  <button onClick={() => downloadFile(selectedFile)} className="px-5 py-2 bg-white text-black font-black uppercase tracking-wider rounded-sm hover:bg-neutral-200">
                    Download File ({selectedFile.size})
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex justify-between text-neutral-500 text-[10px]">
              <span>UPLOADED BY: {selectedFile.uploadedBy.toUpperCase()}</span>
              <span>{new Date(selectedFile.uploadDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Status Directive & Log Note Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0b0c0f] border border-neutral-800 w-full max-w-xl rounded-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-neutral-800 bg-[#0e0f14] flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert size={12} className="text-amber-400" />
                  EXECUTIVE OVERRIDE // PIPELINE DIRECTIVE
                </div>
                <h3 className="text-base font-black uppercase text-white font-heading mt-0.5">
                  Update Campaign Status & Log Reason
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStatusChange} className="p-6 space-y-5">
              {/* Target Campaign Overview */}
              <div className="p-3 bg-[#12141a] border border-neutral-800 rounded-sm font-mono text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 uppercase">PROTOCOL ID:</span>
                  <span className="font-bold text-white">{project.jobNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 uppercase">CAMPAIGN:</span>
                  <span className="font-bold text-white truncate max-w-[280px]">{project.projectName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 uppercase">CURRENT STATUS:</span>
                  <span className="text-amber-400 font-bold uppercase">{project.status}</span>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-2">
                  Select Target Pipeline Status *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTargetStatus('Paused'); setStatusError(''); }}
                    className={`p-3 rounded-sm border text-left font-mono transition-all cursor-pointer ${
                      targetStatus === 'Paused'
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-300 shadow-sm'
                        : 'bg-[#12141a] border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-black">
                      <PauseCircle size={14} className="text-amber-400" /> PAUSE
                    </div>
                    <div className="text-[8px] text-neutral-400 leading-tight uppercase">Temporary hold on workflow</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTargetStatus('Cancelled'); setStatusError(''); }}
                    className={`p-3 rounded-sm border text-left font-mono transition-all cursor-pointer ${
                      targetStatus === 'Cancelled'
                        ? 'bg-rose-950/40 border-rose-500/80 text-rose-300 shadow-sm'
                        : 'bg-[#12141a] border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-black">
                      <XCircle size={14} className="text-rose-400" /> CANCEL
                    </div>
                    <div className="text-[8px] text-neutral-400 leading-tight uppercase">Terminate and archive job</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTargetStatus('In Progress'); setStatusError(''); }}
                    className={`p-3 rounded-sm border text-left font-mono transition-all cursor-pointer ${
                      targetStatus === 'In Progress'
                        ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-300 shadow-sm'
                        : 'bg-[#12141a] border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-black">
                      <PlayCircle size={14} className="text-cyan-400" /> RESUME
                    </div>
                    <div className="text-[8px] text-neutral-400 leading-tight uppercase">Active execution status</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setTargetStatus('Completed'); setStatusError(''); }}
                    className={`p-3 rounded-sm border text-left font-mono transition-all cursor-pointer ${
                      targetStatus === 'Completed'
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300 shadow-sm'
                        : 'bg-[#12141a] border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-black">
                      <CheckCircle2 size={14} className="text-emerald-400" /> COMPLETE
                    </div>
                    <div className="text-[8px] text-neutral-400 leading-tight uppercase">Close all deliverables</div>
                  </button>
                </div>
              </div>

              {/* Mandatory Status Note */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
                    Mandatory Operational Reason / Note *
                  </label>
                  <span className="font-mono text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-xs uppercase">
                    Audit Note Required
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={statusNote}
                  onChange={(e) => {
                    setStatusNote(e.target.value);
                    if (statusError) setStatusError('');
                  }}
                  placeholder="Document specific justification (e.g. 'Client requested 2-week pause due to board review', 'Cancelled by client after strategy pivot', or 'Resumed execution after receiving signed approval')..."
                  className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2.5 text-xs text-white font-mono outline-none rounded-sm transition-colors resize-none placeholder:text-neutral-600"
                />
                {statusError && (
                  <p className="text-rose-400 text-xs font-mono mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> {statusError}
                  </p>
                )}
                <div className="mt-1 text-[9px] font-mono text-neutral-500 flex items-center gap-1">
                  <MessageSquare size={10} />
                  This note will be recorded to project memos, team intelligence logs, and audit trails.
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                    targetStatus === 'Cancelled' ? 'bg-rose-600 hover:bg-rose-500 text-white' :
                    targetStatus === 'Paused' ? 'bg-amber-500 hover:bg-amber-400 text-black' :
                    'bg-white hover:bg-neutral-200 text-black'
                  }`}
                >
                  <Edit2 size={13} /> Log Directive & Apply Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
