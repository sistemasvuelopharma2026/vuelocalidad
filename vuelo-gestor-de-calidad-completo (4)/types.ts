
export enum MaintenanceStatus {
  Planned = 'P',
  Realized = 'R',
  None = 'N'
}

export interface MonthlyStatus {
  [month: string]: MaintenanceStatus;
}

export interface ScheduleEntry {
  id: number;
  equipo: string;
  modelo: string;
  actividad: string;
  respMantenimiento: string;
  respEquipo: string;
  frecuencia: string;
  status: MonthlyStatus;
}

export enum InventoryStatus {
  InUse = 'En Uso',
  InStorage = 'En Almacén',
  UnderMaintenance = 'En Mantenimiento',
  Decommissioned = 'De Baja'
}

export interface MaintenanceRecordHistory {
  id: string;
  date: string;
  elaboratedDate?: string;
  type: 'Preventivo' | 'Correctivo' | 'Mejora' | 'Actividad';
  description: string;
  technician: string;
  technicianId?: string;
  details?: string;
  observations?: string;
  photo?: string;
  googleTaskId?: string; // Associated Google Task ID
}

export interface ExtendedMaintenanceRecord extends MaintenanceRecordHistory {
  equipmentName: string;
  equipmentId: string;
}

export interface LifecycleData {
  characteristics: string;
  maintenanceHistory: MaintenanceRecordHistory[];
  usageHistory: string;
  observations: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  isNonTech?: boolean; // New flag for non-tech assets
  model: string;
  serial: string;
  assignedTo: string;
  purchaseDate: string;
  status: InventoryStatus;
  imageUrl: string;
  lifecycle: LifecycleData;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated: string;
}

export enum UserRole {
  Admin = 'ADMIN',
  Viewer = 'VIEWER'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
}
