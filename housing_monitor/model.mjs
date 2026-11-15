export const districts=['南山','福田','罗湖','盐田','宝安','龙华','龙岗','坪山','光明','大鹏新区'];
const categories=e=>e.categories?.length?e.categories:[e.category||'城市动态'];
export function selectEvents(events=[],{district='',query='',category=''}={}){
  if(!Array.isArray(events))throw Error('Invalid events');
  return events.filter(e=>(!district||(e.districts||[]).includes(district))&&(!category||categories(e).includes(category))&&(!query||[e.title,e.body,...(e.places||[])].join(' ').includes(query)))
    .sort((a,b)=>String(b.publishedAt||b.published||b.updatedAt||'').localeCompare(String(a.publishedAt||a.published||a.updatedAt||'')));
}
export function validateGeoJSON(data){
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length>30000)throw Error('请选择 GeoJSON 图层');
  let vertices=0;
  function coordinates(value){
    if(!Array.isArray(value)||!value.length)throw Error('坐标无效');
    if(typeof value[0]==='number'){
      vertices++;if(vertices>300000||value.length<2||!value.every(Number.isFinite)||value[0]<113.6||value[0]>114.7||value[1]<22.35||value[1]>22.95)throw Error('坐标应位于深圳');
    }else for(const child of value)coordinates(child);
  }
  for(const f of data.features){
    if(f?.type!=='Feature'||!['Polygon','MultiPolygon','LineString','MultiLineString','Point'].includes(f.geometry?.type))throw Error('图层类型不支持');
    coordinates(f.geometry.coordinates);
    const height=f.properties?.height;
    if(height!==undefined&&(!Number.isFinite(height)||height<0||height>1000))throw Error('建筑高度无效');
  }
  return data;
}
export function buildMonitor({eventData={},market={},units=[],filters={}}={}){
  const events=selectEvents(eventData.events||[],filters).map(e=>({...e,category:categories(e).join(' · ')}));
  const homes=units.filter(u=>!filters.district||String(u.district||'').replace(/区$/,'')===filters.district);
  const topics=Object.entries(events.reduce((r,e)=>{for(const key of categories(e))r[key]=(r[key]||0)+1;return r;},{})).sort((a,b)=>b[1]-a[1]);
  return {events,homes,topics,market,generatedAt:eventData.generatedAt||null,sources:eventData.sources||[],
    metrics:{events:events.length,active:events.filter(e=>e.status==='active').length,homes:homes.length,listings:market.count||0},
    brief:topics.slice(0,4).map(([title,count])=>({title,count,eventIds:events.filter(e=>categories(e).includes(title)).map(e=>e.id)}))};
}
