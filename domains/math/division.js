// domains/division.js V3.2 - División pura, sin inventar, sin meter dosis
export function Division(raw, ent){
  const nums = ent?.numbers || [];
  const low = String(raw||"").toLowerCase();

  // 1. Busca "200 / 4", "200 entre 4", "200 dividido 4", "200 en 4 partes"
  const mSlash = low.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  const mEntre = low.match(/(\d+(?:[.,]\d+)?)\s*(?:entre|dividido(?:\s+entre)?|en|por)\s*(\d+(?:[.,]\d+)?)/);
  // "repartir 200 en 4" -> total=200, partes=4
  const mRepartir = low.match(/(?:repartir|dividir|reparte)\s*(\d+(?:[.,]\d+)?)\s*(?:en|entre)\s*(\d+(?:[.,]\d+)?)/);

  let total = null, partes = null;
  const m = mRepartir || mSlash || mEntre;
  if(m){
    total = parseFloat(m[1].replace(',','.'));
    partes = parseFloat(m[2].replace(',','.'));
  } else if(nums.length >= 2){
    // 2. Sin palabras, usa ORDEN: primero es total, segundo es partes. No uses find por tamaño.
    total = nums[0];
    partes = nums[1];
  } else {
    // 3. Si no hay 2 números, NO inventes 500/80. Devuelve null para que el Healer lo cure.
    return null;
  }

  if(!(total >= 0) || !(partes > 0)) {
    // División por cero o partes negativas no es válida
    const textoError = partes === 0 ? "No se puede dividir entre 0" : "Necesito 2 números válidos para dividir";
    return { resultado: textoError, result: textoError, valor: null, detalle: { total, partes }, raw: textoError };
  }
  if(!isFinite(total) || !isFinite(partes)) return null;

  const cada = total / partes;
  if(!isFinite(cada)) return null;

  const texto = `${total} / ${partes} = ${cada.toFixed(4)}\n\n👉 ${cada.toFixed(2)} por parte`;

  // 4. CONTRATO ÚNICO: igual que los demás, sin meter dosis aquí
  // Si es dosis, eso lo decide Dosing, no Division.
  return {
    resultado: texto,
    result: texto,
    valor: Number(cada.toFixed(2)),
    unidad: "por parte",
    detalle: { total, partes, cada: Number(cada.toFixed(4)) },
    formula: `${total} / ${partes} = ${cada.toFixed(4)}`,
    raw: texto
  };
}