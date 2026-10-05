// Development only. This file is never imported into the deployed Edge Function.
import {database,rpcFor,owner} from './local-db.mjs';
import {httpServer} from './http-server.mjs';
import {createHandler} from '../supabase/functions/calendar-api/handler.js';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
await mkdir('.local-data',{recursive:true});
const db=await database('.local-data/postgres');
const handler=createHandler({rpc:rpcFor(db),user:async jwt=>jwt==='local-test-owner'?owner:null,origins:['http://127.0.0.1:4392'],log:e=>console.log(JSON.stringify(e))});
const server=httpServer(handler);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4393,'127.0.0.1',resolve);});
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4392','--strictPort'],{stdio:'inherit',env:{...process.env,VITE_LOCAL_TEST:'1'}});
console.log('LOCAL TEST MODE: real persistent PostgreSQL (PGlite); simulated owner; no email. Not a public deployment.');
let stopping=false;async function stop(){if(stopping)return;stopping=true;vite.kill();server.close();await db.close();process.exit();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);vite.on('exit',stop);
