interface AppHeaderProps {
  onOpenCategories: () => void;
  onOpenLatest: () => void;
  onOpenRanking: () => void;
}

export function AppHeader({
  onOpenCategories,
  onOpenLatest,
  onOpenRanking,
}: AppHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button className="brand-mark" type="button" onClick={onOpenRanking}>
          KR
        </button>
        <div className="site-header__brand-copy">
          <p className="site-header__brand-name">어썸코리아</p>
          <p className="site-header__brand-tagline">Awesome Korea - 해외 반응 모음</p>
        </div>
        <nav className="site-header__nav" aria-label="주요 섹션">
          <button className="chip-button chip-button--ghost" type="button" onClick={onOpenRanking}>
            랭킹
          </button>
          <button
            className="chip-button chip-button--ghost"
            type="button"
            onClick={onOpenCategories}
          >
            카테고리
          </button>
          <button className="chip-button chip-button--solid" type="button" onClick={onOpenLatest}>
            최신
          </button>
        </nav>
      </div>
    </header>
  );
}
