'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { AuthProvider } from '@/context/AuthContext';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <AuthProvider>
      {isLoginPage ? (
        children
      ) : (
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-y-auto w-full">
            <Header />
            <div className="w-full">
              {children}
            </div>
          </main>
        </div>
      )}
    </AuthProvider>
  );
}
