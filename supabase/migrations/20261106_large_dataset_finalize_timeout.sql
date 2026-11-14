begin;

-- The authenticated REST role defaults to an 8 second statement timeout.
-- Final integrity reconciliation for large datasets is intentionally atomic and
-- can exceed that limit on shared compute. Keep the exception scoped to this
-- function rather than weakening the timeout for every authenticated query.
alter function public.complete_normalized_dataset_sync(uuid)
  set statement_timeout = '60s';

commit;
