export function Funcion(raw){
  const t=raw.replace(/,/g,'.').toLowerCase();
  const m=t.match(/f\s*\(\s*([0-9\.\-]+)\s*\)\s*=\s*([0-9x\.\+\-\*\/\^\(\) ]+)/);
  if(!m) return "f(4)=5x-3";
  let xVal=parseFloat(m[1]), expr=m[2];
  let exprClean=expr.replace(/(\d)([a-z])/g,'$1*$2').replace(/\^/g,'**').replace(/x/g,`(${xVal})`);
  let res=Function('"use strict";return ('+exprClean+')')();
  return `✅ DOMAIN: math/funcion.js\nf(${xVal})=${expr}\n👉 f(${xVal})=${res}`;
}