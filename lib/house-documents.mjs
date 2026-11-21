const allowed=new Set(['interior-study']);
export function getHouseDocuments(catalog) {
  if(catalog?.documents?.schema!==1||!Array.isArray(catalog.documents.items))return [];
  const seen=new Set();
  return catalog.documents.items.filter(item=>{
    if(!allowed.has(item?.id)||seen.has(item.id)||typeof item.title!=='string'||item.title.length>80||
      !/^asset-[a-f0-9]{64}$/.test(item.assetId)||item.mime!=='text/html')return false;
    seen.add(item.id);return true;
  });
}
export function isolateHouseDocument(html) {
  // Authenticated authored documents still get no network, forms or parent DOM access.
  const policy="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}">`+html.replace(/<!doctype html>/i,'');
}
