import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full py-5 px-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center z-10">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} Sistema de Gestión Escolar. Todos los derechos reservados.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Desarrollado y mantenido por <span className="font-bold text-blue-600 dark:text-blue-500">Somos NS-5</span>
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Términos de Servicio</a>
          <span>&bull;</span>
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Política de Privacidad</a>
          <span>&bull;</span>
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Soporte Técnico</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;