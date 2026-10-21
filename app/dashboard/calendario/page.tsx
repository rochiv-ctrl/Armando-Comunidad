'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface TutoriaAgendada {
  id: string;
  publicacion_id: string;
  tutor_id: string;
  alumno_id: string;
  materia: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM o HH:MM:SS
  enlace_reunion?: string;
  horas?: number;
  estado: string;
  tutor?: { nombre: string; avatar_url: string };
  alumno?: { nombre: string; avatar_url: string };
}

export default function CalendarioPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tutorias, setTutorias] = useState<TutoriaAgendada[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // La hora actual y el mes visible se leen recién en el navegador
  // (así Next.js no avisa por usar new Date() al armar la página)
  const [ahora, setAhora] = useState<number | null>(null);
  const [currentMonthDate, setCurrentMonthDate] = useState<Date | null>(null);

  useEffect(() => {
    const hoy = new Date();
    setAhora(hoy.getTime());
    setCurrentMonthDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  }, []);

  useEffect(() => {
    async function loadCalendario() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('tutorias_agendadas')
        .select(`
          *,
          tutor:profiles!tutorias_agendadas_tutor_id_fkey(nombre, avatar_url),
          alumno:profiles!tutorias_agendadas_alumno_id_fkey(nombre, avatar_url)
        `)
        .or(`tutor_id.eq.${user.id},alumno_id.eq.${user.id}`)
        .eq('estado', 'confirmada')
        .order('fecha', { ascending: true });

      if (error) {
        setErrorMsg('No se pudo cargar el calendario: ' + error.message);
      } else if (data) {
        setTutorias(data as TutoriaAgendada[]);
      }
      setLoading(false);
    }

    loadCalendario();
  }, [router]);

  // La clase dura 1 hora. Pasada = ya terminó su horario.
  const esTutoriaPasada = (fechaStr: string, horaStr: string, horas?: number) => {
    if (ahora === null) return false;
    const fin = new Date(`${fechaStr}T${(horaStr || '00:00').slice(0, 5)}:00`);
    fin.setHours(fin.getHours() + (horas || 1));
    return ahora >= fin.getTime();
  };

  if (!currentMonthDate) {
    return <div className="text-center py-12 text-xs text-slate-400">Cargando calendario...</div>;
  }

  const cambiarMes = (delta: number) => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + delta, 1));
  };

  const nombreMes = currentMonthDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  const getDiasDelMes = () => {
    const año = currentMonthDate.getFullYear();
    const mes = currentMonthDate.getMonth();
    const primerDiaSemana = new Date(año, mes, 1).getDay(); // 0 = domingo
    const totalDias = new Date(año, mes + 1, 0).getDate();

    const dias: (number | null)[] = [];
    for (let i = 0; i < (primerDiaSemana === 0 ? 6 : primerDiaSemana - 1); i++) dias.push(null);
    for (let d = 1; d <= totalDias; d++) dias.push(d);
    return dias;
  };

  const diasMes = getDiasDelMes();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold p-3 rounded-2xl">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 border border-slate-200/80 rounded-3xl shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Calendario de Tutorías</h1>
          <p className="text-xs text-slate-500">Tutorías agendadas y registro de clases acordadas.</p>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => cambiarMes(-1)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            ← Mes anterior
          </button>
          <span className="text-xs font-black text-slate-900 capitalize px-2">{nombreMes}</span>
          <button
            onClick={() => cambiarMes(1)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Mes siguiente →
          </button>
        </div>
      </div>

      <div className="hidden md:block bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-slate-400">
          <span>LUN</span>
          <span>MAR</span>
          <span>MIÉ</span>
          <span>JUE</span>
          <span>VIE</span>
          <span>SÁB</span>
          <span>DOM</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {diasMes.map((diaNum, idx) => {
            if (diaNum === null) {
              return <div key={`empty-${idx}`} className="h-28 bg-slate-50/40 rounded-2xl border border-transparent" />;
            }

            const año = currentMonthDate.getFullYear();
            const mesStr = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
            const diaStr = String(diaNum).padStart(2, '0');
            const fechaKey = `${año}-${mesStr}-${diaStr}`;
            const tutoriasDelDia = tutorias.filter((t) => t.fecha === fechaKey);

            return (
              <div
                key={fechaKey}
                className="h-28 p-2 rounded-2xl border border-slate-100 bg-white flex flex-col justify-between overflow-hidden"
              >
                <span className="text-[11px] font-black text-slate-400">{diaNum}</span>

                <div className="flex-1 overflow-y-auto space-y-1.5 my-1 pr-1">
                  {tutoriasDelDia.map((t) => {
                    const esTutor = t.tutor_id === currentUserId;
                    const pasada = esTutoriaPasada(t.fecha, t.hora, t.horas);

                    return (
                      <div
                        key={t.id}
                        className={`p-1.5 rounded-xl text-[10px] space-y-0.5 border transition ${
                          pasada
                            ? 'bg-slate-100 text-slate-400 border-slate-200'
                            : esTutor
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200/80'
                            : 'bg-indigo-50 text-indigo-900 border-indigo-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 font-bold">
                          <span className="truncate">{t.materia}</span>
                          <span className="text-[9px] shrink-0">{(t.hora || '').slice(0, 5)} hs</span>
                        </div>

                        <div className="text-[9px] opacity-80 truncate">
                          {esTutor ? 'Alumno:' : 'Tutor:'} {esTutor ? t.alumno?.nombre : t.tutor?.nombre}
                        </div>
                        <div className="font-extrabold uppercase text-[8px]">
                          {pasada ? 'Pasada' : esTutor ? 'Doy clase' : 'Tomo clase'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900">Listado de Sesiones Acordadas</h2>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Cargando tutorías...</div>
        ) : tutorias.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No tenés tutorías agendadas aún.</p>
        ) : (
          <div className="space-y-3">
            {tutorias.map((t) => {
              const esTutor = t.tutor_id === currentUserId;
              const pasada = esTutoriaPasada(t.fecha, t.hora, t.horas);

              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                    pasada
                      ? 'bg-slate-100/80 border-slate-200 text-slate-500'
                      : 'bg-slate-50/50 border-slate-100 text-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900">{t.materia}</span>
                      <span
                        className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
                          pasada
                            ? 'bg-slate-200 text-slate-600'
                            : esTutor
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {esTutor ? 'Rol: Tutor' : 'Rol: Alumno'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium">
                      📅 {t.fecha} a las {(t.hora || '').slice(0, 5)} hs ({t.horas || 1} h) •{' '}
                      {esTutor ? `Alumno: ${t.alumno?.nombre}` : `Tutor: ${t.tutor?.nombre}`}
                    </p>

                    {t.enlace_reunion && (
                      <a
                        href={t.enlace_reunion}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-indigo-600 hover:underline block pt-1"
                      >
                        🔗 Enlace de reunión virtual
                      </a>
                    )}
                  </div>

                  <div>
                    {pasada ? (
                      <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-slate-200 text-slate-600">
                        Finalizada
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Confirmada
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}