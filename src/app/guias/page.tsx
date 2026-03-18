'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';

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
  const [obra, setObra] = useState('Despacho Directo');
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

  const [fleteCost, setFleteCost] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [guiaNumero, setGuiaNumero] = useState<number | null>(null);

  const handleEmitir = async () => {
    if (!selectedClientId || !selectedMaterialId || !quantity || !paymentMethod || !selectedCamionId) {
      alert('Por favor complete todos los campos obligatorios incluyendo cliente, camión y material.');
      return;
    }

    if (!profile?.empresa_id) return;
    setIsProcessing(true);
    
    try {
      const selectedCamion = camiones.find(c => c.id === selectedCamionId);

      // Get next sequential GLOBAL guide number via transaction
      const contadorRef = doc(db, 'contadores', 'global');
      let nextNumero = 1;

      await runTransaction(db, async (transaction) => {
        const contadorSnap = await transaction.get(contadorRef);
        if (contadorSnap.exists()) {
          nextNumero = (contadorSnap.data().ultimo_numero_guia || 0) + 1;
          transaction.update(contadorRef, { ultimo_numero_guia: nextNumero });
        } else {
          nextNumero = 1;
          transaction.set(contadorRef, { ultimo_numero_guia: 1 });
        }

        transaction.set(doc(collection(db, 'guias')), {
          empresa_id: profile.empresa_id,
          numero_guia: nextNumero,
          cliente_id: selectedClientId,
          cliente_nombre: clients.find(c => c.id === selectedClientId)?.name || 'Anónimo',
          material_id: selectedMaterialId,
          material_nombre: selectedMaterial?.nombre,
          cantidad: parseFloat(quantity),
          obra: obra,
          metodo_pago: paymentMethod,
          total_estimado: total,
          flete_costo: parseFloat(fleteCost) || 0,
          camion_id: selectedCamionId,
          camion_patente: selectedCamion?.patente,
          conductor_nombre: selectedCamion?.conductor_nombre,
          creado_en: serverTimestamp(),
          estado: 'Emitida'
        });
      });

      setGuiaNumero(nextNumero);

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
        setFleteCost('');
        setObra('Despacho Directo');
        setPaymentMethod(null);
        setGuiaNumero(null);
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
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Nueva Guía de Despacho</h1>
            <p className="text-primary font-semibold text-xs md:text-sm">Flujo de Alta Velocidad (&lt;15s)</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identificación */}
            <div className="flex flex-col gap-6 bg-white dark:bg-slate-900/50 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">OBRA / DESTINO</span>
                  <input
                    type="text"
                    value={obra}
                    onChange={(e) => setObra(e.target.value)}
                    placeholder="Ej: Obra Central / Bodega Sur"
                    className="h-14 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-semibold focus:border-primary focus:ring-0"
                  />
                </label>
              </div>
            </div>

            {/* Carga y Volumen */}
            <div className="flex flex-col gap-6 bg-white dark:bg-slate-900/50 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">CANTIDAD (m³)</span>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0.0"
                      className="h-14 md:h-16 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xl md:text-2xl font-bold text-primary focus:border-primary focus:ring-0" 
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">COSTO FLETE ($)</span>
                    <input 
                      type="number" 
                      value={fleteCost}
                      onChange={(e) => setFleteCost(e.target.value)}
                      placeholder="0"
                      className="h-14 md:h-16 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xl md:text-2xl font-bold text-blue-500 focus:border-blue-500 focus:ring-0" 
                    />
                  </label>
                  <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
                    <span className="text-sm font-bold text-slate-400 uppercase">Total Bruto</span>
                    <div className="h-14 md:h-16 w-full flex items-center px-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-xl md:text-2xl font-black text-slate-400">
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

      {/* Hidden Print Ticket - Dual Copy */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] text-black">
        {[
          { label: 'COPIA CLIENTE', key: 'client' },
          { label: 'COPIA INTERNA', key: 'internal' }
        ].map((copy, index) => (
          <div key={copy.key} className="print-copy">
            
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                {config?.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="max-h-16 w-auto" />
                ) : (
                  <div className="size-16 rounded border flex items-center justify-center bg-slate-100 text-[10px] text-slate-400 font-bold uppercase">Logo</div>
                )}
                <div>
                  <h1 className="text-xl font-black uppercase text-slate-900">{config?.nombre_empresa || 'Gravoka SpA'}</h1>
                  <p className="text-xs font-bold">{config?.rut || 'RUT 77.XXX.XXX-X'}</p>
                  <p className="text-[10px] text-slate-500">{config?.direccion || 'Matriz de Operaciones'}</p>
                </div>
              </div>
              <div className="text-right border-2 border-red-500 p-3 rounded">
                <h3 className="text-red-500 font-bold text-sm">GUÍA DE DESPACHO ELECTRÓNICA</h3>
                <p className="text-lg font-mono font-black italic">N° {(guiaNumero ?? 0).toString().padStart(6, '0')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 my-6">
              <div className="border p-3 rounded bg-slate-50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Cliente</h4>
                <p className="font-black text-md uppercase">{clients.find(c => c.id === selectedClientId)?.name}</p>
                <p className="text-[10px]"><b>OBRA:</b> {obra}</p>
              </div>
              <div className="border p-3 rounded bg-slate-50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Transporte</h4>
                <p className="text-[11px]"><b>PATENTE:</b> {camiones.find(c => c.id === selectedCamionId)?.patente}</p>
                <p className="text-[11px]"><b>CONDUCTOR:</b> {camiones.find(c => c.id === selectedCamionId)?.conductor_nombre}</p>
                <p className="text-[11px]"><b>FECHA/HORA:</b> {new Date().toLocaleString()}</p>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100/50">
                  <th className="border p-2 text-left text-[10px] font-black uppercase">Material</th>
                  <th className="border p-2 text-center text-[10px] font-black uppercase">cantidad</th>
                  <th className="border p-2 text-right text-[10px] font-black uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3 text-sm font-bold uppercase">{selectedMaterial?.nombre}</td>
                  <td className="border p-3 text-center text-lg font-black">{quantity} m³</td>
                  <td className="border p-3 text-right text-md font-black">{formatCurrency(total)}</td>
                </tr>
                {parseFloat(fleteCost) > 0 && (
                  <tr>
                    <td colSpan={2} className="border p-2 text-right text-[10px] font-black uppercase bg-slate-50">Flete / Transporte</td>
                    <td className="border p-2 text-right text-sm font-bold">{formatCurrency(parseFloat(fleteCost))}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={2} className="border p-2 text-right text-[10px] font-black uppercase bg-slate-100">Total Final</td>
                  <td className="border p-2 text-right text-lg font-black bg-slate-100">{formatCurrency(total + (parseFloat(fleteCost) || 0))}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-end mt-4">
              <div className="flex flex-col gap-1 text-[9px] opacity-70">
                <span>PAGO: {paymentMethod?.toUpperCase()}</span>
                <span>EMITIDO POR: {profile?.nombre || 'SISTEMA'}</span>
                <span>GRAVOKA SaaS v4.5</span>
              </div>
              <div className="flex gap-10 items-end">
                {copy.key === 'internal' && (
                  <div className="text-center w-40 border-t border-black pt-1">
                    <p className="text-[9px] font-black uppercase">Recibe Conforme</p>
                  </div>
                )}
                {copy.key === 'internal' && (
                  <div className="text-center w-40 border-t border-black pt-1">
                    <p className="text-[9px] font-black uppercase">Entrega Conforme</p>
                  </div>
                )}
                <div className="bg-slate-900 text-white px-3 py-1 text-[10px] font-black rounded-lg">
                  {copy.label}
                </div>
              </div>
            </div>
            
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          header, footer, nav, aside {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .print\:block, .print\:block * {
            visibility: visible;
          }
          .print\:block {
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-copy {
            width: 100%;
            height: 100vh;
            padding: 1.5cm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box;
            background: white !important;
            color: black !important;
          }
          .print-copy:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
