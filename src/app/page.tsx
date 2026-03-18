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

  // --- LANDING PAGE PARA INVITADOS (SaaS) ---
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white selection:bg-primary selection:text-white font-sans overflow-x-hidden">
        {/* Gradients Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
        </div>

        {/* Global Navigation */}
        <nav className="fixed top-0 w-full z-[100] px-6 py-5 flex justify-between items-center backdrop-blur-xl bg-slate-950/40 border-b border-white/5 transition-all">
          <div className="flex items-center gap-3 group pointer-events-auto">
            <div className="size-11 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:rotate-6 transition-transform">
              <span className="material-symbols-outlined text-white text-2xl font-bold">rocket_launch</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter uppercase leading-none">Gravoka</span>
              <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Mining SaaS</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Precios</a>
            <a href="#demo" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Demo</a>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors px-4">Entrar</Link>
            <Link href="/registro" className="relative group overflow-hidden px-7 py-3 bg-white text-slate-950 rounded-2xl font-black text-sm shadow-xl shadow-white/5 hover:scale-105 active:scale-95 transition-all">
              <span className="relative z-10">EMPEZAR GRATIS</span>
              <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </Link>
          </div>
        </nav>

        {/* HERO SECTION */}
        <section className="relative pt-44 pb-32 px-6 flex flex-col items-center z-10">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full mb-10 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <span className="size-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"></span>
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-200">Plataforma SaaS v2.4 Activa</span>
          </div>

          <h1 className="text-6xl md:text-[9.5rem] font-black tracking-tighter text-center max-w-6xl mb-12 leading-[0.85] animate-in fade-in zoom-in-95 duration-1000 delay-100 select-none">
             CONTROL <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-blue-400 to-emerald-400">TOTAL</span> DE TU LOGÍSTICA
          </h1>
          
          <p className="text-lg md:text-2xl text-slate-400 text-center max-w-3xl mb-16 font-medium leading-relaxed opacity-0 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            Digitaliza el control de pesaje, emite guías de despacho legales y obtén analítica BI en tiempo real. La solución definitiva para empresas de áridos y minería.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 opacity-0 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
             <Link href="/registro" className="group px-12 py-6 bg-primary text-white rounded-[24px] font-black text-xl shadow-[0_20px_50px_rgba(var(--primary-rgb),0.3)] hover:scale-105 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-4">
               Crea tu cuenta <span className="material-symbols-outlined font-black group-hover:translate-x-1 transition-transform">arrow_forward</span>
             </Link>
             <Link href="#demo" className="px-12 py-6 bg-white/5 border border-white/10 text-white rounded-[24px] font-black text-xl hover:bg-white/10 backdrop-blur-lg transition-all flex items-center gap-4">
               Ver Video Demo <span className="material-symbols-outlined text-primary">play_circle</span>
             </Link>
          </div>

          {/* APP SHOWCASE MOCKUP */}
          <div className="mt-32 w-full max-w-7xl relative opacity-0 animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-700">
             <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 blur-2xl rounded-[60px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <div className="relative bg-slate-900/40 border border-white/10 rounded-[48px] p-4 md:p-8 backdrop-blur-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
                {/* Simulated UI Glass */}
                <div className="aspect-[16/10] bg-slate-900 border border-white/5 rounded-[32px] overflow-hidden flex flex-col shadow-inner">
                   <div className="h-10 border-b border-white/5 flex items-center px-6 gap-2 bg-slate-900/50">
                      <div className="flex gap-1.5">
                         <div className="size-3 rounded-full bg-red-500/20"></div>
                         <div className="size-3 rounded-full bg-amber-500/20"></div>
                         <div className="size-3 rounded-full bg-emerald-500/20"></div>
                      </div>
                   </div>
                   <div className="flex-1 p-10 flex flex-col gap-10">
                      <div className="grid grid-cols-3 gap-6">
                         {[1, 2, 3].map(i => (
                           <div key={i} className="h-32 rounded-3xl bg-white/[0.02] border border-white/5 p-6 space-y-3">
                              <div className="w-1/2 h-2.5 bg-white/10 rounded-full"></div>
                              <div className="w-3/4 h-5 bg-primary/20 rounded-lg"></div>
                           </div>
                         ))}
                      </div>
                      <div className="flex-1 rounded-[40px] border border-white/5 bg-gradient-to-br from-white/[0.01] to-transparent p-8 flex items-center justify-center relative overflow-hidden group/m">
                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-from)_0%,transparent_70%)] from-primary/10 opacity-0 group-hover/m:opacity-100 transition-opacity duration-700"></div>
                         <div className="text-center relative">
                            <span className="material-symbols-outlined text-8xl text-white/10 mb-6 drop-shadow-2xl">monitoring</span>
                            <p className="text-2xl font-black text-slate-500 uppercase tracking-widest">Dashboard Operativo Real-Time</p>
                            <p className="text-slate-600 font-bold mt-2">Visualiza cada m³ despachado al instante</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
             
             {/* Floating Elements */}
             <div className="absolute -top-10 -right-10 px-8 py-5 bg-slate-900/80 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl hidden lg:block animate-bounce duration-[3000ms]">
                <div className="flex items-center gap-4">
                   <div className="size-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                      <span className="material-symbols-outlined font-black">check_circle</span>
                   </div>
                   <div>
                      <p className="text-xs font-black uppercase text-slate-400 mb-0.5">Guía N° 004290</p>
                      <p className="text-sm font-bold text-white">Emitida con éxito</p>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-40 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-24">
             <h2 className="text-primary font-black text-sm uppercase tracking-[0.3em] mb-4">Potencial Gravoka</h2>
             <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-none mb-6">TODO LO QUE TU PLANTA NECESITA</h3>
             <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">Una suite completa diseñada específicamente para los desafíos del movimiento de áridos y minerales.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             {[
               { icon: 'speed', title: 'Emisión Ultrarápida', desc: 'Genera guías de despacho en menos de 10 segundos desde cualquier dispositivo.' },
               { icon: 'finance', title: 'Business Intelligence', desc: 'Gráficos de ventas, volumen y m³ despachados actualizados al instante.' },
               { icon: 'group', title: 'Multi-Tenant Pro', desc: 'Gestiona múltiples clientes y faenas bajo una sola cuenta SaaS segura.' },
               { icon: 'cloud_done', title: '100% En la Nube', desc: 'Sin instalaciones. Accede a tus datos históricos desde la oficina o la faena.' },
               { icon: 'picture_as_pdf', title: 'PDFs Automáticos', desc: 'Generación de copias para cliente e internas con diseño legal y QR.' },
               { icon: 'local_shipping', title: 'Control Logístico', desc: 'Seguimiento de patentes, choferes y materiales en cada operación.' },
               { icon: 'security', title: 'Seguridad Bancaria', desc: 'Tus datos están protegidos con encriptación TLS y respaldos diarios.' },
               { icon: 'support_agent', title: 'Soporte 24/7', desc: 'Un equipo de ingenieros listo para ayudarte en cada paso de la implementación.' },
             ].map((f, i) => (
               <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-[32px] hover:bg-white/[0.08] hover:-translate-y-2 transition-all group">
                  <div className="size-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                     <span className="material-symbols-outlined text-3xl font-bold">{f.icon}</span>
                  </div>
                  <h4 className="text-xl font-black mb-3">{f.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed font-medium">{f.desc}</p>
               </div>
             ))}
          </div>
        </section>

        {/* PRICING TABLE */}
        <section id="pricing" className="py-40 px-6 bg-white/[0.01] border-y border-white/5 overflow-hidden">
          <div className="absolute left-1/2 -translate-x-1/2 top-40 w-full h-[500px] bg-primary/5 blur-[150px] rounded-full pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
             <div className="text-center mb-24">
                <h2 className="text-primary font-black text-sm uppercase tracking-[0.3em] mb-4">Planes SaaS</h2>
                <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-none">ESCALA TU NEGOCIO</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Free Plan */}
                <div className="p-10 bg-slate-900/50 border border-white/10 rounded-[40px] backdrop-blur-3xl flex flex-col hover:border-white/20 transition-colors">
                   <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">Comienzo</p>
                   <h4 className="text-3xl font-black mb-6">STARTUP</h4>
                   <div className="flex items-baseline gap-2 mb-8">
                      <span className="text-5xl font-black text-white">$0</span>
                      <span className="text-slate-400 font-bold uppercase text-xs">Gratis x 14 días</span>
                   </div>
                   <ul className="space-y-5 mb-10 flex-1">
                      {['Hasta 50 Guías/mes', '1 Cliente', 'Dashboard Básico', 'Soporte vía Email'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-400 font-medium italic">
                           <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span> {item}
                        </li>
                      ))}
                   </ul>
                   <Link href="/registro" className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-center hover:bg-white/10 transition-all">Probár Ahora</Link>
                </div>

                {/* PRO Plan (Featured) */}
                <div className="p-10 bg-slate-900/80 border-2 border-primary rounded-[40px] backdrop-blur-3xl flex flex-col relative shadow-[0_0_80px_rgba(var(--primary-rgb),0.1)] scale-105">
                   <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-xl">RECOMENDADO</div>
                   <p className="text-sm font-black text-primary uppercase tracking-widest mb-2">Profesional</p>
                   <h4 className="text-3xl font-black mb-6">PLATINUM</h4>
                   <div className="flex items-baseline gap-2 mb-8 text-primary">
                      <span className="text-5xl font-black">$49.990</span>
                      <span className="text-primary/70 font-bold uppercase text-xs">Mensual</span>
                   </div>
                   <ul className="space-y-5 mb-10 flex-1">
                      {['Guías Ilimitadas', 'Clientes Ilimitados', 'Analítica Avanzada BI', 'Excel Export Pro', 'Soporte Prioritario'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-200 font-bold">
                           <span className="material-symbols-outlined text-primary text-lg font-black">verified</span> {item}
                        </li>
                      ))}
                   </ul>
                   <Link href="/registro" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-center shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all">ELEGIR PLAN PRO</Link>
                </div>

                {/* Enterprise Plan */}
                <div className="p-10 bg-slate-900/50 border border-white/10 rounded-[40px] backdrop-blur-3xl flex flex-col hover:border-white/20 transition-colors">
                   <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">Corporativo</p>
                   <h4 className="text-3xl font-black mb-6">CUSTOM</h4>
                   <div className="flex items-baseline gap-2 mb-8">
                      <span className="text-5xl font-black text-white">---</span>
                      <span className="text-slate-400 font-bold uppercase text-xs">Consultar</span>
                   </div>
                   <ul className="space-y-5 mb-10 flex-1">
                      {['Múltiples Faenas/Empresas', 'API Integration', 'Formación de Staff', 'SLA Garantizado', 'Manager Dedicado'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-400 font-medium italic">
                           <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span> {item}
                        </li>
                      ))}
                   </ul>
                   <Link href="mailto:ventas@gravoka.app" className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-center hover:bg-white/10 transition-all">Contactar Ventas</Link>
                </div>
             </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-40 px-6 max-w-7xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-primary/20 blur-[150px] -z-10 opacity-30 rounded-full"></div>
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter mb-12 max-w-4xl mx-auto leading-none uppercase">
            ¿LISTO PARA LLEVAR TU PLANTA AL <span className="text-primary italic">SIGUIENTE NIVEL?</span>
          </h2>
          <Link href="/registro" className="inline-flex px-16 py-8 bg-white text-slate-950 rounded-[32px] font-black text-2xl shadow-2xl shadow-white/5 hover:scale-110 active:scale-95 transition-all uppercase tracking-tighter items-center gap-5">
             Comenzar gratis ahora <span className="material-symbols-outlined text-4xl font-black">rocket_launch</span>
          </Link>
          <p className="mt-10 text-slate-500 font-bold uppercase tracking-widest text-sm">Sin tarjeta de crédito requerida • Setup en 5 minutos</p>
        </section>

        {/* FOOTER */}
        <footer className="py-20 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-20 md:gap-10">
             <div className="col-span-1 md:col-span-1">
                <div className="flex items-center gap-3 mb-8">
                   <div className="size-9 bg-primary rounded-lg flex items-center justify-center">
                     <span className="material-symbols-outlined text-white text-xl">rocket_launch</span>
                   </div>
                   <span className="text-lg font-black uppercase tracking-tighter">Gravoka</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">El sistema operativo para la industria moderna de áridos en Latinoamérica.</p>
             </div>
             
             <div>
                <h5 className="font-black text-xs uppercase tracking-widest text-white mb-8">Producto</h5>
                <ul className="space-y-4 text-sm text-slate-500 font-bold">
                   <li><Link href="#features" className="hover:text-primary transition-colors">Funcionalidades</Link></li>
                   <li><Link href="#pricing" className="hover:text-primary transition-colors">Precios</Link></li>
                   <li><Link href="/login" className="hover:text-primary transition-colors">Demo Online</Link></li>
                </ul>
             </div>

             <div>
                <h5 className="font-black text-xs uppercase tracking-widest text-white mb-8">Empresa</h5>
                <ul className="space-y-4 text-sm text-slate-500 font-bold">
                   <li><Link href="/nosotros" className="hover:text-primary transition-colors">Nosotros</Link></li>
                   <li><Link href="/contacto" className="hover:text-primary transition-colors">Contacto</Link></li>
                   <li><Link href="/blog" className="hover:text-primary transition-colors">Recursos API</Link></li>
                </ul>
             </div>

             <div>
                <h5 className="font-black text-xs uppercase tracking-widest text-white mb-8">Noticias</h5>
                <div className="flex gap-2 mb-6">
                   <input type="text" placeholder="Tu email..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-primary/50 transition-colors" />
                   <button className="size-10 bg-white/5 border border-white/10 flex items-center justify-center rounded-xl hover:bg-white/10 text-primary transition-all">
                      <span className="material-symbols-outlined text-xl">send</span>
                   </button>
                </div>
             </div>
          </div>
          <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">© 2026 Gravoka Inc. Todos los derechos reservados.</p>
             <div className="flex gap-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                <Link href="/privacidad" className="hover:text-white transition-colors">PRIVACIDAD</Link>
                <Link href="/terminos" className="hover:text-white transition-colors">TÉRMINOS</Link>
             </div>
          </div>
        </footer>
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
