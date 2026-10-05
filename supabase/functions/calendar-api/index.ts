import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { createHandler } from './handler.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createHandler({
 origins:(Deno.env.get('ALLOWED_ORIGINS')??'').split(',').map(x=>x.trim()).filter(Boolean),
 rpc:async(name:string,args:Record<string,unknown>)=>await admin.rpc(name,args),
 user:async(jwt:string)=>{const {data,error}=await admin.auth.getUser(jwt);return error?null:data.user?.id??null;},
 log:(event:Record<string,unknown>)=>console.log(JSON.stringify(event)),
}));
