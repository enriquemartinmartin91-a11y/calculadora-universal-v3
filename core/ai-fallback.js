// ai-fallback.js V4 - UNIVERSAL: calculadora + problemas con palabras + dosis
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

  let clean = t;
  clean = clean.replace(/\b(veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g, (_,d,u) => String(baseNums[d]+baseNums[u]));
  clean = clean.replace(/\b(doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|ciento|cien)\s+(veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g, (_,c,u) => String(baseNums[c]+baseNums[u]));
  clean = clean.replace(/\bmil\s+(doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|ciento|cien|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\b/g, (_,c) => String(1000+baseNums[c]));

  for(let k in baseNums){
    if(k==="medio"||k==="cuarto") continue;
    clean = clean.replace(new RegExp(`\\b${k}\\b`,'g'), baseNums[k]);
  }
  clean = clean.replace(/(\d+)\s+(?:punto|coma)\s+(\d+)/g, "$1.$2");

  let nums = [...clean.matchAll(/-?\d+(?:[.,]\d+)?/g)].map(m=>parseFloat(m[0].replace(',','.'))).filter(n=>!isNaN(n));
  if(nums.length === 0) return null;

  const makeReturn = (texto, intent, entities, logExtra) => ({
    resultado: texto,
    result: texto,
    intent,
    entities,
    domain: "ai-fallback.js V4",
    curated: true,
    log: `✅ CURADO por ai-fallback.js V4\n👉 ${texto} ${logExtra||""}`,
    explanation: `Entendí "${raw}" -> ${logExtra||""}`,
    raw: `✅ CURADO por ai-fallback.js V4\n👉 ${texto}`
  });

  // === 1. MODO DOSIS / LITROS - prioridad si hay L, ml, litro, dosis ===
  const esDosis = /\b(l|litro|litros|lt|ml|dosis)\b/.test(clean) || /\/\s*\d/.test(clean) && clean.includes("l");
  if(esDosis){
    const mTotal = clean.match(/(\d+[.,]?\d*)\s*(?:l|litro|litros|lt)\b/);
    const mDosis = clean.match(/(\d+[.,]?\d*)\s*(?:ml|miligramo|miligramos|dosis|a\/l|al)\b/) 
                || clean.match(/(\d+[.,]?\d*)\s*(?:por|para|cada)\s*(?:litro|l)\b/);
    const mBase = clean.match(/(?:cada|base|en)\s*(\d+[.,]?\d*)/) 
               || clean.match(/\/\s*(\d+[.,]?\d*)/);
    let total = mTotal ? parseFloat(mTotal[1].replace(',','.')) : null;
    let dosis = mDosis ? parseFloat(mDosis[1].replace(',','.')) : null;
    let base = mBase ? parseFloat(mBase[1].replace(',','.')) : 80;
    if(total === null) total = nums[0];
    if(dosis === null) {
      const resto = nums.filter(n => n !== total && n !== base);
      dosis = resto.length ? resto[0] : 5;
    }
    const r = (total / base) * dosis;
    const texto = `${r.toFixed(2)} ml`;
    return makeReturn(texto, "dosis", {total, base, dosis}, `| total=${total}L, base=${base}, dosis=${dosis}ml`);
  }

  // === 2. MODO CALCULADORA BASICA: 5+8, 20-4, 4*5, 20/4 ===
  if(/[\d]\s*[\+\-\*\/x]\s*[\d]/.test(clean) && nums.length >= 2){
    let expr = clean.replace(/x/g,'*').match(/[\d\.\+\-\*\/\(\) ]+/)[0];
    if(/^[0-9\.\+\-\*\/\(\) ]+$/.test(expr)){
      try{
        let res = Function("return " + expr)();
        return makeReturn(String(res), "calculadora", {expresion: expr, resultado: res}, `| ${expr} = ${res}`);
      }catch(e){}
    }
  }

  // === 3. MODO PROBLEMA UNIVERSAL - NO busca nombres, busca VERBOS ===
  if(nums.length >= 2){
    let a = nums[0], b = nums[1];
    let operacion = null, opSimbolo = "", razon = "";

    // RESTA: dar, regalar, perder, gastar, quitar, comer, vender, queda
    if(/\b(dar|da|dio|dieron|regala|regalar|regalo|pierde|perdio|perder|gasta|gasto|gastar|quita|quitar|quito|come|comio|comer|vende|vender|vendio|queda|quedan|quitar|restar|menos|falta|debe)\b/.test(clean)){
      operacion = a - b; opSimbolo = "-"; razon = `Tenia ${a}, dio/perdio ${b} -> resta`;
    }
    // DIVISION: reparte, entre, cada uno, dividir
    else if(/\b(reparte|repartir|repartio|dividir|divide|dividio|entre|cada uno|por persona)\b/.test(clean)){
      operacion = a / b; opSimbolo = "/"; razon = `Repartir ${a} entre ${b} -> division`;
    }
    // SUMA: le dan, recibe, compra, encuentra, mas, total, juntos
    else if(/\b(le dan|le dieron|recibe|recibio|compra|compro|comprar|encuentra|encontro|mas|sumar|total|juntos|en total|agregar|anadio)\b/.test(clean)){
      operacion = a + b; opSimbolo = "+"; razon = `Tenia ${a}, sumamos ${b} -> suma`;
    }
    // MULTIPLICACION: cada, cajas con, paquetes de, veces, por
    else if(/\b(cada|paquetes?|cajas?|veces|multiplicar|por)\b/.test(clean)){
      operacion = a * b; opSimbolo = "x"; razon = `${a} grupos de ${b} -> multiplicacion`;
    }
    // Si pregunta "cuantas le quedan" sin verbo claro, es resta por defecto
    else if(/\b(quedan|queda|sobra|sobran)\b/.test(clean)){
      operacion = a - b; opSimbolo = "-"; razon = `Pregunta cuanto queda -> resta`;
    } else {
      // Si no detecta verbo, no adivina, devuelve null para que lo maneje otro modulo
      return null;
    }

    let texto = `${a} ${opSimbolo} ${b} = ${operacion}`;
    return makeReturn(texto, "problema_universal", {a, b, operacion, operacionTipo: opSimbolo}, `| ${texto} // ${razon}`);
  }

  return null;
}