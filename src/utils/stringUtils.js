/**
 * stringUtils.js
 * Utilidades para procesamiento de texto, capitalizaciÃ³n inteligente y bÃºsquedas sin acentos.
 */

// Diccionario de los nombres y apellidos hispanos mÃ¡s comunes que llevan tilde.
const ACCENT_DICT = {
  // Nombres comunes
  "jose": "JosÃ©",
  "maria": "MarÃ­a",
  "jesus": "JesÃºs",
  "hector": "HÃ©ctor",
  "victor": "VÃ­ctor",
  "ramon": "RamÃ³n",
  "raul": "RaÃºl",
  "angel": "Ãngel",
  "joaquin": "JoaquÃ­n",
  "andres": "AndrÃ©s",
  "tomas": "TomÃ¡s",
  "martin": "MartÃ­n",
  "nicolas": "NicolÃ¡s",
  "sebastian": "SebastiÃ¡n",
  "julian": "JuliÃ¡n",
  "ruben": "RubÃ©n",
  "cesar": "CÃ©sar",
  "oscar": "Ã“scar",
  "ivan": "IvÃ¡n",
  "simon": "SimÃ³n",
  "matias": "MatÃ­as",
  "lucia": "LucÃ­a",
  "sofia": "SofÃ­a",
  "belen": "BelÃ©n",
  "ines": "InÃ©s",
  "noemi": "NoemÃ­",
  "arantxa": "Arantxa",
  
  // Apellidos comunes
  "perez": "PÃ©rez",
  "gomez": "GÃ³mez",
  "rodriguez": "RodrÃ­guez",
  "garcia": "Garcia",
  "fernandez": "FernÃ¡ndez",
  "gonzalez": "GonzÃ¡lez",
  "lopez": "LÃ³pez",
  "martinez": "MartÃ­nez",
  "sanchez": "SÃ¡nchez",
  "ramirez": "RamÃ­rez",
  "ruiz": "Ruiz",
  "diaz": "DÃ­az",
  "alvarez": "Alvarez",
  "romero": "Romero",
  "suarez": "SuÃ¡rez",
  "gutierrez": "GutiÃ©rrez",
  "marquez": "MÃ¡rquez",
  "navarro": "Navarro",
  "dominguez": "DomÃ­nguez",
  "vazquez": "VÃ¡zquez",
  "ramos": "Ramos",
  "gil": "Gil",
  "ortiz": "Ortiz",
  "gimenez": "GimÃ©nez",
  "cruz": "Cruz",
  "cortes": "CortÃ©s",
  "nunez": "NÃºÃ±ez",
  "mendez": "MÃ©ndez",
  "chavez": "ChÃ¡vez",
  "rios": "RÃ­os"
};

/**
 * Normaliza un string para bÃºsqueda: lo pasa a minÃºsculas y le quita todos los acentos.
 * @param {string} str Texto original
 * @returns {string} Texto normalizado
 */
export const normalizeForSearch = (str) => {
  if (!str) return "";
  return str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * Formatea un nombre completo:
 * 1. Pone en mayÃºscula la primera letra de cada palabra.
 * 2. Si la palabra estÃ¡ en nuestro diccionario de acentos comunes, le aÃ±ade el acento.
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
    // Si la palabra estÃ¡ en nuestro diccionario, usamos la versiÃ³n con tilde
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
    'cafe': 'cafÃ©',
    'te': 'tÃ©',
    'mani': 'manÃ­',
    'maracuya': 'maracuyÃ¡',
    'limon': 'limÃ³n',
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
 * Formatea nombres de servicios y aplica correcciones ortogrÃ¡ficas de barberÃ­a/salÃ³n
 */
export const formatServiceName = (name) => {
  if (!name) return "";
  const trailingSpaces = name.match(/\s+$/);
  const suffix = trailingSpaces ? trailingSpaces[0] : '';
  
  let formatted = name.toLowerCase().trim().replace(/\s+/g, ' ');

  const corrections = {
    'empaste': 'Empaste',
    'muela': 'Muela',
    'encÃ­as': 'EncÃ­as',
    'cerquillo': 'Cerquillo',
    'cirugia': 'CirugÃ­a',
    'fluor': 'Fluor',
    'blanqueamiento': 'Blanqueamiento',
    'obturacion': 'ObturaciÃ³n',
    'endodoncia': 'Endodoncia',
    'tinte': 'Blanqueamiento',
    'pigmentacion': 'PigmentaciÃ³n',
    'exfoliacion': 'ExfoliaciÃ³n',
    'hidratacion': 'HidrataciÃ³n',
    'spa': 'Spa',
    'depilacion': 'DepilaciÃ³n',
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
  // Asegurarnos que VIP se quede en mayÃºscula siempre
  formatted = formatted.replace(/\bVip\b/g, 'VIP');
  
  return formatted + suffix;
};

export default {
  normalizeForSearch,
  formatName,
  formatProductName,
  formatServiceName
};

