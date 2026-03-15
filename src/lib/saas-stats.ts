import { db } from './firebase/config';
import { collection, getDocs } from 'firebase/firestore';

export interface SaaSStats {
  totalEmpresas: number;
  empresasActivas: number;
  mrrEstimado: number; // Monthly Recurring Revenue
  planes: {
    Básico: number;
    Pro: number;
    Enterprise: number;
  };
}

export async function getSaaSGlobalStats(): Promise<SaaSStats> {
  const querySnapshot = await getDocs(collection(db, 'empresas'));
  
  let total = 0;
  let activas = 0;
  let mrr = 0;
  const planes = {
    Básico: 0,
    Pro: 0,
    Enterprise: 0
  };

  const precios: { [key: string]: number } = {
    'Básico': 29990,
    'Pro': 49990,
    'Enterprise': 99990
  };

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    total++;
    
    if (data.estado === 'activo') {
      activas++;
      const plan = data.plan_activo || 'Pro';
      mrr += precios[plan] || 49990;
      
      if (plan in planes) {
        planes[plan as keyof typeof planes]++;
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
