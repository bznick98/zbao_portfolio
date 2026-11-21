const asset = id => typeof id==='string' && /^asset-[a-f0-9]{64}$/.test(id);
const version = id => typeof id==='string' && /^[0-9]+(?:[.][0-9]+)+$/.test(id);
export function getHouseDocuments(catalog, revisionId = undefined) {
  if (catalog?.documents?.schema !== 1 || !Array.isArray(catalog.documents.items)) return [];
  const seen = new Set();
  return catalog.documents.items.filter(item => {
    if (!item || typeof item.title!=='string' || item.title.length>80 || !asset(item.assetId)) return false;
    const legacy = item.id==='interior-study' && item.mime==='text/html';
    const pdf = version(item.revisionId) && item.kind==='design-report' && item.id==='design-report-'+item.revisionId && item.mime==='application/pdf' &&
      Array.isArray(item.pages) && item.pages.length>0 && item.pages.every(p=>asset(p?.assetId)) &&
      catalog.revisions?.some(r=>r.revisionId===item.revisionId && r.revisionDigest===item.revisionDigest);
    if ((!legacy && !pdf) || seen.has(item.id)) return false;
    if (revisionId !== undefined && (item.revisionId || (legacy?'0.2':null))!==revisionId) return false;
    seen.add(item.id);return true;
  });
}
export function isolateHouseDocument(html) {
  // Authenticated authored documents still get no network, forms or parent DOM access.
  const policy="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}">`+html.replace(/<!doctype html>/i,'');
}
