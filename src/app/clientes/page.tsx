'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

interface Client {
  id: string; // Firestore ID
  rut: string;
  name: string;
  phone: string;
  status: string;
  type: string;
  empresa_id: string;
}

export default function ClientesPage() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientSubmitting, setNewClientSubmitting] = useState(false);

  useEffect(() => {
    if (!profile?.empresa_id) return;

    const q = query(
      collection(db, 'clientes'),
      where('empresa_id', '==', profile.empresa_id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Client[];
      setClients(docs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.empresa_id]);

  const handleCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.empresa_id) return;
    setNewClientSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'clientes'), {
        empresa_id: profile.empresa_id,
        rut: formData.get('rut'),
        name: formData.get('name'),
        phone: formData.get('phone'),
        status: 'Activo',
        type: formData.get('type') || 'Cliente Regular',
        creado_en: serverTimestamp()
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error al crear cliente", error);
    } finally {
      setNewClientSubmitting(false);
    }
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();
  const getColor = (index: number) => {
    const colors = ['bg-primary/20 text-primary', 'bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-amber-100 text-amber-600'];
    return colors[index % colors.length];
  };

  return (
    <div className="flex h-full w-full relative">
      {/* Main Content */}
      <div className="flex-1">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">Gestión de Clientes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Administra la base de datos de tus socios comerciales y clientes.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 min-w-[120px] cursor-pointer justify-center rounded-xl h-11 px-6 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>Nuevo Cliente</span>
          </button>
        </div>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <span className="text-slate-500 text-sm font-medium">Total Clientes</span>
            </div>
            <p className="text-2xl font-bold">{isLoading ? '...' : clients.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40">
                  <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">RUT</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Empresa</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Teléfono</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                  <th className="px-4 md:px-6 py-4 text-right text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Cargando clientes...</td></tr>
                ) : clients.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">No hay clientes registrados.</td></tr>
                ) : (
                  clients.map((client, i) => (
                    <tr key={client.id} className={`transition-colors ${selectedClient?.id === client.id ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                      <td className="px-4 md:px-6 py-5 text-sm font-medium text-slate-600 dark:text-slate-400 font-mono italic">{client.rut}</td>
                      <td className="px-4 md:px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`size-8 rounded flex items-center justify-center font-bold text-[10px] ${getColor(i)}`}>{getInitials(client.name)}</div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-5 text-sm text-slate-600 dark:text-slate-400 font-medium">{client.phone}</td>
                      <td className="px-4 md:px-6 py-5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700">{client.status}</span>
                      </td>
                      <td className="px-4 md:px-6 py-5 text-right">
                        <button 
                          onClick={() => setSelectedClient(client)}
                          className="text-primary hover:text-primary/80 font-black text-xs uppercase inline-flex items-center gap-1 group"
                        >
                          Ver Historial
                          <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">chevron_right</span>
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
      
      {/* Side Panel */}
      {selectedClient && (
        <aside className="w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden 2xl:flex flex-col ml-8 rounded-2xl shadow-sm h-fit">
          <div className="p-6 border-b border-primary/10 flex justify-between items-center">
            <h3 className="font-bold text-lg">Detalle de Cliente</h3>
            <button className="text-slate-400 hover:text-slate-600" onClick={() => setSelectedClient(null)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6 flex flex-col items-center border-b border-slate-100 dark:border-slate-800">
            <div className="size-20 rounded-2xl flex items-center justify-center text-3xl font-black mb-4 bg-primary/20 text-primary">
              {getInitials(selectedClient.name)}
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white text-center">{selectedClient.name}</h4>
            <p className="text-slate-500 text-sm mt-1">{selectedClient.type}</p>
          </div>
        </aside>
      )}

      {/* New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">Añadir Nuevo Cliente</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setIsModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre/Razón Social</label>
                <input required name="name" type="text" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800" placeholder="Ej. Constructora Delta" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">RUT</label>
                <input required name="rut" type="text" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800" placeholder="12.345.678-9" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                <input required name="phone" type="text" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800" placeholder="+56 9 1234 5678" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                <select name="type" className="w-full px-4 py-2 border rounded-xl dark:bg-slate-950 dark:border-slate-800">
                  <option value="Cliente Regular">Cliente Regular</option>
                  <option value="Socio Estratégico">Socio Estratégico</option>
                  <option value="Transportista Independiente">Transportista Independiente</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  Cancelar
                </button>
                <button type="submit" disabled={newClientSubmitting} className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50">
                  {newClientSubmitting ? 'Guardando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
