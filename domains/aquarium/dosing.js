export function Dosing(raw, ent){
  let nums = ent.numbers;
  let total = nums.find(n=>n>=100) || 500;
  let base = nums.find(n=>n>=20 && n<100) || 80;
  let dosis = nums.find(n=>n<20) || 5;
  let r = (total/base)*dosis;
  return `✅ DOMAIN: aquarium/dosing.js\nVolumen: ${total}L\nBase: ${base}L Dosis: ${dosis}ml\n\n👉 ${r.toFixed(2)} ml de estroncio\nFormula: (${total}/${base})*${dosis}`;
}