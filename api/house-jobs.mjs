import {getCache} from '@vercel/functions';
import {makeRelay} from '../server/house-jobs/relay.mjs';
import keys from '../server/house-jobs/station.json' with {type:'json'};

export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='POST')return res.status(405).end();
  if(!String(req.headers['content-type']??'').startsWith('application/json'))return res.status(415).end();
  try{
    if((req.headers.origin && new URL(req.headers.origin).host!==req.headers.host)||req.headers['sec-fetch-site']==='cross-site')return res.status(403).end();
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(JSON.stringify(body??{}).length>900000)return res.status(413).end();
    const relay=makeRelay({cache:getCache({namespace:'zbao-portfolio-house-jobs-v1'}),keys});
    return res.status(200).json(await relay(String(req.headers.authorization??'').replace(/^Bearer /,''),body));
  }catch(e){return res.status(e.status??503).json({error:e.status?e.message:'Workstation service unavailable.'});}
}
