CREATE OR REPLACE FUNCTION public.record_admin_payment(_id uuid, _user_id uuid, _days integer, _amount numeric, _note text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_until timestamptz; v_existing public.payments%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _days IS NULL OR _days < 1 OR _days > 3650 OR _amount IS NULL OR _amount <= 0 OR _amount > 10000000 OR length(coalesce(_note,'')) > 1000 THEN RAISE EXCEPTION 'Invalid payment'; END IF;
 SELECT paid_until INTO v_until FROM public.profiles WHERE id = _user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
 SELECT * INTO v_existing FROM public.payments WHERE id = _id;
 IF FOUND THEN
   IF v_existing.user_id <> _user_id OR v_existing.days <> _days OR v_existing.amount <> _amount OR coalesce(v_existing.note,'') <> coalesce(_note,'') THEN RAISE EXCEPTION 'Payment conflict'; END IF;
   RETURN _id;
 END IF;
 INSERT INTO public.payments(id,user_id,days,amount,note,recorded_by) VALUES(_id,_user_id,_days,_amount,_note,auth.uid());
 UPDATE public.profiles SET paid_until = greatest(coalesce(v_until,now()),now()) + make_interval(days => _days) WHERE id = _user_id;
 RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_admin_payment(uuid,uuid,integer,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_admin_payment(uuid,uuid,integer,numeric,text) TO authenticated;
