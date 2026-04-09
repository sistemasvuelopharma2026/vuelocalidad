
import React, { useMemo } from 'react';
import { InventoryItem, ScheduleEntry, MaintenanceStatus, InventoryStatus } from '../types';
import Logo from './Logo';

interface IndicatorsPanelProps {
  inventory: InventoryItem[];
  schedule: ScheduleEntry[];
}

const IndicatorsPanel: React.FC<IndicatorsPanelProps> = ({ inventory, schedule }) => {
  const stats = useMemo(() => {
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    
    const techInventory = inventory.filter(i => !i.isNonTech);
    const nonTechInventory = inventory.filter(i => i.isNonTech);

    // Cumplimiento por mes (Tech)
    const monthlyCompliance = months.map(month => {
      const planned = schedule.reduce((acc, entry) => {
        const item = inventory.find(i => i.name === entry.equipo);
        if (item?.isNonTech) return acc;
        return acc + (entry.status[month] ? 1 : 0);
      }, 0);
      const realized = schedule.reduce((acc, entry) => {
        const item = inventory.find(i => i.name === entry.equipo);
        if (item?.isNonTech) return acc;
        return acc + (entry.status[month] === MaintenanceStatus.Realized ? 1 : 0);
      }, 0);
      return { month, planned, realized, pct: planned > 0 ? (realized / planned) * 100 : 0 };
    });

    // Cumplimiento por mes (Non-Tech)
    const nonTechMonthlyCompliance = months.map(month => {
      const planned = schedule.reduce((acc, entry) => {
        const item = inventory.find(i => i.name === entry.equipo);
        if (!item?.isNonTech) return acc;
        return acc + (entry.status[month] ? 1 : 0);
      }, 0);
      const realized = schedule.reduce((acc, entry) => {
        const item = inventory.find(i => i.name === entry.equipo);
        if (!item?.isNonTech) return acc;
        return acc + (entry.status[month] === MaintenanceStatus.Realized ? 1 : 0);
      }, 0);
      return { month, planned, realized, pct: planned > 0 ? (realized / planned) * 100 : 0 };
    });

    // Ratio Correctivo vs Preventivo (Tech)
    let preventive = 0;
    let corrective = 0;
    techInventory.forEach(item => {
      item.lifecycle.maintenanceHistory.forEach(h => {
        if (h.type === 'Preventivo') preventive++;
        if (h.type === 'Correctivo') corrective++;
      });
    });

    // Salud del Inventario (Tech)
    const totalAssets = techInventory.length;
    const inUse = techInventory.filter(i => i.status === InventoryStatus.InUse).length;
    const underMaintenance = techInventory.filter(i => i.status === InventoryStatus.UnderMaintenance).length;

    // Salud del Inventario (Non-Tech)
    const totalNonTechAssets = nonTechInventory.length;
    const nonTechInUse = nonTechInventory.filter(i => i.status === InventoryStatus.InUse).length;

    return { 
      monthlyCompliance, 
      nonTechMonthlyCompliance,
      preventive, 
      corrective, 
      totalAssets, 
      inUse, 
      underMaintenance,
      totalNonTechAssets,
      nonTechInUse
    };
  }, [inventory, schedule]);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-fadeIn">
      <div className="flex justify-between items-start mb-10 border-b-2 border-indigo-900 pb-6">
        <Logo className="h-16" />
        <div className="text-right">
          <h1 className="text-2xl font-black text-indigo-900 uppercase">Indicadores de Gestión de Calidad</h1>
          <table className="mt-2 border-collapse border border-gray-200 text-[9px] ml-auto">
            <tbody>
              <tr><td className="border border-gray-200 p-1 font-bold bg-gray-50 uppercase">Código</td><td className="border border-gray-200 p-1">RAD-07</td></tr>
              <tr><td className="border border-gray-200 p-1 font-bold bg-gray-50 uppercase">Versión</td><td className="border border-gray-200 p-1">01</td></tr>
              <tr><td className="border border-gray-200 p-1 font-bold bg-gray-50 uppercase">Vigencia</td><td className="border border-gray-200 p-1">20/01/2025</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-center">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Cumplimiento Tech</p>
          <p className="text-4xl font-black text-indigo-900">
            {stats.monthlyCompliance.length > 0 ? 
              (stats.monthlyCompliance.reduce((a, b) => a + b.pct, 0) / 12).toFixed(1) : 0}%
          </p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Cumplimiento No-Tech</p>
          <p className="text-4xl font-black text-emerald-900">
            {stats.nonTechMonthlyCompliance.length > 0 ? 
              (stats.nonTechMonthlyCompliance.reduce((a, b) => a + b.pct, 0) / 12).toFixed(1) : 0}%
          </p>
        </div>
        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 text-center">
          <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Disponibilidad Tech</p>
          <p className="text-4xl font-black text-green-900">
            {stats.totalAssets > 0 ? ((stats.inUse / stats.totalAssets) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Tasa de Correctivos</p>
          <p className="text-4xl font-black text-red-900">
            {stats.preventive + stats.corrective > 0 ? 
              ((stats.corrective / (stats.preventive + stats.corrective)) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-4">Cumplimiento Mensual de Tareas</h3>
        <div className="h-40 flex items-end gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          {stats.monthlyCompliance.map(m => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div 
                className="w-full bg-indigo-500 rounded-t-lg transition-all duration-1000" 
                style={{ height: `${m.pct}%` }}
                title={`${m.month}: ${m.pct.toFixed(1)}%`}
              ></div>
              <span className="text-[8px] font-black text-gray-400 rotate-45 md:rotate-0">{m.month.substring(0,3)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border border-gray-100 p-6 rounded-2xl bg-white shadow-sm">
           <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-4">Mantenimiento Preventivo vs Correctivo</h3>
           <div className="flex items-center gap-6">
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
                 <div className="bg-indigo-500 h-full" style={{ width: `${stats.preventive / (stats.preventive + stats.corrective || 1) * 100}%` }}></div>
                 <div className="bg-red-500 h-full" style={{ width: `${stats.corrective / (stats.preventive + stats.corrective || 1) * 100}%` }}></div>
              </div>
              <div className="text-[10px] font-bold text-gray-500">
                 <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Prev: {stats.preventive}</p>
                 <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Corr: {stats.corrective}</p>
              </div>
           </div>
        </div>
        <div className="border border-gray-100 p-6 rounded-2xl bg-white shadow-sm">
           <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-4">Estado de Equipos en Planta</h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                 <p className="text-[10px] text-gray-400 font-bold uppercase">En Uso</p>
                 <p className="text-xl font-black text-indigo-900">{stats.inUse}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                 <p className="text-[10px] text-gray-400 font-bold uppercase">Mantenimiento</p>
                 <p className="text-xl font-black text-yellow-600">{stats.underMaintenance}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsPanel;
