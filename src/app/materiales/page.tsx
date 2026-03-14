'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

interface Material {
  id: string;
  nombre: string;
  precio_unitario: number;
  unidad: string;
  empresa_id: string;
}

export default function MaterialesPage() {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.empresa_id) return;

    const q = query(
      collection(db, 'materiales'),
      where('empresa_id', '==', profile.empresa_id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Material[];
      setMaterials(docs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.empresa_id]);

  const handleCreateMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.empresa_id) return;
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'materiales'), {
        empresa_id: profile.empresa_id,
        nombre: formData.get('nombre'),
        precio_unitario: parseFloat(formData.get('precio_unitario') as string),
        unidad: formData.get('unidad') || 'm3',
        creado_en: serverTimestamp()
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error al crear material", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este material?')) return;
    try {
      await deleteDoc(doc(db, 'materiales', id));
    } catch (error) {
      console.error("Error al eliminar material", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  return (
    <div className="flex h-full w-full relative">
      <div className="flex-1">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">Inventario de Materiales</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Configura los tipos de áridos y precios para tus guías de despacho.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 min-w-[120px] cursor-pointer justify-center rounded-xl h-11 px-6 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform"
          >
            <span className="material-symbols-outlined text-[20px]">add_box</span>
            <span>Nuevo Material</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined">category</span>
              </div>
              <span className="text-slate-500 text-sm font-medium">Tipos de Áridos</span>
            </div>
            <p className="text-2xl font-bold">{isLoading ? '...' : materials.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Material</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Unidad</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Precio Unitario</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Cargando catálogo...</td></tr>
                ) : materials.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay materiales definidos. Crea el primero para emitir guías.</td></tr>
                ) : (
                  materials.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{m.nombre}</span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">{m.unidad}</td>
                      <td className="px-6 py-5 text-sm font-mono text-primary font-bold">{formatCurrency(m.precio_unitario)}</td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => handleDeleteMaterial(m.id)}
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
              <h3 className="text-xl font-bold">Configurar Material</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setIsModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateMaterial} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Árido</label>
                <input required name="nombre" type="text" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800" placeholder="Ej. Gravilla 3/4" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Unidad</label>
                  <select name="unidad" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800">
                    <option value="m3">m³ (Metros Cúbicos)</option>
                    <option value="ton">Ton (Toneladas)</option>
                    <option value="un">Un (Unidades)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Precio Unitario (CLP)</label>
                  <input required name="precio_unitario" type="number" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800 font-mono" placeholder="8500" />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50">
                  {isSubmitting ? 'Guardando...' : 'Guardar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
