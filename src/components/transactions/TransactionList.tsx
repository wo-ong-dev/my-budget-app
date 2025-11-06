import type { Transaction } from "../../types";
import { formatCurrency, formatDateLabel } from "../../utils/formatters";
import { getCategoryIcon } from "../../utils/iconMappings";

type TransactionListProps = {
  transactions: Transaction[];
  isLoading?: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  totalIncome?: number;
  totalExpense?: number;
  balance?: number;
};

function TransactionList({
  transactions,
  isLoading = false,
  onEdit,
  totalIncome = 0,
  totalExpense = 0,
  balance = 0
}: TransactionListProps) {
  if (isLoading) {
    return <div className="list-placeholder">목록을 불러오는 중입니다...</div>;
  }

  return (
    <>
      {/* 수입/지출/잔액 요약 카드 */}
      <div className="history-summary-card">
        <div className="history-summary-item history-summary-item--income">
          <span className="history-summary-icon">💰</span>
          <div className="history-summary-content">
            <span className="history-summary-label">수입</span>
            <strong className="history-summary-amount">{formatCurrency(totalIncome)}원</strong>
          </div>
        </div>
        <div className="history-summary-item history-summary-item--expense">
          <span className="history-summary-icon">💸</span>
          <div className="history-summary-content">
            <span className="history-summary-label">지출</span>
            <strong className="history-summary-amount">{formatCurrency(totalExpense)}원</strong>
          </div>
        </div>
        <div className="history-summary-item history-summary-item--balance">
          <span className="history-summary-icon">➖</span>
          <div className="history-summary-content">
            <span className="history-summary-label">잔액</span>
            <strong className="history-summary-amount">{formatCurrency(balance)}원</strong>
          </div>
        </div>
      </div>

      {/* 상세 내역 헤더 */}
      <div className="history-list-header">
        <span className="history-list-title">상세 내역 ({transactions.length}건)</span>
      </div>

      {transactions.length === 0 ? (
        <div className="list-placeholder">조건에 맞는 내역이 없습니다.</div>
      ) : (
        <ul className="transaction-list">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="transaction-card transaction-card--clickable"
              onClick={() => onEdit(transaction)}
            >
              <div className="transaction-card__header">
                <div className="transaction-card__title">
                  <span className="transaction-card__icon">{getCategoryIcon(transaction.category ?? "기타")}</span>
                  <span className="transaction-card__category">{transaction.category ?? "-"}</span>
                </div>
                <span
                  className={`transaction-card__amount${
                    transaction.type === "수입"
                      ? " transaction-card__amount--income"
                      : " transaction-card__amount--expense"
                  }`}
                >
                  {transaction.type === "수입" ? "+" : "-"}{formatCurrency(transaction.amount)}원
                </span>
              </div>

              <div className="transaction-card__details">
                <span className="transaction-card__date">{formatDateLabel(transaction.date)}</span>
                <span className="transaction-card__account">{transaction.account ?? "-"}</span>
              </div>

              {transaction.memo ? (
                <div className="transaction-card__memo-section">
                  <span className="transaction-card__memo-icon">📝</span>
                  <span className="transaction-card__memo">{transaction.memo}</span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default TransactionList;
