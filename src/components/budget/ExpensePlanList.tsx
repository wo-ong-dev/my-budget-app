import React, { useState, useEffect } from 'react';
import type { ExpensePlan, ExpensePlanDraft } from '../../types/expensePlan';
import { expensePlanService } from '../../services/expensePlanService';

interface Props {
  month: string;
  accounts: string[];
}

export const ExpensePlanList: React.FC<Props> = ({ month, accounts }) => {
  const [plans, setPlans] = useState<ExpensePlan[]>([]);
  const [totals, setTotals] = useState<Record<string, { total: number; checked: number; remaining: number }>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'amount' | 'due_day' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newPlan, setNewPlan] = useState<ExpensePlanDraft>({
    account: accounts[0] || '',
    month,
    name: '',
    amount: 0,
    due_day: 1
  });
  const [newAmountInput, setNewAmountInput] = useState('');

  useEffect(() => {
    loadPlans();
    loadTotals();
  }, [month]);

  const loadPlans = async () => {
    try {
      const data = await expensePlanService.getPlans(month);
      setPlans(data);
    } catch (error) {
      console.error('지출 계획 로드 실패:', error);
    }
  };

  const loadTotals = async () => {
    try {
      const totalsData: Record<string, { total: number; checked: number; remaining: number }> = {};

      for (const account of accounts) {
        const total = await expensePlanService.getPlannedTotal(month, account);
        totalsData[account] = total;
      }

      setTotals(totalsData);
    } catch (error) {
      console.error('지출 계획 합계 로드 실패:', error);
    }
  };

  const handleCheck = async (plan: ExpensePlan) => {
    try {
      await expensePlanService.updatePlan(plan.id, { is_checked: !plan.is_checked });
      await loadPlans();
      await loadTotals();
    } catch (error) {
      console.error('체크 상태 변경 실패:', error);
    }
  };

  const handleStartEditName = (plan: ExpensePlan) => {
    setEditingId(plan.id);
    setEditingField('name');
    setEditValue(plan.name);
  };

  const handleStartEditAmount = (plan: ExpensePlan) => {
    setEditingId(plan.id);
    setEditingField('amount');
    setEditValue(plan.amount.toLocaleString('ko-KR'));
  };

  const handleStartEditDueDay = (plan: ExpensePlan) => {
    setEditingId(plan.id);
    setEditingField('due_day');
    setEditValue(plan.due_day.toString());
  };

  const handleSaveEdit = async (plan: ExpensePlan) => {
    try {
      if (editingField === 'name') {
        if (editValue.trim()) {
          await expensePlanService.updatePlan(plan.id, { name: editValue.trim() });
          await loadPlans();
        }
      } else if (editingField === 'amount') {
        const numericValue = parseFloat(editValue.replace(/,/g, ''));
        if (!isNaN(numericValue) && numericValue >= 0) {
          await expensePlanService.updatePlan(plan.id, { amount: numericValue });
          await loadPlans();
          await loadTotals();
        }
      } else if (editingField === 'due_day') {
        const dueDay = parseInt(editValue, 10);
        if (!isNaN(dueDay) && dueDay >= 1 && dueDay <= 31) {
          await expensePlanService.updatePlan(plan.id, { due_day: dueDay });
          await loadPlans();
        }
      }
      setEditingId(null);
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('수정 실패:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  };

  const handleEditInputChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned === '') {
      setEditValue('');
      return;
    }
    const numeric = parseInt(cleaned, 10);
    setEditValue(numeric.toLocaleString('ko-KR'));
  };

  const handleDelete = async (id: number, name: string) => {
    const confirmed = window.confirm(`"${name}"을(를) 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }
    try {
      await expensePlanService.deletePlan(id);
      await loadPlans();
      await loadTotals();
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  const handleAdd = async () => {
    try {
      await expensePlanService.createPlan(newPlan);
      setIsAdding(false);
      setNewPlan({
        account: accounts[0] || '',
        month,
        name: '',
        amount: 0,
        due_day: 1
      });
      setNewAmountInput('');
      await loadPlans();
      await loadTotals();
    } catch (error) {
      console.error('추가 실패:', error);
    }
  };

  const handleNewAmountChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned === '') {
      setNewAmountInput('');
      setNewPlan({ ...newPlan, amount: 0 });
      return;
    }
    const numeric = parseInt(cleaned, 10);
    setNewAmountInput(numeric.toLocaleString('ko-KR'));
    setNewPlan({ ...newPlan, amount: numeric });
  };

  const groupedPlans = plans.reduce((acc, plan) => {
    if (!acc[plan.account]) {
      acc[plan.account] = [];
    }
    acc[plan.account].push(plan);
    return acc;
  }, {} as Record<string, ExpensePlan[]>);

  return (
    <div className="expense-plan-section">
      <h3 className="expense-plan-title">월간 지출 계획</h3>

      {accounts.map(account => (
        <div key={account} className="expense-plan-account">
          <div className="expense-plan-header">
            <h4 className="expense-plan-account-name">{account}</h4>
            <div className="expense-plan-totals">
              <div className="expense-plan-total-item">
                <span className="expense-plan-total-label">예정:</span>
                <span className="expense-plan-total-value">{totals[account]?.total.toLocaleString() || 0}원</span>
              </div>
              <div className="expense-plan-total-item expense-plan-total-item--checked">
                <span className="expense-plan-total-label">체크됨:</span>
                <span className="expense-plan-total-value">{totals[account]?.checked.toLocaleString() || 0}원</span>
              </div>
              <div className="expense-plan-total-item expense-plan-total-item--remaining">
                <span className="expense-plan-total-label">잔여:</span>
                <span className="expense-plan-total-value">{totals[account]?.remaining.toLocaleString() || 0}원</span>
              </div>
            </div>
          </div>

          <div className="expense-plan-list">
            {groupedPlans[account]?.map(plan => (
              <div key={plan.id} className={`expense-plan-item expense-plan-item--${plan.account}${plan.is_checked ? ' expense-plan-item--checked' : ''}`}>
                <input
                  type="checkbox"
                  className="expense-plan-checkbox"
                  checked={plan.is_checked}
                  onChange={() => handleCheck(plan)}
                />
                {editingId === plan.id && editingField === 'name' ? (
                  <div className="expense-plan-name-section">
                    <input
                      type="text"
                      className="expense-plan-edit-input"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="expense-plan-save-btn"
                      onClick={() => handleSaveEdit(plan)}
                    >
                      ✓
                    </button>
                    <button
                      className="expense-plan-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      ✕
                    </button>
                  </div>
                ) : editingId === plan.id && editingField === 'due_day' ? (
                  <div className="expense-plan-name-section">
                    <span className={`expense-plan-name ${plan.is_checked ? 'expense-plan-name--checked' : ''}`}>
                      {plan.name}
                    </span>
                    <span> (</span>
                    <input
                      type="number"
                      className="expense-plan-edit-input expense-plan-edit-input--day"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      min="1"
                      max="31"
                      autoFocus
                      style={{ width: '40px', display: 'inline-block' }}
                    />
                    <span>일)</span>
                    <button
                      className="expense-plan-save-btn"
                      onClick={() => handleSaveEdit(plan)}
                    >
                      ✓
                    </button>
                    <button
                      className="expense-plan-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="expense-plan-name-section">
                    <span className={`expense-plan-name ${plan.is_checked ? 'expense-plan-name--checked' : ''}`}>
                      {plan.name}
                    </span>
                    <button
                      className="expense-plan-edit-btn"
                      onClick={() => handleStartEditName(plan)}
                      title="항목명 수정"
                    >
                      ✏️
                    </button>
                    <span> (</span>
                    <span className={`expense-plan-due-day ${plan.is_checked ? 'expense-plan-name--checked' : ''}`}>
                      {plan.due_day}
                    </span>
                    <span>일)</span>
                    <button
                      className="expense-plan-edit-btn"
                      onClick={() => handleStartEditDueDay(plan)}
                      title="지출일 수정"
                    >
                      📅
                    </button>
                  </div>
                )}
                {editingId === plan.id && editingField === 'amount' ? (
                  <div className="expense-plan-amount-section">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="expense-plan-edit-input expense-plan-edit-input--amount"
                      value={editValue}
                      onChange={(e) => handleEditInputChange(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="expense-plan-save-btn"
                      onClick={() => handleSaveEdit(plan)}
                    >
                      ✓
                    </button>
                    <button
                      className="expense-plan-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="expense-plan-amount-section">
                    <span className="expense-plan-amount">{plan.amount.toLocaleString('ko-KR')}원</span>
                    <button
                      className="expense-plan-edit-btn"
                      onClick={() => handleStartEditAmount(plan)}
                      title="금액 수정"
                    >
                      ✏️
                    </button>
                  </div>
                )}
                <button
                  className="expense-plan-delete-btn"
                  onClick={() => handleDelete(plan.id, plan.name)}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!isAdding ? (
        <button
          className="expense-plan-add-btn"
          onClick={() => setIsAdding(true)}
        >
          + 지출 계획 추가
        </button>
      ) : (
        <div className="expense-plan-add-form">
          <div className="expense-plan-form-group">
            <label className="expense-plan-form-label">통장:</label>
            <select
              className="expense-plan-form-select"
              value={newPlan.account}
              onChange={(e) => setNewPlan({ ...newPlan, account: e.target.value })}
            >
              {accounts.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
          </div>
          <div className="expense-plan-form-group">
            <label className="expense-plan-form-label">항목명:</label>
            <input
              type="text"
              className="expense-plan-form-input"
              value={newPlan.name}
              onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
              placeholder="예: 여행계 1"
            />
          </div>
          <div className="expense-plan-form-group">
            <label className="expense-plan-form-label">금액:</label>
            <input
              type="text"
              inputMode="numeric"
              className="expense-plan-form-input"
              value={newAmountInput}
              onChange={(e) => handleNewAmountChange(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="expense-plan-form-group">
            <label className="expense-plan-form-label">지출일:</label>
            <input
              type="number"
              className="expense-plan-form-input"
              value={newPlan.due_day}
              onChange={(e) => setNewPlan({ ...newPlan, due_day: parseInt(e.target.value) || 1 })}
              min="1"
              max="31"
            />
          </div>
          <div className="expense-plan-form-actions">
            <button
              className="expense-plan-form-submit"
              onClick={handleAdd}
            >
              추가
            </button>
            <button
              className="expense-plan-form-cancel"
              onClick={() => setIsAdding(false)}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
