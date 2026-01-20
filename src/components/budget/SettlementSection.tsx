import { useState, useEffect } from "react";
import type { SettlementData } from "../../types";
import { formatCurrency } from "../../utils/formatters";
import { getAccountIcon } from "../../utils/iconMappings";

type SettlementSectionProps = {
  month: string;
};

function SettlementSection({ month }: SettlementSectionProps) {
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedSuggestions, setCheckedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSettlementData();
  }, [month]);

  const fetchSettlementData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/settlements?month=${month}`
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "정산 정보를 불러오는데 실패했습니다.");
      }

      setSettlementData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSuggestion = (key: string) => {
    setCheckedSuggestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="settlement-section">
        <h4 className="settlement-header">💸 통장 정산</h4>
        <div className="settlement-loading">정산 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settlement-section">
        <h4 className="settlement-header">💸 통장 정산</h4>
        <div className="settlement-error">{error}</div>
      </div>
    );
  }

  if (!settlementData) {
    return null;
  }

  const { suggestions, transfers, summary } = settlementData;

  return (
    <div className="settlement-section">
      <h4 className="settlement-header">💸 통장 정산</h4>

      {/* 요약 정보 */}
      <div className="settlement-summary">
        <div className="settlement-summary-item">
          <span className="settlement-summary-label">총 초과 금액</span>
          <span className="settlement-summary-value settlement-summary-value--danger">
            {formatCurrency(summary.total_surplus)}원
          </span>
        </div>
        <div className="settlement-summary-item">
          <span className="settlement-summary-label">총 여유 금액</span>
          <span className="settlement-summary-value settlement-summary-value--success">
            {formatCurrency(summary.total_deficit)}원
          </span>
        </div>
        <div className="settlement-summary-item">
          <span className="settlement-summary-label">상태</span>
          <span
            className={`settlement-summary-badge ${
              summary.balanced ? "settlement-summary-badge--balanced" : "settlement-summary-badge--unbalanced"
            }`}
          >
            {summary.balanced ? "✓ 균형" : "⚠ 정산 필요"}
          </span>
        </div>
      </div>

      {/* 정산 제안 */}
      {suggestions.length > 0 && (
        <div className="settlement-suggestions">
          <h5 className="settlement-subtitle">정산 제안</h5>
          <div className="settlement-list">
            {suggestions.map((suggestion, index) => {
              const key = `${suggestion.from_account}-${suggestion.to_account}-${suggestion.amount}`;
              const isChecked = checkedSuggestions.has(key);

              return (
                <div key={index} className={`settlement-item ${isChecked ? "settlement-item--checked" : ""}`}>
                  <input
                    type="checkbox"
                    className="settlement-checkbox"
                    checked={isChecked}
                    onChange={() => toggleSuggestion(key)}
                    id={`suggestion-${index}`}
                  />
                  <label htmlFor={`suggestion-${index}`} className="settlement-item-content">
                    <div className="settlement-transfer">
                      <span className="settlement-account">
                        {getAccountIcon(suggestion.from_account)} {suggestion.from_account}
                      </span>
                      <span className="settlement-arrow">→</span>
                      <span className="settlement-account">
                        {getAccountIcon(suggestion.to_account)} {suggestion.to_account}
                      </span>
                    </div>
                    <div className="settlement-details">
                      <span className="settlement-amount">{formatCurrency(suggestion.amount)}원</span>
                      <span className="settlement-reason">{suggestion.reason}</span>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 이체 내역 */}
      {transfers.length > 0 && (
        <div className="settlement-transfers">
          <h5 className="settlement-subtitle">이체 내역</h5>
          <div className="settlement-list">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="settlement-transfer-item">
                <div className="settlement-transfer-date">
                  {new Date(transfer.date).toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric"
                  })}
                </div>
                <div className="settlement-transfer-info">
                  <div className="settlement-transfer">
                    <span className="settlement-account">
                      {getAccountIcon(transfer.from_account)} {transfer.from_account}
                    </span>
                    <span className="settlement-arrow">→</span>
                    <span className="settlement-account">{transfer.to_account}</span>
                  </div>
                  <span className="settlement-amount">{formatCurrency(transfer.amount)}원</span>
                </div>
                {transfer.memo && <div className="settlement-transfer-memo">{transfer.memo}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && transfers.length === 0 && (
        <div className="settlement-empty">
          이번 달은 정산이 필요하지 않습니다. 모든 계좌가 예산 내에서 잘 관리되고 있습니다! 👍
        </div>
      )}
    </div>
  );
}

export default SettlementSection;
