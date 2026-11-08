// nlu/intentClassifier.js V4 - UNIVERSAL: por puntaje + problemas con palabras
export function IntentClassifier(raw){
  const t = String(raw||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g,' ').trim();

  if(!t) return "vacio";

  let scores = { 
    funcion: 0, dosis: 0, pared: 0, coordenada: 0, division: 0, suma: 0, resta: 0, multiplicacion: 0,
    calculadora: 0, problema_universal: 0, desconocido: 0 
  };

  // FUNCION: f(x), f(4), evalua, funcion, x^2
  if(/f\s*\(\s*(x|\d)/.test(t)) scores.funcion += 10;
  if(t.includes("funcion") || t.includes("evalua") || t.includes("cuanto es") && t.includes("x")) scores.funcion += 5;
  if(/\bx\s*[\^=]\s*\d/.test(t) || /\d+x/.test(t)) scores.funcion += 4;
  if(t.includes("f(x)")) scores.funcion += 10;

  // DOSIS / ACUARIO
  if(t.includes("dosis") || t.includes("dosificar")) scores.dosis += 10;
  if(t.includes("acuario") || t.includes("pecera") || t.includes("peces") || t.includes("pez")) scores.dosis += 10;
  if(/\bml\b/.test(t) || t.includes("a/l") || t.includes("al /") || t.includes("al/")) scores.dosis += 6;
  if(t.includes("litro") || /\b\d+\s*l\b/.test(t)) scores.dosis += 3;
  if(t.includes("cuarto") || t.includes("medio") || t.includes("tercio")) scores.dosis += 1;

  // PARED
  if(t.includes("pared") || t.includes("muro")) scores.pared += 10;
  if(t.includes("pintura") || t.includes("pintar")) scores.pared += 8;
  if(t.includes("m2") || t.includes("m²") || t.includes("metro cuadrado") || t.includes("metros cuadrados")) scores.pared += 8;
  if(/\d+\s*x\s*\d+/.test(t) && (t.includes("pared") || t.includes("muro") || t.includes("pintura") || t.includes("cuarto") && t.includes("pintar"))) scores.pared += 5;

  // COORDENADA
  if(t.includes("coordenada") || t.includes("gps") || t.includes("latitud") || t.includes("longitud") || t.includes("ubicacion")) scores.coordenada += 10;
  if(/\(\s*-?\d+.*,\s*-?\d+.*\)/.test(t)) scores.coordenada += 6;
  if(t.includes("punto") && /-?\d+.*-?\d+/.test(t)) scores.coordenada += 4;
  if(t.includes("distancia") && (t.includes("punto") || t.includes("origen") || /\(/.test(t))) scores.coordenada += 5;

  // DIVISION: dividir, entre, repartir
  if(t.includes("dividir") || t.includes("division") || t.includes("repartir") || t.includes("reparte")) scores.division += 10;
  if(/\bentre\b/.test(t) && /\d/.test(t)) scores.division += 6;
  if(/\ben\s+\d+\s+partes/.test(t) || t.includes("por parte")) scores.division += 8;
  if(/\d+\s*\/\s*\d+/.test(t) && !t.includes("al /") && !t.includes("al/")) scores.division += 4;

  // SUMA
  if(t.includes("suma") || t.includes("sumar") || /\bmas\b/.test(t) || t.includes("+")) scores.suma += 10;
  if(t.includes("total de") || t.includes("juntar")) scores.suma += 5;

  // === V4 NUEVO: RESTA - verbos universales, no nombres ===
  if(/\b(da|dio|dieron|regala|regalar|regalo|pierde|perdio|perder|gasta|gasto|gastar|quita|quitar|quito|come|comio|comer|vende|vender|vendio|restar|resta|menos)\b/.test(t)) scores.resta += 10;
  if(/\b(queda|quedan|sobra|sobran)\b/.test(t)) scores.resta += 6;
  if(t.includes("-") && /\d/.test(t)) scores.resta += 3;

  // === V4 NUEVO: MULTIPLICACION ===
  if(/\b(multiplicar|multiplica|veces|por)\b/.test(t) && /\d/.test(t)) scores.multiplicacion += 6;
  if(/\b(cada|paquete|paquetes|caja|cajas)\b/.test(t) && /\d/.test(t)) scores.multiplicacion += 5;
  if(t.includes("*") || /\bx\b/.test(t)) scores.multiplicacion += 3;

  // === V4 NUEVO: CALCULADORA - simbolos directos 5+8, 20-4, 4*5, 20/4 ===
  if(/-?\d+\s*[\+\-\*\/x]\s*-?\d+/.test(t)) scores.calculadora += 9;
  if(t.includes("calcula") || t.includes("cuanto es") && /-?\d+\s*[\+\-\*\/]/.test(t)) scores.calculadora += 5;

  // === V4 NUEVO: PROBLEMA UNIVERSAL - CUALQUIER frase con numeros + verbos + pregunta ===
  // Esto es lo que hace que Pepito, Maria, Juan, Luis, quien sea, funcione.
  // No busca nombres, busca estructura: "tiene X" + verbo + "cuanto"
  const tieneNumeros = /\d/.test(t);
  const tieneVerboUniversal = /\b(tiene|tenia|da|dio|gasta|regala|pierde|compra|recibe|reparte|vende|come|queda|quedan)\b/.test(t);
  const tienePregunta = /\b(cuanto|cuantos|cuantas|queda|quedan|sobra|total|le quedan)\b/.test(t);
  const tieneTiene = /\b(tiene|tenia|tienen)\b/.test(t);

  if(tieneNumeros && tieneVerboUniversal && tienePregunta) scores.problema_universal += 12;
  else if(tieneNumeros && tieneTiene && tieneVerboUniversal) scores.problema_universal += 10;
  else if(tieneNumeros && tieneVerboUniversal) scores.problema_universal += 7;
  else if(tieneNumeros && tienePregunta && tieneTiene) scores.problema_universal += 8;

  // Si es problema con palabras pero tambien es suma/resta/division, que gane problema_universal
  // porque el orchestrator lo manda a AIFallback V4 que sabe resolverlo universal
  // Excepto si es dosis/pared/funcion/coordenada que son mas especificos

  // 2. Gana el que tenga más puntos
  let mejor = "desconocido";
  let mejorPuntos = 0;
  for(let [intent, puntos] of Object.entries(scores)){
    if(puntos > mejorPuntos){
      mejorPuntos = puntos;
      mejor = intent;
    }
  }

  if(mejorPuntos === 0) return "desconocido";

  // 3. Desempates - dominios expertos tienen prioridad sobre universal
  if(scores.dosis === scores.pared && scores.pared > 0 && (t.includes("pared") || t.includes("muro") || t.includes("pintura"))) return "pared";
  if(scores.dosis === scores.division && scores.dosis > 0 && t.includes("dosis")) return "dosis";

  // V4: Si problema_universal empata o supera a suma/resta/division/multiplicacion, gana universal
  // Porque universal sabe resolver suma/resta/division con verbos
  if(mejor === "suma" || mejor === "resta" || mejor === "division" || mejor === "multiplicacion"){
    if(scores.problema_universal >= mejorPuntos - 2 && scores.problema_universal > 0){
      return "problema_universal";
    }
  }

  // V4: Si es calculadora pura (solo numeros y simbolos, sin palabras de problema), gana calculadora
  if(mejor === "calculadora" && !tieneVerboUniversal && !tienePregunta) return "calculadora";

  return mejor;
}