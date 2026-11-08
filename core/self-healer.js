// healer/selfHealer.js V3.2 - Juez que sí revisa sentido + Curador por dominio

export function seEquivoco(resultado, raw, entities){
  // 1. Acepta texto u objeto, siempre lo convierte a texto para juzgar
  if(resultado == null) return true;
  const txt = typeof resultado === "string" ? resultado : (resultado.resultado || resultado.result || resultado.mensaje || JSON.stringify(resultado));
  if(!txt || String(txt).trim() === "") return true;

  const t = String(txt).toLowerCase();

  // 2. Errores técnicos reales - con bordes, no con includes suelto
  if(/\b(nan|undefined|null)\b/.test(t)) return true;
  if(/\b(infinity|-infinity)\b/.test(t)) return true;
  if(/division (por|entre) cero/.test(t)) return true;

  // 3. SOLO marca como fallo si EMPIEZA con "no entendí", no si lo menciona para explicar
  // Antes: "Detecté: 500L" lo marcabas como fallo, ahora ya no.
  if(/^\s*(no entendí|no pude|escribe:|no sé)/.test(t)) return true;

  // 4. Regla de oro MEJORADA: si dio números, la respuesta debe tener número Y unidad con sentido
  if(entities?.numbers?.length > 0){
    if(!/\d/.test(t)) return true;
  }

  // 5. NUEVO: Revisa absurdos. Si el input era acuario y te da > 5000ml de dosis, está mal
  const numsEnRespuesta = [...t.matchAll(/-?\d+(?:[.,]\d+)?/g)].map(m => parseFloat(m[0].replace(',','.')));
  // Si pediste dosis y te responde 99999ml, es error, no éxito
  if(/ml/.test(t) && numsEnRespuesta.some(n => n > 10000)) return true;
  // Si pediste litros y te responde negativo, es error
  if(/l\b|litro/.test(t) && numsEnRespuesta.some(n => n < 0)) return true;

  return false;
}

// Curador por dominio, no solo acuario
export function autoReintento(raw, entities, intent = ""){
  let nums = entities?.numbers || [];
  if(nums.length < 2) return { curado: false };

  const lowIntent = String(intent||"").toLowerCase();
  const esAcuario = lowIntent.includes("dosis") || lowIntent.includes("acuario") || /l\b|litro|acuario|pecera/.test(raw.toLowerCase());

  // Si NO es acuario, no inventes dosis. Deja que lo cure el AI-Fallback
  if(!esAcuario) return { curado: false, motivo: "no-es-acuario, pasa a AI" };

  // 6. NO ordenes a lo loco. Usa unidades si las tienes, si no, usa orden de aparición
  // entities.numbersWithUnits sería ideal, pero si no lo tienes, usa el orden original
  // Ej: "500L 5al / 80" -> nums en orden = [500, 5, 80] -> total=500, dosis=5, base=80
  let total = null, dosis = null, base = null;

  // Intenta sacar por posición con contexto: total suele ser el primero con L, base el que va después de "/"
  const mTotal = raw.match(/(\d+[.,]?\d*)\s*(?:l|litro)/i);
  const mBase = raw.match(/\/\s*(\d+[.,]?\d*)/) || raw.match(/cada\s*(\d+[.,]?\d*)/i);
  const mDosis = raw.match(/(\d+[.,]?\d*)\s*(?:ml|a\/l|al\b)/i);

  if(mTotal) total = parseFloat(mTotal[1].replace(',','.'));
  if(mBase) base = parseFloat(mBase[1].replace(',','.'));
  if(mDosis) dosis = parseFloat(mDosis[1].replace(',','.'));

  // Fallback solo si faltan: usa el orden, NO el sort
  if(total == null) total = nums[0];
  if(base == null) base = nums.length >= 3 ? nums[2] : 80;
  if(dosis == null) dosis = nums.length >= 2 ? nums[1] : 5;

  // 7. Validación con rango real, no mágico: permite acuarios nano de 5L y dosis grandes con aviso
  if(total < 1 || total > 10000) return { curado: false };
  if(base <= 0 || base > 1000) return { curado: false };
  if(dosis <= 0 || dosis > 500) return { curado: false };

  let r = (total / base) * dosis;
  if(!isFinite(r) || isNaN(r)) return { curado: false };

  const texto = `${r.toFixed(2)} ml`;

  return {
    curado: true,
    // OJO: Devuelve TEXTO normalizado, igual que los demás. El texto bonito lo hace index.html
    resultado: texto,
    result: texto,
    estrategia: "B-numeros-con-unidades",
    detalle: { total, base, dosis, valor: Number(r.toFixed(2)), unidad: "ml" },
    mensaje: `AUTO-CURADO Estrategia B: ${total}L | ${dosis}ml per ${base}L`
  };
}