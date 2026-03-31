
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { UserRole } from '../../types';
import Card from '../ui/Card';
import { EyeIcon, EyeSlashIcon } from '../icons';
import Footer from '../layout/Footer';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('luissalberto26@gmail.com');
  const [password, setPassword] = useState('Luigi260884.');
  const [role, setRole] = useState<UserRole>(UserRole.SUPER_ADMIN);
  const { login } = useAuth();
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
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
              <div className="flex items-center justify-between gap-4">
                <button
                  className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 hover:bg-primary/90 transition-all duration-200 text-sm shadow-sm"
                  type="submit"
                >
                  Ingresar al Sistema
                </button>
              </div>
            </form>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LoginPage;
