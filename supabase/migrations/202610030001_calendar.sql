begin;
create table public.calendars (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 80),
 year integer not null check(year between 2020 and 2200),
 sharing_locked boolean not null default false,
 share_hash text not null check(share_hash ~ '^[a-f0-9]{64}$'),
 version integer not null default 1,
 created_at timestamptz not null default now()
);
create index calendars_owner on public.calendars(owner_id);
create table public.calendar_movies (
 calendar_id uuid not null references public.calendars(id) on delete cascade,
 day integer not null check(day between 1 and 24),
 title text not null check(char_length(btrim(title)) between 1 and 120),
 primary key(calendar_id,day)
);
create table public.calendar_limits(bucket text primary key, window_start timestamptz not null, hits integer not null);
alter table public.calendars enable row level security;
alter table public.calendar_movies enable row level security;
alter table public.calendar_limits enable row level security;
revoke all on public.calendars, public.calendar_movies, public.calendar_limits from anon, authenticated;
-- No browser policies: all access passes through the checked server API.
create function public.calendar_now() returns timestamptz language sql volatile set search_path='' as $$ select clock_timestamp(); $$;
create function public.calendar_rate(p_bucket text,p_limit integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 delete from public.calendar_limits where window_start < clock_timestamp()-interval '2 minutes';
 insert into public.calendar_limits values(p_bucket,date_trunc('minute',clock_timestamp()),1)
 on conflict(bucket) do update set hits=case when calendar_limits.window_start=excluded.window_start then calendar_limits.hits+1 else 1 end, window_start=excluded.window_start
 returning hits into n;
 return n<=p_limit;
end; $$;
create function public.calendar_api(p_action text,p_actor uuid,p_id uuid,p_hash text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.calendars; is_owner boolean; closed boolean; may_edit boolean; t timestamptz;
 yr integer := extract(year from public.calendar_now() at time zone 'UTC'); m jsonb; titles jsonb; n integer;
begin
 if p_action='list' then
  if p_actor is null then raise sqlstate 'PT401' using message='Sign in to see your calendars.'; end if;
  return jsonb_build_object('calendars',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'year',year) order by created_at desc) from public.calendars where owner_id=p_actor),'[]'::jsonb));
 end if;
 if p_action='create' then
  if p_actor is null then raise sqlstate 'PT401' using message='Verify your email to save a calendar.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
  select count(*) into n from public.calendars where owner_id=p_actor;
  if n>=20 then raise sqlstate 'PT429' using message='You can keep up to 20 calendars.'; end if;
  if jsonb_typeof(p_data->'name') is distinct from 'string' or char_length(btrim(p_data->>'name')) not between 1 and 80 or jsonb_typeof(p_data->'year') is distinct from 'number' or (p_data->>'year') !~ '^[0-9]{4}$' then
   raise sqlstate 'PT400' using message='Enter a name of 1–80 characters and a valid year.';
  end if;
  if (p_data->>'year')::integer not between yr and yr+1 then raise sqlstate 'PT400' using message='Choose this year or next year.'; end if;
  if public.calendar_now() >= make_timestamptz((p_data->>'year')::integer,12,1,0,0,0,'UTC') then raise sqlstate 'PT403' using message='This year is closed. Choose next year.'; end if;
  insert into public.calendars(owner_id,name,year,share_hash) values(p_actor,btrim(p_data->>'name'),(p_data->>'year')::integer,p_hash) returning * into c;
 else
  -- Acquire the row lock BEFORE checking permissions and time. Writes are atomic.
  select * into c from public.calendars where id=p_id for update;
  if not found then raise sqlstate 'PT404' using message='Calendar not found or link no longer valid.'; end if;
  is_owner:=coalesce(c.owner_id=p_actor,false);
  if not is_owner and (p_hash is null or p_hash<>c.share_hash) then raise sqlstate 'PT404' using message='Calendar not found or link no longer valid.'; end if;
 end if;
 t:=public.calendar_now(); is_owner:=coalesce(c.owner_id=p_actor,false);
 closed:=t>=make_timestamptz(c.year,12,1,0,0,0,'UTC');
 may_edit:=not closed and (is_owner or not c.sharing_locked);
 if p_action='create' and closed then raise sqlstate 'PT403' using message='This year is closed. Choose next year.'; end if;
 if p_action='delete' then
  if not is_owner then raise sqlstate 'PT403' using message='Only the owner can delete this calendar.'; end if;
  -- Erasure is distinct from editing movies; owners retain control of their data.
  delete from public.calendars where id=c.id;
  return jsonb_build_object('deleted',true);
 end if;
 if p_action in ('update','lock','rotate') then
  if p_action in ('lock','rotate') and not is_owner then raise sqlstate 'PT403' using message='Only the owner can change sharing.'; end if;
  if p_action in ('update','lock') and not may_edit then raise sqlstate 'PT403' using message=case when closed then 'Movie editing closed on December 1 at 00:00 UTC.' else 'The owner locked shared editing.' end; end if;
  if jsonb_typeof(p_data->'version') is distinct from 'number' or (p_data->>'version') !~ '^[0-9]{1,9}$' then raise sqlstate 'PT400' using message='A valid version is required.'; end if;
  if (p_data->>'version')::integer<>c.version then raise sqlstate 'PT409' using message='Someone saved a newer version. Reload before saving.'; end if;
 end if;
 if p_action in ('create','update') then
  if jsonb_typeof(p_data->'movies') is distinct from 'array' then raise sqlstate 'PT400' using message='Provide 24 movie titles.'; end if;
  if jsonb_array_length(p_data->'movies')<>24 then raise sqlstate 'PT400' using message='Provide exactly 24 movie titles.'; end if;
  for m in select value from jsonb_array_elements(p_data->'movies') loop
   if jsonb_typeof(m->'day') is distinct from 'number' or (m->>'day') !~ '^([1-9]|1[0-9]|2[0-4])$' or jsonb_typeof(m->'title') is distinct from 'string' or char_length(btrim(m->>'title')) not between 1 and 120 then raise sqlstate 'PT400' using message='Each day needs a title of 1–120 characters.'; end if;
  end loop;
  select count(distinct value->>'day') into n from jsonb_array_elements(p_data->'movies');
  if n<>24 then raise sqlstate 'PT400' using message='Use each day from 1 to 24 exactly once.'; end if;
  delete from public.calendar_movies where calendar_id=c.id;
  insert into public.calendar_movies select c.id,(value->>'day')::integer,btrim(value->>'title') from jsonb_array_elements(p_data->'movies');
  if p_action='update' then update public.calendars set version=version+1 where id=c.id returning * into c; end if;
 elsif p_action='lock' then
  if jsonb_typeof(p_data->'locked') is distinct from 'boolean' then raise sqlstate 'PT400' using message='Locked must be true or false.'; end if;
  update public.calendars set sharing_locked=(p_data->>'locked')::boolean,version=version+1 where id=c.id returning * into c;
 elsif p_action='rotate' then
  if coalesce(p_data->>'share_hash','') !~ '^[a-f0-9]{64}$' then raise sqlstate 'PT400' using message='Invalid sharing key.'; end if;
  update public.calendars set share_hash=p_data->>'share_hash',version=version+1 where id=c.id returning * into c;
 elsif p_action<>'read' then raise sqlstate 'PT400' using message='Unknown operation.';
 end if;
 may_edit:=not closed and (is_owner or not c.sharing_locked);
 select jsonb_agg(jsonb_build_object('day',day,'title',case when may_edit or t>=make_timestamptz(c.year,12,day,0,0,0,'UTC') then title else '' end) order by day)
 into titles from public.calendar_movies where calendar_id=c.id;
 return jsonb_build_object('id',c.id,'name',c.name,'year',c.year,'version',c.version,'sharingLocked',c.sharing_locked,'isOwner',is_owner,'canEdit',may_edit,'closed',closed,'serverNow',t,'movies',titles);
end; $$;
revoke all on function public.calendar_now() from public,anon,authenticated;
revoke all on function public.calendar_rate(text,integer) from public,anon,authenticated;
revoke all on function public.calendar_api(text,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_rate(text,integer) to service_role;
grant execute on function public.calendar_api(text,uuid,uuid,text,jsonb) to service_role;
commit;
