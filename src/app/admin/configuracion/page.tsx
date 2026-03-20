'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Settings2, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  Save,
  CheckCircle2
} from 'lucide-react';

export default function AdminConfigPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [pricing, setPricing] = useState({
    startup: 29990,
    full: 79990
  });
  const [registroPublico, setRegistroPublico] = useState(false);
  const [modoMantenimiento, setModoMantenimiento] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'config', 'saas');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.pricing) setPricing(data.pricing);
          if (data.registroPublico !== undefined) setRegistroPublico(data.registroPublico);
          if (data.modoMantenimiento !== undefined) setModoMantenimiento(data.modoMantenimiento);
        }
      } catch (error) {
        console.error("Error al cargar configuración SaaS:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'saas'), {
        pricing,
        registroPublico,
        modoMantenimiento,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error al guardar configuración SaaS:", error);
      alert("Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (profile?.rol !== 'superadmin') {
    return <div className="p-10">Acceso denegado.</div>;
  }

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-10">
        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Settings2 className="size-8" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Configuración SaaS</h1>
          <p className="text-slate-500">Ajusta los parámetros globales de la plataforma Gravoka.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Pricing Management */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3">
            <CreditCard className="text-primary" /> Precios de Planes (CLP)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PriceInput label="Plan Startup" value={pricing.startup} onChange={(v) => setPricing({...pricing, startup: v})} />
            <PriceInput label="Plan Full" value={pricing.full} onChange={(v) => setPricing({...pricing, full: v})} />
          </div>
          <p className="mt-6 text-xs text-slate-400 italic">
            * Estos valores se reflejarán automáticamente en la página de suscripción y en el cálculo del MRR.
          </p>
        </div>

        {/* Security & Access */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3">
            <ShieldCheck className="text-primary" /> Seguridad del Sistema
          </h3>
          <div className="space-y-4">
            <ToggleOption 
              title="Registro Público" 
              description="Permitir que nuevas empresas se registren sin invitación previa." 
              checked={registroPublico} 
              onToggle={() => setRegistroPublico(!registroPublico)}
            />
            <ToggleOption 
              title="Modo Mantenimiento" 
              description="Suspender el acceso a todos los clientes temporalmente." 
              checked={modoMantenimiento} 
              onToggle={() => setModoMantenimiento(!modoMantenimiento)}
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-4 pt-4">
          {success && (
            <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-6 py-3 rounded-xl">
              <CheckCircle2 className="size-5" />
              Configuración SaaS actualizada
            </div>
          )}
          <button 
            type="submit"
            disabled={saving}
            className="flex items-center gap-3 px-10 py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Save className={`size-6 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Procesando...' : 'Guardar Parámetros'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PriceInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
        <input 
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 pl-8 pr-4 font-bold"
        />
      </div>
    </div>
  );
}

function ToggleOption({ title, description, checked, onToggle }: { title: string, description: string, checked: boolean, onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors" onClick={onToggle}>
      <div>
        <p className="font-bold text-sm tracking-tight">{title}</p>
        <p className="text-[10px] text-slate-500 font-medium">{description}</p>
      </div>
      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${checked ? 'bg-primary' : 'bg-slate-300'}`}>
        <div className={`size-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}
