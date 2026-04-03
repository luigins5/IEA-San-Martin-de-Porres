
import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import DashboardPage from '../dashboard/DashboardPage';
import StudentManagementPage from '../students/StudentManagementPage';
import CampusManagementPage from '../campuses/CampusManagementPage';
import AdminManagementPage from '../admins/AdminManagementPage';
import TeacherManagementPage from '../teachers/TeacherManagementPage';
import GradesPage from '../teachers/GradesPage';
import CommunicationsPage from '../communications/CommunicationsPage';
import SchedulePage from '../teachers/SchedulePage';
import { useAuth } from '../../context/AuthContext';
import { Action, hasPermission } from '../../utils/permissions';
import LoginPage from '../auth/LoginPage';
import GlobalSettingsPage from '../settings/GlobalSettingsPage';
import ExamsManagementPage from '../exams/ExamsManagementPage';
import TeacherExamsPage from '../teachers/ExamsPage';
import StudentGradesPage from '../students/StudentGradesPage';
import StudentSchedulePage from '../students/StudentSchedulePage';
import StudentProfilePage from '../students/StudentProfilePage';
import ParentGradesPage from '../parents/ParentGradesPage';
import ParentSchedulePage from '../parents/ParentSchedulePage';
import ParentProfilePage from '../parents/ParentProfilePage';
import ReportsPage from '../reports/ReportsPage';
import ClassAnnotationsPage from '../teachers/ClassAnnotationsPage';
import RankingPage from '../teachers/RankingPage';
import Footer from './Footer';

const PlaceholderPage: React.FC<{title: string}> = ({title}) => (
    <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 dark:bg-slate-800/80 dark:border-slate-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-300">{title}</h1>
        <p className="mt-2 text-text-secondary text-sm">Este módulo está en construcción. Vuelve pronto para ver las actualizaciones.</p>
    </div>
);

const AccessDeniedPage: React.FC = () => (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-red-100 text-center dark:bg-slate-800 dark:border-red-900/30">
        <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
        <p className="mt-2 text-text-secondary text-sm">No tiene los permisos necesarios para ver esta página.</p>
    </div>
);

const pagePermissions: { [key: string]: Action } = {
  dashboard: Action.VIEW_DASHBOARD,
  campuses: Action.MANAGE_CAMPUSES,
  admins: Action.MANAGE_ADMINS,
  settings: Action.VIEW_GLOBAL_SETTINGS,
  students: Action.MANAGE_STUDENTS,
  teachers: Action.MANAGE_TEACHERS,
  exams: Action.MANAGE_EXAMS,
  library: Action.MANAGE_LIBRARY,
  transport: Action.MANAGE_TRANSPORT,
  'campus-settings': Action.VIEW_CAMPUS_SETTINGS,
  communications: Action.MANAGE_COMMUNICATIONS,
  // Teacher
  'teacher-exams': Action.VIEW_TEACHER_EXAMS,
  grades: Action.MANAGE_GRADES,
  schedule: Action.VIEW_SCHEDULE,
  'class-annotations': Action.MANAGE_CLASS_LOG,
  ranking: Action.VIEW_RANKING,
  // Student
  'student-grades': Action.VIEW_OWN_GRADES,
  'student-schedule': Action.VIEW_OWN_SCHEDULE,
  'student-profile': Action.VIEW_OWN_PROFILE,
  // Parent
  'parent-grades': Action.VIEW_CHILD_GRADES,
  'parent-schedule': Action.VIEW_CHILD_SCHEDULE,
  'parent-profile': Action.VIEW_CHILD_PROFILE,
  // Reports
  'reports': Action.VIEW_REPORTS,
};


const DashboardLayout: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const renderCurrentPage = () => {
    if (!user) return <LoginPage />; // Should not happen if layout is rendered, but for safety.

    const requiredPermission = pagePermissions[currentPage];
    if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
        return <AccessDeniedPage />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage setCurrentPage={setCurrentPage} />;
      case 'students':
        return <StudentManagementPage />;
      case 'teachers':
        return <TeacherManagementPage />;
      case 'exams':
        return <ExamsManagementPage />;
       case 'teacher-exams':
        return <TeacherExamsPage />;
      case 'campuses':
        return <CampusManagementPage />;
      case 'admins':
        return <AdminManagementPage />;
      case 'settings':
        return <GlobalSettingsPage />;
      case 'grades':
        return <GradesPage />;
      case 'communications':
        return <CommunicationsPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'class-annotations':
        return <ClassAnnotationsPage />;
      case 'ranking':
        return <RankingPage />;
      case 'campus-settings':
        return <GlobalSettingsPage />;
      case 'student-grades':
        return <StudentGradesPage />;
      case 'student-schedule':
        return <StudentSchedulePage />;
      case 'student-profile':
        return <StudentProfilePage />;
      case 'parent-grades':
        return <ParentGradesPage />;
      case 'parent-schedule':
        return <ParentSchedulePage />;
      case 'parent-profile':
        return <ParentProfilePage />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <PlaceholderPage title={currentPage.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />;
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when changing page on mobile/desktop since it's a drawer now
  const handlePageChange = (page: string) => {
      setCurrentPage(page);
      setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 relative overflow-hidden text-text-primary dark:text-slate-200">
      {/* Backdrop Overlay */}
      {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 z-40 transition-opacity duration-300 backdrop-blur-sm" 
            onClick={toggleSidebar}
          ></div>
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out shadow-2xl`}>
         <Sidebar currentPage={currentPage} setCurrentPage={handlePageChange} isOpen={true} />
      </div>

      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 scroll-smooth">
          <div className="w-full px-2 sm:px-4 max-w-8xl mx-auto">
            {renderCurrentPage()}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default DashboardLayout;
