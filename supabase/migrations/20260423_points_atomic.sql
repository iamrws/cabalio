-- Rank 3 fix: atomic points + ledger + audit mutations.
-- Closes H-04 / SEC-006 / MED12 (for the admin_points path; submission
-- review and quest award will follow in subsequent ranks).
--
-- Moves the three-step (user update, ledger insert, audit insert) into a
-- single transaction. Also clamps total_xp at 0 so cascade-reject penalties
-- (N-11) can never drive a user negative.

create or replace function public.apply_points_adjustment_atomic(
  p_wallet text,
  p_delta integer,
  p_entry_type text,
  p_submission_id uuid,
  p_metadata jsonb,
  p_audit_action text,
  p_audit_actor text,
  p_audit_details jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_xp integer;
  v_new_xp integer;
  v_ledger_id uuid;
begin
  if p_delta = 0 then
    raise exception 'points_delta_must_be_nonzero' using errcode = 'P2001';
  end if;
  if p_entry_type is null then
    raise exception 'entry_type_required' using errcode = 'P2002';
  end if;

  -- Row lock on user so concurrent mutations serialize.
  select coalesce(total_xp, 0)
    into v_current_xp
    from public.users
   where wallet_address = p_wallet
   for update;

  if not found then
    raise exception 'user_not_found' using errcode = 'P2003';
  end if;

  v_new_xp := greatest(0, v_current_xp + p_delta);

  update public.users
     set total_xp = v_new_xp,
         updated_at = now()
   where wallet_address = p_wallet;

  insert into public.points_ledger (
    wallet_address, entry_type, points_delta, submission_id, metadata, created_at
  ) values (
    p_wallet, p_entry_type, p_delta, p_submission_id,
    coalesce(p_metadata, '{}'::jsonb), now()
  ) returning id into v_ledger_id;

  if p_audit_action is not null then
    insert into public.audit_logs (
      action, actor_wallet, target_wallet, details, created_at
    ) values (
      p_audit_action, p_audit_actor, p_wallet,
      coalesce(p_audit_details, '{}'::jsonb), now()
    );
  end if;

  return jsonb_build_object(
    'ledger_id', v_ledger_id,
    'previous_xp', v_current_xp,
    'new_xp', v_new_xp,
    'applied_delta', v_new_xp - v_current_xp
  );
end;
$$;

revoke execute on function public.apply_points_adjustment_atomic(
  text, integer, text, uuid, jsonb, text, text, jsonb
) from public, anon, authenticated;
