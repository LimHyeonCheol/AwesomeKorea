import { useEffect, useState } from "react";

import type {
  AdminContent,
  AdminProfile,
  AdminReactionVideo,
  Category,
  ContentStatus,
} from "@awesomekorea/shared";

import { SectionHeader } from "../../components/common/SectionHeader";
import { StatusNotice } from "../../components/common/StatusNotice";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { apiClient, isApiRequestError } from "../../lib/api-client";
import { formatCompactNumber, formatKoreanDate } from "../../lib/formatters";

interface EditableContent extends AdminContent {
  aliasesText: string;
  searchKeywordsText: string;
}

interface AdminEditorPageProps {
  admin: AdminProfile;
  onSessionExpired: () => void;
  refreshKey: number;
}

const toEditableContent = (content: AdminContent): EditableContent => ({
  ...content,
  aliasesText: content.aliases.join(", "),
  searchKeywordsText: content.searchKeywords.join(", "),
});

const parseAliases = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const normalizeOptionalText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseOptionalInteger = (value: string) => {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return Number(trimmed);
};

export function AdminEditorPage({
  admin,
  onSessionExpired,
  refreshKey,
}: AdminEditorPageProps) {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<Category[]>([]);
  const [contentDrafts, setContentDrafts] = useState<EditableContent[]>([]);
  const [reactionDrafts, setReactionDrafts] = useState<AdminReactionVideo[]>([]);

  const dashboardResource = useAsyncResource(
    async () => {
      try {
        return await apiClient.getAdminDashboard();
      } catch (error) {
        if (isApiRequestError(error, 401)) {
          onSessionExpired();
        }

        throw error;
      }
    },
    [refreshKey],
    {
      initialData: null,
    },
  );

  useEffect(() => {
    if (!dashboardResource.data) {
      return;
    }

    setCategoryDrafts(dashboardResource.data.categories);
    setContentDrafts(dashboardResource.data.contents.map(toEditableContent));
    setReactionDrafts(dashboardResource.data.reactions);
  }, [dashboardResource.data]);

  const refreshDashboard = async () => {
    await dashboardResource.refetch();
  };

  const runWithSaving = async (key: string, action: () => Promise<void>) => {
    setSavingKey(key);
    setActionError(null);

    try {
      await action();
    } catch (error) {
      if (isApiRequestError(error, 401)) {
        onSessionExpired();
        return;
      }

      setActionError(
        error instanceof Error ? error.message : "작업 중 오류가 발생했습니다.",
      );
    } finally {
      setSavingKey(null);
    }
  };

  const handleCategoryChange = <K extends keyof Category>(
    categoryId: number,
    field: K,
    value: Category[K],
  ) => {
    setCategoryDrafts((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              [field]: value,
            }
          : category,
      ),
    );
  };

  const handleContentChange = <K extends keyof EditableContent>(
    contentId: number,
    field: K,
    value: EditableContent[K],
  ) => {
    setContentDrafts((current) =>
      current.map((content) =>
        content.id === contentId
          ? {
              ...content,
              [field]: value,
            }
          : content,
      ),
    );
  };

  const handleReactionChange = <K extends keyof AdminReactionVideo>(
    reactionId: number,
    field: K,
    value: AdminReactionVideo[K],
  ) => {
    setReactionDrafts((current) =>
      current.map((reaction) =>
        reaction.id === reactionId
          ? {
              ...reaction,
              [field]: value,
            }
          : reaction,
      ),
    );
  };

  const activeCategoryCount = categoryDrafts.filter((category) => category.isActive).length;
  const featuredReactionCount = reactionDrafts.filter((reaction) => reaction.isFeatured).length;

  return (
    <div className="page-stack">
      <section className="panel-section admin-summary">
        <div className="admin-summary__card">
          <span className="admin-summary__label">로그인 계정</span>
          <strong className="admin-summary__value admin-summary__value--compact">
            {admin.displayName}
          </strong>
        </div>
        <div className="admin-summary__card">
          <span className="admin-summary__label">활성 카테고리</span>
          <strong className="admin-summary__value">{activeCategoryCount}개</strong>
        </div>
        <div className="admin-summary__card">
          <span className="admin-summary__label">메인 추천 리액션</span>
          <strong className="admin-summary__value">{featuredReactionCount}개</strong>
        </div>
      </section>

      {dashboardResource.error ? (
        <StatusNotice
          title="관리자 데이터를 불러오지 못했습니다."
          description={dashboardResource.error}
          tone="danger"
          actionLabel="다시 시도"
          onAction={dashboardResource.refetch}
        />
      ) : null}

      {actionError ? (
        <StatusNotice
          title="작업을 완료하지 못했습니다."
          description={actionError}
          tone="danger"
        />
      ) : null}

      {dashboardResource.isLoading && !dashboardResource.data ? (
        <StatusNotice
          title="관리자 데이터를 불러오는 중입니다."
          description="카테고리, 콘텐츠, 리액션 수정 데이터를 정리하고 있습니다."
        />
      ) : null}

      {dashboardResource.data ? (
        <>
          <section className="panel-section">
            <SectionHeader
              eyebrow="Categories"
              title="카테고리 수정"
              description="기존 카테고리의 slug, 이름, 정렬 순서와 노출 여부를 수정합니다."
            />

            <div className="admin-card-list">
              {categoryDrafts.map((category) => (
                <article key={category.id} className="admin-card">
                  <div className="admin-card__grid admin-card__grid--category">
                    <label className="admin-field">
                      <span className="admin-field__label">slug</span>
                      <input
                        className="admin-input"
                        value={category.slug}
                        onChange={(event) =>
                          handleCategoryChange(
                            category.id,
                            "slug",
                            event.target.value as Category["slug"],
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">이름</span>
                      <input
                        className="admin-input"
                        value={category.nameKo}
                        onChange={(event) =>
                          handleCategoryChange(category.id, "nameKo", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">정렬</span>
                      <input
                        className="admin-input"
                        type="number"
                        value={category.sortOrder}
                        onChange={(event) =>
                          handleCategoryChange(category.id, "sortOrder", Number(event.target.value))
                        }
                      />
                    </label>
                    <label className="admin-checkbox">
                      <input
                        checked={category.isActive}
                        type="checkbox"
                        onChange={(event) =>
                          handleCategoryChange(category.id, "isActive", event.target.checked)
                        }
                      />
                      <span>활성</span>
                    </label>
                  </div>

                  <div className="admin-section__actions">
                    <button
                      className="chip-button chip-button--solid"
                      disabled={savingKey === `category-${category.id}`}
                      type="button"
                      onClick={() =>
                        void runWithSaving(`category-${category.id}`, async () => {
                          await apiClient.updateAdminCategory(category.id, {
                            slug: category.slug,
                            nameKo: category.nameKo,
                            sortOrder: category.sortOrder,
                            isActive: category.isActive,
                          });
                          await refreshDashboard();
                        })
                      }
                    >
                      카테고리 저장
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <SectionHeader
              eyebrow="Contents"
              title="콘텐츠 수정"
              description="기존 콘텐츠의 메타 정보, 검색 키워드, 우선순위와 노출 상태를 수정합니다."
            />

            <div className="admin-card-list">
              {contentDrafts.map((content) => (
                <article key={content.id} className="admin-card">
                  <div className="admin-card__head">
                    <div>
                      <p className="admin-card__title">{content.titleKo}</p>
                      <p className="admin-card__subtitle">
                        {content.categoryNameKo} · {content.slug}
                      </p>
                    </div>
                    <span className="admin-badge">{content.status}</span>
                  </div>

                  <div className="admin-card__grid">
                    <label className="admin-field">
                      <span className="admin-field__label">카테고리</span>
                      <select
                        className="admin-select"
                        value={content.categoryId}
                        onChange={(event) =>
                          handleContentChange(content.id, "categoryId", Number(event.target.value))
                        }
                      >
                        {categoryDrafts.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.nameKo}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">slug</span>
                      <input
                        className="admin-input"
                        value={content.slug}
                        onChange={(event) =>
                          handleContentChange(content.id, "slug", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">국문 제목</span>
                      <input
                        className="admin-input"
                        value={content.titleKo}
                        onChange={(event) =>
                          handleContentChange(content.id, "titleKo", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">영문 제목</span>
                      <input
                        className="admin-input"
                        value={content.titleEn ?? ""}
                        onChange={(event) =>
                          handleContentChange(content.id, "titleEn", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">출시 연도</span>
                      <input
                        className="admin-input"
                        type="number"
                        value={content.releaseYear ?? ""}
                        onChange={(event) =>
                          handleContentChange(
                            content.id,
                            "releaseYear",
                            parseOptionalInteger(event.target.value),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">출시 예정일</span>
                      <input
                        className="admin-input"
                        placeholder="2026-10"
                        value={content.releaseDate ?? ""}
                        onChange={(event) =>
                          handleContentChange(content.id, "releaseDate", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">우선순위</span>
                      <input
                        className="admin-input"
                        min={0}
                        type="number"
                        value={content.priorityScore}
                        onChange={(event) =>
                          handleContentChange(
                            content.id,
                            "priorityScore",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">상태</span>
                      <select
                        className="admin-select"
                        value={content.status}
                        onChange={(event) =>
                          handleContentChange(
                            content.id,
                            "status",
                            event.target.value as ContentStatus,
                          )
                        }
                      >
                        <option value="active">active</option>
                        <option value="hidden">hidden</option>
                      </select>
                    </label>
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">별칭</span>
                      <input
                        className="admin-input"
                        value={content.aliasesText}
                        onChange={(event) =>
                          handleContentChange(content.id, "aliasesText", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">검색 키워드</span>
                      <input
                        className="admin-input"
                        value={content.searchKeywordsText}
                        onChange={(event) =>
                          handleContentChange(
                            content.id,
                            "searchKeywordsText",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">대표 이미지 URL</span>
                      <input
                        className="admin-input"
                        value={content.thumbnailUrl ?? ""}
                        onChange={(event) =>
                          handleContentChange(content.id, "thumbnailUrl", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">설명</span>
                      <textarea
                        className="admin-textarea"
                        rows={3}
                        value={content.description ?? ""}
                        onChange={(event) =>
                          handleContentChange(content.id, "description", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">히어로 문구</span>
                      <textarea
                        className="admin-textarea"
                        rows={2}
                        value={content.heroMessageKo ?? ""}
                        onChange={(event) =>
                          handleContentChange(content.id, "heroMessageKo", event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="admin-card__meta">
                    <span>리액션 {content.reactionCount}개</span>
                    <span>누적 {formatCompactNumber(content.totalViews)}</span>
                    <span>
                      최신{" "}
                      {content.latestReactionAt
                        ? formatKoreanDate(content.latestReactionAt)
                        : "없음"}
                    </span>
                  </div>

                  <div className="admin-section__actions">
                    <button
                      className="chip-button chip-button--solid"
                      disabled={savingKey === `content-${content.id}`}
                      type="button"
                      onClick={() =>
                        void runWithSaving(`content-${content.id}`, async () => {
                          await apiClient.updateAdminContent(content.id, {
                            categoryId: content.categoryId,
                            slug: content.slug,
                            titleKo: content.titleKo,
                            titleEn: normalizeOptionalText(content.titleEn ?? ""),
                            aliases: parseAliases(content.aliasesText),
                            releaseYear: content.releaseYear,
                            releaseDate: normalizeOptionalText(content.releaseDate ?? ""),
                            thumbnailUrl: normalizeOptionalText(content.thumbnailUrl ?? ""),
                            description: normalizeOptionalText(content.description ?? ""),
                            searchKeywords: parseAliases(content.searchKeywordsText),
                            priorityScore: content.priorityScore,
                            heroMessageKo: normalizeOptionalText(content.heroMessageKo ?? ""),
                            status: content.status,
                          });
                          await refreshDashboard();
                        })
                      }
                    >
                      콘텐츠 저장
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <SectionHeader
              eyebrow="Reactions"
              title="리액션 수정"
              description="유튜브 반응의 노출 제목, 소개글, 메인 추천 여부와 노출 순서를 수정합니다."
            />

            <div className="admin-card-list">
              {reactionDrafts.map((reaction) => (
                <article key={reaction.youtubeVideoId} className="admin-card">
                  <div className="admin-card__head">
                    <div>
                      <p className="admin-card__title">{reaction.displayTitle}</p>
                      <p className="admin-card__subtitle">원문: {reaction.originalTitle}</p>
                      {reaction.localizedTitle ? (
                        <p className="admin-card__subtitle">
                          자동 번역({reaction.localizedTitleSource ?? "machine"}):{" "}
                          {reaction.localizedTitle}
                        </p>
                      ) : null}
                      <p className="admin-card__subtitle">
                        {reaction.categoryNameKo} · {reaction.contentTitleKo} · {reaction.channelName}
                      </p>
                    </div>
                    <div className="admin-card__badges">
                      <span className="admin-badge">
                        조회수 {formatCompactNumber(reaction.viewCount)}
                      </span>
                      <span className="admin-badge">
                        댓글 {formatCompactNumber(reaction.commentCount)}
                      </span>
                      <span className="admin-badge">
                        {formatKoreanDate(reaction.publishedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="admin-card__grid">
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">노출 제목</span>
                      <input
                        className="admin-input"
                        placeholder={reaction.localizedTitle ?? reaction.originalTitle}
                        value={reaction.adminTitle ?? ""}
                        onChange={(event) =>
                          handleReactionChange(reaction.id, "adminTitle", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">노출 소개글</span>
                      <textarea
                        className="admin-textarea"
                        placeholder={
                          reaction.localizedDescription ??
                          reaction.originalDescription ??
                          "메인에서 보여줄 요약 소개를 입력하세요."
                        }
                        rows={3}
                        value={reaction.adminDescription ?? ""}
                        onChange={(event) =>
                          handleReactionChange(
                            reaction.id,
                            "adminDescription",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    <label className="admin-checkbox">
                      <input
                        checked={reaction.isFeatured}
                        type="checkbox"
                        onChange={(event) =>
                          handleReactionChange(reaction.id, "isFeatured", event.target.checked)
                        }
                      />
                      <span>메인 추천 노출</span>
                    </label>
                    <label className="admin-field admin-field--compact">
                      <span className="admin-field__label">노출 순서</span>
                      <input
                        className="admin-input"
                        type="number"
                        value={reaction.featuredOrder}
                        onChange={(event) =>
                          handleReactionChange(
                            reaction.id,
                            "featuredOrder",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="admin-section__actions">
                    <a
                      className="chip-button chip-button--ghost"
                      href={reaction.youtubeUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      유튜브 원본 보기
                    </a>
                    <button
                      className="chip-button chip-button--solid"
                      disabled={savingKey === `reaction-${reaction.id}`}
                      type="button"
                      onClick={() =>
                        void runWithSaving(`reaction-${reaction.id}`, async () => {
                          await apiClient.updateAdminReaction(reaction.youtubeVideoId, {
                            adminTitle: normalizeOptionalText(reaction.adminTitle ?? ""),
                            adminDescription: normalizeOptionalText(
                              reaction.adminDescription ?? "",
                            ),
                            isFeatured: reaction.isFeatured,
                            featuredOrder: reaction.featuredOrder,
                          });
                          await refreshDashboard();
                        })
                      }
                    >
                      리액션 저장
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
