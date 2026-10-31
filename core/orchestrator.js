import { IntentClassifier } from '../nlu/intent-classifier.js';
import { EntityExtractor } from '../nlu/entity-extractor.js';
import { seEquivoco, autoReintento } from './self-healer.js';
import { AIFallback } from './ai-fallback.js';
import { aprender, queAprendi } from '../memory/learner.js';

import { Division } from '../domains/math/division.js';
import { Funcion } from '../domains/math/funcion.js';
import { Coordenada } from '../domains/math/coordenada.js';
import { Dosing } from '../domains/aquarium/dosing.js';
import { Wall } from '../domains/construction/wall.js';

export async function runOrchestrator(raw){
  const entities = EntityExtractor(raw);
  const intent = IntentClassifier(raw);
  const memoria = queAprendi();
  
  let log = `🎼 Director: "${raw}"\n🧠 Intent: ${intent} | Nums: ${entities.numbers}\n`;
  log += `📚 Memoria: ${JSON.stringify(memoria)}\n\n`;

  // Intento 1: Dominio experto
  let resultado = "";
  try{
    if(intent==='funcion') resultado = Funcion(raw, entities);
    else if(intent==='dosis') resultado = Dosing(raw, entities);
    else if(intent==='pared') resultado = Wall(raw, entities);
    else if(intent==='coordenada') resultado = Coordenada(raw, entities);
    else resultado = Division(raw, entities);
  }catch(e){ resultado = "ERROR: "+e.message; }

  log += `🔍 Intento 1 (${intent}): ${resultado.slice(0,50)}...\n`;

  // Self-Healer: ¿La cagó?
  if(seEquivoco(resultado, raw, entities)){
    log += `⚠️ Self-Healer detectó fallo! Reintentando...\n`;
    
    // Intento 2: Auto-reintento
    let cura = autoReintento(raw, entities);
    if(cura.curado){
      log += `✅ Curado con Estrategia ${cura.estrategia}\n`;
      aprender(raw, cura.estrategia);
      resultado = cura.resultado;
    } else {
      // Intento 3: Mini-IA final
      log += `⚠️ Estrategia B falló, llamando a ai-fallback.js (Mini-IA)...\n`;
      let ia = AIFallback(raw);
      if(ia){
        log += `✅ Mini-IA lo resolvió!\n`;
        aprender(raw, "AI-fallback");
        resultado = ia;
      } else {
        log += `❌ Hasta la IA falló. Necesita aprendizaje humano.\n`;
      }
    }
  } else {
    log += `✅ Intento 1 funcionó, no necesita cura.\n`;
  }

  return {intent, entities, result: resultado, log};
}