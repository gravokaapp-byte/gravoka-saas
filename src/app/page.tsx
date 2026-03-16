'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { 
  CreditCard, 
  Calendar,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface Guia {
  id: string;
  cliente_id: string;
  material: string;
  cantidad: number;
  total_estimado: number;
  estado: string;
  creado_en: any;
}

interface ClientMap {
  [id: string]: string;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [activeChartFilter, setActiveChartFilter] = useState('Semana Actual');

  useEffect(() => {
    if (profile?.rol === 'superadmin') {
      console.log('Redirecting superadmin to /admin');
      router.push('/admin');
    }
  }, [profile, router]);
  const [stats, setStats] = useState({ ventas: 0, volumen: 0, guias: 0 });
  const [recentGuias, setRecentGuias] = useState<Guia[]>([]);
  const [clientNames, setClientNames] = useState<ClientMap>({});
  const [empresaData, setEmpresaData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Si está cargando el profile, mostrar spinner. 
  // Pero si ya tenemos el profile, NO bloquear con isActuallyLoading si es superadmin (permitir que el router.push haga lo suyo)
  const isActuallyLoading = (isLoading || !profile) && !profile?.rol;

  useEffect(() => {
    // Fetch Empresa Data for subscription info
    const fetchEmpresa = async () => {
      if (!profile) return;
      const eDoc = await getDoc(doc(db, 'empresas', profile.empresa_id!));
      if (eDoc.exists()) setEmpresaData(eDoc.data());
    };
    fetchEmpresa();

    // Listen to Clients to map IDs to Names
    const clientsQ = query(collection(db, 'clientes'), where('empresa_id', '==', profile?.empresa_id || ''));
    const unsubClients = onSnapshot(clientsQ, (snapshot) => {
      const cmap: ClientMap = {};
      snapshot.forEach(doc => {
        cmap[doc.id] = doc.data().name;
      });
      setClientNames(cmap);
    });

    // Listen to Guias
    const guiasQ = query(
      collection(db, 'guias'), 
      where('empresa_id', '==', profile?.empresa_id || ''),
      orderBy('creado_en', 'desc')
    );
    
    const unsubGuias = onSnapshot(guiasQ, (snapshot) => {
      let totalVentas = 0;
      let totalVolumen = 0;
      const guiasData: Guia[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as Guia;
        totalVentas += data.total_estimado || 0;
        totalVolumen += data.cantidad || 0;
        guiasData.push({ ...data, id: doc.id });
      });

      setStats({
        ventas: totalVentas,
        volumen: totalVolumen,
        guias: snapshot.size
      });

      // Keep only top 5 for the table
      setRecentGuias(guiasData.slice(0, 5));
      setIsLoading(false);
    });

    return () => {
      unsubClients();
      unsubGuias();
    };
  }, [profile?.empresa_id]);

  const handleExport = () => {
    alert('Generando reporte semanal en PDF... Descarga iniciada.');
  };

  const chartData = [
    { day: 'LUN', height: '60%', color: 'bg-primary' },
    { day: 'MAR', height: '45%', color: 'bg-primary' },
    { day: 'MIE', height: '85%', color: 'bg-primary' },
    { day: 'JUE', height: '30%', color: 'bg-primary/40' },
    { day: 'VIE', height: '70%', color: 'bg-primary' },
    { day: 'SAB', height: '95%', color: 'bg-primary' },
    { day: 'DOM', height: '15%', color: 'bg-slate-200 dark:bg-slate-800' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  const parseDate = (dateField: any) => {
    if (!dateField) return null;
    if (dateField.seconds) return new Date(dateField.seconds * 1000); // Firestore Timestamp
    if (typeof dateField === 'string') return new Date(dateField); // ISO String
    if (dateField instanceof Date) return dateField;
    return null;
  };

  const daysRemaining = () => {
    const rawDate = empresaData?.fecha_vencimiento || empresaData?.vencimiento;
    const expiry = parseDate(rawDate);
    if (!expiry) return null;
    
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isActuallyLoading) {
    return (
      <div className="w-full flex justify-center py-20 min-h-screen items-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-slate-500 font-medium">
            {profile?.rol === 'superadmin' ? 'Redirigiendo al Panel SaaS...' : 'Cargando datos...'}
          </p>
        </div>
      </div>
    );
  }

  // --- LANDING PAGE PARA INVITADOS ---
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white selection:bg-primary selection:text-white overflow-x-hidden">
        {/* Nav */}
        <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center backdrop-blur-md bg-slate-950/50 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-2xl">rocket_launch</span>
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Gravoka</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Entrar</Link>
            <Link href="/registro" className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              Comenzar Ahora
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="relative pt-40 pb-32 px-8 flex flex-col items-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-20">
             <div className="absolute top-[20%] left-[10%] w-64 h-64 bg-primary blur-[120px] rounded-full"></div>
             <div className="absolute top-[40%] right-[10%] w-96 h-96 bg-blue-500 blur-[150px] rounded-full"></div>
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-xl animate-bounce">
            <span className="size-2 bg-primary rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Versión 2.0 Operativa</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-center max-w-4xl mb-8 leading-[0.9]">
             DIGITALIZA TU <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">PLANTA</span> EN MINUTOS
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 text-center max-w-2xl mb-12 font-medium">
            Control de pesaje, guías de despacho y analítica BI para empresas de áridos. Todo en la nube, todo en tiempo real.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
             <Link href="/registro" className="px-10 py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
               Empieza Gratis <span className="material-symbols-outlined font-bold">arrow_forward</span>
             </Link>
             <Link href="/login" className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-lg hover:bg-white/10 transition-all">
               Ver Demo
             </Link>
          </div>

          {/* Mockup Preview */}
          <div className="mt-24 w-full max-w-5xl bg-slate-900 border border-white/10 rounded-[40px] p-4 shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden">
             <div className="aspect-video bg-slate-800 rounded-[28px] overflow-hidden flex items-center justify-center p-8 grayscale opacity-50 border border-white/5 relative">
                <span className="material-symbols-outlined text-9xl text-white/5">dashboard</span>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                <div className="absolute bottom-12 left-12">
                   <p className="text-2xl font-black">Control Total</p>
                   <p className="text-sm text-slate-500">Analítica avanzada integrada</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Subscription Banner */}
      {empresaData && (
        <div className={`p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border ${
          (daysRemaining() || 0) < 7 
            ? 'bg-amber-50 border-amber-200 text-amber-800' 
            : 'bg-primary/5 border-primary/10 text-primary-dark font-medium'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`size-12 rounded-xl flex items-center justify-center ${
              (daysRemaining() || 0) < 7 ? 'bg-amber-100' : 'bg-primary/10'
            }`}>
              {empresaData.plan_activo === 'Enterprise' ? <Zap className="size-6 text-primary" /> : <CreditCard className="size-6" />}
            </div>
            <div>
              <p className="text-sm font-black flex items-center gap-2">
                Plan {empresaData.plan_activo || 'Pro'}
                <span className="text-[10px] uppercase bg-white/50 px-2 py-0.5 rounded-full border border-current/20">Activo</span>
              </p>
              <p className="text-xs opacity-70">
                Tu suscripción vence el {parseDate(empresaData.fecha_vencimiento || empresaData.vencimiento)?.toLocaleDateString('es-CL') || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase opacity-60">Tiempo restante</p>
              <p className="text-lg font-black tracking-tighter">
                {daysRemaining() === null ? 'Pendiente' : `${daysRemaining()} días`}
              </p>
            </div>
            <button className="px-6 py-2.5 bg-primary text-white rounded-xl font-black text-xs shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              Renovar o Cambiar Plan
            </button>
          </div>
        </div>
      )}
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas Totales</span>
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-bold dark:text-white">{formatCurrency(stats.ventas)}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-2">Histórico acumulado</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">m3 Despachados</span>
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">view_in_ar</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-bold dark:text-white">{stats.volumen} m³</h3>
          </div>
          <p className="text-xs text-slate-400 mt-2">Volumen histórico</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between mb-2">
             <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Guías Emitidas</span>
             <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">confirmation_number</span>
             </div>
          </div>
          <div className="flex items-end gap-2">
             <h3 className="text-3xl font-bold dark:text-white">{stats.guias}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-2">Operaciones registradas</p>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-lg font-bold dark:text-white">Ventas Semanales</h4>
              <p className="text-sm text-slate-500">Distribución de ingresos últimos 7 días</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveChartFilter('Semana Actual')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                  activeChartFilter === 'Semana Actual' 
                    ? 'bg-slate-100 dark:bg-slate-800 dark:text-white' 
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Semana Actual
              </button>
              <button 
                onClick={handleExport}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Exportar
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between h-64 px-4">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center gap-2 w-full max-w-[40px]">
                <div className={`w-full rounded-t-lg transition-all duration-500 ${data.color}`} style={{ height: data.height }}></div>
                <span className="text-[10px] font-semibold text-slate-400">{data.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side Card / Activity */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <span className="material-symbols-outlined text-9xl">analytics</span>
          </div>
          <h4 className="text-lg font-bold dark:text-white mb-6">Módulo Activo</h4>
          <div className="space-y-6">
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
               <p className="text-sm font-bold text-primary mb-2">Conexión a Firestore</p>
               <p className="text-xs text-slate-600 dark:text-slate-300">Este panel está monitoreando en tiempo real las operaciones de <b>{profile?.nombre || 'tu empresa'}</b>.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Last Guides List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-lg font-bold dark:text-white">Últimas guías emitidas</h4>
          <Link href="/guias" className="text-primary text-sm font-semibold hover:underline">
            Nueva Guía
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Documento</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Material</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-center">Cantidad</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentGuias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">No hay guías registradas en el sistema.</td>
                </tr>
              ) : (
                recentGuias.map((guia) => (
                  <tr key={guia.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">
                      ID: {guia.id.substring(0, 6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {clientNames[guia.cliente_id] || 'Cliente Desconocido'}
                    </td>
                    <td className="px-6 py-4 text-sm">{guia.material}</td>
                    <td className="px-6 py-4 text-sm text-center font-bold bg-primary/5">{guia.cantidad} m³</td>
                    <td className="px-6 py-4 text-sm text-right font-medium">
                      {formatCurrency(guia.total_estimado)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
