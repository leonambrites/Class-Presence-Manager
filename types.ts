
export enum StudentType {
  Membro = 'Membro',
  Visitante = 'Visitante',
}

export interface Attendance {
  date: string;
  present: boolean;
  dismissedBy?: string | null;
}

export interface Student {
  id: string;
  name: string;
  class: string;
  age: number;
  motherName: string;
  phone: string;
  type: StudentType;
  attendance: Attendance[];
}

export interface Volunteer {
  id: string;
  name: string;
}

export interface ScheduleEntry {
  date: string;
  className: string;
  supervisorId: string | null;
  ministerIds: string[];
  deskId: string | null;
  coordinatorId: string | null;
}

export interface Topic {
  date: string;
  title: string;
  description: string;
}

export enum View {
  Dashboard = 'Dashboard',
  Attendance = 'Presença',
  Students = 'Alunos',
  Schedule = 'Escala',
  Topics = 'Assuntos',
  Dismissal = 'Saída',
}