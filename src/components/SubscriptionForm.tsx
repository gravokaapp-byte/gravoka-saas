'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function SubscriptionForm({ empresaId }: { empresaId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (isTest: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('empresaId', empresaId);
      if (isTest) formData.append('isTest', 'true');

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

  if (!empresaId) {
    return (
      <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
        Error: No se detectó tu identificador de empresa. Por favor, cierra sesión e inicia de nuevo.
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
      
      <button
        type="button"
        onClick={() => handleSubscribe(false)}
        disabled={loading}
        className={`w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white transition-colors duration-200 ${
          loading ? 'bg-emerald-400 cursor-wait' : 'bg-[#00A859] hover:bg-emerald-600'
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
