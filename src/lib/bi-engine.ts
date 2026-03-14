import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';

export interface GuiaData {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  material_nombre: string;
  cantidad: number;
  total_estimado: number;
  camion_patente: string;
  conductor_nombre: string;
  creado_en: any;
  estado: string;
  flete_costo?: number;
  destino?: string;
}

export const processBIStats = (guias: GuiaData[]) => {
  const filteredGuias = guias.filter(g => g.estado !== 'Anulada');

  // 1. Top Camiones por Vueltas
  const truckStats: Record<string, { vueltas: number, m3: number }> = {};
  filteredGuias.forEach(g => {
    const key = g.camion_patente || 'Desconocido';
    if (!truckStats[key]) truckStats[key] = { vueltas: 0, m3: 0 };
    truckStats[key].vueltas += 1;
    truckStats[key].m3 += g.cantidad;
  });
  const topTrucks = Object.entries(truckStats)
    .map(([patente, stats]) => ({ patente, ...stats }))
    .sort((a, b) => b.vueltas - a.vueltas)
    .slice(0, 5);

  // 2. Top Clientes (M3 y Ganancia)
  const clientStats: Record<string, { m3: number, ganancia: number }> = {};
  filteredGuias.forEach(g => {
    const key = g.cliente_nombre || 'Desconocido';
    if (!clientStats[key]) clientStats[key] = { m3: 0, ganancia: 0 };
    clientStats[key].m3 += g.cantidad;
    clientStats[key].ganancia += (g.total_estimado - (g.flete_costo || 0));
  });
  const topClients = Object.entries(clientStats)
    .map(([nombre, stats]) => ({ nombre, ...stats }))
    .sort((a, b) => b.ganancia - a.ganancia)
    .slice(0, 5);

  // 3. Top Productos (M3)
  const productStats: Record<string, number> = {};
  filteredGuias.forEach(g => {
    const key = g.material_nombre || 'Desconocido';
    if (!productStats[key]) productStats[key] = 0;
    productStats[key] += g.cantidad;
  });
  const topProducts = Object.entries(productStats)
    .map(([nombre, m3]) => ({ nombre, m3 }))
    .sort((a, b) => b.m3 - a.m3)
    .slice(0, 5);

  // 4. Ventas Semanales (Gráfico)
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
    topTrucks,
    topClients,
    topProducts,
    weeklySalesData,
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
