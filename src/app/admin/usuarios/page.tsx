'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Users,
  Search,
  Filter,
  Mail,
  Shield,
  Building2,
  ChevronRight,
  Plus,
  Trash2,
  UserX,
  UserCheck,
  MoreVertical,
  X
} from 'lucide-react';
import { 
  createManualUserAction, 
  resetPasswordAction, 
  updateUserAction, 
  toggleUserStatusAction, 
  deleteUserAction 
} from '@/app/actions/tenantActions';

interface UserRecord {
  id: string;
  email?: string;
  nombre?: string;
  rol: string;
  empresa_id: string;
  empresa_nombre?: string;
  estado?: 'activo' | 'inactivo';
}

export default function UsuariosAdminPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('all');
  const [filterRol, setFilterRol] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [empresas, setEmpresas] = useState<{id: string, nombre: string}[]>([]);

  useEffect(() => {
    if (!loading && profile?.rol !== 'superadmin') router.push('/');
    loadUsuarios();
  }, [loading, profile, router]);

  const loadUsuarios = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'usuarios'));
      const snapshot = await getDocs(q);
      
      const usersData = await Promise.all(snapshot.docs.map(async (docRef) => {
        const data = docRef.data();
        
        // Fetch empresa info for display
        let empresaNombre = 'Sin Empresa';
        if (data.empresa_id) {
          const empRef = doc(db, 'empresas', data.empresa_id);
          const empSnap = await getDoc(empRef);
          if (empSnap.exists()) {
            empresaNombre = empSnap.data().nombre;
          }
        }

        return {
          id: docRef.id,
          ...data,
          empresa_nombre: empresaNombre
        } as UserRecord;
      }));

      setUsuarios(usersData);
    } catch (e) {
      console.error("Error loading users:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchEmpresas = async () => {
      const snap = await getDocs(collection(db, 'empresas'));
      setEmpresas(snap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre })));
    };
    if (profile?.rol === 'superadmin') fetchEmpresas();
  }, [profile]);

  const filtered = usuarios.filter(u => {
    const matchesSearch = u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.empresa_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEmpresa = filterEmpresa === 'all' || u.empresa_id === filterEmpresa;
    const matchesRol = filterRol === 'all' || u.rol === filterRol;

    return matchesSearch && matchesEmpresa && matchesRol;
  });

  const handleResetPassword = async (email: string) => {
    if (!email) return alert("El usuario no tiene email validado.");
    if (!confirm(`¿Enviar enlace de recuperación a ${email}?`)) return;
    
    const res = await resetPasswordAction(email);
    if (res.success) {
      alert(`Enlace generado con éxito. En un entorno real se enviaría por email.\n\nLink: ${res.link}`);
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  const handleToggleStatus = async (user: UserRecord) => {
    const newStatus = user.estado === 'inactivo' ? false : true; // disabled true results in inactivo
    const actionText = user.estado === 'inactivo' ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Estás seguro de que deseas ${actionText} este usuario?`)) return;

    const res = await toggleUserStatusAction(user.id, !newStatus);
    if (res.success) {
      loadUsuarios();
    } else {
      alert(res.error);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm("¿ELIMINAR PERMANENTEMENTE este usuario? Esta acción no se puede deshacer.")) return;
    
    const res = await deleteUserAction(uid);
    if (res.success) {
      setIsEditModalOpen(false);
      loadUsuarios();
    } else {
      alert(res.error);
    }
  };

  if (loading || profile?.rol !== 'superadmin') return null;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 italic">
            <Users className="size-6 md:size-8 text-primary" />
            Gestión de Usuarios SaaS
          </h1>
          <p className="text-sm text-slate-500">Visualiza y administra todos los accesos de tus clientes.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] md:text-xs shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="size-4" />
            Nuevo Usuario
          </button>
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm w-full md:w-60"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-[10px] font-bold uppercase"
            >
              <option value="all">Todas las Empresas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-black">Nuevo Usuario SaaS</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X className="size-5" />
                </button>
              </div>
              <p className="text-slate-500 text-sm mb-8">Registra un nuevo usuario y vincúlalo a una empresa.</p>
              
              <form action={async (formData) => {
                setIsLoadingModal(true);
                const data = {
                  nombre: formData.get('nombre') as string,
                  email: formData.get('email') as string,
                  rol: formData.get('rol') as string,
                  empresa_id: formData.get('empresa_id') as string
                };
                const res = await createManualUserAction(data);
                setIsLoadingModal(false);
                if (res.success) {
                  setIsAddModalOpen(false);
                  loadUsuarios();
                  alert(`${res.message}`);
                } else {
                  alert(res.error);
                }
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Nombre Completo</label>
                  <input name="nombre" required className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-950 font-bold" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Email</label>
                  <input name="email" type="email" required className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-950 font-bold" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Empresa</label>
                    <select name="empresa_id" required className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-950 font-bold appearance-none">
                      <option value="">Seleccionar...</option>
                      {empresas.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Rol</label>
                    <select name="rol" className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-950 font-bold appearance-none">
                      <option value="admin_tenant">Admin Empresa</option>
                      <option value="operario">Operario</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-slate-400">Cancelar</button>
                  <button type="submit" disabled={isLoadingModal} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                    {isLoadingModal ? 'Creando...' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-black">Editar Usuario</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X className="size-5" />
                </button>
              </div>
              <p className="text-slate-500 text-sm mb-8">Modifica los datos y permisos de acceso del usuario.</p>
              
              <form action={async (formData) => {
                setIsLoadingModal(true);
                const data = {
                  nombre: formData.get('nombre') as string,
                  rol: formData.get('rol') as string,
                  empresa_id: formData.get('empresa_id') as string
                };
                const res = await updateUserAction(selectedUser.id, data);
                setIsLoadingModal(false);
                if (res.success) {
                  setIsEditModalOpen(false);
                  loadUsuarios();
                } else {
                  alert(res.error);
                }
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Nombre Completo</label>
                  <input name="nombre" defaultValue={selectedUser.nombre} required className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-950 font-bold" />
                </div>
                
                <div className="space-y-2 opacity-60">
                  <label className="text-[10px] font-black uppercase text-slate-400">Email (No editable)</label>
                  <input value={selectedUser.email || ''} readOnly className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-100 dark:bg-slate-900 font-bold cursor-not-allowed" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Empresa</label>
                    <select name="empresa_id" defaultValue={selectedUser.empresa_id} required className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-950 font-bold appearance-none">
                      {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Rol</label>
                    <select name="rol" defaultValue={selectedUser.rol} className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-950 font-bold appearance-none">
                      <option value="admin_tenant">Admin Empresa</option>
                      <option value="operario">Operario</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => handleToggleStatus(selectedUser)}
                      className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest border border-slate-200 flex items-center justify-center gap-2 ${selectedUser.estado === 'inactivo' ? 'text-green-600' : 'text-amber-600'}`}
                    >
                      {selectedUser.estado === 'inactivo' ? <UserCheck className="size-4" /> : <UserX className="size-4" />}
                      {selectedUser.estado === 'inactivo' ? 'Activar' : 'Suspender'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      className="flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-red-500 border border-slate-200 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="size-4" />
                      Eliminar
                    </button>
                  </div>
                  <button type="submit" disabled={isLoadingModal} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                    {isLoadingModal ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Usuario</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Empresa</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Rol</th>
                <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Estado</th>
                <th className="px-4 md:px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 md:px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 italic shrink-0">
                        {user.nombre?.charAt(0) || user.email?.charAt(0) || '?'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm truncate">
                          {user.nombre || 'Sin Nombre'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium italic lowercase truncate">
                          {user.email || 'Sin Email'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Building2 className="size-4 opacity-40 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-tight truncate max-w-[150px]">{user.empresa_nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Shield className={`size-4 shrink-0 ${user.rol === 'admin_tenant' ? 'text-primary' : 'text-slate-400'}`} />
                      <span className={`text-[10px] font-black uppercase ${user.rol === 'admin_tenant' ? 'text-primary' : 'text-slate-500'}`}>
                        {user.rol === 'admin_tenant' ? 'Admin Empresa' : 'Operario'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`size-2 rounded-full ${user.estado === 'inactivo' ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></div>
                      <span className={`text-[10px] font-bold uppercase ${user.estado === 'inactivo' ? 'text-amber-600' : 'text-green-600'}`}>
                        {user.estado === 'inactivo' ? 'Inactivo' : 'Activo'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleResetPassword(user.email || '')}
                        className="p-2 hover:bg-primary/10 rounded-xl text-slate-400 hover:text-primary transition-colors"
                        title="Enviar reset de contraseña"
                      >
                        <Mail className="size-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Editar Usuario"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <Users className="size-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No se encontraron usuarios</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
