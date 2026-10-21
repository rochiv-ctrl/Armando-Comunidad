// Materias de la FCE-UBA agrupadas como en el plan de estudios:
// 1 = CBC (ciclo general y comunes), después una sección por carrera.
// Una materia puede estar en varias secciones (por ejemplo "Negocios Internacionales").
// Para agregar o mover una materia, editá la lista de su sección.

// Para buscar sin importar tildes ni mayúsculas
export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export interface SeccionMaterias {
  id: string;
  nombre: string;
  materias: string[];
}

export const SECCIONES_MATERIAS: SeccionMaterias[] = [
  {
    id: 'cbc',
    nombre: 'CBC · Materias del ciclo general y comunes',
    materias: [
      'Análisis Matemático I',
      'Economía',
      'Álgebra',
      'Historia Económica y Social General',
      'Administración General',
      'Sociología de las Organizaciones',
      'Teoría Contable',
      'Estadística I',
      'Historia Económica y Social Argentina',
      'Microeconomía I',
      'Análisis Contable',
      'Instituciones de Gobierno y Economía Política',
      'Macroeconomía I',
      'Sistemas Administrativos',
      'Tecnología de la Información',
      'Cálculo Financiero',
      'Macroeconomía y Política Económica',
      'Administración Financiera',
    ],
  },
  {
    id: 'contador',
    nombre: 'Contador Público',
    materias: [
      'Sistemas Contables',
      'Sistemas de Costos',
      'Derecho del Trabajo y la Seguridad Social',
      'Auditoría',
      'Teoría y Técnica Impositiva I',
      'Teoría y Técnica Impositiva II',
      'Gestión y Costos para Contadores',
      'Contabilidad Social y Ambiental',
      'Contabilidad Financiera',
      'Derecho Económico',
      'Instituciones de Derecho Privado',
      'Derecho Crediticio, Bursátil e Insolvencia',
      'Contabilidad Gubernamental y Control de Gestión',
      'Negocios Internacionales',
      'Gestión Estratégica para la Transformación Social',
      'Oratoria',
      'Fintech, Pagos Digitales y Criptoactivos',
      'Analítica de Datos',
      'Contabilidad Financiera Superior',
      'Economía y Delito',
    ],
  },
  {
    id: 'administracion',
    nombre: 'Licenciatura en Administración',
    materias: [
      'Derecho Empresarial',
      'Gestión de Tecnologías Digitales',
      'Gestión de Costos',
      'Métodos Predictivos para la Gestión',
      'Administración de Operaciones',
      'Gestión del Talento',
      'Administración Tributaria',
      'Marketing',
      'Ciencias de la Decisión',
      'Planeamiento Estratégico',
      'Dirección',
      'Gestión de la Comunicación Política e Institucional',
      'Historia Económica – Institucional Argentina',
      'Gestión de Políticas Públicas',
      'Poder Económico y Derechos Humanos',
      'Administración Pública',
      'Creatividad',
      'Logística',
      'Gestión PyME',
      'Negocios Internacionales',
      'Dinámica Estratégica Empresarial',
      'Innovación',
      'Emprendedor 21',
      'Teoría de la Demanda',
      'Administración del Deporte',
      'Administración de la Educación',
      'Gestión Estratégica para la Transformación Social',
      'Perspectivas Globales para Sectores Estratégicos',
      'Administración del Turismo',
      'Administración de la Salud',
      'Gestión en la Economía Social',
      'Administración de la Cultura',
      'Comunicación',
      'Oratoria',
      'Estrategia',
      'Liderazgo Organizacional',
      'Negociación',
      'Calidad y Productividad',
      'Seminario Ética de las Ocupaciones',
      'Conducción de Equipos de Trabajo',
      'Psicología Organizacional',
      'Fintech, Pagos Digitales y Criptoactivos',
      'Gestión de Entornos Digitales en las Organizaciones',
      'Analítica de Datos',
      'Auditoría de Sistemas de Información',
      'Marketing Digital',
      'E Commerce',
      'Gestión de la Inteligencia Artificial',
      'Práctica Profesional',
    ],
  },
  {
    id: 'sistemas',
    nombre: 'Licenciatura en Sistemas de Información de las Organizaciones',
    materias: [
      'Gestión de Costos',
      'Tecnología de las Comunicaciones',
      'Metodología de los Sistemas de Información',
      'Lógica Simbólica y Fundamentos de la Decisión',
      'Seguridad Informática y Principios de Auditoría',
      'Sistemas de Datos',
      'Redes Informáticas',
      'Introducción a la Tecnología de la Información y las Comunicaciones',
      'Ingeniería de Software',
      'Derecho Informático I',
      'Derecho Informático II',
      'Ciencias de la Decisión',
      'Economía y Negocios Digitales',
      'Analítica de Datos',
      'Auditoría de Sistemas de Información',
      'Gestión de la Innovación y Tecnología Informática',
      'Fintech, Pagos Digitales y Criptoactivos',
      'Gestión de la Inteligencia Artificial',
    ],
  },
  {
    id: 'actuario',
    nombre: 'Actuario',
    materias: [
      'Matemática Financiera y Actuarial',
      'Análisis Estadístico II',
      'Instituciones de Derecho Privado',
      'Derecho Financiero, Seguros y Seguridad Social',
      'Macroeconomía II',
      'Matemática Aplicada I',
      'Matemática Aplicada II',
      'Microeconomía II',
      'Microeconomía para Economistas',
      'Econometría I',
      'Econometría II',
      'Epistemología e Historia del Pensamiento Económico',
      'Crecimiento Económico',
      'Organización Industrial',
      'Finanzas Públicas',
      'Economía Internacional',
      'Desarrollo Económico',
      'Demografía y Seguridad Social',
      'Poder Económico y Derechos Humanos',
      'Análisis Numérico Avanzado',
      'Elementos de Topología para Economía y Gestión',
      'Métodos Cuantitativos',
      'Teoría de los Juegos',
    ],
  },
  {
    id: 'tecnicatura',
    nombre: 'Tecnicatura Universitaria en Gestión y Análisis de Datos en Organizaciones',
    materias: [
      'Análisis Matemático',
      'Álgebra',
      'Trabajo y Sociedad',
      'Estadística',
      'Fundamentos de Sistemas de Información Digitales',
      'Laboratorio de Métodos Cuantitativos Aplicados a la Gestión',
    ],
  },
];

// Índice: nombre normalizado → ids de las secciones donde aparece
const INDICE = new Map<string, string[]>();
SECCIONES_MATERIAS.forEach((seccion) => {
  seccion.materias.forEach((materia) => {
    const clave = normalizar(materia);
    const previas = INDICE.get(clave) ?? [];
    if (!previas.includes(seccion.id)) INDICE.set(clave, [...previas, seccion.id]);
  });
});

// En qué secciones (CBC / carreras) está una materia. Vacío si es una materia escrita a mano.
export const seccionesDeMateria = (materia: string): string[] => INDICE.get(normalizar(materia)) ?? [];