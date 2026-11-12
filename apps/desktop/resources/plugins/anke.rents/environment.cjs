const CATEGORIES=['vegetation','water','road','building','public_service','open_space','other'];
const ALLOWED=['vegetation','water','road','building','public_service','open_space','other'];
function number(value,name,min=0){if(typeof value!=='number'||!Number.isFinite(value)||value<min)throw Error(`Invalid ${name}`);return value;}
function environment(input={}) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid environment request');
  const allowed=['action','project','longitude','latitude','radiusMeters','crs','imageId','imageSource','imageDate','resolutionMeters','model','segments'];
  if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error('Unknown environment field');
  const {action='measure',project,longitude,latitude,radiusMeters=500,crs,imageId,imageSource,imageDate,resolutionMeters,model,segments}=input;
  if(action!=='measure')throw Error('Unsupported environment operation');
  if(typeof project!=='string'||!project.trim()||project.length>200)throw Error('Project is required');
  number(longitude,'longitude');number(latitude,'latitude');
  if(longitude<-180||longitude>180||latitude<-90||latitude>90)throw Error('Invalid coordinate range');
  number(radiusMeters,'radiusMeters',50);if(radiusMeters>5000)throw Error('radiusMeters exceeds 5000');
  if(typeof crs!=='string'||!/^EPSG:\d+$/.test(crs))throw Error('CRS is required');
  if(typeof imageId!=='string'||!imageId.trim()||typeof imageSource!=='string'||!/^https?:\/\//.test(imageSource))throw Error('Image provenance is required');
  if(typeof imageDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(imageDate))throw Error('Image date is required');
  number(resolutionMeters,'resolutionMeters',0.01);if(resolutionMeters>100)throw Error('Resolution is too coarse');
  if(typeof model!=='string'||!model.trim()||model.length>200)throw Error('Segmentation model is required');
  if(!Array.isArray(segments)||!segments.length)return {status:'awaiting_segments',project,unit:'percent',radiusMeters,provenance:{imageId,imageSource,imageDate,crs,resolutionMeters,model},message:'尚未提供 GeoSegSAM 分割结果，不能计算住宅周边环境。'};
  const totals=Object.fromEntries(CATEGORIES.map(k=>[k,0]));
  for(const segment of segments){
    if(!segment||!ALLOWED.includes(segment.category))throw Error('Invalid segment category');
    number(segment.areaSqm,'segment areaSqm',0);number(segment.distanceMeters,'segment distanceMeters',0);
    if(segment.distanceMeters>radiusMeters)continue;
    totals[segment.category]+=segment.areaSqm;
  }
  const area=Math.PI*radiusMeters*radiusMeters;const percentages=Object.fromEntries(CATEGORIES.map(k=>[k,Number((totals[k]/area*100).toFixed(2))]));
  const impervious=percentages.road+percentages.building;const amenity=percentages.vegetation+percentages.water+percentages.open_space+percentages.public_service;
  return {status:'measured',project,unit:'percent',radiusMeters,areaSqm:Number(area.toFixed(2)),areasSqm:totals,percentages,
    indicators:{greenBlueOpenSpace:percentages.vegetation+percentages.water+percentages.open_space,publicService:percentages.public_service,imperviousSurface:impervious,amenitySurface:amenity},
    provenance:{imageId,imageSource,imageDate,crs,resolutionMeters,model,segmentCount:segments.length},
    interpretation:'指标仅反映输入影像和分割结果在住宅点指定半径内的面积构成，不等同于可达性、噪声、空气质量或居住品质评价。'};
}
module.exports={environment,CATEGORIES};
