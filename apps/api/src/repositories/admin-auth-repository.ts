interface AdminAuthUserRow {
  displayName: string;
  id: number;
  isActive: number;
  loginId: string;
  passwordHash: string;
}

export interface AdminAuthUser {
  displayName: string;
  id: number;
  isActive: boolean;
  loginId: string;
  passwordHash: string;
}

const mapAdminAuthUser = (row: AdminAuthUserRow): AdminAuthUser => ({
  id: Number(row.id),
  loginId: row.loginId,
  passwordHash: row.passwordHash,
  displayName: row.displayName,
  isActive: row.isActive === 1,
});

export const getAdminUserByLoginId = async (
  db: D1Database,
  loginId: string,
): Promise<AdminAuthUser | null> => {
  const row = await db
    .prepare(
      `
        SELECT
          id,
          login_id AS loginId,
          password_hash AS passwordHash,
          display_name AS displayName,
          is_active AS isActive
        FROM admin_users
        WHERE login_id = ?
        LIMIT 1
      `,
    )
    .bind(loginId)
    .first<AdminAuthUserRow>();

  return row ? mapAdminAuthUser(row) : null;
};
