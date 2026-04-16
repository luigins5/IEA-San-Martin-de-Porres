import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Gestión Escolar
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Plataforma integral para la administración académica, comunicación y seguimiento del rendimiento estudiantil.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Plataforma</h4>
            <ul className="flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-400">
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Características</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Actualizaciones</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Soporte Técnico</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h4>
            <ul className="flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-400">
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Términos de Servicio</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Política de Privacidad</a></li>
              <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Uso de Datos</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} Gestión Escolar. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>Desarrollado por</span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
              Somos NS-5
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;