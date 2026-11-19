-- Editable document labels (signature titles printed in vouchers/reports).
-- Additive and safe: the column has a constant default, so existing rows and
-- older code that ignores it keep working. The API and the UI fall back to the
-- built-in Arabic defaults whenever a key is missing or empty.

alter table public.fund_settings
  add column if not exists custom_labels jsonb not null default '{}'::jsonb;

comment on column public.fund_settings.custom_labels is
  'Administrator-editable document labels (signature titles) keyed by document type: receipt, expense, member, report.';
