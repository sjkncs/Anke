const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('C:/Users/Lenovo/AppData/Local/AnkeAgent/pi.sqlite',{readOnly:true});
console.log(db.prepare("SELECT name,base_url FROM providers WHERE lower(name) LIKE '%radius%' OR lower(name) LIKE '%jev%' OR lower(name) LIKE '%hugging%' OR name LIKE '%小米%'").all().map(row=>({name:row.name,host:(()=>{try{return new URL(row.base_url).hostname}catch{return 'invalid'}})()})));
const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for(const {name} of tables){
 if(!/provider|setting|config/i.test(name))continue;
 const cols=db.prepare(`PRAGMA table_info("${name.replaceAll('"','""')}")`).all();
 console.log(JSON.stringify({table:name,columns:cols.map(c=>c.name)}));
}
