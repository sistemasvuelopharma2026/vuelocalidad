import React, { useState, useEffect } from 'react';
import { googleTasksService } from '../services/googleTasks';
import { GoogleTask, InventoryItem, MaintenanceRecordHistory } from '../types';
import { CheckCircle2, Circle, Clock, ExternalLink, PlusCircle, RefreshCw } from 'lucide-react';

interface TasksPanelProps {
  googleTasks: GoogleTask[];
  onRefresh: () => void;
  isAuthenticated: boolean;
  onAuthSuccess: () => void;
  onGoogleAuthError?: () => void;
}

const TasksPanel: React.FC<TasksPanelProps> = ({ googleTasks, onRefresh, isAuthenticated, onAuthSuccess, onGoogleAuthError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ clientIdPrefix: string; hasSecret: boolean; redirectUri: string } | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      await onRefresh();
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('UNAUTHENTICATED')) {
        // Silently handled by onGoogleAuthError or fetchGoogleTasks
      } else {
        setError('Error al actualizar tareas');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }

      const urlObj = new URL(data.url);
      const clientId = urlObj.searchParams.get('client_id');
      const redirectUri = urlObj.searchParams.get('redirect_uri');
      setDebugInfo({
        clientIdPrefix: clientId ? clientId.substring(0, 15) + '...' : 'No encontrado',
        hasSecret: true,
        redirectUri: redirectUri || 'No encontrada'
      });
      
      const popup = window.open(data.url, 'google_auth', 'width=600,height=700');
      
      if (!popup) {
        alert('Por favor, permita las ventanas emergentes para autenticarse con Google.');
      }
    } catch (err) {
      console.error('Error getting auth URL:', err);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { tokens } = event.data;
        console.log('Google Auth Success - Tokens received');
        googleTasksService.setAccessToken(tokens.access_token);
        localStorage.setItem('google_tasks_token', tokens.access_token);
        onAuthSuccess();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAuthSuccess]);

  const toggleTaskStatus = async (task: GoogleTask) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    try {
      await googleTasksService.updateTaskStatus(task.id, newStatus);
      onRefresh();
    } catch (err: any) {
      console.error('Error updating task status:', err);
      if (err.message?.includes('401') || err.message?.includes('UNAUTHENTICATED')) {
        onGoogleAuthError?.();
      } else {
        alert('Error al actualizar el estado de la tarea.');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 text-center animate-fadeIn">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black text-indigo-900 mb-4 uppercase">Google Tasks Integration</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Conecte su cuenta <span className="font-bold text-indigo-600">sistemas@vuelopharmacol.com.co</span> para centralizar sus tareas de mantenimiento y asociarlas directamente a sus activos.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-indigo-950 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl hover:bg-indigo-900 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-5 h-5" alt="Google" />
            Conectar con Google Tasks
          </button>

          {debugInfo && (
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Depurador de Conexión</p>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-600 font-bold">ID Cliente detectado: <span className="text-indigo-600 font-mono">{debugInfo.clientIdPrefix}</span></p>
                <p className="text-[10px] text-slate-600 font-bold">Secreto configurado: <span className="text-emerald-600">SÍ</span></p>
                <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">URL de Redirección Exacta:</p>
                  <p className="text-[10px] text-indigo-700 font-mono break-all select-all">{debugInfo.redirectUri}</p>
                </div>
                <p className="text-[9px] text-slate-400 mt-2 leading-tight italic">
                  * Copie la URL azul de arriba y péguela en su Consola de Google Cloud bajo "URIs de redireccionamiento autorizados".
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-indigo-900 uppercase">Mis Tareas de Google</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-1">Gestión Centralizada de Actividades</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchTasks}
            disabled={loading}
            className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all disabled:opacity-50"
            title="Actualizar Tareas"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => onGoogleAuthError?.()}
            className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
            title="Cerrar Sesión de Google"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold mb-6 border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {googleTasks.length === 0 && !loading ? (
          <div className="col-span-2 py-20 text-center text-gray-300 font-bold uppercase italic border-2 border-dashed border-gray-100 rounded-[2rem]">
            No se encontraron tareas pendientes en su cuenta.
          </div>
        ) : (
          googleTasks.map(task => (
            <div key={task.id} className={`p-6 rounded-[2rem] border transition-all ${task.status === 'completed' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-indigo-50 shadow-sm hover:shadow-md'}`}>
              <div className="flex items-start gap-4">
                <button onClick={() => toggleTaskStatus(task)} className="mt-1">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300 hover:text-indigo-500 transition-colors" />
                  )}
                </button>
                <div className="flex-grow">
                  <h3 className={`font-black text-indigo-950 uppercase tracking-tight ${task.status === 'completed' ? 'line-through' : ''}`}>
                    {task.title}
                  </h3>
                  {task.notes && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 italic">
                      {task.notes}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {task.due && (
                      <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-amber-100">
                        Vence: {new Date(task.due).toLocaleDateString()}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-indigo-100">
                      Google Tasks
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TasksPanel;
