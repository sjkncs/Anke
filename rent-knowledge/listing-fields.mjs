// Preserve disclosed source fields; keep community positions separate from street addresses.
export function listingFields(raw={}) {
 const text=(...keys)=>keys.map(k=>raw[k]).find(v=>v!==undefined&&v!==null&&String(v).trim()!=='')??'';
 const numeric=(...keys)=>{const v=text(...keys);if(v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
 const longitude=numeric('经度'),latitude=numeric('纬度'),crs=text('坐标系'),title=text('标题');
 return {title:text('标题'),address:text('详细地址','地址'),position:text('位置描述'),street:text('乡镇街道','街道','所属街道'),
  layout:text('户型','房屋户型')||String(title).match(/\d+室(?:\d+厅)?(?:\d+卫)?/)?.[0]||'',floor:text('楼层','所在楼层'),age:text('房龄'),buildingYear:text('建筑年份','建筑年代'),
  decoration:text('装修','装修情况'),orientation:text('朝向','房屋朝向'),
  elevator:text('电梯','有无电梯'),payment:text('付款方式','租金支付方式'),
  tags:text('标签'),imageUrl:text('图片URL'),description:text('列表描述'),totalFloors:text('总楼层'),households:text('总户数'),parking:text('车位'),metro:text('地铁配套'),amenities:text('周边配套'),moveIn:text('入住时间'),leaseTerm:text('租期'),viewing:text('看房'),
  fee:numeric('物业费_元每月'),fee_mode:text('物业费计收方式')||'未知',
  location:longitude!==null&&latitude!==null&&['GCJ02','WGS84','BD09'].includes(crs)?{longitude,latitude,crs}:null,
  lon:longitude,lat:latitude,sourceFields:raw};
}
