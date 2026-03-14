'use client';

import Link from 'next/link';
import { useState } from 'react';

const initialReports = [
  { id: '1', guia: 'G-1001', date: '25 Oct, 2023', client: 'Constructora Alfa S.A.', material: 'Grava 3/4', m3: '15.5', total: '$310.00', status: 'Entregado', statusColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { id: '2', guia: 'G-1002', date: '26 Oct, 2023', client: 'Inmobiliaria Beta Corp', material: 'Arena Fina', m3: '10.0', total: '$200.00', status: 'Pendiente', statusColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { id: '3', guia: 'G-1003', date: '26 Oct, 2023', client: 'Constructora Alfa S.A.', material: 'Piedra Chancada', m3: '20.0', total: '$450.00', status: 'Entregado', statusColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { id: '4', guia: 'G-1004', date: '27 Oct, 2023', client: 'Gobierno Local Sede Norte', material: 'Mezcla Preparada', m3: '12.0', total: '$280.00', status: 'Cancelado', statusColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { id: '5', guia: 'G-1005', date: '28 Oct, 2023', client: 'Inmobiliaria Beta Corp', material: 'Grava 3/4', m3: '30.0', total: '$600.00', status: 'Entregado', statusColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
];

export default function ReportesPage() {
  const [reports] = useState(initialReports);
  const [statusFilter, setStatusFilter] = useState('Todos los Estados');
  const [clientFilter, setClientFilter] = useState('Todos los Clientes');

  // Filter Logic
  const filteredReports = reports.filter(report => {
    const matchesStatus = statusFilter === 'Todos los Estados' || report.status === statusFilter;
    const matchesClient = clientFilter === 'Todos los Clientes' || report.client === clientFilter;
    return matchesStatus && matchesClient;
  });

  const handleExportExcel = () => {
    alert('Exportando a Excel (.xlsx)...');
  };

  const handleExportPDF = () => {
    alert('Generando PDF...');
  };

  return (
    <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <main className="px-4 md:px-10 py-8 max-w-[1400px] mx-auto w-full">
        
        {/* Header & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Módulo de Reportes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gestión detallada de guías de despacho y facturación.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-green-600">description</span>
              Excel
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
              PDF
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rango de Fecha</label>
            <div className="relative">
              <select className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm py-2.5 pl-3 pr-10 focus:ring-primary focus:border-primary appearance-none">
                <option>Últimos 30 días</option>
                <option>Este Mes</option>
                <option>Mes Pasado</option>
                <option>Rango Personalizado</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-2.5 pointer-events-none text-slate-400">calendar_today</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</label>
            <div className="relative">
              <select 
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm py-2.5 pl-3 pr-10 focus:ring-primary focus:border-primary appearance-none"
              >
                <option value="Todos los Clientes">Todos los Clientes</option>
                <option value="Constructora Alfa S.A.">Constructora Alfa S.A.</option>
                <option value="Inmobiliaria Beta Corp">Inmobiliaria Beta Corp</option>
                <option value="Gobierno Local Sede Norte">Gobierno Local</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-2.5 pointer-events-none text-slate-400">group</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Material / Producto</label>
            <div className="relative">
              <select className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm py-2.5 pl-3 pr-10 focus:ring-primary focus:border-primary appearance-none">
                <option>Todos los Materiales</option>
                <option>Grava 3/4</option>
                <option>Arena Fina</option>
                <option>Piedra Chancada</option>
                <option>Mezcla</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-2.5 pointer-events-none text-slate-400">layers</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</label>
            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm py-2.5 pl-3 pr-10 focus:ring-primary focus:border-primary appearance-none"
              >
                <option value="Todos los Estados">Todos los Estados</option>
                <option value="Entregado">Entregado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Cancelado">Cancelado</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-2.5 pointer-events-none text-slate-400">verified</span>
            </div>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nro Guía</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Material</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">m³</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-primary">{report.guia}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{report.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-200">{report.client}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{report.material}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">{report.m3}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">{report.total}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${report.statusColor}`}>
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No se encontraron reportes con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Financial Summary Footer */}
          <div className="bg-slate-50 dark:bg-slate-950 px-6 py-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Volumen</span>
                  <span className="text-xl font-bold text-slate-700 dark:text-slate-300">87.5 m³</span>
                </div>
                <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-8">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Guías Emitidas</span>
                  <span className="text-xl font-bold text-slate-700 dark:text-slate-300">5 Guías</span>
                </div>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-6 py-4 flex flex-col items-end min-w-[240px]">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Total Facturable</span>
                <span className="text-3xl font-black text-primary">$1,840.00</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">IVA No Incluido (16%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">Mostrando <span className="font-bold">1-{filteredReports.length}</span> de <span className="font-bold">{reports.length}</span> reportes</p>
          <div className="flex gap-2">
            <button className="flex items-center justify-center size-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="flex items-center justify-center size-9 rounded-lg bg-primary text-white font-bold text-sm">
              1
            </button>
            <button className="flex items-center justify-center size-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors font-medium text-sm">
              2
            </button>
            <button className="flex items-center justify-center size-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
