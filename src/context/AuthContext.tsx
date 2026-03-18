'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';

export interface UserProfile {
  empresa_id?: string;
  rol?: string;
  nombre?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  logout: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      setUser(currentUser);
      
      let fetchedProfile: UserProfile | null = null;
      let fetchedEmpresaData: any = null;

      if (currentUser) {
        try {
          const docRef = doc(db, 'usuarios', currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            fetchedProfile = docSnap.data() as UserProfile;
            setProfile(fetchedProfile);

            if (fetchedProfile.empresa_id) {
               // Sync with cookie for Server Components
               document.cookie = `empresa_id=${fetchedProfile.empresa_id}; path=/; max-age=3600; SameSite=Lax`;
               
               const empresaRef = doc(db, 'empresas', fetchedProfile.empresa_id);
               const empresaSnap = await getDoc(empresaRef);
               if (empresaSnap.exists()) {
                  fetchedEmpresaData = empresaSnap.data();
               }
            }
          } else {
            console.warn('Usuario sin perfil definido en Firestore.');
            setProfile(null);
            // Clear cookie if no profile
            document.cookie = 'empresa_id=; path=/; max-age=0';
          }
        } catch (error) {
          console.error("Error al obtener perfil o datos de empresa:", error);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);

      // --- Authorization Logic ---
      const publicPaths = ['/login', '/registro', '/'];
      const isPublicPath = publicPaths.includes(pathname);
      
      // If no user, redirect to login unless on a public page
      if (!currentUser) {
        if (!isPublicPath) {
          router.push('/login');
        }
        return; // Stop further checks for unauthenticated users
      }

      // Let SuperAdmin through everything (if we define admin by email or role)
      if (fetchedProfile?.rol === 'superadmin' || pathname === '/admin') {
        // If a superadmin is on the login page, redirect to dashboard
        if (pathname === '/login') {
          router.push('/');
        }
        return; // Don't redirect superadmins away from their panel
      }

      // SaaS Paywall Logic (Block suspended/inactive tenants)
      if (fetchedEmpresaData && fetchedEmpresaData.estado !== 'activo') {
        // If they are not active, they can ONLY visit the subscription page (or login/API routes)
        if (pathname !== '/suscripcion' && !pathname.startsWith('/api')) {
          console.warn('Redirecting inactive tenant to /suscripcion');
          router.push('/suscripcion');
          return;
        }
      }

      // Standard user redirects
      // If authenticated user is on login page, redirect to dashboard
      if (currentUser && pathname === '/login') {
        router.push('/');
        return;
      }

      // If authenticated user is on root and company is active, redirect to dashboard
      // If authenticated user is on root and company is active, stay there (Dashboard)
      if (currentUser && pathname === '/') {
        if (fetchedEmpresaData?.estado !== 'activo') {
          router.push('/suscripcion');
        }
        return;
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [pathname, router]);

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear cookie
      document.cookie = 'empresa_id=; path=/; max-age=0';
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const publicPaths = ['/login', '/registro', '/'];
  const isPublicPath = publicPaths.includes(pathname);

  if (!user && !isPublicPath) {
    return null;
  }

  return <AuthContext.Provider value={{ user, profile, loading, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
