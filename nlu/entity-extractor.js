export function EntityExtractor(raw){
  let clean = raw.toLowerCase().replace(/quinientos/g,'500').replace(/cien/g,'100').replace(/ochenta/g,'80').replace(/cinco/g,'5');
  let numbers = [...clean.matchAll(/-?\d*\.?\d+/g)].map(m=>parseFloat(m[0]));
  return { numbers, raw };
}