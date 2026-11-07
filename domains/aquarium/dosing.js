export function Dosing(raw, ent){
  const nums = ent?.numbers || [];
  if(nums.length < 2) return null;

  // Separamos por rangos de acuario REAL
  const totales = nums.filter(n => n >= 100).sort((a,b) => b - a); // [300, 250]
  const bases = nums.filter(n => n >= 20 && n < 100); // [80]
  const dosisArr = nums.filter(n => n > 0 && n < 20); // [5, 2]

  // Si hay varios totales, los sumamos (varios acuarios)
  // Si no hay ninguno >=100, el más grande es el total
  let total = totales.length > 0 
    ? totales.reduce((a,b) => a + b, 0) // 250+300 = 550
    : Math.max(...nums);

  let base = bases.length > 0 ? bases[0] : 80;
  let dosis = dosisArr.length > 0 ? Math.min(...dosisArr) : 5; // La dosis más chica es la real

  if(total <=0 || base <=0) return null;
  if(base > total) return null;

  const r = (total / base) * dosis;

  return {
    valor: Number(r.toFixed(2)),
    unidad: "ml",
    detalle: { total, base, dosis, todosLosNumeros: nums },
    formula: `(${total}/${base})*${dosis}`
  };
}