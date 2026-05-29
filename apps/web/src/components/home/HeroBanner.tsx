import type { HeroHighlight } from "@awesomekorea/shared";

interface HeroBannerProps {
  hero: HeroHighlight | null;
  onLatestClick: () => void;
  onOpenContent: (slug: string) => void;
}

export function HeroBanner({ hero, onLatestClick, onOpenContent }: HeroBannerProps) {
  return (
    <section className="hero-banner">
      <div className="hero-banner__inner">
        <div className="hero-banner__copy">
          <span className="hero-banner__live-badge">실시간</span>
          <h1 className="hero-banner__title">
            해외 유튜브에서 지금 반응이 붙는 한국 콘텐츠를 가장 빠르게 확인합니다.
          </h1>
          <p className="hero-banner__description">
            Cloudflare 기반 MVP로 홈 랭킹, 카테고리 필터, 상세 인라인 플레이어까지 한 화면에
            묶었습니다.
          </p>
          <div className="hero-banner__actions">
            <button
              className="chip-button chip-button--solid"
              type="button"
              onClick={() => hero && onOpenContent(hero.contentSlug)}
              disabled={!hero}
            >
              대표 콘텐츠 보기
            </button>
            <button className="chip-button chip-button--ghost" type="button" onClick={onLatestClick}>
              최신 반응 보기
            </button>
          </div>
        </div>

        <div className="hero-banner__highlight">
          <p className="hero-banner__highlight-title">오늘 가장 많이 본 반응</p>
          {hero ? (
            <>
              <p className="hero-banner__highlight-name">{hero.titleKo}</p>
              <p className="hero-banner__highlight-meta">
                {hero.categoryNameKo} · 리액션 {hero.reactionCount}개
              </p>
              <p className="hero-banner__highlight-copy">{hero.message}</p>
            </>
          ) : (
            <p className="hero-banner__highlight-copy">홈 랭킹 데이터를 불러오는 중입니다.</p>
          )}
        </div>
      </div>
    </section>
  );
}
