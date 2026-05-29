import { startTransition, useState } from "react";

import { MVP_CATEGORIES } from "@awesomekorea/shared";
import type { Category, CategoryFilter, SortOrder } from "@awesomekorea/shared";

import { AppFooter } from "../components/common/AppFooter";
import { AppHeader } from "../components/common/AppHeader";
import { SectionHeader } from "../components/common/SectionHeader";
import { StatusNotice } from "../components/common/StatusNotice";
import { ContentDetailOverlay } from "../components/content/ContentDetailOverlay";
import { CategoryToolbar } from "../components/home/CategoryToolbar";
import { ContentGridSection } from "../components/home/ContentGridSection";
import { HeroBanner } from "../components/home/HeroBanner";
import { TopRankingSection } from "../components/home/TopRankingSection";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { useContentOverlayState } from "../hooks/useContentOverlayState";
import { apiClient } from "../lib/api-client";

const fallbackCategories: Category[] = MVP_CATEGORIES.map((category, index) => ({
  id: index + 1,
  slug: category.slug,
  nameKo: category.nameKo,
  sortOrder: category.sortOrder,
  isActive: category.isActive,
}));

const scrollToSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

export function HomePage() {
  const { activeContentSlug, closeContent, openContent } = useContentOverlayState();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [selectedSort, setSelectedSort] = useState<SortOrder>("popular");

  const categoryResource = useAsyncResource(() => apiClient.getCategories(), [], {
    initialData: { items: fallbackCategories },
  });
  const homeResource = useAsyncResource(() => apiClient.getHome(), [], {
    initialData: null,
  });
  const contentResource = useAsyncResource(
    () =>
      apiClient.getContents({
        category: selectedCategory,
        sort: selectedSort,
        page: 1,
        limit: 8,
      }),
    [selectedCategory, selectedSort],
    {
      initialData: null,
    },
  );

  const handleCategorySelect = (category: CategoryFilter) => {
    startTransition(() => {
      setSelectedCategory(category);
    });
  };

  const handleSortSelect = (sort: SortOrder) => {
    startTransition(() => {
      setSelectedSort(sort);
    });
  };

  const handleOpenLatest = () => {
    handleSortSelect("latest");
    scrollToSection("category-section");
  };

  const categories = categoryResource.data?.items ?? fallbackCategories;

  return (
    <div className="app-shell">
      <AppHeader
        onOpenRanking={() => scrollToSection("ranking-section")}
        onOpenCategories={() => scrollToSection("category-section")}
        onOpenLatest={handleOpenLatest}
      />

      <main className="site-main">
        <div className="page-stack">
          <HeroBanner
            hero={homeResource.data?.hero ?? null}
            onLatestClick={handleOpenLatest}
            onOpenContent={openContent}
          />

          {homeResource.error ? (
            <StatusNotice
              title="홈 데이터를 불러오지 못했습니다"
              description={homeResource.error}
              tone="danger"
              actionLabel="다시 시도"
              onAction={homeResource.refetch}
            />
          ) : null}

          <TopRankingSection
            items={homeResource.data?.top10 ?? []}
            onOpenContent={openContent}
            updatedAt={homeResource.data?.updatedAt ?? null}
          />

          <section className="panel-section" id="category-section">
            <div className="panel-section__header">
              <SectionHeader
                eyebrow="Category Discover"
                title="카테고리별 인기"
                description="영화, 드라마, 만화, 노래를 같은 상세 컴포넌트로 재사용하면서 빠르게 탐색합니다."
              />
            </div>

            <CategoryToolbar
              categories={categories}
              selectedCategory={selectedCategory}
              selectedSort={selectedSort}
              onSelectCategory={handleCategorySelect}
              onSelectSort={handleSortSelect}
            />

            {contentResource.isLoading && !contentResource.data ? (
              <StatusNotice
                title="카드 목록을 불러오는 중"
                description="선택한 카테고리와 정렬 기준에 맞는 콘텐츠를 정리하고 있습니다."
              />
            ) : null}

            {contentResource.error ? (
              <StatusNotice
                title="카드 목록을 불러오지 못했습니다"
                description={contentResource.error}
                tone="danger"
                actionLabel="다시 시도"
                onAction={contentResource.refetch}
              />
            ) : null}

            {contentResource.data ? (
              <ContentGridSection items={contentResource.data.items} onOpenContent={openContent} />
            ) : null}
          </section>
        </div>
      </main>

      <AppFooter updatedAt={homeResource.data?.updatedAt ?? null} />

      <ContentDetailOverlay
        contentSlug={activeContentSlug}
        isOpen={Boolean(activeContentSlug)}
        onClose={closeContent}
      />
    </div>
  );
}
