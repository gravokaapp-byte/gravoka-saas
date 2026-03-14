'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

const MATERIAL_PRICES: Record<string, number> = {
  'Base Estabilizada': 5000,
  'Arena Planta': 8000,
  'Gravilla 3/4': 12000,
  'Ripio Integral': 4500,
};

type PaymentMethod = 'credito' | 'efectivo' | 'transferencia' | null;

interface Client {
  id: string;
  name: string;
}

export default function GuiasPage() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  
  const [material, setMaterial] = useState('');
  const [quantity, setQuantity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!profile?.empresa_id) return;

    const q = query(
      collection(db, 'clientes'),
      where('empresa_id', '==', profile.empresa_id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Client[];
      setClients(docs);
    });

    return () => unsubscribe();
  }, [profile?.empresa_id]);

  const total = useMemo(() => {
    const price = MATERIAL_PRICES[material] || 0;
    const qty = parseFloat(quantity) || 0;
    return price * qty;
  }, [material, quantity]);

  const handleEmitir = async () => {
    if (!selectedClientId || !material || !quantity || !paymentMethod) {
      alert('Por favor complete todos los campos obligatorios y seleccione un método de pago.');
      return;
    }

    if (!profile?.empresa_id) return;

    setIsProcessing(true);
    
    try {
      await addDoc(collection(db, 'guias'), {
        empresa_id: profile.empresa_id,
        cliente_id: selectedClientId,
        material: material,
        cantidad: parseFloat(quantity),
        metodo_pago: paymentMethod,
        total_estimado: total,
        creado_en: serverTimestamp(),
        estado: 'Emitida'
      });

      alert('¡Guía de Despacho guardada e impresa exitosamente!');
      
      // Reset form
      setSelectedClientId('');
      setMaterial('');
      setQuantity('');
      setPaymentMethod(null);
    } catch (error) {
      console.error("Error al emitir guía", error);
      alert('Hubo un error al emitir la guía de despacho.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <main className="flex flex-1 justify-center py-6 px-4 md:px-10 lg:px-40">
        <div className="flex flex-col max-w-[960px] flex-1 gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Nueva Guía de Despacho</h1>
            <p className="text-primary font-semibold text-sm">Flujo de Alta Velocidad (&lt;15s)</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identificación */}
            <div className="flex flex-col gap-6 bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_search</span>
                Identificación
              </h3>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">CLIENTE</span>
                  <select 
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="h-16 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-semibold focus:border-primary focus:ring-0"
                  >
                    <option value="">Buscar Cliente...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">CAMIÓN / PATENTE</span>
                  <select className="h-16 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-semibold focus:border-primary focus:ring-0">
                    <option value="">Seleccionar Camión...</option>
                    <option value="1">TRUCK-45 [GD-HY-22]</option>
                    <option value="2">MACK-09 [KJ-LL-90]</option>
                    <option value="3">VOLVO-12 [PP-WW-44]</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Carga y Volumen */}
            <div className="flex flex-col gap-6 bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">precision_manufacturing</span>
                Carga y Volumen
              </h3>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">MATERIAL</span>
                  <select 
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="h-16 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-semibold focus:border-primary focus:ring-0"
                  >
                    <option value="">Tipo de Árido...</option>
                    <option value="Base Estabilizada">Base Estabilizada</option>
                    <option value="Arena Planta">Arena Planta</option>
                    <option value="Gravilla 3/4">Gravilla 3/4</option>
                    <option value="Ripio Integral">Ripio Integral</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">CANTIDAD (m³)</span>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0.0"
                      className="h-16 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-2xl font-bold text-primary focus:border-primary focus:ring-0" 
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-400">TOTAL ESTIMADO</span>
                    <div className="h-16 w-full flex items-center px-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-2xl font-black text-slate-400">
                      {formatCurrency(total)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="md:col-span-2 flex flex-col gap-6 bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">payments</span>
                Método de Pago
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => setPaymentMethod('credito')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold ${
                    paymentMethod === 'credito' 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">credit_card</span>
                  <span>CRÉDITO</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold ${
                    paymentMethod === 'efectivo' 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">payments</span>
                  <span>EFECTIVO</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('transferencia')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold ${
                    paymentMethod === 'transferencia' 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">account_balance</span>
                  <span>BANCO / TRANSF.</span>
                </button>
              </div>
            </div>

            {/* Acción */}
            <div className="md:col-span-2 py-4">
              <button 
                onClick={handleEmitir}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-4 bg-primary text-white h-24 rounded-2xl shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100"
              >
                {isProcessing ? (
                   <span className="material-symbols-outlined animate-spin text-4xl">autorenew</span>
                ) : (
                   <span className="material-symbols-outlined text-4xl">print</span>
                )}
                
                <div className="flex flex-col items-start">
                  <span className="text-2xl font-black uppercase tracking-wider leading-none">
                    {isProcessing ? 'Procesando...' : 'Emitir e Imprimir'}
                  </span>
                  <span className="text-sm font-medium opacity-90 leading-none mt-1">Confirmar despacho y generar documento físico</span>
                </div>
              </button>
            </div>
            
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 mt-auto">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-green-500">sensors</span> Sistema Online</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">terminal</span> Terminal: PLANT-01</span>
        </div>
        <p>© 2024 Gravoka SpA - v4.2.0</p>
      </footer>
    </div>
  );
}
