'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { processBIStats, filterByRange, GuiaData } from '@/lib/bi-engine';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Calendar, 
  Filter, 
  Search, 
  ChevronDown, 
  Circle, 
  CheckCircle2, 
  XCircle,
  Truck,
  Users,
  Package,
  MapPin,
  Printer,
  X,
  BarChart3,
  DollarSign,
  List,
  TrendingUp
} from 'lucide-react';

export default function ReportesPage() {
  const { profile, effectivePlan, loading } = useAuth();
  const router = useRouter();
  const [guias, setGuias] = useState<GuiaData[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Plan redirect removed to allow testing/access as requested.
  /*
  useEffect(() => {
    if (!loading && effectivePlan !== 'Full') {
      router.push('/');
    }
  }, [loading, effectivePlan, router]);
  */
  
  const [timeRange, setTimeRange] = useState<'dia' | 'semana' | 'mes' | 'todos'>('todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [clientFilter, setClientFilter] = useState('Todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reprintGuia, setReprintGuia] = useState<GuiaData | null>(null);
  const [editingGuia, setEditingGuia] = useState<GuiaData | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'drivers' | 'clients' | 'operational' | 'collection'>('summary');
  const [isPrintingModal, setIsPrintingModal] = useState(false);

  useEffect(() => {
    if (!profile?.empresa_id) return;

    // Fetch Config
    getDoc(doc(db, 'configuracion_empresa', profile.empresa_id)).then((snap: any) => {
      if (snap.exists()) setConfig(snap.data());
    });

    const qClients = query(collection(db, 'clientes'), where('empresa_id', '==', profile.empresa_id));
    const clientNames: Record<string, string> = {};
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      snapshot.docs.forEach(doc => {
        clientNames[doc.id] = doc.data().name;
      });
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qGuias = query(
      collection(db, 'guias'), 
      where('empresa_id', '==', profile.empresa_id),
      orderBy('creado_en', 'desc')
    );
    
    const unsubGuias = onSnapshot(qGuias, (snapshot) => {
      setGuias(snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          ...data, 
          id: doc.id,
          cliente_nombre: data.cliente_nombre || clientNames[data.cliente_id] || (data.cliente_id !== 'esporadico' ? data.cliente_id : 'Cliente Ocasional'),
          material_nombre: data.material_nombre || data.material || 'S/N'
        } as GuiaData;
      }));
      setIsLoading(false);
    });

    return () => {
      unsubClients();
      unsubGuias();
    };
  }, [profile?.empresa_id]);

  const updateGuiaStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'guias', id), { estado: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredGuias = useMemo(() => {
    let result = filterByRange(guias, timeRange);
    if (statusFilter !== 'Todos') result = result.filter(g => g.estado === statusFilter);
    if (clientFilter !== 'Todos') result = result.filter(g => g.cliente_id === clientFilter);
    return result;
  }, [guias, timeRange, statusFilter, clientFilter]);

  const stats = useMemo(() => processBIStats(filteredGuias), [filteredGuias]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'guias', id), { estado: newStatus });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const exportToExcel = () => {
    // 1. Hoja de Resumen General
    const summaryData = [
      { Metrica: 'Ventas Totales', Valor: stats.summary.revenue },
      { Metrica: 'M3 Despachados', Valor: stats.summary.volume },
      { Metrica: 'Utilidad Neta Estimada', Valor: stats.summary.revenue - stats.summary.flete },
      { Metrica: 'Total Operaciones', Valor: stats.summary.operations },
      { Metrica: 'Rango de Tiempo', Valor: timeRange.toUpperCase() },
      { Metrica: 'Fecha de Reporte', Valor: new Date().toLocaleDateString('es-CL') }
    ];

    // 2. Hoja de Rendimiento de Choferes
    const driversData = stats.allDrivers.map(d => ({
      Chofer: d.nombre,
      Viajes: d.viajes,
      'Volumen (m³)': d.m3,
      'Flete Total ($)': d.flete,
      'Eficiencia (m³/viaje)': d.efficiency
    }));

    // 3. Hoja de Rentabilidad por Cliente
    const clientsData = stats.allClients.map(c => ({
      Cliente: c.nombre,
      'Volumen (m³)': c.m3,
      'Venta Bruta ($)': c.revenue,
      'Costo Flete ($)': c.freight,
      'Margen Neto ($)': c.margin,
      '% Margen': (c.margin_percent / 100)
    }));

    // 4. Hoja de Detalle Operativo
    const operativeData = filteredGuias.map(g => ({
      'N° Guía': g.numero_guia ? g.numero_guia.toString().padStart(6, '0') : 'N/A',
      Fecha: g.creado_en?.toDate().toLocaleDateString('es-CL') || 'N/A',
      Cliente: g.cliente_nombre,
      'O.C. / Ref': g.orden_compra || 'S/N',
      Material: g.material_nombre,
      'Cantidad (m³)': g.cantidad,
      'Precio Unitario ($)': g.precio_unitario_aplicado || (g.total_estimado / (g.cantidad || 1)),
      'Venta Bruta ($)': g.total_estimado,
      'Costo flete ($)': g.flete_costo || 0,
      'Utilidad Real ($)': g.total_estimado - (g.flete_costo || 0),
      Camion: g.camion_patente,
      Chofer: g.conductor_nombre,
      Obra: g.obra || 'N/A',
      'Método de Pago': g.metodo_pago?.toUpperCase() || 'N/A',
      'Nro Factura': g.nro_factura || 'N/A',
      Estado: g.estado
    }));

    // Crear el Libro
    const wb = XLSX.utils.book_new();
    
    // Crear las hojas
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsDrivers = XLSX.utils.json_to_sheet(driversData);
    const wsClients = XLSX.utils.json_to_sheet(clientsData);
    const wsOperative = XLSX.utils.json_to_sheet(operativeData);

    // Agregar hojas al libro
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsDrivers, "Choferes");
    XLSX.utils.book_append_sheet(wb, wsClients, "Clientes");
    XLSX.utils.book_append_sheet(wb, wsOperative, "Operaciones");

    // Escribir el archivo
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `Reporte_General_Gravoka_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

  if (!isMounted || isLoading) return <div className="p-8 animate-pulse text-slate-500">Cargando Inteligencia de Datos...</div>;

  return (
    <>
      <div className={`flex-1 w-full bg-slate-50 dark:bg-[#020617] pb-20 ${isPrintingModal ? 'print:hidden' : ''}`}>
        <main className="px-2 md:px-10 py-4 md:py-8 max-w-[1600px] mx-auto w-full">
        
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-[0.2em] mb-2">
              <Circle className="size-2 fill-primary animate-pulse" />
              BI & Analytics
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              Control de Planta
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Visibilidad total de ingresos, flota y materiales.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {[
              { id: 'dia', label: 'Hoy' },
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mes' },
              { id: 'todos', label: 'Histórico' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setTimeRange(r.id as any)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  timeRange === r.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-2 invisible sm:visible" />
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-600/20"
            >
              <FileSpreadsheet className="size-4" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200 dark:border-slate-800 mb-8 -mx-2 md:mx-0 px-2 md:px-0">
          <div className="flex flex-nowrap min-w-max gap-1 md:gap-2">
            {[
              { id: 'summary', label: 'Resumen General', icon: 'dashboard' },
              { id: 'drivers', label: 'Rendimiento Choferes', icon: 'local_shipping' },
              { id: 'clients', label: 'Rentabilidad Clientes', icon: 'group' },
              { id: 'operational', label: 'Detalle Operativo', icon: 'list_alt' },
              { id: 'collection', label: 'Balance de Cobranza', icon: 'payments' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-primary text-primary bg-primary/5' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'summary' && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard title="Ventas Totales" value={formatCurrency(stats.summary.revenue)} icon={<Circle className="text-primary" />} />
              <StatCard title="M3 Despachados" value={`${stats.summary.volume.toFixed(1)} m³`} icon={<Package className="text-blue-500" />} />
              <StatCard 
                title="Utilidad Neta" 
                value={effectivePlan === 'Startup' ? 'Plan Full' : formatCurrency(stats.summary.revenue - stats.summary.flete)} 
                icon={<CheckCircle2 className="text-emerald-500" />} 
              />
              <StatCard title="Operaciones" value={stats.summary.operations.toString()} icon={<Truck className="text-orange-500" />} />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <h3 className="text-xl font-black mb-8">Ventas Últimos 7 Días</h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.weeklySalesData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00E699" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00E699" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(v) => formatCurrency(v as number)}
                      />
                      <Area type="monotone" dataKey="ventas" stroke="#00E699" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <Package className="size-4" /> Top Productos (m³)
                </h3>
                <div className="space-y-4">
                  {stats.topProducts.map(p => (
                    <div key={p.nombre} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{p.nombre}</span>
                        <span className="text-xs font-black text-primary">{p.m3.toFixed(1)} m³</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${Math.min(100, (p.m3 / (stats.topProducts[0]?.m3 || 1)) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'drivers' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                <h3 className="text-xl font-black mb-6">Ranking de Productividad</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="py-4 text-[10px] font-black uppercase text-slate-400">Chofer</th>
                        <th className="py-4 text-[10px] font-black uppercase text-slate-400 text-center">Viajes</th>
                        <th className="py-4 text-[10px] font-black uppercase text-slate-400 text-center">Total m³</th>
                        <th className="py-4 text-[10px] font-black uppercase text-slate-400 text-center">Flete Total</th>
                        <th className="py-4 text-[10px] font-black uppercase text-slate-400 text-right">Eficiencia (m³/viaje)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {stats.allDrivers.map(d => (
                        <tr key={d.nombre} className="hover:bg-slate-50/50">
                          <td className="py-4 font-bold uppercase text-sm">{d.nombre}</td>
                          <td className="py-4 text-center font-black text-blue-500">{d.viajes}</td>
                          <td className="py-4 text-center font-bold">{d.m3.toFixed(1)}</td>
                          <td className="py-4 text-center text-slate-500">{formatCurrency(d.flete)}</td>
                          <td className="py-4 text-right">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black">
                              {d.efficiency.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                <h3 className="text-xl font-black mb-6 italic text-slate-400">Distribución de Viajes</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.topDrivers}
                        dataKey="viajes"
                        nameKey="nombre"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                      >
                        {stats.topDrivers.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                 <h3 className="text-2xl font-black">Análisis de Rentabilidad por Cliente</h3>
                 <p className="text-slate-500 text-sm">Margen neto después de costos de transporte (Flete).</p>
               </div>
               <div className="overflow-x-auto scrollbar-none md:scrollbar-thin">
                 <table className="w-full min-w-full md:min-w-[1000px] text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50 dark:bg-slate-950/50">
                       <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Cliente</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Volumen (m³)</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Venta Bruta</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Costo Flete</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Margen Neto</th>
                       <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 text-right">% Margen</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                     {stats.allClients.map(c => (
                       <tr key={c.nombre} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-8 py-5 font-black uppercase text-slate-900 dark:text-white truncate max-w-[200px]">{c.nombre}</td>
                         <td className="px-6 py-5 text-right font-bold text-blue-500">{c.m3.toFixed(1)}</td>
                         <td className="px-6 py-5 text-right text-sm">{formatCurrency(c.revenue)}</td>
                         <td className="px-6 py-5 text-right text-sm text-red-400">{formatCurrency(c.freight)}</td>
                         <td className="px-6 py-5 text-right font-black text-emerald-500">{formatCurrency(c.margin)}</td>
                         <td className="px-8 py-5 text-right">
                           <div className="flex flex-col items-end gap-1">
                             <span className={`text-xs font-black ${c.margin_percent > 30 ? 'text-emerald-500' : 'text-orange-500'}`}>
                               {c.margin_percent.toFixed(1)}%
                             </span>
                             <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                               <div 
                                 className={`h-full ${c.margin_percent > 30 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                 style={{ width: `${Math.min(100, c.margin_percent)}%` }}
                               />
                             </div>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'operational' && (
          <div className="animate-in fade-in duration-500">
            {/* List of Guides (Existing Logic) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h3 className="text-xl font-black">Detalle Operativo completo</h3>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <select 
                    value={clientFilter} 
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold px-4 py-2 w-full sm:w-auto"
                  >
                    <option value="Todos">Todos los Clientes</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold px-4 py-2 w-full sm:w-auto"
                  >
                    <option value="Todos">Todos los Estados</option>
                    <option value="Emitida">Emitida</option>
                    <option value="Pagada">Pagada</option>
                    <option value="Anulada">Anulada</option>
                  </select>
                </div>
              </div>
              <div className="w-full overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[1000px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Guía / Fecha</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Cliente / Material</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Detalles Extra</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Cantidad</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Flujo de Caja</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredGuias.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-5">
                          <div className="flex flex-col truncate">
                            <span className="text-[11px] font-mono font-black text-primary truncate">
                              {g.numero_guia ? `N° ${g.numero_guia.toString().padStart(6, '0')}` : g.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-sm font-bold">{g.creado_en?.toDate().toLocaleDateString('es-CL')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col truncate max-w-[250px]">
                            <span className="text-sm font-black uppercase truncate">{g.cliente_nombre}</span>
                            <span className="text-xs text-slate-500 truncate">{g.material_nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1 text-[10px]">
                            {g.orden_compra && <span className="font-bold text-slate-700 dark:text-slate-300">O.C.: {g.orden_compra}</span>}
                            <span className="text-slate-500">Transp: {g.camion_patente}</span>
                            <span className="text-slate-400 truncate max-w-[150px] italic">{g.obra || 'S/N Obra'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="font-black text-blue-600 dark:text-blue-400">{g.cantidad} m³</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">Venta: {formatCurrency(g.total_estimado)}</span>
                            <span className="text-xs text-emerald-500 font-bold">Ganancia: {formatCurrency(g.total_estimado - (g.flete_costo || 0))}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button onClick={() => setEditingGuia(g)} title="Editar Guía" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-all"><Circle className="size-4" /></button>
                             <button onClick={() => setReprintGuia(g)} title="Imprimir" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-all"><Printer className="size-4" /></button>
                             
                             <select 
                               value={g.estado}
                               onChange={(e) => updateGuiaStatus(g.id, e.target.value)}
                               className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border-none focus:ring-0 cursor-pointer transition-all ${
                                 g.estado === 'Emitida' ? 'bg-blue-100 text-blue-600' : 
                                 g.estado === 'Pagada' ? 'bg-emerald-100 text-emerald-600' :
                                 g.estado === 'Anulada' ? 'bg-red-100 text-red-600' :
                                 'bg-slate-100 text-slate-600'
                               }`}
                             >
                                <option value="Emitida">Emitida</option>
                                <option value="Pagada">Pagada</option>
                                <option value="Anulada">Anulada</option>
                             </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'collection' && (
          <div className="animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h3 className="text-2xl font-black italic">Balance de Cobranzas Pendientes</h3>
                  <p className="text-slate-500 text-sm">Listado de guías con estado "Emitida" (Por Cobrar).</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <p className="text-[10px] font-black text-blue-500 uppercase">Total por Cobrar</p>
                  <p className="text-2xl font-black text-blue-600">
                    {formatCurrency(guias.filter(g => g.estado === 'Emitida').reduce((acc, curr) => acc + (curr.total_estimado || 0), 0))}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Guía</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Cliente</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Fecha</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Monto</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {guias.filter(g => g.estado === 'Emitida').map(g => (
                      <tr key={g.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono font-black text-primary">N° {g.numero_guia || g.id.slice(-6).toUpperCase()}</td>
                        <td className="px-6 py-4 font-bold">{g.cliente_nombre}</td>
                        <td className="px-6 py-4 text-sm">{g.creado_en?.toDate().toLocaleDateString('es-CL')}</td>
                        <td className="px-6 py-4 text-right font-black text-blue-600">{formatCurrency(g.total_estimado)}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => updateGuiaStatus(g.id, 'Pagada')}
                            className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                          >
                            Marcar Pagada
                          </button>
                        </td>
                      </tr>
                    ))}
                    {guias.filter(g => g.estado === 'Emitida').length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No hay cobros pendientes.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>

    {editingGuia && (
      <EditGuiaModal 
        guia={editingGuia} 
        clients={clients}
        onClose={() => setEditingGuia(null)} 
        onSave={async (updatedData) => {
          await updateDoc(doc(db, 'guias', editingGuia.id), updatedData);
          setEditingGuia(null);
        }}
      />
    )}

    {reprintGuia && (
      <ReprintModal 
        guia={reprintGuia} 
        config={config} 
        profile={profile} 
        onClose={() => {
          setReprintGuia(null);
          setIsPrintingModal(false);
        }} 
        onPrintChange={setIsPrintingModal}
      />
    )}
  </>
);
}

function EditGuiaModal({ guia, clients, onClose, onSave }: { guia: GuiaData, clients: any[], onClose: () => void, onSave: (data: any) => Promise<void> }) {
  const [formData, setFormData] = useState({
    cliente_id: guia.cliente_id || '',
    cliente_nombre: guia.cliente_nombre || '',
    obra: guia.obra || '',
    material_nombre: guia.material_nombre || '',
    cantidad: guia.cantidad || 0,
    total_estimado: guia.total_estimado || 0,
    flete_costo: guia.flete_costo || 0,
    orden_compra: guia.orden_compra || '',
    nro_factura: guia.nro_factura || guia.factura || '',
    camion_patente: guia.camion_patente || '',
    conductor_nombre: guia.conductor_nombre || '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
        <form onSubmit={handleSubmit} className="p-8 md:p-12">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-black italic tracking-tighter">Modificar Guía</h2>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">N° {guia.numero_guia || guia.id.slice(-6).toUpperCase()}</p>
            </div>
            <button type="button" onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-all"><X className="size-6" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Cliente</span>
                <select 
                  value={formData.cliente_id} 
                  onChange={(e) => {
                    const c = clients.find(cl => cl.id === e.target.value);
                    setFormData({...formData, cliente_id: e.target.value, cliente_nombre: c?.name || 'Cliente Ocasional'});
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-primary/20"
                >
                  <option value="esporadico">Cliente Ocasional</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Obra / Destino</span>
                <input 
                  type="text" 
                  value={formData.obra} 
                  onChange={(e) => setFormData({...formData, obra: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-primary/20"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Orden de Compra</span>
                <input 
                  type="text" 
                  value={formData.orden_compra} 
                  onChange={(e) => setFormData({...formData, orden_compra: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-primary/20"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Factura Vinc.</span>
                <input 
                  type="text" 
                  value={formData.nro_factura} 
                  onChange={(e) => setFormData({...formData, nro_factura: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-primary/20"
                />
              </label>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Cantidad (m³)</span>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formData.cantidad} 
                    onChange={(e) => setFormData({...formData, cantidad: Number(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-primary/20"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Venta Total</span>
                  <input 
                    type="number" 
                    value={formData.total_estimado} 
                    onChange={(e) => setFormData({...formData, total_estimado: Number(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-primary/20"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Costo Flete</span>
                <input 
                  type="number" 
                  value={formData.flete_costo} 
                  onChange={(e) => setFormData({...formData, flete_costo: Number(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-primary/20 text-red-500"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Patente Camión</span>
                <input 
                  type="text" 
                  value={formData.camion_patente} 
                  onChange={(e) => setFormData({...formData, camion_patente: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-primary/20"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Conductor</span>
                <input 
                  type="text" 
                  value={formData.conductor_nombre} 
                  onChange={(e) => setFormData({...formData, conductor_nombre: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold focus:ring-2 ring-primary/20"
                />
              </label>
            </div>
          </div>

          <div className="mt-12 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
            >
              Cerrar
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-[2] py-5 bg-primary text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: any, trend?: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">{trend}</span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">{value}</p>
      </div>
    </div>
  );
}

function PremiumOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/10 dark:bg-slate-900/10 backdrop-blur-[2px] z-10 p-6 text-center">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Circle className="size-6 text-primary fill-primary animate-pulse" />
        </div>
        <h4 className="text-lg font-black tracking-tight mb-1">Métrica Premium</h4>
        <p className="text-xs text-slate-500 mb-6 max-w-[180px] mx-auto leading-relaxed">
          Esta analítica detallada es exclusiva para usuarios del <b>Plan Full</b>.
        </p>
        <button className="w-full py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
          Mejorar Plan
        </button>
      </div>
    </div>
  );
}

function ReprintModal({ guia, config, profile, onClose, onPrintChange }: { guia: GuiaData; config: any; profile: any; onClose: () => void; onPrintChange: (printing: boolean) => void }) {
  const numStr = guia.numero_guia ? guia.numero_guia.toString().padStart(6, '0') : guia.id.slice(-6).toUpperCase();
  const copies = [
    { label: 'COPIA CLIENTE', key: 'client' },
    { label: 'COPIA INTERNA', key: 'internal' },
  ];

  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    onPrintChange(showPreview);
  }, [showPreview, onPrintChange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  return (
    <>
      {!showPreview ? (
        <div className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center no-print p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center">
            <h2 className="text-xl font-black mb-1">Reimprimir Guía</h2>
            <p className="text-slate-500 text-sm mb-1">Guía <span className="font-mono font-black text-primary">N° {numStr}</span></p>
            <p className="text-slate-500 text-sm mb-6 truncate">{guia.cliente_nombre}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowPreview(true)}
                className="w-full px-6 py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                Ver Previa de Impresión
              </button>
              <button
                onClick={onClose}
                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`${showPreview ? 'fixed inset-0 overflow-y-auto bg-slate-100 z-[99999]' : 'hidden'} print:block print:static print:bg-white text-black print-container-root`}>
        {showPreview && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100000] flex gap-3 no-print print:hidden bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-white">
            <button
              onClick={() => window.print()}
              className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all no-print print:hidden"
            >
              <Printer className="size-5 no-print" /> Imprimir Guía
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="px-6 py-3 rounded-xl bg-slate-800 text-white font-bold shadow-xl hover:bg-slate-900 transition-all no-print print:hidden"
            >
              Cerrar Previa
            </button>
          </div>
        )}
        
        <div className="max-w-[21cm] mx-auto py-24 px-4 print:p-0 print:m-0 print:max-w-none">
          {[
            { label: 'COPIA CLIENTE', key: 'client' },
            { label: 'COPIA INTERNA', key: 'internal' }
          ].map((copy, index) => (
          <div key={copy.key} className="reprint-copy p-10">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex gap-4 items-center">
                {config?.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="max-h-16 w-auto" />
                ) : (
                  <div className="size-16 rounded border flex items-center justify-center bg-slate-100 text-[10px] text-slate-400 font-bold uppercase">Logo</div>
                )}
                <div className="flex flex-col">
                  <h1 className="text-xl font-black uppercase text-slate-900 leading-tight">{config?.nombre_empresa || 'Gravoka SpA'}</h1>
                  <p className="text-xs font-bold">{config?.rut || 'RUT 77.XXX.XXX-X'}</p>
                  <p className="text-[10px] text-slate-500">{config?.direccion || 'Matriz de Operaciones'}</p>
                </div>
              </div>
              <div className="text-right border-2 border-red-500 p-3 rounded shrink-0 w-full sm:w-auto">
                <h3 className="text-red-500 font-bold text-[10px] sm:text-xs uppercase">GUÍA DE DESPACHO ELECTRÓNICA</h3>
                <p className="text-lg font-mono font-black italic underline decoration-red-500/30">N° {(guia.numero_guia || 0).toString().padStart(6, '0')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 my-8 mt-6">
              <div className="border p-4 rounded bg-slate-50 shadow-sm border-slate-200">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Cliente</h4>
                <p className="font-black text-md uppercase text-slate-900 leading-tight">{guia.cliente_nombre}</p>
                <p className="text-[11px] font-bold mt-1 uppercase text-slate-600"><b>OBRA:</b> {guia.obra || 'Despacho Directo'}</p>
                <p className="text-[11px] font-bold uppercase text-slate-600"><b>O.C.:</b> {guia.orden_compra || '-'}</p>
              </div>
              <div className="border p-4 rounded bg-slate-50 shadow-sm border-slate-200">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Transporte</h4>
                <p className="text-[11px] font-black text-slate-800 uppercase"><b>PATENTE:</b> {guia.camion_patente}</p>
                <p className="text-[11px] font-black text-slate-800 uppercase mt-1"><b>CONDUCTOR:</b> {guia.conductor_nombre}</p>
                <p className="text-[11px] font-black text-slate-800 mt-1 uppercase"><b>FECHA/HORA:</b> {guia.creado_en ? (typeof guia.creado_en.toDate === 'function' ? guia.creado_en.toDate().toLocaleString() : new Date(guia.creado_en).toLocaleString()) : new Date().toLocaleString()}</p>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100/80">
                  <th className="border-b-2 border-slate-300 border-r p-3 text-left text-[11px] font-black uppercase text-slate-600">Material</th>
                  <th className="border-b-2 border-slate-300 border-r p-3 text-center text-[11px] font-black uppercase text-slate-600">Cantidad</th>
                  <th className="border-b-2 border-slate-300 p-3 text-right text-[11px] font-black uppercase text-slate-600">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-4 text-[15px] font-black uppercase text-slate-900 border-r border-slate-200">
                    {guia.material_nombre}
                    <div className="text-[10px] text-slate-400 font-bold mt-1">P. UNIT: {formatCurrency(guia.precio_unitario_aplicado || 0)}</div>
                  </td>
                  <td className="p-4 text-center text-2xl font-black text-slate-800 border-r border-slate-200">{guia.cantidad} m³</td>
                  <td className="p-4 text-right text-xl font-black text-slate-900">{formatCurrency(guia.total_estimado)}</td>
                </tr>
              </tbody>
            </table>

            {(guia.nro_factura || guia.factura) && (
              <div className="mt-8 p-3 border-2 border-cyan-500/30 rounded-lg text-center bg-cyan-50/30">
                <p className="text-sm font-black text-cyan-600 uppercase tracking-widest">Factura Asociada: {guia.nro_factura || guia.factura}</p>
              </div>
            )}

            <div className="mt-auto pt-10">
              <div className="flex justify-between items-end mb-8">
                <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold italic">
                  <span>PAGO: {String(guia.metodo_pago || 'CREDITO').toUpperCase()}</span>
                  <span>EMITIDO POR: {profile?.nombre || 'SISTEMA'}</span>
                  <span>VERSION: GRAVOKA SaaS v4.5</span>
                </div>
                
                <div className="flex gap-12 items-end">
                  {copy.key === 'internal' && (
                    <div className="text-center w-48 border-t-2 border-slate-900 pt-2 group">
                      <p className="text-[10px] font-black uppercase text-slate-900">Recibe Conforme</p>
                    </div>
                  )}
                  {copy.key === 'internal' && (
                    <div className="text-center w-48 border-t-2 border-slate-900 pt-2">
                      <p className="text-[10px] font-black uppercase text-slate-900">Entrega Conforme</p>
                    </div>
                  )}
                  <div className="bg-slate-900 text-white px-5 py-2 text-xs font-black rounded-xl shadow-lg uppercase tracking-tight">
                    {copy.label}
                  </div>
                </div>
              </div>
            </div>
          </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: auto !important;
            background: white !important;
            overflow: visible !important;
          }
          /* Isolation strategy */
          body > *:not(.print-container-root),
          #__next > *:not(.print-container-root),
          main > *:not(.print-container-root) {
            display: none !important;
          }

          .print-container-root {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            z-index: 999999 !important;
          }
          
          .reprint-copy {
            width: 210mm !important;
            height: 297mm !important; /* Full A4 height */
            padding: 2cm !important;
            display: flex !important;
            flex-direction: column !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
          }
          
          .reprint-copy:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
