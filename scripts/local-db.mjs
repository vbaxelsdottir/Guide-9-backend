import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export const owner='11111111-1111-4111-8111-111111111111';
export const other='22222222-2222-4222-8222-222222222222';
export async function database(path){
 const db=new PGlite(path);
 const exists=(await db.query("select to_regclass('public.calendars') as name")).rows[0].name;
 if(!exists){
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema auth;create table auth.users(id uuid primary key);
   insert into auth.users values('${owner}'),('${other}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610030001_calendar.sql',import.meta.url),'utf8'));
 }
 return db;
}
export function rpcFor(db){return async(name,args)=>{try{
 let result;
 if(name==='calendar_rate')result=await db.query('select public.calendar_rate($1,$2) as data',[args.p_bucket,args.p_limit]);
 else if(name==='calendar_api')result=await db.query('select public.calendar_api($1,$2,$3,$4,$5::jsonb) as data',[args.p_action,args.p_actor,args.p_id,args.p_hash,JSON.stringify(args.p_data)]);
 else throw Error('Unknown RPC');
 return {data:result.rows[0].data,error:null};
 }catch(error){return {data:null,error:{code:error.code,message:error.message}};}};}
