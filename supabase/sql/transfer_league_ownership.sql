-- Transfer league ownership safely via a definer function
-- Apply this in Supabase SQL editor or your migrations

create or replace function public.transfer_league_ownership(
  p_league_id bigint,
  p_new_owner_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_owner uuid;
  v_is_member boolean;
begin
  -- Ensure league exists and fetch current owner
  select owner_id into v_old_owner from public.leagues where id = p_league_id;
  if v_old_owner is null then
    raise exception 'League % not found', p_league_id using errcode = 'P0002';
  end if;

  -- Only current owner can transfer
  if v_old_owner <> auth.uid() then
    raise exception 'Only the current owner can transfer ownership' using errcode = '42501';
  end if;

  -- No-op if same owner
  if p_new_owner_id = v_old_owner then
    return;
  end if;

  -- New owner must already be a league member
  select exists(
    select 1 from public.league_members lm
    where lm.league_id = p_league_id and lm.user_id = p_new_owner_id
  ) into v_is_member;

  if not v_is_member then
    raise exception 'New owner must be an existing league member' using errcode = '23514';
  end if;

  -- Perform transfer
  update public.leagues
  set owner_id = p_new_owner_id
  where id = p_league_id;

  -- Downgrade previous owner to member
  update public.league_members
  set role = 'member'
  where league_id = p_league_id and user_id = v_old_owner;

  -- Promote new owner to admin
  update public.league_members
  set role = 'admin'
  where league_id = p_league_id and user_id = p_new_owner_id;
end;
$$;

-- Tighten function execution: only authenticated can call
revoke all on function public.transfer_league_ownership(bigint, uuid) from public;
grant execute on function public.transfer_league_ownership(bigint, uuid) to authenticated;
