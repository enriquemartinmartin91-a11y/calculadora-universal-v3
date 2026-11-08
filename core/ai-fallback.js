// ai-fallback.js V3.2 - contrato unificado + números compuestos
export function AIFallback(raw){
  if(!raw || !raw.trim()) return null;
  let t = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

  const baseNums = {
    "cero":0,"uno":1,"dos":2,"tres":3,"cuatro":4,"cinco":5,"seis":6,"siete":7,"ocho":8,"nueve":9,"diez":10,
    "once":11,"doce":12,"trece":13,"catorce":14,"quince":15,"dieciseis":16,"diecisiete":17,"dieciocho":18,"diecinueve":19,
    "veinte":20,"treinta":30,"cuarenta":40,"cincuenta":50,"sesenta":60,"setenta":70,"ochenta":80,"noventa":90,
    "cien":100,"ciento":100,"doscientos":200,"trescientos":300,"cuatrocientos":400,"quinientos":500,
    "seiscientos":600,"setecientos":700,"ochocientos":800,"novecientos":900,"mil":1000,
    "medio":0.5, "cuarto":0.25
  };

  // 1. Une compuestos: "quinientos veinte" -> 520, "veinte y cinco" -> 25
  // Primero convierte "mil doscientos" y "ciento veinte" sumando
  let clean = t;
  // "X y Y" para decenas: veinte y cinco = 25
  clean = clean.replace(/\b(veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g, (_,d,u) => String(baseNums[d]+baseNums[u]));
  // "quinientos veinte" = 500 + 20
  clean = clean.replace(/\b(doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|ciento|cien)\s+(veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g, (_,c,u) => String(baseNums[c]+baseNums[u]));
  // "mil doscientos" = 1000 + 200
  clean = clean.replace(/\bmil\s+(doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|ciento|cien|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\b/g, (_,c) => String(1000+baseNums[c]));

  for(let k in baseNums){
    if(k==="medio"||k==="cuarto") continue; // se manejan aparte
    clean = clean.replace(new RegExp(`\\b${k}\\b`,'g'), baseNums[k]);
  }
  // "dos punto cinco" y "dos coma cinco"
  clean = clean.replace(/(\d+)\s+(?:punto|coma)\s+(\d+)/g, "$1.$2");

  let nums = [...clean.matchAll(/-?\d+(?:[.,]\d+)?/g)].map(m=>parseFloat(m[0].replace(',','.'))).filter(n=>!isNaN(n));
  if(nums.length === 0) return null;

  // 2. Extrae con UNIDADES, no con Math.max. Así no se confunde
  // Soporta: 500L, 500 litros, 500l, 5ml, 5al, 5 a/l, 5 por litro
  const mTotal = clean.match(/(\d+[.,]?\d*)\s*(?:l|litro|litros|lt)\b/);
  const mDosis = clean.match(/(\d+[.,]?\d*)\s*(?:ml|miligramo|miligramos|dosis|a\/l|al)\b/) 
              || clean.match(/(\d+[.,]?\d*)\s*(?:por|para|cada)\s*(?:litro|l)\b/);
  // Base: solo si dice "cada 80", "por cada 80", "base 80", "en 80"
  const mBase = clean.match(/(?:cada|base|en)\s*(\d+[.,]?\d*)/) 
             || clean.match(/\/\s*(\d+[.,]?\d*)/); // el "/ 80" de tu ejemplo

  let total = mTotal ? parseFloat(mTotal[1].replace(',','.')) : null;
  let dosis = mDosis ? parseFloat(mDosis[1].replace(',','.')) : null;
  let base = mBase ? parseFloat(mBase[1].replace(',','.')) : 80;

  // 3. Fallback con orden, no con Math.max: primer número = total si no hay unidad
  if(total === null) total = nums[0];
  if(dosis === null) {
    // si hay 3 números y ya usamos total y base, el que sobra es dosis
    const resto = nums.filter(n => n !== total && n !== base);
    dosis = resto.length ? resto[0] : 5;
  }

  const r = (total / base) * dosis;

  // 4. CONTRATO UNIFICADO: devuelve resultado + log como espera index.html
  const texto = `${r.toFixed(2)} ml`;
  return {
    resultado: texto,
    result: texto, // por compatibilidad
    intent: "dosis",
    entities: { total, base, dosis },
    domain: "aquarium/dosing.js",
    curated: true,
    log: `✅ CURADO por ai-fallback.js V3.2\n👉 ${texto} | total=${total}L, base=${base}, dosis=${dosis}ml`,
    explanation: `Entendí "${raw}" -> total=${total}L, base=${base}, dosis=${dosis}ml`,
    raw: `✅ CURADO por ai-fallback.js V3.2\n👉 ${texto}`
  };
}