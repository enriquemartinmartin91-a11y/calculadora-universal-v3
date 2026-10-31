// Detecta si el dominio la cagó
export function seEquivoco(resultado, raw, entities){
  if(!resultado) return true;
  if(resultado.includes("NaN") || resultado.includes("undefined")) return true;
  if(resultado.includes("Detecté:") || resultado.includes("Escribe:")) return true;
  // Si el usuario puso 500 y el resultado no tiene 500, ignoró algo
  if(entities.numbers.includes(500) && !resultado.includes("500")) return true;
  return false;
}

// Intenta curar solo
export function autoReintento(raw, entities){
  // Estrategia B: Si no encontró por regex, intenta por orden de números
  let nums = entities.numbers;
  if(nums.length >=3){
    let total = nums.find(n=>n>=100) || nums[0];
    let base = nums.find(n=>n>=20 && n<100) || 80;
    let dosis = nums.find(n=>n<20) || 5;
    if(total && base && dosis){
      let r = (total/base)*dosis;
      return {
        curado: true,
        resultado: `✅ AUTO-CURADO por self-healer.js\nEstrategia B: Detecté números sin palabras clave\n${total}L | ${dosis}ml per ${base}L\n\n👉 ${r.toFixed(2)} ml (curado sin tu intervención)`,
        estrategia: "B-numeros"
      };
    }
  }
  return {curado: false};
}