import './globals.css';

export const metadata = {
  title: 'Armando Comunidad',
  description: 'Plataforma de intercambio de tiempo FCE UBA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}