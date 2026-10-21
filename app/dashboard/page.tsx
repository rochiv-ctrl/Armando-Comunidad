'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { SECCIONES_MATERIAS, normalizar, seccionesDeMateria } from '@/lib/materias';

interface Publicacion {
  id: string;
  usuario_id: string;
  titulo: string;
  materia: string;
  descripcion: string;
  tipo: 'ofrece' | 'pide';
  horas: number;
  estado: string;
  clase_inicio: string | null;
  created_at: string;
  profiles: {
    id: string;
    nombre: string;
    carrera: string;
    avatar_url: string;
    es_ingresante: boolean;
  };
}

type EstadoVisual = 'disponible' | 'tomada' | 'pasada';

const AVATAR_DEFAULT =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

const ORDEN_ESTADO: Record<EstadoVisual, number> = { disponible: 0, tomada: 1, pasada: 2 };

export default function DashboardPage() {
  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);
  const [ahora, setAhora] = useState<number | null>(null);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'ofrece' | 'pide'>('todas');
  const [estadoFiltro, setEstadoFiltro] = useState<'todos' | EstadoVisual>('todos');
  // 'todas' | id de sección (cbc, contador, ...) | 'otras' (materias escritas a mano)
  const [carreraFiltro, setCarreraFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  // Modal de nueva publicación
  const [modalOpen, setModalOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<'ofrece' | 'pide'>('ofrece');
  const [horas, setHoras] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selector de materia: "lista" (estandarizada) o "manual" (otra materia)
  const [materiaModo, setMateriaModo] = useState<'lista' | 'manual'>('lista');
  const [materiaBusqueda, setMateriaBusqueda] = useState('');
  const [materiaSel, setMateriaSel] = useState('');
  const [materiaManual, setMateriaManual] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Sugerencias agrupadas por sección (CBC primero, después cada carrera)
  const consulta = normalizar(materiaBusqueda);
  const gruposSugerencias = SECCIONES_MATERIAS.map((seccion, i) => ({
    numero: i + 1,
    seccion,
    materias: seccion.materias.filter((m) => !consulta || normalizar(m).includes(consulta)),
  })).filter((g) => g.materias.length > 0);

  const fetchPublicaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('publicaciones')
      .select(`
        id,
        usuario_id,
        titulo,
        materia,
        descripcion,
        tipo,
        horas,
        estado,
        clase_inicio,
        created_at,
        profiles (
          id,
          nombre,
          carrera,
          avatar_url,
          es_ingresante
        )
      `)
      .in('estado', ['activa', 'en_proceso'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPublicaciones(data as unknown as Publicacion[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    setAhora(Date.now());
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
    fetchPublicaciones();
  }, []);

  // Disponible → se puede contactar | Tomada → clase coordinada | Pasada → la clase ya terminó
  const estadoVisual = (p: Publicacion): EstadoVisual => {
    if (p.estado !== 'en_proceso') return 'disponible';
    if (p.clase_inicio && ahora !== null) {
      const fin = new Date(p.clase_inicio).getTime() + (p.horas || 1) * 60 * 60 * 1000;
      if (ahora >= fin) return 'pasada';
    }
    return 'tomada';
  };

  const formatearClase = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const elegirMateria = (nombre: string) => {
    setMateriaSel(nombre);
    setMateriaBusqueda(nombre);
    setMostrarSugerencias(false);
  };

  const activarManual = () => {
    setMateriaModo('manual');
    setMateriaSel('');
    setMostrarSugerencias(false);
  };

  const volverALista = () => {
    setMateriaModo('lista');
    setMateriaManual('');
  };

  const resetFormulario = () => {
    setTitulo('');
    setDescripcion('');
    setTipo('ofrece');
    setHoras(1);
    setMateriaModo('lista');
    setMateriaBusqueda('');
    setMateriaSel('');
    setMateriaManual('');
  };

  const handleCrearPublicacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const materiaFinal = materiaModo === 'lista' ? materiaSel : materiaManual.trim();
    if (!materiaFinal) {
      setErrorMsg(
        materiaModo === 'lista'
          ? 'Elegí una materia de la lista o usá «Otra materia».'
          : 'Escribí el nombre de la materia.'
      );
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg('Debes estar autenticado para publicar.');
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from('publicaciones').insert([
      {
        usuario_id: user.id,
        titulo,
        materia: materiaFinal,
        descripcion,
        tipo,
        horas,
        estado: 'activa',
      },
    ]);

    if (error) {
      setErrorMsg(`Error al publicar: ${error.message}`);
      setSubmitting(false);
      return;
    }

    resetFormulario();
    setSubmitting(false);
    setModalOpen(false);
    fetchPublicaciones();
  };

  const handleContactar = (pub: Publicacion) => {
    router.push(`/dashboard/chat?pub=${pub.id}`);
  };

  const coincideCarrera = (p: Publicacion) => {
    if (carreraFiltro === 'todas') return true;
    const secciones = seccionesDeMateria(p.materia ?? '');
    if (carreraFiltro === 'otras') return secciones.length === 0;
    return secciones.includes(carreraFiltro);
  };

  const publicacionesFiltradas = publicaciones
    .filter((p) => {
      const coincideTipo = filtro === 'todas' || p.tipo === filtro;
      const coincideEstado = estadoFiltro === 'todos' || estadoVisual(p) === estadoFiltro;
      if (!coincideTipo || !coincideEstado || !coincideCarrera(p)) return false;

      const q = normalizar(busqueda);
      if (!q) return true;

      return (
        normalizar(p.materia ?? '').includes(q) ||
        normalizar(p.titulo ?? '').includes(q) ||
        normalizar(p.descripcion ?? '').includes(q) ||
        normalizar(p.profiles?.nombre ?? '').includes(q)
      );
    })
    // Disponibles primero, después tomadas, y las pasadas al final
    .sort((a, b) => ORDEN_ESTADO[estadoVisual(a)] - ORDEN_ESTADO[estadoVisual(b)]);

  const botonFiltro = (activo: boolean) =>
    `px-4 py-1.5 rounded-full transition ${
      activo ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Muro de la Comunidad</h1>
          <p className="text-xs text-slate-500">Intercambio de horas académicas en FCE</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-2xl text-xs shadow-sm transition"
        >
          + Crear Publicación
        </button>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por materia, tema o estudiante..."
          className="w-full px-5 py-3 rounded-2xl bg-white border border-slate-200/80 text-xs focus:outline-none focus:border-slate-900 transition shadow-sm"
        />

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs font-semibold">
          <button onClick={() => setFiltro('todas')} className={botonFiltro(filtro === 'todas')}>
            Todas
          </button>
          <button onClick={() => setFiltro('ofrece')} className={botonFiltro(filtro === 'ofrece')}>
            Se Ofrecen
          </button>
          <button onClick={() => setFiltro('pide')} className={botonFiltro(filtro === 'pide')}>
            Se Buscan
          </button>

          <span className="mx-2 h-4 w-px bg-slate-300" />

          <button onClick={() => setEstadoFiltro('todos')} className={botonFiltro(estadoFiltro === 'todos')}>
            Todos los estados
          </button>
          <button onClick={() => setEstadoFiltro('disponible')} className={botonFiltro(estadoFiltro === 'disponible')}>
            Disponibles
          </button>
          <button onClick={() => setEstadoFiltro('tomada')} className={botonFiltro(estadoFiltro === 'tomada')}>
            Tomadas
          </button>
          <button onClick={() => setEstadoFiltro('pasada')} className={botonFiltro(estadoFiltro === 'pasada')}>
            Pasadas
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">Carrera:</span>
          <select
            value={carreraFiltro}
            onChange={(e) => setCarreraFiltro(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white text-slate-700 font-semibold border border-slate-200 focus:outline-none focus:border-slate-900 max-w-full"
          >
            <option value="todas">Todas las carreras</option>
            {SECCIONES_MATERIAS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
            <option value="otras">Otros</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Cargando publicaciones...</div>
      ) : publicacionesFiltradas.length === 0 ? (
        <div className="bg-white border border-slate-200/80 p-10 rounded-3xl text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">No se encontraron publicaciones</p>
          <p className="text-xs text-slate-400">Intenta con otro filtro o crea una nueva publicación.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {publicacionesFiltradas.map((pub) => {
            const esMia = pub.usuario_id === meId;
            const estado = estadoVisual(pub);
            const apagada = estado !== 'disponible';
            const esCBC = seccionesDeMateria(pub.materia ?? '').includes('cbc');

            return (
              <div
                key={pub.id}
                className={`border p-6 rounded-3xl shadow-sm transition flex flex-col sm:flex-row justify-between gap-6 ${
                  estado === 'pasada'
                    ? 'bg-slate-100/70 border-slate-200 opacity-75'
                    : estado === 'tomada'
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push(`/dashboard/usuarios/${pub.profiles?.id}`)}
                      className="flex items-center gap-3 text-left hover:opacity-80 transition"
                    >
                      <img
                        src={pub.profiles?.avatar_url || AVATAR_DEFAULT}
                        alt={pub.profiles?.nombre || 'Usuario'}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 hover:underline">
                            {pub.profiles?.nombre || 'Estudiante'}
                          </span>
                          {pub.profiles?.es_ingresante && (
                            <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                              Ingresante
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block">{pub.profiles?.carrera}</span>
                      </div>
                    </button>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          pub.tipo === 'ofrece'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {pub.tipo === 'ofrece' ? 'Ofrece Ayuda' : 'Busca Ayuda'}
                      </span>
                      <span className="text-xs font-bold text-slate-600">• {pub.materia}</span>
                      {esCBC && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          CBC
                        </span>
                      )}

                      {estado === 'tomada' && (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          🤝 Tomada{pub.clase_inicio ? ` · clase ${formatearClase(pub.clase_inicio)} hs` : ''}
                        </span>
                      )}
                      {estado === 'pasada' && (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">
                          ✓ Pasada{pub.clase_inicio ? ` · ${formatearClase(pub.clase_inicio)} hs` : ''}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{pub.titulo}</h3>
                    <p className="text-xs text-slate-600 mt-1">{pub.descripcion}</p>
                  </div>
                </div>

                <div
                  className={`flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6 gap-4 ${
                    estado === 'tomada' ? 'border-amber-100' : 'border-slate-100'
                  }`}
                >
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Valor
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {pub.horas} {pub.horas === 1 ? 'Hora' : 'Horas'}
                    </span>
                  </div>

                  {apagada ? (
                    <span className="text-xs font-bold text-slate-400 px-2">
                      {estado === 'tomada' ? 'Ya no disponible' : 'Finalizada'}
                    </span>
                  ) : esMia ? (
                    <span className="text-xs font-bold text-slate-400 px-2">Tu publicación</span>
                  ) : (
                    <button
                      onClick={() => handleContactar(pub)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-2xl text-xs transition shadow-sm"
                    >
                      Contactar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nueva Publicación */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-extrabold text-slate-900">Nueva Publicación</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCrearPublicacion} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Publicación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo('ofrece')}
                    className={`py-2 rounded-xl font-bold transition border ${
                      tipo === 'ofrece'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Ofrezco Ayuda
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('pide')}
                    className={`py-2 rounded-xl font-bold transition border ${
                      tipo === 'pide'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Busco Ayuda
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Repaso de ejercicios para el primer parcial"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* Materia: lista estandarizada (CBC y carreras) u "Otra" escrita a mano */}
              <div className="relative">
                <label className="block font-semibold text-slate-700 mb-1">Materia</label>

                {materiaModo === 'lista' ? (
                  <>
                    <input
                      type="text"
                      value={materiaBusqueda}
                      onChange={(e) => {
                        setMateriaBusqueda(e.target.value);
                        setMateriaSel('');
                        setMostrarSugerencias(true);
                      }}
                      onFocus={() => setMostrarSugerencias(true)}
                      onBlur={() => setMostrarSugerencias(false)}
                      placeholder="Escribí para buscar o elegí de la lista"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                    />

                    {mostrarSugerencias && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-10">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            activarManual();
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-b border-slate-100 transition sticky top-0"
                        >
                          ✏️ Otra materia (escribir a mano)
                        </button>

                        {gruposSugerencias.length === 0 && (
                          <p className="px-4 py-3 text-xs text-slate-400">
                            No hay coincidencias. Probá con «Otra materia».
                          </p>
                        )}

                        {gruposSugerencias.map((g) => (
                          <div key={g.seccion.id}>
                            <div className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50">
                              {g.seccion.nombre}
                            </div>
                            {g.materias.map((m) => (
                              <button
                                key={g.seccion.id + m}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  elegirMateria(m);
                                }}
                                className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 transition"
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {materiaSel && (
                      <p className="text-[10px] font-bold text-emerald-700 mt-1">✓ Materia oficial seleccionada</p>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={materiaManual}
                      onChange={(e) => setMateriaManual(e.target.value)}
                      placeholder="Escribí el nombre de la materia o tema"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="button"
                      onClick={volverALista}
                      className="text-[11px] font-bold text-indigo-700 hover:underline"
                    >
                      ← Volver a la lista de materias
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Duración de la clase y valor (horas)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={horas}
                  onChange={(e) => setHoras(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  required
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Explicá brevemente la dinámica..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {submitting ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}