'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { createTenantAction } from '@/app/actions/tenantActions';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

import { getSaaSGlobalStats, SaaSStats } from '@/lib/saas-stats';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const admin = require('firebase-admin');

function calculateDaysRemaining(fechaVencimiento: any) {
  if (!fechaVencimiento) return null;
  const expiry = new Date(fechaVencimiento.seconds * 1000);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

interface Empresa {
  id: string;
  nombre: string;
  rut: string;
  plan_activo: string;
  creado_en: any;
  estado: string;
  fecha_vencimiento?: any;
}

export default function SuperAdminPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [saasStats, setSaasStats] = useState<SaaSStats | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (profile?.rol !== 'superadmin') {
        router.push('/');
      } else {
        loadData();
      }
    }
  }, [user, profile, loading, router]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const q = query(collection(db, 'empresas'), orderBy('creado_en', 'desc'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Empresa[];
      setEmpresas(docs);
      
      const stats = await getSaaSGlobalStats();
      setSaasStats(stats);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

  if (loading || profile?.rol !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pieData = saasStats ? [
    { name: 'Básico', value: saasStats.planes.Básico, color: '#94A3B8' },
    { name: 'Pro', value: saasStats.planes.Pro, color: '#00A859' },
    { name: 'Enterprise', value: saasStats.planes.Enterprise, color: '#1E293B' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-10 py-8 space-y-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-[0.2em] mb-2">
            Control de Mando SaaS
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
            Administración Gravoka
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Resumen de ingresos, suscripciones y crecimiento de la plataforma.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={loadData}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Actualizar Datos
          </button>
        </div>
      </div>

      {/* SaaS Business KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="MRR Estimado" 
          value={formatCurrency(saasStats?.mrrEstimado || 0)} 
          icon="payments" 
          secondary="Ingresos recurrentes"
          color="bg-emerald-500"
        />
        <MetricCard 
          title="Empresas Activas" 
          value={saasStats?.empresasActivas.toString() || '0'} 
          icon="corporate_fare" 
          secondary={`${saasStats?.totalEmpresas} totales registradas`}
          color="bg-blue-500"
        />
        <MetricCard 
          title="Suscripciones Pro" 
          value={saasStats?.planes.Pro.toString() || '0'} 
          icon="verified" 
          secondary="Plan más popular"
          color="bg-primary"
        />
        <MetricCard 
          title="Días p/ Cierre" 
          value={(30 - new Date().getDate()).toString()} 
          icon="calendar_month" 
          secondary="Ciclo de facturación"
          color="bg-slate-600"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Companies Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-black">Empresas y Suscripciones</h2>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                Total registrado: {empresas.length}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Cliente</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Plan</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Estado</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Vencimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingData ? (
                    <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-500 italic">Cargando datos maestros...</td></tr>
                  ) : empresas.map((empresa) => (
                    <tr key={empresa.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 dark:text-white">{empresa.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{empresa.rut}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                          empresa.plan_activo === 'Enterprise' ? 'bg-slate-900 text-white' : 
                          empresa.plan_activo === 'Pro' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {empresa.plan_activo}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className={`size-2 rounded-full animate-pulse ${empresa.estado === 'activo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className={`text-xs font-bold uppercase ${empresa.estado === 'activo' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {empresa.estado === 'activo' ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {empresa.fecha_vencimiento ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                              {new Date(empresa.fecha_vencimiento.seconds * 1000).toLocaleDateString('es-CL')}
                            </span>
                            {(() => {
                              const days = calculateDaysRemaining(empresa.fecha_vencimiento);
                              if (days === null) return null;
                              const color = days < 3 ? 'text-red-500' : days < 10 ? 'text-amber-500' : 'text-emerald-500';
                              return (
                                <span className={`text-[10px] font-black uppercase tracking-tighter ${color}`}>
                                  {days < 0 ? 'Vencido' : `${days} días restantes`}
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin fecha</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Insights & Charts */}
        <div className="space-y-8">
          {/* Plan Distribution */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 mb-8">Distribución por Plan</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-3">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-slate-500">
                    <div className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </span>
                  <span className="text-slate-900 dark:text-white">{d.value} empresas</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions / Help */}
          <div className="bg-primary p-8 rounded-[2rem] text-white shadow-xl shadow-primary/20 relative overflow-hidden">
             <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl opacity-10">hub</span>
             <h3 className="text-xl font-black mb-4">Administración Central</h3>
             <p className="text-sm opacity-90 leading-relaxed mb-6">
                Desde aquí supervisas todo el ecosistema de Gravoka. Puedes gestionar nuevas altas, monitorizar ingresos y suspender servicios por falta de pago.
             </p>
             <button 
               onClick={() => router.push('/admin/configuracion')}
               className="w-full bg-white text-primary py-3 rounded-xl font-black text-sm hover:bg-slate-50 transition-all uppercase tracking-wider"
             >
                Ir a Configuración SaaS
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, secondary, color }: { title: string, value: string, icon: string, secondary: string, color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6 group hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between">
        <div className={`size-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg`}>
          <span className="material-symbols-outlined text-3xl font-light">{icon}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
          <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">{value}</span>
        </div>
      </div>
      <div className="text-xs font-bold text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto lowercase">
        {secondary}
      </div>
    </div>
  );
}
