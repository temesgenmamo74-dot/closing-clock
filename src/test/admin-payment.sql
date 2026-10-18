-- Integration test: all writes are rolled back by a caught subtransaction exception.
DO $$
DECLARE owner_id uuid; payment_id uuid := gen_random_uuid(); original_until timestamptz; first_until timestamptz; second_until timestamptz; payment_count integer;
BEGIN
 SELECT user_id INTO owner_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Test requires an admin'; END IF;
 BEGIN
  PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
  SELECT paid_until INTO original_until FROM public.profiles WHERE id = owner_id;
  PERFORM public.record_admin_payment(payment_id,owner_id,365,2000,'Integration test rollback');
  SELECT paid_until INTO first_until FROM public.profiles WHERE id = owner_id;
  IF first_until <> greatest(coalesce(original_until,now()),now()) + interval '365 days' THEN RAISE EXCEPTION 'Expiry extension mismatch'; END IF;
  PERFORM public.record_admin_payment(payment_id,owner_id,365,2000,'Integration test rollback');
  SELECT paid_until INTO second_until FROM public.profiles WHERE id = owner_id;
  SELECT count(*) INTO payment_count FROM public.payments WHERE id = payment_id AND amount = 2000 AND days = 365 AND recorded_by = owner_id;
  IF payment_count <> 1 OR second_until <> first_until THEN RAISE EXCEPTION 'Retry duplicated payment or expiry'; END IF;
  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  BEGIN
   PERFORM public.record_admin_payment(gen_random_uuid(),owner_id,365,2000,'Denied test');
   RAISE EXCEPTION 'Non-admin payment unexpectedly accepted';
  EXCEPTION WHEN OTHERS THEN
   IF SQLERRM <> 'Forbidden' THEN RAISE; END IF;
  END;
  RAISE EXCEPTION USING ERRCODE = 'Z0001', MESSAGE = 'rollback successful test';
 EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.payments WHERE id = payment_id) THEN RAISE EXCEPTION 'Test failed to roll back'; END IF;
END $$;
