// ai-fallback.js V3.1 - Entiende humano sin regex dura
export function AIFallback(raw){
  if(!raw) return null;
  let t = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); // quita tildes
  
  const numerosTexto = {
    "cero":0,"uno":1,"dos":2,"tres":3,"cuatro":4,"cinco":5,"seis":6,"siete":7,"ocho":8,"nueve":9,"diez":10,
    "veinte":20,"treinta":30,"cuarenta":40,"cincuenta":50,"sesenta":60,"setenta":70,"ochenta":80,"noventa":90,
    "cien":100,"ciento":100,"doscientos":200,"trescientos":300,"cuatrocientos":400,"quinientos":500,
    "seiscientos":600,"setecientos":700,"ochocientos":800,"novecientos":900,"mil":1000
  };

  // 1. Traduce con bordes de palabra \b para no romper palabras
  let clean = t;
  for(let k in numerosTexto){
    clean = clean.replace(new RegExp(`\\b${k}\\b`,'g'), numerosTexto[k]);
  }

  // 2. Saca números con decimales con coma o punto
  let nums = [...clean.matchAll(/-?\d+(?:[.,]\d+)?/g)].map(m=>parseFloat(m[0].replace(',','.'))).filter(n=>!isNaN(n));
  if(nums.length === 0) return null;

  // 3. Inferencia por contexto, no por tamaño
  let total = null, base = 80, dosis = 5; // defaults de acuario

  // busca "para X kilos / litros / base"
  const mBase = clean.match(/(?:para|cada|por|en|base)\s*(\d+[.,]?\d*)/);
  const mTotal = clean.match(/(\d+[.,]?\d*)\s*(?:l|litros|total|tanque)/);
  const mDosis = clean.match(/(\d+[.,]?\d*)\s*(?:ml|miligramo|dosis)/);

  if(mTotal) total = parseFloat(mTotal[1].replace(',','.'));
  if(mBase) base = parseFloat(mBase[1].replace(',','.'));
  if(mDosis) dosis = parseFloat(mDosis[1].replace(',','.'));

  // fallback si no encontró con unidades: el más grande es volumen
  if(!total) total = Math.max(...nums);

  if(nums.length === 1) {
    // solo un número, asumimos que es total
    dosis = 5; base = 80;
  } else if(!mBase && !mDosis){
    // sin unidades, usa tu heurística pero sin chocar
    let resto = nums.filter(n=>n!==total);
    if(resto.length) base = Math.max(...resto);
    if(resto.length>1) dosis = Math.min(...resto);
  }

  const r = (total/base)*dosis;

  // 4. IMPORTANTE: Devuelve OBJETO, no string, así tu UI lo pinta
  return {
    result: `${r.toFixed(2)} ml`,
    intent: "dosis",
    domain: "aquarium/dosing.js",
    curated: true,
    explanation: `Entendí "${raw}" -> total=${total}L, base=${base}, dosis=${dosis}ml`,
    raw: `✅ CURADO por ai-fallback.js V3.1\n👉 ${r.toFixed(2)} ml`
  };
}