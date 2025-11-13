import { useMemo } from "react";
import type { Transaction } from "../../types";
import { formatCurrency } from "../../utils/formatters";
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

// 요일을 한글로 반환
function getDayOfWeek(dateString: string): string {
  const date = new Date(dateString);
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[date.getDay()];
}

// 날짜를 "11일"로 포맷
function formatDayLabel(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getDate()}일`;
}

type DailyGroup = {
  date: string;
  dayLabel: string;
  dayOfWeek: string;
  transactions: Transaction[];
  income: number;
  expense: number;
};

function TransactionList({
  transactions,
  isLoading = false,
  onEdit,
  totalIncome = 0,
  totalExpense = 0,
  balance = 0
}: TransactionListProps) {
  // 날짜별로 그룹화
  const dailyGroups = useMemo(() => {
    const groups = new Map<string, DailyGroup>();

    transactions.forEach((transaction) => {
      const dateKey = transaction.date.split('T')[0]; // YYYY-MM-DD

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: dateKey,
          dayLabel: formatDayLabel(transaction.date),
          dayOfWeek: getDayOfWeek(transaction.date),
          transactions: [],
          income: 0,
          expense: 0
        });
      }

      const group = groups.get(dateKey)!;
      group.transactions.push(transaction);

      if (transaction.type === '수입') {
        group.income += transaction.amount;
      } else {
        group.expense += transaction.amount;
      }
    });

    // 날짜 역순으로 정렬 (최신 날짜가 위로)
    return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

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
        <div className="transaction-list-by-date">
          {dailyGroups.map((group) => (
            <div key={group.date} className="daily-transaction-group">
              {/* 일별 헤더 */}
              <div className="daily-header">
                <span className="daily-header-date">
                  {group.dayLabel} {group.dayOfWeek}
                </span>
                <div className="daily-header-summary">
                  {group.income > 0 && (
                    <span className="daily-summary-income">
                      +{formatCurrency(group.income)}원
                    </span>
                  )}
                  {group.expense > 0 && (
                    <span className="daily-summary-expense">
                      -{formatCurrency(group.expense)}원
                    </span>
                  )}
                </div>
              </div>

              {/* 해당 날짜의 거래 내역 */}
              <ul className="transaction-list">
                {group.transactions.map((transaction) => (
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
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default TransactionList;
