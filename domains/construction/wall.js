// domains/construction/wall.js V3.2 - No explota, no inventa, contrato único
export function Wall(raw, ent){
  const t = String(raw||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

  // 1. Busca "3x4", "3 x 4", "3m x 4m", "3 metros por 4 metros", "3 de largo por 4 de alto"
  const mp = t.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metros?|mts?)?\s*(?:x|por|\*)\s*(\d+(?:[.,]\d+)?)\s*(?:m|metros?|mts?)?/);

  // 2. Si no hay "x", intenta con los números que ya sacó EntityExtractor
  let a = null, b = null;
  if(mp){
    a = parseFloat(mp[1].replace(',','.'));
    b = parseFloat(mp[2].replace(',','.'));
  } else if(ent?.numbers?.length >= 2){
    a = ent.numbers[0];
    b = ent.numbers[1];
  } else {
    // No inventes, devuelve null para que el Self-Healer lo cure
    return null;
  }

  if(!(a > 0) || !(b > 0) || !isFinite(a) || !isFinite(b)) return null;

  const area = a * b;
  // 3. Sin magia: 1L rinde 10m² es un dato, ponle nombre. Si cambias de pintura, cambias aquí.
  const RENDIMIENTO_M2_POR_LITRO = 10;
  const litros = area / RENDIMIENTO_M2_POR_LITRO;

  const texto = `${a}x${b}=${area.toFixed(2)} m² | ${litros.toFixed(2)} L de pintura`;

  return {
    resultado: texto,
    result: texto,
    valor: Number(area.toFixed(2)),
    unidad: "m²",
    detalle: { largo: a, alto: b, area, litros: Number(litros.toFixed(2)), rendimiento: RENDIMIENTO_M2_POR_LITRO },
    formula: `${a} x ${b} = ${area.toFixed(2)} m²`,
    raw: texto
  };
}

// domains/math/addition.js V3.2 - Solo suma si le pidieron sumar
export function Addition(raw, ent){
  const nums = ent?.numbers || [];
  if(nums.length < 2) return null;

  const low = String(raw||"").toLowerCase();
  // 4. Solo suma si hay señal de suma: "más", "+", "suma", "total de", "juntar"
  const quiereSumar = /\+|mas|más|suma|sumar|total|junta|anade|añade/.test(low);
  if(!quiereSumar) return null; // Si no pidió sumar, no le inventes una suma

  const suma = nums.reduce((x,y)=>x+y,0);
  if(!isFinite(suma)) return null;

  const texto = `Suma: ${nums.join(' + ')} = ${suma}`;

  return {
    resultado: texto,
    result: texto,
    valor: suma,
    unidad: "",
    detalle: { numeros: nums, operacion: "suma" },
    formula: `${nums.join(' + ')} = ${suma}`,
    raw: texto
  };
}