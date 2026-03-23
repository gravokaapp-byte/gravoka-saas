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
  plan_activo?: 'Startup' | 'Full';
  plan_deseado?: 'Startup' | 'Full';
  fecha_vencimiento?: string | null;
  es_trial?: boolean;
  estado?: string; // --- Added estado to profile ---
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  effectivePlan: 'Startup' | 'Full';
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  effectivePlan: 'Startup',
  loading: true,
  logout: async () => {} 
});

// Helper to parse dates (Firestore Timestamp, ISO string, etc.)
const parseDate = (dateField: any) => {
  if (!dateField) return null;
  if (dateField.seconds) return new Date(dateField.seconds * 1000);
  if (typeof dateField === 'string') return new Date(dateField);
  if (dateField instanceof Date) return dateField;
  return null;
};

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
                   // Merge plan data into user profile for easy access
                   fetchedProfile = {
                      ...fetchedProfile,
                      plan_activo: fetchedEmpresaData.plan_activo,
                      plan_deseado: fetchedEmpresaData.plan_deseado,
                      fecha_vencimiento: fetchedEmpresaData.fecha_vencimiento,
                      es_trial: fetchedEmpresaData.es_trial,
                      estado: fetchedEmpresaData.estado // --- Correctly sync status ---
                   };
                   setProfile(fetchedProfile);
                }
            }
          } else {
            console.warn('Usuario sin perfil definido en Firestore.');
            setProfile(null);
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
      const publicPaths = ['/login', '/registro', '/', '/olvide-password'];
      const isPublicPath = publicPaths.includes(pathname);
      
      if (!currentUser) {
        if (!isPublicPath) {
          router.replace('/login');
        }
        return;
      }

      // Bypass checks for Superadmin or Admin routes
      const isSuperadmin = fetchedProfile?.rol === 'superadmin';
      if (isSuperadmin || pathname === '/admin') {
        if (pathname === '/login') router.replace('/');
        return;
      }

      // --- SaaS Restriction Logic (HARD BLOCK) ---
      const status = fetchedEmpresaData?.estado;
      const expiryDate = fetchedEmpresaData?.fecha_vencimiento ? parseDate(fetchedEmpresaData.fecha_vencimiento) : null;
      
      const isInactive = status === 'inactivo';
      const isExpired = expiryDate && expiryDate < new Date();

      if (fetchedEmpresaData && (isInactive || isExpired)) {
        if (pathname !== '/suscripcion' && !pathname.startsWith('/api')) {
          console.warn(`Redirecting blocked tenant: Inactive=${isInactive}, Expired=${isExpired}`);
          router.replace('/suscripcion');
          return;
        }
      }

      if (pathname === '/login') {
        router.replace('/');
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

  // --- Main Render Render-Blocking logic ---
  const publicPaths = ['/login', '/registro', '/', '/olvide-password'];
  const isPublicPath = publicPaths.includes(pathname);
  const isSuperadmin = profile?.rol === 'superadmin';
  const isSuscripcionPath = pathname === '/suscripcion';
  
  // Calculate restriction based on profile state (available during render)
  const expiry = parseDate(profile?.fecha_vencimiento);
  const isExpired = expiry && expiry < new Date();
  const isInactive = profile?.estado === 'inactivo';
  const isRestricted = !isSuperadmin && (isInactive || isExpired);

  // 1. If not logged in and not public -> block rendering (useEffect will redirect)
  if (!user && !isPublicPath) {
    return null;
  }

  // 2. If restricted and NOT on /suscripcion -> block rendering (useEffect will redirect)
  if (user && isRestricted && !isSuscripcionPath && !pathname.startsWith('/api') && pathname !== '/admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-slate-500 font-medium">Redirigiendo a suscripción...</p>
        </div>
      </div>
    );
  }

  const effectivePlan = (profile?.plan_activo === 'Full' && expiry) 
    ? (expiry > new Date() ? 'Full' : (profile?.plan_deseado || 'Startup'))
    : profile?.plan_activo || 'Startup';

  return <AuthContext.Provider value={{ user, profile, effectivePlan, loading, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
