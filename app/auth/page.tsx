'use client';

import { useState } from 'react';
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

const MAX_FOTO_MB = 3;

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
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      alert('El archivo tiene que ser una imagen (JPG, PNG, WEBP...).');
      e.target.value = '';
      return;
    }
    if (archivo.size > MAX_FOTO_MB * 1024 * 1024) {
      alert(`La foto no puede pesar más de ${MAX_FOTO_MB} MB.`);
      e.target.value = '';
      return;
    }

    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFoto(archivo);
    setFotoPreview(URL.createObjectURL(archivo));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        alert('Error al iniciar sesión: ' + error.message);
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

    if (!foto) {
      alert('La foto de perfil es obligatoria.');
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

    const userId = data.user?.id;

    // Con sesión activa podemos subir la foto de inmediato
    if (data.session && userId) {
      const extension = (foto.name.split('.').pop() || 'jpg').toLowerCase();
      const ruta = `${userId}/${Date.now()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from('avatars')
        .upload(ruta, foto, { upsert: true, contentType: foto.type });

      if (errorSubida) {
        alert(
          'Tu cuenta se creó, pero no se pudo subir la foto: ' +
            errorSubida.message +
            '. Podés cambiarla desde tu perfil.'
        );
      } else {
        const { data: publica } = supabase.storage.from('avatars').getPublicUrl(ruta);
        const { error: errorPerfil } = await supabase
          .from('profiles')
          .update({ avatar_url: publica.publicUrl })
          .eq('id', userId);

        if (errorPerfil) {
          alert('La foto se subió, pero no se pudo asociar a tu perfil: ' + errorPerfil.message);
        }
      }

      router.push('/dashboard');
    } else {
      alert('¡Registro exitoso! Iniciá sesión y cargá tu foto de perfil desde tu perfil.');
      setIsLogin(true);
    }

    setLoading(false);
  };

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
                <label className="block font-semibold text-slate-700 mb-1">Foto de perfil *</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                    {fotoPreview ? (
                      <img src={fotoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-300 text-xl">📷</span>
                    )}
                  </div>
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition">
                    {foto ? 'Cambiar foto' : 'Elegir foto'}
                    <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">Obligatoria. Máximo {MAX_FOTO_MB} MB.</p>
              </div>

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