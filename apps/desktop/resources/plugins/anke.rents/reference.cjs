const fs=require('node:fs'),path=require('node:path');
let cache;
function referenceClue(row){
 const file=path.join(__dirname,'data/reference-clues.json');
 if(!cache){if(!fs.existsSync(file))return null;cache=JSON.parse(fs.readFileSync(file,'utf8'));}
 const clue=cache[JSON.stringify([row.district,row.project])];
 return clue?{...clue,matchBasis:'exact_district_and_name_candidate',identityVerified:false,temporalUse:'2026-08 reference only; do not backfill earlier outcomes or overwrite disclosed values'}:null;
}
module.exports={referenceClue};
