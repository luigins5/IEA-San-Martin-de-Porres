import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// Tiempo de inactividad antes de cerrar sesión (en milisegundos)
// Por defecto: 30 minutos
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; 

export const useInactivityTimeout = () => {
  const { isAuthenticated, logout } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(() => {
        console.warn('Sesión cerrada por inactividad.');
        logout();
        // Opcional: Podríamos mostrar un mensaje o modal antes de hacer logout
      }, INACTIVITY_TIMEOUT);
    }
  };

  useEffect(() => {
    // Eventos que reinician el temporizador de inactividad
    const events = [
      'mousemove',
      'mousedown',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleUserActivity = () => {
      resetTimeout();
    };

    if (isAuthenticated) {
      // Iniciar el temporizador por primera vez
      resetTimeout();

      // Agregar listeners
      events.forEach(event => {
        window.addEventListener(event, handleUserActivity);
      });
    }

    return () => {
      // Limpiar temporizador y listeners al desmontar o cuando cambia la autenticación
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isAuthenticated, logout]);
};
