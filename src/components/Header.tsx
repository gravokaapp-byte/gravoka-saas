import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  
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
        
        <button className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center relative">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
        </button>
        
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
