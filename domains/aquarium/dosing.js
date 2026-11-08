// domains/aquarium/dosing.js V3.2 - Usa UNIDADES, no rangos
export function Dosing(raw, ent){
  const nums = ent?.numbers || [];
  if(nums.length === 0) return null;

  const low = String(raw||"").toLowerCase();

  // 1. PRIMERO busca por UNIDADES, no por tamaño. Esto es lo que lo arregla todo.
  // "500L" -> total, "5ml" / "5al" -> dosis, "/ 80" / "cada 80" -> base
  const mTotal = low.match(/(\d+[.,]?\d*)\s*(?:l|litro|litros|lt)\b/);
  const mDosis = low.match(/(\d+[.,]?\d*)\s*(?:ml|miligramo|miligramos|a\/l|al\b)/);
  const mBase = low.match(/\/\s*(\d+[.,]?\d*)/) 
             || low.match(/(?:cada|por cada|base|en)\s*(\d+[.,]?\d*)\s*(?:l|litro)?/);

  let total = mTotal ? parseFloat(mTotal[1].replace(',','.')) : null;
  let dosis = mDosis ? parseFloat(mDosis[1].replace(',','.')) : null;
  let base = mBase ? parseFloat(mBase[1].replace(',','.')) : null;

  // 2. Fallback SOLO si no hay unidades: usa ORDEN, no rangos.
  // En tu frase "500L 5al / 80" el orden es total, dosis, base. No lo rompas con sort.
  // Si es "500 80 5" sin unidades, asumimos total=primero, base=segundo, dosis=tercero
  if(total == null && nums.length >= 1) total = nums[0];
  if(base == null) base = nums.length >= 2 ? nums[1] : 80;
  if(dosis == null) dosis = nums.length >= 3 ? nums[2] : (nums.length === 2 ? nums[1] : 5);

  // 3. Si venían 2 números y el segundo era la dosis, corrige: "500L 5ml" -> total=500, dosis=5, base=80
  // Esto pasa cuando mDosis ya encontró dosis pero base quedó como nums[1] que era la dosis
  if(mDosis && mTotal && base === dosis && nums.length === 2){
    base = 80;
  }

  if(!(total > 0) || !(base > 0) || !(dosis > 0)) return null;
  // Ya no: if(base > total) return null -> un nano de 30L con base 80 es válido, se dosifica más
  if(!isFinite(total) || !isFinite(base) || !isFinite(dosis)) return null;

  const r = (total / base) * dosis;
  if(!isFinite(r)) return null;

  const texto = `${r.toFixed(2)} ml`;

  // 4. CONTRATO ÚNICO: devuelve texto + detalle, para que index.html sí lo pinte
  return {
    resultado: texto,
    result: texto,
    valor: Number(r.toFixed(2)),
    unidad: "ml",
    detalle: { total, base, dosis, todosLosNumeros: nums },
    formula: `(${total}/${base})*${dosis} = ${texto}`,
    raw: texto
  };
}