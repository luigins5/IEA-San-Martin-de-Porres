
export enum UserRole {
  SUPER_ADMIN = 'Super Administrador',
  CAMPUS_ADMIN = 'Administrador de Sede',
  TEACHER = 'Profesor',
  STUDENT = 'Estudiante',
  PARENT = 'Padre',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  campusId?: string; 
  campusName?: string;
  avatar: string;
}

export interface AdminUser extends User {
    campusName: string;
    status: 'active' | 'inactive';
}

export interface Student extends User {
    class: string;
    section: string;
    rollNumber: string;
    schoolPeriod: 'A' | 'B';
    schoolYear: number;
    status: 'active' | 'inactive';
    documentNumber: string;
    phone?: string;
    address?: string;
    observation?: string;
    fatherName?: string;
    fatherPhone?: string;
    motherName?: string;
    motherPhone?: string;
}

export type ProfessionalProfile = 'Profesional' | 'Especialista' | 'Magister' | 'Doctor';

export interface Teacher extends User {
  documentNumber: string;
  subject: string;
  secondarySubject?: string;
  phone: string;
  status: 'active' | 'inactive';
  address?: string;
  observation?: string;
  professionalProfile?: ProfessionalProfile;
}

export interface TeacherCourseAssignment {
  id: string;
  teacherId: string;
  subject: string;
  class: string;
  section: string;
  jornada?: 'Diurno' | 'Tarde' | 'Nocturno' | 'Fin de semana';
  intensidadHoraria?: number;
  schedule?: { day: string; hours: number }[];
}

export interface Campus {
  id: string;
  name: string;
  address: string;
  admin: string;
  teachers: number;
  students: number;
}

export interface Grade {
    id: string;
    studentId: string;
    subject: string;
    class: string;
    assignmentTitle: string;
    score: number;
    percentage: number;
    date: string;
    comments?: string;
    conceptCode?: string;
}

export interface AttendanceRecord {
    id: string;
    studentId: string;
    date: string;
    status: 'Presente' | 'Ausente' | 'Justificado';
    count?: number;
    period: number;
}

export interface Observation {
    id: string;
    studentId: string;
    date: string;
    text: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Communication {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  campusId?: string;
  campusName?: string;
  date: string;
  targetRoles?: UserRole[];
  authorId?: string;
}

export interface ClassSchedule {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  class: string;
  section: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  campusId?: string;
  description?: string;
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
}

export interface Exam {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  schoolYear: number;
  schoolPeriod: string;
  maxScore: number;
  status: 'Programado' | 'Completado' | 'Cancelado';
  campusId?: string;
  teacherId?: string;
  subject?: string;
  class?: string;
  time?: string;
}
