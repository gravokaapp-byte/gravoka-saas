'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

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
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    if (!profile?.empresa_id) return;

    // Fetch Company Config
    getDoc(doc(db, 'configuracion_empresa', profile.empresa_id)).then((snap: any) => {
      if (snap.exists()) setConfig(snap.data());
    });

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

  const [showToast, setShowToast] = useState(false);

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
        cliente_nombre: clients.find(c => c.id === selectedClientId)?.name || 'Anónimo',
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

      // Feedback visual
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);

      // Trigger Print
      setTimeout(() => {
        window.print();
        
        // Reset form after print dialog
        setSelectedClientId('');
        setSelectedMaterialId('');
        setSelectedCamionId('');
        setQuantity('');
        setPaymentMethod(null);
      }, 500);

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

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-10 right-10 z-[100] animate-in fade-in slide-in-from-bottom-5">
          <div className="bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-green-500/50">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
            <div className="flex flex-col">
              <span className="font-bold">¡Guía Emitida!</span>
              <span className="text-sm opacity-90">El documento se ha generado correctamente.</span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Ticket */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-10 text-black">
        <div className="max-w-md mx-auto border-2 border-black p-6 flex flex-col gap-4">
          <div className="text-center border-b-2 border-dashed border-black pb-4">
            <h1 className="text-2xl font-black uppercase text-primary">{config?.nombre_empresa || 'Gravoka SpA'}</h1>
            <p className="text-xs font-bold">{config?.rut || 'RUT 77.XXX.XXX-X'}</p>
            <p className="text-[10px]">{config?.direccion || 'Matriz de Operaciones'}</p>
            <div className="mt-2 text-sm font-black border border-black p-1">GUÍA DE DESPACHO ELECTRÓNICA</div>
          </div>
          
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="font-bold">FECHA:</span>
            <span>{new Date().toLocaleString()}</span>
            
            <span className="font-bold">CLIENTE:</span>
            <span className="uppercase">{clients.find(c => c.id === selectedClientId)?.name}</span>
            
            <span className="font-bold">PATENTE:</span>
            <span className="uppercase">{camiones.find(c => c.id === selectedCamionId)?.patente}</span>
            
            <span className="font-bold">CONDUCTOR:</span>
            <span className="uppercase">{camiones.find(c => c.id === selectedCamionId)?.conductor_nombre}</span>
          </div>

          <div className="border-y-2 border-dashed border-black py-4 my-2">
            <div className="flex justify-between font-black text-lg">
              <span>{selectedMaterial?.nombre}</span>
              <span>{quantity} m³</span>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1 text-[10px] opacity-70">
              <span>MÉTODO: {paymentMethod?.toUpperCase()}</span>
              <span>SISTEMA: GRAVOKA SaaS v4.2</span>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold">TOTAL</p>
              <p className="text-xl font-black tracking-tighter">{formatCurrency(total)}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-300 text-center text-[10px]">
            <p>GRACIAS POR SU PREFERENCIA</p>
            <p>Documento no válido como factura</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\:block, .print\:block * {
            visibility: visible;
          }
          .print\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
