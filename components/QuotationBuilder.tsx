import React, { useState, useEffect } from 'react';
import { Quotation, QuoteItem, ServiceItem, AgencyProfile } from '../types';
import { Plus, Trash2, Printer, Mail, DollarSign, FileText, Check, Download, GripVertical, Settings, Save, X, Tag, FileCheck, ArrowUpRight } from 'lucide-react';
import { generateQuotationPDF } from '../utils/pdfGenerator';

interface QuotationBuilderProps {
  onSave: (quotation: Quotation) => void;
  clientName: string;
  projectName: string;
  serviceCatalog: ServiceItem[];
  onUpdateCatalog: (items: ServiceItem[]) => void;
  agencyProfile: AgencyProfile;
  viewQuotation?: Quotation; 
}

const QuotationBuilder: React.FC<QuotationBuilderProps> = ({ onSave, clientName, projectName, serviceCatalog, onUpdateCatalog, agencyProfile, viewQuotation }) => {
  const [items, setItems] = useState<QuoteItem[]>(viewQuotation ? viewQuotation.items : []);
  const [showPreview, setShowPreview] = useState(viewQuotation ? true : false);
  const [isEditingCatalog, setIsEditingCatalog] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [newService, setNewService] = useState({ name: '', price: '', category: '' });

  useEffect(() => {
    if (viewQuotation) {
        setItems(viewQuotation.items);
        setShowPreview(true);
    }
  }, [viewQuotation]);

  const existingCategories = Array.from(new Set(serviceCatalog.map(s => s.category)));

  const handleDragStart = (e: React.DragEvent, serviceId: string) => {
    if (viewQuotation) return;
    e.dataTransfer.setData('serviceId', serviceId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (viewQuotation) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const serviceId = e.dataTransfer.getData('serviceId');
    if (serviceId) {
      addItem(serviceId);
    }
  };

  const addItem = (serviceId: string) => {
    const service = serviceCatalog.find(s => s.id === serviceId);
    if (!service) return;

    const existingIndex = items.findIndex(item => item.serviceId === serviceId);

    if (existingIndex > -1) {
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += 1;
      updatedItems[existingIndex].total = updatedItems[existingIndex].quantity * updatedItems[existingIndex].unitPrice;
      setItems(updatedItems);
    } else {
      const newItem: QuoteItem = {
        id: `qi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        serviceId: service.id,
        description: service.name,
        quantity: 1,
        unitPrice: service.defaultPrice,
        total: service.defaultPrice
      };
      setItems([...items, newItem]);
    }
  };

  const handleAddNewService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.price) return;

    const newItem: ServiceItem = {
      id: `srv-${Date.now()}`,
      name: newService.name.toUpperCase(),
      defaultPrice: parseFloat(newService.price) || 0,
      category: newService.category || 'General'
    };

    onUpdateCatalog([...serviceCatalog, newItem]);
    setNewService({ name: '', price: '', category: '' });
  };

  const handleDeleteCatalogItem = (serviceId: string) => {
    onUpdateCatalog(serviceCatalog.filter(s => s.id !== serviceId));
  };

  const handleCatalogItemChange = (serviceId: string, field: 'name' | 'defaultPrice', value: any) => {
    const updated = serviceCatalog.map(s => {
      if (s.id === serviceId) {
        return {
          ...s,
          [field]: field === 'defaultPrice' ? (parseFloat(value) || 0) : value
        };
      }
      return s;
    });
    onUpdateCatalog(updated);
  };

  const updateItem = (id: string, field: 'quantity' | 'unitPrice' | 'description', value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const handleSave = () => {
    const year = new Date().getFullYear();
    const quoteId = `MW-Q-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newQuote: Quotation = {
      id: quoteId,
      date: new Date(),
      items,
      subtotal,
      tax,
      total,
      status: 'Approved'
    };
    onSave(newQuote);
    setItems([]);
    setShowPreview(false);
  };

  if (showPreview) {
    return (
      <div className="bg-[#0b0c0f] border border-neutral-800 rounded-sm overflow-hidden font-mono text-white animate-in zoom-in-95 duration-200">
        <div id="printable-quotation" className="p-8 sm:p-12 space-y-8 bg-[#0a0b0e]">
          <div className="flex justify-between items-start border-b border-neutral-800 pb-8">
            <div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">OFFICIAL QUOTATION PROTOCOL</div>
              <h1 className="text-3xl font-black uppercase text-white font-heading mt-1">QUOTATION</h1>
              <p className="text-xs text-neutral-400 mt-1">REF: #{viewQuotation ? viewQuotation.id : 'DRAFT-NODE'}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black text-white font-heading uppercase">{agencyProfile.name}</h2>
              <div className="text-[10px] text-neutral-400 uppercase mt-1 space-y-0.5">
                <div>{agencyProfile.address}</div>
                <div>{agencyProfile.email}</div>
                <div>{agencyProfile.phone}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-xs border-b border-neutral-800 pb-6">
            <div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Client Entity</div>
              <div className="text-white font-bold text-base uppercase font-heading">{clientName}</div>
              <div className="text-neutral-400 mt-0.5 uppercase">CAMPAIGN: {projectName}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Issue Date</div>
              <div className="text-white font-bold uppercase">
                {(viewQuotation ? new Date(viewQuotation.date) : new Date()).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-800 text-[10px] uppercase text-neutral-500">
                <tr>
                  <th className="py-3">Strategic Service Descriptor</th>
                  <th className="py-3 text-center">Qty</th>
                  <th className="py-3 text-right">Unit Rate (LKR)</th>
                  <th className="py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="py-3 text-white uppercase font-bold">{item.description}</td>
                    <td className="py-3 text-center text-neutral-400">{item.quantity}</td>
                    <td className="py-3 text-right text-neutral-400">{item.unitPrice.toLocaleString()}</td>
                    <td className="py-3 text-right text-white font-bold">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-8 pt-4 border-t border-neutral-800">
            <div className="text-[10px] text-neutral-500 uppercase space-y-1">
              <div>TERMS & CONDITIONS:</div>
              <div>• Validity: 14 business days from generation</div>
              <div>• Advance: 50% required to initialize execution node</div>
              <div>• Balance: Due within 7 days of final handover</div>
            </div>
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Base Subtotal</span>
                <span className="text-white">LKR {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Tax Component (18%)</span>
                <span className="text-white">LKR {tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-neutral-700">
                <span>TOTAL RATE</span>
                <span className="text-white">LKR {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#0e0f14] border-t border-neutral-800 flex flex-wrap justify-end gap-3">
          {!viewQuotation && (
            <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-neutral-400 hover:text-white text-xs uppercase cursor-pointer">
              Back to Builder
            </button>
          )}
          <button 
            type="button"
            onClick={() => {
              const quoteData: Quotation = viewQuotation || {
                id: `QT-${Date.now().toString().slice(-4)}`,
                date: new Date(),
                items,
                subtotal,
                tax,
                total,
                status: 'Approved'
              };
              const pdf = generateQuotationPDF(quoteData, agencyProfile, clientName, projectName);
              pdf.save(`Quotation_${quoteData.id}.pdf`);
            }} 
            className="px-4 py-2 bg-[#12141a] hover:bg-[#181a24] text-neutral-300 hover:text-white border border-neutral-800 text-xs uppercase rounded-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} /> Download PDF
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-[#12141a] hover:bg-[#181a24] text-neutral-300 hover:text-white border border-neutral-800 text-xs uppercase rounded-sm flex items-center gap-1.5 cursor-pointer">
            <Printer size={14} /> Print
          </button>
          {!viewQuotation && (
            <button onClick={handleSave} className="px-6 py-2 bg-white text-black font-black text-xs uppercase rounded-sm hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer">
              <FileCheck size={14} /> Deploy to Vault
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0b0e] border border-neutral-800 rounded-sm p-8 space-y-6 font-mono text-xs">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
        <div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-widest">PRICING ARCHITECTURE</div>
          <h2 className="text-xl font-heading font-black text-white uppercase mt-0.5">Quotation Logic Node</h2>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-neutral-400 uppercase">CLIENT: {clientName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Catalog Sidebar */}
        <div className="lg:col-span-1 bg-[#12141a] border border-neutral-800 p-5 rounded-sm flex flex-col max-h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] uppercase text-neutral-400 tracking-widest">Service Catalog</span>
            <button 
              onClick={() => setIsEditingCatalog(!isEditingCatalog)}
              className={`p-1.5 rounded-sm transition-colors ${isEditingCatalog ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
              title="Edit Catalog Items"
            >
              {isEditingCatalog ? <Check size={14} /> : <Settings size={14} />}
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 custom-scrollbar pr-1">
            {serviceCatalog.map(service => (
              <div 
                key={service.id}
                draggable={!isEditingCatalog}
                onDragStart={(e) => handleDragStart(e, service.id)}
                onClick={() => !isEditingCatalog && addItem(service.id)}
                className="p-3 bg-[#0c0d12] border border-neutral-800 hover:border-neutral-700 rounded-sm cursor-pointer transition-colors flex justify-between items-center group"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white uppercase text-xs truncate">{service.name}</div>
                  <div className="flex items-center gap-2 mt-1 text-[9px] text-neutral-500 uppercase">
                    <span>{service.category}</span>
                    <span>•</span>
                    <span className="text-neutral-300">LKR {service.defaultPrice.toLocaleString()}</span>
                  </div>
                </div>
                {!isEditingCatalog && (
                  <Plus size={14} className="text-neutral-500 group-hover:text-white shrink-0 ml-2" />
                )}
                {isEditingCatalog && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCatalogItem(service.id); }} className="text-neutral-500 hover:text-rose-400 p-1">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isEditingCatalog && (
            <form onSubmit={handleAddNewService} className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
              <input 
                placeholder="New service name..."
                required
                className="w-full px-3 py-1.5 bg-[#0c0d12] border border-neutral-800 text-xs text-white rounded-sm outline-none"
                value={newService.name}
                onChange={e => setNewService({...newService, name: e.target.value})}
              />
              <div className="flex gap-2">
                <input 
                  type="number"
                  required
                  placeholder="Price"
                  className="w-24 px-3 py-1.5 bg-[#0c0d12] border border-neutral-800 text-xs text-white rounded-sm outline-none"
                  value={newService.price}
                  onChange={e => setNewService({...newService, price: e.target.value})}
                />
                <button type="submit" className="flex-1 px-3 py-1.5 bg-white text-black font-black text-xs uppercase rounded-sm hover:bg-neutral-200">
                  Add Item
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Builder Area */}
        <div 
          className="lg:col-span-2 bg-[#12141a] border border-neutral-800 p-6 rounded-sm min-h-[400px] flex flex-col justify-between"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border border-dashed border-neutral-800 rounded-sm text-neutral-500">
              <DollarSign size={36} className="mb-2 opacity-30 text-neutral-400" />
              <div className="font-heading font-black text-white uppercase text-sm">Quote Builder Node Empty</div>
              <p className="text-[10px] text-neutral-500 uppercase mt-1">
                Click or drag items from the service catalog to populate this quote.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] text-neutral-500 uppercase border-b border-neutral-800 pb-2">
                <span>Selected Deliverable</span>
                <div className="flex gap-8">
                  <span>Qty</span>
                  <span>Rate</span>
                  <span>Total</span>
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {items.map(item => (
                  <div key={item.id} className="p-3 bg-[#0c0d12] border border-neutral-800 rounded-sm flex items-center justify-between gap-4">
                    <input 
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      className="bg-transparent font-bold text-white uppercase text-xs outline-none flex-1 truncate"
                    />

                    <div className="flex items-center gap-4 shrink-0">
                      <input 
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-12 text-center bg-[#181a24] border border-neutral-800 rounded-sm text-xs text-white p-1"
                      />
                      <input 
                        type="number"
                        value={item.unitPrice}
                        onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-20 text-right bg-[#181a24] border border-neutral-800 rounded-sm text-xs text-white p-1"
                      />
                      <div className="w-24 text-right font-bold text-white">
                        {item.total.toLocaleString()}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-neutral-500 hover:text-rose-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-neutral-800 flex flex-col items-end space-y-2">
                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal:</span>
                    <span className="text-white">LKR {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Tax (18%):</span>
                    <span className="text-white">LKR {tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold pt-1 border-t border-neutral-700">
                    <span>TOTAL:</span>
                    <span>LKR {total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setItems([])} className="px-4 py-2 text-neutral-400 hover:text-white uppercase text-xs">
                    Clear
                  </button>
                  <button onClick={() => setShowPreview(true)} className="px-6 py-2.5 bg-white text-black font-black uppercase tracking-wider rounded-sm hover:bg-neutral-200">
                    Generate Protocol Preview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationBuilder;
