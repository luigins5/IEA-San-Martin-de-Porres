import { isTokenExpired } from '../utils/jwt';

export const API_URL = '/api/';

// Evento personalizado para manejar el cierre de sesión desde el cliente API
export const AUTH_ERROR_EVENT = 'auth_error_unauthorized';

/**
 * Obtiene las cabeceras estándar, incluyendo el token de autenticación si existe.
 * Lanza un error si el token está expirado.
 */
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  const token = localStorage.getItem('auth_token');
  if (token) {
    if (isTokenExpired(token)) {
      window.dispatchEvent(new Event(AUTH_ERROR_EVENT));
      throw new Error('Su sesión ha expirado por seguridad. Por favor, inicie sesión nuevamente.');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Maneja la respuesta de la API, verificando errores de autenticación.
 */
const handleResponse = async (response: Response, endpoint: string) => {
  const isLoginRoute = endpoint.includes('auth/login');

  // Solo interceptar 401/403 si NO es la ruta de login
  if (!isLoginRoute && (response.status === 401 || response.status === 403)) {
    window.dispatchEvent(new Event(AUTH_ERROR_EVENT));
    throw new Error('Sesión expirada o no autorizada. Por favor, inicie sesión nuevamente.');
  }

  const contentType = response.headers.get("content-type");
  let data;
  
  if (contentType && contentType.indexOf("application/json") !== -1) {
    data = await response.json();
  } else {
    data = await response.text();
    // Si la respuesta es texto (ej. HTML de error del servidor) pero esperábamos JSON
    if (!response.ok) {
      throw new Error(`Error del servidor (${response.status}): La respuesta no es JSON válido.`);
    }
    // Si es 200 OK pero es HTML (ej. redirección de Hostinger)
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error("Respuesta no JSON recibida:", data);
      throw new Error("El servidor devolvió un formato incorrecto. Verifica la URL de la API.");
    }
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Error HTTP: ${response.status}`);
  }

  return data;
};

/**
 * Construye la URL final para la petición, asegurando el formato api.php?request=
 * para evitar problemas con .htaccess en Hostinger.
 */
const buildUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  if (cleanEndpoint.startsWith('api.php')) {
    return `${API_URL}${cleanEndpoint}`;
  }
  return `${API_URL}api.php?request=${cleanEndpoint}`;
};

/**
 * Cliente API centralizado para hacer peticiones al backend en PHP.
 * Maneja automáticamente los encabezados, tokens JWT y la conversión a JSON.
 */
export const apiClient = {
  /**
   * Realiza una petición GET
   */
  async get(endpoint: string) {
    try {
      const response = await fetch(buildUrl(endpoint), {
        method: 'GET',
        headers: getHeaders(),
      });
      
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error(`Error en GET ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Realiza una petición POST
   */
  async post(endpoint: string, data: any) {
    try {
      const response = await fetch(buildUrl(endpoint), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error(`Error en POST ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Realiza una petición PUT
   */
  async put(endpoint: string, data: any) {
    try {
      const response = await fetch(buildUrl(endpoint), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error(`Error en PUT ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Realiza una petición DELETE
   */
  async delete(endpoint: string) {
    try {
      const response = await fetch(buildUrl(endpoint), {
        method: 'DELETE',
        headers: getHeaders(),
      });
      
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error(`Error en DELETE ${endpoint}:`, error);
      throw error;
    }
  }
};
