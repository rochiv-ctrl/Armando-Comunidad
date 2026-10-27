'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function OlvidePage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/restablecer`,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('seconds')) {
        setError('Pediste demasiados correos seguidos. Esperá unos minutos y probá de nuevo.');
      } else {
        setError('No pudimos enviar el correo: ' + error.message);
      }
    } else {
      setEnviado(true);
    }
    setEnviando(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200/80 p-8 rounded-3xl shadow-sm space-y-6">
        <div className="space-y-1 text-center">
          <img src="/logo.png" alt="Armando Comunidad" className="w-20 h-20 object-contain mx-auto mb-2" />
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Recuperar contraseña</h1>
          <p className="text-xs text-slate-500">
            Ingresá tu correo institucional y te enviamos un enlace para elegir una nueva.
          </p>
        </div>

        {enviado ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600 leading-relaxed">
              Si <span className="font-bold text-slate-900">{email.trim()}</span> tiene una cuenta, te enviamos un
              correo con el enlace. Revisá también la carpeta de spam.
            </p>
            <Link
              href="/auth"
              className="block w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition text-xs"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <p className="font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">{error}</p>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.correo@campus.economicas.uba.ar"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : 'Enviarme el enlace'}
            </button>

            <div className="text-center">
              <Link href="/auth" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition">
                Volver
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}