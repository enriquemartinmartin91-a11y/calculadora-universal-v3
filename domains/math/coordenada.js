export function Coordenada(raw){
  const t=raw.replace(/,/g,'.').toLowerCase();
  const m=t.match(/\(?\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*\)?/);
  let x=parseFloat(m[1]), y=parseFloat(m[2]);
  let d=Math.sqrt(x*x+y*y).toFixed(2);
  return `✅ DOMAIN: math/coordenada.js\nPunto (${x},${y})\nDistancia origen: ${d}\nX=${x} Y=${y}`;
}