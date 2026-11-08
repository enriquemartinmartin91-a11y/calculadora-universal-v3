// nlu/entityExtractor.js V4 - UNIVERSAL: numeros + verbos + operacion sugerida
const NUMEROS_PALABRA = {
  "cero":0, "uno":1, "una":1, "dos":2, "tres":3, "cuatro":4, "cinco":5, "seis":6, "siete":7, "ocho":8, "nueve":9, "diez":10,
  "once":11, "doce":12, "trece":13, "catorce":14, "quince":15, "dieciseis":16, "diecisiete":17, "dieciocho":18, "diecinueve":19,
  "veinte":20, "veintiuno":21, "veintidos":22, "veintitres":23, "veinticuatro":24, "veinticinco":25, "veintiseis":26, "veintisiete":27, "veintiocho":28, "veintinueve":29,
  "treinta":30, "cuarenta":40, "cincuenta":50, "sesenta":60, "setenta":70, "ochenta":80, "noventa":90,
  "cien":100, "ciento":100, "doscientos":200, "trescientos":300, "cuatrocientos":400, "quinientos":500, "seiscientos":600, "setecientos":700, "ochocientos":800, "novecientos":900,
  "mil":1000
};

// V4: Verbos universales - no nombres, no objetos. Solo la ACCION.
const VERBOS_RESTA = ["dar","da","dio","dieron","regala","regalar","regalo","pierde","perdio","perder","gasta","gasto","gastar","quita","quitar","quito","come","comio","comer","vende","vender","vendio","queda","quedan","restar","menos","falta"];
const VERBOS_SUMA = ["recibe","recibio","recibir","compra","compro","comprar","encuentra","encontro","encontrar","mas","sumar","total","juntos","agregar","anadio","anadir","le dan","le dieron","le dio"];
const VERBOS_DIVISION = ["reparte","repartir","repartio","dividir","divide","dividio","entre","cada uno","por persona","repartir"];
const VERBOS_MULTIPLICACION = ["cada","paquetes","paquete","cajas","caja","veces","multiplicar","multiplica","por"];

export function EntityExtractor(raw){
  let clean = String(raw||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g,' ').trim();

  for(let [palabra, valor] of Object.entries(NUMEROS_PALABRA)){
    clean = clean.replace(new RegExp(`\\b${palabra}\\b`, 'g'), String(valor));
  }
  clean = clean.replace(/\b(\d+)\s+cientos\b/g, (m, n) => String(parseInt(n)*100));
  clean = clean.replace(/\b1000\s+(\d+)\b/g, (m, n) => String(1000 + parseInt(n)));

  const patron = /(-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?)\s*(litros?|litro|l|ml|miligramos?|miligramo|metros?|metro|m|al|a\/l|cm|kg|gr|g|piezas?|unidades?)?/g;
  let numbers = [];
  let numbersWithUnits = [];
  let m;

  while((m = patron.exec(clean)) !== null){
    let numStr = m[1];
    let unidad = (m[2] || "").toLowerCase();
    let valor;
    if(/^\d{1,3},\d{3}$/.test(numStr) || /^\d{1,3}\.\d{3}$/.test(numStr)){
      valor = parseFloat(numStr.replace(/[.,]/g,''));
    } else {
      valor = parseFloat(numStr.replace(',','.'));
    }
    if(!isFinite(valor)) continue;
    numbers.push(valor);
    numbersWithUnits.push({ valor, unidad: unidad || null, texto: m[0].trim(), indice: m.index });
  }

  if(numbers.length === 0){
    const fallback = [...clean.matchAll(/-?\d+(?:[.,]\d+)?/g)].map(x => parseFloat(x[0].replace(',','.'))).filter(isFinite);
    numbers = fallback;
    numbersWithUnits = fallback.map(v => ({ valor: v, unidad: null, texto: String(v), indice: -1 }));
  }

  const tieneX = /x|por/.test(clean);
  const tieneSlash = /\//.test(clean);

  // === V4 UNIVERSAL: Detecta verbos y operacion, no nombres ===
  const encontrarVerbos = (lista) => lista.filter(v => new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`).test(clean));

  const verbosResta = encontrarVerbos(VERBOS_RESTA);
  const verbosSuma = encontrarVerbos(VERBOS_SUMA);
  const verbosDivision = encontrarVerbos(VERBOS_DIVISION);
  const verbosMulti = encontrarVerbos(VERBOS_MULTIPLICACION);

  // Detecta si es calculadora con simbolos: 5+8, 20-4, 4*5
  const esCalculadora = /-?\d+\s*[\+\-\*\/x]\s*-?\d+/.test(clean);
  let operadorCalculadora = null;
  if(esCalculadora){
    let opMatch = clean.match(/-?\d+\s*([\+\-\*\/x])\s*-?\d+/);
    if(opMatch) operadorCalculadora = opMatch[1];
  }

  // Sugerencia de operacion por prioridad: division > resta > suma > multiplicacion
  // Prioridad porque "reparte" es mas especifico que "cada"
  let operacionSugerida = null;
  let verbosDetectados = [];
  if(verbosDivision.length > 0){ operacionSugerida = "division"; verbosDetectados = verbosDivision; }
  else if(verbosResta.length > 0){ operacionSugerida = "resta"; verbosDetectados = verbosResta; }
  else if(verbosSuma.length > 0){ operacionSugerida = "suma"; verbosDetectados = verbosSuma; }
  else if(verbosMulti.length > 0){ operacionSugerida = "multiplicacion"; verbosDetectados = verbosMulti; }
  else if(esCalculadora){
    if(operadorCalculadora === "+") operacionSugerida = "suma";
    if(operadorCalculadora === "-") operacionSugerida = "resta";
    if(operadorCalculadora === "*" || operadorCalculadora === "x") operacionSugerida = "multiplicacion";
    if(operadorCalculadora === "/") operacionSugerida = "division";
  }

  // Es problema con palabras si tiene numeros + verbos, pero NO es solo calculadora ni dosis
  const esDosis = /\b(l|litro|litros|ml|dosis)\b/.test(clean);
  const esProblemaPalabras = !esDosis && numbers.length >= 2 && (verbosDetectados.length > 0 || /\b(cuanto|cuantos|cuantas|queda|quedan|sobra|total)\b/.test(clean));

  // Tipo de pregunta: cuanto queda, cuanto tiene, cuanto es
  let tipoPregunta = null;
  if(/\b(queda|quedan|sobra|sobran)\b/.test(clean)) tipoPregunta = "cuanto_queda";
  else if(/\b(total|en total|juntos|cuantos tiene|cuanto tiene)\b/.test(clean)) tipoPregunta = "cuanto_total";
  else if(/\b(cada uno|por persona|entre)\b/.test(clean)) tipoPregunta = "reparto";
  else if(/\b(cuanto|cuantos|cuantas)\b/.test(clean)) tipoPregunta = "cuanto";

  return {
    numbers,
    numbersWithUnits,
    raw,
    clean,
    tieneX,
    tieneSlash,
    totalLitros: numbersWithUnits.find(n => n.unidad === "l" || n.unidad === "litro" || n.unidad === "litros")?.valor ?? null,
    dosisMl: numbersWithUnits.find(n => n.unidad === "ml" || n.unidad === "al" || n.unidad === "a/l")?.valor ?? null,
    // === V4 UNIVERSAL ===
    verbos: verbosDetectados,
    verbosResta,
    verbosSuma,
    verbosDivision,
    verbosMultiplicacion: verbosMulti,
    operacionSugerida, // "resta" | "suma" | "division" | "multiplicacion" | null
    esCalculadora,
    operadorCalculadora, // "+" | "-" | "*" | "/" | null
    esProblemaPalabras,
    esDosis,
    tipoPregunta, // "cuanto_queda" | "cuanto_total" | "reparto" | "cuanto" | null
    // Helpers para que orchestrator no tenga que adivinar
    primerNumero: numbers[0] ?? null,
    segundoNumero: numbers[1] ?? null,
  };
}