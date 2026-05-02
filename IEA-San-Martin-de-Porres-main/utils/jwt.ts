/**
 * Decodifica un token JWT y devuelve su payload.
 * No verifica la firma, solo decodifica la parte pública (payload).
 */
export const decodeJWT = (token: string): any | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decodificando el token JWT:', error);
    return null;
  }
};

/**
 * Verifica si un token JWT ha expirado.
 * @param token El token JWT a verificar.
 * @returns true si está expirado o es inválido, false si aún es válido.
 */
export const isTokenExpired = (token: string): boolean => {
  if (!token) return true;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;

  // exp está en segundos, Date.now() está en milisegundos
  const expirationTime = decoded.exp * 1000;
  
  // Agregamos un margen de 10 segundos para evitar problemas de sincronización de reloj
  const isExpired = Date.now() >= (expirationTime - 10000);
  
  return isExpired;
};
