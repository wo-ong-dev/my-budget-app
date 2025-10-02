import type { Transaction, TransactionDraft } from "../../types";
import Modal from "../common/Modal";
import TransactionForm from "./TransactionForm";

type EditTransactionModalProps = {
  open: boolean;
  transaction: Transaction | null;
  accounts: string[];
  categories: string[];
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
        date: transaction.date,
        type: transaction.type,
        account: transaction.account ?? "",
        category: transaction.category ?? "",
        amount: transaction.amount,
        memo: transaction.memo ?? "",
      }
    : undefined;

  return (
    <Modal open={open} onClose={onClose} title="���� ����">
      {transaction ? (
        <>
          <TransactionForm
            accounts={accounts}
            categories={categories}
            defaultValues={defaultValues}
            onSubmit={onSubmit}
            submitting={submitting}
            submitLabel="�����ϱ�"
            resetAfterSubmit={false}
          />
          <button type="button" className="btn btn-danger modal__destructive" onClick={onDelete} disabled={deleting}>
            {deleting ? "���� ��..." : "���� ����"}
          </button>
        </>
      ) : null}
    </Modal>
  );
}

export default EditTransactionModal;
