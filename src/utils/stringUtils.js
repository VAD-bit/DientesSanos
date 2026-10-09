/**
 * stringUtils.js
 * Utilidades para procesamiento de texto, capitalización inteligente y búsquedas sin acentos.
 */

// Diccionario de los nombres y apellidos hispanos más comunes que llevan tilde.
const ACCENT_DICT = {
  // Nombres comunes
  "jose": "José",
  "maria": "María",
  "jesus": "Jesús",
  "hector": "Héctor",
  "victor": "Víctor",
  "ramon": "Ramón",
  "raul": "Raúl",
  "angel": "Ángel",
  "joaquin": "Joaquín",
  "andres": "Andrés",
  "tomas": "Tomás",
  "martin": "Martín",
  "nicolas": "Nicolás",
  "sebastian": "Sebastián",
  "julian": "Julián",
  "ruben": "Rubén",
  "cesar": "César",
  "oscar": "Óscar",
  "ivan": "Iván",
  "simon": "Simón",
  "matias": "Matías",
  "lucia": "Lucía",
  "sofia": "Sofía",
  "belen": "Belén",
  "ines": "Inés",
  "noemi": "Noemí",
  "arantxa": "Arantxa",
  
  // Apellidos comunes
  "perez": "Pérez",
  "gomez": "Gómez",
  "rodriguez": "Rodríguez",
  "garcia": "Garcia",
  "fernandez": "Fernández",
  "gonzalez": "González",
  "lopez": "López",
  "martinez": "Martínez",
  "sanchez": "Sánchez",
  "ramirez": "Ramírez",
  "ruiz": "Ruiz",
  "diaz": "Díaz",
  "alvarez": "Alvarez",
  "romero": "Romero",
  "suarez": "Suárez",
  "gutierrez": "Gutiérrez",
  "marquez": "Márquez",
  "navarro": "Navarro",
  "dominguez": "Domínguez",
  "vazquez": "Vázquez",
  "ramos": "Ramos",
  "gil": "Gil",
  "ortiz": "Ortiz",
  "gimenez": "Giménez",
  "cruz": "Cruz",
  "cortes": "Cortés",
  "nunez": "Núñez",
  "mendez": "Méndez",
  "chavez": "Chávez",
  "rios": "Ríos"
};

/**
 * Normaliza un string para búsqueda: lo pasa a minúsculas y le quita todos los acentos.
 * @param {string} str Texto original
 * @returns {string} Texto normalizado
 */
export const normalizeForSearch = (str) => {
  if (!str) return "";
  return str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * Formatea un nombre completo:
 * 1. Pone en mayúscula la primera letra de cada palabra.
 * 2. Si la palabra está en nuestro diccionario de acentos comunes, le añade el acento.
 * @param {string} fullName Nombre completo introducido por el usuario
 * @returns {string} Nombre formateado perfectamente
 */
export const formatName = (fullName) => {
  if (!fullName) return "";
  
  // Guardar espacios al final del string para que el usuario pueda escribir espacios en tiempo real
  const trailingSpaces = fullName.match(/\s+$/);
  const suffix = trailingSpaces ? trailingSpaces[0] : '';
  
  const words = fullName.trim().toLowerCase().split(/\s+/);
  if (words.length === 1 && words[0] === "") return suffix;
  
  const formattedWords = words.map(word => {
    // Si la palabra está en nuestro diccionario, usamos la versión con tilde
    const cleanWord = normalizeForSearch(word); // quitamos tilde por si la pusieron mal
    if (ACCENT_DICT[cleanWord]) {
      word = ACCENT_DICT[cleanWord];
    }
    
    // Capitalizar la primera letra
    if (word.length > 0) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  });
  
  return formattedWords.join(' ') + suffix;
};

/**
 * Formatea nombres de productos y aplica correcciones de marcas y acentos
 */
export const formatProductName = (name) => {
  if (!name) return "";
  const trailingSpaces = name.match(/\s+$/);
  const suffix = trailingSpaces ? trailingSpaces[0] : '';
  
  let formatted = name.toLowerCase().trim().replace(/\s+/g, ' ');

  const corrections = {
    'cafe': 'café',
    'te': 'té',
    'mani': 'maní',
    'maracuya': 'maracuyá',
    'limon': 'limón',
    'fresa': 'fresa',
    'machiato': 'macchiato',
    'capuchino': 'capuccino',
    'coca cola': 'Coca-Cola',
    'pepsi cola': 'Pepsi',
    'pepsi': 'Pepsi',
    'solera': 'Solera',
    'polar light': 'Polar Light',
    'polar pilsen': 'Polar Pilsen',
    'gatorade': 'Gatorade',
    'lipton': 'Lipton',
    'malta': 'Malta'
  };

  for (const [key, value] of Object.entries(corrections)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    formatted = formatted.replace(regex, value);
  }

  formatted = formatted.split(' ').map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '').join(' ');
  return formatted + suffix;
};

/**
 * Formatea nombres de servicios y aplica correcciones ortográficas de barbería/salón
 */
export const formatServiceName = (name) => {
  if (!name) return "";
  const trailingSpaces = name.match(/\s+$/);
  const suffix = trailingSpaces ? trailingSpaces[0] : '';
  
  let formatted = name.toLowerCase().trim().replace(/\s+/g, ' ');

  const corrections = {
    'corte': 'Corte',
    'barba': 'Barba',
    'cejas': 'Cejas',
    'cerquillo': 'Cerquillo',
    'keratina': 'Keratina',
    'cirugia': 'Cirugía',
    'capilar': 'Capilar',
    'balayage': 'Balayage',
    'mechas': 'Mechas',
    'tinte': 'Tinte',
    'pigmentacion': 'Pigmentación',
    'exfoliacion': 'Exfoliación',
    'hidratacion': 'Hidratación',
    'spa': 'Spa',
    'depilacion': 'Depilación',
    'limpieza': 'Limpieza',
    'facial': 'Facial',
    'masaje': 'Masaje',
    'manicure': 'Manicure',
    'pedicure': 'Pedicure',
    'vip': 'VIP'
  };

  for (const [key, value] of Object.entries(corrections)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    formatted = formatted.replace(regex, value);
  }

  // Capitalizar el resto
  formatted = formatted.split(' ').map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '').join(' ');
  // Asegurarnos que VIP se quede en mayúscula siempre
  formatted = formatted.replace(/\bVip\b/g, 'VIP');
  
  return formatted + suffix;
};

export default {
  normalizeForSearch,
  formatName,
  formatProductName,
  formatServiceName
};
