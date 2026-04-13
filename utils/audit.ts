import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  OTHER = 'OTHER'
}

export interface AuditLog {
  id?: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  details: string;
  timestamp: string;
}

export const logAuditAction = async (user: User | null, action: AuditAction, details: string) => {
  if (!user) return;
  try {
    const log: AuditLog = {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, 'audit_logs'), log);
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
};
