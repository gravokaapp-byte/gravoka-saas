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
  lastActivity?: Date | null;
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
      
      const empresasData = await Promise.all(snapshot.docs.map(async (docRef) => {
        const data = docRef.data();
        // Fetch last guide to determine activity
        const guiasQ = query(
          collection(db, 'guias'),
          orderBy('fecha', 'desc'),
          // Nota: Firestore no permite filtrar por empresa_id y ordenar por fecha sin índice compuesto
          // Como ya tenemos índices para el tenant, esto debería funcionar si usamos el patrón de partición
          // Intentaremos un approach simplificado: todas las guías del tenant ordenadas
        );
        
        // Pero no podemos filtrar por empresa_id aquí fácilmente sin crear 50 índices
        // Mejor approach: Guardamos 'ultima_actividad' en el documento de la empresa cuando se crea una guía (en el futuro)
        // Por ahora, simularemos la salud basada en un campo o una query rápida si existe el índice
        
        return { 
          ...data, 
          id: docRef.id,
          lastActivity: data.ultima_actividad?.toDate() || null 
        } as Empresa;
      }));

      setEmpresas(empresasData);
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

  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEdit = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setIsEditModalOpen(true);
  };

  const saveChanges = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmpresa) return;
    
    // Convert date string if necessary
    const formData = new FormData(e.currentTarget);
    const updates = {
      nombre: formData.get('nombre') as string,
      rut: formData.get('rut') as string,
      plan_activo: formData.get('plan') as string,
      fecha_vencimiento: new Date(formData.get('vencimiento') as string)
    };

    try {
      await updateDoc(doc(db, 'empresas', selectedEmpresa.id), updates);
      setIsEditModalOpen(false);
      loadEmpresas();
    } catch (err) {
      console.error("Error updating empresa:", err);
    }
  };

  if (loading || profile?.rol !== 'superadmin') return null;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Edit Modal */}
      {isEditModalOpen && selectedEmpresa && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <h2 className="text-2xl font-black mb-2">Editar Empresa</h2>
              <p className="text-slate-500 text-sm mb-8">Modifica los parámetros principales del cliente.</p>
              
              <form onSubmit={saveChanges} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Nombre de la Empresa</label>
                  <input 
                    name="nombre"
                    defaultValue={selectedEmpresa.nombre}
                    className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">RUT</label>
                  <input 
                    name="rut"
                    defaultValue={selectedEmpresa.rut}
                    className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Plan SaaS</label>
                    <select 
                      name="plan"
                      defaultValue={selectedEmpresa.plan_activo}
                      className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold appearance-none"
                    >
                      <option value="Básico">Básico</option>
                      <option value="Pro">Pro</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Vencimiento</label>
                    <input 
                      name="vencimiento"
                      type="date"
                      defaultValue={selectedEmpresa.fecha_vencimiento?.seconds ? new Date(selectedEmpresa.fecha_vencimiento.seconds * 1000).toISOString().split('T')[0] : ''}
                      className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Salud</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Estado</th>
              <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(empresa => {
              const daysSinceActivity = empresa.lastActivity 
                ? Math.floor((new Date().getTime() - empresa.lastActivity.getTime()) / (1000 * 3600 * 24))
                : null;
              
              let healthColor = 'text-slate-400';
              let healthLabel = 'Sin Actividad';
              let healthDot = 'bg-slate-300';

              if (daysSinceActivity !== null) {
                if (daysSinceActivity <= 3) {
                  healthColor = 'text-emerald-600';
                  healthLabel = 'Bajo Riesgo';
                  healthDot = 'bg-emerald-500';
                } else if (daysSinceActivity <= 7) {
                  healthColor = 'text-amber-600';
                  healthLabel = 'Riesgo Medio';
                  healthDot = 'bg-amber-500';
                } else {
                  healthColor = 'text-red-600';
                  healthLabel = 'Alto Riesgo';
                  healthDot = 'bg-red-500';
                }
              }

              return (
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
                  <div className="flex items-center gap-2" title={empresa.lastActivity ? `Última guía: ${empresa.lastActivity.toLocaleDateString()}` : 'Nunca ha emitido guías'}>
                    <div className={`size-2 rounded-full ${healthDot}`} />
                    <span className={`text-[10px] font-black uppercase ${healthColor}`}>
                      {healthLabel}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${empresa.estado === 'activo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className={`text-xs font-bold uppercase ${empresa.estado === 'activo' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {empresa.estado === 'activo' ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => toggleEstado(empresa.id, empresa.estado)}
                      className={`p-2 rounded-lg transition-colors ${empresa.estado === 'activo' ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-500'}`}
                      title={empresa.estado === 'activo' ? 'Suspender' : 'Activar'}
                    >
                      {empresa.estado === 'activo' ? <Ban className="size-5" /> : <CheckCircle className="size-5" />}
                    </button>
                    <button 
                      onClick={() => handleEdit(empresa)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors"
                    >
                      <Edit2 className="size-5" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
