
import { UserRole } from '../types';

export enum Action {
  // Super Admin Actions
  MANAGE_CAMPUSES = 'manage:campuses',
  MANAGE_ADMINS = 'manage:admins',
  VIEW_GLOBAL_SETTINGS = 'view:global_settings',

  // Campus Admin Actions
  MANAGE_STUDENTS = 'manage:students',
  MANAGE_TEACHERS = 'manage:teachers',
  MANAGE_EXAMS = 'manage:exams',
  MANAGE_LIBRARY = 'manage:library',
  MANAGE_TRANSPORT = 'manage:transport',
  VIEW_CAMPUS_SETTINGS = 'view:campus_settings',
  MANAGE_COMMUNICATIONS = 'manage:communications',

  // Teacher Actions
  MANAGE_GRADES = 'manage:grades',
  MANAGE_CLASS_LOG = 'manage:class_log',
  VIEW_SCHEDULE = 'view:schedule',
  VIEW_TEACHER_EXAMS = 'view:teacher_exams',
  MANAGE_TEACHER_EXAMS = 'manage:teacher_exams',
  VIEW_RANKING = 'view:ranking',

  // Student Actions
  VIEW_OWN_GRADES = 'view:own_grades',
  VIEW_OWN_SCHEDULE = 'view:own_schedule',
  VIEW_OWN_PROFILE = 'view:own_profile',
  
  // Parent Actions
  VIEW_CHILD_GRADES = 'view:child_grades',
  VIEW_CHILD_SCHEDULE = 'view:child_schedule',
  VIEW_CHILD_PROFILE = 'view:child_profile',

  // Common Actions
  VIEW_DASHBOARD = 'view:dashboard',
  VIEW_REPORTS = 'view:reports',
}

const rolePermissions: { [key in UserRole]: Action[] } = {
  [UserRole.SUPER_ADMIN]: [
    Action.VIEW_DASHBOARD,
    Action.MANAGE_CAMPUSES,
    Action.MANAGE_ADMINS,
    Action.MANAGE_TEACHERS,
    Action.VIEW_GLOBAL_SETTINGS,
    Action.MANAGE_COMMUNICATIONS,
    Action.MANAGE_STUDENTS,
    Action.VIEW_REPORTS,
    Action.VIEW_RANKING,
  ],
  [UserRole.CAMPUS_ADMIN]: [
    Action.VIEW_DASHBOARD,
    Action.MANAGE_STUDENTS,
    Action.MANAGE_TEACHERS,
    Action.MANAGE_EXAMS,
    Action.VIEW_CAMPUS_SETTINGS,
    Action.MANAGE_COMMUNICATIONS,
    Action.VIEW_REPORTS,
    Action.MANAGE_CLASS_LOG,
    Action.VIEW_RANKING,
  ],
  [UserRole.TEACHER]: [
    Action.VIEW_DASHBOARD,
    Action.VIEW_TEACHER_EXAMS,
    Action.MANAGE_TEACHER_EXAMS,
    Action.MANAGE_GRADES,
    Action.MANAGE_CLASS_LOG,
    Action.VIEW_SCHEDULE,
    Action.VIEW_RANKING,
    Action.MANAGE_COMMUNICATIONS,
  ],
  [UserRole.STUDENT]: [
    Action.VIEW_DASHBOARD,
    Action.VIEW_OWN_GRADES,
    Action.VIEW_OWN_SCHEDULE,
    Action.VIEW_OWN_PROFILE,
    Action.VIEW_RANKING,
  ],
  [UserRole.PARENT]: [
    Action.VIEW_DASHBOARD,
    Action.VIEW_CHILD_GRADES,
    Action.VIEW_CHILD_SCHEDULE,
    Action.VIEW_CHILD_PROFILE,
    Action.VIEW_RANKING,
  ],
};

export const hasPermission = (role: UserRole, action: Action): boolean => {
  return rolePermissions[role]?.includes(action) || false;
};
