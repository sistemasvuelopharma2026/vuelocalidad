import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, InventoryStatus, LifecycleData, UserRole } from '../types';
import Logo from './Logo';

declare const html2canvas: any;
declare global {
  interface Window {
    jspdf: any;
  }
}

const statusColors: { [key in InventoryStatus]: string } = {
  [InventoryStatus.InUse]: 'bg-green-100 text-green-800',
  [InventoryStatus.InStorage]: 'bg-blue-100 text-blue-800',
  [InventoryStatus.UnderMaintenance]: 'bg-yellow-100 text-yellow-800',
  [InventoryStatus.Decommissioned]: 'bg-red-100 text-red-800',
};

const ItemFormModal: React.FC<{
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
}> = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<InventoryItem, 'lifecycle'>>(() => {
    if (item) {
      const { lifecycle, ...rest } = item;
      return { ...rest };
    }
    return {
      id: `EQ-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      name: '',
      category: '',
      isNonTech: false,
      model: '',
      serial: '',
      assignedTo: '', 
      purchaseDate: new Date().toISOString().split('T')[0], 
      status: InventoryStatus.InStorage,
      imageUrl: ''
    };
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, imageUrl: event.target!.result as string }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!formData.name) return alert("El nombre es obligatorio");
    const itemToSave: InventoryItem = { 
      ...formData, 
      lifecycle: item?.lifecycle || { characteristics: '', maintenanceHistory: [], usageHistory: '', observations: '' } 
    };
    onSave(itemToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-indigo-50 animate-fadeIn">
        <h3 className="text-xl font-black mb-6 text-indigo-900 uppercase tracking-tighter border-b pb-4">
            {item ? 'Editar Información de Activo' : 'Registrar Nuevo Activo en Planta'}
        </h3>
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nombre del Equipo</label>
            <input name="name" value={formData.name} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Categoría</label>
            <input name="category" value={formData.category} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <input type="checkbox" name="isNonTech" checked={formData.isNonTech} onChange={handleChange} className="w-5 h-5 accent-indigo-600" id="isNonTech" />
            <label htmlFor="isNonTech" className="text-[10px] font-black text-indigo-900 uppercase cursor-pointer">Categoría No Tecnológica</label>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">ID Inventario</label>
            <input name="id" value={formData.id} onChange={handleChange} className="w-full p-3 bg-gray-100 border border-gray-100 rounded-xl outline-none font-black text-indigo-600" disabled={!!item} />
          </div>
          {!formData.isNonTech && (
            <>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Modelo</label>
                <input name="model" value={formData.model} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Serial / Placa</label>
                <input name="serial" value={formData.serial} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
              </div>
            </>
          )}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Responsable</label>
            <input name="assignedTo" value={formData.assignedTo} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Fecha de Ingreso</label>
            <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Estado Operativo</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer font-bold">
              {Object.values(InventoryStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2 mt-4">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Evidencia Fotográfica</label>
            <div className="flex items-center gap-4 border-2 border-dashed border-gray-200 p-4 rounded-2xl">
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-[10px] text-gray-500" />
                {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="h-16 w-16 object-cover rounded-xl shadow-sm border"/>}
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end space-x-3">
          <button className="px-6 py-3 bg-gray-100 text-gray-500 text-[10px] font-black uppercase rounded-xl hover:bg-gray-200 transition-colors" onClick={onClose}>Cancelar</button>
          <button className="px-8 py-3 bg-indigo-900 text-white text-[10px] font-black uppercase rounded-xl hover:bg-indigo-800 transition-all shadow-lg" onClick={handleSubmit}>Guardar Activo</button>
        </div>
      </div>
    </div>
  );
};

const LifecycleSheetModal: React.FC<{
    item: InventoryItem;
    onClose: () => void;
    onSave: (itemId: string, data: LifecycleData) => void;
    readOnly?: boolean;
}> = ({ item, onClose, onSave, readOnly = false }) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editableData, setEditableData] = useState<LifecycleData>(JSON.parse(JSON.stringify(item.lifecycle)));

    const handleFieldChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditableData({ ...editableData, [e.target.name]: e.target.value });
    };
    
    const handleSaveChanges = () => {
        onSave(item.id, editableData);
        setIsEditing(false);
    };

    const handleExport = async () => {
        const { jsPDF } = window.jspdf;
        const element = sheetRef.current;
        if (element) {
            const wasEditing = isEditing;
            if(wasEditing) setIsEditing(false);
            await new Promise(resolve => setTimeout(resolve, 150));
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const data = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`hoja-de-vida-${item.id}.pdf`);
            if(wasEditing) setIsEditing(true);
        }
    };
    
    const renderField = (label: string, name: keyof LifecycleData, value: string) => (
         <div className="mb-6">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">{label}</h4>
            {isEditing ? (
                <textarea name={name} value={value} onChange={handleFieldChange} rows={3} className="w-full p-3 border border-indigo-100 rounded-xl text-sm bg-indigo-50/20 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
            ) : (
                <p className="text-sm text-gray-700 bg-gray-50/50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap min-h-[4rem] leading-relaxed">
                    {value || 'Sin información registrada.'}
                </p>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-fadeIn">
                <div className="flex justify-between items-center p-6 border-b bg-white no-print">
                   <div className="flex gap-3">
                        {!readOnly && (
                          isEditing ? (
                               <button onClick={handleSaveChanges} className="px-5 py-2.5 bg-green-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg">Guardar Cambios</button>
                          ) : (
                               <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 bg-indigo-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg">Editar Ficha</button>
                          )
                        )}
                        <button onClick={handleExport} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-gray-50">Descargar PDF</button>
                   </div>
                   <button onClick={onClose} className="p-3 bg-gray-100 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </div>

                <div className="flex-grow overflow-y-auto bg-gray-50/30 p-4 md:p-8 custom-scrollbar">
                    <div ref={sheetRef} className="bg-white p-10 shadow-sm max-w-4xl mx-auto border border-gray-200 rounded-3xl">
                        <div className="flex justify-between items-center mb-10 border-b-4 border-indigo-900 pb-6">
                            <Logo className="h-16" />
                            <div className="text-right">
                                <h2 className="text-2xl font-black text-indigo-900 uppercase leading-none mb-1">Hoja de Vida de Activo</h2>
                                <p className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-[0.2em]">SISTEMA DE CALIDAD FARMACÉUTICO</p>
                                <p className="text-[10px] font-black text-gray-300 mt-2">CÓDIGO INTERNO: {item.id}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                            <div className="bg-white border p-4 rounded-2xl shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase mb-1">Equipo</p><p className="text-xs font-bold text-indigo-900">{item.name}</p></div>
                            {!item.isNonTech && (
                              <>
                                <div className="bg-white border p-4 rounded-2xl shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase mb-1">Modelo</p><p className="text-xs font-bold text-indigo-900">{item.model || 'N/A'}</p></div>
                                <div className="bg-white border p-4 rounded-2xl shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase mb-1">Serial</p><p className="text-xs font-bold text-indigo-900">{item.serial}</p></div>
                              </>
                            )}
                            <div className="bg-white border p-4 rounded-2xl shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase mb-1">Asignado</p><p className="text-xs font-bold text-indigo-900">{item.assignedTo}</p></div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-10">
                            <div className="flex-1">
                                {renderField('Especificaciones y Características Técnicas', 'characteristics', editableData.characteristics)}
                                {renderField('Trazabilidad de Uso en Planta', 'usageHistory', editableData.usageHistory)}
                                {renderField('Observaciones de Mantenimiento', 'observations', editableData.observations)}
                            </div>
                            {item.imageUrl && (
                                <div className="w-full md:w-64">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Registro Fotográfico</h4>
                                    <img src={item.imageUrl} alt={item.name} className="w-full aspect-square object-cover rounded-[2rem] shadow-xl border-4 border-white" />
                                </div>
                            )}
                        </div>

                        <div className="mt-10 pt-10 border-t border-gray-100">
                            <h4 className="text-[10px] font-black text-indigo-900 uppercase mb-6 flex items-center justify-between">
                                <span>Historial de Intervenciones Técnicas</span>
                                <span className="bg-indigo-900 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{item.lifecycle.maintenanceHistory.length} REGISTROS</span>
                            </h4>
                            <div className="space-y-3">
                                {item.lifecycle.maintenanceHistory.length > 0 ? item.lifecycle.maintenanceHistory.map((m, i) => (
                                    <div key={i} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div>
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase mr-3 ${m.type === 'Correctivo' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{m.type}</span>
                                          <span className="text-xs font-bold text-indigo-900">{m.date}</span>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-bold text-xs text-indigo-700">{m.technician}</p>
                                          <p className="text-[9px] text-gray-400 uppercase font-black">{m.description.substring(0, 50)}...</p>
                                        </div>
                                    </div>
                                )) : (
                                  <p className="text-center py-6 text-gray-300 text-xs font-bold uppercase italic">No hay historial de mantenimiento registrado.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InventoryPanel: React.FC<{
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  readOnly?: boolean;
}> = ({ inventory, setInventory, readOnly = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedLifecycleItem, setSelectedLifecycleItem] = useState<InventoryItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredInventory = useMemo(() => 
    inventory.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
    ), [inventory, searchTerm]);

  const handleSave = (item: InventoryItem) => {
    if (editingItem) {
      setInventory(prev => prev.map(i => i.id === item.id ? item : i));
      setEditingItem(null);
    } else {
      setInventory(prev => [...prev, item]);
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Desea eliminar este activo del inventario permanentemente?')) {
      setInventory(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleExportCSV = () => {
    const headers = "ID,Nombre,Categoria,Modelo,Serial,Responsable,FechaCompra,Estado\n";
    const rows = inventory.map(i => 
      `${i.id},${i.name},${i.category},${i.model},${i.serial},${i.assignedTo},${i.purchaseDate},${i.status}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventario_vuelo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(1);
      const newItems: InventoryItem[] = lines.filter(l => l.trim() !== "").map(line => {
        const parts = line.split(",");
        return {
          id: parts[0] || `EQ-${Math.random().toString(36).substr(2,6).toUpperCase()}`,
          name: parts[1] || "Sin nombre",
          category: parts[2] || "General",
          model: parts[3] || "N/A",
          serial: parts[4] || "N/A",
          assignedTo: parts[5] || "Sin asignar",
          purchaseDate: parts[6] || new Date().toISOString().split('T')[0],
          status: (parts[7] as InventoryStatus) || InventoryStatus.InStorage,
          imageUrl: '',
          lifecycle: { characteristics: '', maintenanceHistory: [], usageHistory: '', observations: '' }
        };
      });
      setInventory(prev => [...prev, ...newItems]);
      alert(`${newItems.length} equipos importados correctamente.`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 w-full animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
            <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Gestión de Inventario</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-1">Control Maestro de Activos Fijos</p>
        </div>
        <div className="flex flex-wrap w-full md:w-auto gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            className="flex-grow md:w-64 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm font-bold text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {!readOnly && (
            <>
              <button onClick={() => setIsAdding(true)} className="bg-indigo-900 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-800 transition-all">Nuevo Activo</button>
              <button onClick={() => fileInputRef.current?.click()} className="bg-white border-2 border-indigo-100 text-indigo-900 px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all">Importar</button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
            </>
          )}
          <button onClick={handleExportCSV} className="bg-green-600 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-100 hover:bg-green-700 transition-all">Exportar CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredInventory.map(item => (
          <div key={item.id} className="bg-white rounded-[2.5rem] border border-gray-50 overflow-hidden shadow-sm hover:shadow-2xl transition-all group flex flex-col h-full border border-gray-100 p-8 relative">
            <div className={`absolute top-6 right-8 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${statusColors[item.status]}`}>
                {item.status}
            </div>
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-2">{item.category}</p>
            <h3 className="text-xl font-black text-indigo-900 leading-tight line-clamp-2 min-h-[3.5rem] mb-4">{item.name}</h3>
            
            <div className="space-y-2 text-[10px] font-bold text-gray-500 flex-grow border-t border-gray-50 pt-4">
               <p className="flex justify-between"><span className="text-gray-300 font-black uppercase">ID:</span> <span className="text-indigo-600 font-black">{item.id}</span></p>
               <p className="flex justify-between"><span className="text-gray-300 font-black uppercase">Responsable:</span> <span>{item.assignedTo}</span></p>
               {!item.isNonTech && (
                 <p className="flex justify-between"><span className="text-gray-300 font-black uppercase">Modelo:</span> <span>{item.model || 'N/A'}</span></p>
               )}
               {item.isNonTech && (
                 <p className="flex justify-between"><span className="text-emerald-600 font-black uppercase">Categoría:</span> <span className="text-emerald-600">NO TECNOLÓGICA</span></p>
               )}
            </div>

            <div className="mt-8 flex gap-2">
               <button 
                 onClick={() => setSelectedLifecycleItem(item)}
                 className="flex-grow py-3 bg-indigo-50 text-indigo-900 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-900 hover:text-white transition-all shadow-sm"
               >
                 Hoja de Vida
               </button>
               {!readOnly && (
                 <button 
                   onClick={() => setEditingItem(item)}
                   className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-all"
                   title="Editar Activo"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                 </button>
               )}
            </div>
            {!readOnly && (
               <button 
                onClick={() => handleDelete(item.id)}
                className="absolute bottom-24 right-8 opacity-0 group-hover:opacity-100 transition-all p-2 text-red-300 hover:text-red-600"
                title="Eliminar"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
            )}
          </div>
        ))}
      </div>

      {(isAdding || editingItem) && (
        <ItemFormModal
          item={editingItem}
          onClose={() => { setEditingItem(null); setIsAdding(false); }}
          onSave={handleSave}
        />
      )}

      {selectedLifecycleItem && (
        <LifecycleSheetModal
          item={selectedLifecycleItem}
          onClose={() => setSelectedLifecycleItem(null)}
          onSave={(id, data) => {
            setInventory(prev => prev.map(i => i.id === id ? { ...i, lifecycle: data } : i));
          }}
          readOnly={readOnly}
        />
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  );
};

export default InventoryPanel;