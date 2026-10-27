'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// La base de datos ya rechaza cualquier correo que no sea institucional;
// esta validación solo muestra un mensaje claro antes de intentar el registro.
const EXIGIR_DOMINIO_INSTITUCIONAL = true;
const DOMINIO_INSTITUCIONAL = '@campus.economicas.uba.ar';

const CARRERAS = [
  'Contador Público',
  'Licenciatura en Administración',
  'Licenciatura en Economía',
  'Licenciatura en Sistemas de Información de las Organizaciones',
  'Actuario',
  'Tecnicatura Universitaria en Gestión y Análisis de Datos en Organizaciones',
];

const LARGO_MINIMO_CONTRASEÑA = 8;

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);

  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [carrera, setCarrera] = useState(CARRERAS[1]);
  const [registro, setRegistro] = useState('');
  const [esIngresante, setEsIngresante] = useState(false);
  const [loading, setLoading] = useState(false);
  const [correoEnviadoA, setCorreoEnviadoA] = useState<string | null>(null);

  // Si ya hay una sesión (por ejemplo, al volver del enlace de confirmación del correo), se entra directo
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('email not confirmed')) {
          alert('Todavía no confirmaste tu correo. Abrí el mensaje que te enviamos y tocá «Confirmar mi cuenta».');
        } else if (msg.includes('invalid login credentials')) {
          alert('El correo o la contraseña no son correctos.');
        } else {
          alert('Error al iniciar sesión: ' + error.message);
        }
      } else {
        router.push('/dashboard');
      }
      setLoading(false);
      return;
    }

    // ---- Registro ----
    if (!email.trim() || !password.trim() || !nombre.trim() || !carrera.trim() || !registro.trim()) {
      alert('Por favor, completá todos los campos obligatorios para registrarte.');
      setLoading(false);
      return;
    }

    if (password.length < LARGO_MINIMO_CONTRASEÑA) {
      alert(`La contraseña tiene que tener al menos ${LARGO_MINIMO_CONTRASEÑA} caracteres.`);
      setLoading(false);
      return;
    }

    if (EXIGIR_DOMINIO_INSTITUCIONAL && !email.trim().toLowerCase().endsWith(DOMINIO_INSTITUCIONAL)) {
      alert(`Tenés que registrarte con tu correo institucional (${DOMINIO_INSTITUCIONAL}).`);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          nombre: nombre.trim(),
          carrera,
          padron: registro.trim(), // en la base la columna se sigue llamando "padron"
          es_ingresante: esIngresante,
        },
      },
    });

    if (error) {
      alert('Error en el registro: ' + error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // La verificación de correo está desactivada: se entra directo.
      // La foto de perfil se pide en la primera pantalla de la app.
      router.push('/dashboard');
    } else {
      // La verificación de correo está activada: hay que confirmar desde el mail.
      setCorreoEnviadoA(email.trim());
    }

    setLoading(false);
  };

  // Pantalla de "revisá tu correo"
  if (correoEnviadoA) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200/80 p-8 rounded-3xl shadow-sm space-y-5 text-center">
          <img src="/logo.png" alt="Armando Comunidad" className="w-20 h-20 object-contain mx-auto" />
          <h1 className="text-xl font-black text-slate-900">Revisá tu correo</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Te enviamos un mensaje a <span className="font-bold text-slate-900">{correoEnviadoA}</span>. Abrilo y
            tocá <span className="font-bold">«Confirmar mi cuenta»</span> para activarla.
          </p>
          <p className="text-xs text-slate-400">
            Si no lo ves en unos minutos, mirá la carpeta de spam o correo no deseado.
          </p>
          <button
            onClick={() => {
              setCorreoEnviadoA(null);
              setIsLogin(true);
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition text-xs"
          >
            Ya confirmé mi cuenta, iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200/80 p-8 rounded-3xl shadow-sm space-y-6">
        <div className="space-y-1 text-center">
          <img src="/logo.png" alt="Armando Comunidad" className="w-24 h-24 object-contain mx-auto mb-2" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block">FCE - UBA</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Armando Comunidad</h1>
          <p className="text-xs text-slate-500">{isLogin ? 'Ingresá a tu cuenta' : 'Creá tu cuenta institucional'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {!isLogin && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Carrera *</label>
                <select
                  value={carrera}
                  onChange={(e) => setCarrera(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 font-semibold bg-white"
                >
                  {CARRERAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Número de Registro *</label>
                <input
                  type="text"
                  value={registro}
                  onChange={(e) => setRegistro(e.target.value)}
                  placeholder="Ej. 109283"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">¿Sos ingresante? *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEsIngresante(true)}
                    className={`py-2.5 rounded-xl font-bold border transition ${
                      esIngresante
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Sí, soy ingresante
                  </button>
                  <button
                    type="button"
                    onClick={() => setEsIngresante(false)}
                    className={`py-2.5 rounded-xl font-bold border transition ${
                      !esIngresante
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    No
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Los ingresantes muestran un distintivo en su perfil y en sus publicaciones, y reciben 5 horas
                  iniciales en lugar de 3.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.correo@campus.economicas.uba.ar"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contraseña *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
              required
            />
            {!isLogin && (
              <p className="text-[10px] text-slate-400 mt-1.5">Mínimo {LARGO_MINIMO_CONTRASEÑA} caracteres.</p>
            )}
            {isLogin && (
              <div className="text-right mt-1.5">
                <Link href="/auth/olvide" className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            {isLogin ? '¿No tenés cuenta? Registrate acá' : '¿Ya tenés cuenta? Iniciá sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}