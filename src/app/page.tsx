'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import * as XLSX from 'xlsx';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { 
  CreditCard, 
  Calendar,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface Guia {
  id: string;
  numero_guia?: number;
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
  const { profile, loading } = useAuth();
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
  const [isMounted, setIsMounted] = useState(false);
  const [allGuias, setAllGuias] = useState<Guia[]>([]);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Loading is true only if we are still determining auth OR if we have a profile and are fetching data
  const isActuallyLoading = loading || (!!profile && isLoading);

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
      setAllGuias(guiasData);
      setIsLoading(false);
    });

    return () => {
      unsubClients();
      unsubGuias();
    };
  }, [profile?.empresa_id]);

  const handleExport = () => {
    if (allGuias.length === 0) {
      alert('No hay guías para exportar en el rango semanal.');
      return;
    }

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Filtrar guías de la última semana
    const weeklyGuias = allGuias.filter(g => {
      const gDate = parseDate(g.creado_en);
      return gDate && gDate >= last7Days;
    });

    if (weeklyGuias.length === 0) {
      alert('No se encontraron guías en los últimos 7 días.');
      return;
    }

    // Preparar datos para Excel
    const data = weeklyGuias.map(g => ({
      'ID Guía': g.id,
      'Cliente': clientNames[g.cliente_id] || 'Cargando...',
      'Material': g.material,
      'Cantidad (m3)': g.cantidad,
      'Total Estimado': g.total_estimado,
      'Estado': g.estado,
      'Fecha': parseDate(g.creado_en)?.toLocaleDateString('es-CL')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas Semanales");
    
    XLSX.writeFile(wb, `Ventas_Semanales_${now.toISOString().split('T')[0]}.xlsx`);
  };

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

  const chartData = useMemo(() => {
    const daysArr = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    const result = [];
    const now = new Date();
    
    // Generar últimos 7 días terminando hoy
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = d.toDateString();
      
      let totalDia = 0;
      allGuias.forEach(g => {
        const gDate = parseDate(g.creado_en);
        if (gDate && gDate.toDateString() === dStr) {
          totalDia += g.total_estimado || 0;
        }
      });

      result.push({
        day: daysArr[d.getDay()],
        total: totalDia,
        date: d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
      });
    }

    const maxTotal = Math.max(...result.map(r => r.total), 1);
    
    return result.map(r => ({
      ...r,
      height: `${(r.total / maxTotal) * 100}%`,
      color: r.total > 0 ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'
    }));
  }, [allGuias]);

  if (!isMounted || isActuallyLoading) {
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
        <div className={`p-3 md:p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border ${
          (daysRemaining() || 0) < 7 
            ? 'bg-amber-50 border-amber-200 text-amber-800' 
            : 'bg-primary/5 border-primary/10 text-primary-dark font-medium'
        }`}>
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
            <div className={`size-10 md:size-12 rounded-xl flex items-center justify-center ${
              (daysRemaining() || 0) < 7 ? 'bg-amber-100' : 'bg-primary/10'
            }`}>
              {empresaData.plan_activo === 'Enterprise' ? <Zap className="size-5 md:size-6 text-primary" /> : <CreditCard className="size-5 md:size-6" />}
            </div>
            <div>
              <p className="text-xs md:text-sm font-black flex items-center gap-2">
                Plan {empresaData.plan_activo || 'Pro'}
                <span className="text-[10px] uppercase bg-white/50 px-2 py-0.5 rounded-full border border-current/20">Activo</span>
              </p>
              <p className="text-[10px] md:text-xs opacity-70">
                Vence el {parseDate(empresaData.fecha_vencimiento || empresaData.vencimiento)?.toLocaleDateString('es-CL') || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 w-full md:w-auto">
            <div className="text-left md:text-right">
              <p className="text-[10px] font-black uppercase opacity-60">Días restantes</p>
              <p className="text-sm md:text-lg font-black tracking-tighter">
                {daysRemaining() === null ? 'Pendiente' : `${daysRemaining()} días`}
              </p>
            </div>
            <button className="px-4 py-2 bg-primary text-white rounded-xl font-black text-[10px] md:text-xs shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
              Renovar
            </button>
          </div>
        </div>
      )}
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] md:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas Totales</span>
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(stats.ventas)}</h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic">Histórico acumulado</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] md:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">m³ Despachados</span>
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">view_in_ar</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{stats.volumen} m³</h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic">Volumen histórico</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] md:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Guías Emitidas</span>
             <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">confirmation_number</span>
             </div>
          </div>
          <div className="flex items-end gap-2">
             <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{stats.guias}</h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic">Operaciones registradas</p>
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
              <div key={index} className="flex flex-col items-center gap-2 w-full max-w-[40px] h-full group relative" title={`${data.day}: ${formatCurrency(data.total)}`}>
                <div className={`w-full rounded-t-lg transition-all duration-500 overflow-hidden relative ${data.color}`} style={{ height: data.height || '2px' }}>
                  {data.total > 0 && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-slate-400">{data.day}</span>
                {/* Tooltip simple */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xl border border-white/10">
                  {formatCurrency(data.total)}
                </div>
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
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 md:px-6 py-3 text-[10px] md:text-xs font-black text-slate-500 uppercase w-[80px] md:w-auto">Doc</th>
                <th className="px-4 md:px-6 py-3 text-[10px] md:text-xs font-black text-slate-500 uppercase">Cliente</th>
                <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-[10px] md:text-xs font-black text-slate-500 uppercase">Material</th>
                <th className="px-4 md:px-6 py-3 text-[10px] md:text-xs font-black text-slate-500 uppercase text-center">Cant.</th>
                <th className="px-4 md:px-6 py-3 text-[10px] md:text-xs font-black text-slate-500 uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentGuias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm italic">No hay guías registradas.</td>
                </tr>
              ) : (
                recentGuias.map((guia) => (
                  <tr key={guia.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 md:px-6 py-4 font-mono text-[10px] md:text-xs text-slate-400 italic">
                      {guia.numero_guia ? `N° ${guia.numero_guia.toString().padStart(6, '0')}` : `#${guia.id.substring(0, 4).toUpperCase()}`}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="text-[10px] md:text-sm font-black text-slate-900 dark:text-white uppercase leading-tight truncate max-w-[120px] md:max-w-none">
                        {clientNames[guia.cliente_id] || 'Cargando...'}
                      </div>
                      <div className="sm:hidden text-[9px] text-slate-400 font-medium truncate max-w-[120px]">
                        {guia.material}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{guia.material}</td>
                    <td className="px-2 md:px-6 py-4 text-xs md:text-sm text-center font-black text-primary italic bg-primary/5">{guia.cantidad}m³</td>
                    <td className="px-4 md:px-6 py-4 text-xs md:text-sm text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
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
