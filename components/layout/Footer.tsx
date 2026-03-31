import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-surface px-4 py-3 text-xs text-text-secondary border-t border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="text-center sm:text-left">
          <p>&copy; {new Date().getFullYear()} Sistema de Gestión Escolar. Todos los derechos reservados.</p>
          <p className="mt-1">
            Desarrollado por <span className="font-semibold text-primary">Somos NS-5</span>
          </p>
        </div>
        <div className="flex space-x-4 font-medium">
          <a href="#" className="hover:text-primary transition-colors">Términos de Servicio</a>
          <a href="#" className="hover:text-primary transition-colors">Política de Privacidad</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;