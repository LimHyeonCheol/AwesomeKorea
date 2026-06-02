import { startTransition, useEffect, useState } from "react";

import { MVP_CATEGORIES } from "@awesomekorea/shared";
import type {
  Category,
  CategoryFilter,
  ContentSummary,
  HomePayload,
  HomeSiteCopy,
  SortOrder,
} from "@awesomekorea/shared";

import { AppFooter } from "../components/common/AppFooter";
import { AppHeader } from "../components/common/AppHeader";
import { SectionHeader } from "../components/common/SectionHeader";
import { StatusNotice } from "../components/common/StatusNotice";
import { CategoryToolbar } from "../components/home/CategoryToolbar";
import { ContentGridSection } from "../components/home/ContentGridSection";
import { HeroBanner, type HeroBannerSlide } from "../components/home/HeroBanner";
import { TopRankingSection } from "../components/home/TopRankingSection";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { apiClient } from "../lib/api-client";

const FEATURED_REACTION_LIMIT = 4;
const FEATURED_SLIDE_LIMIT = 4;

const DEFAULT_SITE_COPY: HomeSiteCopy = {
  brandName: "AwesomeKorea",
  brandTagline: "Awesome Korea - 해외 반응 모음",
  heroBadge: "운영자 추천",
  heroToolbarCopy: "운영자가 직접 고른 해외 유튜브 반응을 메인에서 빠르게 확인해보세요.",
  heroTitle: "지금 공개된 대표 반응을 운영자가 직접 큐레이션합니다.",
  heroDescription:
    "메인 문구, 카테고리, 유튜브 제목과 소개글, 메인 대표 반응까지 모두 운영자가 직접 조정할 수 있습니다.",
};

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

const buildContentSummaryMap = (home: HomePayload) => {
  const contentMap = new Map<string, ContentSummary>();

  for (const section of home.popularByCategory) {
    for (const item of section.items) {
      if (!contentMap.has(item.slug)) {
        contentMap.set(item.slug, item);
      }
    }
  }

  return contentMap;
};

const buildFeaturedSlideTags = (content: ContentSummary, channelName: string) =>
  Array.from(
    new Set(
      [
        content.categoryNameKo,
        content.titleKo,
        content.titleEn ?? null,
        content.releaseDate ?? null,
        channelName,
        "운영 추천",
      ].filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, 5);

const buildEditorialSlides = (home: HomePayload): HeroBannerSlide[] =>
  home.featuredReactions.map((entry) => ({
    categoryNameKo: entry.categoryNameKo,
    contentSlug: entry.contentSlug,
    contentTitle: entry.contentTitle,
    message: entry.reaction.description ?? home.siteCopy.heroDescription,
    overview:
      entry.reaction.description ??
      `${entry.contentTitle} 관련 대표 반응을 운영자가 메인에서 직접 노출 중입니다.`,
    primaryReaction: entry.reaction,
    reactionCount: entry.reactionCount,
    relatedReactions: [entry.reaction],
    tags: Array.from(
      new Set([entry.categoryNameKo, entry.contentTitle, entry.reaction.channelName, "운영자 선정"]),
    ),
    totalViews: entry.totalViews,
  }));

const buildFeaturedSlides = async (home: HomePayload): Promise<HeroBannerSlide[]> => {
  const contentMap = buildContentSummaryMap(home);
  const candidateSlugs = Array.from(
    new Set([...(home.hero ? [home.hero.contentSlug] : []), ...home.top10.map((item) => item.contentSlug)]),
  ).slice(0, FEATURED_SLIDE_LIMIT);

  const slides = await Promise.all(
    candidateSlugs.map(async (slug) => {
      const cachedContent = contentMap.get(slug);
      const [detailPayload, reactionPayload] = await Promise.all([
        cachedContent ? Promise.resolve(null) : apiClient.getContentDetail(slug).catch(() => null),
        apiClient.getReactions(slug, "popular", 1, FEATURED_REACTION_LIMIT).catch(() => null),
      ]);

      const content = cachedContent ?? detailPayload?.content ?? null;
      const primaryReaction =
        reactionPayload?.featuredReaction ?? reactionPayload?.items[0] ?? detailPayload?.featuredReaction ?? null;

      if (!content || !primaryReaction) {
        return null;
      }

      return {
        categoryNameKo: content.categoryNameKo,
        contentSlug: content.slug,
        contentTitle: content.titleKo,
        message:
          home.hero?.contentSlug === slug
            ? home.hero.message
            : `${content.titleKo} 관련 해외 반응을 메인에서 바로 이어서 볼 수 있게 모아두었습니다.`,
        overview:
          content.description ?? `${content.titleKo} 관련 대표 리액션을 빠르게 훑어보고 상세 목록으로 이동할 수 있습니다.`,
        primaryReaction,
        reactionCount: content.reactionCount,
        relatedReactions: reactionPayload?.items.slice(0, FEATURED_REACTION_LIMIT) ?? [primaryReaction],
        tags: buildFeaturedSlideTags(content, primaryReaction.channelName),
        totalViews: content.totalViews,
      } satisfies HeroBannerSlide;
    }),
  );

  return slides.filter((slide): slide is HeroBannerSlide => slide !== null);
};

interface HomePageProps {
  homeAnchor: string | null;
  initialSort: SortOrder | null;
  onOpenAdmin: () => void;
  onOpenContent: (slug: string) => void;
}

export function HomePage({ homeAnchor, initialSort, onOpenAdmin, onOpenContent }: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [selectedSort, setSelectedSort] = useState<SortOrder>(initialSort ?? "popular");

  useEffect(() => {
    startTransition(() => {
      setSelectedCategory("all");
      setSelectedSort(initialSort ?? "popular");
    });
  }, [initialSort]);

  useEffect(() => {
    if (!homeAnchor) {
      return;
    }

    scrollToSection(homeAnchor);
  }, [homeAnchor]);

  const categoryResource = useAsyncResource(() => apiClient.getCategories(), [], {
    initialData: { items: fallbackCategories },
  });
  const homeResource = useAsyncResource(() => apiClient.getHome(), [], {
    initialData: null,
  });
  const editorialSlides = homeResource.data ? buildEditorialSlides(homeResource.data) : [];
  const featuredSlideResource = useAsyncResource<HeroBannerSlide[]>(
    () => (homeResource.data ? buildFeaturedSlides(homeResource.data) : Promise.resolve([])),
    [homeResource.data?.updatedAt, homeResource.data?.hero?.contentSlug, editorialSlides.length],
    {
      enabled: Boolean(homeResource.data) && editorialSlides.length === 0,
      initialData: [],
    },
  );
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
  const siteCopy = homeResource.data?.siteCopy ?? DEFAULT_SITE_COPY;

  return (
    <div className="app-shell">
      <AppHeader
        brandName={siteCopy.brandName}
        brandTagline={siteCopy.brandTagline}
        onOpenAdmin={onOpenAdmin}
        onOpenRanking={() => scrollToSection("ranking-section")}
        onOpenCategories={() => scrollToSection("category-section")}
        onOpenLatest={handleOpenLatest}
      />

      <main className="site-main">
        <div className="page-stack">
          <HeroBanner
            hero={homeResource.data?.hero ?? null}
            isLoading={homeResource.isLoading || (editorialSlides.length === 0 && featuredSlideResource.isLoading)}
            siteCopy={siteCopy}
            slides={editorialSlides.length > 0 ? editorialSlides : featuredSlideResource.data ?? []}
            onLatestClick={handleOpenLatest}
            onOpenContent={onOpenContent}
          />

          {homeResource.error ? (
            <StatusNotice
              title="홈 데이터를 불러오지 못했습니다."
              description={homeResource.error}
              tone="danger"
              actionLabel="다시 시도"
              onAction={homeResource.refetch}
            />
          ) : null}

          <TopRankingSection
            items={homeResource.data?.top10 ?? []}
            onOpenContent={onOpenContent}
            updatedAt={homeResource.data?.updatedAt ?? null}
          />

          {homeResource.data?.featuredContents.length ? (
            <section className="panel-section">
              <div className="panel-section__header">
                <SectionHeader
                  eyebrow="Editorial Picks"
                  title={homeResource.data.featuredContents[0]?.headline ?? "운영 우선 콘텐츠"}
                  description={
                    homeResource.data.featuredContents[0]?.body ??
                    "운영자가 직접 편성한 우선 콘텐츠를 먼저 확인할 수 있습니다."
                  }
                />
              </div>
              <ContentGridSection
                items={homeResource.data.featuredContents.map((entry) => entry.content)}
                onOpenContent={onOpenContent}
              />
            </section>
          ) : null}

          <section className="panel-section" id="category-section">
            <div className="panel-section__header">
              <SectionHeader
                eyebrow="Category Discover"
                title="카테고리별 둘러보기"
                description="영화, 드라마, 웹툰, 음악, 게임까지 같은 구조로 빠르게 탐색할 수 있습니다."
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
                title="콘텐츠 목록을 불러오는 중"
                description="선택한 카테고리와 정렬 기준에 맞는 콘텐츠를 정리하고 있습니다."
              />
            ) : null}

            {contentResource.error ? (
              <StatusNotice
                title="콘텐츠 목록을 불러오지 못했습니다."
                description={contentResource.error}
                tone="danger"
                actionLabel="다시 시도"
                onAction={contentResource.refetch}
              />
            ) : null}

            {contentResource.data ? (
              <ContentGridSection items={contentResource.data.items} onOpenContent={onOpenContent} />
            ) : null}
          </section>
        </div>
      </main>

      <AppFooter updatedAt={homeResource.data?.updatedAt ?? null} />
    </div>
  );
}
