import Link from 'next/link';
import { PlayCircle, Clock, BookOpen, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="flex justify-between items-center p-6 bg-white shadow-sm">
        <div className="text-2xl font-bold text-blue-800 flex items-center gap-2">
          <Clock className="h-6 w-6"/>
          Armando Comunidad
        </div>
        <div className="gap-6 hidden md:flex font-medium text-gray-600">
          <Link className="hover:text-blue-800" href="/auth">Iniciar sesión</Link>
          <Link href="/auth">
            <button className="bg-blue-800 text-white px-5 py-2 rounded-full font-semibold hover:bg-blue-900 transition">
              Sumarme
            </button>
          </Link>
        </div>
      </nav>

      <header className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl font-extrabold mb-6 text-gray-900">
          Tu tiempo también es <span className="text-blue-600">una moneda.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
          Plataforma de Banco de Tiempo exclusiva para la FCE-UBA. Ofrecé ayuda académica y acumulá horas para recibir apoyo de otros estudiantes.
        </p>
        
        <div className="w-full max-w-3xl mx-auto bg-gray-200 rounded-2xl aspect-video flex flex-col items-center justify-center text-gray-500 shadow-md">
          <PlayCircle className="w-16 h-16 mb-2 text-blue-800"/>
          <p className="font-semibold text-gray-700">Video explicativo "Armando Comunidad"</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto my-12 p-6 border border-gray-200 bg-white rounded-2xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl">☕</div>
          <div>
            <h4 className="font-bold text-gray-800">Café de Especialidad FCE</h4>
            <p className="text-gray-500 text-sm">Un espacio para compartir también se disfruta con un buen café.</p>
          </div>
        </div>
        <button className="text-blue-800 font-semibold text-sm hover:underline">Conocer</button>
      </div>
    </div>
  );
}