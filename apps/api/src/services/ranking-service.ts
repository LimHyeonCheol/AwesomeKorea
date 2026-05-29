import type { InternalJobResult } from "@awesomekorea/shared";

interface RankingRow {
  categoryId: number;
  contentId: number;
  rankValue: number;
  reactionCount: number;
  totalViews: number;
}

const insertRankingRows = async (
  db: D1Database,
  rankType: "weekly" | "popular",
  snapshotDate: string,
  rows: RankingRow[],
) => {
  for (const row of rows) {
    await db
      .prepare(
        `
          INSERT INTO ranking_snapshots (
            content_id,
            category_id,
            rank_type,
            rank_value,
            reaction_count,
            total_views,
            snapshot_date
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        row.contentId,
        row.categoryId,
        rankType,
        row.rankValue,
        row.reactionCount,
        row.totalViews,
        snapshotDate,
      )
      .run();
  }
};

export const rebuildRankings = async (db: D1Database): Promise<InternalJobResult> => {
  const snapshotRow = await db
    .prepare(
      `
        SELECT COALESCE(date(MAX(published_at)), date('now')) AS snapshotDate
        FROM reaction_videos
        WHERE is_overseas_reaction = 1
      `,
    )
    .first<{ snapshotDate: string }>();

  const snapshotDate = snapshotRow?.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const weeklyWindowStart = await db
    .prepare("SELECT date(?, '-6 day') AS windowStart")
    .bind(snapshotDate)
    .first<{ windowStart: string }>();

  await db.batch([
    db
      .prepare(
        `
          DELETE FROM ranking_snapshots
          WHERE snapshot_date = ?
            AND rank_type = 'weekly'
        `,
      )
      .bind(snapshotDate),
    db
      .prepare(
        `
          DELETE FROM ranking_snapshots
          WHERE snapshot_date = ?
            AND rank_type = 'popular'
        `,
      )
      .bind(snapshotDate),
  ]);

  const weeklyRows = await db
    .prepare(
      `
        WITH aggregated AS (
          SELECT
            c.id AS contentId,
            c.category_id AS categoryId,
            COUNT(rv.id) AS reactionCount,
            COALESCE(SUM(rv.view_count), 0) AS totalViews
          FROM contents c
          JOIN reaction_videos rv
            ON rv.content_id = c.id
          WHERE c.status = 'active'
            AND rv.is_overseas_reaction = 1
            AND date(rv.published_at) BETWEEN date(?) AND date(?)
          GROUP BY c.id, c.category_id
        ),
        ranked AS (
          SELECT
            contentId,
            categoryId,
            reactionCount,
            totalViews,
            ROW_NUMBER() OVER (
              ORDER BY reactionCount DESC, totalViews DESC, contentId ASC
            ) AS rankValue
          FROM aggregated
          WHERE reactionCount > 0
        )
        SELECT
          contentId,
          categoryId,
          reactionCount,
          totalViews,
          rankValue
        FROM ranked
      `,
    )
    .bind(weeklyWindowStart?.windowStart ?? snapshotDate, snapshotDate)
    .all<RankingRow>();

  const popularRows = await db
    .prepare(
      `
        WITH aggregated AS (
          SELECT
            c.id AS contentId,
            c.category_id AS categoryId,
            COUNT(rv.id) AS reactionCount,
            COALESCE(SUM(rv.view_count), 0) AS totalViews
          FROM contents c
          JOIN reaction_videos rv
            ON rv.content_id = c.id
          WHERE c.status = 'active'
            AND rv.is_overseas_reaction = 1
          GROUP BY c.id, c.category_id
        ),
        ranked AS (
          SELECT
            contentId,
            categoryId,
            reactionCount,
            totalViews,
            ROW_NUMBER() OVER (
              ORDER BY totalViews DESC, reactionCount DESC, contentId ASC
            ) AS rankValue
          FROM aggregated
          WHERE reactionCount > 0
        )
        SELECT
          contentId,
          categoryId,
          reactionCount,
          totalViews,
          rankValue
        FROM ranked
      `,
    )
    .all<RankingRow>();

  await insertRankingRows(db, "weekly", snapshotDate, weeklyRows.results ?? []);
  await insertRankingRows(db, "popular", snapshotDate, popularRows.results ?? []);

  return {
    success: true,
    processedCount: (weeklyRows.results?.length ?? 0) + (popularRows.results?.length ?? 0),
    updatedCount: (weeklyRows.results?.length ?? 0) + (popularRows.results?.length ?? 0),
    skippedCount: 0,
    summary: `랭킹 스냅샷 ${snapshotDate} 기준으로 weekly/popular를 재생성했습니다.`,
    errors: [],
    snapshotDate,
  };
};
