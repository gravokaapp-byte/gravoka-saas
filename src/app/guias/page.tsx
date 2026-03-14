'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

type PaymentMethod = 'credito' | 'efectivo' | 'transferencia' | null;

interface Client {
  id: string;
  name: string;
}

interface Material {
  id: string;
  nombre: string;
  precio_unitario: number;
}

interface Camion {
  id: string;
  patente: string;
  conductor_nombre: string;
}

export default function GuiasPage() {
  const { profile } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedCamionId, setSelectedCamionId] = useState('');
  
  const [quantity, setQuantity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!profile?.empresa_id) return;

    // Fetch Clients
    const qClients = query(collection(db, 'clientes'), where('empresa_id', '==', profile.empresa_id));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Client[]);
    });

    // Fetch Materials
    const qMaterials = query(collection(db, 'materiales'), where('empresa_id', '==', profile.empresa_id));
    const unsubMaterials = onSnapshot(qMaterials, (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        nombre: doc.data().nombre, 
        precio_unitario: doc.data().precio_unitario 
      })) as Material[]);
    });

    // Fetch Trucks
    const qCamiones = query(collection(db, 'camiones'), where('empresa_id', '==', profile.empresa_id));
    const unsubCamiones = onSnapshot(qCamiones, (snapshot) => {
      setCamiones(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        patente: doc.data().patente, 
        conductor_nombre: doc.data().conductor_nombre 
      })) as Camion[]);
    });

    return () => {
      unsubClients();
      unsubMaterials();
      unsubCamiones();
    };
  }, [profile?.empresa_id]);

  const selectedMaterial = useMemo(() => 
    materials.find(m => m.id === selectedMaterialId), 
    [materials, selectedMaterialId]
  );

  const total = useMemo(() => {
    const price = selectedMaterial?.precio_unitario || 0;
    const qty = parseFloat(quantity) || 0;
    return price * qty;
  }, [selectedMaterial, quantity]);

  const handleEmitir = async () => {
    if (!selectedClientId || !selectedMaterialId || !quantity || !paymentMethod || !selectedCamionId) {
      alert('Por favor complete todos los campos obligatorios incluyendo cliente, camión y material.');
      return;
    }

    if (!profile?.empresa_id) return;
    setIsProcessing(true);
    
    try {
      const selectedCamion = camiones.find(c => c.id === selectedCamionId);

      await addDoc(collection(db, 'guias'), {
        empresa_id: profile.empresa_id,
        cliente_id: selectedClientId,
        material_id: selectedMaterialId,
        material_nombre: selectedMaterial?.nombre,
        cantidad: parseFloat(quantity),
        metodo_pago: paymentMethod,
        total_estimado: total,
        camion_id: selectedCamionId,
        camion_patente: selectedCamion?.patente,
        conductor_nombre: selectedCamion?.conductor_nombre,
        creado_en: serverTimestamp(),
        estado: 'Emitida'
      });

      alert('¡Guía de Despacho guardada e impresa exitosamente!');
      
      // Reset form
      setSelectedClientId('');
      setSelectedMaterialId('');
      setSelectedCamionId('');
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
                  <select 
                    value={selectedCamionId}
                    onChange={(e) => setSelectedCamionId(e.target.value)}
                    className="h-16 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-semibold focus:border-primary focus:ring-0"
                  >
                    <option value="">Seleccionar Camión...</option>
                    {camiones.map(c => (
                      <option key={c.id} value={c.id}>{c.patente} [{c.conductor_nombre}]</option>
                    ))}
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
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    className="h-16 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-semibold focus:border-primary focus:ring-0"
                  >
                    <option value="">Tipo de Árido...</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
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
