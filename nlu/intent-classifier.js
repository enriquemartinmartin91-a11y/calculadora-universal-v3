export function IntentClassifier(raw){
  let t = raw.toLowerCase();
  if(t.includes("f(") || t.includes("funcion")) return "funcion";
  if(t.includes("ml") || t.includes("litro") || t.includes("dosis")) return "dosis";
  if(t.includes("pared") || t.includes("muro")) return "pared";
  if(t.includes("(") && t.includes(",")) return "coordenada";
  return "division";
}