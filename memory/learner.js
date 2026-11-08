// memory/memory.js V3.2 - Memoria que sí recuerda, que sí olvida lo malo y no rompe la página
const KEY = 'universal_memory_v2'; // v2 para no chocar con tu memoria vieja rota
const MAX_ENTRADAS = 200; // No dejes que crezca para siempre

function leerMemoriaSegura(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return {};
    const parsed = JSON.parse(raw);
    if(!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  }catch(e){
    // Si está corrupta, no rompas la página, empieza de cero
    try{ localStorage.removeItem(KEY); }catch(_){}
    return {};
  }
}

function guardarMemoriaSegura(mem){
  try{
    localStorage.setItem(KEY, JSON.stringify(mem));
  }catch(e){
    // Si está llena, borra las más viejas y vuelve a intentar
    try{
      const keys = Object.keys(mem).sort((a,b) => (mem[a].ultimoUso||0) - (mem[b].ultimoUso||0));
      for(let k of keys.slice(0, 50)) delete mem[k];
      localStorage.setItem(KEY, JSON.stringify(mem));
    }catch(_){ /* si ni así cabe, no rompas la página */ }
  }
}

// 1. Normaliza la llave: quita espacios de más, acentos, mayúsculas, y deja solo lo importante
export function normalizarLlave(raw){
  return String(raw||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"") // quita acentos
    .replace(/\s+/g,' ') // "  500l   5al" -> "500l 5al"
    .trim()
    .slice(0,80); // 80, no 20, para no pisar "500l 5al / 80" con "500l 5al / 80litros"
}

// 2. Guarda estrategia + RESULTADO + cuántas veces funcionó + cuándo
export function aprender(raw, estrategiaQueFunciono, resultadoBueno = null){
  const key = normalizarLlave(raw);
  if(!key) return;

  let mem = leerMemoriaSegura();
  const ahora = Date.now();
  const anterior = mem[key];

  mem[key] = {
    estrategia: estrategiaQueFunciono,
    resultado: typeof resultadoBueno === "string" ? resultadoBueno : (resultadoBueno?.resultado || resultadoBueno?.result || null),
    vecesQueFunciono: (anterior?.vecesQueFunciono || 0) + 1, // Si funcionó 5 veces, es de confianza
    ultimoUso: ahora,
    primerUso: anterior?.primerUso || ahora
  };

  // 3. Si hay más de 200, borra las más viejas y las que solo funcionaron 1 vez hace mucho
  const keys = Object.keys(mem);
  if(keys.length > MAX_ENTRADAS){
    keys.sort((a,b) => (mem[a].ultimoUso||0) - (mem[b].ultimoUso||0));
    for(let k of keys.slice(0, keys.length - MAX_ENTRADAS)) delete mem[k];
  }

  guardarMemoriaSegura(mem);
  console.log("🧠 Aprendí:", key, "->", estrategiaQueFunciono, "veces:", mem[key].vecesQueFunciono);
}

export function queAprendi(){
  return leerMemoriaSegura();
}

// 4. NUEVO: busca si ya aprendiste algo parecido, no solo exacto
export function buscarEnMemoria(raw){
  const mem = leerMemoriaSegura();
  const key = normalizarLlave(raw);
  if(mem[key]) return { ...mem[key], key, exacto: true };

  // Si no es exacto, busca por números: "500l 5al / 80" y "500l 5al / 80 porfa" comparten números
  const nums = String(raw||"").match(/\d+(?:[.,]\d+)?/g)?.join(',') || "";
  if(!nums) return null;

  for(let k of Object.keys(mem)){
    const numsK = k.match(/\d+(?:[.,]\d+)?/g)?.join(',') || "";
    if(numsK === nums && mem[k].vecesQueFunciono >= 2){
      return { ...mem[k], key: k, exacto: false };
    }
  }
  return null;
}

// 5. NUEVO: si una estrategia falló, bájale la confianza, no la dejes como buena para siempre
export function marcarComoMalo(raw){
  const key = normalizarLlave(raw);
  let mem = leerMemoriaSegura();
  if(mem[key]){
    mem[key].vecesQueFunciono = Math.max(0, (mem[key].vecesQueFunciono||1) - 1);
    if(mem[key].vecesQueFunciono === 0) delete mem[key];
    guardarMemoriaSegura(mem);
  }
}