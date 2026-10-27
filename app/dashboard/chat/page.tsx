'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';

const MAX_CARACTERES = 1000;
const AVATAR_DEFAULT =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

const ESTADO_PROPUESTA: Record<string, { label: string; clase: string }> = {
  pendiente: { label: 'Pendiente de respuesta', clase: 'bg-amber-100 text-amber-800' },
  aceptada: { label: 'Aceptada · crédito en garantía', clase: 'bg-emerald-100 text-emerald-800' },
  rechazada: { label: 'Rechazada', clase: 'bg-rose-100 text-rose-800' },
  cancelada: { label: 'Cancelada', clase: 'bg-slate-200 text-slate-600' },
};

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pubId = searchParams.get('pub'); // el botón Contactar solo manda ?pub=<id>

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversaciones, setConversaciones] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');

  // Notificaciones: no leídos por conversación + aviso emergente
  const [noLeidosPorConv, setNoLeidosPorConv] = useState<Record<string, number>>({});
  const [aviso, setAviso] = useState<{ convId: string; texto: string } | null>(null);
  const avisoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [partnerEnLinea, setPartnerEnLinea] = useState(false);
  const [partnerEscribiendo, setPartnerEscribiendo] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActivoRef = useRef(false);

  const [sending, setSending] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);

  const [showPropuestaModal, setShowPropuestaModal] = useState(false);
  const [propuestaFecha, setPropuestaFecha] = useState('');
  const [propuestaHora, setPropuestaHora] = useState('');
  const [propuestaEnlace, setPropuestaEnlace] = useState('');
  const [creandoPropuesta, setCreandoPropuesta] = useState(false);

  // En celular se muestra la lista O la conversación, no las dos juntas
  const [vistaMovil, setVistaMovil] = useState<'lista' | 'chat'>('lista');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // ---- Derivados -------------------------------------------------------
  const activeConv = conversaciones.find((c) => c.id === activeConvId) ?? null;
  const activePartner = activeConv?.partner ?? null;
  const pub = activeConv?.publicacion ?? null;

  const partnerIdRef = useRef<string | null>(null);
  partnerIdRef.current = activePartner?.id ?? null;
  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = activeConvId;

  // Rol en ESTA conversación: ofrece → el autor es tutor | pide → el autor es alumno
  const soyTutor: boolean | null =
    pub && currentUserId
      ? pub.tipo === 'ofrece'
        ? pub.usuario_id === currentUserId
        : pub.usuario_id !== currentUserId
      : null;

  const hayClaseAceptada = mensajes.some((m) => m.es_propuesta && m.estado_propuesta === 'aceptada');
  const puedeProponer = soyTutor === true && pub?.estado === 'activa' && !hayClaseAceptada;

  // ---- Carga inicial / Contactar --------------------------------------
  useEffect(() => {
    async function initChat() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setCurrentUserId(user.id);

      let convId: string | null = null;
      if (pubId) {
        const { data, error } = await supabase.rpc('iniciar_contacto', { p_pub: pubId });
        if (error) setUiError(error.message);
        else if (!data) setUiError('No se pudo abrir la conversación. Probá de nuevo.');
        else convId = data;
      }

      await loadConversaciones(user.id, convId);
      if (convId) setVistaMovil('chat');
      await cargarNoLeidos(user.id);
      if (pubId) router.replace('/dashboard/chat');
    }
    initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pubId]);

  const loadConversaciones = async (userId: string, selectId?: string | null) => {
    const { data, error } = await supabase
      .from('conversaciones')
      .select(`
        *,
        user_a:profiles!conversaciones_user_a_id_fkey(id, nombre, avatar_url, carrera),
        user_b:profiles!conversaciones_user_b_id_fkey(id, nombre, avatar_url, carrera)
      `)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error || !data) {
      setUiError('No se pudieron cargar las conversaciones: ' + (error?.message ?? 'sin datos'));
      return;
    }

    const pubIds = Array.from(new Set(data.map((c: any) => c.publicacion_id).filter(Boolean)));
    const pubsPorId: Record<string, any> = {};
    if (pubIds.length > 0) {
      const { data: pubs } = await supabase
        .from('publicaciones')
        .select('id, titulo, materia, tipo, usuario_id, estado, horas')
        .in('id', pubIds);
      (pubs ?? []).forEach((p: any) => {
        pubsPorId[p.id] = p;
      });
    }

    const formatted = data.map((c: any) => ({
      ...c,
      partner: c.user_a_id === userId ? c.user_b : c.user_a,
      publicacion: c.publicacion_id ? pubsPorId[c.publicacion_id] ?? null : null,
    }));
    setConversaciones(formatted);
    setActiveConvId((prev) => selectId ?? prev ?? formatted[0]?.id ?? null);
  };

  const loadMensajes = async (convId: string) => {
    const { data } = await supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', convId)
      .order('created_at', { ascending: true });
    if (data) setMensajes(data);
  };

  // Cuenta los mensajes sin leer, agrupados por conversación
  const cargarNoLeidos = async (userId: string) => {
    const { data } = await supabase
      .from('mensajes')
      .select('conversacion_id')
      .eq('destinatario_id', userId)
      .eq('leido', false);

    const conteo: Record<string, number> = {};
    (data ?? []).forEach((m: any) => {
      if (m.conversacion_id) conteo[m.conversacion_id] = (conteo[m.conversacion_id] || 0) + 1;
    });
    setNoLeidosPorConv(conteo);
  };

  const marcarComoLeidos = async (convId: string, userId: string) => {
    await supabase
      .from('mensajes')
      .update({ leido: true, fecha_lectura: new Date().toISOString() })
      .eq('conversacion_id', convId)
      .eq('destinatario_id', userId)
      .eq('leido', false);
    await cargarNoLeidos(userId);
  };

  // ---- Bandeja: avisa de mensajes nuevos en cualquier conversación -----
  useEffect(() => {
    if (!currentUserId) return;
    const miId = currentUserId;

    const channel = supabase
      .channel('bandeja_' + miId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `destinatario_id=eq.${miId}` },
        (payload) => {
          const nuevo = payload.new as any;
          loadConversaciones(miId);
          cargarNoLeidos(miId);

          if (nuevo.conversacion_id !== activeConvIdRef.current) {
            const preview = nuevo.es_propuesta
              ? '📅 Te enviaron una propuesta de tutoría'
              : String(nuevo.contenido ?? nuevo.texto ?? '').slice(0, 70);
            setAviso({ convId: nuevo.conversacion_id, texto: preview });
            if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
            avisoTimeoutRef.current = setTimeout(() => setAviso(null), 6000);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mensajes', filter: `destinatario_id=eq.${miId}` },
        () => cargarNoLeidos(miId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // ---- Realtime de la conversación abierta -----------------------------
  useEffect(() => {
    if (!activeConvId || !currentUserId) return;

    setMensajes([]);
    setPartnerEnLinea(false);
    setPartnerEscribiendo(false);
    loadMensajes(activeConvId);
    marcarComoLeidos(activeConvId, currentUserId);

    const channel = supabase.channel(`room_${activeConvId}`, {
      config: { presence: { key: currentUserId } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPartnerEnLinea(!!partnerIdRef.current && partnerIdRef.current in state);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.user_id === partnerIdRef.current) setPartnerEscribiendo(!!payload.isTyping);
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${activeConvId}` },
        (payload) => {
          const nuevo = payload.new as any;
          setMensajes((prev) => (prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo]));
          if (nuevo.destinatario_id === currentUserId) marcarComoLeidos(activeConvId, currentUserId);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${activeConvId}` },
        (payload) => {
          const upd = payload.new as any;
          setMensajes((prev) => prev.map((m) => (m.id === upd.id ? upd : m)));
          if (upd.es_propuesta) loadConversaciones(currentUserId);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, currentUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // ---- Escritura -------------------------------------------------------
  const enviarTyping = (isTyping: boolean) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId, isTyping },
    });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNuevoMensaje(e.target.value);
    if (!typingActivoRef.current) {
      typingActivoRef.current = true;
      enviarTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingActivoRef.current = false;
      enviarTyping(false);
    }, 2000);
  };

  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    const texto = nuevoMensaje.trim();
    if (!texto || !activeConvId || !activePartner || !currentUserId || sending) return;
    if (texto.length > MAX_CARACTERES) {
      setUiError(`El mensaje supera el límite de ${MAX_CARACTERES} caracteres.`);
      return;
    }

    setSending(true);
    setUiError(null);

    const { data, error } = await supabase
      .from('mensajes')
      .insert([
        {
          conversacion_id: activeConvId,
          remitente_id: currentUserId,
          destinatario_id: activePartner.id,
          contenido: texto,
          leido: false,
        },
      ])
      .select()
      .single();

    if (error) {
      setUiError('Error al enviar: ' + error.message);
    } else {
      setNuevoMensaje('');
      if (data) setMensajes((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      await supabase.from('conversaciones').update({ updated_at: new Date().toISOString() }).eq('id', activeConvId);
    }
    setSending(false);
  };

  // ---- Propuestas (todo pasa por funciones SQL) ------------------------
  const handleCrearPropuesta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId) return;
    setCreandoPropuesta(true);
    setUiError(null);

    const { error } = await supabase.rpc('crear_propuesta', {
      p_conv: activeConvId,
      p_fecha: propuestaFecha,
      p_hora: propuestaHora,
      p_enlace: propuestaEnlace || null,
    });

    if (error) {
      setUiError(error.message);
    } else {
      setShowPropuestaModal(false);
      setPropuestaFecha('');
      setPropuestaHora('');
      setPropuestaEnlace('');
      await loadMensajes(activeConvId);
    }
    setCreandoPropuesta(false);
  };

  const responderPropuesta = async (msg: any, accion: 'aceptar' | 'rechazar' | 'cancelar') => {
    if (!msg.tutoria_id || !activeConvId || !currentUserId) return;
    const fn = { aceptar: 'aceptar_propuesta', rechazar: 'rechazar_propuesta', cancelar: 'cancelar_tutoria' }[accion];

    setAccionEnCurso(msg.id);
    setUiError(null);
    const { error } = await supabase.rpc(fn, { p_tutoria: msg.tutoria_id });
    if (error) {
      setUiError(error.message);
    } else {
      await loadMensajes(activeConvId);
      await loadConversaciones(currentUserId);
    }
    setAccionEnCurso(null);
  };

  const claseNoEmpezo = (msg: any) => {
    const hora = String(msg.propuesta_hora || '00:00').slice(0, 5);
    return new Date(`${msg.propuesta_fecha}T${hora}:00`) > new Date();
  };

  const renderTextoSeguro = (texto: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return texto.split(urlRegex).map((parte, i) =>
      /^https?:\/\//.test(parte) ? (
        <a key={i} href={parte} target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-400 hover:text-indigo-300 break-all">
          {parte}
        </a>
      ) : (
        <span key={i}>{parte}</span>
      )
    );
  };

  // ---- Render ----------------------------------------------------------
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100dvh-15rem)] md:h-[80vh] max-w-6xl mx-auto">
      {/* Aviso emergente de mensaje nuevo en otra conversación */}
      {aviso && (
        <button
          onClick={() => {
            setActiveConvId(aviso.convId);
            setVistaMovil('chat');
            setAviso(null);
          }}
          className="fixed top-6 right-6 z-50 max-w-xs text-left bg-slate-900 text-white rounded-2xl shadow-xl px-4 py-3 space-y-0.5 hover:bg-slate-800 transition"
        >
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300">💬 Nuevo mensaje</p>
          <p className="text-xs">{aviso.texto}</p>
        </button>
      )}

      {/* Lista de conversaciones */}
      <div className={`bg-white border border-slate-200/80 rounded-3xl p-4 flex-col shadow-xs ${vistaMovil === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <h2 className="text-sm font-extrabold text-slate-900 mb-4 px-2">Conversaciones Privadas</h2>
        {conversaciones.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
            <p className="text-xs text-slate-400">No tenés conversaciones activas.</p>
            <button onClick={() => router.push('/dashboard')} className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl">
              Ir al Muro
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {conversaciones.map((conv) => {
              const sinLeer = conv.id === activeConvId ? 0 : noLeidosPorConv[conv.id] || 0;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setVistaMovil('chat');
                  }}
                  className={`w-full text-left p-3 rounded-2xl transition flex items-center gap-3 ${
                    activeConvId === conv.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <img src={conv.partner?.avatar_url || AVATAR_DEFAULT} className="w-10 h-10 rounded-full object-cover border" alt="" />
                  <div className="overflow-hidden flex-1">
                    <h4 className={`text-xs truncate ${sinLeer > 0 ? 'font-black' : 'font-bold'}`}>{conv.partner?.nombre}</h4>
                    <p className={`text-[10px] truncate ${activeConvId === conv.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {conv.publicacion
                        ? `${conv.publicacion.tipo === 'ofrece' ? 'Ofrece' : 'Busca'} · ${conv.publicacion.titulo}`
                        : conv.partner?.carrera}
                    </p>
                  </div>
                  {sinLeer > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-extrabold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shrink-0">
                      {sinLeer > 99 ? '99+' : sinLeer}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Ventana de chat */}
      <div className={`md:col-span-2 bg-white border border-slate-200/80 rounded-3xl flex-col shadow-xs overflow-hidden ${vistaMovil === 'lista' ? 'hidden md:flex' : 'flex'}`}>
        {activePartner && activeConv ? (
          <>
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setVistaMovil('lista')}
                    className="md:hidden text-slate-500 hover:text-slate-900 font-bold text-lg px-1"
                    aria-label="Volver a las conversaciones"
                  >
                    ←
                  </button>
                  <div className="relative">
                    <img src={activePartner.avatar_url || AVATAR_DEFAULT} className="w-10 h-10 rounded-full object-cover border" alt="" />
                    {partnerEnLinea && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900">{activePartner.nombre}</h3>
                    <p className="text-[10px] font-semibold text-slate-500">
                      {partnerEscribiendo ? (
                        <span className="text-indigo-600 font-bold italic">Escribiendo...</span>
                      ) : partnerEnLinea ? (
                        <span className="text-emerald-600 font-bold">En línea</span>
                      ) : (
                        'Desconectado'
                      )}
                    </p>
                  </div>
                </div>

                {puedeProponer && (
                  <button onClick={() => setShowPropuestaModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-4 py-2.5 rounded-xl transition shadow-xs">
                    📅 Nueva Propuesta de Tutoría
                  </button>
                )}
              </div>

              {pub ? (
                <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-slate-900">{pub.titulo}</span>
                  <span>· {pub.materia}</span>
                  <span>· {pub.horas || 1} h</span>
                  {soyTutor !== null && (
                    <span className={`ml-auto font-extrabold ${soyTutor ? 'text-emerald-700' : 'text-indigo-700'}`}>
                      {soyTutor ? 'Vos sos el tutor' : 'Vos sos el alumno'}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Esta conversación no está vinculada a una publicación.</p>
              )}

              {pub?.estado === 'en_proceso' && !hayClaseAceptada && (
                <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Esta publicación ya fue tomada por otra persona, así que no se pueden crear nuevas propuestas.
                </p>
              )}
            </div>

            <div className="flex-1 p-3 md:p-6 overflow-y-auto space-y-4 bg-slate-50/30">
              {mensajes.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">Cargando mensajes...</div>
              ) : (
                mensajes.map((msg) => {
                  const esMio = msg.remitente_id === currentUserId;
                  const est = ESTADO_PROPUESTA[msg.estado_propuesta] ?? ESTADO_PROPUESTA.pendiente;
                  const ocupado = accionEnCurso === msg.id;

                  return (
                    <div key={msg.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] md:max-w-md p-4 rounded-2xl text-xs space-y-2 shadow-xs ${esMio ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 border border-slate-200/80'}`}>
                        {msg.es_propuesta ? (
                          <div className="space-y-2">
                            <p className="font-extrabold">📅 {msg.contenido}</p>
                            <p>
                              {msg.propuesta_fecha} a las {String(msg.propuesta_hora).slice(0, 5)} hs · {pub?.horas || 1} h
                            </p>
                            {msg.propuesta_enlace && <p>{renderTextoSeguro(msg.propuesta_enlace)}</p>}
                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full ${est.clase}`}>{est.label}</span>

                            {msg.estado_propuesta === 'pendiente' && soyTutor === false && !esMio && claseNoEmpezo(msg) && (
                              <div className="flex gap-2 pt-1">
                                <button disabled={ocupado} onClick={() => responderPropuesta(msg, 'aceptar')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50">
                                  Aceptar (reserva {pub?.horas || 1} h)
                                </button>
                                <button disabled={ocupado} onClick={() => responderPropuesta(msg, 'rechazar')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl disabled:opacity-50">
                                  Rechazar
                                </button>
                              </div>
                            )}
                            {msg.estado_propuesta === 'pendiente' && !claseNoEmpezo(msg) && (
                              <p className="text-[10px] font-bold text-rose-600">Esta propuesta venció.</p>
                            )}
                            {msg.estado_propuesta === 'pendiente' && esMio && claseNoEmpezo(msg) && (
                              <p className="text-[10px] opacity-75">Esperando que el alumno responda.</p>
                            )}
                            {msg.estado_propuesta === 'aceptada' && claseNoEmpezo(msg) && (
                              <button disabled={ocupado} onClick={() => responderPropuesta(msg, 'cancelar')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl disabled:opacity-50">
                                Cancelar clase
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="leading-relaxed">{renderTextoSeguro(msg.contenido ?? msg.texto ?? '')}</p>
                        )}

                        <div className="flex items-center justify-end gap-1.5 text-[9px] opacity-75">
                          <span>{new Date(msg.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {esMio && <span className="font-bold">{msg.leido ? '✓✓ Leído' : '✓ Enviado'}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {uiError && (
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs font-bold flex justify-between items-center">
                <span>{uiError}</span>
                <button onClick={() => setUiError(null)} className="underline">Cerrar</button>
              </div>
            )}

            <form onSubmit={handleEnviarMensaje} className="p-4 border-t border-slate-100 bg-white space-y-1">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Escribí un mensaje..."
                  value={nuevoMensaje}
                  onChange={handleTyping}
                  maxLength={MAX_CARACTERES}
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-slate-900"
                />
                <button type="submit" disabled={sending || !nuevoMensaje.trim()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-2xl text-xs transition disabled:opacity-50">
                  Enviar
                </button>
              </div>
              <div className="flex justify-end text-[9px] text-slate-400 font-medium px-1">
                {nuevoMensaje.length} / {MAX_CARACTERES}
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-xs text-slate-400 p-8 text-center">
            {uiError ? (
              <>
                <p className="text-amber-700 font-bold">{uiError}</p>
                <button onClick={() => router.push('/dashboard')} className="bg-slate-900 text-white font-bold px-4 py-2 rounded-xl">
                  Volver al Muro
                </button>
              </>
            ) : (
              'Seleccioná una conversación de la izquierda.'
            )}
          </div>
        )}
      </div>

      {/* Modal Propuesta de Tutoría (solo tutor) */}
      {showPropuestaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full space-y-5 shadow-xl">
            <h3 className="text-lg font-extrabold text-slate-900">Crear Propuesta de Tutoría</h3>
            <form onSubmit={handleCrearPropuesta} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Materia</label>
                <input type="text" value={pub?.materia ?? ''} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Duración de la clase</label>
                <input type="text" value={`${pub?.horas || 1} h (se reservan del saldo del alumno)`} readOnly className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                <input type="date" value={propuestaFecha} onChange={(e) => setPropuestaFecha(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200" required />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora</label>
                <input type="time" value={propuestaHora} onChange={(e) => setPropuestaHora(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200" required />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Enlace de reunión (Opcional)</label>
                <input type="url" value={propuestaEnlace} onChange={(e) => setPropuestaEnlace(e.target.value)} placeholder="https://meet.google.com/..." className="w-full px-4 py-2.5 rounded-xl border border-slate-200" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creandoPropuesta} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                  {creandoPropuesta ? 'Enviando...' : 'Enviar Propuesta'}
                </button>
                <button type="button" onClick={() => setShowPropuestaModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl transition">
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

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-xs text-slate-400">Cargando chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}