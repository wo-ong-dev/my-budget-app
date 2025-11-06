import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import type { AccountItem, CategoryItem } from "../../services/transactionService";
import {
  fetchAccountsWithId,
  fetchCategoriesWithId,
  createAccount,
  deleteAccount,
  createCategory,
  deleteCategory,
} from "../../services/transactionService";

type CategoryManagementModalProps = {
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
};

function CategoryManagementModal({
  open,
  onClose,
  onUpdate,
}: CategoryManagementModalProps) {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newAccountName, setNewAccountName] = useState("");
  const [newIncomeCategoryName, setNewIncomeCategoryName] = useState("");
  const [newExpenseCategoryName, setNewExpenseCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsData, categoriesData] = await Promise.all([
        fetchAccountsWithId(),
        fetchCategoriesWithId(),
      ]);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      return;
    }
    try {
      setLoading(true);
      await createAccount(newAccountName.trim());
      setNewAccountName("");
      await loadData();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "계좌를 추가하지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: number, name: string) => {
    const confirmed = window.confirm(`"${name}" 계좌를 삭제할까요?\n\n⚠️  이 계좌를 사용하는 거래 내역이 있을 경우 삭제가 실패할 수 있습니다.`);
    if (!confirmed) {
      return;
    }
    try {
      setLoading(true);
      await deleteAccount(id);
      await loadData();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "계좌를 삭제하지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddIncomeCategory = async () => {
    if (!newIncomeCategoryName.trim()) {
      return;
    }
    try {
      setLoading(true);
      await createCategory(newIncomeCategoryName.trim(), "수입");
      setNewIncomeCategoryName("");
      await loadData();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "카테고리를 추가하지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpenseCategory = async () => {
    if (!newExpenseCategoryName.trim()) {
      return;
    }
    try {
      setLoading(true);
      await createCategory(newExpenseCategoryName.trim(), "지출");
      setNewExpenseCategoryName("");
      await loadData();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "카테고리를 추가하지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    const confirmed = window.confirm(`"${name}" 카테고리를 삭제할까요?\n\n⚠️  이 카테고리를 사용하는 거래 내역이 있을 경우 삭제가 실패할 수 있습니다.`);
    if (!confirmed) {
      return;
    }
    try {
      setLoading(true);
      await deleteCategory(id);
      await loadData();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "카테고리를 삭제하지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="카테고리 관리">
      <div className="category-management">
        {error && <div className="alert alert--error">{error}</div>}

        <section className="management-section">
          <h4>통장 분류</h4>
          <div className="management-add-form">
            <input
              type="text"
              className="form-input"
              placeholder="새 계좌명 입력"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddAccount()}
              disabled={loading}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddAccount}
              disabled={loading || !newAccountName.trim()}
            >
              추가
            </button>
          </div>
          <ul className="management-list">
            {accounts.map((account) => (
              <li key={account.id} className="management-item">
                <span>{account.name}</span>
                <button
                  type="button"
                  className="btn-icon btn-icon--delete"
                  onClick={() => handleDeleteAccount(account.id, account.name)}
                  disabled={loading}
                  title="삭제"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="management-section">
          <h4>수입 카테고리</h4>
          <div className="management-add-form">
            <input
              type="text"
              className="form-input"
              placeholder="새 수입 카테고리명 입력 (예: 급여, 용돈)"
              value={newIncomeCategoryName}
              onChange={(e) => setNewIncomeCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddIncomeCategory()}
              disabled={loading}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddIncomeCategory}
              disabled={loading || !newIncomeCategoryName.trim()}
            >
              추가
            </button>
          </div>
          <ul className="management-list">
            {categories.filter(cat => cat.type === "수입").map((category) => (
              <li key={category.id} className="management-item">
                <span>{category.name}</span>
                <button
                  type="button"
                  className="btn-icon btn-icon--delete"
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                  disabled={loading}
                  title="삭제"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="management-section">
          <h4>지출 카테고리</h4>
          <div className="management-add-form">
            <input
              type="text"
              className="form-input"
              placeholder="새 지출 카테고리명 입력"
              value={newExpenseCategoryName}
              onChange={(e) => setNewExpenseCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddExpenseCategory()}
              disabled={loading}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddExpenseCategory}
              disabled={loading || !newExpenseCategoryName.trim()}
            >
              추가
            </button>
          </div>
          <ul className="management-list">
            {categories.filter(cat => cat.type === "지출").map((category) => (
              <li key={category.id} className="management-item">
                <span>{category.name}</span>
                <button
                  type="button"
                  className="btn-icon btn-icon--delete"
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                  disabled={loading}
                  title="삭제"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}

export default CategoryManagementModal;
