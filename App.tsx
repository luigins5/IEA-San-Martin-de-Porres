
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './components/auth/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import { DataProvider, useData } from './context/DataContext';
import { UserRole } from './types';
import { ExclamationTriangleIcon, LogoutIcon } from './components/icons';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import ErrorBoundary from './components/ErrorBoundary';

const MaintenanceView: React.FC<{ logout: () => void }> = ({ logout }) => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 dark:border-slate-800 text-center animate-fade-in-up">
            <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-rose-50/50 dark:ring-rose-900/10">
                <ExclamationTriangleIcon className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-4 tracking-tight">Sistema en Pausa</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                Estamos realizando mejoras técnicas en la plataforma para brindarte una mejor experiencia. Por favor, intenta ingresar más tarde.
            </p>
            <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</p>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1">Mantenimiento Programado</p>
                </div>
                <button 
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all shadow-lg text-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                    <LogoutIcon className="w-5 h-5" />
                    Regresar al Inicio
                </button>
            </div>
        </div>
    </div>
);

const AppContent: React.FC = () => {
    const { isAuthenticated, user, logout, isLoading: isAuthLoading } = useAuth();
    const { isLoading: isDataLoading, globalSettings } = useData();

    // Activar el temporizador de inactividad (cierra sesión tras 30 min sin actividad)
    useInactivityTimeout();

    if (isAuthLoading || (isDataLoading && isAuthenticated)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background dark:bg-slate-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary"></div>
                    <h2 className="mt-4 text-xl font-semibold text-text-primary dark:text-slate-200">
                        {isAuthLoading ? 'Verificando sesión...' : 'Cargando Datos...'}
                    </h2>
                    <p className="text-text-secondary dark:text-slate-400">
                        {isAuthLoading ? 'Asegurando tu conexión.' : 'Obteniendo la información más reciente.'}
                    </p>
                </div>
            </div>
        );
    }

    // Check for maintenance mode
    const isMaintenance = globalSettings ? globalSettings.maintenanceMode : false;
    
    // Admins are bypass maintenance mode
    const isRestrictedUser = user && ![UserRole.SUPER_ADMIN, UserRole.CAMPUS_ADMIN].includes(user.role);

    if (isAuthenticated && isMaintenance && isRestrictedUser) {
        return <MaintenanceView logout={logout} />;
    }
    
    return (
        <>
            {isAuthenticated ? <DashboardLayout /> : <LoginPage />}
        </>
    );
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
