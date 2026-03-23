import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { cookies } from 'next/headers';
import SubscriptionForm from '@/components/SubscriptionForm';

export const dynamic = 'force-dynamic';

export default async function SuscripcionPage({
  searchParams,
}: {
  searchParams: { status?: string; error?: string };
}) {
  const cookieStore = await cookies();
  const empresaId = cookieStore.get('empresa_id')?.value;
  const status = searchParams.status;
  const error = searchParams.error;

  let empresaData = null;
  if (empresaId) {
    const empresaRef = doc(db, 'empresas', empresaId);
    const empresaSnap = await getDoc(empresaRef);
    if (empresaSnap.exists()) {
      empresaData = empresaSnap.data();
    }
  }

  // --- NUEVO: Fetch SaaS Config para Precios Dinámicos ---
  let saasPricing = { startup: 29990, full: 79990 };
  try {
    const saasConfigRef = doc(db, 'config', 'saas');
    const saasConfigSnap = await getDoc(saasConfigRef);
    if (saasConfigSnap.exists()) {
      const data = saasConfigSnap.data();
      if (data.pricing) saasPricing = data.pricing;
    }
  } catch (e) {
    console.error("Error al cargar precios SaaS:", e);
  }

  // --- Lógica de Bloqueo ---
  const rawDate = empresaData?.fecha_vencimiento || empresaData?.vencimiento;
  const expiryDate = rawDate?.seconds ? new Date(rawDate.seconds * 1000) : (rawDate ? new Date(rawDate) : null);
  const isExpired = expiryDate && expiryDate < new Date();
  const isInactive = empresaData?.estado !== 'activo';

  return (
    <div className="pt-8 min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Planes y Suscripción
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Comienza con una <strong>Prueba Gratuita de 15 días del Plan Full</strong> sin compromiso.
          </p>
        </div>

        {(isInactive || isExpired) && (
          <div className="mb-8 p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-3xl text-red-700 dark:text-red-400 text-sm font-bold flex gap-4 items-center animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="size-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <div>
              <p className="text-base uppercase tracking-tight">Acceso Restringido</p>
              <p className="font-medium opacity-80">
                {isInactive ? 'Tu cuenta ha sido desactivada por el administrador.' : 'Tu suscripción ha vencido.'} 
                {isExpired && ' Renueva tu plan para continuar operando.'}
              </p>
            </div>
          </div>
        )}

        {error === 'mercadopago_not_configured' && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex gap-3 items-center">
            <div className="size-2 bg-red-500 rounded-full animate-ping" />
            Atención: Mercado Pago no está configurado en el servidor (Falta Token).
          </div>
        )}

        {status === 'success' && (
          <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl text-emerald-700 text-sm font-bold flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">check_circle</span>
              <span>¡Pago procesado con éxito!</span>
            </div>
            <p className="font-medium text-emerald-600/80">Tu cuenta se activará en unos segundos. Por favor, refresca la página.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Startup Plan Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col hover:scale-[1.02] transition-transform">
            <div className="px-6 py-8 sm:p-10">
              <h3 className="inline-flex px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                Plan Startup
              </h3>
              <div className="mt-4 flex items-baseline text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                ${saasPricing.startup.toLocaleString('es-CL')}
                <span className="ml-1 text-sm font-bold text-gray-400 uppercase tracking-widest">/mes</span>
              </div>
              <p className="mt-5 text-base font-black text-slate-700 dark:text-slate-200 leading-tight">
                Digitaliza tu operación por el costo de 1 m³ de Estabilizado Bajo 3
              </p>
            </div>
            <div className="flex-1 flex flex-col justify-between px-6 pt-6 pb-8 sm:p-10 sm:pt-6 bg-slate-50/50 dark:bg-slate-900/50">
              <ul className="space-y-4 mb-8">
                {['Guías de Despacho ilimitadas', 'Clientes, Materiales y Camiones', 'Personalización de Empresa', '1 Planta / Sucursal'].map((f) => (
                  <li key={f} className="flex items-start text-sm">
                    <span className="material-symbols-outlined text-emerald-500 mr-3 text-xl">check_circle</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mb-6 p-3 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary text-center">
                  Incluye 15 días Gratis de Plan Full
                </p>
              </div>
              <SubscriptionForm empresaId={empresaId || ''} plan="Startup" price={saasPricing.startup} />
            </div>
          </div>

          {/* Full Plan Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-primary/10 border-2 border-primary overflow-hidden flex flex-col scale-105 relative">
            <div className="absolute top-0 right-8 bg-primary text-white text-[10px] font-black px-4 py-2 rounded-b-xl uppercase tracking-widest">Recomendado</div>
            <div className="px-6 py-8 sm:p-10">
              <h3 className="inline-flex px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-primary/10 text-primary">
                Plan Full
              </h3>
              <div className="mt-4 flex items-baseline text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                ${saasPricing.full.toLocaleString('es-CL')}
                <span className="ml-2 text-xs md:text-sm font-black text-primary uppercase tracking-[0.2em]">/ MES ACCESO TOTAL</span>
              </div>
              <p className="mt-5 text-sm font-medium text-gray-500 dark:text-gray-400">
                Todo el poder estratégico de BI y gestión profesional.
              </p>
            </div>
            <div className="flex-1 flex flex-col justify-between px-6 pt-6 pb-8 sm:p-10 sm:pt-6 bg-primary/[0.02]">
              <ul className="space-y-4 mb-8">
                {['Todo lo de Startup', 'Dashboard BI Estratégico', 'Reportes Avanzados y Excel', 'Soporte Prioritario 24/7'].map((f) => (
                  <li key={f} className="flex items-start text-sm">
                    <span className="material-symbols-outlined text-primary mr-3 text-xl">stars</span>
                    <span className="text-gray-700 dark:text-gray-300 font-bold">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mb-6 p-3 bg-primary/10 rounded-xl border border-primary/20 animate-pulse">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary text-center">
                  15 Días de Prueba Full Gratis
                </p>
              </div>
              <SubscriptionForm empresaId={empresaId || ''} plan="Full" price={saasPricing.full} />
            </div>
          </div>
        </div>

        {/* Current State Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Estado de Tu Cuenta</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Empresa:</span>
              <span className="text-gray-900 dark:text-white font-semibold">{empresaData?.nombre || 'Cargando...'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-slate-700">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Estado:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                (isInactive || isExpired) ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {isInactive ? 'Inactivo / Suspendido' : (isExpired ? 'Suscripción Vencida' : 'Activo')}
              </span>
            </div>
            {expiryDate && (
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Vencimiento:</span>
                <span className={`font-semibold ${isExpired ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  {expiryDate.toLocaleDateString('es-CL')}
                  {isExpired && ' (Vencido)'}
                </span>
              </div>
            )}
          </div>
          {empresaData?.estado !== 'activo' && (
            <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-400">Atención requerida</h3>
                  <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    <p>
                      Tu cuenta está inactiva. Suscríbete para crear nuevas Guías de Despacho y acceder al Dashboard operativo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {empresaData?.estado === 'activo' && (
            <div className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-400">¡Cuenta Activa!</h3>
                  <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                    Ya puedes utilizar todas las herramientas de gestión y ver los reportes BI.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
