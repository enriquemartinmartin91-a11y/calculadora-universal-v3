// Detecta si el dominio la cagó - Versión Robusta
export function seEquivoco(resultado, raw, entities){
  // 1. Si no hay resultado, falló
  if(resultado === null || resultado === undefined || resultado === "") return true;

  const txt = String(resultado).toLowerCase();

  // 2. Errores técnicos
  if(txt.includes("nan") || txt.includes("undefined") || txt.includes("infinity")) return true;

  // 3. Mensajes de "no entendí" de tus dominios
  const frasesFallo = ["detecté:", "escribe:", "no entendí", "no pude"];
  if(frasesFallo.some(f => txt.includes(f))) return true;

  // 4. Regla de oro: Si el usuario dio números y tu resultado no tiene ningún número, ignoraste todo
  if(entities?.numbers?.length > 0){
    const tieneNumeroEnRespuesta = /\d/.test(txt);
    if(!tieneNumeroEnRespuesta) return true;
  }

  return false;
}

// Intenta curar solo - Estrategia B mejorada
export function autoReintento(raw, entities){
  let nums = entities?.numbers || [];
  if(nums.length < 2) return {curado: false};

  // Ordenamos de mayor a menor para inferir: Total > Base > Dosis
  // Ej: [500, 80, 5] -> Total=500, Base=80, Dosis=5
  let sorted = [...nums].sort((a,b) => b - a);
  
  let total = sorted[0]; // El más grande siempre es el acuario
  let dosis = sorted[sorted.length - 1]; // El más chico es la dosis
  let base = sorted.length === 3 ? sorted[1] : 80; // El de en medio, o 80 por defecto

  // Validación lógica de acuario, no números mágicos sueltos
  if(total < 10 || total > 5000) return {curado: false}; // Un acuario no tiene 2L ni 10000L
  if(dosis > 50) return {curado: false}; // Nadie dosifica 80ml como dosis base
  if(base < 10 || base > 500) return {curado: false};

  let r = (total / base) * dosis;

  return {
    curado: true,
    // OJO: Ahora devolvemos DATOS, no texto bonito. El texto lo hace index.html
    resultado: {
      valor: Number(r.toFixed(2)),
      unidad: "ml",
      detalle: { total, base, dosis },
      mensaje: `AUTO-CURADO Estrategia B: ${total}L | ${dosis}ml per ${base}L`
    },
    estrategia: "B-numeros-ordenados"
  };
}