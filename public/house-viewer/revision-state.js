// Coordinate systems and safe navigation are checked independently of visual appearance.
export function chooseRevisionPose({previous, previousFrame, frame, stations, rooms, safe, contains}) {
  if (previous && previousFrame && previousFrame === frame && safe(previous.position)) return {pose:previous, reason:'preserved'};
  const ordered=[...stations].sort((a,b)=>rank(a)-rank(b));
  function rank(s) {
    if(!previous && s.station==='living_wide')return -1;
    const room=rooms.find(r=>contains(s.position[0],s.position[1],r.polygon));
    if(previous && previousFrame===frame && room?.id===previous.room)return 0;
    if(/entry|entrance/.test(s.station))return 1;
    if(s.station==='living_wide')return 2;
    return 3;
  }
  for(const s of ordered) {
    const position=[s.position[0],s.position[2] ?? 1.6,-s.position[1]];
    if(safe(position))return {pose:{position,yaw:s.yaw-Math.PI/2,pitch:s.pitch,station:s.station,zoom:previous?.zoom||1,room:rooms.find(r=>contains(position[0],-position[2],r.polygon))?.id||''},reason:previous?'relocated':'initial'};
  }
  return {pose:null,reason:'modelOnly'};
}

export function disposeModel(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set();
  root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)materials.add(m);});
  for(const m of materials)for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
  for(const g of geometries)g.dispose();
  for(const m of materials)m.dispose();
  for(const t of textures){if(t.source?.data)images.add(t.source.data);t.dispose();}
  for(const i of images)i.close?.();
}
