// 1. REGISTRO DE DOMINIOS - Para no tener 100 if/else
const DOMINIOS = {
  funcion: Funcion,
  dosis: Dosing,
  pared: Wall,
  coordenada: Coordenada,
  division: Division
};

export async function runOrchestrator(raw){
  if(!raw || raw.trim() === "") return { result: "Escribe algo", log: "Vacío" };

  const entities = EntityExtractor(raw);
  const intent = IntentClassifier(raw);
  const memoria = queAprendi();
  
  let log = `🎼 "${raw}" | Intent: ${intent} | Nums: ${entities.numbers}\n`;

  // Intento 1: Dominio experto
  let resultado;
  const dominioFn = DOMINIOS[intent];
  
  try{
    if(dominioFn){
      resultado = await dominioFn(raw, entities);
    } else {
      throw new Error(`Intent desconocido: ${intent}`);
    }
  }catch(e){ 
    resultado = null; // null = falló, no un string de error
    log += `❌ Intento 1 falló: ${e.message}\n`;
  }

  // Self-Healer
  if(!resultado || seEquivoco(resultado, raw, entities)){
    log += `⚠️ Self-Healer activado...\n`;
    let cura = autoReintento(raw, entities);
    
    if(cura?.curado){
      aprender(raw, cura.estrategia, cura.resultado); // Guarda también el resultado bueno
      resultado = cura.resultado;
    } else {
      let ia = await AIFallback(raw); // tu Mini-IA debería ser async
      if(ia){
        aprender(raw, "AI-fallback", ia);
        resultado = ia;
      }
    }
  }

  return {intent, entities, result: resultado || "No pude resolverlo, enséñame", log};
}