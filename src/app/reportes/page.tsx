'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

interface Guia {
  id: string;
  cliente_id: string;
  material_nombre: string;
  cantidad: number;
  total_estimado: number;
  creado_en: any;
  estado: string;
  camion_patente?: string;
}

interface Client {
  id: string;
  name: string;
}

export default function ReportesPage() {
  const { profile } = useAuth();
  const [guias, setGuias] = useState<Guia[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState('Todos los Estados');
  const [clientFilterId, setClientFilterId] = useState('Todos los Clientes');

  useEffect(() => {
    if (!profile?.empresa_id) return;

    // Fetch Clients for the filter
    const qClients = query(collection(db, 'clientes'), where('empresa_id', '==', profile.empresa_id));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Client[]);
    });

    // Fetch Guias
    const qGuias = query(
      collection(db, 'guias'), 
      where('empresa_id', '==', profile.empresa_id),
      orderBy('creado_en', 'desc')
    );
    
    const unsubGuias = onSnapshot(qGuias, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Guia[];
      setGuias(docs);
      setIsLoading(false);
    });

    return () => {
      unsubClients();
      unsubGuias();
    };
  }, [profile?.empresa_id]);

  // Filter Logic
  const filteredReports = guias.filter(report => {
    const matchesStatus = statusFilter === 'Todos los Estados' || report.estado === statusFilter;
    const matchesClient = clientFilterId === 'Todos los Clientes' || report.cliente_id === clientFilterId;
    return matchesStatus && matchesClient;
  });

  const totals = useMemo(() => {
    return filteredReports.reduce((acc, curr) => ({
      volume: acc.volume + curr.cantidad,
      cash: acc.cash + curr.total_estimado
    }), { volume: 0, cash: 0 });
  }, [filteredReports]);

  const handleExportExcel = () => {
    alert('Exportando a Excel (.xlsx)...');
  };

  const handleExportPDF = () => {
    alert('Generando PDF...');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '...';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  };

  return (
    <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <main className="px-4 md:px-10 py-8 max-w-[1400px] mx-auto w-full">
        
        {/* Header & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Reporte Operativo</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Monitoreo en tiempo real de despachos y facturación proyectada.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleExportExcel}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all"
            >
              <span className="material-symbols-outlined text-green-600">description</span>
              Excel
            </button>
            <Link 
              href="/guias"
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined">add</span>
              Nueva Guía
            </Link>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrar por Cliente</label>
            <select 
              value={clientFilterId}
              onChange={(e) => setClientFilterId(e.target.value)}
              className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
            >
              <option value="Todos los Clientes">Todos los Clientes</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado de Guía</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm py-2.5 px-3 focus:ring-primary focus:border-primary"
            >
              <option value="Todos los Estados">Todos los Estados</option>
              <option value="Emitida">Emitida</option>
              <option value="Entregada">Entregada</option>
              <option value="Anulada">Anulada</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
             <div className="text-xs text-slate-400 italic">Actualización automática activada.</div>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Material</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">m³</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Conectando con base de datos real...</td></tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                        <p className="text-slate-500">No se encontraron registros para estos filtros.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{formatDate(report.creado_en)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-200">
                        {clients.find(c => c.id === report.cliente_id)?.name || 'Cliente Desconocido'}
                        {report.camion_patente && <span className="block text-[10px] text-slate-400 uppercase font-mono mt-0.5">Patente: {report.camion_patente}</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{report.material_nombre}</td>
                      <td className="px-6 py-4 text-sm text-center font-bold text-slate-700 dark:text-slate-300 font-mono">{report.cantidad}</td>
                      <td className="px-6 py-4 text-sm font-black text-primary">{formatCurrency(report.total_estimado)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          report.estado === 'Emitida' ? 'bg-blue-100 text-blue-700' : 
                          report.estado === 'Entregada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {report.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Financial Summary Footer */}
          <div className="bg-slate-50 dark:bg-slate-950 px-6 py-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Volumen Total</span>
                  <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{totals.volume.toFixed(1)} m³</span>
                </div>
                <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-8">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Operaciones</span>
                  <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{filteredReports.length}</span>
                </div>
              </div>
              <div className="bg-primary border border-primary/20 rounded-2xl px-8 py-4 flex flex-col items-end shadow-xl shadow-primary/20">
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Monto Facturable</span>
                <span className="text-4xl font-black text-white">{formatCurrency(totals.cash)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
