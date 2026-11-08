// healer/selfHealer.js V4 - Juez universal + Curador universal
export function seEquivoco(resultado, raw, entities){
  if(resultado == null) return true;
  const txt = typeof resultado === "string" ? resultado : (resultado.resultado || resultado.result || resultado.mensaje || JSON.stringify(resultado));
  if(!txt || String(txt).trim() === "") return true;

  const t = String(txt).toLowerCase();

  // 1. Errores técnicos reales
  if(/\b(nan|undefined|null)\b/.test(t)) return true;
  if(/\b(infinity|-infinity)\b/.test(t)) return true;
  if(/division (por|entre) cero/.test(t)) return true;

  // 2. SOLO marca como fallo si EMPIEZA con "no entendí"
  if(/^\s*(no entendí|no pude|escribe:|no sé)/.test(t)) return true;

  // 3. Si dio números, la respuesta debe tener número
  if(entities?.numbers?.length > 0){
    if(!/\d/.test(t)) return true;
  }

  // 4. Revisa absurdos SOLO para acuario
  const numsEnRespuesta = [...t.matchAll(/-?\d+(?:[.,]\d+)?/g)].map(m => parseFloat(m[0].replace(',','.')));
  const esAcuario = /ml|l\b|litro|acuario|pecera|dosis/.test(String(raw||"").toLowerCase());
  if(esAcuario){
    if(/ml/.test(t) && numsEnRespuesta.some(n => n > 10000)) return true;
    if(/l\b|litro/.test(t) && numsEnRespuesta.some(n => n < 0)) return true;
  }

  // 5. V4 UNIVERSAL: Si es problema universal, revisa que el resultado no sea absurdo
  // Ej: Si tenia 5 y dio 3, no puede quedarle 5000
  // No somos estrictos, solo evitamos locuras
  if(!esAcuario && numsEnRespuesta.length > 0){
    // Si el resultado es negativo cuando no debería (ej: manzanas que quedan = -5) y el input no tenia negativo, es sospechoso
    // Pero lo dejamos pasar si es calculadora normal, porque 5-8 = -3 si es valido
    // Solo marcamos si es infinito o NaN, que ya revisamos arriba
  }

  return false;
}

// Curador UNIVERSAL, no solo acuario
export function autoReintento(raw, entities, intent = ""){
  let nums = entities?.numbers || [];
  // V4: Para calculadora y problemas universales necesitamos minimo 2 numeros
  // Pero para acuario tambien
  if(nums.length < 2) return { curado: false };

  const lowRaw = String(raw||"").toLowerCase();
  const lowIntent = String(intent||"").toLowerCase();
  const esAcuario = lowIntent.includes("dosis") || lowIntent.includes("acuario") || /l\b|litro|acuario|pecera/.test(lowRaw);

  // === V4: CURADOR UNIVERSAL - para CUALQUIER problema con palabras ===
  // Esto es lo nuevo: si NO es acuario, intenta curarlo con verbos, no lo abandona
  if(!esAcuario){
    // 1. Primero: si es calculadora con simbolos 5+8, 20-4
    const matchCalc = lowRaw.match(/(-?\d+(?:[.,]\d+)?)\s*([\+\-\*\/x])\s*(-?\d+(?:[.,]\d+)?)/);
    if(matchCalc){
      let a = parseFloat(matchCalc[1].replace(',','.'));
      let op = matchCalc[2];
      let b = parseFloat(matchCalc[3].replace(',','.'));
      if(op === "x") op = "*";
      if(op === "/" && b === 0) return { curado: false, motivo: "division-cero" };
      let res = 0;
      if(op === "+") res = a + b;
      if(op === "-") res = a - b;
      if(op === "*") res = a * b;
      if(op === "/") res = a / b;
      let texto = `${a} ${op} ${b} = ${res}`;
      return {
        curado: true,
        resultado: texto,
        result: texto,
        estrategia: "Universal-calculadora",
        detalle: { a, b, operacion: op, valor: res },
        mensaje: `AUTO-CURADO Universal calculadora: ${texto}`
      };
    }

    // 2. Segundo: problemas con palabras - busca VERBOS, no nombres
    let a = nums[0], b = nums[1];
    let operacion = null, opSimbolo = "", estrategia = "";

    if(/\b(dar|da|dio|dieron|regala|regalar|pierde|perdio|gasta|gasto|quita|quito|come|comio|vende|vendio|queda|quedan|menos|restar)\b/.test(lowRaw)){
      operacion = a - b; opSimbolo = "-"; estrategia = "Universal-resta-por-verbo";
    } else if(/\b(reparte|repartir|repartio|dividir|divide|entre|cada uno)\b/.test(lowRaw)){
      if(b === 0) return { curado: false };
      operacion = a / b; opSimbolo = "/"; estrategia = "Universal-division-por-verbo";
    } else if(/\b(le dan|le dieron|recibe|recibio|compra|compro|encuentra|encontro|mas|total|juntos|sumar)\b/.test(lowRaw)){
      operacion = a + b; opSimbolo = "+"; estrategia = "Universal-suma-por-verbo";
    } else if(/\b(cada|paquetes?|cajas?|veces|multiplicar)\b/.test(lowRaw)){
      operacion = a * b; opSimbolo = "x"; estrategia = "Universal-multiplicacion-por-verbo";
    } else if(/\b(quedan|queda|sobra|sobran)\b/.test(lowRaw)){
      operacion = a - b; opSimbolo = "-"; estrategia = "Universal-resta-por-pregunta";
    }

    if(operacion !== null){
      let texto = `${a} ${opSimbolo} ${b} = ${operacion}`;
      return {
        curado: true,
        resultado: texto,
        result: texto,
        estrategia,
        detalle: { a, b, operacion: opSimbolo, valor: operacion },
        mensaje: `AUTO-CURADO Universal: ${texto}`
      };
    }

    // Si no detectó verbo, lo deja para AI-Fallback, no inventa
    return { curado: false, motivo: "universal-sin-verbo-claro, pasa a AI" };
  }

  // === CURADOR ACUARIO - intacto de V3.2 ===
  let total = null, dosis = null, base = null;
  const mTotal = raw.match(/(\d+[.,]?\d*)\s*(?:l|litro)/i);
  const mBase = raw.match(/\/\s*(\d+[.,]?\d*)/) || raw.match(/cada\s*(\d+[.,]?\d*)/i);
  const mDosis = raw.match(/(\d+[.,]?\d*)\s*(?:ml|a\/l|al\b)/i);

  if(mTotal) total = parseFloat(mTotal[1].replace(',','.'));
  if(mBase) base = parseFloat(mBase[1].replace(',','.'));
  if(mDosis) dosis = parseFloat(mDosis[1].replace(',','.'));

  if(total == null) total = nums[0];
  if(base == null) base = nums.length >= 3 ? nums[2] : 80;
  if(dosis == null) dosis = nums.length >= 2 ? nums[1] : 5;

  if(total < 1 || total > 10000) return { curado: false };
  if(base <= 0 || base > 1000) return { curado: false };
  if(dosis <= 0 || dosis > 500) return { curado: false };

  let r = (total / base) * dosis;
  if(!isFinite(r) || isNaN(r)) return { curado: false };

  const texto = `${r.toFixed(2)} ml`;

  return {
    curado: true,
    resultado: texto,
    result: texto,
    estrategia: "B-numeros-con-unidades",
    detalle: { total, base, dosis, valor: Number(r.toFixed(2)), unidad: "ml" },
    mensaje: `AUTO-CURADO Estrategia B: ${total}L | ${dosis}ml per ${base}L`
  };
}