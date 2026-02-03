import { useState } from "react";
import type { TransactionFilterState, TransactionType } from "../../types";
import { monthLabel } from "../../utils/formatters";

const typeOptions: Array<{ value: TransactionFilterState["type"]; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "수입", label: "수입" },
  { value: "지출", label: "지출" },
];

type TransactionFiltersProps = {
  filters: TransactionFilterState;
  onChange: (next: TransactionFilterState) => void;
  months: string[];
  accounts: string[];
  categories: string[];
};

function TransactionFilters({ filters, onChange, months, accounts, categories }: TransactionFiltersProps) {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const update = (partial: Partial<TransactionFilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const handleTypeChange = (value: TransactionType | "ALL") => {
    update({ type: value });
  };

  const currentMonthIndex = months.indexOf(filters.month);
  const canGoPrev = currentMonthIndex < months.length - 1;
  const canGoNext = currentMonthIndex > 0;

  const goToPrevMonth = () => {
    if (canGoPrev) {
      update({ month: months[currentMonthIndex + 1] });
    }
  };

  const goToNextMonth = () => {
    if (canGoNext) {
      update({ month: months[currentMonthIndex - 1] });
    }
  };

  // 필터가 활성화되어 있는지 확인 (기본값이 아닌 경우)
  const hasActiveFilters = filters.type !== "ALL" || filters.account !== "ALL" || filters.category !== "ALL" || filters.keyword.trim() !== "";

  return (
    <div className="stats-card">
      <section className="filters-panel">
        <div className="form-group">
          <label className="form-label" htmlFor="filter-month">
            조회 월
          </label>
          <div className="month-navigation">
            <button
              type="button"
              className="month-nav-btn"
              onClick={goToPrevMonth}
              disabled={!canGoPrev}
              aria-label="이전 달"
            >
              ‹
            </button>
            <div className="month-display">
              {monthLabel(filters.month)}
            </div>
            <button
              type="button"
              className="month-nav-btn"
              onClick={goToNextMonth}
              disabled={!canGoNext}
              aria-label="다음 달"
            >
              ›
            </button>
          </div>
        </div>

        <button
          type="button"
          className={`filter-toggle-btn ${isFilterExpanded ? "filter-toggle-btn--expanded" : ""} ${hasActiveFilters ? "filter-toggle-btn--has-active" : ""}`}
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          aria-expanded={isFilterExpanded}
        >
          <span className="filter-toggle-btn__text">
            상세 필터 {hasActiveFilters && <span className="filter-active-dot" />}
          </span>
          <span className={`filter-toggle-btn__icon ${isFilterExpanded ? "filter-toggle-btn__icon--expanded" : ""}`}>
            ›
          </span>
        </button>

        <div className={`filter-collapsible ${isFilterExpanded ? "filter-collapsible--expanded" : ""}`}>
          <div className="filter-collapsible__content">
            <div className="form-group">
              <label className="form-label" htmlFor="filter-type">
                구분
              </label>
              <div className="radio-group radio-group--compact">
                {typeOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`radio-item${filters.type === option.value ? " radio-item--active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="filter-type"
                      value={option.value}
                      checked={filters.type === option.value}
                      onChange={() => handleTypeChange(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-row">
              <div className="form-group">
                <label className="form-label" htmlFor="filter-account">
                  계좌/카드
                </label>
                <select
                  id="filter-account"
                  className="form-select"
                  value={filters.account}
                  onChange={(event) => update({ account: event.target.value })}
                >
                  <option value="ALL">전체</option>
                  {accounts.map((account) => (
                    <option key={account} value={account}>
                      {account}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="filter-category">
                  카테고리
                </label>
                <select
                  id="filter-category"
                  className="form-select"
                  value={filters.category}
                  onChange={(event) => update({ category: event.target.value })}
                >
                  <option value="ALL">전체</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="filter-keyword">
                메모 검색
              </label>
              <input
                id="filter-keyword"
                className="form-input"
                placeholder="키워드를 입력하세요"
                value={filters.keyword}
                onChange={(event) => update({ keyword: event.target.value })}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TransactionFilters;
