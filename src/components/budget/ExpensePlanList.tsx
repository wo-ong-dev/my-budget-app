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
  const [newPlan, setNewPlan] = useState<ExpensePlanDraft>({
    account: accounts[0] || '',
    month,
    name: '',
    amount: 0,
    due_day: 1
  });

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

  const handleAmountChange = async (plan: ExpensePlan, newAmount: number) => {
    try {
      await expensePlanService.updatePlan(plan.id, { amount: newAmount });
      await loadPlans();
      await loadTotals();
    } catch (error) {
      console.error('금액 변경 실패:', error);
    }
  };

  const handleDelete = async (id: number) => {
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
      await loadPlans();
      await loadTotals();
    } catch (error) {
      console.error('추가 실패:', error);
    }
  };

  const groupedPlans = plans.reduce((acc, plan) => {
    if (!acc[plan.account]) {
      acc[plan.account] = [];
    }
    acc[plan.account].push(plan);
    return acc;
  }, {} as Record<string, ExpensePlan[]>);

  return (
    <div style={{ marginTop: '20px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>월간 지출 계획</h3>

      {accounts.map(account => (
        <div key={account} style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            padding: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '5px'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold' }}>{account}</h4>
            <div style={{ fontSize: '14px' }}>
              <span>예정: {totals[account]?.total.toLocaleString() || 0}원</span>
              <span style={{ marginLeft: '10px', color: '#666' }}>
                체크됨: {totals[account]?.checked.toLocaleString() || 0}원
              </span>
              <span style={{ marginLeft: '10px', color: '#1976d2', fontWeight: 'bold' }}>
                잔여: {totals[account]?.remaining.toLocaleString() || 0}원
              </span>
            </div>
          </div>

          <div style={{ marginLeft: '10px' }}>
            {groupedPlans[account]?.map(plan => (
              <div
                key={plan.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid #eee'
                }}
              >
                <input
                  type="checkbox"
                  checked={plan.is_checked}
                  onChange={() => handleCheck(plan)}
                  style={{ marginRight: '10px', cursor: 'pointer' }}
                />
                <span
                  style={{
                    flex: 1,
                    textDecoration: plan.is_checked ? 'line-through' : 'none',
                    color: plan.is_checked ? '#999' : '#000',
                    opacity: plan.is_checked ? 0.6 : 1
                  }}
                >
                  {plan.name} ({plan.due_day}일)
                </span>
                <input
                  type="number"
                  value={plan.amount}
                  onChange={(e) => handleAmountChange(plan, parseInt(e.target.value) || 0)}
                  style={{
                    width: '100px',
                    marginRight: '10px',
                    padding: '4px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    textAlign: 'right'
                  }}
                />
                <span style={{ marginRight: '10px' }}>원</span>
                <button
                  onClick={() => handleDelete(plan.id)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
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
          onClick={() => setIsAdding(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          + 지출 계획 추가
        </button>
      ) : (
        <div style={{
          padding: '15px',
          backgroundColor: '#f9f9f9',
          borderRadius: '5px',
          marginTop: '10px'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>통장:</label>
            <select
              value={newPlan.account}
              onChange={(e) => setNewPlan({ ...newPlan, account: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '3px', border: '1px solid #ddd' }}
            >
              {accounts.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>항목명:</label>
            <input
              type="text"
              value={newPlan.name}
              onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '3px', border: '1px solid #ddd' }}
              placeholder="예: 여행계 1"
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>금액:</label>
            <input
              type="number"
              value={newPlan.amount}
              onChange={(e) => setNewPlan({ ...newPlan, amount: parseInt(e.target.value) || 0 })}
              style={{ width: '100%', padding: '8px', borderRadius: '3px', border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>지출일:</label>
            <input
              type="number"
              value={newPlan.due_day}
              onChange={(e) => setNewPlan({ ...newPlan, due_day: parseInt(e.target.value) || 1 })}
              style={{ width: '100%', padding: '8px', borderRadius: '3px', border: '1px solid #ddd' }}
              min="1"
              max="31"
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleAdd}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              추가
            </button>
            <button
              onClick={() => setIsAdding(false)}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#999',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
