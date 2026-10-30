import Link from 'next/link';
import type { Metadata } from 'next';

// Cómo se ve el link cuando se comparte por WhatsApp, Instagram, etc.
export const metadata: Metadata = {
  metadataBase: new URL('https://armando-comunidad.vercel.app'),
  title: 'Armando Comunidad · Intercambiá clases con compañeros de la FCE-UBA',
  description:
    'La plataforma de estudiantes de Ciencias Económicas (UBA) para dar y recibir clases de apoyo. Se paga con horas, no con plata.',
  openGraph: {
    title: 'Armando Comunidad',
    description: 'Dá y recibí clases de apoyo con compañeros de la FCE-UBA. Se paga con horas, no con plata.',
    url: '/',
    siteName: 'Armando Comunidad',
    locale: 'es_AR',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Armando Comunidad' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Armando Comunidad',
    description: 'Dá y recibí clases de apoyo con compañeros de la FCE-UBA. Se paga con horas, no con plata.',
    images: ['/og.png'],
  },
};

// ---------------------------------------------------------------------
// AUSPICIANTE (sponsor). Completá los datos y poné activo: true.
// Mientras esté en false, la página no muestra nada del sponsor.
// El logo es opcional: guardalo en la carpeta public y poné su nombre, por ejemplo '/sponsor-logo.png'.
// ---------------------------------------------------------------------
const SPONSOR = {
  activo: false,
  nombre: 'Fenix Cafe de Especialidad',
  descripcion: 'Somos tostadores. En frente de FCE!.',
  oferta: '', // Opcional. Ejemplo: '10% de descuento mostrando tu perfil de Armando Comunidad'
  direccion: '', // Opcional. Ejemplo: 'Av. Córdoba 2122, CABA'
  enlace: '', // @fenixcafe.ba
  textoBoton: 'Conocer el café',
  logo: '', // Opcional. Ejemplo: '/sponsor-logo.png'
};

const PASOS = [
  {
    titulo: 'Registrate con tu correo de la facultad',
    texto: 'Recibís 3 horas de bienvenida (5 si sos ingresante) para empezar a pedir ayuda desde el primer día.',
  },
  {
    titulo: 'Publicá o buscá ayuda',
    texto: 'Elegí la materia de la lista del plan de estudios y contá qué necesitás o qué podés enseñar.',
  },
  {
    titulo: 'Coordiná por chat',
    texto: 'El tutor propone día y hora. Cuando el alumno acepta, su hora queda reservada en garantía.',
  },
  {
    titulo: 'Dá la clase y dejá tu reseña',
    texto: 'Al terminar, el alumno confirma que se hizo: la hora pasa al tutor y se publica una reseña.',
  },
];

const BENEFICIOS = [
  {
    icono: '🪙',
    titulo: 'Sin plata de por medio',
    texto: 'Todo se paga con horas: lo que enseñás hoy lo usás mañana para aprender otra materia.',
  },
  {
    icono: '🎓',
    titulo: 'Solo para la FCE',
    texto: 'Para registrarte hace falta tu correo institucional, así sabés que hablás con compañeros.',
  },
  {
    icono: '🔒',
    titulo: 'Horas en garantía',
    texto: 'La hora del alumno queda reservada y solo se acredita cuando la clase se realizó.',
  },
  {
    icono: '⭐',
    titulo: 'Reputación real',
    texto: 'Reseñas con estrellas y etiquetas para elegir tutores con confianza.',
  },
  {
    icono: '🌱',
    titulo: 'Ingresantes primero',
    texto: 'Distintivo especial y 5 horas de bienvenida para quienes recién empiezan.',
  },
  {
    icono: '📚',
    titulo: 'Materias del plan',
    texto: 'Lista estandarizada del ciclo general y de cada carrera, para encontrar lo que buscás.',
  },
];

const PREGUNTAS = [
  {
    pregunta: '¿Cuánto cuesta?',
    respuesta: 'Nada. Las clases se pagan con horas que ganás enseñando.',
  },
  {
    pregunta: '¿Quién puede usarla?',
    respuesta: 'Estudiantes de la FCE-UBA con correo @campus.economicas.uba.ar.',
  },
  {
    pregunta: '¿Cuántas horas me dan al empezar?',
    respuesta: '3 horas de bienvenida. Si te registrás como ingresante, 5.',
  },
  {
    pregunta: '¿Cuánto dura una clase?',
    respuesta: 'Lo que indica la publicación: de 1 a 5 horas. Esa es también la cantidad de horas que se usan.',
  },
  {
    pregunta: '¿Y si la clase no se hace?',
    respuesta:
      'El alumno puede marcar que no se realizó y su hora vuelve a su saldo. El tutor puede dejar una reseña contando lo que pasó.',
  },
];

export default function Inicio() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Encabezado */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Armando Comunidad" className="w-10 h-10 object-contain" />
            <span className="text-base font-black text-slate-900 tracking-tight">Armando Comunidad</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/auth"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Ingresar
            </Link>
            <Link
              href="/auth?registro=1"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      {/* Portada */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-[#d8a58d] bg-white/10 px-3 py-1.5 rounded-full">
              Para estudiantes de la FCE-UBA
            </span>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight">
              Aprendé y enseñá con tus compañeros. Pagá con horas, no con plata.
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Armando Comunidad conecta a estudiantes de Ciencias Económicas para dar y recibir clases de apoyo.
              Das una clase, ganás una hora; pedís una clase, usás una hora.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/auth?registro=1"
                className="px-6 py-3.5 rounded-2xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 transition"
              >
                Crear mi cuenta
              </Link>
              <Link
                href="/auth"
                className="px-6 py-3.5 rounded-2xl text-sm font-bold border border-white/30 text-white hover:bg-white/10 transition"
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="text-xs text-slate-400">Gratis · Solo con tu correo @campus.economicas.uba.ar</p>
          </div>

          {/* Ejemplo ilustrativo de una publicación */}
          <div className="relative">
            <div className="bg-white text-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-w-md mx-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ejemplo de publicación</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Ofrece ayuda
                </span>
                <span className="text-xs font-bold text-slate-600">• Análisis Matemático I</span>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  CBC
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Repaso para el primer parcial</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Resolvemos juntos ejercicios de límites y derivadas, con material de práctica.
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor</span>
                  <span className="text-lg font-black text-slate-900">1 Hora</span>
                </div>
                <span className="bg-slate-900 text-white font-bold px-5 py-2.5 rounded-2xl text-xs">Contactar</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auspiciante: banda debajo de la portada */}
      {SPONSOR.activo && (
        <div className="bg-slate-50 border-b border-slate-200/80">
          <div className="max-w-6xl mx-auto px-5 py-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Con el apoyo de</span>
            {SPONSOR.enlace ? (
              <a
                href={SPONSOR.enlace}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold text-slate-800 hover:underline"
              >
                {SPONSOR.logo ? (
                  <img src={SPONSOR.logo} alt={SPONSOR.nombre} className="h-6 w-auto object-contain" />
                ) : (
                  <span>☕</span>
                )}
                {SPONSOR.nombre}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 font-bold text-slate-800">
                {SPONSOR.logo ? (
                  <img src={SPONSOR.logo} alt={SPONSOR.nombre} className="h-6 w-auto object-contain" />
                ) : (
                  <span>☕</span>
                )}
                {SPONSOR.nombre}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Cómo funciona */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Cómo funciona</h2>
          <p className="text-slate-500">Cuatro pasos, sin vueltas.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {PASOS.map((paso, i) => (
            <div key={paso.titulo} className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 space-y-3">
              <span className="w-9 h-9 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-sm">
                {i + 1}
              </span>
              <h3 className="text-base font-bold text-slate-900">{paso.titulo}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{paso.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Beneficios */}
      <section className="bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Pensada para la comunidad de Económicas</h2>
            <p className="text-slate-500">Una forma simple y justa de ayudarnos entre nosotros.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {BENEFICIOS.map((b) => (
              <div key={b.titulo} className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-2 shadow-sm">
                <span className="text-2xl">{b.icono}</span>
                <h3 className="text-base font-bold text-slate-900">{b.titulo}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{b.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auspiciante: tarjeta con más detalle */}
      {SPONSOR.activo && (
        <section className="max-w-4xl mx-auto px-5 pb-4 pt-16">
          <div className="bg-amber-50/60 border border-amber-200 rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8">
            <div className="shrink-0 w-28 h-28 rounded-3xl bg-white border border-amber-200 flex items-center justify-center overflow-hidden">
              {SPONSOR.logo ? (
                <img src={SPONSOR.logo} alt={SPONSOR.nombre} className="w-full h-full object-contain p-3" />
              ) : (
                <span className="text-5xl">☕</span>
              )}
            </div>

            <div className="space-y-3 text-center sm:text-left">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700">Auspiciante</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{SPONSOR.nombre}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{SPONSOR.descripcion}</p>

              {SPONSOR.oferta && (
                <p className="text-sm font-bold text-slate-900 bg-white border border-amber-200 rounded-2xl px-4 py-3">
                  🎁 {SPONSOR.oferta}
                </p>
              )}

              {SPONSOR.direccion && <p className="text-xs text-slate-500">📍 {SPONSOR.direccion}</p>}

              {SPONSOR.enlace && (
                <a
                  href={SPONSOR.enlace}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="inline-block px-6 py-3 rounded-2xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                  {SPONSOR.textoBoton}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Preguntas frecuentes */}
      <section className="max-w-3xl mx-auto px-5 py-16 sm:py-20">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center">Preguntas frecuentes</h2>
        <div className="mt-8 space-y-3">
          {PREGUNTAS.map((p) => (
            <details key={p.pregunta} className="group bg-white border border-slate-200/80 rounded-2xl px-5 py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-bold text-slate-900">
                {p.pregunta}
                <span className="text-slate-400 group-open:rotate-45 transition text-lg leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{p.respuesta}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-5 py-16 text-center space-y-6">
          <h2 className="text-3xl font-black tracking-tight">Sumate a la comunidad</h2>
          <p className="text-slate-300">Creá tu cuenta en un minuto y empezá a intercambiar clases con tus compañeros.</p>
          <Link
            href="/auth?registro=1"
            className="inline-block px-8 py-3.5 rounded-2xl text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 transition"
          >
            Crear mi cuenta
          </Link>
        </div>
      </section>

      {/* Pie */}
      <footer className="bg-white border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
            <p className="text-xs text-slate-500">
              Armando Comunidad · Intercambio de conocimientos entre estudiantes de la FCE-UBA
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
            <Link href="/auth" className="hover:text-slate-900 transition">
              Ingresar
            </Link>
            <Link href="/auth?registro=1" className="hover:text-slate-900 transition">
              Crear cuenta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}