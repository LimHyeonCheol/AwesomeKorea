import type { Category, CategoryFilter, SortOrder } from "@awesomekorea/shared";

interface CategoryToolbarProps {
  categories: Category[];
  onSelectCategory: (category: CategoryFilter) => void;
  onSelectSort: (sort: SortOrder) => void;
  selectedCategory: CategoryFilter;
  selectedSort: SortOrder;
}

export function CategoryToolbar({
  categories,
  onSelectCategory,
  onSelectSort,
  selectedCategory,
  selectedSort,
}: CategoryToolbarProps) {
  return (
    <div className="content-toolbar">
      <div className="filter-group" role="tablist" aria-label="카테고리">
        <button
          className={`filter-group__button ${
            selectedCategory === "all" ? "filter-group__button--active" : ""
          }`}
          type="button"
          onClick={() => onSelectCategory("all")}
        >
          전체
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            className={`filter-group__button ${
              selectedCategory === category.slug ? "filter-group__button--active" : ""
            }`}
            type="button"
            onClick={() => onSelectCategory(category.slug)}
          >
            {category.nameKo}
          </button>
        ))}
      </div>

      <div className="sort-toggle" role="tablist" aria-label="정렬">
        <button
          className={`sort-toggle__button ${
            selectedSort === "popular" ? "sort-toggle__button--active" : ""
          }`}
          type="button"
          onClick={() => onSelectSort("popular")}
        >
          인기순
        </button>
        <button
          className={`sort-toggle__button ${
            selectedSort === "latest" ? "sort-toggle__button--active" : ""
          }`}
          type="button"
          onClick={() => onSelectSort("latest")}
        >
          최신순
        </button>
      </div>
    </div>
  );
}
