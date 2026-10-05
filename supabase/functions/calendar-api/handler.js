// Shared by the hosted Edge Function and local integration tests.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
function token(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
class Failure extends Error{constructor(status,message){super(message);this.status=status;}}
async function jsonBody(req){
 if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new Failure(415,'Send JSON.');
 const reader=req.body?.getReader();let size=0;const chunks=[];
 if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();throw new Failure(413,'Request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
 try{const data=JSON.parse(new TextDecoder().decode(bytes));if(!data||Array.isArray(data)||typeof data!=='object')throw Error();return data;}catch{throw new Failure(400,'Send a valid JSON object.');}
}
export function createHandler({rpc,user,origins,log}){return async(req)=>{
 const requestId=crypto.randomUUID(),origin=req.headers.get('origin');let action='unknown';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Request-Id':requestId,'Vary':'Origin','Access-Control-Expose-Headers':'X-Request-Id, Retry-After'};
 if(origin&&origins.includes(origin))headers['Access-Control-Allow-Origin']=origin;
 const respond=(status,data)=>{log({requestId,method:req.method,action,status});if(status===429)headers['Retry-After']='60';return new Response(JSON.stringify(data),{status,headers});};
 async function call(name,args){const {data,error}=await rpc(name,args);if(error){const status=/^PT(400|401|403|404|409|429)$/.test(error.code??'')?Number(error.code.slice(2)):500;throw new Failure(status,status===500?'The server could not complete the request.':error.message);}return data;}
 try{
  if(origin&&!origins.includes(origin))throw new Failure(403,'Website not allowed.');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-calendar-token'}});
  // Coarse project-wide cap also bounds callers changing untrusted guest IDs.
  if(!await call('calendar_rate',{p_bucket:'global',p_limit:1200}))throw new Failure(429,'Too many requests. Try again in a minute.');
  // The hosted gateway removes /functions/v1 before invoking the function.
  const pathname=new URL(req.url).pathname.replace(/^\/functions\/v1(?=\/)/,'');const prefix='/calendar-api/calendars';
  if(pathname!==prefix&&!pathname.startsWith(prefix+'/'))throw new Failure(404,'Route not found.');
  const parts=pathname.slice(prefix.length).split('/').filter(Boolean),id=parts[0]??null,sub=parts[1];
  if(parts.length>2||(id&&!uuid.test(id)))throw new Failure(404,'Route not found.');
  if(!id&&req.method==='GET')action='list';else if(!id&&req.method==='POST')action='create';
  else if(id&&!sub&&req.method==='GET')action='read';else if(id&&!sub&&req.method==='PATCH')action='update';else if(id&&!sub&&req.method==='DELETE')action='delete';
  else if(id&&sub==='sharing'&&req.method==='PATCH')action='lock';else if(id&&sub==='share-link'&&req.method==='POST')action='rotate';else throw new Failure(405,'Method or route not supported.');
  let actor=null;const auth=req.headers.get('authorization');
  if(auth){if(!auth.startsWith('Bearer '))throw new Failure(401,'Sign in again.');actor=await user(auth.slice(7));if(!actor)throw new Failure(401,'Your session expired. Sign in again.');}
  const share=req.headers.get('x-calendar-token');if(share&&!/^[a-f0-9]{64}$/.test(share))throw new Failure(404,'Calendar not found or link no longer valid.');
  const shareHash=share?await hash(share):null;
  if(!await call('calendar_rate',{p_bucket:actor?'owner:'+actor:shareHash?'guest:'+shareHash:'anonymous',p_limit:90}))throw new Failure(429,'Too many requests. Try again in a minute.');
  const allowed={create:['name','year','movies'],update:['movies','version'],lock:['locked','version'],rotate:['version']};
  const data=allowed[action]?await jsonBody(req):{};
  if(Object.keys(data).some(k=>!allowed[action].includes(k)))throw new Failure(400,'Unexpected field in request.');
  const newToken=['create','rotate'].includes(action)?token():null,newHash=newToken?await hash(newToken):null;
  if(action==='rotate')data.share_hash=newHash;
  const result=await call('calendar_api',{p_action:action,p_actor:actor,p_id:id,p_hash:action==='create'?newHash:shareHash,p_data:data});
  return respond(action==='create'?201:200,{...result,...(newToken?{shareToken:newToken}:{})});
 }catch(e){return respond(e instanceof Failure?e.status:500,{error:e instanceof Failure?e.message:'The server could not complete the request.',requestId});}
};}
