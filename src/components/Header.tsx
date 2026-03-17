'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { getNotifications, markNotificationAsRead, Notification } from '@/app/actions/notifications';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  useEffect(() => {
    if (profile) {
      const loadNotifications = async () => {
        const data = await getNotifications(profile.rol === 'superadmin', user?.uid);
        setNotifications(data);
      };
      loadNotifications();
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [profile, user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  let title = 'Dashboard';
  if (pathname.includes('/admin')) title = 'SaaS Admin';
  else if (pathname.includes('/clientes')) title = 'Clientes';
  else if (pathname.includes('/guias')) title = 'Terminal Despacho';
  else if (pathname.includes('/reportes')) title = 'Reportes';
  else if (pathname.includes('/configuracion')) title = 'Configuración';

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="flex lg:hidden size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
          aria-label="Abrir menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[150px] md:max-w-none ml-1 uppercase">{title}</h2>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative group hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary w-32 md:w-64 transition-all"
          />
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="size-9 md:size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center relative"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 size-4 bg-red-500 text-[10px] text-white font-bold rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="font-black text-[10px] uppercase tracking-widest text-slate-400">Notificaciones</span>
                <button onClick={() => setNotifications([])} className="text-[10px] font-bold text-primary hover:underline">Limpiar todo</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-20">notifications_off</span>
                    <p className="text-xs">No hay novedades por ahora</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleMarkRead(n.id)}
                      className={`p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative ${!n.read ? 'bg-primary/[0.02]' : ''}`}
                    >
                      {!n.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 size-1.5 bg-primary rounded-full"></div>}
                      <div className="flex flex-col gap-1 ml-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{n.title}</span>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => {
            if (profile?.rol === 'superadmin') router.push('/admin/configuracion');
            else router.push('/configuracion');
          }}
          className="size-9 md:size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>
    </header>
  );
}
