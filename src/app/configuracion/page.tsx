'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { 
  Building2, 
  MapPin, 
  CreditCard, 
  Settings2, 
  Bell, 
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ConfigPage() {
  const { profile, effectivePlan } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [config, setConfig] = useState({
    nombre_empresa: '',
    rut: '',
    logo_url: '',
    direccion: '',
    email_notificaciones: '',
    alerta_stock_bajo: true,
    notificar_ventas_grandes: false,
    monto_notificacion: 1000000
  });

  useEffect(() => {
    if (!profile?.empresa_id) return;

    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'configuracion_empresa', profile.empresa_id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        console.error("Error fetching config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [profile?.empresa_id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.empresa_id) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      await setDoc(doc(db, 'configuracion_empresa', profile.empresa_id), config);
      setMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving config:", error);
      setMessage({ type: 'error', text: 'Hubo un error al guardar los cambios.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 animate-pulse text-slate-500 font-bold">Cargando Preferencias...</div>;

  return (
    <div className="flex-1 w-full bg-slate-50 dark:bg-[#020617] overflow-y-auto">
      <main className="px-4 md:px-10 py-12 max-w-[1000px] mx-auto w-full">
        
        <div className="flex flex-col gap-2 mb-10">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Configuración</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Personaliza el comportamiento de Gravoka para tu empresa.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Company Data */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <Building2 className="text-primary" /> Datos Corporativos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-slate-400">Razón Social</label>
                <input 
                  type="text" 
                  value={config.nombre_empresa}
                  onChange={(e) => setConfig({...config, nombre_empresa: e.target.value})}
                  className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl h-14 px-5 font-bold"
                  placeholder="Ej: Gravoka Áridos SpA"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-slate-400">RUT Empresa</label>
                <input 
                  type="text" 
                  value={config.rut}
                  onChange={(e) => setConfig({...config, rut: e.target.value})}
                  className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl h-14 px-5 font-bold"
                  placeholder="77.XXX.XXX-X"
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-black uppercase text-slate-400">Logo de la Empresa (URL PNG/JPG)</label>
                <div className={`relative ${effectivePlan === 'Startup' ? 'opacity-50 grayscale' : ''}`}>
                  <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={config.logo_url || ''}
                    disabled={effectivePlan === 'Startup'}
                    onChange={(e) => setConfig({...config, logo_url: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl h-14 pl-14 pr-5 font-bold"
                    placeholder={effectivePlan === 'Startup' ? "Disponible en Plan Full" : "https://ejemplo.com/logo.png"}
                  />
                  {effectivePlan === 'Startup' && (
                    <div className="absolute inset-0 bg-transparent flex items-center justify-end pr-5">
                       <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full font-black uppercase">Plan Full</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 italic mt-1 px-4">
                  {effectivePlan === 'Startup' 
                    ? '* Mejora tu plan para habilitar la personalización de marca en tus guías.'
                    : '* Este logo aparecerá automáticamente en todas tus guías de despacho impresas.'}
                </p>
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-black uppercase text-slate-400">Dirección de Planta / Matriz</label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={config.direccion}
                    onChange={(e) => setConfig({...config, direccion: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl h-14 pl-14 pr-5 font-bold"
                    placeholder="Calle #Número, Comuna, Región"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <Bell className="text-primary" /> Alertas y Notificaciones
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div>
                  <p className="font-bold">Notificar Ventas Especiales</p>
                  <p className="text-xs text-slate-500">Recibir correo cuando una guía supere el monto definido.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={config.notificar_ventas_grandes}
                  onChange={(e) => setConfig({...config, notificar_ventas_grandes: e.target.checked})}
                  className="size-6 accent-primary rounded-lg border-none"
                />
              </div>
              {config.notificar_ventas_grandes && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-black uppercase text-slate-400">Monto Límite (CLP)</label>
                  <input 
                    type="number" 
                    value={config.monto_notificacion}
                    onChange={(e) => setConfig({...config, monto_notificacion: parseInt(e.target.value)})}
                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl h-14 px-5 font-bold"
                    placeholder="1000000"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-6 pt-4">
            {message && (
              <div className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold animate-in zoom-in-95 ${
                message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
                {message.text}
              </div>
            )}
            <div className="flex-1" />
            <button 
              type="submit"
              disabled={saving}
              className="flex items-center gap-3 px-10 py-5 bg-primary text-white rounded-2xl font-black shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className={`size-6 ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
