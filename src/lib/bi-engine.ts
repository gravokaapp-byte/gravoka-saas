import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';

export interface GuiaData {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  material_nombre: string;
  material_id?: string;
  cantidad: number;
  total_estimado: number;
  camion_patente: string;
  camion_id?: string;
  conductor_nombre: string;
  creado_en: any;
  estado: string;
  flete_costo?: number;
  metodo_pago?: string;
  destino?: string;
  numero_guia?: number;
  obra?: string;
  orden_compra?: string;
  nro_factura?: string;
  factura?: string;
  precio_unitario_aplicado?: number;
}


export const processBIStats = (guias: GuiaData[]) => {
  const filteredGuias = guias.filter(g => g.estado !== 'Anulada');

  // 1. Truck Stats
  const truckStats: Record<string, { vueltas: number, m3: number }> = {};
  filteredGuias.forEach(g => {
    const key = g.camion_patente || 'Desconocido';
    if (!truckStats[key]) truckStats[key] = { vueltas: 0, m3: 0 };
    truckStats[key].vueltas += 1;
    truckStats[key].m3 += g.cantidad;
  });
  const allTrucks = Object.entries(truckStats)
    .map(([patente, stats]) => ({ patente, ...stats }))
    .sort((a, b) => b.vueltas - a.vueltas);

  // 2. Client Stats (Profitability)
  const clientStats: Record<string, { m3: number, revenue: number, freight: number, margin: number, margin_percent: number }> = {};
  filteredGuias.forEach(g => {
    const key = g.cliente_nombre || 'S/N';
    if (!clientStats[key]) clientStats[key] = { m3: 0, revenue: 0, freight: 0, margin: 0, margin_percent: 0 };
    const freight = g.flete_costo || 0;
    const revenue = g.total_estimado || 0;
    clientStats[key].m3 += g.cantidad;
    clientStats[key].freight += freight;
    clientStats[key].revenue += revenue;
    clientStats[key].margin = clientStats[key].revenue - clientStats[key].freight;
    clientStats[key].margin_percent = clientStats[key].revenue > 0 
      ? (clientStats[key].margin / clientStats[key].revenue) * 100 
      : 0;
  });
  const allClients = Object.entries(clientStats)
    .map(([nombre, stats]) => ({ nombre, ...stats }))
    .sort((a, b) => b.margin - a.margin);

  // 3. Product Stats
  const productStats: Record<string, number> = {};
  filteredGuias.forEach(g => {
    const key = g.material_nombre || 'S/N';
    if (!productStats[key]) productStats[key] = 0;
    productStats[key] += g.cantidad;
  });
  const allProducts = Object.entries(productStats)
    .map(([nombre, m3]) => ({ nombre, m3 }))
    .sort((a, b) => b.m3 - a.m3);

  // 4. Driver Stats (Performance)
  const driverStats: Record<string, { viajes: number, m3: number, flete: number, efficiency: number }> = {};
  filteredGuias.forEach(g => {
    const key = g.conductor_nombre || 'Desconocido';
    if (!driverStats[key]) driverStats[key] = { viajes: 0, m3: 0, flete: 0, efficiency: 0 };
    driverStats[key].viajes += 1;
    driverStats[key].m3 += g.cantidad;
    driverStats[key].flete += (g.flete_costo || 0);
    driverStats[key].efficiency = driverStats[key].m3 / driverStats[key].viajes;
  });
  const allDrivers = Object.entries(driverStats)
    .map(([nombre, stats]) => ({ nombre, ...stats }))
    .sort((a, b) => b.viajes - a.viajes);

  // 5. Destination Stats
  const destinationStats: Record<string, number> = {};
  filteredGuias.forEach(g => {
    const key = g.destino || 'Sin Destino';
    if (!destinationStats[key]) destinationStats[key] = 0;
    destinationStats[key] += g.cantidad;
  });
  const allDestinations = Object.entries(destinationStats)
    .map(([nombre, m3]) => ({ nombre, m3 }))
    .sort((a, b) => b.m3 - a.m3);

  // 6. Weekly Sales
  const dailyStats: Record<string, number> = {};
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), i);
    return d.toISOString().split('T')[0];
  }).reverse();

  last7Days.forEach(day => dailyStats[day] = 0);
  
  filteredGuias.forEach(g => {
    if (!g.creado_en) return;
    const date = g.creado_en.toDate();
    const dayKey = date.toISOString().split('T')[0];
    if (dailyStats[dayKey] !== undefined) {
      dailyStats[dayKey] += g.total_estimado;
    }
  });

  const weeklySalesData = last7Days.map(day => ({
    name: day.split('-').slice(1).join('/'),
    ventas: dailyStats[day]
  }));

  return {
    allTrucks,
    allClients,
    allProducts,
    allDrivers,
    allDestinations,
    weeklySalesData,
    topTrucks: allTrucks.slice(0, 5),
    topClients: allClients.slice(0, 5),
    topProducts: allProducts.slice(0, 5),
    topDrivers: allDrivers.slice(0, 5),
    summary: {
      volume: filteredGuias.reduce((acc, g) => acc + g.cantidad, 0),
      revenue: filteredGuias.reduce((acc, g) => acc + g.total_estimado, 0),
      flete: filteredGuias.reduce((acc, g) => acc + (g.flete_costo || 0), 0),
      operations: filteredGuias.length
    }
  };
};

export const filterByRange = (guias: GuiaData[], range: 'dia' | 'semana' | 'mes' | 'todos') => {
  const now = new Date();
  let start: Date, end: Date;

  switch (range) {
    case 'dia':
      start = startOfDay(now);
      end = endOfDay(now);
      break;
    case 'semana':
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'mes':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    default:
      return guias;
  }

  return guias.filter(g => {
    if (!g.creado_en) return false;
    const date = g.creado_en.toDate();
    return isWithinInterval(date, { start, end });
  });
};
