'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function SubscriptionForm({ 
  empresaId: initialEmpresaId,
  plan = 'Full',
  price = 79990
}: { 
  empresaId?: string,
  plan?: string,
  price?: number
}) {
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState(initialEmpresaId || '');

  useEffect(() => {
    if (!empresaId && profile?.empresa_id) {
      setEmpresaId(profile.empresa_id);
    }
  }, [profile, empresaId]);

  const handleSubscribe = async () => {
    if (!empresaId) {
       setError("No se detectó tu sesión. Por favor, recarga la página.");
       return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('empresaId', empresaId);
      formData.append('email', user?.email || '');
      formData.append('plan', plan);
      formData.append('price', price.toString());

      const response = await fetch('/api/checkout/proceso', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al conectar con la pasarela');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió la URL de pago');
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="w-full flex justify-center py-3">
        <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-100 border border-red-200 rounded-xl text-red-700 text-sm font-bold animate-shake">
          ⚠️ Error: {error}
        </div>
      )}
      
      {!empresaId && !error && (
         <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-sm">
           Detectando cuenta... si esto tarda, por favor reinicia sesión.
         </div>
      )}

      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading || !empresaId}
        className={`w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white transition-colors duration-200 ${
          (loading || !empresaId) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#00A859] hover:bg-emerald-600'
        }`}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Conectando...
          </div>
        ) : 'Suscribirse via MercadoPago'}
      </button>
    </div>
  );
}
