'use client';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { AuthProvider } from '@/context/AuthContext';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const isLoginPage = pathname === '/login';
  const isRegistroPage = pathname === '/registro';
  const isPublicPage = isLoginPage || isRegistroPage;

  // Cerrar sidebar al cambiar de ruta en móviles
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <AuthProvider>
      {isPublicPage ? (
        children
      ) : (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <div className="p-4 md:p-8">
              {children}
            </div>
          </main>
        </div>
      )}
    </AuthProvider>
  );
}
