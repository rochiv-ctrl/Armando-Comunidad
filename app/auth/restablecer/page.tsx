'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const LARGO_MINIMO = 8;

export default function RestablecerPage() {
  const router = useRouter();

  // "listo" = el enlace del correo fue válido y hay una sesión de recuperación
  const [listo, setListo] = useState(false);
  const [verificando, setVerificando] = useState(true);

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'PASSWORD_RECOVERY' || (sesion && evento === 'SIGNED_IN')) {
        setListo(true);
        setVerificando(false);
      }
    });

    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) {
        setListo(true);
        setVerificando(false);
      }
    });

    // Si en unos segundos no aparece ninguna sesión, el enlace venció o no es válido
    const espera = setTimeout(() => setVerificando(false), 3000);

    return () => {
      data.subscription.unsubscribe();
      clearTimeout(espera);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < LARGO_MINIMO) {
      setError(`La contraseña tiene que tener al menos ${LARGO_MINIMO} caracteres.`);
      return;
    }
    if (password !== confirmar) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }

    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError('No se pudo cambiar la contraseña: ' + error.message);
    } else {
      setExito(true);
    }
    setGuardando(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200/80 p-8 rounded-3xl shadow-sm space-y-6">
        <div className="space-y-1 text-center">
          <img src="/logo.png" alt="Armando Comunidad" className="w-20 h-20 object-contain mx-auto mb-2" />
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Elegí tu nueva contraseña</h1>
        </div>

        {verificando && !listo ? (
          <p className="text-center text-xs text-slate-400">Verificando el enlace...</p>
        ) : exito ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600">¡Listo! Tu contraseña se actualizó correctamente.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition text-xs"
            >
              Entrar a Armando Comunidad
            </button>
          </div>
        ) : !listo ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600 leading-relaxed">
              Este enlace venció o ya fue usado. Pedí uno nuevo y volvé a intentarlo.
            </p>
            <Link
              href="/auth/olvide"
              className="block w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition text-xs"
            >
              Pedir un enlace nuevo
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <p className="font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">{error}</p>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1.5">Mínimo {LARGO_MINIMO} caracteres.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Repetí la contraseña</label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}