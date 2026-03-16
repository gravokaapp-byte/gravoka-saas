import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { getNotifications, markNotificationAsRead, Notification } from '@/app/actions/notifications';

export default function Header() {
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
      // Polling básico cada 1 min para demos
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [profile, user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  let title = 'Dashboard Principal';
  if (pathname.includes('/admin')) title = 'SaaS Admin Hub';
  else if (pathname.includes('/clientes')) title = 'Gestión de Clientes';
  else if (pathname.includes('/guias')) title = 'Terminal de Despacho';
  else if (pathname.includes('/reportes')) title = 'Reportes y Analítica';
  else if (pathname.includes('/configuracion')) title = 'Configuración de Empresa';

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
      
      <div className="flex items-center gap-4">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary w-64 transition-all"
          />
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center relative"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 size-4 bg-red-500 text-[10px] text-white font-bold rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="font-black text-xs uppercase tracking-widest text-slate-400">Notificaciones</span>
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
                        <span className="text-[9px] text-slate-400 font-medium">Hace un momento</span>
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
          className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>
    </header>
  );
}
