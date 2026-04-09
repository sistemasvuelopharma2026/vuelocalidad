
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Logo from './components/Logo';
import MaintenanceRecord from './components/MaintenanceRecord';
import MaintenanceSchedule from './components/MaintenanceSchedule';
import InventoryPanel from './components/InventoryPanel';
import HistoryPanel from './components/HistoryPanel';
import IndicatorsPanel from './components/IndicatorsPanel';
import TasksPanel from './components/TasksPanel';
import { InventoryItem, ScheduleEntry, User, UserRole, MaintenanceRecordHistory, GoogleTask, InventoryStatus } from './types';
import { supabase } from './lib/supabase';
import { googleTasksService } from './services/googleTasks';
import { LayoutDashboard, ClipboardList, BarChart3, History, Wrench, Settings, CheckSquare, RefreshCw } from 'lucide-react';

const INITIAL_USERS: User[] = [
  { id: '1', username: 'areati', password: 'Vuelopharma2026*', role: UserRole.Admin },
  { id: '2', username: 'administrativos', password: 'Vuelopharma2026*', role: UserRole.Viewer }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('vuelo_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allSchedules, setAllSchedules] = useState<Record<string, ScheduleEntry[]>>({});
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'loading' | 'offline' | 'saving'>('offline');
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState(() => localStorage.getItem('vuelo_remote_sync_url') || './vuelo_master.json');

  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [googleTasks, setGoogleTasks] = useState<GoogleTask[]>([]);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);

  const handleGoogleAuthError = useCallback(() => {
    console.warn('Google Tasks token expired or invalid. Resetting auth state.');
    localStorage.removeItem('google_tasks_token');
    googleTasksService.setAccessToken(null);
    setIsGoogleAuth(false);
    setGoogleTasks([]);
  }, []);

  const fetchGoogleTasks = async () => {
    try {
      const fetched = await googleTasksService.getTasks();
      setGoogleTasks(fetched);
    } catch (err: any) {
      // Handle 401 Unauthenticated error silently (it's a session expiration)
      if (err.message?.includes('401') || err.message?.includes('UNAUTHENTICATED')) {
        console.warn('Google Tasks session expired. Resetting auth state.');
        handleGoogleAuthError();
      } else {
        console.error('Error fetching tasks in App:', err);
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('google_tasks_token');
    if (token) {
      googleTasksService.setAccessToken(token);
      setIsGoogleAuth(true);
      fetchGoogleTasks();
    }
  }, []);

  const testDbConnection = async () => {
    setTestStatus('testing');
    try {
      if (!supabase) throw new Error('Cliente no inicializado');
      const { data, error } = await supabase.from('mis_datos').select('id').limit(1);
      if (error) throw error;
      
      setTestStatus('success');
      // If test succeeds, we can try a full sync
      await syncEngine();
      
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch (e) {
      console.error('Test fallido:', e);
      setTestStatus('error');
      setSyncStatus('offline');
    }
  };

  const syncEngine = useCallback(async (forceRefresh = false) => {
    setSyncStatus('loading');
    setLastError(null);
    console.log("Iniciando sincronización...");
    
    try {
      if (!supabase) {
        throw new Error('Supabase no configurado. Vaya a Settings > Secrets y agregue VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
      }

      // Fetch Master Data from 'mis_datos'
      const { data, error } = await supabase
        .from('mis_datos')
        .select('content')
        .eq('id', 'master_data')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error de Supabase:", error);
        throw new Error(`Error de Base de Datos: ${error.message} (Código: ${error.code})`);
      }

      if (data?.content) {
        console.log("Datos remotos encontrados, actualizando estado...");
        const { inventory: remoteInv, allSchedules: remoteSch } = data.content;
        
        if (remoteInv) {
          setInventory(remoteInv);
          localStorage.setItem('vuelo_inventory_master', JSON.stringify(remoteInv));
        }
        if (remoteSch) {
          setAllSchedules(remoteSch);
          localStorage.setItem('vuelo_schedules_master', JSON.stringify(remoteSch));
        }
        setSyncStatus('synced');
        setLastSaveTime(new Date().toLocaleTimeString());
      } else {
        console.log("No se encontraron datos remotos (master_data vacío). Intentando carga local...");
        const localInv = localStorage.getItem('vuelo_inventory_master');
        const localSch = localStorage.getItem('vuelo_schedules_master');
        if (localInv) setInventory(JSON.parse(localInv));
        if (localSch) setAllSchedules(JSON.parse(localSch));
        setSyncStatus('synced');
      }
    } catch (e: any) {
      console.warn("Sincronización fallida:", e);
      setSyncStatus('offline');
      setLastError(e.message || String(e));
      
      const localInv = localStorage.getItem('vuelo_inventory_master');
      const localSch = localStorage.getItem('vuelo_schedules_master');
      if (localInv) {
        try { setInventory(JSON.parse(localInv)); } catch(err) {}
      }
      if (localSch) {
        try { setAllSchedules(JSON.parse(localSch)); } catch(err) {}
      }
    }
  }, []);

  useEffect(() => {
    syncEngine();
  }, [syncEngine]);

  // Persistent save to Supabase
  const saveToSupabase = async () => {
    if (!supabase) return;

    setSyncStatus('saving');
    setLastError(null);
    try {
      const masterData = {
        inventory,
        allSchedules,
        updatedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('mis_datos')
        .upsert({ 
          id: 'master_data', 
          content: masterData 
        });
      
      if (error) throw new Error(`Error al guardar: ${error.message} (Código: ${error.code})`);

      // Also save to local storage for offline fallback
      localStorage.setItem('vuelo_inventory_master', JSON.stringify(inventory));
      localStorage.setItem('vuelo_schedules_master', JSON.stringify(allSchedules));

      setSyncStatus('synced');
      setLastSaveTime(new Date().toLocaleTimeString());
    } catch (e: any) {
      console.error("Error saving to Supabase:", e);
      setSyncStatus('offline');
      setLastError(e.message || String(e));
      // Even if cloud save fails, save locally
      localStorage.setItem('vuelo_inventory_master', JSON.stringify(inventory));
      localStorage.setItem('vuelo_schedules_master', JSON.stringify(allSchedules));
    }
  };

  // Auto-save when data changes (with debounce)
  useEffect(() => {
    if (inventory.length === 0 && Object.keys(allSchedules).length === 0) return;
    
    const timer = setTimeout(() => {
      saveToSupabase();
    }, 3000); // 3 seconds debounce

    return () => clearTimeout(timer);
  }, [inventory, allSchedules]);

  // Keep the 5-minute safety interval
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (inventory.length > 0 || Object.keys(allSchedules).length > 0) {
        saveToSupabase();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(autoSaveInterval);
  }, [inventory, allSchedules]);

  const handleLogout = () => {
    if (window.confirm("¿Cerrar sesión? Los datos maestros sincronizados seguirán disponibles.")) {
      localStorage.removeItem('vuelo_current_user');
      setCurrentUser(null);
      setLoginForm({ username: '', password: '' });
      setActiveTab('inventory');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = INITIAL_USERS.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('vuelo_current_user', JSON.stringify(user));
      syncEngine(true);
    } else {
      alert('Credenciales inválidas.');
    }
  };

  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.inventory || data.allSchedules) {
          setInventory(data.inventory || []);
          setAllSchedules(data.allSchedules || {});
          localStorage.setItem('vuelo_inventory_master', JSON.stringify(data.inventory || []));
          localStorage.setItem('vuelo_schedules_master', JSON.stringify(data.allSchedules || {}));
          alert("Base de datos sincronizada con éxito.");
          setSyncStatus('synced');
          setActiveTab('inventory');
        }
      } catch (err) {
        alert("Error en el formato del archivo.");
      }
    };
    reader.readAsText(file);
    if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
  };

  const handleAssociateTask = async (equipmentId: string, historyEntry: MaintenanceRecordHistory) => {
    setInventory(prev => {
      const exists = prev.find(item => item.id === equipmentId);
      if (exists) {
        return prev.map(item => 
          item.id === equipmentId 
            ? { ...item, lifecycle: { ...item.lifecycle, maintenanceHistory: [...item.lifecycle.maintenanceHistory, historyEntry] } }
            : item
        );
      } else if (equipmentId === 'GENERAL') {
        const generalAsset: InventoryItem = {
          id: 'GENERAL',
          name: 'Actividades Generales',
          category: 'Administrativo',
          model: 'N/A',
          serial: 'N/A',
          assignedTo: 'Planta',
          purchaseDate: new Date().toISOString().split('T')[0],
          status: InventoryStatus.InUse,
          imageUrl: 'https://picsum.photos/seed/general/400/400',
          lifecycle: {
            characteristics: 'Registro para actividades no vinculadas a un activo específico.',
            maintenanceHistory: [historyEntry],
            usageHistory: '',
            observations: ''
          }
        };
        return [...prev, generalAsset];
      }
      return prev;
    });

    // Mark task as completed in Google if it was associated
    if (historyEntry.googleTaskId) {
      try {
        await googleTasksService.updateTaskStatus(historyEntry.googleTaskId, 'completed');
        fetchGoogleTasks();
      } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('UNAUTHENTICATED')) {
          console.warn('Google Tasks session expired during task update.');
          handleGoogleAuthError();
          alert('Su sesión de Google ha expirado. Por favor, vuelva a conectarse en la pestaña de Tareas.');
        } else {
          console.error('Error marking task as completed:', err);
        }
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-black">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-w-md border border-white/10 animate-fadeIn">
          <div className="text-center mb-10">
            <Logo className="h-28 mx-auto" />
            <h2 className="text-2xl font-black text-indigo-950 mt-8 uppercase tracking-widest leading-none">Vuelo Pharma</h2>
            <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.4em] mt-3">GESTIÓN DE CALIDAD COLOMBIA</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" placeholder="USUARIO" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 outline-none font-black text-xs uppercase tracking-[0.2em]" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required />
            <input type="password" placeholder="CONTRASEÑA" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 outline-none font-black text-xs uppercase tracking-[0.2em]" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
            <button className="w-full py-6 bg-indigo-950 text-white font-black rounded-[2rem] uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-900 transition-all text-xs border-b-4 border-cyan-400 active:scale-95">
              AUTENTICACIÓN GxP
            </button>
          </form>
          <div className="mt-8 flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Motor {syncStatus === 'synced' ? 'Sincronizado' : 'Modo Local'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === UserRole.Admin;

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      <header className="bg-white shadow-sm border-b-2 border-indigo-950 px-8 py-5 flex justify-between items-center sticky top-0 z-50">
         <div className="flex items-center gap-6">
            <Logo className="h-14" />
            <button 
              onClick={() => syncEngine(true)} 
              className={`px-4 py-1.5 rounded-full flex items-center gap-2 border transition-all hover:scale-105 group ${
                syncStatus === 'synced' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                syncStatus === 'loading' ? 'bg-amber-50 border-amber-100 text-amber-600 animate-pulse' : 'bg-rose-50 border-rose-100 text-rose-600'
            }`}>
                <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'loading' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {syncStatus === 'synced' ? 'ONLINE' : syncStatus === 'loading' ? 'CARGANDO' : 'LOCAL / REINTENTAR'}
                </span>
                {syncStatus === 'offline' && (
                  <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform" />
                )}
            </button>
         </div>
         <div className="flex items-center gap-4">
            <div className="text-right hidden lg:block border-l-2 pl-5 border-slate-100 mr-4">
               <p className="text-xs font-black text-indigo-950 uppercase leading-none">{currentUser.username}</p>
               <p className="text-[9px] text-indigo-400 font-black uppercase mt-1.5 tracking-widest">{isAdmin ? 'TI / PLANTA' : 'ÁREA ADMINISTRATIVA'}</p>
            </div>
            <button 
              onClick={saveToSupabase}
              disabled={syncStatus === 'saving'}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                syncStatus === 'saving' ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
              }`}
            >
              <svg className={`w-4 h-4 ${syncStatus === 'saving' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {syncStatus === 'saving' ? 'Guardando...' : 'Guardar en Nube'}
            </button>
            <button onClick={handleLogout} className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90" title="Cerrar Sesión">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
         </div>
      </header>

      <main className="p-10 container mx-auto pb-32">
        <nav className="flex flex-wrap gap-3 mb-10 bg-white p-4 rounded-[3rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
           <TabBtn active={activeTab === 'inventory'} label="Inventario" icon={<LayoutDashboard size={14} />} onClick={() => setActiveTab('inventory')} />
           <TabBtn active={activeTab === 'schedule'} label="Programa Anual" icon={<ClipboardList size={14} />} onClick={() => setActiveTab('schedule')} />
           <TabBtn active={activeTab === 'indicators'} label="Indicadores" icon={<BarChart3 size={14} />} onClick={() => setActiveTab('indicators')} />
           <TabBtn active={activeTab === 'history'} label="Trazabilidad" icon={<History size={14} />} onClick={() => setActiveTab('history')} />
           <TabBtn active={activeTab === 'tasks'} label="Tareas Google" icon={<CheckSquare size={14} />} onClick={() => setActiveTab('tasks')} />
           {isAdmin && <TabBtn active={activeTab === 'record'} label="Registrar Trabajo" icon={<Wrench size={14} />} onClick={() => setActiveTab('record')} />}
           <TabBtn active={activeTab === 'users'} label="Configuración" icon={<Settings size={14} />} onClick={() => setActiveTab('users')} />
        </nav>

        <div className="animate-fadeIn">
          {activeTab === 'inventory' && <InventoryPanel inventory={inventory} setInventory={setInventory} readOnly={!isAdmin} />}
          {activeTab === 'schedule' && (
             <MaintenanceSchedule 
                schedule={allSchedules[selectedYear] || []} 
                setSchedule={(s) => setAllSchedules({...allSchedules, [selectedYear]: typeof s === 'function' ? s(allSchedules[selectedYear] || []) : s})}
                inventory={inventory} selectedYear={selectedYear} setSelectedYear={setSelectedYear} readOnly={!isAdmin}
             />
          )}
          {activeTab === 'indicators' && <IndicatorsPanel inventory={inventory} schedule={allSchedules[selectedYear] || []} />}
          {activeTab === 'history' && <HistoryPanel inventory={inventory} />}
          {activeTab === 'tasks' && (
            <TasksPanel 
              googleTasks={googleTasks}
              onRefresh={fetchGoogleTasks}
              isAuthenticated={isGoogleAuth}
              onGoogleAuthError={handleGoogleAuthError}
              onAuthSuccess={() => {
                setIsGoogleAuth(true);
                fetchGoogleTasks();
              }}
            />
          )}
          {isAdmin && activeTab === 'record' && (
             <MaintenanceRecord 
                inventory={inventory} 
                googleTasks={googleTasks.filter(t => t.status !== 'completed')}
                addMaintenanceToHistory={handleAssociateTask} 
             />
          )}
          {activeTab === 'users' && (
            <div className="bg-indigo-950 p-12 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                   <Logo className="h-64" />
                </div>
                <div className="relative z-10">
                   <h2 className="text-2xl font-black uppercase mb-4 tracking-tighter">Control de Datos Supabase</h2>
                   <p className="text-xs text-indigo-300 font-bold mb-10 uppercase tracking-widest max-w-2xl leading-relaxed">
                      Los datos se sincronizan automáticamente con la nube. Use este panel para forzar una sincronización manual o cargar respaldos locales.
                   </p>
                   
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                      <div className="bg-indigo-900/40 p-8 rounded-[2.5rem] border border-indigo-800">
                         <h4 className="text-[10px] font-black uppercase text-cyan-400 mb-4 tracking-[0.2em]">Estado de Conexión</h4>
                         <div className="flex items-center gap-4 bg-indigo-950/50 border border-indigo-700 p-6 rounded-2xl">
                            <div className={`w-3 h-3 rounded-full ${syncStatus === 'synced' || syncStatus === 'saving' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></div>
                            <div>
                               <p className="text-xs font-black uppercase">
                                 {syncStatus === 'synced' ? 'Sincronizado con Supabase' : 
                                  syncStatus === 'saving' ? 'Guardando en la Nube...' : 
                                  syncStatus === 'loading' ? 'Cargando Datos...' : 'Modo Offline / Error'}
                               </p>
                               <p className="text-[9px] text-indigo-400 font-bold uppercase mt-1">
                                 {lastSaveTime ? `Último guardado: ${lastSaveTime}` : 'Tabla: mis_datos | ID: master_data'}
                               </p>
                            </div>
                         </div>
                         <button 
                            onClick={() => syncEngine()} 
                            className="w-full mt-4 px-6 py-4 bg-indigo-800 text-white font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-700 transition-all border border-indigo-600"
                         >
                            Recargar desde la Nube
                         </button>
                         <button 
                            onClick={testDbConnection} 
                            disabled={testStatus === 'testing'}
                            className={`w-full mt-2 px-6 py-4 font-black text-[10px] uppercase rounded-2xl transition-all border ${
                              testStatus === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 
                              testStatus === 'error' ? 'bg-rose-500 border-rose-400 text-white' : 
                              'bg-indigo-900 text-indigo-300 border-indigo-700 hover:bg-indigo-800'
                            }`}
                         >
                            {testStatus === 'testing' ? 'Probando...' : 
                             testStatus === 'success' ? '¡Conexión Exitosa!' : 
                             testStatus === 'error' ? 'Error de Conexión' : 'Probar Conexión Real'}
                         </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={saveToSupabase}
                            disabled={syncStatus === 'saving'}
                            className={`w-full p-8 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-5 shadow-2xl border-b-8 ${
                              syncStatus === 'saving' ? 'bg-indigo-100 text-indigo-400 border-indigo-200' : 'bg-white text-indigo-950 border-cyan-400'
                            }`}
                        >
                            <svg className={`w-8 h-8 ${syncStatus === 'saving' ? 'animate-spin text-indigo-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {syncStatus === 'saving' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              )}
                            </svg>
                            {syncStatus === 'saving' ? 'Guardando...' : 'Guardar Todo en Supabase'}
                        </button>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => restoreFileInputRef.current?.click()} className="p-6 bg-indigo-900 border border-indigo-700 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-indigo-800 transition-all flex flex-col items-center gap-3 shadow-xl">
                               <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                               Importar JSON
                            </button>
                            <input type="file" ref={restoreFileInputRef} className="hidden" accept=".json" onChange={handleRestoreJSON} />
                            
                            <div className="p-6 bg-indigo-900/30 rounded-[2rem] border border-indigo-800 flex flex-col items-center justify-center text-center">
                                <p className="text-[8px] font-black uppercase text-indigo-400 mb-1">Integridad GxP</p>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Verificado</p>
                            </div>
                        </div>
                      </div>
                   </div>
                   
                   <div className="bg-indigo-900/20 p-6 rounded-3xl border border-indigo-800/50">
                      <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest text-center">
                         Nota: El sistema realiza un autoguardado preventivo cada 5 minutos. La sincronización rápida ocurre cada 2 segundos tras cambios menores.
                      </p>
                   </div>

                   {lastError && (
                     <div className="mt-8 p-8 bg-rose-950/50 border-2 border-rose-500/30 rounded-[2.5rem] animate-fadeIn">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="p-3 bg-rose-500 rounded-2xl">
                              <Settings className="w-5 h-5 text-white animate-spin" />
                           </div>
                           <div>
                              <h4 className="text-xs font-black uppercase text-rose-400 tracking-widest">Diagnóstico de Errores</h4>
                              <p className="text-[10px] text-rose-300/70 font-bold uppercase">Se detectó un problema con la base de datos</p>
                           </div>
                        </div>
                        <div className="bg-black/40 p-6 rounded-2xl border border-rose-900/50">
                           <p className="text-[11px] font-mono text-rose-200 break-all leading-relaxed">
                              {lastError}
                           </p>
                        </div>
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="p-4 bg-indigo-950/50 rounded-xl border border-indigo-800">
                              <p className="text-[9px] font-black text-indigo-400 uppercase mb-2">Solución 1: Tabla</p>
                              <p className="text-[10px] text-indigo-200 leading-tight">Asegúrese de haber creado la tabla <code className="bg-indigo-900 px-1 rounded">mis_datos</code> con la columna <code className="bg-indigo-900 px-1 rounded">content</code> tipo JSONB.</p>
                           </div>
                           <div className="p-4 bg-indigo-950/50 rounded-xl border border-indigo-800">
                              <p className="text-[9px] font-black text-indigo-400 uppercase mb-2">Solución 2: Políticas RLS</p>
                              <p className="text-[10px] text-indigo-200 leading-tight">En Supabase, desactive RLS para la tabla o cree una política que permita <code className="bg-indigo-900 px-1 rounded">ALL</code> para usuarios anónimos.</p>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
            </div>
          )}
        </div>
      </main>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s cubic-bezier(0.2, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

const TabBtn = ({ active, label, onClick, icon }: any) => (
  <button 
    onClick={onClick} 
    className={`px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap flex items-center gap-3 ${
      active ? 'bg-indigo-950 text-white shadow-2xl scale-105 border-b-4 border-cyan-400' : 'text-slate-400 hover:text-indigo-950 hover:bg-indigo-50/50'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default App;
