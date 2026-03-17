'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

interface Camion {
  id: string;
  patente: string;
  modelo: string;
  conductor_nombre: string;
  capacidad_m3: number;
  empresa_id: string;
}

export default function CamionesPage() {
  const { profile } = useAuth();
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.empresa_id) return;

    const q = query(
      collection(db, 'camiones'),
      where('empresa_id', '==', profile.empresa_id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Camion[];
      setCamiones(docs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.empresa_id]);

  const handleCreateCamion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.empresa_id) return;
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'camiones'), {
        empresa_id: profile.empresa_id,
        patente: formData.get('patente'),
        modelo: formData.get('modelo'),
        conductor_nombre: formData.get('conductor_nombre'),
        capacidad_m3: parseFloat(formData.get('capacidad_m3') as string),
        creado_en: serverTimestamp()
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error al crear camión", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCamion = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este camión?')) return;
    try {
      await deleteDoc(doc(db, 'camiones', id));
    } catch (error) {
      console.error("Error al eliminar camión", error);
    }
  };

  return (
    <div className="flex h-full w-full relative">
      <div className="flex-1">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">Flota de Camiones</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona los vehículos y conductores autorizados para el despacho.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 min-w-[120px] cursor-pointer justify-center rounded-xl h-11 px-6 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform"
          >
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            <span>Añadir Camión</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined">truck</span>
              </div>
              <span className="text-slate-500 text-sm font-medium">Vehículos Activos</span>
            </div>
            <p className="text-2xl font-bold">{isLoading ? '...' : camiones.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40">
                  <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Patente</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Modelo / Marca</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Conductor</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Capacidad</th>
                  <th className="px-4 md:px-6 py-4 text-right text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Cargando flota...</td></tr>
                ) : camiones.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">No hay camiones registrados.</td></tr>
                ) : (
                  camiones.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 md:px-6 py-5">
                        <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-mono font-black text-xs text-slate-900 dark:text-white uppercase">{c.patente}</span>
                      </td>
                      <td className="px-4 md:px-6 py-5 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">{c.modelo}</td>
                      <td className="px-4 md:px-6 py-5 text-sm text-slate-600 dark:text-slate-400 font-black uppercase tracking-tight">{c.conductor_nombre}</td>
                      <td className="px-4 md:px-6 py-5 text-sm text-center font-black text-primary italic">{c.capacidad_m3} m³</td>
                      <td className="px-4 md:px-6 py-5 text-right">
                        <button 
                          onClick={() => handleDeleteCamion(c.id)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">Registro de Vehículo</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setIsModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateCamion} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Patente (Placa)</label>
                <input required name="patente" type="text" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800 uppercase" placeholder="ABCD-12" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Modelo / Marca</label>
                <input required name="modelo" type="text" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800" placeholder="Mercedes-Benz Actros" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Conductor</label>
                <input required name="conductor_nombre" type="text" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Capacidad de Carga (m³)</label>
                <input required name="capacidad_m3" type="number" step="0.1" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800 font-mono" placeholder="15.0" />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? 'Registrando...' : 'Registrar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
