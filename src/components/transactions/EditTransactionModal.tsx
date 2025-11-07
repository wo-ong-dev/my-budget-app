import type { Transaction, TransactionDraft } from "../../types";
import Modal from "../common/Modal";
import TransactionForm from "./TransactionForm";
import { toInputDateValue } from "../../utils/formatters";
import type { CategoryItem } from "../../services/transactionService";

type EditTransactionModalProps = {
  open: boolean;
  transaction: Transaction | null;
  accounts: string[];
  categories: CategoryItem[];
  onSubmit: (values: TransactionDraft) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onClose: () => void;
  submitting?: boolean;
  deleting?: boolean;
};

function EditTransactionModal({
  open,
  transaction,
  accounts,
  categories,
  onSubmit,
  onDelete,
  onClose,
  submitting = false,
  deleting = false,
}: EditTransactionModalProps) {
  const defaultValues = transaction
    ? {
        date: toInputDateValue(transaction.date),
        type: transaction.type,
        account: transaction.account ?? "",
        category: transaction.category ?? "",
        amount: transaction.amount,
        memo: transaction.memo ?? "",
      }
    : undefined;

  return (
    <Modal open={open} onClose={onClose} title="내역 수정">
      {transaction ? (
        <>
          <TransactionForm
            accounts={accounts}
            categories={categories}
            defaultValues={defaultValues}
            onSubmit={onSubmit}
            submitting={submitting}
            submitLabel="수정하기"
            resetAfterSubmit={false}
          />
          <button type="button" className="btn btn-danger modal__destructive" onClick={onDelete} disabled={deleting}>
            {deleting ? "삭제 중..." : "내역 삭제"}
          </button>
        </>
      ) : null}
    </Modal>
  );
}

export default EditTransactionModal;
