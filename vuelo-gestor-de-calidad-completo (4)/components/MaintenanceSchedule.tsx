
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ScheduleEntry, MaintenanceStatus, InventoryItem } from '../types';
import Logo from './Logo';

declare const html2canvas: any;
declare global {
  interface Window {
    jspdf: any;
  }
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const YEAR_OPTIONS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

interface MaintenanceScheduleProps {
  schedule: ScheduleEntry[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
  inventory: InventoryItem[];
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  readOnly?: boolean;
}

const MaintenanceSchedule: React.FC<MaintenanceScheduleProps> = ({ schedule, setSchedule, inventory, selectedYear, setSelectedYear, readOnly = false }) => {
  const [newEntry, setNewEntry] = useState({ inventoryId: '', actividad: '', respMantenimiento: 'Mauricio Pino', frecuencia: '30-45 dias' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [planType, setPlanType] = useState<'tech' | 'non-tech'>('tech');
  
  const [formatCode] = useState('RMATI-02');
  const [formatVersion] = useState('02');
  const [formatVigencia] = useState('09/08/2024');

  const printRef = useRef<HTMLDivElement>(null);

  const filteredSchedule = useMemo(() => {
    return schedule.filter(entry => {
      const item = inventory.find(i => i.name === entry.equipo);
      if (planType === 'tech') return !item?.isNonTech;
      return item?.isNonTech;
    });
  }, [schedule, inventory, planType]);

  const handleStatusChange = (id: number, month: string) => {
    if (readOnly) return;
    setSchedule(prev => prev.map(entry => {
      if (entry.id === id) {
        const newStatus = { ...entry.status };
        const current = newStatus[month];
        if (current === MaintenanceStatus.Planned) newStatus[month] = MaintenanceStatus.Realized;
        else if (current === MaintenanceStatus.Realized) delete newStatus[month];
        else newStatus[month] = MaintenanceStatus.Planned;
        return { ...entry, status: newStatus };
      }
      return entry;
    }));
  };

  const handleExport = async () => {
    const { jsPDF } = window.jspdf;
    const element = printRef.current;
    if (element) {
        const canvas = await html2canvas(element, { 
          scale: 3, 
          useCORS: true, 
          backgroundColor: "#FFFFFF",
          logging: false 
        });
        const data = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'letter' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(data, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`PROGRAMA_MTTO_${selectedYear}_VUELO.pdf`);
    }
  };

  const monthlyTotals = useMemo(() => {
    return MONTHS.map(month => {
      const planned = schedule.reduce((acc, entry) => acc + (entry.status[month] ? 1 : 0), 0);
      const realized = schedule.reduce((acc, entry) => acc + (entry.status[month] === MaintenanceStatus.Realized ? 1 : 0), 0);
      return { month, planned, realized, pct: planned > 0 ? (realized / planned) * 100 : 0 };
    });
  }, [schedule]);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 w-full animate-fadeIn">
      <div className="flex justify-between items-center mb-8 border-b border-indigo-50 pb-6">
        <div>
          <h1 className="text-2xl font-black text-indigo-900 uppercase">Programa Anual de Mantenimiento</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selectedYear} - Sede Colombia</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
            <button 
              onClick={() => setPlanType('tech')}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${planType === 'tech' ? 'bg-indigo-950 text-white shadow-md' : 'text-gray-400 hover:text-indigo-900'}`}
            >
              Tecnológico
            </button>
            <button 
              onClick={() => setPlanType('non-tech')}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${planType === 'non-tech' ? 'bg-indigo-950 text-white shadow-md' : 'text-gray-400 hover:text-indigo-900'}`}
            >
              No Tecnológico
            </button>
          </div>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-50 border-2 border-indigo-100 text-indigo-900 font-black rounded-xl px-4 py-2 outline-none text-xs">
            {YEAR_OPTIONS.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <button onClick={handleExport} className="px-5 py-2.5 bg-indigo-950 text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg hover:bg-slate-800 transition-all">Exportar PDF con Cabecera</button>
        </div>
      </div>

      <div ref={printRef} className="p-8 bg-white border border-gray-100">
        {/* CABECERA DE CALIDAD RAD-02 INTEGRADA EN IMPRESIÓN */}
        <div className="flex justify-between items-center mb-6 border-b-2 border-indigo-950 pb-4">
          <Logo className="h-16" />
          <div className="text-center">
             <h2 className="text-xl font-black text-indigo-950 uppercase leading-none">Programa de Mantenimiento Preventivo</h2>
             <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.3em] mt-1">Vuelo Pharma Colombia - {planType === 'tech' ? 'Plan Tecnológico' : 'Plan No Tecnológico'} {selectedYear}</p>
          </div>
          <table className="border-collapse border border-gray-400 text-[8px] w-40">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-1 font-black bg-gray-50 uppercase">Código</td>
                <td className="border border-gray-400 p-1 font-bold">{formatCode}</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1 font-black bg-gray-50 uppercase">Versión</td>
                <td className="border border-gray-400 p-1 font-bold">{formatVersion}</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1 font-black bg-gray-50 uppercase">Vigencia</td>
                <td className="border border-gray-400 p-1 font-bold">{formatVigencia}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300 text-[9px]">
            <thead className="bg-indigo-950 text-white font-black uppercase text-[7px]">
              <tr>
                <th className="border border-indigo-900 p-2 text-left">Activo / Equipo</th>
                <th className="border border-indigo-900 p-2 text-left">Actividad Técnica</th>
                {MONTHS.map(m => <th key={m} className="border border-indigo-900 p-1 w-8 text-center">{m.substring(0,3)}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredSchedule.map(entry => (
                <tr key={entry.id} className="hover:bg-indigo-50/30">
                  <td className="border border-gray-300 p-2 font-black text-indigo-950 uppercase">{entry.equipo}</td>
                  <td className="border border-gray-300 p-2 text-gray-500 italic leading-tight">{entry.actividad}</td>
                  {MONTHS.map(m => (
                    <td key={m} className="border border-gray-300 p-1 text-center">
                      <button 
                        onClick={() => handleStatusChange(entry.id, m)}
                        disabled={readOnly}
                        className={`w-5 h-5 rounded-md flex items-center justify-center mx-auto text-[7px] font-black transition-all ${
                          entry.status[m] === MaintenanceStatus.Planned ? 'bg-indigo-500 text-white shadow-sm' :
                          entry.status[m] === MaintenanceStatus.Realized ? 'bg-cyan-400 text-white shadow-sm' : 'bg-gray-50 text-gray-200'
                        }`}
                      >
                        {entry.status[m] || ''}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-black text-[7px] uppercase">
              <tr>
                <td colSpan={2} className="border border-gray-300 p-2 text-right text-indigo-900">Actividades Programadas (P)</td>
                {monthlyTotals.map(t => <td key={t.month} className="border border-gray-300 p-1 text-center text-indigo-900">{t.planned}</td>)}
              </tr>
              <tr>
                <td colSpan={2} className="border border-gray-300 p-2 text-right text-cyan-600">Actividades Ejecutadas (R)</td>
                {monthlyTotals.map(t => <td key={t.month} className="border border-gray-300 p-1 text-center text-cyan-500">{t.realized}</td>)}
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-20 text-center">
            <div className="border-t border-gray-300 pt-2">
                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Responsable de Mantenimiento</p>
            </div>
            <div className="border-t border-gray-300 pt-2">
                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Aseguramiento de Calidad</p>
            </div>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-8">
           <button onClick={() => setShowAddForm(true)} className="px-8 py-3 bg-indigo-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-indigo-800 transition-all">Añadir Tarea al Calendario</button>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <form className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-lg" onSubmit={(e) => {
            e.preventDefault();
            const item = inventory.find(i => i.id === newEntry.inventoryId);
            if (item) {
                setSchedule([...schedule, { id: Date.now(), equipo: item.name, modelo: item.model, actividad: newEntry.actividad, respMantenimiento: newEntry.respMantenimiento, respEquipo: item.assignedTo, frecuencia: newEntry.frecuencia, status: {} }]);
            }
            setShowAddForm(false);
          }}>
             <h3 className="text-xl font-black text-indigo-900 uppercase mb-6">Nueva Tarea Programada</h3>
             <div className="space-y-4">
                <select className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-indigo-100" onChange={e => setNewEntry({...newEntry, inventoryId: e.target.value})} required>
                    <option value="">Seleccione Activo...</option>
                    {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.id})</option>)}
                </select>
                <input placeholder="Actividad Técnica" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-indigo-100" value={newEntry.actividad} onChange={e => setNewEntry({...newEntry, actividad: e.target.value})} required />
             </div>
             <div className="mt-8 flex justify-end gap-3">
               <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-3 text-[10px] font-black uppercase text-gray-400">Cancelar</button>
               <button type="submit" className="px-8 py-3 bg-indigo-950 text-white text-[10px] font-black uppercase rounded-xl">Guardar en Programa</button>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MaintenanceSchedule;
