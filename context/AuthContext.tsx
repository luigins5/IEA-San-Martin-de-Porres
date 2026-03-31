
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

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
            setUser(userDoc.data() as User);
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

  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
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
        const userData = userDoc.data() as User;
        
        // Check if role matches (optional, but requested in original code)
        if (userData.role !== role && userData.role !== UserRole.SUPER_ADMIN) {
           // throw new Error('El rol seleccionado no coincide con su cuenta.');
        }

        setUser(userData);
      } else {
        // If user doesn't exist in Firestore, create a default profile (for testing/initial setup)
        // In a real app, users would be created by an admin
        const defaultUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || email.split('@')[0],
          email: email,
          role: role,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'U')}&background=random`
        };
        await setDoc(userDocRef, defaultUser);
        setUser(defaultUser);
      }
    } catch (error: any) {
      console.error("Error en login:", error);
      let message = 'Credenciales incorrectas o error de conexión.';
      if (error.message === 'Contraseña incorrecta.') {
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
      throw new Error(error.message || 'Error al solicitar el restablecimiento de contraseña.');
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, sendPasswordReset }}>
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
