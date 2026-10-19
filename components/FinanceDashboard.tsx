import React, { useState, useMemo } from 'react';
import { Project, PettyCashTransaction, StaffMember, PaymentUpdate, Role } from '../types';
import { DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, CheckCircle2, AlertCircle, History, TrendingUp, Plus, X, Search, ShieldCheck, ArrowUpRight } from 'lucide-react';

interface FinanceDashboardProps {
  projects: Project[];
  pettyCash: PettyCashTransaction[];
  onUpdateProject: (project: Project) => void;
  onAddPettyCash: (tx: PettyCashTransaction) => void;
  staffList: StaffMember[];
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ projects, pettyCash, onUpdateProject, onAddPettyCash }) => {
  const [activeTab, setActiveTab] = useState<'payment-feed' | 'advances' | 'petty-cash'>('payment-feed');
  const [isAddingCash, setIsAddingCash] = useState(false);
  const [newTx, setNewTx] = useState<Partial<PettyCashTransaction>>({ type: 'Expense', date: new Date(), category: 'General' });

  const balance = pettyCash.reduce((sum, tx) => sum + (tx.type === 'Income' ? tx.amount : -tx.amount), 0);

  const paymentUpdates = useMemo(() => {
    return projects.flatMap(p => (p.paymentUpdates || []).map(u => ({ ...u, projectName: p.projectName, clientName: p.clientName })))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [projects]);

  const totalRevenue = useMemo(() => {
    return paymentUpdates.reduce((sum, u) => sum + (u.status === 'Verified' ? u.amount : 0), 0);
  }, [paymentUpdates]);

  const pendingVerificationAmount = useMemo(() => {
    return paymentUpdates.filter(u => u.status === 'Pending Verification').reduce((sum, u) => sum + u.amount, 0);
  }, [paymentUpdates]);

  const handleVerifyPayment = (updateId: string, projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const updatedUpdates = (project.paymentUpdates || []).map(u => 
        u.id === updateId ? { ...u, status: 'Verified' as const } : u
    );
    
    onUpdateProject({ ...project, paymentUpdates: updatedUpdates, advanceReceived: true });
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.description || !newTx.amount) return;
    const tx: PettyCashTransaction = {
      id: Date.now().toString(),
      date: new Date(),
      description: newTx.description!,
      amount: Number(newTx.amount),
      type: newTx.type as any,
      category: newTx.category!,
      handledBy: 'Finance Dept'
    };
    onAddPettyCash(tx);
    setIsAddingCash(false);
    setNewTx({ type: 'Expense', date: new Date(), category: 'General' });
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Banner - Liquid Glass */}
      <div className="liquid-glass-card hud-frame rounded-sm p-8 sm:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-[0_0_40px_-10px_rgba(var(--jarvis-primary-rgb),0.2)]">
        <div>
          <div className="font-mono text-[10px] text-[var(--jarvis-primary)] uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--jarvis-primary)] animate-ping" />
            <span>PROPRIETARY ECOSYSTEM // CAPITAL TELEMETRY // JARVIS MATRIX</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-heading leading-none">
            FINANCE <span className="text-[var(--jarvis-primary)] hud-glow-text">COMMAND</span>
          </h1>
          <p className="text-neutral-300 text-xs font-mono uppercase tracking-wider mt-3">
            Real-Time Revenue Verification, Cash Reserves & Project Ledgers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-6 py-3 bg-black/50 border border-[var(--jarvis-border)] rounded-sm font-mono text-left shadow-[0_0_12px_rgba(var(--jarvis-primary-rgb),0.15)]">
            <div className="text-[9px] text-[var(--jarvis-primary)] uppercase tracking-widest font-bold">LIQUID CAPITAL</div>
            <div className={`text-2xl font-black leading-none mt-1 font-mono ${balance < 5000 ? 'text-rose-400' : 'text-emerald-400'}`}>
              LKR {balance.toLocaleString()}
            </div>
          </div>
          <div className="px-6 py-3 bg-black/50 border border-[var(--jarvis-border)] rounded-sm font-mono text-left shadow-[0_0_12px_rgba(var(--jarvis-primary-rgb),0.15)]">
            <div className="text-[9px] text-[var(--jarvis-primary)] uppercase tracking-widest font-bold">VERIFIED REVENUE</div>
            <div className="text-2xl font-black text-white leading-none mt-1 font-mono">
              LKR {totalRevenue.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--jarvis-border)] pb-4">
        {[
          { id: 'payment-feed', label: 'Incoming Feed', count: paymentUpdates.filter(u => u.status === 'Pending Verification').length },
          { id: 'advances', label: 'Project Ledger', count: projects.length },
          { id: 'petty-cash', label: 'Petty Cash Ledger', count: pettyCash.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 border ${
              activeTab === tab.id
                ? 'jarvis-btn-primary text-black font-black shadow-md'
                : 'bg-black/40 text-neutral-400 hover:text-white border-[var(--jarvis-border)] hover:border-[var(--jarvis-primary)]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.2 rounded-sm text-[9px] ${activeTab === tab.id ? 'bg-black text-white' : 'bg-neutral-800 text-neutral-300'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content 1: Payment Feed */}
      {activeTab === 'payment-feed' && (
        <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm overflow-hidden">
          <div className="p-6 bg-[#0e0f14] border-b border-neutral-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <History size={18} className="text-neutral-400" />
              <h2 className="font-heading font-black text-sm uppercase tracking-wider text-white">Incoming Client Remittances</h2>
            </div>
            <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
              Pending: LKR {pendingVerificationAmount.toLocaleString()}
            </span>
          </div>

          <div className="divide-y divide-neutral-800/80">
            {paymentUpdates.length === 0 ? (
              <div className="p-20 text-center text-neutral-500 font-mono text-xs uppercase tracking-widest">
                <ShieldCheck size={48} className="mx-auto mb-3 opacity-40 text-neutral-400" />
                No pending transaction nodes detected
              </div>
            ) : (
              paymentUpdates.map(update => (
                <div key={update.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-[#12141a]/60 transition-colors">
                  <div className="flex items-center gap-5 min-w-0 flex-1">
                    <div className={`w-12 h-12 rounded-sm flex items-center justify-center shrink-0 border ${
                      update.status === 'Verified' ? 'bg-[#0f1f17] border-emerald-500/40 text-emerald-400' : 'bg-[#1c140f] border-amber-500/40 text-amber-400'
                    }`}>
                      <DollarSign size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-heading font-black text-white uppercase text-base truncate">{update.clientName}</h3>
                        <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-sm bg-[#12141a] text-neutral-400 border border-neutral-800">
                          {update.type}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-neutral-400 uppercase tracking-wider mt-0.5">{update.projectName}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 font-mono text-[10px] text-neutral-500">
                        <span>VIA: {update.method.toUpperCase()}</span>
                        <span>BY: {update.submittedBy}</span>
                        <span>{new Date(update.timestamp).toLocaleDateString()}</span>
                        {update.notes && <span className="text-neutral-400 italic font-sans">"{update.notes}"</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end md:self-center shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-xl font-black text-white">LKR {update.amount.toLocaleString()}</div>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider border ${
                        update.status === 'Verified' 
                          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' 
                          : 'bg-amber-950/60 border-amber-500/30 text-amber-400'
                      }`}>
                        {update.status}
                      </span>
                    </div>

                    {update.status === 'Pending Verification' && (
                      <button 
                        onClick={() => handleVerifyPayment(update.id, update.projectId)}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black font-mono text-xs uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95"
                      >
                        Verify Node
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Project Ledger */}
      {activeTab === 'advances' && (
        <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#0e0f14] border-b border-neutral-800 text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Campaign / Client</th>
                  <th className="px-6 py-4">Job Code</th>
                  <th className="px-6 py-4">Execution Status</th>
                  <th className="px-6 py-4">Advance Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-[#12141a]/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-heading font-black text-white uppercase text-sm">{p.projectName}</div>
                      <div className="text-neutral-400 font-mono text-[10px] uppercase mt-0.5">{p.clientName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-[#12141a] border border-neutral-800 rounded-sm text-neutral-300 font-mono text-[10px]">
                        {p.jobNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-sm text-[9px] uppercase font-mono border ${
                        p.status === 'Completed'
                          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.advanceReceived ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
                          <CheckCircle2 size={15} /> ADVANCE SECURED
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-rose-400 font-mono text-xs">
                          <AlertCircle size={15} /> ADVANCE PENDING
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onUpdateProject({ ...p, advanceReceived: !p.advanceReceived })}
                        className={`px-3 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-wider transition-all border ${
                          p.advanceReceived 
                            ? 'bg-[#12141a] border-neutral-800 text-neutral-400 hover:text-white' 
                            : 'bg-white text-black font-black border-white hover:bg-neutral-200'
                        }`}
                      >
                        {p.advanceReceived ? 'Revert Flag' : 'Mark Received'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Petty Cash */}
      {activeTab === 'petty-cash' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Wallet size={18} className="text-neutral-400" />
              <h3 className="font-heading font-black text-sm uppercase tracking-wider text-white">Daily Operational Cash Ledger</h3>
            </div>
            <button 
              onClick={() => setIsAddingCash(true)} 
              className="bg-white text-black hover:bg-neutral-200 px-5 py-2.5 font-black font-mono text-xs uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <Plus size={15} strokeWidth={3} /> LOG CASH TRANSACTION
            </button>
          </div>

          {isAddingCash && (
            <form onSubmit={handleAddTx} className="bg-[#0b0c0f] border border-neutral-800 p-6 rounded-sm shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
              <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">
                RECORD CASH MOVEMENT
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Description *</label>
                  <input 
                    required 
                    placeholder="e.g. Production team travel or office supplies"
                    className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2.5 font-mono text-xs text-white outline-none rounded-sm transition-colors" 
                    value={newTx.description || ''} 
                    onChange={e => setNewTx({...newTx, description: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Amount (LKR) *</label>
                  <input 
                    required 
                    type="number" 
                    placeholder="2500"
                    className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2.5 font-mono text-xs text-white outline-none rounded-sm transition-colors" 
                    value={newTx.amount || ''} 
                    onChange={e => setNewTx({...newTx, amount: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Flow Type</label>
                  <select 
                    className="w-full bg-[#12141a] border border-neutral-800 focus:border-white px-4 py-2.5 font-mono text-xs text-white outline-none rounded-sm transition-colors" 
                    value={newTx.type} 
                    onChange={e => setNewTx({...newTx, type: e.target.value as any})}
                  >
                    <option value="Expense">Expense (Outflow)</option>
                    <option value="Income">Income / Replenish (Inflow)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-neutral-800">
                <button 
                  type="button" 
                  onClick={() => setIsAddingCash(false)} 
                  className="px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-white text-black font-black font-mono text-xs uppercase tracking-wider hover:bg-neutral-200 rounded-sm"
                >
                  Confirm Movement
                </button>
              </div>
            </form>
          )}

          <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm overflow-hidden">
            <div className="divide-y divide-neutral-800/80">
              {pettyCash.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-[#12141a]/60 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center border shrink-0 ${
                      tx.type === 'Income' ? 'bg-[#0f1f17] border-emerald-500/40 text-emerald-400' : 'bg-[#1c0f12] border-rose-500/40 text-rose-400'
                    }`}>
                      {tx.type === 'Income' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                    </div>
                    <div>
                      <p className="font-heading font-black text-white uppercase text-sm">{tx.description}</p>
                      <div className="flex items-center gap-4 mt-1 font-mono text-[10px] text-neutral-500">
                        <span>{new Date(tx.date).toLocaleDateString()}</span>
                        <span>CATEGORY: {tx.category.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <p className={`text-lg font-black ${tx.type === 'Income' ? 'text-emerald-400' : 'text-neutral-200'}`}>
                      {tx.type === 'Income' ? '+' : '-'} LKR {tx.amount.toLocaleString()}
                    </p>
                    <span className="text-[9px] text-neutral-500 uppercase">{tx.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceDashboard;
