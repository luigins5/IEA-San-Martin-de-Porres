
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { logAuditAction, AuditAction } from '../utils/audit';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole, campusId: string) => Promise<void>;
  loginWithGoogle: (role: UserRole, campusId: string) => Promise<void>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  impersonateUser: (targetUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAILS = ['ns.5.empresarial@gmail.com', 'luissalberto26@gmail.com'];

const syncUserCampusId = async (userData: User, userDocRef: any, originalEmailInput?: string) => {
    if (userData.email && SUPER_ADMIN_EMAILS.includes((userData.email as string).trim().toLowerCase())) {
        userData.role = UserRole.SUPER_ADMIN;
    } else {
        // Enforce role based on bulk uploaded data if it exists
        try {
            const emailLower = (userData.email || '').trim().toLowerCase();
            
            // Check Admins (small collection, safe to scan for case-insensitive matching)
            const adminSnap = await getDocs(collection(db, 'admins'));
            const adminMatch = adminSnap.docs.find(d => {
                const e = d.data().email;
                return e && typeof e === 'string' && e.trim().toLowerCase() === emailLower;
            });
            
            if (adminMatch) {
                userData.role = UserRole.CAMPUS_ADMIN;
                const record = adminMatch.data();
                if (record.campusId) userData.campusId = record.campusId;
            } else {
                // Check Teachers (small collection, safe to scan for case-insensitive matching)
                const teacherSnap = await getDocs(collection(db, 'teachers'));
                const teacherMatch = teacherSnap.docs.find(d => {
                    const e = d.data().email;
                    return e && typeof e === 'string' && e.trim().toLowerCase() === emailLower;
                });
                
                if (teacherMatch) {
                    userData.role = UserRole.TEACHER;
                    const record = teacherMatch.data();
                    if (record.campusId) userData.campusId = record.campusId;
                } else {
                    // Check Students using email variations (large collection, avoid full scan)
                    const emailVariations = Array.from(new Set([
                        emailLower,
                        originalEmailInput?.trim() || emailLower,
                        originalEmailInput ? originalEmailInput.trim().toLowerCase() : emailLower,
                        originalEmailInput ? originalEmailInput.trim().charAt(0).toUpperCase() + originalEmailInput.trim().slice(1).toLowerCase() : emailLower.charAt(0).toUpperCase() + emailLower.slice(1)
                    ]));
                    const studentQ = query(collection(db, 'students'), where('email', 'in', emailVariations));
                    const studentSnap = await getDocs(studentQ);
                    
                    if (!studentSnap.empty) {
                        userData.role = UserRole.STUDENT;
                        const record = studentSnap.docs[0].data();
                        if (record.campusId) userData.campusId = record.campusId;
                    } else if (userData.role === UserRole.SUPER_ADMIN || userData.role === UserRole.CAMPUS_ADMIN || userData.role === UserRole.TEACHER) {
                        userData.role = UserRole.STUDENT; // Fallback to avoid unauthorized staff roles for unverified users
                    }
                }
            }
        } catch(e) {
            console.error("Error syncing role from collections:", e);
        }
    }
    
    // Always persist standard claims
    const updateData: any = { role: userData.role };
    if (userData.campusId !== undefined) {
        updateData.campusId = userData.campusId;
    }
    await setDoc(userDocRef, updateData, { merge: true });
    return userData;
};

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      if (user) {
        await logAuditAction(user, AuditAction.LOGOUT, 'Cierre de sesión');
      }
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [user]);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = await syncUserCampusId(userDoc.data() as User, userDocRef, firebaseUser.email || undefined);
            setUser(userData);
          } else {
            // Handle case where user is in Auth but not in Firestore
            // This might happen if the user was just created
            console.warn("User authenticated but profile not found in Firestore.");
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (role: UserRole, campusId: string): Promise<void> => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      // Fetch user profile from Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userDataRaw = userDoc.data() as User;
        if (userDataRaw.email && typeof userDataRaw.email === 'string') {
           userDataRaw.email = userDataRaw.email.trim().toLowerCase();
        }
        const userData = await syncUserCampusId(userDataRaw, userDocRef, firebaseUser.email || undefined);
        
        const isSuperAdminUser = firebaseUser.email ? SUPER_ADMIN_EMAILS.includes(firebaseUser.email.trim().toLowerCase()) : false;
        if (isSuperAdminUser && userData.role !== UserRole.SUPER_ADMIN) {
             userData.role = UserRole.SUPER_ADMIN;
             await setDoc(userDocRef, { role: UserRole.SUPER_ADMIN }, { merge: true });
        }

        if (userData.role !== role && !isSuperAdminUser) {
           // Instead of throwing an error, we gracefully accept the synced role from our master collections
           console.log(`Role mismatch: frontend requested ${role}, but sync resolved to ${userData.role}. Using synced role.`);
        }
        if (userData.role !== UserRole.SUPER_ADMIN && userData.campusId !== campusId) {
            if (!userData.campusId && campusId) {
                userData.campusId = campusId;
            } else {
                 console.log(`Campus mismatch: frontend requested ${campusId}, but sync resolved to ${userData.campusId}. Using synced campus.`);
            }
        }

        userData.lastLogin = new Date().toISOString();
        await setDoc(userDocRef, { lastLogin: userData.lastLogin }, { merge: true });
        setUser(userData);
        logAuditAction(userData, AuditAction.LOGIN, 'Inicio de sesión con Google');
      } else {
        const safeEmail = (firebaseUser.email || '').trim().toLowerCase();
        const isSuperAdminDefault = SUPER_ADMIN_EMAILS.includes(safeEmail);
        let defaultUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
          email: safeEmail,
          role: isSuperAdminDefault ? UserRole.SUPER_ADMIN : role,
          campusId: role !== UserRole.SUPER_ADMIN && !isSuperAdminDefault ? campusId : undefined,
          avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'U')}&background=random`,
          lastLogin: new Date().toISOString()
        };
        defaultUser = await syncUserCampusId(defaultUser, userDocRef, firebaseUser.email || undefined);
        
        const saveUser = { ...defaultUser };
        if (saveUser.campusId === undefined) delete saveUser.campusId;
        
        await setDoc(userDocRef, saveUser);
        setUser(defaultUser);
        logAuditAction(defaultUser, AuditAction.LOGIN, 'Inicio de sesión con Google (Nuevo usuario)');
      }
    } catch (error: any) {
      console.error("Error en login con Google:", error);
      if (error.message === 'La sede seleccionada no coincide con su cuenta.' || error.message === 'El rol seleccionado no coincide con su cuenta.') {
        throw error;
      }
      throw new Error('Error al iniciar sesión con Google.');
    }
  };

  const login = async (email: string, password: string, role: UserRole, campusId: string): Promise<void> => {
    try {
      let firebaseUser;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
      } catch (signInError: any) {
        if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/user-not-found') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            firebaseUser = userCredential.user;
          } catch (createError: any) {
            if (createError.code === 'auth/email-already-in-use') {
              throw new Error('Contraseña incorrecta.');
            }
            throw createError;
          }
        } else {
          throw signInError;
        }
      }
      
      // Fetch user profile from Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userDataRaw = userDoc.data() as User;
        if (userDataRaw.email && typeof userDataRaw.email === 'string') {
           userDataRaw.email = userDataRaw.email.trim().toLowerCase();
        }
        const userData = await syncUserCampusId(userDataRaw, userDocRef, firebaseUser.email || email);
        
        const isSuperAdminUser = firebaseUser.email ? SUPER_ADMIN_EMAILS.includes(firebaseUser.email.trim().toLowerCase()) : false;
        if (isSuperAdminUser && userData.role !== UserRole.SUPER_ADMIN) {
             userData.role = UserRole.SUPER_ADMIN;
             await setDoc(userDocRef, { role: UserRole.SUPER_ADMIN }, { merge: true });
        }

        if (userData.role !== role && !isSuperAdminUser) {
           console.log(`Role mismatch: expected ${role}, resolving to ${userData.role}`);
        }
        
        // Check if campus matches
        if (userData.role !== UserRole.SUPER_ADMIN && userData.campusId !== campusId) {
            if (!userData.campusId && campusId) {
                userData.campusId = campusId;
            } else {
                console.log(`Campus mismatch: expected ${campusId}, resolving to ${userData.campusId}`);
            }
        }

        userData.lastLogin = new Date().toISOString();
        await setDoc(userDocRef, { lastLogin: userData.lastLogin }, { merge: true });
        setUser(userData);
        logAuditAction(userData, AuditAction.LOGIN, 'Inicio de sesión con Email');
      } else {
        // If user doesn't exist in Firestore, create a default profile (for testing/initial setup)
        // In a real app, users would be created by an admin
        const safeEmail = (firebaseUser.email || email).trim().toLowerCase();
        const isSuperAdminDefault = SUPER_ADMIN_EMAILS.includes(safeEmail);
        let defaultUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || safeEmail.split('@')[0],
          email: safeEmail,
          role: isSuperAdminDefault ? UserRole.SUPER_ADMIN : role,
          campusId: role !== UserRole.SUPER_ADMIN && !isSuperAdminDefault ? campusId : undefined,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'U')}&background=random`,
          lastLogin: new Date().toISOString()
        };
        defaultUser = await syncUserCampusId(defaultUser, userDocRef, firebaseUser.email || email);
        
        const saveUser = { ...defaultUser };
        if (saveUser.campusId === undefined) delete saveUser.campusId;
        
        await setDoc(userDocRef, saveUser);
        setUser(defaultUser);
        logAuditAction(defaultUser, AuditAction.LOGIN, 'Inicio de sesión con Email (Nuevo usuario)');
      }
    } catch (error: any) {
      console.error("Error en login:", error);
      let message = 'Credenciales incorrectas o error de conexión.';
      if (error.message === 'Contraseña incorrecta.') {
        message = error.message;
      } else if (error.message === 'La sede seleccionada no coincide con su cuenta.' || error.message === 'El rol seleccionado no coincide con su cuenta.') {
        message = error.message;
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Credenciales incorrectas.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Demasiados intentos. Por favor, intente más tarde.';
      }
      throw new Error(message);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log(`Solicitud de restablecimiento de contraseña enviada para: ${email}`);
    } catch (error: any) {
      console.error("Error al solicitar restablecimiento de contraseña:", error);
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Error de conexión. Por favor, verifique su internet o intente abrir la aplicación en una nueva pestaña.');
      }
      if (error.code === 'auth/user-not-found') {
        throw new Error('No hay ningún usuario registrado con este correo electrónico.');
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('El formato del correo electrónico no es válido.');
      }
      throw new Error(error.message || 'Error al solicitar el restablecimiento de contraseña.');
    }
  };

  const impersonateUser = (targetUser: User) => {
    setUser(targetUser);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, loginWithGoogle, logout, sendPasswordReset, impersonateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
