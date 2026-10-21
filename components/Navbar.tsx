'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Navbar() {
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    async function getPerfil() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setPerfil(data);
      }
    }

    getPerfil();
  }, []);

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      {/* Título / Marca */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="text-base font-black text-slate-900 tracking-tight">Armando Comunidad</span>
        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">FCE-UBA</span>
      </Link>

      {/* Saldo de Horas y Datos del Usuario */}
      {perfil && (
        <div className="flex items-center gap-4">
          {/* Badge Saldo de Horas */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-2xl">
            <span className="text-xs font-extrabold text-slate-900">⏱️ {perfil.creditos} Hs Disponibles</span>
          </div>

          {/* Perfil rápido */}
          <Link href={`/dashboard/usuarios/${perfil.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition">
            <img
              src={perfil.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
              alt={perfil.nombre}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <span className="text-xs font-bold text-slate-800">{perfil.nombre}</span>
          </Link>
        </div>
      )}
    </header>
  );
}