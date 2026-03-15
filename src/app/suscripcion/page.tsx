import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { cookies } from 'next/headers';

export default async function SuscripcionPage() {
  const cookieStore = await cookies();
  const empresaId = cookieStore.get('empresa_id')?.value;

  return (
    <div className="p-20 bg-red-50 min-h-screen">
      <h1 className="text-4xl font-bold">PAGINA DE SUSCRIPCION (DEBUG)</h1>
      <p>ID Empresa: {empresaId || 'Sin Cookie'}</p>
      <div className="mt-10 p-4 border-2 border-dashed border-red-500">
        Si ves una sola barra lateral, el error estaba en los componentes internos.
        Si ves dos, el error está en el Layout global o ruteo.
      </div>
    </div>
  );
}
