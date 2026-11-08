// nlu/entityExtractor.js V3.2 - Entiende palabras, decimales, miles y unidades
const NUMEROS_PALABRA = {
  "cero":0, "uno":1, "una":1, "dos":2, "tres":3, "cuatro":4, "cinco":5, "seis":6, "siete":7, "ocho":8, "nueve":9, "diez":10,
  "once":11, "doce":12, "trece":13, "catorce":14, "quince":15, "dieciseis":16, "diecisiete":17, "dieciocho":18, "diecinueve":19,
  "veinte":20, "veintiuno":21, "veintidos":22, "veintitres":23, "veinticuatro":24, "veinticinco":25, "veintiseis":26, "veintisiete":27, "veintiocho":28, "veintinueve":29,
  "treinta":30, "cuarenta":40, "cincuenta":50, "sesenta":60, "setenta":70, "ochenta":80, "noventa":90,
  "cien":100, "ciento":100, "doscientos":200, "trescientos":300, "cuatrocientos":400, "quinientos":500, "seiscientos":600, "setecientos":700, "ochocientos":800, "novecientos":900,
  "mil":1000
};

export function EntityExtractor(raw){
  let clean = String(raw||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"") // "doscientos" sin acentos
    .replace(/\s+/g,' ').trim();

  // 1. Convierte palabras a números ANTES de buscar con regex
  // "quinientos litros, cinco al" -> "500 litros, 5 al"
  // Usa bordes \b para no convertir "cinco" dentro de otra palabra
  for(let [palabra, valor] of Object.entries(NUMEROS_PALABRA)){
    clean = clean.replace(new RegExp(`\\b${palabra}\\b`, 'g'), String(valor));
  }
  // "dos cientos" -> "200" (caso compuesto)
  clean = clean.replace(/\b(\d+)\s+cientos\b/g, (m, n) => String(parseInt(n)*100));
  // "mil doscientos" -> "1200" simple: si hay "1000 200" juntos, súmalos
  clean = clean.replace(/\b1000\s+(\d+)\b/g, (m, n) => String(1000 + parseInt(n)));

  // 2. Busca números CON unidad: "500L", "500 litros", "5ml", "5 al", "3x4", "19,4"
  // Soporta decimal con coma "19,4" y miles con coma "1,500" y punto "1.500"
  const patron = /(-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?)\s*(litros?|litro|l|ml|miligramos?|miligramo|metros?|metro|m|al|a\/l|cm|kg|gr|g|piezas?|unidades?)?/g;
  let numbers = [];
  let numbersWithUnits = [];
  let m;

  while((m = patron.exec(clean)) !== null){
    let numStr = m[1];
    let unidad = (m[2] || "").toLowerCase();

    // 3. Distingue miles de decimal: "1,500" (3 dígitos después de coma) = 1500, "19,4" (1 dígito) = 19.4
    let valor;
    if(/^\d{1,3},\d{3}$/.test(numStr) || /^\d{1,3}\.\d{3}$/.test(numStr)){
      // Es miles: "1,500" -> 1500
      valor = parseFloat(numStr.replace(/[.,]/g,''));
    } else {
      // Es decimal: "19,4" -> 19.4, "19.4" -> 19.4
      valor = parseFloat(numStr.replace(',','.'));
    }
    if(!isFinite(valor)) continue;

    numbers.push(valor);
    numbersWithUnits.push({ valor, unidad: unidad || null, texto: m[0].trim(), indice: m.index });
  }

  // 4. Si no encontró con patrón con unidad, fallback al regex simple viejo
  if(numbers.length === 0){
    const fallback = [...clean.matchAll(/-?\d+(?:[.,]\d+)?/g)].map(x => parseFloat(x[0].replace(',','.'))).filter(isFinite);
    numbers = fallback;
    numbersWithUnits = fallback.map(v => ({ valor: v, unidad: null, texto: String(v), indice: -1 }));
  }

  // 5. Extra: detecta si hay "x" de pared, "/" de dosis, etc. para que los dominios no adivinen
  const tieneX = /x|por/.test(clean);
  const tieneSlash = /\//.test(clean);

  return {
    numbers, // [500, 5, 80] igual que antes, para no romper nada
    numbersWithUnits, // NUEVO: [{valor:500, unidad:"l"}, {valor:5, unidad:"ml"}, {valor:80, unidad:null}]
    raw,
    clean,
    tieneX,
    tieneSlash,
    // Helpers para que Dosing/Wall/Division ya no adivinen con rangos
    totalLitros: numbersWithUnits.find(n => n.unidad === "l" || n.unidad === "litro" || n.unidad === "litros")?.valor ?? null,
    dosisMl: numbersWithUnits.find(n => n.unidad === "ml" || n.unidad === "al" || n.unidad === "a/l")?.valor ?? null
  };
}