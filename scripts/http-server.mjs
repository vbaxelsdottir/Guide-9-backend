import {createServer} from 'node:http';
import {Readable} from 'node:stream';
export function httpServer(handler){return createServer(async(req,res)=>{
 try{
 const body=['GET','HEAD'].includes(req.method)?undefined:Readable.toWeb(req);
 const request=new Request(`http://127.0.0.1${req.url}`,{method:req.method,headers:req.headers,...(body?{body,duplex:'half'}:{})});
 const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end('{"error":"Request failed."}');}
});}
