
import React, { useState, useMemo, useRef } from 'react';
import { ExtendedMaintenanceRecord, InventoryItem } from '../types';
import Logo from './Logo';

declare const html2canvas: any;
declare global {
  interface Window {
    jspdf: any;
  }
}

const RecordViewerModal: React.FC<{
    record: ExtendedMaintenanceRecord;
    onClose: () => void;
}> = ({ record, onClose }) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        const { jsPDF } = window.jspdf;
        const element = printRef.current;
        if (element) {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const data = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`registro-calidad-${record.equipmentId}-${record.date}.pdf`);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-[70] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-fadeIn">
                <div className="flex justify-between items-center p-6 border-b bg-gray-50 no-print">
                    <span className="text-[10px] font-black text-indigo-950 uppercase tracking-[0.3em]">Documento Oficial de Calidad</span>
                    <div className="flex space-x-3">
                        <button onClick={handleDownload} className="px-5 py-2.5 bg-indigo-950 text-white text-[10px] font-black rounded-xl hover:bg-indigo-900 transition-colors uppercase tracking-widest shadow-lg">Descargar PDF</button>
                        <button onClick={onClose} className="px-5 py-2.5 bg-white border-2 border-gray-100 text-gray-500 text-[10px] font-black rounded-xl hover:bg-gray-100 transition-colors uppercase tracking-widest">Cerrar</button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 md:p-10 bg-slate-100 custom-scrollbar">
                    <div ref={printRef} className="bg-white p-12 shadow-sm max-w-[800px] mx-auto min-h-[1000px] border border-gray-200 rounded-sm">
                        <div className="text-center mb-10">
                            <Logo className="h-24 mx-auto" />
                        </div>
                        <div className="flex justify-between items-start mb-10 border-b-4 border-indigo-950 pb-8">
                            <div className="w-48" />
                            <div className="text-center flex-grow">
                                <h1 className="text-3xl font-black text-indigo-950 tracking-tighter uppercase leading-none">Registro de Mantenimiento</h1>
                                <p className="text-[10px] text-cyan-500 font-black tracking-[0.5em] mt-2">SISTEMA INTEGRAL DE GESTIÓN GxP</p>
                            </div>
                            <table className="border-collapse border border-gray-300 text-[9px] w-48 bg-white">
                                <tbody>
                                    <tr><td className="border border-gray-300 p-1.5 font-black bg-gray-50 uppercase text-indigo-950">Código</td><td className="border border-gray-300 p-1.5 font-bold">RAD-06</td></tr>
                                    <tr><td className="border border-gray-300 p-1.5 font-black bg-gray-50 uppercase text-indigo-950">Versión</td><td className="border border-gray-300 p-1.5 font-bold">01</td></tr>
                                    <tr><td className="border border-gray-300 p-1.5 font-black bg-gray-50 uppercase text-indigo-950">Vigencia</td><td className="border border-gray-300 p-1.5 font-bold">09/08/2024</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-8">
                            <fieldset className="border-2 border-indigo-50 p-6 rounded-2xl">
                                <legend className="text-[10px] font-black text-indigo-950 px-4 uppercase tracking-[0.2em] bg-white">Responsable Técnico</legend>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Nombre y Apellido</label>
                                        <div className="p-4 bg-slate-50 border-b-2 border-indigo-100 text-xs font-black text-indigo-950 rounded-lg uppercase">{record.technician}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">No. Identificación</label>
                                        <div className="p-4 bg-slate-50 border-b-2 border-indigo-100 text-xs font-black text-indigo-950 rounded-lg">{record.technicianId || 'REGISTRADO'}</div>
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset className="border-2 border-indigo-50 p-6 rounded-2xl">
                                <legend className="text-[10px] font-black text-indigo-950 px-4 uppercase tracking-[0.2em] bg-white">Identificación del Activo</legend>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Equipo / Sistema</label>
                                        <div className="p-4 bg-slate-50 border-b-2 border-indigo-100 text-xs font-black text-indigo-950 rounded-lg uppercase">{record.equipmentName}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Referencia / Serial</label>
                                        <div className="p-4 bg-slate-50 border-b-2 border-indigo-100 text-xs font-bold text-slate-600 rounded-lg">{record.equipmentId} / {record.details || 'N/A'}</div>
                                    </div>
                                </div>
                            </fieldset>

                            <fieldset className="border-2 border-indigo-50 p-6 rounded-2xl">
                                <legend className="text-[10px] font-black text-indigo-950 px-4 uppercase tracking-[0.2em] bg-white">Descripción de la Intervención</legend>
                                <div className="grid grid-cols-2 gap-8 mb-6">
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Categoría</label>
                                        <div className={`p-3 border-b-2 text-[10px] font-black inline-block rounded-xl px-4 ${record.type === 'Correctivo' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>{record.type.toUpperCase()}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Fecha Ejecución</label>
                                        <div className="p-4 bg-slate-50 border-b-2 border-indigo-100 text-xs font-black text-indigo-950 rounded-lg">{record.date}</div>
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-3">Detalle Técnico de Actividades</label>
                                    <div className="p-6 bg-slate-50/50 border-2 border-slate-50 rounded-3xl text-xs min-h-[150px] whitespace-pre-wrap leading-relaxed italic text-slate-700 font-medium">
                                        {record.description}
                                    </div>
                                </div>

                                {record.photo && (
                                    <div className="mb-6">
                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-3">Evidencia Fotográfica de Calidad</label>
                                        <div className="flex justify-center border-4 border-white p-2 bg-slate-100 rounded-[2rem] shadow-inner overflow-hidden">
                                            <img src={record.photo} alt="Evidencia" className="max-h-80 object-contain rounded-2xl shadow-lg" />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Observaciones y Hallazgos</label>
                                    <div className="p-4 bg-amber-50/30 border-l-4 border-amber-200 text-[11px] font-bold text-amber-900 italic rounded-r-xl">
                                        {record.observations || 'Intervención realizada según protocolo GxP. Sin observaciones críticas.'}
                                    </div>
                                </div>

                                {record.googleTaskId && (
                                    <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4">
                                        <div className="p-3 bg-white rounded-xl shadow-sm">
                                            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="Google" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Evidencia Digital</p>
                                            <p className="text-[10px] font-black text-indigo-950 uppercase">Vinculado a Google Tasks</p>
                                            <p className="text-[9px] text-indigo-600 font-mono mt-1">ID: {record.googleTaskId}</p>
                                        </div>
                                    </div>
                                )}
                            </fieldset>
                        </div>

                        <div className="grid grid-cols-3 gap-12 mt-20 pt-10 border-t border-slate-100">
                            <div className="text-center">
                                <p className="font-cursive text-3xl text-indigo-950 mb-4" style={{fontFamily: "'Brush Script MT', cursive"}}>{record.technician}</p>
                                <div className="border-t-2 border-slate-200 pt-3">
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Ejecución Técnica</p>
                                </div>
                            </div>
                            <div className="text-center flex flex-col justify-end">
                                <div className="border-t-2 border-slate-200 pt-3">
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Aseguramiento Calidad</p>
                                </div>
                            </div>
                            <div className="text-center flex flex-col justify-end">
                                <div className="border-t-2 border-slate-200 pt-3">
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Autorización Final</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface HistoryPanelProps {
  inventory: InventoryItem[];
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ inventory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<ExtendedMaintenanceRecord | null>(null);

  const allRecords: ExtendedMaintenanceRecord[] = useMemo(() => {
    const records: ExtendedMaintenanceRecord[] = [];
    inventory.forEach(item => {
      // Robustez: verificar que exista lifecycle y maintenanceHistory
      if (item.lifecycle && item.lifecycle.maintenanceHistory) {
          item.lifecycle.maintenanceHistory.forEach(history => {
            records.push({
              ...history,
              equipmentName: item.name,
              equipmentId: item.id
            });
          });
      }
    });
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [inventory]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => 
      r.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.technician.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.equipmentId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allRecords, searchTerm]);

  return (
    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 w-full animate-fadeIn">
      {selectedRecord && <RecordViewerModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />}

      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
            <h1 className="text-3xl font-black text-indigo-950 tracking-tight uppercase">Trazabilidad de Intervenciones</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-2">Archivo Maestro de Registros RAD-06</p>
        </div>
        <div className="w-full md:w-96">
          <input
            type="text"
            placeholder="BUSCAR POR EQUIPO, TÉCNICO O ID..."
            className="w-full px-8 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-950 outline-none transition-all shadow-sm font-black text-[10px] tracking-widest uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-indigo-950">
            <tr>
              <th className="px-10 py-6 text-left text-[9px] font-black text-indigo-200 uppercase tracking-widest">Fecha</th>
              <th className="px-10 py-6 text-left text-[9px] font-black text-indigo-200 uppercase tracking-widest">Activo Identificado</th>
              <th className="px-10 py-6 text-left text-[9px] font-black text-indigo-200 uppercase tracking-widest">Responsable</th>
              <th className="px-10 py-6 text-center text-[9px] font-black text-indigo-200 uppercase tracking-widest">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {filteredRecords.length > 0 ? filteredRecords.map((record) => (
              <tr key={record.id} className="hover:bg-indigo-50/50 transition-all group">
                <td className="px-10 py-8 whitespace-nowrap text-xs font-black text-indigo-950 uppercase tracking-tighter">{record.date}</td>
                <td className="px-10 py-8">
                    <div className="text-sm font-black text-indigo-950 uppercase tracking-tight">{record.equipmentName}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg">{record.equipmentId}</span>
                      <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${record.type === 'Correctivo' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{record.type}</span>
                    </div>
                </td>
                <td className="px-10 py-8 whitespace-nowrap">
                   <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{record.technician}</p>
                   <p className="text-[9px] text-indigo-300 font-bold uppercase mt-1 tracking-widest">Especialista Autorizado</p>
                </td>
                <td className="px-10 py-8 whitespace-nowrap text-center">
                  <button 
                    onClick={() => setSelectedRecord(record)}
                    className="p-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-950 hover:text-white rounded-2xl transition-all shadow-md hover:shadow-xl hover:-translate-y-1 group-hover:scale-105"
                    title="Ver Formato RAD-06"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="px-10 py-24 text-center">
                   <div className="flex flex-col items-center gap-6">
                      <div className="p-8 bg-slate-50 rounded-full">
                        <svg className="w-16 h-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em]">No se detectan registros históricos de mantenimiento</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default HistoryPanel;
