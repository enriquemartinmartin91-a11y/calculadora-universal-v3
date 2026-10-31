export function Division(raw, ent){
  let nums = ent.numbers;
  let total = nums.find(n=>n>=100) || nums[0] || 500;
  let partes = nums.find(n=>n>=2 && n<100) || nums[1] || 80;
  let cada = total/partes;
  return `✅ DOMAIN: math/division.js\n${total} / ${partes} = ${cada.toFixed(4)}\n\n👉 ${cada.toFixed(2)} por parte\nSi es dosis: ${(total/partes*5).toFixed(2)} ml (si usas 5ml base)`;
}