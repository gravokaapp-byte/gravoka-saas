'use client';

import { useState, useEffect, useMemo } from 'react';
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
  X
} from 'lucide-react';

export default function ReportesPage() {
  const { profile, effectivePlan } = useAuth();
  const [guias, setGuias] = useState<GuiaData[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const [timeRange, setTimeRange] = useState<'dia' | 'semana' | 'mes' | 'todos'>('todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [clientFilter, setClientFilter] = useState('Todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reprintGuia, setReprintGuia] = useState<GuiaData | null>(null);

  useEffect(() => {
    if (!profile?.empresa_id) return;

    // Fetch Config
    getDoc(doc(db, 'configuracion_empresa', profile.empresa_id)).then((snap: any) => {
      if (snap.exists()) setConfig(snap.data());
    });

    const qClients = query(collection(db, 'clientes'), where('empresa_id', '==', profile.empresa_id));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qGuias = query(
      collection(db, 'guias'), 
      where('empresa_id', '==', profile.empresa_id),
      orderBy('creado_en', 'desc')
    );
    
    const unsubGuias = onSnapshot(qGuias, (snapshot) => {
      setGuias(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as GuiaData[]);
      setIsLoading(false);
    });

    return () => {
      unsubClients();
      unsubGuias();
    };
  }, [profile?.empresa_id]);

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
    const data = filteredGuias.map(g => ({
      'N° Guía': g.numero_guia ? g.numero_guia.toString().padStart(6, '0') : 'N/A',
      'Folio Sist.': g.id.slice(-6).toUpperCase(),
      Fecha: g.creado_en?.toDate().toLocaleString('es-CL') || 'N/A',
      Cliente: g.cliente_nombre,
      Material: g.material_nombre,
      'Cantidad (m³)': g.cantidad,
      'Precio Unitario': g.total_estimado / (g.cantidad || 1),
      'Venta Bruta': g.total_estimado,
      'Costo flete': g.flete_costo || 0,
      'Utilidad Real': g.total_estimado - (g.flete_costo || 0),
      Camion: g.camion_patente,
      Chofer: g.conductor_nombre,
      'Método de Pago': g.metodo_pago?.toUpperCase() || 'N/A',
      Estado: g.estado,
      Destino: g.destino || 'Punto de Venta'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Configurar autofiltros
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte_Gravoka");
    
    // Escribir el archivo
    XLSX.writeFile(wb, `Reporte_Gravoka_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

  if (!isMounted || isLoading) return <div className="p-8 animate-pulse text-slate-500">Cargando Inteligencia de Datos...</div>;

  return (
    <div className="flex-1 w-full bg-slate-50 dark:bg-[#020617] pb-20">
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

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard title="Ventas Totales" value={formatCurrency(stats.summary.revenue)} icon={<Circle className="text-primary" />} trend="+12.5% vs ayer" />
          <StatCard title="M3 Despachados" value={`${stats.summary.volume.toFixed(1)} m³`} icon={<Package className="text-blue-500" />} trend="En meta" />
          <StatCard 
            title="Utilidad Neta" 
            value={effectivePlan === 'Startup' ? 'Plan Full' : formatCurrency(stats.summary.revenue - stats.summary.flete)} 
            icon={<CheckCircle2 className="text-emerald-500" />} 
            trend={effectivePlan === 'Startup' ? 'Margen Protegido' : "Margen 84%"} 
          />
          <StatCard title="Operaciones" value={stats.summary.operations.toString()} icon={<Truck className="text-orange-500" />} trend="Flujo constante" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Main Sales Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
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

          {/* Top Trucks */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Truck className="size-4" /> Top Flota (Vueltas)
            </h3>
            <div className="space-y-4">
              {stats.topTrucks.map(t => (
                <div key={t.patente} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{t.patente}</span>
                    <span className="text-xs font-black text-primary">{t.vueltas} Vueltas</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${Math.min(100, (t.vueltas / (stats.topTrucks[0]?.vueltas || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 - NEW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Driver Productivity */}
          <div className="relative bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
              <Users className="size-4" /> Rendimiento de Choferes
            </h3>
            <div className={`h-[250px] w-full ${effectivePlan === 'Startup' ? 'blur-md grayscale opacity-30 select-none pointer-events-none' : ''}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topDrivers} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="nombre" type="category" axisLine={false} tickLine={false} width={80} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none' }}
                  />
                  <Bar dataKey="vueltas" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {effectivePlan === 'Startup' && <PremiumOverlay />}
          </div>

          {/* Destination Volume */}
          <div className="relative bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
              <MapPin className="size-4" /> Destinos (m³)
            </h3>
            <div className={`h-[250px] w-full flex items-center justify-center ${effectivePlan === 'Startup' ? 'blur-md grayscale opacity-30 select-none pointer-events-none' : ''}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topDestinations}
                    dataKey="m3"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {stats.topDestinations.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {effectivePlan === 'Startup' && <PremiumOverlay />}
          </div>

          {/* Client Profit Margins */}
          <div className="relative bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="size-4" /> Rentabilidad por Cliente
            </h3>
            <div className={`space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar ${effectivePlan === 'Startup' ? 'blur-md grayscale opacity-30 select-none pointer-events-none' : ''}`}>
              {stats.topClients.map(c => (
                <div key={c.nombre} className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black truncate max-w-[140px]">{c.nombre}</span>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                      {c.margin.toFixed(1)}% Margen
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Utilidad</span>
                      <span className="text-xs font-black">{formatCurrency(c.ganancia)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Volumen</span>
                      <span className="text-xs font-black text-blue-500">{c.m3.toFixed(1)} m³</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {effectivePlan === 'Startup' && <PremiumOverlay />}
          </div>
        </div>

        {/* List of Guides */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h3 className="text-xl font-black">Detalle Operativo</h3>
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
                <option value="Entregada">Entregada</option>
                <option value="Anulada">Anulada</option>
              </select>
            </div>
          </div>
          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1000px] text-left border-collapse table-fixed md:table-auto">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50">
                  <th className="w-32 md:w-auto px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-400">Guía / Fecha</th>
                  <th className="w-48 md:w-auto px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-400">Cliente / Material</th>
                  <th className="w-40 md:w-auto px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-400">Patente / Chofer</th>
                  <th className="w-24 md:w-auto px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Cantidad</th>
                  <th className="w-56 md:w-auto px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-400">Flujo de Caja (Bruto/Flete/Neto)</th>
                  <th className="w-32 md:w-auto px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredGuias.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group transition-all">
                    <td className="px-4 md:px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono font-black text-primary mb-1">
                          {g.numero_guia ? `N° ${g.numero_guia.toString().padStart(6, '0')}` : g.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {g.creado_en?.toDate().toLocaleDateString('es-CL')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{g.cliente_nombre}</span>
                        <span className="text-xs text-slate-500 font-medium">{g.material_nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-mono font-bold text-primary">{g.camion_patente}</span>
                        <span className="text-xs text-slate-500 italic">{g.conductor_nombre}</span>
                      </div>
                    </td>
                   <td className="px-4 md:px-6 py-5 text-center">
                      <div className="inline-flex items-center justify-center size-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black">
                        {g.cantidad}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Bruto: {formatCurrency(g.total_estimado)}</span>
                        <span className="text-xs text-blue-500 font-bold">Flete: {formatCurrency(g.flete_costo || 0)}</span>
                        <div className="mt-1 flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] uppercase font-black text-slate-400">Neto:</span>
                          <span className="text-sm font-black text-emerald-500">{formatCurrency(g.total_estimado - (g.flete_costo || 0))}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setReprintGuia(g)}
                          title="Reimprimir guía"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all"
                        >
                          <Printer className="size-4" />
                        </button>
                        {editingId === g.id ? (
                        <select 
                          autoFocus
                          onBlur={() => setEditingId(null)}
                          onChange={(e) => handleUpdateStatus(g.id, e.target.value)}
                          className="text-[10px] font-black uppercase rounded-lg border-primary bg-primary text-white"
                        >
                          <option value="Emitida">Emitida</option>
                          <option value="Entregada">Entregada</option>
                          <option value="Anulada">Anulada</option>
                        </select>
                      ) : (
                        <button 
                          onClick={() => setEditingId(g.id)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase hover:ring-2 hover:ring-offset-2 transition-all ${
                            g.estado === 'Emitida' ? 'bg-blue-100 text-blue-700 hover:ring-blue-100' : 
                            g.estado === 'Entregada' ? 'bg-green-100 text-green-700 hover:ring-green-100' : 'bg-red-100 text-red-700 hover:ring-red-100'
                          }`}
                        >
                          {g.estado}
                          <ChevronDown className="size-3 ml-1" />
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Reprint Modal */}
      {reprintGuia && (
        <ReprintModal guia={reprintGuia} config={config} profile={profile} onClose={() => setReprintGuia(null)} />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: any, trend: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">{trend}</span>
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

function ReprintModal({ guia, config, profile, onClose }: { guia: GuiaData; config: any; profile: any; onClose: () => void }) {
  const numStr = guia.numero_guia ? guia.numero_guia.toString().padStart(6, '0') : guia.id.slice(-6).toUpperCase();
  const copies = [
    { label: 'COPIA CLIENTE', key: 'client' },
    { label: 'COPIA INTERNA', key: 'internal' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center no-print p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center">
          <h2 className="text-xl font-black mb-1">Reimprimir Guía</h2>
          <p className="text-slate-500 text-sm mb-1">Guía <span className="font-mono font-black text-primary">N° {numStr}</span></p>
          <p className="text-slate-500 text-sm mb-6 truncate">{guia.cliente_nombre}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <Printer className="size-4" /> Imprimir
            </button>
          </div>
        </div>
      </div>

      <div className="hidden print:block fixed inset-0 bg-white z-[9999] text-black">
        {copies.map((copy) => (
          <div key={copy.key} className="reprint-copy">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                {config?.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="max-h-16 w-auto" />
                ) : (
                  <div className="size-16 rounded border flex items-center justify-center bg-slate-100 text-[10px] text-slate-400 font-bold uppercase">Logo</div>
                )}
                <div>
                  <h1 className="text-xl font-black uppercase text-slate-900">{config?.nombre_empresa || 'Gravoka SpA'}</h1>
                  <p className="text-xs font-bold">{config?.rut || 'RUT 77.XXX.XXX-X'}</p>
                  <p className="text-[10px] text-slate-500">{config?.direccion || 'Matriz de Operaciones'}</p>
                </div>
              </div>
              <div className="text-right border-2 border-red-500 p-3 rounded">
                <h3 className="text-red-500 font-bold text-sm">GUÍA DE DESPACHO ELECTRÓNICA</h3>
                <p className="text-lg font-mono font-black italic">N° {numStr}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 my-6">
              <div className="border p-3 rounded bg-slate-50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Cliente</h4>
                <p className="font-black text-md uppercase">{guia.cliente_nombre}</p>
                <p className="text-[10px]"><b>OBRA:</b> {guia.obra || 'Despacho Directo'}</p>
              </div>
              <div className="border p-3 rounded bg-slate-50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Transporte</h4>
                <p className="text-[11px]"><b>PATENTE:</b> {guia.camion_patente}</p>
                <p className="text-[11px]"><b>CONDUCTOR:</b> {guia.conductor_nombre}</p>
                <p className="text-[11px]"><b>FECHA/HORA:</b> {guia.creado_en?.toDate().toLocaleString()}</p>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100/50">
                  <th className="border p-2 text-left text-[10px] font-black uppercase">Material</th>
                  <th className="border p-2 text-center text-[10px] font-black uppercase">Cantidad</th>
                  <th className="border p-2 text-right text-[10px] font-black uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3 text-sm font-bold uppercase">{guia.material_nombre}</td>
                  <td className="border p-3 text-center text-lg font-black">{guia.cantidad} m³</td>
                  <td className="border p-3 text-right text-md font-black">{formatCurrency(guia.total_estimado)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-end mt-4">
              <div className="flex flex-col gap-1 text-[9px] opacity-70">
                <span>PAGO: {guia.metodo_pago?.toUpperCase()}</span>
                <span>REIMPRESO POR: {profile?.nombre || 'SISTEMA'}</span>
                <span>GRAVOKA SaaS v4.5</span>
              </div>
              <div className="flex gap-10 items-end">
                {copy.key === 'internal' && (
                  <div className="text-center w-40 border-t border-black pt-1">
                    <p className="text-[9px] font-black uppercase">Recibe Conforme</p>
                  </div>
                )}
                {copy.key === 'internal' && (
                  <div className="text-center w-40 border-t border-black pt-1">
                    <p className="text-[9px] font-black uppercase">Entrega Conforme</p>
                  </div>
                )}
                <div className="bg-slate-900 text-white px-3 py-1 text-[10px] font-black rounded-lg">
                  {copy.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          header, footer, nav, aside, .no-print {
            display: none !important;
          }
          body > :not(.print:block) {
            display: none !important;
          }
          .print:block {
            display: block !important;
            position: static !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
          }
          .reprint-copy {
            width: 100%;
            height: 100vh;
            padding: 1.5cm;
            display: flex !important;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box;
            background: white !important;
            color: black !important;
            visibility: visible !important;
          }
          .reprint-copy * {
            visibility: visible !important;
          }
          .reprint-copy:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
    </>
  );
}

