'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { validarFoto, subirAvatar, MAX_FOTO_MB } from '@/lib/avatar';

const AVATAR_DEFAULT =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

interface Profile {
  id: string;
  nombre: string;
  carrera: string;
  padron: string; // en la base se llama "padron"; en pantalla se muestra como "Registro"
  avatar_url: string;
  creditos: number;
  es_ingresante: boolean | null;
}

interface Publicacion {
  id: string;
  titulo: string;
  materia: string;
  descripcion: string;
  tipo: 'ofrece' | 'pide';
  horas: number;
  estado: string;
  clase_inicio: string | null;
}

interface Resena {
  id: string;
  calificacion: number;
  comentario: string | null;
  chips_reconocimiento: string[] | null;
  materia: string;
  fecha: string;
  alumno_nombre: string;
}

interface ResenaAlumno {
  id: string;
  calificacion: number;
  comentario: string | null;
  materia: string;
  fecha: string;
  tutor_nombre: string;
  clase_no_realizada: boolean;
}

interface Movimiento {
  id: string;
  tipo: string;
  horas: number;
  detalle: string | null;
  created_at: string;
}

const TIPO_MOVIMIENTO: Record<string, string> = {
  bienvenida: 'Horas de bienvenida',
  reserva: 'Reserva en garantía',
  liberacion: 'Horas devueltas',
  acreditacion: 'Clase dada',
  ajuste: 'Saldo inicial',
};

const ESTADO_PUB: Record<string, { label: string; clase: string }> = {
  activa: { label: 'Activa', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  en_proceso: { label: 'En proceso', clase: 'bg-amber-50 text-amber-700 border-amber-200' },
  tomada: { label: '🤝 Tomada', clase: 'bg-amber-50 text-amber-700 border-amber-200' },
  pasada: { label: '✓ Pasada', clase: 'bg-slate-100 text-slate-600 border-slate-200' },
  resuelta: { label: 'Resuelta', clase: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function MiPerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [ahora, setAhora] = useState<number | null>(null);
  const [resenasAlumno, setResenasAlumno] = useState<ResenaAlumno[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [enGarantia, setEnGarantia] = useState(0);

  const promedioAlumno =
    resenasAlumno.length > 0
      ? (resenasAlumno.reduce((acc, r) => acc + r.calificacion, 0) / resenasAlumno.length).toFixed(1)
      : '–';

  // Edición de foto
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [nuevaFoto, setNuevaFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const promedio =
    resenas.length > 0
      ? (resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length).toFixed(1)
      : '–';

  useEffect(() => {
    setAhora(Date.now());
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);

        const { data: postsData } = await supabase
          .from('publicaciones')
          .select('*')
          .eq('usuario_id', user.id)
          .order('created_at', { ascending: false });
        if (postsData) setPublicaciones(postsData as Publicacion[]);

        // Reseñas: SOLO las recibidas como tutor (nunca las que uno escribió)
        const { data: resData, error: resError } = await supabase.rpc('resenas_de_tutor', {
          p_tutor: user.id,
        });
        if (resError) {
          setErrorMsg('No se pudieron cargar las reseñas: ' + resError.message);
        } else if (resData) {
          setResenas(resData as Resena[]);
        }

        // Reseñas que recibiste como ALUMNO (las deja el tutor)
        const { data: resAlumnoData } = await supabase.rpc('resenas_de_alumno', { p_alumno: user.id });
        if (resAlumnoData) setResenasAlumno(resAlumnoData as ResenaAlumno[]);

        // Libro de movimientos de horas
        const { data: movData } = await supabase
          .from('movimientos_horas')
          .select('id, tipo, horas, detalle, created_at')
          .order('created_at', { ascending: false })
          .limit(15);
        if (movData) setMovimientos(movData as Movimiento[]);

        // Horas retenidas en garantía por clases que todavía no se confirmaron
        const { data: garantiaData } = await supabase
          .from('tutorias_agendadas')
          .select('horas')
          .eq('alumno_id', user.id)
          .eq('credito_estado', 'en_garantia');
        if (garantiaData) {
          setEnGarantia(garantiaData.reduce((acc: number, t: any) => acc + (t.horas || 0), 0));
        }
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  const cerrarEdicionFoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setEditandoFoto(false);
    setNuevaFoto(null);
    setFotoPreview(null);
  };

  const handleElegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const problema = validarFoto(archivo);
    if (problema) {
      alert(problema);
      e.target.value = '';
      return;
    }

    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setNuevaFoto(archivo);
    setFotoPreview(URL.createObjectURL(archivo));
  };

  const handleGuardarFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaFoto || !profile) return;

    setSubiendoFoto(true);
    setErrorMsg('');
    try {
      const url = await subirAvatar(nuevaFoto, profile.id);
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
      if (error) throw new Error(error.message);

      setProfile({ ...profile, avatar_url: url });
      cerrarEdicionFoto();
    } catch (err: any) {
      setErrorMsg('No se pudo actualizar la foto: ' + (err?.message ?? 'error desconocido'));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const cambiarEstado = async (pubId: string, nuevoEstado: 'resuelta' | 'activa') => {
    setErrorMsg('');
    const { error } = await supabase.from('publicaciones').update({ estado: nuevoEstado }).eq('id', pubId);
    if (error) {
      setErrorMsg('No se pudo actualizar la publicación: ' + error.message);
    } else {
      setPublicaciones((prev) => prev.map((p) => (p.id === pubId ? { ...p, estado: nuevoEstado } : p)));
    }
  };

  const handleEliminarPublicacion = async (pubId: string) => {
    if (!window.confirm('¿Eliminar esta publicación?')) return;
    setErrorMsg('');
    const { error } = await supabase.from('publicaciones').delete().eq('id', pubId);
    if (error) {
      setErrorMsg('No se pudo eliminar la publicación: ' + error.message);
    } else {
      setPublicaciones((prev) => prev.filter((p) => p.id !== pubId));
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-xs text-slate-400">Cargando perfil...</div>;
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold p-3 rounded-2xl flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="underline">Cerrar</button>
        </div>
      )}

      {/* Tarjeta de perfil */}
      <div className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <img
              src={profile.avatar_url || AVATAR_DEFAULT}
              alt={profile.nombre}
              className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 shadow-sm"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{profile.nombre}</h1>
                {profile.es_ingresante && (
                  <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
                    Ingresante
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {profile.carrera || 'Administración'} {profile.padron ? `• Registro: ${profile.padron}` : ''}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                <div className="bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700">
                  Horas disponibles: <span className="text-slate-900">{profile.creditos ?? 0} Hs</span>
                </div>
                <div className="bg-amber-50 border border-amber-200/60 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-800">
                  ★ {promedio}{' '}
                  <span className="text-amber-600 font-normal">({resenas.length} reseñas como tutor)</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200/60 px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-800">
                  ★ {promedioAlumno}{' '}
                  <span className="text-indigo-600 font-normal">({resenasAlumno.length} reseñas como alumno)</span>
                </div>
                {enGarantia > 0 && (
                  <div className="bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700">
                    En garantía: <span className="text-slate-900">{enGarantia} Hs</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setEditandoFoto(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition shrink-0"
          >
            Editar foto
          </button>
        </div>
      </div>

      {/* Reseñas recibidas como tutor */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">Reseñas y Opiniones Recibidas</h2>
        {resenas.length === 0 ? (
          <div className="bg-white border border-slate-200/80 p-8 rounded-3xl text-center text-xs text-slate-400">
            Aún no recibiste reseñas como tutor.
          </div>
        ) : (
          <div className="space-y-3">
            {resenas.map((res) => (
              <div key={res.id} className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{res.alumno_nombre}</span>
                    <span className="text-[10px] text-slate-400">({res.materia})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                      {'★'.repeat(res.calificacion)}
                      {'☆'.repeat(5 - res.calificacion)} ({res.calificacion}/5)
                    </span>
                    <span className="text-[10px] text-slate-400">{res.fecha}</span>
                  </div>
                </div>
                {res.comentario && <p className="text-xs text-slate-600 italic">"{res.comentario}"</p>}
                {res.chips_reconocimiento && res.chips_reconocimiento.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {res.chips_reconocimiento.map((chip) => (
                      <span
                        key={chip}
                        className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200"
                      >
                        ✓ {chip}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reseñas recibidas como alumno (las deja el tutor) */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">Reseñas recibidas como alumno</h2>
        {resenasAlumno.length === 0 ? (
          <div className="bg-white border border-slate-200/80 p-8 rounded-3xl text-center text-xs text-slate-400">
            Todavía ningún tutor te dejó una reseña.
          </div>
        ) : (
          <div className="space-y-3">
            {resenasAlumno.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{r.tutor_nombre}</span>
                    <span className="text-[10px] text-slate-400">({r.materia})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                      {'★'.repeat(r.calificacion)}
                      {'☆'.repeat(5 - r.calificacion)} ({r.calificacion}/5)
                    </span>
                    <span className="text-[10px] text-slate-400">{r.fecha}</span>
                  </div>
                </div>
                {r.clase_no_realizada && (
                  <p className="text-[10px] font-bold text-rose-700">Esta clase había sido marcada como no realizada.</p>
                )}
                {r.comentario && <p className="text-xs text-slate-600 italic">"{r.comentario}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Libro de movimientos de horas */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">Movimientos de horas</h2>
        {movimientos.length === 0 ? (
          <div className="bg-white border border-slate-200/80 p-8 rounded-3xl text-center text-xs text-slate-400">
            Todavía no hay movimientos registrados.
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm divide-y divide-slate-100">
            {movimientos.map((m) => (
              <div key={m.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">{TIPO_MOVIMIENTO[m.tipo] ?? m.tipo}</p>
                  <p className="text-[11px] text-slate-500">
                    {m.detalle ? `${m.detalle} · ` : ''}
                    {new Date(m.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <span className={`text-sm font-black ${m.horas >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {m.horas > 0 ? '+' : ''}
                  {m.horas} Hs
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mis publicaciones */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">Mis Publicaciones</h2>
        {publicaciones.length === 0 ? (
          <div className="bg-white border border-slate-200/80 p-8 rounded-3xl text-center text-xs text-slate-400">
            No tenés publicaciones en este momento.
          </div>
        ) : (
          <div className="space-y-3">
            {publicaciones.map((pub) => {
              const termino =
                pub.estado === 'en_proceso' &&
                pub.clase_inicio &&
                ahora !== null &&
                ahora >= new Date(pub.clase_inicio).getTime() + (pub.horas || 1) * 60 * 60 * 1000;
              const clave = pub.estado === 'en_proceso' ? (termino ? 'pasada' : 'tomada') : pub.estado;
              const est = ESTADO_PUB[clave] ?? ESTADO_PUB.activa;
              return (
                <div
                  key={pub.id}
                  className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          pub.tipo === 'ofrece'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {pub.tipo === 'ofrece' ? 'Ofreces Ayuda' : 'Buscás Ayuda'}
                      </span>
                      <span className="text-xs font-bold text-slate-600">• {pub.materia}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${est.clase}`}>
                        {est.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{pub.titulo}</h3>
                    <p className="text-xs text-slate-600">{pub.descripcion}</p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {pub.estado === 'resuelta' ? (
                      <button
                        onClick={() => cambiarEstado(pub.id, 'activa')}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
                      >
                        Reabrir
                      </button>
                    ) : pub.estado === 'en_proceso' ? null : (
                      <button
                        onClick={() => cambiarEstado(pub.id, 'resuelta')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition"
                      >
                        Marcar resuelta
                      </button>
                    )}
                    {pub.estado !== 'en_proceso' && (
                      <button
                        onClick={() => handleEliminarPublicacion(pub.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-4 py-2 rounded-xl text-xs transition border border-red-200"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: editar foto de perfil */}
      {editandoFoto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full space-y-5 shadow-xl">
            <h3 className="text-lg font-extrabold text-slate-900">Editar foto de perfil</h3>

            <form onSubmit={handleGuardarFoto} className="space-y-5 text-xs">
              <div className="flex items-center gap-4">
                <img
                  src={fotoPreview || profile.avatar_url || AVATAR_DEFAULT}
                  alt="Vista previa"
                  className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                />
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition">
                  {nuevaFoto ? 'Elegir otra' : 'Elegir foto'}
                  <input type="file" accept="image/*" onChange={handleElegirFoto} className="hidden" />
                </label>
              </div>
              <p className="text-[10px] text-slate-400">Imagen JPG, PNG o WEBP. Máximo {MAX_FOTO_MB} MB.</p>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!nuevaFoto || subiendoFoto}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                >
                  {subiendoFoto ? 'Subiendo...' : 'Guardar foto'}
                </button>
                <button
                  type="button"
                  onClick={cerrarEdicionFoto}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}