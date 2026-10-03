-- 3Dプリント制作依頼（printing_orders）に、サイズ・個数・単価の列を足す。
--
-- 依頼フォームはこの3列へ書き込むようになっていたが、列を足す migration が無く、
-- DB に列が存在しなかった（存在しない列への INSERT は PostgREST が PGRST204 で弾くので、
-- フォームの送信は「注文の作成に失敗しました」で止まっていた。最後に入った依頼は 2025-12-12）。
--
-- 既存の2行はサイズ・個数の記録が無いので NULL のまま残す。

alter table public.printing_orders
  add column if not exists print_size text,
  add column if not exists print_quantity integer,
  add column if not exists unit_price integer;

comment on column public.printing_orders.print_size is 'サイズ区分（S / M / L）。lib/printing-order.ts の PRINT_SIZES';
comment on column public.printing_orders.print_quantity is '個数（1〜1000）';
comment on column public.printing_orders.unit_price is '1個あたりの造形費（円）。個数で決まる';
