import { createClient } from '@supabase/supabase-js';
import type { Movie } from './movies';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const localTest=import.meta.env.DEV && import.meta.env.VITE_LOCAL_TEST==='1';
export const configured=localTest||Boolean(url&&key&&!url.includes('YOUR_PROJECT'));
export const auth=!localTest&&configured?createClient(url,key):null;
export type CalendarData={id:string;name:string;year:number;version:number;sharingLocked:boolean;isOwner:boolean;canEdit:boolean;closed:boolean;serverNow:string;movies:Movie[];shareToken?:string};
export type Summary=Pick<CalendarData,'id'|'name'|'year'>;
export class ApiError extends Error{constructor(public status:number,message:string,public requestId?:string){super(message);}}
export async function api<T>(path='',method='GET',data?:unknown,guest?:string):Promise<T>{
 if(!configured)throw Error('Online saving needs Supabase setup. Your draft is still here.');
 let jwt:string|undefined;
 if(localTest){if(sessionStorage.getItem('calendar-test-owner')==='yes')jwt='local-test-owner';}
 else{const result=await auth!.auth.getSession();if(result.error)throw Error('Please sign in again.');jwt=result.data.session?.access_token;}
 const base=localTest?'http://127.0.0.1:4393':url;
 const response=await fetch(`${base}/functions/v1/calendar-api/calendars${path}`,{method,cache:'no-store',signal:AbortSignal.timeout(15000),
  headers:{...(key?{apikey:key}:{}),...(jwt?{Authorization:`Bearer ${jwt}`} : {}),...(guest?{'X-Calendar-Token':guest}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new ApiError(response.status,result.error??'The request failed.',result.requestId);
 return result;
}
