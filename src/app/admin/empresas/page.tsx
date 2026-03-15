'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Ban, 
  CheckCircle,
  Trash2,
  Mail,
  Edit2
} from 'lucide-react';

interface Empresa {
  id: string;
  nombre: string;
  rut: string;
  plan_activo: string;
  estado: string;
  administrador_email?: string;
  fecha_vencimiento?: any;
}

export default function EmpresasAdminPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && profile?.rol !== 'superadmin') router.push('/');
    loadEmpresas();
  }, [loading, profile, router]);

  const loadEmpresas = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'empresas'));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Empresa[];
      setEmpresas(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEstado = async (id: string, current: string) => {
    const nuevoEstado = current === 'activo' ? 'inactivo' : 'activo';
    await updateDoc(doc(db, 'empresas', id), { estado: nuevoEstado });
    loadEmpresas();
  };

  const filtered = empresas.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.rut.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || profile?.rol !== 'superadmin') return null;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Gestión de Clientes</h1>
          <p className="text-slate-500">Administración detallada de todas las empresas en la plataforma.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o RUT..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm w-80"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Empresa</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Plan</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Estado</th>
              <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(empresa => (
              <tr key={empresa.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white">{empresa.nombre}</span>
                    <span className="text-xs text-slate-400 font-mono">{empresa.rut}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                    empresa.plan_activo === 'Enterprise' ? 'bg-slate-900 text-white' : 
                    empresa.plan_activo === 'Pro' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {empresa.plan_activo}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${empresa.estado === 'activo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className={`text-xs font-bold uppercase ${empresa.estado === 'activo' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {empresa.estado === 'activo' ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => toggleEstado(empresa.id, empresa.estado)}
                      className={`p-2 rounded-lg transition-colors ${empresa.estado === 'activo' ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-500'}`}
                      title={empresa.estado === 'activo' ? 'Suspender' : 'Activar'}
                    >
                      {empresa.estado === 'activo' ? <Ban className="size-5" /> : <CheckCircle className="size-5" />}
                    </button>
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors">
                      <Edit2 className="size-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
