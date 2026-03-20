import { db } from './firebase/config';
import { collection, getDocs } from 'firebase/firestore';

export interface SaaSStats {
  totalEmpresas: number;
  empresasActivas: number;
  mrrEstimado: number; // Monthly Recurring Revenue
  planes: {
    Startup: number;
    Full: number;
    Básico?: number; // Keep for legacy compatibility during transition
    Pro?: number;
    Enterprise?: number;
  };
}

export async function getSaaSGlobalStats(): Promise<SaaSStats> {
  const querySnapshot = await getDocs(collection(db, 'empresas'));
  
  let total = 0;
  let activas = 0;
  let mrr = 0;
  const planes: any = {
    Startup: 0,
    Full: 0,
    Básico: 0,
    Pro: 0,
    Enterprise: 0
  };

  const precios: { [key: string]: number } = {
    'Básico': 29990,
    'Startup': 29990,
    'Pro': 79990,
    'Enterprise': 79990,
    'Full': 79990
  };

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    total++;
    
    if (data.estado === 'activo') {
      activas++;
      const plan = data.plan_activo || 'Full';
      mrr += precios[plan] || 79990;
      
      if (plan in planes) {
        planes[plan]++;
      }
    }
  });

  return {
    totalEmpresas: total,
    empresasActivas: activas,
    mrrEstimado: mrr,
    planes
  };
}
