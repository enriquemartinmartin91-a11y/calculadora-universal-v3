// wall.js
export function Wall(raw){
  const t=raw.replace(/,/g,'.').toLowerCase();
  const mp=t.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  let a=parseFloat(mp[1]), b=parseFloat(mp[2]);
  return `✅ DOMAIN: construction/wall.js\n${a}x${b}=${a*b} m² | ${(a*b/10).toFixed(2)}L`;
}
// addition.js
export function Addition(raw, ent){
  return `✅ DOMAIN: math/addition.js\nSuma: ${ent.numbers.join('+')} = ${ent.numbers.reduce((x,y)=>x+y,0)}`;
}