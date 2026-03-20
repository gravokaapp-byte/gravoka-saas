'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createTenantAction } from '@/app/actions/tenantActions';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export default function RegistroPage() {
  const [formData, setFormData] = useState({
    empresaNombre: '',
    rut: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    plan: 'Full' as 'Startup' | 'Full'
  });
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState({ startup: 29990, full: 79990 });
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  // Load dynamic pricing
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const docRef = doc(db, 'config', 'saas');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.pricing) setPricing(data.pricing);
        }
      } catch (err) {
        console.error("Error loading pricing:", err);
      } finally {
        setLoadingPricing(false);
      }
    };
    fetchPricing();
  }, []);

  // Redirigir si ya está logueado
  if (user) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    try {
      // LLAMADA AL API PÚBLICA DE REGISTRO
      const response = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();

      if (result.success) {
        setSuccess('¡Empresa registrada exitosamente! Redirigiendo al login...');
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError(result.error || 'Error al registrar la empresa.');
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-xl bg-slate-900/50 backdrop-blur-xl border border-white/5 p-10 rounded-[32px] shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="size-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20 rotate-3">
            <span className="material-symbols-outlined text-white text-3xl">rocket_launch</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Comienza con Gravoka</h1>
          <p className="text-slate-400 text-center text-sm max-w-sm">
            Crea tu cuenta empresarial hoy y digitaliza el control de tus áridos en minutos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nombre de Empresa</label>
              <input 
                required
                type="text"
                placeholder="Ej: Transportes del Sur"
                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
                value={formData.empresaNombre}
                onChange={e => setFormData({...formData, empresaNombre: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">RUT Empresa</label>
              <input 
                type="text"
                placeholder="77.654.321-K"
                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
                value={formData.rut}
                onChange={e => setFormData({...formData, rut: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Selecciona tu Plan Inicial (Incluye 15 días Full Trial)</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, plan: 'Startup' })}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group ${
                  formData.plan === 'Startup'
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/5 bg-slate-800/30 text-slate-500 hover:border-white/10'
                }`}
              >
                <span className={`material-symbols-outlined text-3xl mb-1 ${formData.plan === 'Startup' ? 'text-primary' : 'text-slate-600'}`}>storefront</span>
                <span className="font-bold text-sm uppercase tracking-tight">Plan Startup</span>
                <span className="text-[10px] opacity-60 font-medium">
                  {loadingPricing ? 'Cargando...' : `$${pricing.startup.toLocaleString('es-CL')} / mes`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, plan: 'Full' })}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group ${
                  formData.plan === 'Full'
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-white/5 bg-slate-800/30 text-slate-500 hover:border-white/10'
                }`}
              >
                <span className={`material-symbols-outlined text-3xl mb-1 ${formData.plan === 'Full' ? 'text-primary' : 'text-slate-600'}`}>diamond</span>
                <span className="font-bold text-sm uppercase tracking-tight">Plan Full</span>
                <span className="text-[10px] opacity-60 font-medium">
                  {loadingPricing ? 'Cargando...' : `$${pricing.full.toLocaleString('es-CL')} / mes`}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center italic mt-2">
              * Independiente del plan elegido, los primeros 15 días tendrás acceso total a todas las funciones (Trial Full).
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Correo Administrador</label>
            <input 
              required
              type="email"
              placeholder="admin@tuempresa.com"
              className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
              value={formData.adminEmail}
              onChange={e => setFormData({...formData, adminEmail: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
              <input 
                required
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
                value={formData.adminPassword}
                onChange={e => setFormData({...formData, adminPassword: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar</label>
              <input 
                required
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center gap-3 animate-pulse">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined">check_circle</span>
              {success}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group"
          >
            {loading ? 'Creando cuenta...' : (
              <>
                Crear mi cuenta SaaS
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-8 border-t border-white/5">
          <p className="text-slate-500 text-sm">
            ¿Ya tienes una cuenta? <Link href="/login" className="text-primary font-bold hover:underline">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
