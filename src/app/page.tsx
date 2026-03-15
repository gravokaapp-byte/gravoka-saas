'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

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
      router.push('/admin');
    }
  }, [profile, router]);
  
  const [stats, setStats] = useState({ ventas: 0, volumen: 0, guias: 0 });
  const [recentGuias, setRecentGuias] = useState<Guia[]>([]);
  const [clientNames, setClientNames] = useState<ClientMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.empresa_id) return;

    // Listen to Clients to map IDs to Names
    const clientsQ = query(collection(db, 'clientes'), where('empresa_id', '==', profile.empresa_id));
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
      where('empresa_id', '==', profile.empresa_id),
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

  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
