'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { createTenantAction } from '@/app/actions/tenantActions';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Empresa {
  id: string;
  nombre: string;
  rut: string;
  plan_activo: string;
  creado_en: string;
}

export default function SuperAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Only allow specific email for MVP
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.email !== 'mvaldes86@gmail.com') {
        router.push('/'); // Redirect normal users to their dashboard
      } else {
        fetchEmpresas();
      }
    }
  }, [user, loading, router]);

  const fetchEmpresas = async () => {
    try {
      setIsLoadingData(true);
      const q = query(collection(db, 'empresas'), orderBy('creado_en', 'desc'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Empresa[];
      setEmpresas(docs);
    } catch (error) {
      console.error("Error fetching empresas:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const token = await user?.getIdToken(true);
      
      if (!token) throw new Error("No estás autenticado.");

      const result = await createTenantAction(formData, token);
      
      if (result.success) {
        setFeedback({ type: 'success', text: result.message! });
        (e.target as HTMLFormElement).reset();
        fetchEmpresas(); // Refresh list
      } else {
        setFeedback({ type: 'error', text: result.error! });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || (!user && !loading) || user?.email !== 'mvaldes86@gmail.com') {
    return <div className="p-8">Cargando panel de administración...</div>;
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-10 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-4xl">admin_panel_settings</span>
          SuperAdministrador de Gravoka
        </h1>
        <p className="text-slate-500 mt-2">Gestiona las empresas (plantas de áridos) dadas de alta en el SaaS.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form to create new tenant */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Nueva Empresa Cliente</h2>
            
            {feedback && (
              <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre de la Empresa</label>
                <input name="empresaNombre" required type="text" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800" placeholder="Ej. Áridos San Juan" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">RUT Empresa</label>
                <input name="rut" type="text" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800" placeholder="76.123.456-K" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email del Administrador</label>
                <input name="adminEmail" required type="email" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800" placeholder="dueño@aridos.cl" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Contraseña Inicial</label>
                <input name="adminPassword" required type="password" minLength={6} className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800" placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Plan Gravoka</label>
                <select name="plan" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800">
                  <option value="Básico">Básico</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-white py-3 px-4 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Registrando...' : 'Registrar Empresa y Usuario'}
                {!isSubmitting && <span className="material-symbols-outlined">person_add</span>}
              </button>
            </form>
          </div>
        </div>

        {/* List of tenants */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Empresas Activas</h2>
              <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-sm">{empresas.length} Totales</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-6 py-4">Empresa</th>
                    <th className="px-6 py-4">RUT</th>
                    <th className="px-6 py-4">Plan Activo</th>
                    <th className="px-6 py-4">ID de Entorno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingData ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Cargando base de datos...</td></tr>
                  ) : empresas.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay empresas registradas todavía.</td></tr>
                  ) : (
                    empresas.map((empresa) => (
                      <tr key={empresa.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{empresa.nombre}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{empresa.rut}</td>
                        <td className="px-6 py-4">
                          <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full text-xs font-bold">
                            {empresa.plan_activo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-mono">{empresa.id.substring(0, 8)}...</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
