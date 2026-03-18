'use client';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { AuthProvider, useAuth } from '@/context/AuthContext';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const isLoginPage = pathname === '/login';
  const isRegistroPage = pathname === '/registro';
  // El root (/) es público SOLO si el usuario no ha iniciado sesión (Landing Page)
  const isLandingPage = pathname === '/' && !user;
  const isPublicPage = isLoginPage || isRegistroPage || isLandingPage;

  // Cerrar sidebar al cambiar de ruta en móviles
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <>
      {isPublicPage ? (
        children
      ) : (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
          <div className="no-print">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
          </div>
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="no-print">
              <Header onMenuClick={() => setIsSidebarOpen(true)} />
            </div>
            <div className="flex-1 overflow-auto p-2 md:p-8">
              {children}
            </div>
          </main>
        </div>
      )}
    </>
  );
}
