import { useEffect, useMemo, useState } from "react";
import type { TransactionSummary, MonthlyComparison } from "../../types";
import { formatCurrency, monthLabel } from "../../utils/formatters";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import OtherCategoriesModal from "./OtherCategoriesModal";

type CategoryViewType = "chart" | "list";

type SummaryPanelProps = {
  summary: TransactionSummary | null;
  loading?: boolean;
  currentMonth?: string;
  availableMonths?: string[];
  onMonthChange?: (month: string) => void;
  monthlyComparison?: MonthlyComparison | null;
  onCategoryClick?: (category: string) => void;
  onAccountClick?: (account: string) => void;
};

// 라이트/다크 모드별 차트 색상
const LIGHT_COLORS = ["#4A90E2", "#9B59B6", "#F1C40F", "#E67E22", "#27AE60", "#1ABC9C", "#3498DB", "#E74C3C"];
const DARK_COLORS = ["#5B9BD5", "#8E6BAD", "#D4A84B", "#CD8244", "#4A9D6E", "#3A9A8C", "#5AA3C7", "#C9605A"];

function SummaryPanel({
  summary,
  loading = false,
  currentMonth,
  availableMonths = [],
  onMonthChange,
  monthlyComparison,
  onCategoryClick,
  onAccountClick
}: SummaryPanelProps) {
  const [categoryView, setCategoryView] = useState<CategoryViewType>("chart");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOtherModalOpen, setIsOtherModalOpen] = useState(false);
  const [otherCategoriesData, setOtherCategoriesData] = useState<{ details: Array<{ category: string; amount: number }>; total: number }>({ details: [], total: 0 });

  // 테마 변경 감지
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      setIsDarkMode(theme === "dark");
    };

    checkTheme();

    // MutationObserver로 테마 변경 감지
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    return () => observer.disconnect();
  }, []);

  const COLORS = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  // --- useMemo는 반드시 early return 위에 위치 (React rules of hooks) ---
  // 도넛 차트 데이터 준비 - 상위 7개만 표시, 나머지는 '그 외'로 묶기
  const chartData = useMemo(() => {
    const allCategories = summary?.categories
      ?.filter((item) => item.expense > 0)
      .sort((a, b) => b.expense - a.expense) || [];

    if (allCategories.length > 7) {
      // 상위 7개
      const top7 = allCategories.slice(0, 7).map((item) => ({
        name: item.category,
        value: item.expense,
      }));

      // 나머지는 '그 외'로 묶기
      const others = allCategories.slice(7);
      const othersTotal = others.reduce((sum, item) => sum + item.expense, 0);

      if (othersTotal > 0) {
        return [
          ...top7,
          {
            name: "그 외",
            value: othersTotal,
            details: others.map(item => ({ category: item.category, amount: item.expense }))
          }
        ];
      } else {
        return top7;
      }
    } else {
      return allCategories.map((item) => ({
        name: item.category,
        value: item.expense,
      }));
    }
  }, [summary?.categories]);
  // --- hooks 끝 ---

  // 로딩 중일 때 스켐레톤 UI 표시
  if (loading) {
    return (
      <div className="summary-panel">
        <section className="summary-card">
          <header className="summary-card__header">
            <div className="summary-card__title-row">
              <div>
                <h3>이번 달 요약</h3>
              </div>
            </div>
          </header>
          <ul className="summary-totals">
            <li>
              <span>총 수입</span>
              <div className="skeleton skeleton-line skeleton-line--short"></div>
            </li>
            <li>
              <span>총 지출</span>
              <div className="skeleton skeleton-line skeleton-line--short"></div>
            </li>
            <li>
              <span>잔액</span>
              <div className="skeleton skeleton-line skeleton-line--short"></div>
            </li>
          </ul>
        </section>

        <section className="stats-card stats-card--chart">
          <h4 className="stats-card-title"><span className="stats-card-icon">📊</span>카테고리별 지출</h4>
          <div className="chart-container">
            <div className="skeleton skeleton-chart"></div>
          </div>
        </section>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="list-placeholder">
        요약 데이터가 없습니다.
      </div>
    );
  }

  const currentMonthIndex = currentMonth ? availableMonths.indexOf(currentMonth) : -1;
  const canGoPrev = currentMonthIndex > -1 && currentMonthIndex < availableMonths.length - 1;
  const canGoNext = currentMonthIndex > 0;

  const goToPrevMonth = () => {
    if (canGoPrev && onMonthChange && currentMonthIndex > -1) {
      onMonthChange(availableMonths[currentMonthIndex + 1]);
    }
  };

  const goToNextMonth = () => {
    if (canGoNext && onMonthChange && currentMonthIndex > -1) {
      onMonthChange(availableMonths[currentMonthIndex - 1]);
    }
  };

  // 커스텀 라벨: 도넛 안에 퍼센트, 밖에 카테고리 이름 표시
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;

    const RADIAN = Math.PI / 180;

    // 3% 미만은 표시 안 함 (겹침 방지)
    if (percent * 100 < 3) return null;

    // 안쪽 라벨: 퍼센트 (조각 중간)
    const innerRadius_center = innerRadius + (outerRadius - innerRadius) * 0.5;
    const innerX = cx + innerRadius_center * Math.cos(-midAngle * RADIAN);
    const innerY = cy + innerRadius_center * Math.sin(-midAngle * RADIAN);

    // 바깥쪽 라벨: 카테고리 이름
    const outerRadius_label = outerRadius * 1.3;
    const outerX = cx + outerRadius_label * Math.cos(-midAngle * RADIAN);
    const outerY = cy + outerRadius_label * Math.sin(-midAngle * RADIAN);

    // 선 끝점 (도넣과 라벨 사이 연결선)
    const lineEndX = cx + outerRadius * 1.05 * Math.cos(-midAngle * RADIAN);
    const lineEndY = cy + outerRadius * 1.05 * Math.sin(-midAngle * RADIAN);

    // 텍스트 정렬 (왼쪽/오른쪽 결정)
    const textAnchor = outerX > cx ? 'start' : 'end';

    // 다크모드에서는 stroke 색상을 더 어둡게 (텍스트 가독성 확보)
    const strokeColor = isDarkMode ? '#111827' : '#ffffff';
    const textColor = isDarkMode ? '#ffffff' : '#343a40';
    const lineColor = isDarkMode ? '#9ca3af' : '#ced4da';

    return (
      <g>
        {/* 안쪽: 퍼센트 표시 */}
        <text
          x={innerX}
          y={innerY}
          fill={textColor}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: '13px',
            fontWeight: 'bold',
            stroke: strokeColor,
            strokeWidth: 3,
            paintOrder: 'stroke fill'
          }}
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>

        {/* 연결선 */}
        <line
          x1={lineEndX}
          y1={lineEndY}
          x2={outerX}
          y2={outerY}
          stroke={lineColor}
          strokeWidth={1}
        />

        {/* 바깥쪽: 카테고리 이름 */}
        <text
          x={outerX}
          y={outerY}
          fill={textColor}
          textAnchor={textAnchor}
          dominantBaseline="central"
          style={{
            fontSize: '12px',
            fontWeight: '600',
            stroke: strokeColor,
            strokeWidth: 2,
            paintOrder: 'stroke fill'
          }}
        >
          {name}
        </text>
      </g>
    );
  };

  // "그 외" 카테고리 클릭 핸들러
  const handleOtherCategoryClick = (data: any) => {
    if (data.name === "그 외" && data.details) {
      setOtherCategoriesData({
        details: data.details,
        total: data.value,
      });
      setIsOtherModalOpen(true);
    } else if (onCategoryClick && data.name !== "그 외") {
      onCategoryClick(data.name);
    }
  };

  // 커스텀 툴팁 컴포넌트
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      if (data.name === "그 외") {
        return (
          <div className="custom-tooltip">
            <p className="tooltip-title">그 외</p>
            <p className="tooltip-value">{formatCurrency(data.value)}원</p>
            <p className="tooltip-hint">클릭하여 상세 보기</p>
          </div>
        );
      }

      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">{data.name}</p>
          <p className="tooltip-value">{formatCurrency(data.value)}원</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="summary-panel">
      <section className="summary-card">
        <header className="summary-card__header">
          <div className="summary-card__title-row">
            {onMonthChange && currentMonth ? (
              <>
                <button
                  type="button"
                  className="month-nav-btn month-nav-btn--light"
                  onClick={goToPrevMonth}
                  disabled={!canGoPrev}
                  aria-label="이전 달"
                >
                  ‹
                </button>
                <div>
                  <h3>이번 달 요약</h3>
                  {summary.periodLabel ? (
                    <div className="summary-card__period">
                      <span className="summary-card__subtitle">{monthLabel(summary.periodLabel)}</span>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="month-nav-btn month-nav-btn--light"
                  onClick={goToNextMonth}
                  disabled={!canGoNext}
                  aria-label="다음 달"
                >
                  ›
                </button>
              </>
            ) : (
              <div>
                <h3>이번 달 요약</h3>
                {summary.periodLabel ? (
                  <div className="summary-card__period">
                    <span className="summary-card__subtitle">{monthLabel(summary.periodLabel)}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </header>
        <ul className="summary-totals">
          <li>
            <span>총 수입</span>
            <strong className="summary-amount summary-amount--income">{formatCurrency(summary.totalIncome)}원</strong>
          </li>
          <li>
            <span>총 지출</span>
            <strong className="summary-amount summary-amount--expense">{formatCurrency(summary.totalExpense)}원</strong>
          </li>
          <li>
            <span>잔액</span>
            <strong className="summary-amount">{formatCurrency(summary.balance)}원</strong>
          </li>
        </ul>
      </section>

      {chartData.length === 0 ? (
        <section className="stats-card">
          <div className="empty-state">
            <span className="empty-state__icon">📊</span>
            <p className="empty-state__text">
              {summary.totalIncome === 0 && summary.totalExpense === 0
                ? "이 달에 내역이 없습니다."
                : "이 달에 지출 내역이 없습니다."}
            </p>
          </div>
        </section>
      ) : null}

      {summary.categories && summary.categories.length > 0 && chartData.length > 0 ? (
        <section className="stats-card stats-card--chart">
          <div className="stats-card-header">
            <h4 className="stats-card-title"><span className="stats-card-icon">📊</span>카테고리별 지출</h4>
            <div className="category-view-tabs">
              <button
                type="button"
                className={`category-view-tab ${categoryView === "chart" ? "category-view-tab--active" : ""}`}
                onClick={() => setCategoryView("chart")}
              >
                차트
              </button>
              <button
                type="button"
                className={`category-view-tab ${categoryView === "list" ? "category-view-tab--active" : ""}`}
                onClick={() => setCategoryView("list")}
              >
                목록
              </button>
            </div>
          </div>

          {categoryView === "chart" ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300} debounce={150}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    isAnimationActive={false}
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        cursor="pointer"
                        onClick={() => handleOtherCategoryClick(entry)}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} animationDuration={0} animationEasing="ease-out" />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="category-list-view">
              <ul className="category-list">
                {chartData.map((item, index) => {
                  const totalExpense = chartData.reduce((sum, d) => sum + d.value, 0);
                  const percentage = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
                  const isOther = item.name === "그 외" && (item as any).details;
                  const isClickable = onCategoryClick || isOther;
                  return (
                    <li
                      key={item.name}
                      className={`category-list-item ${isClickable ? "category-list-item--clickable" : ""}`}
                      onClick={isClickable ? () => handleOtherCategoryClick(item) : undefined}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onKeyDown={isClickable ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOtherCategoryClick(item);
                        }
                      } : undefined}
                    >
                      <div className="category-list-item__header">
                        <div className="category-list-item__name">
                          <span
                            className="category-list-item__color"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span>{item.name}</span>
                        </div>
                        <div className="category-list-item__values">
                          <span className="category-list-item__amount">{formatCurrency(item.value)}원</span>
                          <span className="category-list-item__percentage">{percentage.toFixed(1)}%</span>
                          {isClickable && <span className="category-list-item__arrow">›</span>}
                          {isOther && <span className="category-list-item__badge">상세</span>}
                        </div>
                      </div>
                      <div className="category-list-item__bar">
                        <div
                          className="category-list-item__bar-fill"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="category-list-total">
                <span>총 지출</span>
                <strong>{formatCurrency(chartData.reduce((sum, d) => sum + d.value, 0))}원</strong>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {summary.accounts && summary.accounts.length > 0 ? (
        <section className="stats-card">
          <h4 className="stats-card-title"><span className="stats-card-icon">💳</span>계좌별 지출</h4>
          <ul className="stats-list">
            {summary.accounts.map((item) => (
              <li
                key={item.account}
                className={onAccountClick ? "stats-list-item--clickable" : ""}
                onClick={onAccountClick ? () => onAccountClick(item.account) : undefined}
                role={onAccountClick ? "button" : undefined}
                tabIndex={onAccountClick ? 0 : undefined}
                onKeyDown={onAccountClick ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAccountClick(item.account);
                  }
                } : undefined}
              >
                <span>{item.account}</span>
                <div className="stats-list-item__values">
                  <strong>{formatCurrency(item.expense)}원</strong>
                  {onAccountClick && <span className="stats-list-item__arrow">›</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary.specialStats && summary.specialStats.length > 0 ? (
        <section className="stats-card stats-card--special">
          <h4 className="stats-card-title"><span className="stats-card-icon">⭐</span>특별 집계</h4>
          <ul className="stats-list">
            {summary.specialStats.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong className="summary-amount summary-amount--highlight">{formatCurrency(item.amount)}원</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {monthlyComparison && monthlyComparison.previous ? (
        <section className="stats-card stats-card--comparison">
          <h4 className="stats-card-title"><span className="stats-card-icon">📈</span>월별 비교 분석</h4>

          <div className="comparison-section">
            <h5 className="comparison-subtitle">전월 대비</h5>
            <ul className="comparison-list">
              <li className="comparison-item">
                <div className="comparison-label">
                  <span>수입</span>
                  <span className="comparison-values">
                    {formatCurrency(monthlyComparison.previous.income)}원 → {formatCurrency(monthlyComparison.current.income)}원
                  </span>
                </div>
                <div className={`comparison-change ${monthlyComparison.changes && monthlyComparison.changes.income >= 0 ? 'comparison-change--up' : 'comparison-change--down'}`}>
                  {monthlyComparison.changes && (
                    <>
                      <span className="comparison-arrow">{monthlyComparison.changes.income >= 0 ? '↑' : '↓'}</span>
                      <span>{Math.abs(monthlyComparison.changes.income).toFixed(1)}%</span>
                    </>
                  )}
                </div>
              </li>
              <li className="comparison-item">
                <div className="comparison-label">
                  <span>지출</span>
                  <span className="comparison-values">
                    {formatCurrency(monthlyComparison.previous.expense)}원 → {formatCurrency(monthlyComparison.current.expense)}원
                  </span>
                </div>
                <div className={`comparison-change ${monthlyComparison.changes && monthlyComparison.changes.expense >= 0 ? 'comparison-change--up' : 'comparison-change--down'}`}>
                  {monthlyComparison.changes && (
                    <>
                      <span className="comparison-arrow">{monthlyComparison.changes.expense >= 0 ? '↑' : '↓'}</span>
                      <span>{Math.abs(monthlyComparison.changes.expense).toFixed(1)}%</span>
                    </>
                  )}
                </div>
              </li>
            </ul>
          </div>

          <div className="comparison-section">
            <h5 className="comparison-subtitle">최근 3개월 평균</h5>
            <ul className="comparison-list">
              <li className="comparison-item comparison-item--average">
                <span>평균 수입</span>
                <strong>{formatCurrency(Math.round(monthlyComparison.threeMonthAverage.income))}원</strong>
              </li>
              <li className="comparison-item comparison-item--average">
                <span>평균 지출</span>
                <strong>{formatCurrency(Math.round(monthlyComparison.threeMonthAverage.expense))}원</strong>
              </li>
            </ul>
          </div>
        </section>
      ) : null}

      <OtherCategoriesModal
        open={isOtherModalOpen}
        onClose={() => setIsOtherModalOpen(false)}
        details={otherCategoriesData.details}
        totalAmount={otherCategoriesData.total}
        onCategoryClick={onCategoryClick}
      />
    </div>
  );
}

export default SummaryPanel;
