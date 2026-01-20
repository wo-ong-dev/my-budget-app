import { useState } from "react";
import type { BudgetWithUsage } from "../../types";
import { formatCurrency, monthLabel } from "../../utils/formatters";
import { getAccountIcon } from "../../utils/iconMappings";
import CategoryManagementModal from "../management/CategoryManagementModal";
import { ExpensePlanList } from "./ExpensePlanList";
import SettlementSection from "./SettlementSection";

type BudgetPanelProps = {
  budgets: BudgetWithUsage[];
  loading?: boolean;
  currentMonth?: string;
  availableMonths?: string[];
  accounts?: string[];
  onMonthChange?: (month: string) => void;
  onUpdateBudget?: (id: number, targetAmount: number) => void;
  onDeleteBudget?: (id: number) => void;
  onAddBudget?: (account: string, month: string, targetAmount: number) => void;
  onCategoryUpdate?: () => void;
  onAccountClick?: (account: string) => void;
};

function BudgetPanel({
  budgets,
  loading = false,
  currentMonth,
  availableMonths = [],
  accounts = [],
  onMonthChange,
  onUpdateBudget,
  onDeleteBudget,
  onAddBudget,
  onCategoryUpdate,
  onAccountClick,
}: BudgetPanelProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [isManagementModalOpen, setManagementModalOpen] = useState(false);

  if (loading) {
    return <div className="list-placeholder">데이터를 불러오는 중입니다...</div>;
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

  const handleEdit = (id: number, currentAmount: number) => {
    setEditingId(id);
    setEditValue(currentAmount.toLocaleString('ko-KR'));
  };

  const handleSaveEdit = (id: number) => {
    const numericValue = parseFloat(editValue.replace(/,/g, ''));
    if (!isNaN(numericValue) && numericValue > 0 && onUpdateBudget) {
      onUpdateBudget(id, numericValue);
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleEditInputChange = (value: string) => {
    // 숫자와 쉼표만 허용
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned === '') {
      setEditValue('');
      return;
    }
    const numeric = parseInt(cleaned, 10);
    setEditValue(numeric.toLocaleString('ko-KR'));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleAddBudget = () => {
    const numericValue = parseFloat(newAmount.replace(/,/g, ''));
    if (newAccount && !isNaN(numericValue) && numericValue > 0 && onAddBudget && currentMonth) {
      onAddBudget(newAccount, currentMonth, numericValue);
      setIsAdding(false);
      setNewAccount("");
      setNewAmount("");
    }
  };

  const handleAddInputChange = (value: string) => {
    // 숫자와 쉼표만 허용
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned === '') {
      setNewAmount('');
      return;
    }
    const numeric = parseInt(cleaned, 10);
    setNewAmount(numeric.toLocaleString('ko-KR'));
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewAccount("");
    setNewAmount("");
  };

  // 이미 예산이 설정된 계좌 제외
  const availableAccounts = accounts.filter(
    (account) => !budgets.some((budget) => budget.account === account)
  );

  const getColorClass = (color: string) => {
    if (color === "blue") return "budget-row--blue";
    if (color === "yellow") return "budget-row--yellow";
    if (color === "red") return "budget-row--red";
    return "budget-row--blue";
  };

  const getProgressPercentage = (used: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((used / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "budget-progress--danger";
    if (percentage >= 80) return "budget-progress--warning";
    return "budget-progress--success";
  };

  return (
    <div className="budget-panel">
      <div className="budget-header">
        {onMonthChange && currentMonth ? (
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
            <h3 className="budget-header__title">{currentMonth ? monthLabel(currentMonth) : "예산 관리"}</h3>
            <button
              type="button"
              className="month-nav-btn"
              onClick={goToNextMonth}
              disabled={!canGoNext}
              aria-label="다음 달"
            >
              ›
            </button>
            <button
              type="button"
              className="budget-settings-btn"
              onClick={() => setManagementModalOpen(true)}
              title="카테고리 관리"
              aria-label="카테고리 관리"
            >
              ⚙️
            </button>
          </div>
        ) : (
          <div className="budget-header-row">
            <h3 className="budget-header__title">예산 관리</h3>
            <button
              type="button"
              className="budget-settings-btn"
              onClick={() => setManagementModalOpen(true)}
              title="카테고리 관리"
              aria-label="카테고리 관리"
            >
              ⚙️
            </button>
          </div>
        )}
      </div>

      <div className="budget-table">
        <div className="budget-table__header">
          <div className="budget-col budget-col--account">통장분류</div>
          <div className="budget-col budget-col--target">월목표금액</div>
          <div className="budget-col budget-col--used">사용금액</div>
          <div className="budget-col budget-col--available">사용가능</div>
        </div>

        {budgets.map((budget) => {
          const percentage = getProgressPercentage(budget.used_amount, budget.target_amount);
          const progressColor = getProgressColor(percentage);

          return (
            <div key={budget.id} className="budget-item">
              <div className={`budget-row ${getColorClass(budget.color)}`}>
                <div className="budget-col budget-col--account">
                  <span className="budget-icon">{getAccountIcon(budget.account)}</span>
                  {onAccountClick ? (
                    <button
                      type="button"
                      className="budget-account-link"
                      onClick={() => onAccountClick(budget.account)}
                      title={`${budget.account} 내역 조회`}
                    >
                      {budget.account}
                    </button>
                  ) : (
                    <span>{budget.account}</span>
                  )}
                </div>
                <div className="budget-col budget-col--target">
                  {editingId === budget.id ? (
                    <div className="budget-edit">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="budget-edit__input"
                        value={editValue}
                        onChange={(e) => handleEditInputChange(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="budget-edit__btn budget-edit__btn--save"
                        onClick={() => handleSaveEdit(budget.id)}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="budget-edit__btn budget-edit__btn--cancel"
                        onClick={handleCancelEdit}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="budget-amount">
                      <span>{formatCurrency(budget.target_amount)}원</span>
                      {onUpdateBudget && (
                        <button
                          type="button"
                          className="budget-edit-btn"
                          onClick={() => handleEdit(budget.id, budget.target_amount)}
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="budget-col budget-col--used">
                  {formatCurrency(budget.used_amount)}원
                </div>
                <div className="budget-col budget-col--available">
                  <span className={budget.available_amount < 0 ? "budget-amount--negative" : ""}>
                    {formatCurrency(budget.available_amount)}원
                  </span>
                  {onDeleteBudget && (
                    <button
                      type="button"
                      className="budget-delete-btn"
                      onClick={() => onDeleteBudget(budget.id)}
                      title="삭제"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <div className="budget-progress-section">
                <div className="budget-progress-info">
                  <span className="budget-progress-percent">{percentage.toFixed(0)}% 사용</span>
                  <span className="budget-progress-remaining">
                    {budget.available_amount >= 0
                      ? `${formatCurrency(budget.available_amount)}원 남음`
                      : `${formatCurrency(Math.abs(budget.available_amount))}원 초과`}
                  </span>
                </div>
                <div className="budget-progress-bar">
                  <div className={`budget-progress-fill ${progressColor}`} style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}

        {isAdding ? (
          <div className="budget-row budget-row--adding">
            <div className="budget-col budget-col--account">
              <select
                className="budget-add__select"
                value={newAccount}
                onChange={(e) => setNewAccount(e.target.value)}
              >
                <option value="">계좌 선택</option>
                {availableAccounts.map((account) => (
                  <option key={account} value={account}>
                    {getAccountIcon(account)} {account}
                  </option>
                ))}
              </select>
            </div>
            <div className="budget-col budget-col--target">
              <input
                type="text"
                inputMode="numeric"
                className="budget-add__input"
                placeholder="목표금액"
                value={newAmount}
                onChange={(e) => handleAddInputChange(e.target.value)}
              />
            </div>
            <div className="budget-col budget-col--used">-</div>
            <div className="budget-col budget-col--available">
              <button
                type="button"
                className="budget-edit__btn budget-edit__btn--save"
                onClick={handleAddBudget}
              >
                추가
              </button>
              <button
                type="button"
                className="budget-edit__btn budget-edit__btn--cancel"
                onClick={handleCancelAdd}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          onAddBudget &&
          availableAccounts.length > 0 && (
            <button type="button" className="budget-add-btn" onClick={() => setIsAdding(true)}>
              + 예산 추가
            </button>
          )
        )}
      </div>

      <CategoryManagementModal
        open={isManagementModalOpen}
        onClose={() => setManagementModalOpen(false)}
        onUpdate={onCategoryUpdate}
      />

      {currentMonth && <SettlementSection month={currentMonth} />}

      {currentMonth && accounts.length > 0 && (
        <ExpensePlanList month={currentMonth} accounts={accounts} />
      )}
    </div>
  );
}

export default BudgetPanel;
