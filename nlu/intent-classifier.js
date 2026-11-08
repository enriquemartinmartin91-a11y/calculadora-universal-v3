// nlu/intentClassifier.js V3.3 - Por puntaje, no por primer includes que encuentre
export function IntentClassifier(raw){
  const t = String(raw||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"") // quita acentos: "función" -> "funcion"
    .replace(/\s+/g,' ').trim();

  if(!t) return "vacio";

  // 1. Puntajes, no primer match. El que tenga más puntos gana.
  let scores = { funcion: 0, dosis: 0, pared: 0, coordenada: 0, division: 0, suma: 0, desconocido: 0 };

  // FUNCION: f(x), f(4), evalua, funcion, x^2
  if(/f\s*\(\s*(x|\d)/.test(t)) scores.funcion += 10;
  if(t.includes("funcion") || t.includes("evalua") || t.includes("cuanto es") && t.includes("x")) scores.funcion += 5;
  if(/\bx\s*[\^=]\s*\d/.test(t) || /\d+x/.test(t)) scores.funcion += 4;
  if(t.includes("f(x)")) scores.funcion += 10;

  // DOSIS / ACUARIO: ml, litro, dosis, acuario, pecera, peces - pero con contexto
  if(t.includes("dosis") || t.includes("dosificar")) scores.dosis += 10;
  if(t.includes("acuario") || t.includes("pecera") || t.includes("peces") || t.includes("pez")) scores.dosis += 10;
  if(/\bml\b/.test(t) || t.includes("a/l") || t.includes("al /") || t.includes("al/")) scores.dosis += 6;
  if(t.includes("litro") || /\b\d+\s*l\b/.test(t)) scores.dosis += 3; // "500L" solo da 3 puntos, no 10, para que pared le gane si dice "pared"
  if(t.includes("cuarto") || t.includes("medio") || t.includes("tercio")) scores.dosis += 1; // "un cuarto" puede ser dosis o division, solo 1 punto

  // PARED: pared, muro, pintura, m2, metros cuadrados, x
  if(t.includes("pared") || t.includes("muro")) scores.pared += 10;
  if(t.includes("pintura") || t.includes("pintar")) scores.pared += 8;
  if(t.includes("m2") || t.includes("m²") || t.includes("metro cuadrado") || t.includes("metros cuadrados")) scores.pared += 8;
  if(/\d+\s*x\s*\d+/.test(t) && (t.includes("pared") || t.includes("muro") || t.includes("pintura") || t.includes("cuarto") && t.includes("pintar"))) scores.pared += 5;
  // "3x4" solo, sin contexto, puede ser pared o funcion. No le des 10 puntos solo por la x.

  // COORDENADA: coordenada, gps, punto, latitud, longitud, (x,y)
  if(t.includes("coordenada") || t.includes("gps") || t.includes("latitud") || t.includes("longitud") || t.includes("ubicacion")) scores.coordenada += 10;
  if(/\(\s*-?\d+.*,\s*-?\d+.*\)/.test(t)) scores.coordenada += 6; // "(19.4, -99.1)" sí es coordenada
  if(t.includes("punto") && /-?\d+.*-?\d+/.test(t)) scores.coordenada += 4;
  if(t.includes("distancia") && (t.includes("punto") || t.includes("origen") || /\(/.test(t))) scores.coordenada += 5;

  // DIVISION: dividir, entre, repartir, en partes, /
  if(t.includes("dividir") || t.includes("division") || t.includes("repartir") || t.includes("reparte")) scores.division += 10;
  if(/\bentre\b/.test(t) && /\d/.test(t)) scores.division += 6;
  if(/\ben\s+\d+\s+partes/.test(t) || t.includes("por parte")) scores.division += 8;
  if(/\d+\s*\/\s*\d+/.test(t) && !t.includes("al /") && !t.includes("al/")) scores.division += 4; // "500/80" es division, pero "5al/80" es dosis

  // SUMA: mas, suma, total, juntar
  if(t.includes("suma") || t.includes("sumar") || /\bmas\b/.test(t) || t.includes("+")) scores.suma += 10;
  if(t.includes("total de") || t.includes("juntar")) scores.suma += 5;

  // 2. Gana el que tenga más puntos. Si hay empate, gana el que apareció primero en el texto.
  let mejor = "desconocido";
  let mejorPuntos = 0;
  for(let [intent, puntos] of Object.entries(scores)){
    if(puntos > mejorPuntos){
      mejorPuntos = puntos;
      mejor = intent;
    }
  }

  // 3. Si nadie tiene puntos, NO inventes "division". Di "desconocido" para que el Self-Healer / AI lo cure.
  if(mejorPuntos === 0) return "desconocido";

  // 4. Desempate: si dosis y pared empatan y dice "pared", gana pared
  if(scores.dosis === scores.pared && scores.pared > 0 && (t.includes("pared") || t.includes("muro") || t.includes("pintura"))) return "pared";
  if(scores.dosis === scores.division && scores.dosis > 0 && t.includes("dosis")) return "dosis";

  return mejor;
}