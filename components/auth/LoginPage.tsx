
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { UserRole } from '../../types';
import Card from '../ui/Card';
import { EyeIcon, EyeSlashIcon } from '../icons';
import Footer from '../layout/Footer';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.SUPER_ADMIN);
  const { login, loginWithGoogle, sendPasswordReset } = useAuth();
  const { globalSettings } = useData();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [schoolName, setSchoolName] = useState('Gestión Escolar');
  const [schoolLogo, setSchoolLogo] = useState<string>('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHBsMGdhaWJpamQ0OGxuYm85N2pyZ2F3YWdycjR2Ymtza2s2dzJhYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/m7t3XLkAB0fX7WEFs0/giphy.gif');

  useEffect(() => {
      if (globalSettings) {
          if (globalSettings.schoolName) setSchoolName(globalSettings.schoolName);
          if (globalSettings.schoolLogo) setSchoolLogo(globalSettings.schoolLogo);
      }
  }, [globalSettings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, ingrese el correo electrónico y la contraseña.');
      return;
    }
    setError('');

    const isMaintenance = globalSettings ? globalSettings.maintenanceMode : false;
    const isRestrictedRole = ![UserRole.SUPER_ADMIN, UserRole.CAMPUS_ADMIN].includes(role);

    if (isMaintenance && isRestrictedRole) {
        setError('El sistema se encuentra temporalmente fuera de servicio por mantenimiento.');
        return;
    }
    
    try {
        await login(email, password, role);
    } catch (err: any) {
        setError(err.message || 'Ocurrió un error al iniciar sesión.');
    }
  };

    const [resetMessage, setResetMessage] = useState('');
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [showNewTabButton, setShowNewTabButton] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail) {
            setError('Por favor, ingrese su correo electrónico para restablecer la contraseña.');
            return;
        }
        setError('');
        setResetMessage('');
        setIsResetting(true);
        setShowNewTabButton(false);
        try {
            await sendPasswordReset(resetEmail.trim());
            setResetMessage('Se ha enviado un enlace de restablecimiento a su correo electrónico. Por favor, revise su bandeja de entrada o carpeta de spam.');
            setTimeout(() => {
                setIsResetModalOpen(false);
                setResetMessage('');
                setResetEmail('');
            }, 5000);
        } catch (err: any) {
            if (err.message.includes('network-request-failed') || err.message.includes('Error de conexión')) {
                setError('Error de red. Debido a restricciones de seguridad del navegador en esta vista previa, no se puede enviar el correo. Por favor, abra la aplicación en una nueva pestaña.');
                setShowNewTabButton(true);
            } else {
                setError(err.message || 'Error al solicitar el restablecimiento de contraseña.');
            }
        } finally {
            setIsResetting(false);
        }
    };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative">
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="text-center mb-8">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 inline-flex items-center justify-center mb-6 dark:bg-slate-800 dark:border-slate-700">
                <img 
                    src={schoolLogo} 
                    alt="School Logo" 
                    className="w-20 h-20 object-contain" 
                />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{schoolName}</h1>
              <p className="text-slate-500 text-sm mt-2 dark:text-slate-400 font-medium tracking-wide uppercase">Portal Académico</p>
          </div>
          <Card className="shadow-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden">
            <form onSubmit={handleLogin} className="p-2">
              {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm font-medium border border-red-100 flex items-center gap-2">
                      <span className="block w-2 h-2 bg-red-500 rounded-full"></span>
                      {error}
                  </div>
              )}
              {resetMessage && (
                  <div className="bg-green-50 text-green-600 p-3 rounded-xl mb-6 text-sm font-medium border border-green-100 flex items-center gap-2">
                      <span className="block w-2 h-2 bg-green-500 rounded-full"></span>
                      {resetMessage}
                  </div>
              )}
              <div className="mb-5">
                <label className="block text-slate-700 text-xs font-bold mb-2 uppercase tracking-wider dark:text-slate-300" htmlFor="email">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="appearance-none border border-slate-200 rounded-xl w-full py-3 px-4 text-sm text-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white placeholder-slate-400"
                  placeholder="ejemplo@correo.com"
                />
              </div>
              <div className="mb-5 relative">
                <label className="block text-slate-700 text-xs font-bold mb-2 uppercase tracking-wider dark:text-slate-300" htmlFor="password">
                  Contraseña
                </label>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="appearance-none border border-slate-200 rounded-xl w-full py-3 px-4 text-sm text-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white placeholder-slate-400 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 top-6 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="mb-8">
                <label className="block text-slate-700 text-xs font-bold mb-2 uppercase tracking-wider dark:text-slate-300" htmlFor="role">
                  Rol de Usuario
                </label>
                <div className="relative">
                    <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="appearance-none border border-slate-200 rounded-xl w-full py-3 px-4 text-sm text-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
                    >
                    {Object.values(UserRole).map((r) => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <button
                  className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 hover:bg-primary/90 transition-all duration-200 text-sm shadow-sm"
                  type="submit"
                >
                  Ingresar al Sistema
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setError('');
                    try {
                      await loginWithGoogle(role);
                    } catch (err: any) {
                      setError(err.message || 'Error al iniciar sesión con Google.');
                    }
                  }}
                  className="w-full flex items-center justify-center py-3 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:border-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Iniciar sesión con Google
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setIsResetModalOpen(true); setResetEmail(email); setError(''); setResetMessage(''); }}
                  className="w-full text-primary font-medium py-2 px-4 rounded-xl hover:bg-primary/5 transition-all duration-200 text-sm"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
          </Card>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md dark:bg-slate-900 dark:border dark:border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Restablecer Contraseña</h2>
                <button onClick={() => setIsResetModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center text-xl leading-none dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:text-white transition-colors">
                    &times;
                </button>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-5">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Ingrese su correo electrónico y le enviaremos un enlace para restablecer su contraseña.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium border border-red-100 flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                            <span className="block w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{error}</span>
                        </div>
                        {showNewTabButton && (
                            <button
                                type="button"
                                onClick={() => window.open(window.location.href, '_blank')}
                                className="mt-2 text-xs font-bold bg-red-100 hover:bg-red-200 text-red-700 py-2 px-3 rounded-lg transition-colors self-start"
                            >
                                Abrir en nueva pestaña
                            </button>
                        )}
                    </div>
                )}
                {resetMessage && (
                    <div className="bg-green-50 text-green-600 p-3 rounded-xl mb-4 text-sm font-medium border border-green-100 flex items-start gap-2">
                        <span className="block w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                        <span>{resetMessage}</span>
                    </div>
                )}

                <div className="mb-5">
                    <label className="block text-slate-700 text-xs font-bold mb-2 uppercase tracking-wider dark:text-slate-300" htmlFor="resetEmail">
                        Correo Electrónico
                    </label>
                    <input
                        id="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => { setResetEmail(e.target.value); setError(''); }}
                        className="appearance-none border border-slate-200 rounded-xl w-full py-3 px-4 text-sm text-slate-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white placeholder-slate-400"
                        placeholder="ejemplo@correo.com"
                        required
                    />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={() => setIsResetModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isResetting || !resetEmail}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                        {isResetting ? 'Enviando...' : 'Enviar Enlace'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default LoginPage;
