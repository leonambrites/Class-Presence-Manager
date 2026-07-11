
export enum StudentType {
  Membro = 'Membro',
  Visitante = 'Visitante',
}

export interface Attendance {
  date: string;
  present: boolean;
  dismissedBy?: string | null;
  day?: 'Sunday' | 'Wednesday';
  dailyCode?: number | null;
  readyToLeave?: boolean;
}

export interface Student {
  id: string;
  name: string;
  class: string;
  age: number;
  guardianName: string;
  phone: string;
  type: StudentType;
  birthday?: string;
  attendance: Attendance[];
  hasAllergy?: boolean;
  allergyDescription?: string;
  motherName?: string;
  fatherName?: string;
  hasOtherGuardian?: boolean;
  otherGuardianName?: string;
  otherGuardianRelationship?: string;
  photo?: string;
  imageUseAllowed?: boolean;
  imageUseDocument?: string;
  familyId?: string;
}

export interface Volunteer {
  id: string;
  name: string;
  class?: string;
  phone?: string;
  type?: string;
  team?: string;
  photo?: string;
  email?: string;
}

export interface ScheduleEntry {
  id: string;
  date: string;
  className: string;
  team?: string;
  supervisorId?: string | null;
  ministerIds?: string[];
  deskId?: string | null;
  coordinatorId?: string | null;
  escadaId?: string | null;
  corredorId?: string | null;
}

export interface Topic {
  id?: string;
  date: string;
  title: string;
  description: string;
}

export enum View {
  Home = 'Home',
  Attendance = 'Presença',
  Students = 'Alunos',
  Schedule = 'Escala',
  Volunteers = 'Voluntários',
  Topics = 'Assuntos',
  Reports = 'Relatórios',
  Admin = 'Acessos',
}

export interface ClerkUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  classroom?: string | null;
  active?: boolean;
}

export type UserRole = 'Pastor' | 'Coordenadora' | 'Supervisora' | 'Ministra' | 'Visitante';
