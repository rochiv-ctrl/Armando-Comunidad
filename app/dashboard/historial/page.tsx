'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const CHIPS_OPCIONES = [
  'Explicación clara',
  'Muy puntual',
  'Excelente paciencia',
  'Aportó material de estudio',
];

interface Tutoria {
  id: string;
  materia: string;
  fecha: string;
  hora: string;
  tutor_id: string;
  alumno_id: string;
  clase_realizada?: boolean | null;
  horas?: number;
  calificacion_alumno?: number | null;
  comentario_alumno?: string | null;
  calificacion?: number | null;
  comentario?: string | null;
  chips_reconocimiento?: string[] | null;
  tutor?: { nombre: string; avatar_url: string };
  alumno?: { nombre: string; avatar_url: string };
}

export default function HistorialPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [clasesRecibidas, setClasesRecibidas] = useState<Tutoria[]>([]);
  const [clasesDadas, setClasesDadas] = useState<Tutoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [procesando, setProcesando] = useState<string | null>(null);

  // Modal de calificación
  const [tutoriaACalificar, setTutoriaACalificar] = useState<Tutoria | null>(null);
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState('');
  const [chipsSeleccionados, setChipsSeleccionados] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Modal de reseña del tutor hacia el alumno
  const [alumnoACalificar, setAlumnoACalificar] = useState<Tutoria | null>(null);
  const [estrellasAlumno, setEstrellasAlumno] = useState(5);
  const [comentarioAlumno, setComentarioAlumno] = useState('');
  const [submittingAlumno, setSubmittingAlumno] = useState(false);

  const cargar = async (userId: string) => {
    const { data, error } = await supabase
      .from('tutorias_agendadas')
      .select(`
        *,
        tutor:profiles!tutorias_agendadas_tutor_id_fkey(nombre, avatar_url),
        alumno:profiles!tutorias_agendadas_alumno_id_fkey(nombre, avatar_url)
      `)
      .or(`tutor_id.eq.${userId},alumno_id.eq.${userId}`)
      .eq('estado', 'confirmada')
      .order('fecha', { ascending: false });

    if (error) {
      setErrorMsg('No se pudo cargar el historial: ' + error.message);
    } else if (data) {
      setClasesRecibidas(data.filter((t: any) => t.alumno_id === userId));
      setClasesDadas(data.filter((t: any) => t.tutor_id === userId));
    }
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setCurrentUserId(user.id);
      await cargar(user.id);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // La clase dura 1 hora: termina 1 h después del inicio (hora real)
  const estaFinalizada = (t: Tutoria) => {
    const inicio = new Date(`${t.fecha}T${(t.hora || '00:00').slice(0, 5)}:00`);
    inicio.setHours(inicio.getHours() + (t.horas || 1));
    return new Date() >= inicio;
  };

  const abrirReseña = (t: Tutoria) => {
    setTutoriaACalificar(t);
    setEstrellas(5);
    setComentario('');
    setChipsSeleccionados([]);
  };

  const abrirReseñaAlumno = (t: Tutoria) => {
    setAlumnoACalificar(t);
    setEstrellasAlumno(5);
    setComentarioAlumno('');
  };

  const handleGuardarReseñaAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumnoACalificar || !currentUserId) return;

    setSubmittingAlumno(true);
    setErrorMsg('');
    const { error } = await supabase.rpc('calificar_alumno', {
      p_tutoria: alumnoACalificar.id,
      p_estrellas: estrellasAlumno,
      p_comentario: comentarioAlumno.trim(),
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setAlumnoACalificar(null);
      await cargar(currentUserId);
    }
    setSubmittingAlumno(false);
  };

  const toggleChip = (chip: string) => {
    setChipsSeleccionados((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleConfirmarClase = async (t: Tutoria, realizada: boolean) => {
    if (
      !realizada &&
      !window.confirm('¿Confirmás que la clase NO se realizó? Se te devolverá la hora reservada.')
    ) {
      return;
    }
    if (!currentUserId) return;

    setProcesando(t.id);
    setErrorMsg('');
    const { error } = await supabase.rpc('confirmar_clase', {
      p_tutoria: t.id,
      p_realizada: realizada,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      await cargar(currentUserId);
      if (realizada) abrirReseña(t);
    }
    setProcesando(null);
  };

  const handleGuardarReseña = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutoriaACalificar || !currentUserId) return;

    setSubmitting(true);
    setErrorMsg('');
    const { error } = await supabase.rpc('calificar_tutoria', {
      p_tutoria: tutoriaACalificar.id,
      p_estrellas: estrellas,
      p_comentario: comentario.trim(),
      p_chips: chipsSeleccionados,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setTutoriaACalificar(null);
      await cargar(currentUserId);
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-xs text-slate-400">Cargando historial de intercambios...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold p-3 rounded-2xl flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="underline">Cerrar</button>
        </div>
      )}

      {/* Clases Recibidas (como Alumno) */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-4 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Clases Recibidas (Como Alumno)</h2>
          <p className="text-xs text-slate-500">
            Cuando termina la clase, confirmás si se realizó y podés dejar tu reseña.
          </p>
        </div>

        {clasesRecibidas.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No registrás clases recibidas aún.</p>
        ) : (
          <div className="space-y-3">
            {clasesRecibidas.map((t) => {
              const finalizada = estaFinalizada(t);
              const yaCalificada = t.calificacion !== null && t.calificacion !== undefined;
              const ocupado = procesando === t.id;

              return (
                <div key={t.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-slate-900">{t.materia}</span>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Tutor: <span className="font-bold text-slate-700">{t.tutor?.nombre}</span> • {t.fecha} a las {(t.hora || '').slice(0, 5)} hs
                    </p>

                    {yaCalificada && (
                      <div className="pt-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-500">★ {t.calificacion}.0</span>
                        {t.comentario && <p className="text-xs text-slate-600 italic">"{t.comentario}"</p>}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {yaCalificada ? (
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-700">
                        Reseña enviada (Inmutable)
                      </span>
                    ) : t.clase_realizada === false ? (
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-600">
                        No realizada · hora devuelta
                      </span>
                    ) : !finalizada ? (
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Pendiente (se habilita al finalizar)
                      </span>
                    ) : t.clase_realizada === true ? (
                      <button
                        onClick={() => abrirReseña(t)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
                      >
                        Dejar Reseña
                      </button>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] font-bold text-slate-600">¿Se realizó la clase?</span>
                        <div className="flex gap-2">
                          <button
                            disabled={ocupado}
                            onClick={() => handleConfirmarClase(t, true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50"
                          >
                            Sí, se realizó
                          </button>
                          <button
                            disabled={ocupado}
                            onClick={() => handleConfirmarClase(t, false)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50"
                          >
                            No se realizó
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clases Impartidas (como Tutor) */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-4 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Clases Impartidas (Como Tutor)</h2>
          <p className="text-xs text-slate-500">
            La hora se acredita cuando tu alumno confirma que la clase se realizó. Las reseñas se publican en tu perfil.
          </p>
        </div>

        {clasesDadas.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No has impartido clases como tutor aún.</p>
        ) : (
          <div className="space-y-3">
            {clasesDadas.map((t) => {
              const finalizada = estaFinalizada(t);
              const yaCalificada = t.calificacion !== null && t.calificacion !== undefined;

              return (
                <div key={t.id} className="p-4 rounded-2xl border border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900">{t.materia}</span>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Alumno: <span className="font-bold text-slate-700">{t.alumno?.nombre}</span> • {t.fecha} a las {(t.hora || '').slice(0, 5)} hs ({t.horas || 1} h)
                    </p>

                    {t.clase_realizada === false && (
                      <p className="text-[10px] font-bold text-rose-700 mt-1">
                        El alumno marcó que la clase no se realizó.
                      </p>
                    )}

                    {t.calificacion_alumno !== null && t.calificacion_alumno !== undefined ? (
                      <p className="text-[11px] text-slate-600 mt-1">
                        Tu reseña al alumno: <span className="font-bold text-amber-500">★ {t.calificacion_alumno}.0</span>
                        {t.comentario_alumno && <span className="italic"> · "{t.comentario_alumno}"</span>}
                      </p>
                    ) : finalizada ? (
                      <button
                        onClick={() => abrirReseñaAlumno(t)}
                        className="mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] transition"
                      >
                        Calificar alumno
                      </button>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    {yaCalificada ? (
                      <span className="text-xs font-bold text-amber-500">Reseña recibida: ★ {t.calificacion}.0</span>
                    ) : t.clase_realizada === false ? (
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-600">
                        El alumno la marcó como no realizada
                      </span>
                    ) : t.clase_realizada === true ? (
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Realizada · hora acreditada · sin reseña aún
                      </span>
                    ) : finalizada ? (
                      <span className="text-[10px] text-slate-400 italic">Esperando confirmación del alumno</span>
                    ) : (
                      <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Próxima clase
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: reseña del tutor hacia el alumno */}
      {alumnoACalificar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full space-y-5 shadow-xl">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Calificar alumno</h3>
              <p className="text-xs text-slate-500 mt-1">
                Alumno: <span className="font-bold text-slate-800">{alumnoACalificar.alumno?.nombre}</span> ({alumnoACalificar.materia})
              </p>
              {alumnoACalificar.clase_realizada === false && (
                <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 mt-3">
                  El alumno marcó que esta clase no se realizó. Si la clase sí se dio, podés dejarlo asentado en tu comentario.
                </p>
              )}
            </div>

            <form onSubmit={handleGuardarReseñaAlumno} className="space-y-5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Puntuación (1 a 5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEstrellasAlumno(num)}
                      className={`text-2xl transition ${num <= estrellasAlumno ? 'text-amber-400' : 'text-slate-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Comentario</label>
                <textarea
                  value={comentarioAlumno}
                  onChange={(e) => setComentarioAlumno(e.target.value)}
                  placeholder="Contá cómo fue la clase y la actitud del alumno..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-slate-900 resize-none"
                />
              </div>

              <p className="text-[10px] text-slate-400">
                La reseña se publica en el perfil del alumno y no se puede modificar.
              </p>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submittingAlumno}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl text-xs transition disabled:opacity-50"
                >
                  {submittingAlumno ? 'Guardando...' : 'Publicar reseña'}
                </button>
                <button
                  type="button"
                  onClick={() => setAlumnoACalificar(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Calificación */}
      {tutoriaACalificar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-xl">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Calificar Tutoría</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tutor: <span className="font-bold text-slate-800">{tutoriaACalificar.tutor?.nombre}</span> ({tutoriaACalificar.materia})
              </p>
            </div>

            <form onSubmit={handleGuardarReseña} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Puntuación por Estrellas (1 a 5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEstrellas(num)}
                      className={`text-2xl transition ${num <= estrellas ? 'text-amber-400' : 'text-slate-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Etiquetas de Reconocimiento (Opcional)</label>
                <div className="flex flex-wrap gap-2">
                  {CHIPS_OPCIONES.map((chip) => {
                    const seleccionado = chipsSeleccionados.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => toggleChip(chip)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
                          seleccionado ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {seleccionado ? '✓ ' : '+ '}{chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Comentario Libre</label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Redactá un comentario sobre la tutoría..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-slate-900 resize-none"
                />
              </div>

              <p className="text-[10px] text-slate-400">
                Una vez publicada, la reseña no se puede modificar.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl text-xs transition shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Publicar Reseña'}
                </button>
                <button
                  type="button"
                  onClick={() => setTutoriaACalificar(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs transition"
                >
                  Más tarde
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}