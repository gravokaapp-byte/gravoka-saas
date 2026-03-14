'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', icon: 'dashboard', label: 'Dashboard' },
    { href: '/clientes', icon: 'group', label: 'Clientes' },
    { href: '/materiales', icon: 'inventory_2', label: 'Materiales' },
    { href: '/camiones', icon: 'local_shipping', label: 'Camiones' },
    { href: '/guias', icon: 'description', label: 'Guías' },
    { href: '/reportes', icon: 'bar_chart', label: 'Reportes' },
  ];

  return (
    <aside className="w-64 bg-slate-custom-900 dark:bg-black text-white flex flex-col h-full border-r border-slate-custom-800">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-2xl">mountain_flag</span>
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight">Gravoka</h1>
          <p className="text-xs text-slate-400">Gestión de Áridos</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {links.map((link) => {
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/');
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-primary text-white font-medium' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-custom-800">
        <div className="flex items-center gap-3 px-2">
          <div className="size-9 rounded-full bg-slate-700 overflow-hidden" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBxj74kdSJzi1JWYO0Llnx91goxYjSEqmP1LvMR9vbOjO-yNmqSkCB3e_7uD-n85yLDlzTPzHGKrWh9Aaupo6vBHOFajZqrAaJTjYHp8Hef6CFUYxdvaWGKuhpEs5RuhPYtIBxsjR_ncMdlGsdSqizjRXbMBWzS_s1OiFTkWKcXILzjPaPw6PA_mmAcczN2YG6HQXgcwaephUZ6hzpjHbLG4obkV835kLARftAVo8ILITsWN2wr73OIf-dP6_tY_aIK5s-dUNhdGw')", backgroundPosition: "center", backgroundSize: "cover" }}></div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Admin Usuario</p>
            <p className="text-xs text-slate-500 truncate">Operaciones</p>
          </div>
          <span className="material-symbols-outlined text-slate-500 cursor-pointer hover:text-white">logout</span>
        </div>
      </div>
    </aside>
  );
}
