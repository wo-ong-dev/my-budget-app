import type { TransactionSummary } from "../../types";
import { formatCurrency } from "../../utils/formatters";

type SummaryPanelProps = {
  summary: TransactionSummary | null;
  loading?: boolean;
  onRefresh?: () => void;
};

function SummaryPanel({ summary, loading = false, onRefresh }: SummaryPanelProps) {
  if (loading) {
    return <div className="list-placeholder">데이터를 불러오는 중입니다...</div>;
  }

  if (!summary) {
    return (
      <div className="list-placeholder">
        요약 데이터가 없습니다.
        {onRefresh ? (
          <button type="button" className="btn btn-secondary" onClick={onRefresh}>
            새로고침
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="summary-panel">
      <section className="summary-card">
        <header className="summary-card__header">
          <div>
            <h3>이번 달 요약</h3>
            {summary.periodLabel ? <span className="summary-card__subtitle">{summary.periodLabel}</span> : null}
          </div>
          {onRefresh ? (
            <button type="button" className="btn btn-secondary" onClick={onRefresh}>
              새로고침
            </button>
          ) : null}
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

      {summary.categories && summary.categories.length > 0 ? (
        <section className="stats-card">
          <h4>카테고리별 지출</h4>
          <ul className="stats-list">
            {summary.categories.map((item) => (
              <li key={item.category}>
                <span>{item.category}</span>
                <strong>{formatCurrency(item.expense)}원</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary.accounts && summary.accounts.length > 0 ? (
        <section className="stats-card">
          <h4>계좌별 지출</h4>
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
    </div>
  );
}

export default SummaryPanel;