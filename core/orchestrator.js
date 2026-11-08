// core/orchestrator.js V4 - UNIVERSAL: deja pasar calculadora + problemas con palabras
import { EntityExtractor } from './nlu/entityExtractor.js';
import { IntentClassifier } from './nlu/intentClassifier.js';
import { queAprendi, aprender } from './memory/memory.js';
import { seEquivoco, autoReintento } from './healer/selfHealer.js';
import { AIFallback } from './ai-fallback.js';
import { Funcion } from './domains/funcion.js';
import { Dosing } from './domains/aquarium/dosing.js';
import { Wall } from './domains/construction/wall.js';
import { Coordenada } from './domains/coordenada.js';
import { Division } from './domains/division.js';

// 1. MAPEO FLEXIBLE: acepta "dosis", "dosis_acuario", "calcular_dosis", etc.
const DOMINIOS = [
  { keys: ["funcion","function","grafica"], fn: Funcion },
  { keys: ["dosis","dosing","dosis_acuario","acuario"], fn: Dosing },
  { keys: ["pared","wall","muro","construccion"], fn: Wall },
  { keys: ["coordenada","coord","gps","ubicacion"], fn: Coordenada },
  { keys: ["division","dividir","repartir"], fn: Division },
];

// 2. INTENTS UNIVERSALES: estos NO son de un dominio, son de AIFallback V4
// Aqui es donde entra lo universal: cualquier nombre, cualquier objeto
const INTENTS_UNIVERSALES = ["calculadora","calculo","matematicas","matematica","problema","problema_universal","universal","aritmetica","cuenta","operacion","tarea"];

function esUniversal(intent){
  const clean = String(intent||"").toLowerCase().trim();
  return INTENTS_UNIVERSALES.some(k => clean.includes(k));
}

function buscarDominio(intent){
  const clean = String(intent||"").toLowerCase().trim();
  return DOMINIOS.find(d => d.keys.includes(clean) || d.keys.some(k => clean.includes(k)))?.fn || null;
}

// 3. Normaliza cualquier resultado a un solo formato: { texto, ... }
function normalizar(res){
  if(res == null) return null;
  if(typeof res === "string") return { resultado: res, result: res, raw: res };
  if(typeof res === "number") return { resultado: String(res), result: String(res), raw: String(res) };
  const texto = res.resultado || res.result || res.raw || null;
  if(!texto) return null;
  return { ...res, resultado: texto, result: texto };
}

export async function runOrchestrator(raw){
  if(!raw || !raw.trim()) return { intent:"vacio", entities:{numbers:[]}, resultado:"Escribe algo", result:"Escribe algo", log:"Vacío" };

  const entities = EntityExtractor(raw);
  const intent = IntentClassifier(raw);
  const memoria = queAprendi();

  let log = `🎼 "${raw}" | Intent: ${intent} | Nums: ${entities.numbers}\n`;

  let resultado = null;

  // --- V4: SI ES UNIVERSAL, VE DIRECTO A AIFallback V4 ---
  // No lo mandamos a buscar dominio experto, porque no es dosis ni pared.
  // Es un problema con palabras de cualquier persona / cosa.
  if(esUniversal(intent)){
    log += `🌍 Intent UNIVERSAL detectado -> va a AIFallback V4\n`;
    try{
      let ia = await AIFallback(raw);
      if(ia){
        resultado = normalizar(ia);
        log += `✅ Resuelto por AIFallback V4 Universal: ${resultado?.resultado}\n`;
        if(resultado) aprender(raw, "AI-fallback-universal", resultado.resultado);
      }
    }catch(e){ log += `❌ AIFallback Universal falló: ${e.message}\n`; }

    // Si AIFallback universal no pudo, NO nos rendimos, intentamos dominio como plan B
    if(!resultado){
      log += `⚠️ Universal no resolvió, intento dominio experto como plan B...\n`;
    } else {
      // Ya quedó, devolvemos de una vez
      return {
        intent,
        entities,
        resultado: resultado.resultado,
        result: resultado.resultado,
        log: log + (resultado.log ? `\n${resultado.log}` : "")
      };
    }
  }

  // Intento 1: Dominio experto (solo si no es universal o si universal falló)
  const dominioFn = buscarDominio(intent);
  
  try{
    if(dominioFn){
      resultado = normalizar(await dominioFn(raw, entities));
    } else {
      // V4: Antes era throw, ahora solo avisa y deja que el fallback universal intente
      log += `ℹ️ Sin dominio experto para intent: ${intent}, se intentará fallback universal\n`;
    }
  }catch(e){ 
    resultado = null;
    log += `❌ Intento 1 falló: ${e.message}\n`;
  }

  // 4. Self-Healer: usa == null, no !resultado, para no borrar el 0
  const esMalo = resultado == null || seEquivoco(resultado?.resultado || resultado, raw, entities);
  
  if(esMalo){
    log += `⚠️ Self-Healer activado...\n`;
    let cura = null;
    try{ cura = autoReintento(raw, entities); }catch(e){ log += `❌ Healer falló: ${e.message}\n`; }
    
    if(cura?.curado && cura?.resultado){
      const norm = normalizar(cura.resultado);
      if(norm){
        aprender(raw, cura.estrategia, norm.resultado);
        resultado = norm;
        log += `✅ Curado por ${cura.estrategia}\n`;
      }
    } else {
      // AIFallback V4 universal - ultima oportunidad para CUALQUIER problema
      let ia = null;
      try{ ia = await AIFallback(raw); }catch(e){ log += `❌ AI-Fallback falló: ${e.message}\n`; }
      if(ia){
        const norm = normalizar(ia);
        if(norm){
          aprender(raw, "AI-fallback", norm.resultado);
          resultado = norm;
          log += `✅ Curado por AIFallback V4 Universal\n`;
        }
      }
    }
  }

  const final = resultado ? normalizar(resultado) : null;

  // 5. CONTRATO ÚNICO: siempre devuelve resultado + result + log
  return {
    intent, 
    entities, 
    resultado: final?.resultado || "No pude resolverlo, enséñame",
    result: final?.resultado || "No pude resolverlo, enséñame",
    log
  };
}