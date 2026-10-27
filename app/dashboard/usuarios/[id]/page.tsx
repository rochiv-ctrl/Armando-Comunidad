'use client';

import { Suspense, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import { validarFoto, subirAvatar, MAX_FOTO_MB } from '@/lib/avatar';

const AVATAR_DEFAULT =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

interface Resena {
  id: string;
  calificacion: number;
  comentario: string | null;
  chips_reconocimiento: string[] | null;
  materia: string;
  fecha: string;
  alumno_nombre: string;
  alumno_avatar: string | null;
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

interface ResenaAlumno {
  id: string;
  calificacion: number;
  comentario: string | null;
  materia: string;
  fecha: string;
  tutor_nombre: string;
  tutor_avatar: string | null;
  clase_no_realizada: boolean;
}

function PerfilContenido() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ahora, setAhora] = useState<number | null>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [resenasAlumno, setResenasAlumno] = useState<ResenaAlumno[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState('');
  const [errorResenas, setErrorResenas] = useState('');
  const [errorFoto, setErrorFoto] = useState('');

  // Edición de foto (solo en el perfil propio)
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [nuevaFoto, setNuevaFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  useEffect(() => {
    setAhora(Date.now());
  }, []);

  useEffect(() => {
    if (!id) return;

    async function loadPerfilData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: userDat, error: errUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (errUser) {
        setErrorPerfil('No se pudo cargar el perfil: ' + errUser.message);
      } else if (!userDat) {
        setErrorPerfil('No se encontró este perfil.');
      } else {
        setPerfil(userDat);
      }

      // Publicaciones del usuario: activas, tomadas/pasadas y resueltas
      const { data: pubsData } = await supabase
        .from('publicaciones')
        .select('id, titulo, materia, descripcion, tipo, horas, estado, clase_inicio')
        .eq('usuario_id', id)
        .in('estado', ['activa', 'en_proceso', 'resuelta'])
        .order('created_at', { ascending: false });
      if (pubsData) setPublicaciones(pubsData as Publicacion[]);

      // Reseñas recibidas COMO TUTOR (función segura en la base)
      const { data: resData, error: errRes } = await supabase.rpc('resenas_de_tutor', { p_tutor: id });
      if (errRes) {
        setErrorResenas('No se pudieron cargar las reseñas: ' + errRes.message);
      } else if (resData) {
        setResenas(resData as Resena[]);
      }

      // Reseñas recibidas COMO ALUMNO (las deja el tutor)
      const { data: resAlumnoData } = await supabase.rpc('resenas_de_alumno', { p_alumno: id });
      if (resAlumnoData) setResenasAlumno(resAlumnoData as ResenaAlumno[]);

      setLoading(false);
    }

    loadPerfilData();
  }, [id]);

  const promedioEstrellas =
    resenas.length > 0
      ? (resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length).toFixed(1)
      : null;

  const promedioAlumno =
    resenasAlumno.length > 0
      ? (resenasAlumno.reduce((acc, r) => acc + r.calificacion, 0) / resenasAlumno.length).toFixed(1)
      : null;

  const publicacionesActivas = publicaciones.filter((p) => p.estado === 'activa');
  const publicacionesPasadas = publicaciones.filter((p) => p.estado !== 'activa');

  const etiquetaEstado = (p: Publicacion) => {
    if (p.estado === 'resuelta') return { texto: 'Resuelta', clase: 'bg-slate-200 text-slate-600 border-slate-300' };
    if (p.estado === 'en_proceso') {
      const termino =
        p.clase_inicio && ahora !== null && ahora >= new Date(p.clase_inicio).getTime() + (p.horas || 1) * 60 * 60 * 1000;
      return termino
        ? { texto: '✓ Pasada', clase: 'bg-slate-200 text-slate-600 border-slate-300' }
        : { texto: '🤝 Tomada', clase: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    return { texto: 'Activa', clase: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  const cerrarEdicionFoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setEditandoFoto(false);
    setNuevaFoto(null);
    setFotoPreview(null);
    setErrorFoto('');
  };

  const handleElegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const problema = validarFoto(archivo);
    if (problema) {
      setErrorFoto(problema);
      e.target.value = '';
      return;
    }

    setErrorFoto('');
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setNuevaFoto(archivo);
    setFotoPreview(URL.createObjectURL(archivo));
  };

  const handleGuardarFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaFoto || !currentUserId || currentUserId !== id) return;

    setSubiendoFoto(true);
    setErrorFoto('');
    try {
      const url = await subirAvatar(nuevaFoto, currentUserId);
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', currentUserId);
      if (error) throw new Error(error.message);

      setPerfil({ ...perfil, avatar_url: url });
      cerrarEdicionFoto();
    } catch (err: any) {
      setErrorFoto('No se pudo actualizar la foto: ' + (err?.message ?? 'error desconocido'));
    } finally {
      setSubiendoFoto(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-xs text-slate-400">Cargando perfil de usuario...</div>;
  }

  if (!perfil) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200/80 p-8 rounded-3xl text-center space-y-4">
        <p className="text-sm font-bold text-slate-800">{errorPerfil || 'No se pudo mostrar el perfil.'}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl"
        >
          Volver al Muro
        </button>
      </div>
    );
  }

  const esMiPerfil = currentUserId === perfil.id;

  const tarjetaPublicacion = (p: Publicacion, conBoton: boolean) => {
    const estado = etiquetaEstado(p);
    return (
      <div
        key={p.id}
        className={`border p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          conBoton ? 'bg-white border-slate-200/80' : 'bg-slate-50/70 border-slate-200'
        }`}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                p.tipo === 'ofrece'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              {p.tipo === 'ofrece' ? 'Ofrece Ayuda' : 'Busca Ayuda'}
            </span>
            <span className="text-xs font-bold text-slate-600">• {p.materia}</span>
            {!conBoton && (
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${estado.clase}`}>
                {estado.texto}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900">{p.titulo}</h3>
          <p className="text-xs text-slate-600">{p.descripcion}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs font-black text-slate-900">
            {p.horas} {p.horas === 1 ? 'Hora' : 'Horas'}
          </span>
          {conBoton &&
            (esMiPerfil ? (
              <span className="text-xs font-bold text-slate-400">Tu publicación</span>
            ) : (
              <button
                onClick={() => router.push(`/dashboard/chat?pub=${p.id}`)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-2xl text-xs transition shadow-sm"
              >
                Contactar
              </button>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Tarjeta principal */}
      <div className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={perfil.avatar_url || AVATAR_DEFAULT}
              alt={perfil.nombre}
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-100 shadow-xs"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-900">{perfil.nombre}</h1>
                {perfil.es_ingresante && (
                  <span className="bg-slate-100 text-slate-800 text-[10px] font-extrabold px-3 py-1 rounded-full border border-slate-200 uppercase tracking-wider">
                    Ingresante
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                {perfil.carrera} {esMiPerfil && perfil.padron ? `• Registro: ${perfil.padron}` : ''}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-bold text-slate-700">
                <span>⏱️ {perfil.creditos ?? 0} Horas</span>
                <span className="text-amber-500">
                  ★ {promedioEstrellas ?? 'Sin calificaciones'} ({resenas.length} reseñas como tutor)
                </span>
                <span className="text-indigo-600">
                  ★ {promedioAlumno ?? 'Sin calificaciones'} ({resenasAlumno.length} reseñas como alumno)
                </span>
              </div>
            </div>
          </div>

          {esMiPerfil && (
            <button
              onClick={() => setEditandoFoto(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition self-start sm:self-auto"
            >
              Editar foto
            </button>
          )}
        </div>
      </div>

      {/* Publicaciones activas (se puede contactar) */}
      <div className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900">Publicaciones activas</h2>
        {publicacionesActivas.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">Este usuario no tiene publicaciones activas en este momento.</p>
        ) : (
          <div className="space-y-3">{publicacionesActivas.map((p) => tarjetaPublicacion(p, true))}</div>
        )}
      </div>

      {/* Publicaciones pasadas / tomadas */}
      {publicacionesPasadas.length > 0 && (
        <div className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900">Publicaciones pasadas y en curso</h2>
          <div className="space-y-3">{publicacionesPasadas.map((p) => tarjetaPublicacion(p, false))}</div>
        </div>
      )}

      {/* Reseñas recibidas como tutor */}
      <div className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900">Reseñas y Reputación como Tutor</h2>

        {errorResenas && (
          <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            {errorResenas}
          </p>
        )}

        {resenas.length === 0 && !errorResenas ? (
          <p className="text-xs text-slate-400 py-2">
            Este usuario no registra reseñas de tutorías impartidas aún.
          </p>
        ) : (
          <div className="space-y-4 divide-y divide-slate-100">
            {resenas.map((r) => (
              <div key={r.id} className="pt-4 first:pt-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={r.alumno_avatar || AVATAR_DEFAULT}
                      alt={r.alumno_nombre}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-slate-900">{r.alumno_nombre}</span>
                    <span className="text-[10px] text-slate-400">({r.materia})</span>
                  </div>
                  <span className="text-xs font-bold text-amber-500">★ {r.calificacion}.0</span>
                </div>

                {r.comentario && (
                  <p className="text-xs text-slate-600 leading-relaxed pl-8">"{r.comentario}"</p>
                )}

                {r.chips_reconocimiento && r.chips_reconocimiento.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-8 pt-1">
                    {r.chips_reconocimiento.map((chip) => (
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
      <div className="bg-white border border-slate-200/80 p-8 rounded-3xl shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900">Reseñas como Alumno</h2>

        {resenasAlumno.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">Este usuario todavía no tiene reseñas como alumno.</p>
        ) : (
          <div className="space-y-4 divide-y divide-slate-100">
            {resenasAlumno.map((r) => (
              <div key={r.id} className="pt-4 first:pt-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={r.tutor_avatar || AVATAR_DEFAULT}
                      alt={r.tutor_nombre}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-slate-900">{r.tutor_nombre}</span>
                    <span className="text-[10px] text-slate-400">({r.materia})</span>
                  </div>
                  <span className="text-xs font-bold text-amber-500">★ {r.calificacion}.0</span>
                </div>

                {r.clase_no_realizada && (
                  <p className="text-[10px] font-bold text-rose-700 pl-8">
                    Esta clase había sido marcada como no realizada.
                  </p>
                )}

                {r.comentario && (
                  <p className="text-xs text-slate-600 leading-relaxed pl-8">"{r.comentario}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: editar foto de perfil */}
      {editandoFoto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full space-y-5 shadow-xl">
            <h3 className="text-lg font-extrabold text-slate-900">Editar foto de perfil</h3>

            {errorFoto && (
              <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                {errorFoto}
              </p>
            )}

            <form onSubmit={handleGuardarFoto} className="space-y-5 text-xs">
              <div className="flex items-center gap-4">
                <img
                  src={fotoPreview || perfil.avatar_url || AVATAR_DEFAULT}
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

// useParams() necesita estar dentro de un Suspense (Next.js con cacheComponents)
export default function PerfilUsuarioPublicoPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-xs text-slate-400">Cargando perfil de usuario...</div>}>
      <PerfilContenido />
    </Suspense>
  );
}