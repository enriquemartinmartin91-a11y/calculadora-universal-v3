// memory/memory.js V4 - Memoria UNIVERSAL: recuerda PATRONES, no nombres
const KEY = 'universal_memory_v3'; // v3 para V4, no choca con tu memoria vieja
const MAX_ENTRADAS = 200;

function leerMemoriaSegura(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return {};
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  }catch(e){
    try{ localStorage.removeItem(KEY); }catch(_){}
    return {};
  }
}

function guardarMemoriaSegura(mem){
  try{
    localStorage.setItem(KEY, JSON.stringify(mem));
  }catch(e){
    try{
      const keys = Object.keys(mem).sort((a,b) => (mem[a].ultimoUso||0) - (mem[b].ultimoUso||0));
      for(let k of keys.slice(0, 50)) delete mem[k];
      localStorage.setItem(KEY, JSON.stringify(mem));
    }catch(_){}
  }
}

export function normalizarLlave(raw){
  return String(raw||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,80);
}

// === V4 NUEVO: Convierte cualquier problema en su PATRON universal ===
// "pepito tiene 5 manzanas y da 3 a juan" -> "tiene # y da #"
// "maria tiene 10 pesos y gasta 4" -> "tiene # y gasta #"
// Así ambos comparten que son resta, aunque cambie nombre y objeto
export function normalizarPatron(raw){
  let t = normalizarLlave(raw);
  // Quita numeros -> #
  t = t.replace(/\d+(?:[.,]\d+)?/g, "#");
  // Quita nombres propios comunes y objetos? No los borramos todos,
  // solo nos quedamos con los VERBOS que importan para el patron
  // Detectamos el verbo clave y lo dejamos como patron principal
  let verbo = "otro";
  if(/\b(dar|da|dio|regala|regalar|pierde|perdio|gasta|gasto|quita|come|vende|queda|quedan)\b/.test(t)) verbo = "resta";
  else if(/\b(reparte|repartir|dividir|divide|entre|cada uno)\b/.test(t)) verbo = "division";
  else if(/\b(le dan|recibe|compra|encuentra|mas|total|juntos|sumar)\b/.test(t)) verbo = "suma";
  else if(/\b(cada|paquetes?|cajas?|veces|multiplicar)\b/.test(t)) verbo = "multiplicacion";
  else if(/[\d#]\s*[\+\-\*\/x]\s*[\d#]/.test(t)) verbo = "calculadora";
  else if(/\b(l|litro|ml|dosis)\b/.test(t)) verbo = "dosis";

  // Patron = verbo + cantidad de numeros + tiene estructura de pregunta
  let countNums = (String(raw||"").match(/\d+(?:[.,]\d+)?/g) || []).length;
  return `${verbo}|nums:${countNums}|${t.slice(0,60)}`;
}

export function aprender(raw, estrategiaQueFunciono, resultadoBueno = null){
  const key = normalizarLlave(raw);
  if(!key) return;

  let mem = leerMemoriaSegura();
  const ahora = Date.now();
  const anterior = mem[key];
  const patron = normalizarPatron(raw);

  mem[key] = {
    estrategia: estrategiaQueFunciono,
    resultado: typeof resultadoBueno === "string" ? resultadoBueno : (resultadoBueno?.resultado || resultadoBueno?.result || null),
    patron, // V4: guardamos tambien el patron
    vecesQueFunciono: (anterior?.vecesQueFunciono || 0) + 1,
    ultimoUso: ahora,
    primerUso: anterior?.primerUso || ahora
  };

  // V4: Tambien guarda el PATRON como entrada aparte, para que sirva para otros nombres
  // Ej: Si aprendió "pepito... da 3", el patron "resta" queda con 1 punto de confianza
  const patronKey = `PATRON:${patron}`;
  const anteriorPatron = mem[patronKey];
  mem[patronKey] = {
    estrategia: estrategiaQueFunciono,
    resultado: null, // el patron no guarda resultado exacto, solo estrategia
    patron,
    esPatron: true,
    vecesQueFunciono: (anteriorPatron?.vecesQueFunciono || 0) + 1,
    ultimoUso: ahora,
    primerUso: anteriorPatron?.primerUso || ahora
  };

  const keys = Object.keys(mem);
  if(keys.length > MAX_ENTRADAS){
    keys.sort((a,b) => (mem[a].ultimoUso||0) - (mem[b].ultimoUso||0));
    for(let k of keys.slice(0, keys.length - MAX_ENTRADAS)) delete mem[k];
  }

  guardarMemoriaSegura(mem);
  console.log("🧠 Aprendí:", key, "->", estrategiaQueFunciono, "patron:", patron, "veces:", mem[key].vecesQueFunciono);
}

export function queAprendi(){
  return leerMemoriaSegura();
}

// V4: Busca exacto -> luego por numeros -> luego por PATRON universal
export function buscarEnMemoria(raw){
  const mem = leerMemoriaSegura();
  const key = normalizarLlave(raw);
  if(mem[key]) return { ...mem[key], key, exacto: true };

  // 1. Por numeros (como V3.2)
  const nums = String(raw||"").match(/\d+(?:[.,]\d+)?/g)?.join(',') || "";
  if(nums){
    for(let k of Object.keys(mem)){
      if(k.startsWith("PATRON:")) continue;
      const numsK = k.match(/\d+(?:[.,]\d+)?/g)?.join(',') || "";
      if(numsK === nums && mem[k].vecesQueFunciono >= 2){
        return { ...mem[k], key: k, exacto: false };
      }
    }
  }

  // 2. V4 NUEVO: Por PATRON universal
  // "maria tiene 10 y gasta 4" encuentra el patron "resta" que aprendió con Pepito
  const patron = normalizarPatron(raw);
  const patronKey = `PATRON:${patron}`;
  if(mem[patronKey] && mem[patronKey].vecesQueFunciono >= 1){
    return { ...mem[patronKey], key: patronKey, exacto: false, porPatron: true, patron };
  }

  // 3. V4: Busca patron parecido aunque no sea identico (mismo verbo, misma cantidad de numeros)
  // Ej: "tiene # y da #" vs "tiene # y gasta #" ambos son resta con 2 numeros
  let verbo = patron.split("|")[0];
  let countNums = (String(raw||"").match(/\d+(?:[.,]\d+)?/g) || []).length;
  for(let k of Object.keys(mem)){
    if(!k.startsWith("PATRON:")) continue;
    let p = mem[k].patron || "";
    if(p.startsWith(verbo + "|") && p.includes(`nums:${countNums}`) && mem[k].vecesQueFunciono >= 1){
      return { ...mem[k], key: k, exacto: false, porPatron: true, patron: p };
    }
  }

  return null;
}

export function marcarComoMalo(raw){
  const key = normalizarLlave(raw);
  let mem = leerMemoriaSegura();
  if(mem[key]){
    mem[key].vecesQueFunciono = Math.max(0, (mem[key].vecesQueFunciono||1) - 1);
    if(mem[key].vecesQueFunciono === 0) delete mem[key];
    guardarMemoriaSegura(mem);
  }
  // V4: Tambien baja confianza del patron si falló mucho
  const patronKey = `PATRON:${normalizarPatron(raw)}`;
  if(mem[patronKey]){
    mem[patronKey].vecesQueFunciono = Math.max(0, (mem[patronKey].vecesQueFunciono||1) - 1);
    if(mem[patronKey].vecesQueFunciono === 0) delete mem[patronKey];
    guardarMemoriaSegura(mem);
  }
}