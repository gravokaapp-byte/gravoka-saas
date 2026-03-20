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


function calculateDaysRemaining(fechaVencimiento: any) {
  if (!fechaVencimiento) return null;
  
  let expiry: Date;
  if (fechaVencimiento.seconds) {
    expiry = new Date(fechaVencimiento.seconds * 1000);
  } else if (typeof fechaVencimiento === 'string') {
    expiry = new Date(fechaVencimiento);
  } else if (fechaVencimiento instanceof Date) {
    expiry = fechaVencimiento;
  } else {
    return null;
  }

  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
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
      // Use simpler query to avoid skipping documents missing 'creado_en'
      const q = query(collection(db, 'empresas'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Empresa[];
      
      // Sort manually in memory to ensure stability
      const sortedDocs = [...docs].sort((a, b) => {
        const dateA = a.creado_en?.seconds || 0;
        const dateB = b.creado_en?.seconds || 0;
        return dateB - dateA;
      });
      
      setEmpresas(sortedDocs);
      
      const stats = await getSaaSGlobalStats();
      setSaasStats(stats);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

  if (!isMounted || loading || isLoadingData || profile?.rol !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pieData = saasStats ? [
    { name: 'Startup', value: saasStats.planes.Startup || saasStats.planes.Básico || 0, color: '#94A3B8' },
    { name: 'Full', value: (saasStats.planes.Full || saasStats.planes.Pro || 0) + (saasStats.planes.Enterprise || 0), color: '#00A859' },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
          secondary={`${saasStats?.totalEmpresas} totales`}
          color="bg-blue-500"
        />
        <MetricCard 
          title="Suscripciones Full" 
          value={((saasStats?.planes.Full || 0) + (saasStats?.planes.Pro || 0) + (saasStats?.planes.Enterprise || 0)).toString()} 
          icon="verified" 
          secondary="Plan total"
          color="bg-primary"
        />
        <MetricCard 
          title="En Riesgo" 
          value={empresas.filter(e => {
            const days = calculateDaysRemaining(e.fecha_vencimiento);
            return days !== null && days < 7;
          }).length.toString()} 
          icon="warning" 
          secondary="Por vencer"
          color="bg-amber-500"
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
            
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[800px] text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                    <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase text-slate-400">Cliente</th>
                    <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase text-slate-400">Plan</th>
                    <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase text-slate-400">Estado</th>
                    <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase text-slate-400">Vencimiento</th>
                    <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingData ? (
                    <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-500 italic">Cargando...</td></tr>
                  ) : empresas.map((empresa) => (
                    <tr key={empresa.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{empresa.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-mono italic">{empresa.rut}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                          empresa.plan_activo === 'Full' || empresa.plan_activo === 'Enterprise' || empresa.plan_activo === 'Pro' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {empresa.plan_activo === 'Enterprise' || empresa.plan_activo === 'Pro' ? 'Full' : 
                           empresa.plan_activo === 'Básico' ? 'Startup' : empresa.plan_activo}
                        </span>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className={`size-2 rounded-full ${empresa.estado === 'activo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className={`text-[10px] font-black uppercase ${empresa.estado === 'activo' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {empresa.estado === 'activo' ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        {empresa.fecha_vencimiento ? (
                          <div className="flex flex-col">
                            <span className="text-[11px] md:text-sm font-bold text-slate-700 dark:text-slate-200">
                              {(() => {
                                if (!empresa.fecha_vencimiento) return 'Sin fecha';
                                if (empresa.fecha_vencimiento.seconds) return new Date(empresa.fecha_vencimiento.seconds * 1000).toLocaleDateString('es-CL');
                                return new Date(empresa.fecha_vencimiento).toLocaleDateString('es-CL');
                              })()}
                            </span>
                            {(() => {
                              const days = calculateDaysRemaining(empresa.fecha_vencimiento);
                              if (days === null) return null;
                              const color = days < 3 ? 'text-red-500' : days < 10 ? 'text-amber-500' : 'text-emerald-500';
                              return (
                                <span className={`text-[10px] font-black uppercase tracking-tighter ${color}`}>
                                  {days < 0 ? 'Vencido' : `${days} días`}
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin fecha</span>
                        )}
                      </td>
                      <td className="px-4 md:px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">block</span>
                          </button>
                        </div>
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
          
          {/* Audit Log / Actividad Reciente */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 mb-6">Registro de Auditoría</h3>
            <div className="space-y-6">
              <AuditItem icon="person_add" text="Nueva empresa: Planeta X" time="Hace 2 horas" />
              <AuditItem icon="credit_score" text="Pago recibido: Empresa Demo" time="Hace 5 horas" />
              <AuditItem icon="settings" text="Cambio de plan: Transportes J" time="Ayer" />
              <AuditItem icon="shield" text="Login de seguridad realizado" time="Hace 1 día" />
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
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

function AuditItem({ icon, text, time }: { icon: string, text: string, time: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{text}</p>
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{time}</p>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, secondary, color }: { title: string, value: string, icon: string, secondary: string, color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 md:gap-6 group hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between">
        <div className={`size-10 md:size-14 rounded-xl ${color} flex items-center justify-center text-white shadow-lg`}>
          <span className="material-symbols-outlined text-xl md:text-3xl font-light">{icon}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
          <span className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">{value}</span>
        </div>
      </div>
      <div className="text-[10px] md:text-xs font-bold text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 md:pt-4 mt-auto lowercase">
        {secondary}
      </div>
    </div>
  );
}
