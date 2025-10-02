import type { Transaction } from "../../types";
import { formatCurrency, formatDateLabel } from "../../utils/formatters";

type TransactionListProps = {
  transactions: Transaction[];
  isLoading?: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

function TransactionList({ transactions, isLoading = false, onEdit, onDelete }: TransactionListProps) {
  if (isLoading) {
    return <div className="list-placeholder">목록을 불러오는 중입니다...</div>;
  }

  if (transactions.length === 0) {
    return <div className="list-placeholder">조건에 맞는 내역이 없습니다.</div>;
  }

  return (
    <ul className="transaction-list">
      {transactions.map((transaction) => (
        <li key={transaction.id} className="transaction-card">
          <div className="transaction-card__header">
            <div>
              <span className="transaction-card__date">{formatDateLabel(transaction.date)}</span>
              <span className="transaction-card__category">{transaction.category ?? "-"}</span>
            </div>
            <span
              className={`transaction-card__amount${
                transaction.type === "수입"
                  ? " transaction-card__amount--income"
                  : " transaction-card__amount--expense"
              }`}
            >
              {transaction.type === "수입" ? "+" : "-"} {formatCurrency(transaction.amount)}
            </span>
          </div>

          <div className="transaction-card__details">
            <span>{transaction.account ?? "-"}</span>
            {transaction.memo ? <span className="transaction-card__memo">{transaction.memo}</span> : null}
          </div>

          <div className="transaction-card__actions">
            <button type="button" className="btn btn-secondary" onClick={() => onEdit(transaction)}>
              수정
            </button>
            <button type="button" className="btn btn-danger" onClick={() => onDelete(transaction)}>
              삭제
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default TransactionList;
