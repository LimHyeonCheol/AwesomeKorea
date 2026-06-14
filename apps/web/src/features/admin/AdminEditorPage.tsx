import { useEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";

import type {
  AdminContent,
  AdminContentDetail,
  AdminProfile,
  Category,
  ContentStatus,
} from "@awesomekorea/shared";

import { SectionHeader } from "../../components/common/SectionHeader";
import { StatusNotice } from "../../components/common/StatusNotice";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { apiClient, isApiRequestError } from "../../lib/api-client";
import { formatCompactNumber, formatKoreanDate } from "../../lib/formatters";

interface EditableContentDetail extends AdminContentDetail {
  aliasesText: string;
  searchKeywordsText: string;
}

interface CategoryDraft extends Category {
  isNew?: boolean;
}

interface ContentDraft extends AdminContent {
  isNew?: boolean;
}

interface AdminEditorPageProps {
  admin: AdminProfile;
  onSessionExpired: () => void;
  refreshKey: number;
}

const toEditableContentDetail = (content: AdminContentDetail): EditableContentDetail => ({
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

const formatReleaseLabel = (content: Pick<AdminContent, "releaseDate" | "releaseYear">) =>
  content.releaseDate ?? (content.releaseYear ? `${content.releaseYear}` : "-");

const formatLatestReactionLabel = (latestReactionAt: string | null) =>
  latestReactionAt ? formatKoreanDate(latestReactionAt) : "없음";

const toggleSelection = (current: number[], targetId: number) =>
  current.includes(targetId)
    ? current.filter((id) => id !== targetId)
    : [...current, targetId];

const removeLastUnsavedRow = <T extends { isNew?: boolean }>(rows: T[]) => {
  const nextRows = [...rows];
  const removeIndex = [...nextRows].reverse().findIndex((row) => row.isNew);

  if (removeIndex === -1) {
    return rows;
  }

  nextRows.splice(nextRows.length - 1 - removeIndex, 1);
  return nextRows;
};

const stopRowToggle = (event: SyntheticEvent) => {
  event.stopPropagation();
};

const handleInteractiveRowKeyDown = (
  event: KeyboardEvent<HTMLDivElement>,
  action: () => void,
) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  action();
};

export function AdminEditorPage({
  admin,
  onSessionExpired,
  refreshKey,
}: AdminEditorPageProps) {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<CategoryDraft[]>([]);
  const [contentDrafts, setContentDrafts] = useState<ContentDraft[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedContentIds, setSelectedContentIds] = useState<number[]>([]);
  const [openContentId, setOpenContentId] = useState<number | null>(null);
  const [contentDetailDraft, setContentDetailDraft] = useState<EditableContentDetail | null>(null);
  const [contentDetailError, setContentDetailError] = useState<string | null>(null);
  const [isContentDetailLoading, setIsContentDetailLoading] = useState(false);

  const nextCategoryTempIdRef = useRef(-1);
  const nextContentTempIdRef = useRef(-1);
  const detailRequestIdRef = useRef(0);

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

    setCategoryDrafts(dashboardResource.data.categories.map((category) => ({ ...category })));
    setContentDrafts(dashboardResource.data.contents.map((content) => ({ ...content })));
    setSelectedCategoryIds((current) =>
      current.filter((id) => dashboardResource.data?.categories.some((category) => category.id === id)),
    );
    setSelectedContentIds((current) =>
      current.filter((id) => dashboardResource.data?.contents.some((content) => content.id === id)),
    );

    if (
      openContentId !== null &&
      !dashboardResource.data.contents.some((content) => content.id === openContentId)
    ) {
      detailRequestIdRef.current += 1;
      setOpenContentId(null);
      setContentDetailDraft(null);
      setContentDetailError(null);
      setIsContentDetailLoading(false);
    }
  }, [dashboardResource.data, openContentId]);

  const savedCategories = categoryDrafts.filter((category) => !category.isNew);
  const activeCategoryCount = savedCategories.filter((category) => category.isActive).length;
  const savedContentCount = contentDrafts.filter((content) => !content.isNew).length;
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

  const closeContentDetail = () => {
    detailRequestIdRef.current += 1;
    setOpenContentId(null);
    setContentDetailDraft(null);
    setContentDetailError(null);
    setIsContentDetailLoading(false);
  };

  const loadContentDetail = async (contentId: number) => {
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;

    setOpenContentId(contentId);
    setContentDetailDraft(null);
    setContentDetailError(null);
    setIsContentDetailLoading(true);

    try {
      const response = await apiClient.getAdminContentDetail(contentId);

      if (requestId !== detailRequestIdRef.current) {
        return;
      }

      setContentDetailDraft(toEditableContentDetail(response.item));
    } catch (error) {
      if (requestId !== detailRequestIdRef.current) {
        return;
      }

      if (isApiRequestError(error, 401)) {
        onSessionExpired();
        return;
      }

      setContentDetailError(
        error instanceof Error ? error.message : "콘텐츠 상세를 불러오지 못했습니다.",
      );
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setIsContentDetailLoading(false);
      }
    }
  };

  const handleCategoryChange = <K extends keyof CategoryDraft>(
    categoryId: number,
    field: K,
    value: CategoryDraft[K],
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

  const handleContentDraftChange = <K extends keyof ContentDraft>(
    contentId: number,
    field: K,
    value: ContentDraft[K],
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

  const handleContentDraftCategoryChange = (contentId: number, categoryId: number) => {
    const nextCategory = savedCategories.find((category) => category.id === categoryId);

    if (!nextCategory) {
      return;
    }

    setContentDrafts((current) =>
      current.map((content) =>
        content.id === contentId
          ? {
              ...content,
              categoryId,
              categorySlug: nextCategory.slug,
              categoryNameKo: nextCategory.nameKo,
            }
          : content,
      ),
    );
  };

  const handleContentDetailChange = <K extends keyof EditableContentDetail>(
    field: K,
    value: EditableContentDetail[K],
  ) => {
    setContentDetailDraft((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  };

  const handleContentDetailCategoryChange = (categoryId: number) => {
    const nextCategory = savedCategories.find((category) => category.id === categoryId);

    if (!nextCategory) {
      return;
    }

    setContentDetailDraft((current) =>
      current
        ? {
            ...current,
            categoryId,
            categorySlug: nextCategory.slug,
            categoryNameKo: nextCategory.nameKo,
          }
        : current,
    );
  };

  const handleAddCategoryRow = () => {
    const maxSortOrder = categoryDrafts.reduce(
      (highest, category) => Math.max(highest, category.sortOrder),
      0,
    );

    setCategoryDrafts((current) => [
      ...current,
      {
        id: nextCategoryTempIdRef.current--,
        slug: "",
        nameKo: "",
        sortOrder: maxSortOrder + 1,
        isActive: true,
        isNew: true,
      },
    ]);
  };

  const handleRemoveCategoryRow = () => {
    setCategoryDrafts((current) => removeLastUnsavedRow(current));
  };

  const handleSaveCategory = async (category: CategoryDraft) => {
    await runWithSaving(`category-${category.id}`, async () => {
      if (category.isNew) {
        await apiClient.createAdminCategory({
          slug: category.slug,
          nameKo: category.nameKo,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
        });
      } else {
        await apiClient.updateAdminCategory(category.id, {
          slug: category.slug,
          nameKo: category.nameKo,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
        });
      }

      await refreshDashboard();
    });
  };

  const handleDeleteSelectedCategories = async () => {
    await runWithSaving("category-delete", async () => {
      if (selectedCategoryIds.length === 0) {
        return;
      }

      const confirmed = window.confirm(
        `선택한 카테고리 ${selectedCategoryIds.length}개를 삭제하시겠습니까?`,
      );

      if (!confirmed) {
        return;
      }

      for (const categoryId of selectedCategoryIds) {
        await apiClient.deleteAdminCategory(categoryId);
      }

      setSelectedCategoryIds([]);
      await refreshDashboard();
    });
  };

  const handleAddContentRow = () => {
    const defaultCategory = savedCategories[0];

    if (!defaultCategory) {
      setActionError("콘텐츠를 추가하려면 먼저 저장된 카테고리가 필요합니다.");
      return;
    }

    setActionError(null);
    setContentDrafts((current) => [
      {
        id: nextContentTempIdRef.current--,
        categoryId: defaultCategory.id,
        categorySlug: defaultCategory.slug,
        categoryNameKo: defaultCategory.nameKo,
        slug: "",
        titleKo: "",
        titleEn: null,
        releaseYear: null,
        releaseDate: null,
        status: "active",
        reactionCount: 0,
        totalViews: 0,
        latestReactionAt: null,
        isNew: true,
      },
      ...current,
    ]);
  };

  const handleRemoveContentRow = () => {
    setContentDrafts((current) => removeLastUnsavedRow(current));
  };

  const handleSaveNewContent = async (content: ContentDraft) => {
    await runWithSaving(`content-${content.id}`, async () => {
      const response = await apiClient.createAdminContent({
        categoryId: content.categoryId,
        slug: content.slug,
        titleKo: content.titleKo,
        titleEn: normalizeOptionalText(content.titleEn ?? ""),
        releaseYear: content.releaseYear,
        releaseDate: normalizeOptionalText(content.releaseDate ?? ""),
        status: content.status,
      });

      await refreshDashboard();

      if (response.id) {
        setSelectedContentIds([]);
        await loadContentDetail(response.id);
      }
    });
  };

  const handleDeleteSelectedContents = async () => {
    await runWithSaving("content-delete", async () => {
      if (selectedContentIds.length === 0) {
        return;
      }

      const confirmed = window.confirm(
        `선택한 콘텐츠 ${selectedContentIds.length}개를 삭제하시겠습니까? 연결된 리액션도 함께 삭제됩니다.`,
      );

      if (!confirmed) {
        return;
      }

      for (const contentId of selectedContentIds) {
        await apiClient.deleteAdminContent(contentId);
      }

      if (openContentId !== null && selectedContentIds.includes(openContentId)) {
        closeContentDetail();
      }

      setSelectedContentIds([]);
      await refreshDashboard();
    });
  };

  const handleToggleContentDetail = (contentId: number) => {
    if (openContentId === contentId) {
      closeContentDetail();
      return;
    }

    void loadContentDetail(contentId);
  };

  const handleSaveContentDetail = async () => {
    if (!contentDetailDraft) {
      return;
    }

    await runWithSaving(`content-detail-${contentDetailDraft.id}`, async () => {
      await apiClient.updateAdminContent(contentDetailDraft.id, {
        categoryId: contentDetailDraft.categoryId,
        slug: contentDetailDraft.slug,
        titleKo: contentDetailDraft.titleKo,
        titleEn: normalizeOptionalText(contentDetailDraft.titleEn ?? ""),
        aliases: parseAliases(contentDetailDraft.aliasesText),
        releaseYear: contentDetailDraft.releaseYear,
        releaseDate: normalizeOptionalText(contentDetailDraft.releaseDate ?? ""),
        thumbnailUrl: normalizeOptionalText(contentDetailDraft.thumbnailUrl ?? ""),
        description: normalizeOptionalText(contentDetailDraft.description ?? ""),
        searchKeywords: parseAliases(contentDetailDraft.searchKeywordsText),
        priorityScore: contentDetailDraft.priorityScore,
        heroMessageKo: normalizeOptionalText(contentDetailDraft.heroMessageKo ?? ""),
        status: contentDetailDraft.status,
      });

      await refreshDashboard();
      await loadContentDetail(contentDetailDraft.id);
    });
  };

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
          <span className="admin-summary__label">관리 대상 콘텐츠</span>
          <strong className="admin-summary__value">{savedContentCount}개</strong>
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
          description="카테고리와 콘텐츠 관리 데이터를 정리하고 있습니다."
        />
      ) : null}

      {dashboardResource.data ? (
        <>
          <section className="panel-section">
            <div className="admin-section-head">
              <SectionHeader
                eyebrow="Categories"
                title="카테고리 관리"
                description="우측 상단의 +, -, 삭제 버튼으로 카테고리를 추가·정리하고 기존 카테고리는 행 단위로 저장합니다."
              />

              <div className="admin-toolbar">
                <button
                  aria-label="카테고리 행 추가"
                  className="chip-button chip-button--ghost admin-toolbar__icon-button"
                  type="button"
                  onClick={handleAddCategoryRow}
                >
                  +
                </button>
                <button
                  aria-label="저장 전 카테고리 행 제거"
                  className="chip-button chip-button--ghost admin-toolbar__icon-button"
                  disabled={!categoryDrafts.some((category) => category.isNew)}
                  type="button"
                  onClick={handleRemoveCategoryRow}
                >
                  -
                </button>
                <button
                  className="chip-button chip-button--solid"
                  disabled={selectedCategoryIds.length === 0 || savingKey === "category-delete"}
                  type="button"
                  onClick={() => void handleDeleteSelectedCategories()}
                >
                  선택 삭제
                </button>
              </div>
            </div>

            <div className="admin-grid">
              <div className="admin-grid__table admin-grid__table--categories">
                <div className="admin-grid__header admin-grid__header--categories">
                  <span>선택</span>
                  <span>slug</span>
                  <span>이름</span>
                  <span>정렬</span>
                  <span>활성</span>
                  <span>작업</span>
                </div>

                {categoryDrafts.map((category) => (
                  <div
                    key={category.id}
                    className={`admin-grid__row admin-grid__row--categories ${category.isNew ? "admin-grid__row--draft" : ""}`}
                  >
                    <div className="admin-grid__cell admin-grid__cell--checkbox">
                      {category.isNew ? (
                        <span className="admin-grid__draft-badge">신규</span>
                      ) : (
                        <label className="admin-grid__checkbox" onClick={stopRowToggle}>
                          <input
                            checked={selectedCategoryIds.includes(category.id)}
                            type="checkbox"
                            onChange={() =>
                              setSelectedCategoryIds((current) =>
                                toggleSelection(current, category.id),
                              )
                            }
                          />
                        </label>
                      )}
                    </div>

                    <div className="admin-grid__cell">
                      <input
                        className="admin-input"
                        value={category.slug}
                        onChange={(event) =>
                          handleCategoryChange(category.id, "slug", event.target.value)
                        }
                      />
                    </div>

                    <div className="admin-grid__cell">
                      <input
                        className="admin-input"
                        value={category.nameKo}
                        onChange={(event) =>
                          handleCategoryChange(category.id, "nameKo", event.target.value)
                        }
                      />
                    </div>

                    <div className="admin-grid__cell">
                      <input
                        className="admin-input"
                        type="number"
                        value={category.sortOrder}
                        onChange={(event) =>
                          handleCategoryChange(category.id, "sortOrder", Number(event.target.value))
                        }
                      />
                    </div>

                    <div className="admin-grid__cell">
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

                    <div className="admin-grid__cell admin-grid__cell--actions">
                      <button
                        className="chip-button chip-button--solid"
                        disabled={savingKey === `category-${category.id}`}
                        type="button"
                        onClick={() => void handleSaveCategory(category)}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel-section">
            <div className="admin-section-head">
              <SectionHeader
                eyebrow="Contents"
                title="콘텐츠 관리"
                description="기존 콘텐츠는 그리드에서 한눈에 보고, 행을 누르면 섹션 아래 상세 편집 패널이 열립니다. 신규 콘텐츠는 그리드 행에서 바로 추가합니다."
              />

              <div className="admin-toolbar">
                <button
                  aria-label="콘텐츠 행 추가"
                  className="chip-button chip-button--ghost admin-toolbar__icon-button"
                  disabled={savedCategories.length === 0}
                  type="button"
                  onClick={handleAddContentRow}
                >
                  +
                </button>
                <button
                  aria-label="저장 전 콘텐츠 행 제거"
                  className="chip-button chip-button--ghost admin-toolbar__icon-button"
                  disabled={!contentDrafts.some((content) => content.isNew)}
                  type="button"
                  onClick={handleRemoveContentRow}
                >
                  -
                </button>
                <button
                  className="chip-button chip-button--solid"
                  disabled={selectedContentIds.length === 0 || savingKey === "content-delete"}
                  type="button"
                  onClick={() => void handleDeleteSelectedContents()}
                >
                  선택 삭제
                </button>
              </div>
            </div>

            <div className="admin-grid">
              <div className="admin-grid__table admin-grid__table--contents">
                <div className="admin-grid__header admin-grid__header--contents">
                  <span>선택</span>
                  <span>카테고리</span>
                  <span>slug</span>
                  <span>제목</span>
                  <span>영문 제목</span>
                  <span>출시</span>
                  <span>상태</span>
                  <span>리액션</span>
                  <span>작업</span>
                </div>

                {contentDrafts.map((content) =>
                  content.isNew ? (
                    <div
                      key={content.id}
                      className="admin-grid__row admin-grid__row--contents admin-grid__row--draft"
                    >
                      <div className="admin-grid__cell admin-grid__cell--checkbox">
                        <span className="admin-grid__draft-badge">신규</span>
                      </div>

                      <div className="admin-grid__cell">
                        <select
                          className="admin-select"
                          value={content.categoryId}
                          onChange={(event) =>
                            handleContentDraftCategoryChange(
                              content.id,
                              Number(event.target.value),
                            )
                          }
                        >
                          {savedCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.nameKo}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="admin-grid__cell">
                        <input
                          className="admin-input"
                          value={content.slug}
                          onChange={(event) =>
                            handleContentDraftChange(content.id, "slug", event.target.value)
                          }
                        />
                      </div>

                      <div className="admin-grid__cell">
                        <input
                          className="admin-input"
                          value={content.titleKo}
                          onChange={(event) =>
                            handleContentDraftChange(content.id, "titleKo", event.target.value)
                          }
                        />
                      </div>

                      <div className="admin-grid__cell">
                        <input
                          className="admin-input"
                          value={content.titleEn ?? ""}
                          onChange={(event) =>
                            handleContentDraftChange(content.id, "titleEn", event.target.value)
                          }
                        />
                      </div>

                      <div className="admin-grid__cell admin-grid__cell--pair">
                        <input
                          className="admin-input"
                          placeholder="연도"
                          type="number"
                          value={content.releaseYear ?? ""}
                          onChange={(event) =>
                            handleContentDraftChange(
                              content.id,
                              "releaseYear",
                              parseOptionalInteger(event.target.value),
                            )
                          }
                        />
                        <input
                          className="admin-input"
                          placeholder="2026-10"
                          value={content.releaseDate ?? ""}
                          onChange={(event) =>
                            handleContentDraftChange(content.id, "releaseDate", event.target.value)
                          }
                        />
                      </div>

                      <div className="admin-grid__cell admin-grid__cell--stack">
                        <select
                          className="admin-select"
                          value={content.status}
                          onChange={(event) =>
                            handleContentDraftChange(
                              content.id,
                              "status",
                              event.target.value as ContentStatus,
                            )
                          }
                        >
                          <option value="active">active</option>
                          <option value="hidden">hidden</option>
                        </select>
                        <button
                          className="chip-button chip-button--solid admin-grid__save-button"
                          disabled={savingKey === `content-${content.id}`}
                          type="button"
                          onClick={() => void handleSaveNewContent(content)}
                        >
                          신규 저장
                        </button>
                      </div>

                      <div className="admin-grid__cell admin-grid__cell--muted">저장 후 집계</div>

                      <div className="admin-grid__cell admin-grid__cell--actions admin-grid__cell--sticky-action admin-grid__cell--muted">
                        상세는 저장 후
                      </div>
                    </div>
                  ) : (
                    <div
                      key={content.id}
                      className={`admin-grid__row admin-grid__row--contents admin-grid__row--interactive ${openContentId === content.id ? "admin-grid__row--active" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleToggleContentDetail(content.id)}
                      onKeyDown={(event) =>
                        handleInteractiveRowKeyDown(event, () =>
                          handleToggleContentDetail(content.id),
                        )
                      }
                    >
                      <div className="admin-grid__cell admin-grid__cell--checkbox" onClick={stopRowToggle}>
                        <label className="admin-grid__checkbox">
                          <input
                            checked={selectedContentIds.includes(content.id)}
                            type="checkbox"
                            onChange={() =>
                              setSelectedContentIds((current) =>
                                toggleSelection(current, content.id),
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="admin-grid__cell">{content.categoryNameKo}</div>
                      <div className="admin-grid__cell admin-grid__cell--mono">{content.slug}</div>
                      <div className="admin-grid__cell">{content.titleKo}</div>
                      <div className="admin-grid__cell admin-grid__cell--muted">
                        {content.titleEn ?? "-"}
                      </div>
                      <div className="admin-grid__cell">{formatReleaseLabel(content)}</div>
                      <div className="admin-grid__cell">
                        <span className="admin-badge">{content.status}</span>
                      </div>
                      <div className="admin-grid__cell admin-grid__cell--muted">
                        {content.reactionCount}개 / {formatCompactNumber(content.totalViews)}
                      </div>
                      <div className="admin-grid__cell admin-grid__cell--sticky-action">
                        <span className="admin-grid__detail-indicator">
                          {openContentId === content.id ? "열림" : "열기"}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            <section className="admin-detail-panel">
              <div className="admin-detail-panel__header">
                <div>
                  <p className="admin-detail-panel__eyebrow">Content Detail</p>
                  <h3 className="admin-detail-panel__title">콘텐츠 상세 수정</h3>
                  <p className="admin-detail-panel__description">
                    화면 이동 없이 이 섹션 아래에서 상세 정보를 열고 닫으며 수정합니다.
                  </p>
                </div>

                {openContentId !== null ? (
                  <button
                    className="chip-button chip-button--ghost"
                    type="button"
                    onClick={closeContentDetail}
                  >
                    상세 닫기
                  </button>
                ) : null}
              </div>

              {openContentId === null ? (
                <StatusNotice
                  title="상세 패널이 닫혀 있습니다."
                  description="그리드의 저장된 콘텐츠 로우를 누르면 상세 수정 패널이 이 아래에 열립니다."
                />
              ) : null}

              {openContentId !== null && isContentDetailLoading ? (
                <StatusNotice
                  title="콘텐츠 상세를 불러오는 중입니다."
                  description="선택한 콘텐츠의 상세 수정 항목을 준비하고 있습니다."
                />
              ) : null}

              {openContentId !== null && contentDetailError ? (
                <StatusNotice
                  title="콘텐츠 상세를 불러오지 못했습니다."
                  description={contentDetailError}
                  tone="danger"
                  actionLabel="다시 시도"
                  onAction={() => void loadContentDetail(openContentId)}
                />
              ) : null}

              {openContentId !== null && contentDetailDraft ? (
                <>
                  <div className="admin-detail-panel__meta">
                    <span className="admin-badge">{contentDetailDraft.categoryNameKo}</span>
                    <span className="admin-badge">{contentDetailDraft.status}</span>
                    <span className="admin-badge">
                      최신 {formatLatestReactionLabel(contentDetailDraft.latestReactionAt)}
                    </span>
                  </div>

                  <div className="admin-card__grid">
                    <label className="admin-field">
                      <span className="admin-field__label">카테고리</span>
                      <select
                        className="admin-select"
                        value={contentDetailDraft.categoryId}
                        onChange={(event) =>
                          handleContentDetailCategoryChange(Number(event.target.value))
                        }
                      >
                        {savedCategories.map((category) => (
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
                        value={contentDetailDraft.slug}
                        onChange={(event) =>
                          handleContentDetailChange("slug", event.target.value)
                        }
                      />
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">국문 제목</span>
                      <input
                        className="admin-input"
                        value={contentDetailDraft.titleKo}
                        onChange={(event) =>
                          handleContentDetailChange("titleKo", event.target.value)
                        }
                      />
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">영문 제목</span>
                      <input
                        className="admin-input"
                        value={contentDetailDraft.titleEn ?? ""}
                        onChange={(event) =>
                          handleContentDetailChange("titleEn", event.target.value)
                        }
                      />
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">출시 연도</span>
                      <input
                        className="admin-input"
                        type="number"
                        value={contentDetailDraft.releaseYear ?? ""}
                        onChange={(event) =>
                          handleContentDetailChange(
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
                        value={contentDetailDraft.releaseDate ?? ""}
                        onChange={(event) =>
                          handleContentDetailChange("releaseDate", event.target.value)
                        }
                      />
                    </label>

                    <label className="admin-field">
                      <span className="admin-field__label">우선순위</span>
                      <input
                        className="admin-input"
                        min={0}
                        type="number"
                        value={contentDetailDraft.priorityScore}
                        onChange={(event) =>
                          handleContentDetailChange(
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
                        value={contentDetailDraft.status}
                        onChange={(event) =>
                          handleContentDetailChange(
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
                        value={contentDetailDraft.aliasesText}
                        onChange={(event) =>
                          handleContentDetailChange("aliasesText", event.target.value)
                        }
                      />
                    </label>

                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">검색 키워드</span>
                      <input
                        className="admin-input"
                        value={contentDetailDraft.searchKeywordsText}
                        onChange={(event) =>
                          handleContentDetailChange("searchKeywordsText", event.target.value)
                        }
                      />
                    </label>

                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">대표 이미지 URL</span>
                      <input
                        className="admin-input"
                        value={contentDetailDraft.thumbnailUrl ?? ""}
                        onChange={(event) =>
                          handleContentDetailChange("thumbnailUrl", event.target.value)
                        }
                      />
                    </label>

                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">설명</span>
                      <textarea
                        className="admin-textarea"
                        rows={4}
                        value={contentDetailDraft.description ?? ""}
                        onChange={(event) =>
                          handleContentDetailChange("description", event.target.value)
                        }
                      />
                    </label>

                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">히어로 문구</span>
                      <textarea
                        className="admin-textarea"
                        rows={3}
                        value={contentDetailDraft.heroMessageKo ?? ""}
                        onChange={(event) =>
                          handleContentDetailChange("heroMessageKo", event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="admin-detail-panel__footer">
                    <button
                      className="chip-button chip-button--solid"
                      disabled={savingKey === `content-detail-${contentDetailDraft.id}`}
                      type="button"
                      onClick={() => void handleSaveContentDetail()}
                    >
                      상세 저장
                    </button>
                  </div>
                </>
              ) : null}
            </section>
          </section>

        </>
      ) : null}
    </div>
  );
}
