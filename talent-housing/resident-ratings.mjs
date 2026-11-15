import {date} from './core.mjs';

// Imported aggregate survey evidence, never a generated satisfaction estimate.
export function validateResidentRating(value){
  if(value==null)return;
  if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['score','count','source','verifiedOn'].includes(k)))throw Error('Invalid resident rating');
  if(typeof value.score!=='number'||!Number.isFinite(value.score)||value.score<0||value.score>5)throw Error('Resident rating must be on a 0-5 scale');
  if(!Number.isInteger(value.count)||value.count<1||value.count>1000000)throw Error('Resident rating requires a positive response count');
  if(typeof value.source!=='string'||!value.source.trim()||value.source.length>500)throw Error('Resident rating source required');
  date(value.verifiedOn);
}

export function residentRating(unit,asOf){
  const value=unit.residentRating;
  return value&&value.verifiedOn<=asOf?{...value}:null;
}
