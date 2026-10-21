'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { validarFoto, subirAvatar, MAX_FOTO_MB } from '@/lib/avatar';

interface Profile {
  id: string;
  nombre: string;
  avatar_url: string;
  creditos?: number;
  carrera?: string;
}

const AVATAR_DEFAULT =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';

// Quien todavía tiene la foto genérica del registro debe subir la suya
const MARCA_FOTO_POR_DEFECTO = 'photo-1534528741775-53994a69daeb';

const navItems = [
  { name: 'Muro', href: '/dashboard' },
  { name: 'Calendario', href: '/dashboard/calendario' },
  { name: 'Chat', href: '/dashboard/chat' },
  { name: 'Historial', href: '/dashboard/historial' },
  { name: 'Mi Perfil', href: '/dashboard/perfil' },
];

function Icono({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONOS: Record<string, React.ReactNode> = {
  '/dashboard': (
    <Icono>
      <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V11z" />
    </Icono>
  ),
  '/dashboard/calendario': (
    <Icono>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Icono>
  ),
  '/dashboard/chat': (
    <Icono>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icono>
  ),
  '/dashboard/historial': (
    <Icono>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icono>
  ),
  '/dashboard/perfil': (
    <Icono>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Icono>
  ),
};

// ---------- Menú lateral (escritorio) ----------
function ItemNav({
  item,
  activo,
  noLeidos,
}: {
  item: { name: string; href: string };
  activo: boolean;
  noLeidos: number;
}) {
  const esChat = item.href === '/dashboard/chat';
  return (
    <Link
      href={item.href}
      className={`flex items-center justify-between px-5 py-3.5 rounded-2xl transition ${
        activo ? 'bg-slate-900 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span>{item.name}</span>
      {esChat && noLeidos > 0 && (
        <span className="bg-rose-500 text-white text-[10px] font-extrabold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
          {noLeidos > 99 ? '99+' : noLeidos}
        </span>
      )}
    </Link>
  );
}

// usePathname() vive solo en estos dos componentes, dentro de un Suspense
function MenuLateral({ noLeidos }: { noLeidos: number }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-2 text-sm font-semibold">
      {navItems.map((item) => (
        <ItemNav key={item.href} item={item} activo={pathname === item.href} noLeidos={noLeidos} />
      ))}
    </nav>
  );
}

function MenuLateralCarga({ noLeidos }: { noLeidos: number }) {
  return (
    <nav className="space-y-2 text-sm font-semibold">
      {navItems.map((item) => (
        <ItemNav key={item.href} item={item} activo={false} noLeidos={noLeidos} />
      ))}
    </nav>
  );
}

// ---------- Barra inferior (celular) ----------
function MenuInferior({ noLeidos }: { noLeidos: number }) {
  const pathname = usePathname();
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 grid grid-cols-5 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
      {navItems.map((item) => {
        const activo = pathname === item.href;
        const esChat = item.href === '/dashboard/chat';
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition ${
              activo ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            <span className="relative">
              {ICONOS[item.href]}
              {esChat && noLeidos > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                  {noLeidos > 99 ? '99+' : noLeidos}
                </span>
              )}
            </span>
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [noLeidos, setNoLeidos] = useState(0);
  const [busquedaInput, setBusquedaInput] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Profile[]>([]);
  const [buscando, setBuscando] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Foto obligatoria
  const [fotoNueva, setFotoNueva] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState('');

  const sinFoto =
    !!profile && (!profile.avatar_url || profile.avatar_url.includes(MARCA_FOTO_POR_DEFECTO));

  useEffect(() => {
    async function loadUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, nombre, avatar_url, creditos')
          .eq('id', user.id)
          .single();

        if (data) setProfile(data as Profile);
      }
    }
    loadUserProfile();

    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setResultadosBusqueda([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Saldo en vivo
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('saldo_' + profile.id)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` },
        (payload) => {
          setProfile((prev) => (prev ? { ...prev, ...(payload.new as Partial<Profile>) } : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Mensajes sin leer en vivo
  useEffect(() => {
    if (!profile?.id) return;
    const miId = profile.id;

    const contar = async () => {
      const { count } = await supabase
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .eq('destinatario_id', miId)
        .eq('leido', false);
      setNoLeidos(count ?? 0);
    };
    contar();

    const channel = supabase
      .channel('no_leidos_' + miId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mensajes', filter: `destinatario_id=eq.${miId}` },
        () => contar()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Aviso también en la pestaña del navegador
  useEffect(() => {
    document.title = noLeidos > 0 ? `(${noLeidos}) Armando Comunidad` : 'Armando Comunidad';
  }, [noLeidos]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setBusquedaInput(query);

    if (!query.trim()) {
      setResultadosBusqueda([]);
      setBuscando(false);
      return;
    }

    setBuscando(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, avatar_url, carrera')
      .ilike('nombre', '%' + query.trim() + '%')
      .limit(5);

    if (error) {
      console.error('Error al buscar estudiantes:', error.message);
    } else {
      setResultadosBusqueda(data || []);
    }
    setBuscando(false);
  };

  const handleSeleccionarUsuario = (id: string) => {
    setBusquedaInput('');
    setResultadosBusqueda([]);
    router.push('/dashboard/usuarios/' + id);
  };

  const handleBuscarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resultadosBusqueda.length > 0) {
      handleSeleccionarUsuario(resultadosBusqueda[0].id);
    }
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
    setFotoNueva(archivo);
    setFotoPreview(URL.createObjectURL(archivo));
  };

  const handleGuardarFotoObligatoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoNueva || !profile) return;

    setSubiendoFoto(true);
    setErrorFoto('');
    try {
      const url = await subirAvatar(fotoNueva, profile.id);
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
      if (error) throw new Error(error.message);

      setProfile({ ...profile, avatar_url: url });
      setFotoNueva(null);
      setFotoPreview(null);
    } catch (err: any) {
      setErrorFoto('No se pudo guardar la foto: ' + (err?.message ?? 'error desconocido'));
    } finally {
      setSubiendoFoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col sm:flex-row">
      {/* Sidebar lateral: solo en pantallas grandes */}
      <aside className="hidden sm:flex w-72 bg-white border-r border-slate-200/80 p-7 flex-col justify-between shrink-0 min-h-screen shadow-sm">
        <div className="space-y-8">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition">
            <img src="/logo.png" alt="Armando Comunidad" className="w-14 h-14 object-contain shrink-0" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block">
                FCE - UBA
              </span>
              <span className="text-xl font-black text-slate-900 tracking-tight block leading-tight">
                Armando Comunidad
              </span>
            </div>
          </Link>

          <Suspense fallback={<MenuLateralCarga noLeidos={noLeidos} />}>
            <MenuLateral noLeidos={noLeidos} />
          </Suspense>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full text-left px-5 py-3.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-700 transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3 sm:py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-sm z-30">
          {/* Logo (solo celular) */}
          <Link href="/dashboard" className="sm:hidden flex items-center gap-2 order-1">
            <img src="/logo.png" alt="Armando Comunidad" className="w-9 h-9 object-contain" />
            <span className="text-sm font-black text-slate-900 tracking-tight">Armando Comunidad</span>
          </Link>

          {/* Buscador con autocompletado */}
          <div className="w-full sm:w-80 relative order-3 sm:order-1" ref={searchRef}>
            <form onSubmit={handleBuscarSubmit}>
              <input
                type="text"
                value={busquedaInput}
                onChange={handleInputChange}
                placeholder="Buscar estudiante por nombre..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-slate-900 transition shadow-inner"
              />
            </form>

            {busquedaInput.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
                {buscando ? (
                  <div className="p-4 text-center text-xs text-slate-400">Buscando...</div>
                ) : resultadosBusqueda.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No se encontró ningún estudiante.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {resultadosBusqueda.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => handleSeleccionarUsuario(res.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition text-left"
                      >
                        <img
                          src={res.avatar_url || AVATAR_DEFAULT}
                          alt={res.nombre}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{res.nombre}</p>
                          <p className="text-[10px] text-slate-500">{res.carrera || 'Estudiante FCE'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0 order-2">
            <div className="bg-slate-100 border border-slate-200/80 px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Horas Disponibles:
              </span>
              <span className="sm:hidden text-xs">⏱️</span>
              <span className="text-sm font-black text-slate-900">{profile?.creditos ?? 0} Hs</span>
            </div>

            <Link href="/dashboard/perfil" className="flex items-center gap-3 hover:opacity-80 transition">
              <span className="text-xs font-bold text-slate-900 hidden sm:inline">
                {profile?.nombre || 'Mi Perfil'}
              </span>
              <img
                src={profile?.avatar_url || AVATAR_DEFAULT}
                alt="Foto de perfil"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-slate-200 shadow-sm"
              />
            </Link>

            <button
              onClick={handleLogout}
              className="sm:hidden text-[10px] font-bold text-slate-500 hover:text-red-700 transition"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-12 pb-24 sm:pb-12 flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Barra inferior: solo en celular */}
      <Suspense fallback={null}>
        <MenuInferior noLeidos={noLeidos} />
      </Suspense>

      {/* Foto de perfil obligatoria al primer ingreso */}
      {sinFoto && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl space-y-5">
            <div className="text-center space-y-2">
              <img src="/logo.png" alt="Armando Comunidad" className="w-16 h-16 object-contain mx-auto" />
              <h2 className="text-lg font-extrabold text-slate-900">Un último paso: tu foto de perfil</h2>
              <p className="text-xs text-slate-500">
                Es obligatoria, así tus compañeros saben con quién coordinan cada clase.
              </p>
            </div>

            {errorFoto && (
              <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                {errorFoto}
              </p>
            )}

            <form onSubmit={handleGuardarFotoObligatoria} className="space-y-5 text-xs">
              <div className="flex items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-300 text-2xl">📷</span>
                  )}
                </div>
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition">
                  {fotoNueva ? 'Elegir otra' : 'Elegir foto'}
                  <input type="file" accept="image/*" onChange={handleElegirFoto} className="hidden" />
                </label>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Imagen JPG, PNG o WEBP. Máximo {MAX_FOTO_MB} MB.
              </p>

              <button
                type="submit"
                disabled={!fotoNueva || subiendoFoto}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
              >
                {subiendoFoto ? 'Subiendo...' : 'Guardar y continuar'}
              </button>
            </form>

            <button
              onClick={handleLogout}
              className="w-full text-[11px] font-bold text-slate-400 hover:text-slate-600 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}