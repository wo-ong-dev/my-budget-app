import { useMemo } from "react";
import type { TransactionSummary } from "../../types";
import { formatCurrency, monthLabel } from "../../utils/formatters";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type SummaryPanelProps = {
  summary: TransactionSummary | null;
  loading?: boolean;
  currentMonth?: string;
  availableMonths?: string[];
  onMonthChange?: (month: string) => void;
};

function SummaryPanel({
  summary,
  loading = false,
  currentMonth,
  availableMonths = [],
  onMonthChange
}: SummaryPanelProps) {
  // 로딩 중일 때 스켈레톤 UI 표시
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

  // 도넛 차트 데이터 준비 - 상위 7개만 표시, 나머지는 '그 외'로 묶기
  const chartData = useMemo(() => {
    const allCategories = summary.categories
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
  }, [summary.categories]);

  // 도넛 차트 색상 팔레트 (이미지 참고)
  const COLORS = ["#4A90E2", "#9B59B6", "#F1C40F", "#E67E22", "#27AE60", "#1ABC9C", "#3498DB", "#9B59B6"];

  // 커스텀 툴팁 컴포넌트
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      if (data.name === "그 외" && data.details) {
        return (
          <div className="custom-tooltip">
            <p className="tooltip-title">그 외</p>
            <p className="tooltip-total">합계: {formatCurrency(data.value)}원</p>
            <div className="tooltip-divider"></div>
            <ul className="tooltip-details">
              {data.details.map((detail: any, index: number) => (
                <li key={index}>
                  <span>{detail.category}</span>
                  <span>{formatCurrency(detail.amount)}원</span>
                </li>
              ))}
            </ul>
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

      {summary.categories && summary.categories.length > 0 && chartData.length > 0 ? (
        <section className="stats-card stats-card--chart">
          <h4 className="stats-card-title"><span className="stats-card-icon">📊</span>카테고리별 지출</h4>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300} debounce={50}>
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
                  animationDuration={100}
                  isAnimationActive={true}
                  label={(entry: any) => {
                    const percentage = entry.percent * 100;
                    // 3% 미만 항목은 라벨 표시 안 함 (겹침 방지)
                    if (percentage < 3) return '';
                    return `${percentage.toFixed(0)}%`;
                  }}
                  labelLine={false}
                >
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} animationDuration={0} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      {summary.accounts && summary.accounts.length > 0 ? (
        <section className="stats-card">
          <h4 className="stats-card-title"><span className="stats-card-icon">💳</span>계좌별 지출</h4>
          <ul className="stats-list">
            {summary.accounts.map((item) => (
              <li key={item.account}>
                <span>{item.account}</span>
                <strong>{formatCurrency(item.expense)}원</strong>
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
    </div>
  );
}

export default SummaryPanel;