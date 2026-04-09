
import React, { useState, useRef, useEffect } from 'react';
import Logo from './Logo';
import { InventoryItem, MaintenanceRecordHistory, GoogleTask } from '../types';
import { CheckSquare } from 'lucide-react';

declare const html2canvas: any;
declare global {
  interface Window {
    jspdf: any;
  }
}

const initialFormData = {
  technicianName: 'Mauricio Pino',
  technicianId: '123456789',
  equipment: '',
  marcaModelo: '', 
  maintenanceType: 'Preventivo',
  maintenanceDate: new Date().toISOString().split('T')[0],
  description: '',
  fechaFinalizacion: new Date().toISOString().split('T')[0],
  observations: '',
};

interface MaintenanceRecordProps {
  inventory: InventoryItem[];
  addMaintenanceToHistory: (itemId: string, historyEntry: MaintenanceRecordHistory) => void;
  googleTasks?: GoogleTask[];
}

const MaintenanceRecord: React.FC<MaintenanceRecordProps> = ({ inventory, addMaintenanceToHistory, googleTasks = [] }) => {
  const [formData, setFormData] = useState(() => {
    try {
      const savedData = localStorage.getItem('maintenanceRecordForm');
      return savedData ? JSON.parse(savedData) : initialFormData;
    } catch {
      return initialFormData;
    }
  });
  const [photo, setPhoto] = useState<string | null>(() => localStorage.getItem('maintenanceRecordPhoto'));
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const printRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTaskSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const taskId = e.target.value;
    setSelectedTaskId(taskId);
    const task = googleTasks.find(t => t.id === taskId);
    if (task) {
      setFormData(prev => ({
        ...prev,
        description: task.title,
        observations: task.notes || prev.observations
      }));
    }
  };

  useEffect(() => {
    localStorage.setItem('maintenanceRecordForm', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (photo) {
      localStorage.setItem('maintenanceRecordPhoto', photo);
    } else {
      localStorage.removeItem('maintenanceRecordPhoto');
    }
  }, [photo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleEquipmentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const itemId = e.target.value;
    setSelectedInventoryId(itemId);
    const selectedItem = inventory.find(item => item.id === itemId);
    if (selectedItem) {
        setFormData(prev => ({
            ...prev,
            equipment: selectedItem.name,
            marcaModelo: selectedItem.model,
        }));
    } else {
         setFormData(prev => ({
            ...prev,
            equipment: '',
            marcaModelo: '',
        }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target!.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleExport = async () => {
    const { jsPDF } = window.jspdf;
    const element = pdfTemplateRef.current;
    if (element) {
      // Temporarily show the template for rendering if needed, 
      // but html2canvas can usually grab it even if it's off-screen
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const data = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`RAD-06-Mantenimiento-${formData.equipment.replace(/\s/g, '_') || 'nuevo'}.pdf`);
    }
  };

  const handleFinalize = () => {
    if (!selectedInventoryId && !formData.equipment) {
        alert('Por favor, seleccione un equipo o ingrese el nombre de la actividad.');
        return;
    }
    if (!formData.description.trim()) {
        alert('Por favor, describa el mantenimiento realizado.');
        return;
    }
    
    const newHistoryEntry: MaintenanceRecordHistory = {
        id: `m-${Date.now()}`,
        date: formData.fechaFinalizacion,
        elaboratedDate: formData.maintenanceDate,
        type: formData.maintenanceType as any,
        description: formData.description,
        technician: formData.technicianName,
        technicianId: formData.technicianId,
        details: formData.marcaModelo,
        observations: formData.observations,
        photo: photo || undefined,
        googleTaskId: selectedTaskId || undefined
    };
    
    const targetId = selectedInventoryId || 'GENERAL';
    addMaintenanceToHistory(targetId, newHistoryEntry);
    
    alert(`Mantenimiento registrado exitosamente.`);
    setFormData(initialFormData);
    setPhoto(null);
    setSelectedInventoryId('');
    setSelectedTaskId('');
    localStorage.removeItem('maintenanceRecordForm');
    localStorage.removeItem('maintenanceRecordPhoto');
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl mx-auto border border-gray-100">
      <div ref={printRef} className="p-8 bg-white">
        <div className="text-center mb-6">
          <Logo className="h-24 mx-auto" />
        </div>
        <div className="flex justify-between items-start mb-6">
          <div className="w-48" />
          <div className="text-center flex-grow">
            <h1 className="text-2xl font-bold text-[#4B2E83]">REGISTRO DE MANTENIMIENTO</h1>
          </div>
          <table className="border-collapse border border-gray-400 text-[10px] w-48">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-1 font-bold bg-gray-50">CÓDIGO</td>
                <td className="border border-gray-400 p-1">RAD-06</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1 font-bold bg-gray-50">VERSIÓN</td>
                <td className="border border-gray-400 p-1">01</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1 font-bold bg-gray-50">VIGENCIA</td>
                <td className="border border-gray-400 p-1">09/08/2024</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <fieldset className="border border-gray-200 p-4 rounded-md mb-6 shadow-sm">
          <legend className="text-sm font-bold text-[#4B2E83] px-2 uppercase tracking-wide">Vinculación con Google Tasks</legend>
          <div className="flex items-center gap-4">
            <div className="flex-grow">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Asociar Tarea Pendiente:</label>
              <select 
                value={selectedTaskId} 
                onChange={handleTaskSelect}
                className="mt-1 block w-full px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900 font-bold"
              >
                <option value="">-- Ninguna tarea seleccionada --</option>
                {googleTasks.map(task => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
              </select>
            </div>
            {selectedTaskId && (
              <div className="mt-5 p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <CheckSquare size={16} />
              </div>
            )}
          </div>
          <p className="text-[9px] text-gray-400 mt-2 italic">
            * Al seleccionar una tarea, se cargará automáticamente su descripción y se marcará como completada al finalizar este registro.
          </p>
        </fieldset>

        <fieldset className="border border-gray-200 p-4 rounded-md mb-6 shadow-sm">
          <legend className="text-sm font-bold text-[#4B2E83] px-2 uppercase tracking-wide">Datos del Técnico</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre:</label>
              <input type="text" name="technicianName" value={formData.technicianName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">No. de Identificación:</label>
              <input type="text" name="technicianId" value={formData.technicianId} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"/>
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 p-4 rounded-md mb-6 shadow-sm">
          <legend className="text-sm font-bold text-[#4B2E83] px-2 uppercase tracking-wide">Datos de la Actividad</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Equipo / Actividad:</label>
              <select 
                name="equipment" 
                value={selectedInventoryId} 
                onChange={handleEquipmentSelect} 
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-200 rounded-md mb-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                  <option value="">Seleccione un equipo del inventario</option>
                  <option value="GENERAL">-- ACTIVIDAD GENERAL (SIN ACTIVO) --</option>
                  {inventory.map(item => <option key={item.id} value={item.id}>{item.name} - {item.id}</option>)}
              </select>
              <input 
                type="text" 
                name="equipment" 
                placeholder="O nombre de actividad manual..." 
                value={formData.equipment} 
                onChange={handleChange} 
                className="block w-full px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Detalle (Marca/Modelo):</label>
              <input 
                type="text" 
                name="marcaModelo" 
                value={formData.marcaModelo} 
                onChange={handleChange} 
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 p-4 rounded-md mb-6 shadow-sm">
          <legend className="text-sm font-bold text-[#4B2E83] px-2 uppercase tracking-wide">Descripción del Mantenimiento</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo:</label>
              <select name="maintenanceType" value={formData.maintenanceType} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Preventivo</option>
                <option>Correctivo</option>
                <option>Mejora</option>
                <option>Actividad</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha Elaboración:</label>
              <input type="date" name="maintenanceDate" value={formData.maintenanceDate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Detalle técnico del trabajo:</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>
          <div className="mt-4">
             <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" />
             <button onClick={triggerFileInput} className="px-4 py-2 text-xs bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors uppercase tracking-tight">
                Adjuntar Foto Evidencia
             </button>
             {photo && (
                <div className="mt-4 border-2 border-dashed border-gray-200 p-2 rounded-lg inline-block bg-gray-50">
                    <img src={photo} alt="Evidencia" className="max-w-xs max-h-48 rounded shadow-sm"/>
                </div>
             )}
          </div>
           <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha Finalización:</label>
              <input type="date" name="fechaFinalizacion" value={formData.fechaFinalizacion} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones:</label>
            <textarea name="observations" value={formData.observations} onChange={handleChange} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-100">
            <div className="text-center">
              <p className="font-cursive text-2xl text-gray-800" style={{fontFamily: "'Brush Script MT', cursive"}}>{formData.technicianName}</p>
              <hr className="border-t border-gray-300 mt-2"/>
              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">ELABORÓ</p>
            </div>
            <div className="text-center h-16 border-b border-gray-300">
              <p className="text-[10px] font-bold text-gray-400 mt-20 uppercase">REVISÓ</p>
            </div>
            <div className="text-center h-16 border-b border-gray-300">
              <p className="text-[10px] font-bold text-gray-400 mt-20 uppercase">AUTORIZÓ</p>
            </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-center items-center space-x-4 flex-wrap gap-y-4">
        <button onClick={handleFinalize} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105">
            Finalizar y Guardar Registro
        </button>
        <button onClick={handleExport} className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-100 font-bold rounded-xl hover:bg-indigo-50 transition-all">
          Generar Documento RAD-06 (PDF)
        </button>
      </div>

      {/* Plantilla oculta para exportación PDF con alineación perfecta y estilo original */}
      <div className="absolute -left-[9999px] top-0">
        <div ref={pdfTemplateRef} className="w-[800px] p-10 bg-white text-slate-900 font-sans">
          {/* Encabezado Estilo Original */}
          <div className="flex items-center justify-between border-b-4 border-[#4B2E83] pb-6 mb-8">
            <div className="w-1/4">
              <Logo className="h-16" />
            </div>
            <div className="w-1/2 text-center">
              <h1 className="text-2xl font-black text-[#4B2E83] uppercase leading-tight tracking-tighter">Registro de Mantenimiento</h1>
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em] mt-1">Vuelo Pharma Quality System</p>
            </div>
            <div className="w-1/4">
              <table className="border-collapse border border-indigo-100 text-[9px] w-full rounded-lg overflow-hidden">
                <tbody>
                  <tr>
                    <td className="border border-indigo-100 p-1.5 font-black bg-indigo-50 text-indigo-900 uppercase">CÓDIGO</td>
                    <td className="border border-indigo-100 p-1.5 font-bold text-center">RAD-06</td>
                  </tr>
                  <tr>
                    <td className="border border-indigo-100 p-1.5 font-black bg-indigo-50 text-indigo-900 uppercase">VERSIÓN</td>
                    <td className="border border-indigo-100 p-1.5 font-bold text-center">01</td>
                  </tr>
                  <tr>
                    <td className="border border-indigo-100 p-1.5 font-black bg-indigo-50 text-indigo-900 uppercase">VIGENCIA</td>
                    <td className="border border-indigo-100 p-1.5 font-bold text-center">09/08/2024</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Datos del Técnico - Estilo Fieldset */}
          <div className="border-2 border-indigo-100 rounded-3xl p-6 mb-8 relative bg-indigo-50/10">
            <div className="absolute -top-3 left-6 bg-white px-3 text-[10px] font-black text-[#4B2E83] uppercase tracking-widest">1. Información del Personal Técnico</div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <span className="text-[9px] font-black text-indigo-300 uppercase block mb-1">Nombre Completo:</span>
                <span className="text-sm font-black text-indigo-950 uppercase">{formData.technicianName}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-indigo-300 uppercase block mb-1">No. de Identificación:</span>
                <span className="text-sm font-black text-indigo-950 uppercase">{formData.technicianId}</span>
              </div>
            </div>
          </div>

          {/* Datos del Equipo - Estilo Fieldset */}
          <div className="border-2 border-indigo-100 rounded-3xl p-6 mb-8 relative bg-indigo-50/10">
            <div className="absolute -top-3 left-6 bg-white px-3 text-[10px] font-black text-[#4B2E83] uppercase tracking-widest">2. Identificación del Activo / Actividad</div>
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <span className="text-[9px] font-black text-indigo-300 uppercase block mb-1">Equipo / Actividad:</span>
                <span className="text-sm font-black text-indigo-950 uppercase">{formData.equipment || 'Actividad General'}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-indigo-300 uppercase block mb-1">ID / Serial:</span>
                <span className="text-sm font-black text-indigo-950 uppercase">{selectedInventoryId || 'N/A'}</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black text-indigo-300 uppercase block mb-1">Marca / Modelo / Detalles:</span>
              <span className="text-sm font-black text-indigo-950 uppercase">{formData.marcaModelo || 'N/A'}</span>
            </div>
          </div>

          {/* Detalles del Trabajo - Estilo Fieldset */}
          <div className="border-2 border-indigo-100 rounded-3xl p-6 mb-8 relative bg-indigo-50/10">
            <div className="absolute -top-3 left-6 bg-white px-3 text-[10px] font-black text-[#4B2E83] uppercase tracking-widest">3. Descripción Técnica del Trabajo</div>
            <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-indigo-50">
              <div>
                <span className="text-[9px] font-black text-indigo-300 uppercase block mb-1">Tipo:</span>
                <span className="text-xs font-black text-indigo-900 uppercase bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">{formData.maintenanceType}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-indigo-300 uppercase block mb-1">Fecha Inicio:</span>
                <span className="text-xs font-black text-indigo-950">{formData.maintenanceDate}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-indigo-300 uppercase block mb-1">Fecha Fin:</span>
                <span className="text-xs font-black text-indigo-950">{formData.fechaFinalizacion}</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black text-indigo-300 uppercase block mb-2">Detalle Técnico Ejecutado:</span>
              <div className="p-4 bg-white border border-indigo-50 rounded-2xl min-h-[120px]">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{formData.description}</p>
              </div>
            </div>
          </div>

          {/* Evidencia y Observaciones */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="border-2 border-indigo-100 rounded-3xl p-6 relative bg-indigo-50/10">
              <div className="absolute -top-3 left-6 bg-white px-3 text-[10px] font-black text-[#4B2E83] uppercase tracking-widest">4. Evidencia Fotográfica</div>
              <div className="flex items-center justify-center min-h-[200px] bg-white border border-indigo-50 rounded-2xl overflow-hidden">
                {photo ? (
                  <img src={photo} alt="Evidencia" className="max-w-full max-h-[180px] object-contain" />
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-[9px] text-slate-300 uppercase font-black italic">Sin registro fotográfico</span>
                  </div>
                )}
              </div>
            </div>
            <div className="border-2 border-indigo-100 rounded-3xl p-6 relative bg-indigo-50/10">
              <div className="absolute -top-3 left-6 bg-white px-3 text-[10px] font-black text-[#4B2E83] uppercase tracking-widest">5. Observaciones</div>
              <div className="p-4 bg-white border border-indigo-50 rounded-2xl min-h-[200px]">
                <p className="text-xs text-slate-600 italic font-medium leading-relaxed">{formData.observations || 'Sin observaciones adicionales registradas.'}</p>
                {selectedTaskId && (
                  <div className="mt-6 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                    <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4 h-4" alt="Google" />
                    <div>
                      <p className="text-[8px] font-black text-indigo-400 uppercase leading-none">Google Tasks ID</p>
                      <p className="text-[9px] font-mono text-indigo-700 mt-1">{selectedTaskId}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Firmas Estilo Original */}
          <div className="grid grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="h-16 flex items-end justify-center mb-2">
                <span className="font-cursive text-2xl text-indigo-950" style={{fontFamily: "'Brush Script MT', cursive"}}>{formData.technicianName}</span>
              </div>
              <div className="border-t-2 border-indigo-100 pt-3">
                <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">ELABORÓ</p>
                <p className="text-[8px] text-indigo-300 font-bold uppercase mt-1">Técnico Responsable</p>
              </div>
            </div>
            <div className="text-center">
              <div className="h-16 mb-2"></div>
              <div className="border-t-2 border-indigo-100 pt-3">
                <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">REVISÓ</p>
                <p className="text-[8px] text-indigo-300 font-bold uppercase mt-1">Aseguramiento Calidad</p>
              </div>
            </div>
            <div className="text-center">
              <div className="h-16 mb-2"></div>
              <div className="border-t-2 border-indigo-100 pt-3">
                <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">AUTORIZÓ</p>
                <p className="text-[8px] text-indigo-300 font-bold uppercase mt-1">Dirección Técnica</p>
              </div>
            </div>
          </div>
          
          <div className="mt-10 pt-6 border-t border-slate-50 flex justify-between items-center">
            <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.2em]">Vuelo Pharma Quality System • RAD-06</p>
            <p className="text-[8px] text-slate-300 font-black uppercase tracking-widest">Generado: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceRecord;
