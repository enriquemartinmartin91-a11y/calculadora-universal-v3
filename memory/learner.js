// Guarda qué estrategia funcionó para usarla primero la próxima
export function aprender(raw, estrategiaQueFunciono){
  let mem = JSON.parse(localStorage.getItem('universal_memory') || '{}');
  let key = raw.toLowerCase().slice(0,20); // primeras palabras como clave
  mem[key] = estrategiaQueFunciono;
  localStorage.setItem('universal_memory', JSON.stringify(mem));
  console.log("🧠 Aprendí:", key, "->", estrategiaQueFunciono);
}

export function queAprendi(){
  return JSON.parse(localStorage.getItem('universal_memory') || '{}');
}