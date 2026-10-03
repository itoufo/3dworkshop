/**
 * 管理画面へ返す顧客の列。
 * ⚠ `*` で取らない。customers にはログイン用の列（password_hash など）があり、
 *   管理画面の表示には要らない。画面へ送る列はここに書いたものだけにする。
 */
export const ADMIN_CUSTOMER_COLUMNS =
  'id, name, email, phone, age, gender, address, acquisition_source, created_at, updated_at'
