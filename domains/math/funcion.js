// domains/funcion.js V3.2 - Sin eval, sin Function, con parser matemático seguro
export function Funcion(raw, ent){
  const t = String(raw||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

  // 1. Busca varias formas: "f(4)=5x-3", "f(x)=5x-3, x=4", "5x-3 en x=4", "evalua 5x-3 en 4"
  let xVal = null, expr = null;

  const m1 = t.match(/f\s*\(\s*(-?\d+(?:[.,]\d+)?)\s*\)\s*=\s*([0-9x.,+\-*/^() ]+)/);
  const m2 = t.match(/f\s*\(\s*x\s*\)\s*=\s*([0-9x.,+\-*/^() ]+?)(?:,|\s+con|\s+x\s*=)\s*(-?\d+(?:[.,]\d+)?)/);
  const m3 = t.match(/([0-9x.,+\-*/^() ]+?)\s*(?:en|para|si|con)\s*x\s*=\s*(-?\d+(?:[.,]\d+)?)/);
  const m4 = t.match(/(?:evalua|calcula|cuanto es)\s*([0-9x.,+\-*/^() ]+?)\s*(?:en|para|si)\s*(?:x\s*=\s*)?(-?\d+(?:[.,]\d+)?)/);

  if(m1){ xVal = parseFloat(m1[1].replace(',','.')); expr = m1[2]; }
  else if(m2){ expr = m2[1]; xVal = parseFloat(m2[2].replace(',','.')); }
  else if(m3){ expr = m3[1]; xVal = parseFloat(m3[2].replace(',','.')); }
  else if(m4){ expr = m4[1]; xVal = parseFloat(m4[2].replace(',','.')); }
  else if(ent?.numbers?.length >= 2){
    // Último intento: si EntityExtractor ya sacó [4, 5, 3] y el texto tiene "5x-3", usa eso
    // No inventes "f(4)=5x-3" como ejemplo
    return null;
  } else {
    return null;
  }

  if(xVal == null || !expr || !isFinite(xVal)) return null;
  expr = expr.trim().replace(/,$/,'').replace(/\s+/g,'');

  // 2. SEGURIDAD: solo deja números, x, + - * / ^ ( ) . , Si hay otra letra, es intento de hackeo
  if(!/^[0-9x.,+\-*/^() ]+$/.test(expr)) return null;
  if(/alert|fetch|document|window|eval|function|constructor|__|process/.test(t)) return null;

  // 3. Parser seguro, sin Function / eval: convierte "5x-3", "2x^2+1", "x/2+3" a cálculo
  try{
    const res = evaluarExpresionSegura(expr, xVal);
    if(res == null || !isFinite(res)) return null;

    const texto = `f(${xVal})=${expr}\n👉 f(${xVal})=${res}`;

    return {
      resultado: texto,
      result: texto,
      valor: Number(res.toFixed(4)),
      unidad: "",
      detalle: { x: xVal, expresion: expr, resultado: Number(res.toFixed(4)) },
      formula: `f(${xVal}) = ${expr} = ${res}`,
      raw: texto
    };
  }catch(e){ return null; }
}

// Mini parser: soporta 5x, 2x^2, x^2+3x-1, (x+1)*2, x/2, etc. Sin eval.
function evaluarExpresionSegura(expr, x){
  let e = expr.replace(/,/g,'.').toLowerCase().trim();
  // 5x -> 5*x, x(x+1) -> x*(x+1), ) ( -> )*(
  e = e.replace(/(\d)(x)/g,'$1*$2')
       .replace(/(x)(\d)/g,'$1*$2')
       .replace(/(x)\(/g,'$1*(')
       .replace(/\)(x)/g,')*$1')
       .replace(/\)\(/g,')*(')
       .replace(/\^/g,'**');

  // Solo permite esta estructura, nada más
  if(!/^[0-9x+\-*/().* ]+$/.test(e)) throw new Error("expresion no permitida");
  // Reemplaza x por su valor entre paréntesis
  e = e.replace(/x/g, `(${x})`);

  // Evaluador recursivo simple por precedencia: () -> ** -> * / -> + -
  return evalSeguro(e);
}

function evalSeguro(e){
  e = e.trim();
  // Quita paréntesis externos si envuelven todo
  while(e.startsWith('(') && e.endsWith(')') && parentesisBalanceados(e)) e = e.slice(1,-1).trim();

  // Busca + - de menor precedencia fuera de paréntesis
  let depth = 0;
  for(let i = e.length-1; i >= 0; i--){
    const c = e[i];
    if(c === ')') depth++;
    if(c === '(') depth--;
    if(depth !== 0) continue;
    if((c === '+' || c === '-') && i > 0 && !"+-*/(".includes(e[i-1])){
      const izq = evalSeguro(e.slice(0,i));
      const der = evalSeguro(e.slice(i+1));
      return c === '+' ? izq + der : izq - der;
    }
  }
  // * /
  depth = 0;
  for(let i = e.length-1; i >= 0; i--){
    const c = e[i];
    if(c === ')') depth++;
    if(c === '(') depth--;
    if(depth !== 0) continue;
    if(c === '*' && e[i+1] !== '*'){
      return evalSeguro(e.slice(0,i)) * evalSeguro(e.slice(i+1));
    }
    if(c === '/'){
      const d = evalSeguro(e.slice(i+1));
      if(d === 0) throw new Error("division por cero");
      return evalSeguro(e.slice(0,i)) / d;
    }
    if(c === '*' && e[i+1] === '*'){
      return Math.pow(evalSeguro(e.slice(0,i)), evalSeguro(e.slice(i+1)));
    }
  }
  // Número solo
  const n = parseFloat(e);
  if(isFinite(n)) return n;
  throw new Error("no se pudo evaluar");
}

function parentesisBalanceados(s){
  let d = 0;
  for(let i=0;i<s.length;i++){
    if(s[i]==='(') d++;
    if(s[i]===')'){ d--; if(d===0 && i < s.length-1) return false; }
  }
  return d===0;
}