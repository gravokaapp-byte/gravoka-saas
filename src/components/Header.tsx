'use client';

import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  
  let title = 'Dashboard Principal';
  if (pathname.includes('/clientes')) title = 'Gestión de Clientes';
  else if (pathname.includes('/guias')) title = 'Terminal de Despacho';
  else if (pathname.includes('/reportes')) title = 'Reportes';

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-custom-900 dark:text-white">{title}</h2>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input 
            type="text" 
            placeholder="Buscar guías, clientes..." 
            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary w-64"
          />
        </div>
        
        <button className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center relative">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
        </button>
        
        <button className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>
    </header>
  );
}
