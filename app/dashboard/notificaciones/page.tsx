'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState([
    {
      id: 1,
      tipo: 'pendiente_puntuar',
      icono: '⭐',
      titulo: '¿Cómo fue la tutoría con Mateo R.?',
      descripcion: 'Pasó la fecha agendada para la tutoría de Análisis Matemático I. Dejá tu calificación (1 a 5 estrellas).',
      tiempo: 'Hace 1 hora',
      leida: false,
      accionTexto: 'Calificar Ahora',
      accionUrl: '/dashboard/calificar'
    },
    {
      id: 2,
      tipo: 'puntuacion_recibida',
      icono: '🎉',
      titulo: '¡Te puntuaron con 5 estrellas!',
      descripcion: 'Lucía M. te dejó una reseña: "Explicación excelente y súper clara sobre Tablas Dinámicas."',
      tiempo: 'Hace 1 día',
      leida: true,
      accionTexto: 'Ver en Mi Perfil',
      accionUrl: '/dashboard/perfil'
    }
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Centro de Notificaciones</h1>
          <p className="text-sm text-slate-400">Recordatorios de calificación y reviews recibidas.</p>
        </div>
      </div>

      <div className="space-y-4">
        {notificaciones.map((n) => (
          <div
            key={n.id}
            className={`p-6 rounded-3xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
              n.leida
                ? 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                : 'bg-slate-900 border-blue-800/60 text-white shadow-xl shadow-blue-900/10'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{n.icono}</span>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base">{n.titulo}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{n.descripcion}</p>
                <span className="text-xs text-slate-500 font-medium block pt-1">{n.tiempo}</span>
              </div>
            </div>

            <Link
              href={n.accionUrl}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition whitespace-nowrap self-end sm:self-center"
            >
              {n.accionTexto}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}