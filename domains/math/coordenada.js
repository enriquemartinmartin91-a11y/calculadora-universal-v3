// domains/coordenada.js V3.2 - No explota, entiende coma decimal y 2 puntos
export function Coordenada(raw, ent){
  const original = String(raw||"");
  const t = original.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

  // 1. Busca 2 puntos: "(19.4, -99.1) a (20.1, -98.9)" -> distancia entre ellos
  // Busca también "19.4, -99.1" solo -> distancia al origen
  // Acepta coma, punto y coma, o espacio como separador: "19.4 -99.1", "19,4; -99,1"
  const patronPunto = /\(?\s*(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)\s*\)?/g;
  const puntos = [...t.matchAll(patronPunto)].map(m => ({
    x: parseFloat(m[1].replace(',','.')),
    y: parseFloat(m[2].replace(',','.'))
  })).filter(p => isFinite(p.x) && isFinite(p.y));

  // 2. Si no encontró con regex, usa los números del EntityExtractor
  let pts = puntos;
  if(pts.length === 0 && ent?.numbers?.length >= 2){
    pts = [{ x: ent.numbers[0], y: ent.numbers[1] }];
    if(ent.numbers.length >= 4) pts.push({ x: ent.numbers[2], y: ent.numbers[3] });
  }

  // 3. Si aún no hay nada, no inventes, devuelve null para que el Healer lo cure
  if(pts.length === 0) return null;

  const p1 = pts[0];
  let texto = "";
  let valor = 0;
  let detalle = { punto1: p1 };

  if(pts.length >= 2){
    // 4. Distancia ENTRE 2 puntos, que es lo útil de verdad
    const p2 = pts[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    if(!isFinite(d)) return null;
    valor = Number(d.toFixed(2));
    texto = `Punto 1 (${p1.x},${p1.y}) -> Punto 2 (${p2.x},${p2.y})\nDistancia entre puntos: ${valor}`;
    detalle.punto2 = p2;
    detalle.distancia = valor;
    detalle.formula = `sqrt((${p2.x}-${p1.x})² + (${p2.y}-${p1.y})²) = ${valor}`;
  } else {
    // Solo 1 punto: distancia al origen
    const d = Math.sqrt(p1.x*p1.x + p1.y*p1.y);
    if(!isFinite(d)) return null;
    valor = Number(d.toFixed(2));
    texto = `Punto (${p1.x},${p1.y})\nDistancia al origen: ${valor}\nX=${p1.x} Y=${p1.y}`;
    detalle.distanciaOrigen = valor;
    detalle.formula = `sqrt(${p1.x}² + ${p1.y}²) = ${valor}`;
  }

  // 5. CONTRATO ÚNICO: igual que Dosing y Wall
  return {
    resultado: texto,
    result: texto,
    valor,
    unidad: "unidades",
    detalle,
    formula: detalle.formula,
    raw: texto
  };
}