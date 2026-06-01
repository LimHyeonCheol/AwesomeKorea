import { useEffect, useState } from "react";

import type {
  AdminContent,
  AdminReactionVideo,
  Category,
  ContentStatus,
  HomeSiteCopy,
} from "@awesomekorea/shared";

import { AppFooter } from "../components/common/AppFooter";
import { SectionHeader } from "../components/common/SectionHeader";
import { StatusNotice } from "../components/common/StatusNotice";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { apiClient } from "../lib/api-client";
import { formatCompactNumber, formatKoreanDate } from "../lib/formatters";

const ADMIN_TOKEN_STORAGE_KEY = "awesomekorea.admin.token";

const DEFAULT_SETTINGS: HomeSiteCopy = {
  brandName: "어썸코리아",
  brandTagline: "Awesome Korea - 해외 반응 모음",
  heroBadge: "관리자 추천",
  heroToolbarCopy: "운영자가 직접 고른 해외 유튜브 반응을 메인에서 빠르게 살펴보세요.",
  heroTitle: "지금 소개할 대표 반응을 운영자가 직접 편성합니다.",
  heroDescription:
    "대문 문구, 카테고리, 유튜브 제목과 소개글, 메인 대표 반응까지 모두 관리자에서 조정할 수 있습니다.",
};

interface EditableContent extends AdminContent {
  aliasesText: string;
}

interface NewCategoryDraft {
  isActive: boolean;
  nameKo: string;
  slug: string;
  sortOrder: number;
}

interface NewContentDraft {
  aliasesText: string;
  categoryId: number;
  description: string;
  releaseYear: string;
  slug: string;
  status: ContentStatus;
  thumbnailUrl: string;
  titleEn: string;
  titleKo: string;
}

const createNewCategoryDraft = (): NewCategoryDraft => ({
  slug: "",
  nameKo: "",
  sortOrder: 0,
  isActive: true,
});

const createNewContentDraft = (categories: Category[]): NewContentDraft => ({
  categoryId: categories[0]?.id ?? 1,
  slug: "",
  titleKo: "",
  titleEn: "",
  aliasesText: "",
  releaseYear: "",
  thumbnailUrl: "",
  description: "",
  status: "active",
});

const toEditableContent = (content: AdminContent): EditableContent => ({
  ...content,
  aliasesText: content.aliases.join(", "),
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

interface AdminPageProps {
  onNavigateHome: () => void;
}

export function AdminPage({ onNavigateHome }: AdminPageProps) {
  const [savedToken, setSavedToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  });
  const [tokenInput, setTokenInput] = useState(savedToken ?? "");
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dashboardResource = useAsyncResource(
    () => apiClient.getAdminDashboard(savedToken),
    [savedToken, refreshKey],
    {
      initialData: null,
    },
  );

  const [settingsDraft, setSettingsDraft] = useState<HomeSiteCopy>(DEFAULT_SETTINGS);
  const [categoryDrafts, setCategoryDrafts] = useState<Category[]>([]);
  const [contentDrafts, setContentDrafts] = useState<EditableContent[]>([]);
  const [reactionDrafts, setReactionDrafts] = useState<AdminReactionVideo[]>([]);
  const [newCategoryDraft, setNewCategoryDraft] = useState<NewCategoryDraft>(createNewCategoryDraft);
  const [newContentDraft, setNewContentDraft] = useState<NewContentDraft>(() =>
    createNewContentDraft([]),
  );

  useEffect(() => {
    if (!dashboardResource.data) {
      return;
    }

    setSettingsDraft(dashboardResource.data.settings);
    setCategoryDrafts(dashboardResource.data.categories);
    setContentDrafts(dashboardResource.data.contents.map(toEditableContent));
    setReactionDrafts(dashboardResource.data.reactions);
    setNewContentDraft(createNewContentDraft(dashboardResource.data.categories));
  }, [dashboardResource.data]);

  const runWithSaving = async (key: string, action: () => Promise<void>) => {
    setSavingKey(key);
    setActionError(null);

    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSavingKey(null);
    }
  };

  const refreshDashboard = async () => {
    await dashboardResource.refetch();
  };

  const handlePersistToken = () => {
    const normalizedToken = tokenInput.trim();

    if (normalizedToken.length > 0) {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, normalizedToken);
      setSavedToken(normalizedToken);
      setRefreshKey((current) => current + 1);
      return;
    }

    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    setSavedToken(null);
    setRefreshKey((current) => current + 1);
  };

  const handleCategoryChange = <K extends keyof Category>(categoryId: number, field: K, value: Category[K]) => {
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

  const categoryOptions = categoryDrafts.filter((category) => category.isActive);
  const featuredReactionCount = reactionDrafts.filter((reaction) => reaction.isFeatured).length;

  return (
    <div className="app-shell">
      <header className="admin-header">
        <div className="admin-header__inner">
          <div>
            <p className="admin-header__eyebrow">AwesomeKorea Admin</p>
            <h1 className="admin-header__title">운영 관리</h1>
            <p className="admin-header__copy">
              대문 문구, 카테고리, 콘텐츠, 메인 대표 유튜브 반응을 이 화면에서 직접 관리합니다.
            </p>
          </div>

          <div className="admin-header__actions">
            <button className="chip-button chip-button--ghost" type="button" onClick={onNavigateHome}>
              메인으로 이동
            </button>
            <button className="chip-button chip-button--solid" type="button" onClick={() => void refreshDashboard()}>
              새로고침
            </button>
          </div>
        </div>
      </header>

      <main className="site-main">
        <div className="page-stack">
          <section className="panel-section admin-token-panel">
            <SectionHeader
              eyebrow="Admin Token"
              title="관리자 토큰"
              description="운영 환경에서는 INTERNAL_API_TOKEN 값을 입력한 뒤 저장하면 수정 API를 사용할 수 있습니다. 로컬에서 토큰이 비어 있으면 그대로 동작합니다."
            />

            <div className="admin-token-panel__form">
              <input
                className="admin-input"
                type="password"
                value={tokenInput}
                placeholder="Bearer 토큰을 입력하거나 로컬에서는 비워 두세요."
                onChange={(event) => setTokenInput(event.target.value)}
              />
              <button className="chip-button chip-button--solid" type="button" onClick={handlePersistToken}>
                토큰 저장
              </button>
            </div>
          </section>

          {dashboardResource.error ? (
            <StatusNotice
              title="관리자 데이터를 불러오지 못했습니다"
              description={dashboardResource.error}
              tone="danger"
              actionLabel="다시 시도"
              onAction={dashboardResource.refetch}
            />
          ) : null}

          {actionError ? (
            <StatusNotice
              title="저장 작업이 완료되지 않았습니다"
              description={actionError}
              tone="danger"
            />
          ) : null}

          {dashboardResource.isLoading && !dashboardResource.data ? (
            <StatusNotice
              title="관리자 데이터를 불러오는 중"
              description="카테고리, 콘텐츠, 대표 리액션 설정을 정리하고 있습니다."
            />
          ) : null}

          {dashboardResource.data ? (
            <>
              <section className="panel-section admin-summary">
                <div className="admin-summary__card">
                  <span className="admin-summary__label">활성 카테고리</span>
                  <strong className="admin-summary__value">
                    {categoryOptions.length}개
                  </strong>
                </div>
                <div className="admin-summary__card">
                  <span className="admin-summary__label">등록 콘텐츠</span>
                  <strong className="admin-summary__value">{contentDrafts.length}개</strong>
                </div>
                <div className="admin-summary__card">
                  <span className="admin-summary__label">메인 대표 리액션</span>
                  <strong className="admin-summary__value">{featuredReactionCount}개</strong>
                </div>
              </section>

              <section className="panel-section">
                <SectionHeader
                  eyebrow="Home Copy"
                  title="대문 문구 설정"
                  description="브랜드명, 태그라인, 히어로 배지, 대문 문구를 수정하면 메인 상단에 바로 반영됩니다."
                />

                <div className="admin-form-grid">
                  <label className="admin-field">
                    <span className="admin-field__label">브랜드명</span>
                    <input
                      className="admin-input"
                      value={settingsDraft.brandName}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          brandName: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-field">
                    <span className="admin-field__label">브랜드 태그라인</span>
                    <input
                      className="admin-input"
                      value={settingsDraft.brandTagline}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          brandTagline: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-field">
                    <span className="admin-field__label">히어로 배지</span>
                    <input
                      className="admin-input"
                      value={settingsDraft.heroBadge}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          heroBadge: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span className="admin-field__label">히어로 상단 문구</span>
                    <textarea
                      className="admin-textarea"
                      rows={2}
                      value={settingsDraft.heroToolbarCopy}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          heroToolbarCopy: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span className="admin-field__label">대문 제목</span>
                    <textarea
                      className="admin-textarea"
                      rows={2}
                      value={settingsDraft.heroTitle}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          heroTitle: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-field admin-field--full">
                    <span className="admin-field__label">대문 설명</span>
                    <textarea
                      className="admin-textarea"
                      rows={3}
                      value={settingsDraft.heroDescription}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          heroDescription: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="admin-section__actions">
                  <button
                    className="chip-button chip-button--solid"
                    type="button"
                    disabled={savingKey === "settings"}
                    onClick={() =>
                      void runWithSaving("settings", async () => {
                        await apiClient.saveAdminHomeSettings(savedToken, settingsDraft);
                        await refreshDashboard();
                      })
                    }
                  >
                    대문 문구 저장
                  </button>
                </div>
              </section>

              <section className="panel-section">
                <SectionHeader
                  eyebrow="Categories"
                  title="카테고리 관리"
                  description="카테고리는 DB에서 읽고 쓰며, 활성 여부와 정렬 순서를 관리자에서 제어합니다."
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
                              handleCategoryChange(category.id, "slug", event.target.value)
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
                              handleCategoryChange(
                                category.id,
                                "sortOrder",
                                Number(event.target.value),
                              )
                            }
                          />
                        </label>
                        <label className="admin-checkbox">
                          <input
                            type="checkbox"
                            checked={category.isActive}
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
                          type="button"
                          disabled={savingKey === `category-${category.id}`}
                          onClick={() =>
                            void runWithSaving(`category-${category.id}`, async () => {
                              await apiClient.updateAdminCategory(savedToken, category.id, {
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

                <article className="admin-card admin-card--new">
                  <p className="admin-card__title">새 카테고리 등록</p>
                  <div className="admin-card__grid admin-card__grid--category">
                    <label className="admin-field">
                      <span className="admin-field__label">slug</span>
                      <input
                        className="admin-input"
                        value={newCategoryDraft.slug}
                        onChange={(event) =>
                          setNewCategoryDraft((current) => ({
                            ...current,
                            slug: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">이름</span>
                      <input
                        className="admin-input"
                        value={newCategoryDraft.nameKo}
                        onChange={(event) =>
                          setNewCategoryDraft((current) => ({
                            ...current,
                            nameKo: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">정렬</span>
                      <input
                        className="admin-input"
                        type="number"
                        value={newCategoryDraft.sortOrder}
                        onChange={(event) =>
                          setNewCategoryDraft((current) => ({
                            ...current,
                            sortOrder: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={newCategoryDraft.isActive}
                        onChange={(event) =>
                          setNewCategoryDraft((current) => ({
                            ...current,
                            isActive: event.target.checked,
                          }))
                        }
                      />
                      <span>활성</span>
                    </label>
                  </div>
                  <div className="admin-section__actions">
                    <button
                      className="chip-button chip-button--solid"
                      type="button"
                      disabled={savingKey === "category-new"}
                      onClick={() =>
                        void runWithSaving("category-new", async () => {
                          await apiClient.createAdminCategory(savedToken, newCategoryDraft);
                          setNewCategoryDraft(createNewCategoryDraft());
                          await refreshDashboard();
                        })
                      }
                    >
                      카테고리 추가
                    </button>
                  </div>
                </article>
              </section>

              <section className="panel-section">
                <SectionHeader
                  eyebrow="Contents"
                  title="콘텐츠 관리"
                  description="콘텐츠 카드에 노출될 기본 메타데이터를 등록하고 수정합니다. 이후 수집과 카테고리별 목록이 이 데이터를 기준으로 동작합니다."
                />

                <div className="admin-card-list">
                  {contentDrafts.map((content) => (
                    <article key={content.id} className="admin-card">
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
                            {categoryOptions.map((category) => (
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
                          <span className="admin-field__label">한글 제목</span>
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
                                event.target.value.length > 0 ? Number(event.target.value) : null,
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
                              handleContentChange(content.id, "status", event.target.value as ContentStatus)
                            }
                          >
                            <option value="active">active</option>
                            <option value="hidden">hidden</option>
                          </select>
                        </label>
                        <label className="admin-field admin-field--full">
                          <span className="admin-field__label">별칭 / 검색어</span>
                          <input
                            className="admin-input"
                            value={content.aliasesText}
                            onChange={(event) =>
                              handleContentChange(content.id, "aliasesText", event.target.value)
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
                      </div>

                      <div className="admin-card__meta">
                        <span>리액션 {content.reactionCount}개</span>
                        <span>누적 {formatCompactNumber(content.totalViews)}</span>
                        <span>
                          최신 {content.latestReactionAt ? formatKoreanDate(content.latestReactionAt) : "없음"}
                        </span>
                      </div>

                      <div className="admin-section__actions">
                        <button
                          className="chip-button chip-button--solid"
                          type="button"
                          disabled={savingKey === `content-${content.id}`}
                          onClick={() =>
                            void runWithSaving(`content-${content.id}`, async () => {
                              await apiClient.updateAdminContent(savedToken, content.id, {
                                categoryId: content.categoryId,
                                slug: content.slug,
                                titleKo: content.titleKo,
                                titleEn: normalizeOptionalText(content.titleEn ?? ""),
                                aliases: parseAliases(content.aliasesText),
                                releaseYear: content.releaseYear,
                                thumbnailUrl: normalizeOptionalText(content.thumbnailUrl ?? ""),
                                description: normalizeOptionalText(content.description ?? ""),
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

                <article className="admin-card admin-card--new">
                  <p className="admin-card__title">새 콘텐츠 등록</p>
                  <div className="admin-card__grid">
                    <label className="admin-field">
                      <span className="admin-field__label">카테고리</span>
                      <select
                        className="admin-select"
                        value={newContentDraft.categoryId}
                        onChange={(event) =>
                          setNewContentDraft((current) => ({
                            ...current,
                            categoryId: Number(event.target.value),
                          }))
                        }
                      >
                        {categoryOptions.map((category) => (
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
                        value={newContentDraft.slug}
                        onChange={(event) =>
                          setNewContentDraft((current) => ({
                            ...current,
                            slug: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">한글 제목</span>
                      <input
                        className="admin-input"
                        value={newContentDraft.titleKo}
                        onChange={(event) =>
                          setNewContentDraft((current) => ({
                            ...current,
                            titleKo: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">영문 제목</span>
                      <input
                        className="admin-input"
                        value={newContentDraft.titleEn}
                        onChange={(event) =>
                          setNewContentDraft((current) => ({
                            ...current,
                            titleEn: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">출시 연도</span>
                      <input
                        className="admin-input"
                        type="number"
                        value={newContentDraft.releaseYear}
                        onChange={(event) =>
                          setNewContentDraft((current) => ({
                            ...current,
                            releaseYear: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">상태</span>
                      <select
                        className="admin-select"
                        value={newContentDraft.status}
                        onChange={(event) =>
                          setNewContentDraft((current) => ({
                            ...current,
                            status: event.target.value as ContentStatus,
                          }))
                        }
                      >
                        <option value="active">active</option>
                        <option value="hidden">hidden</option>
                      </select>
                    </label>
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">별칭 / 검색어</span>
                      <input
                        className="admin-input"
                        value={newContentDraft.aliasesText}
                        onChange={(event) =>
                          setNewContentDraft((current) => ({
                            ...current,
                            aliasesText: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">대표 이미지 URL</span>
                      <input
                        className="admin-input"
                        value={newContentDraft.thumbnailUrl}
                        onChange={(event) =>
                          setNewContentDraft((current) => ({
                            ...current,
                            thumbnailUrl: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="admin-field admin-field--full">
                      <span className="admin-field__label">설명</span>
                      <textarea
                        className="admin-textarea"
                        rows={3}
                        value={newContentDraft.description}
                        onChange={(event) =>
                          setNewContentDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="admin-section__actions">
                    <button
                      className="chip-button chip-button--solid"
                      type="button"
                      disabled={savingKey === "content-new"}
                      onClick={() =>
                        void runWithSaving("content-new", async () => {
                          await apiClient.createAdminContent(savedToken, {
                            categoryId: newContentDraft.categoryId,
                            slug: newContentDraft.slug,
                            titleKo: newContentDraft.titleKo,
                            titleEn: normalizeOptionalText(newContentDraft.titleEn),
                            aliases: parseAliases(newContentDraft.aliasesText),
                            releaseYear:
                              newContentDraft.releaseYear.trim().length > 0
                                ? Number(newContentDraft.releaseYear)
                                : null,
                            thumbnailUrl: normalizeOptionalText(newContentDraft.thumbnailUrl),
                            description: normalizeOptionalText(newContentDraft.description),
                            status: newContentDraft.status,
                          });
                          setNewContentDraft(createNewContentDraft(categoryOptions));
                          await refreshDashboard();
                        })
                      }
                    >
                      콘텐츠 추가
                    </button>
                  </div>
                </article>
              </section>

              <section className="panel-section">
                <SectionHeader
                  eyebrow="Featured Reactions"
                  title="메인 대표 유튜브 반응"
                  description="현재 소개되는 유튜브 반응을 관리자에서 직접 선정합니다. 제목과 소개글을 함께 수정하고 메인 노출 순서를 지정할 수 있습니다."
                />

                <div className="admin-card-list">
                  {reactionDrafts.map((reaction) => (
                    <article key={reaction.youtubeVideoId} className="admin-card">
                      <div className="admin-card__head">
                        <div>
                          <p className="admin-card__title">{reaction.displayTitle}</p>
                          <p className="admin-card__subtitle">
                            {reaction.categoryNameKo} · {reaction.contentTitleKo} · {reaction.channelName}
                          </p>
                        </div>
                        <div className="admin-card__badges">
                          <span className="admin-badge">조회수 {formatCompactNumber(reaction.viewCount)}</span>
                          <span className="admin-badge">댓글 {formatCompactNumber(reaction.commentCount)}</span>
                          <span className="admin-badge">{formatKoreanDate(reaction.publishedAt)}</span>
                        </div>
                      </div>

                      <div className="admin-card__grid">
                        <label className="admin-field admin-field--full">
                          <span className="admin-field__label">노출 제목</span>
                          <input
                            className="admin-input"
                            value={reaction.adminTitle ?? ""}
                            placeholder={reaction.originalTitle}
                            onChange={(event) =>
                              handleReactionChange(reaction.id, "adminTitle", event.target.value)
                            }
                          />
                        </label>
                        <label className="admin-field admin-field--full">
                          <span className="admin-field__label">유튜브 소개글</span>
                          <textarea
                            className="admin-textarea"
                            rows={3}
                            value={reaction.adminDescription ?? ""}
                            placeholder="메인에서 보여줄 요약 소개를 입력하세요."
                            onChange={(event) =>
                              handleReactionChange(reaction.id, "adminDescription", event.target.value)
                            }
                          />
                        </label>
                        <label className="admin-checkbox">
                          <input
                            type="checkbox"
                            checked={reaction.isFeatured}
                            onChange={(event) =>
                              handleReactionChange(reaction.id, "isFeatured", event.target.checked)
                            }
                          />
                          <span>메인 대표 노출</span>
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
                          target="_blank"
                          rel="noreferrer"
                        >
                          유튜브 원본 보기
                        </a>
                        <button
                          className="chip-button chip-button--solid"
                          type="button"
                          disabled={savingKey === `reaction-${reaction.id}`}
                          onClick={() =>
                            void runWithSaving(`reaction-${reaction.id}`, async () => {
                              await apiClient.updateAdminReaction(savedToken, reaction.youtubeVideoId, {
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
      </main>

      <AppFooter updatedAt={dashboardResource.data?.reactions[0]?.publishedAt ?? null} />
    </div>
  );
}
