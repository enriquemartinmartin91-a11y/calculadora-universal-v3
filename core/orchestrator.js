// core/orchestrator.js V3.2 - con imports, contrato único y sin borrar el 0
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

function buscarDominio(intent){
  const clean = String(intent||"").toLowerCase().trim();
  return DOMINIOS.find(d => d.keys.includes(clean) || d.keys.some(k => clean.includes(k)))?.fn || null;
}

// 2. Normaliza cualquier resultado a un solo formato: { texto, ... }
function normalizar(res){
  if(res == null) return null;
  if(typeof res === "string") return { resultado: res, result: res, raw: res };
  if(typeof res === "number") return { resultado: String(res), result: String(res), raw: String(res) };
  // si ya es objeto del fallback, le asegura los 2 campos
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

  // Intento 1: Dominio experto
  let resultado = null;
  const dominioFn = buscarDominio(intent);
  
  try{
    if(dominioFn){
      resultado = normalizar(await dominioFn(raw, entities));
    } else {
      throw new Error(`Intent desconocido: ${intent}`);
    }
  }catch(e){ 
    resultado = null;
    log += `❌ Intento 1 falló: ${e.message}\n`;
  }

  // 3. Self-Healer: usa == null, no !resultado, para no borrar el 0
  const esMalo = resultado == null || seEquivoco(resultado?.resultado || resultado, raw, entities);
  
  if(esMalo){
    log += `⚠️ Self-Healer activado...\n`;
    let cura = null;
    try{ cura = autoReintento(raw, entities); }catch(e){ log += `❌ Healer falló: ${e.message}\n`; }
    
    if(cura?.curado && cura?.resultado){
      const norm = normalizar(cura.resultado);
      if(norm){
        aprender(raw, cura.estrategia, norm.resultado); // guarda TEXTO, no objeto
        resultado = norm;
        log += `✅ Curado por ${cura.estrategia}\n`;
      }
    } else {
      // AIFallback en tu V3.2 ya es sync, no necesita await, pero await no le hace daño
      let ia = null;
      try{ ia = await AIFallback(raw); }catch(e){ log += `❌ AI-Fallback falló: ${e.message}\n`; }
      if(ia){
        const norm = normalizar(ia);
        if(norm){
          aprender(raw, "AI-fallback", norm.resultado);
          resultado = norm;
        }
      }
    }
  }

  const final = resultado ? normalizar(resultado) : null;

  // 4. CONTRATO ÚNICO: siempre devuelve resultado + result + log
  return {
    intent, 
    entities, 
    resultado: final?.resultado || "No pude resolverlo, enséñame",
    result: final?.resultado || "No pude resolverlo, enséñame",
    log
  };
}