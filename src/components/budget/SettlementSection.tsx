import { useMemo, useState, useEffect } from "react";
import type { SettlementData } from "../../types";
import { formatCurrency } from "../../utils/formatters";
import { getAccountIcon } from "../../utils/iconMappings";
import { commitRebalance, fetchRebalanceSuggestions, fetchSettlement, applySettlement } from "../../services/settlementService";
import { fetchAccounts } from "../../services/transactionService";
import type {
  CommitRebalanceDecision,
  RebalanceLearningScope,
  RebalanceSuggestionItem,
  RebalanceSuggestionsResponse,
} from "../../types";
import Modal from "../common/Modal";

type SettlementSectionProps = {
  month: string;
};

function SettlementSection({ month }: SettlementSectionProps) {
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedSuggestions, setCheckedSuggestions] = useState<Set<string>>(new Set());

  // Rebalance session state
  const [rebalanceLoading, setRebalanceLoading] = useState(false);
  const [rebalanceError, setRebalanceError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [rebalance, setRebalance] = useState<RebalanceSuggestionsResponse | null>(null);
  const [chosenAccounts, setChosenAccounts] = useState<Record<number, string>>({});
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());
  const [deferredIds, setDeferredIds] = useState<Set<number>>(new Set());
  const [wrongIds, setWrongIds] = useState<Set<number>>(new Set());

  // UX 확장: 학습 범위 선택 모달
  const [learnModalOpen, setLearnModalOpen] = useState(false);
  const [learnModalMode, setLearnModalMode] = useState<"WRONG" | "APPLY_DIFF">("WRONG");
  const [learnTarget, setLearnTarget] = useState<RebalanceSuggestionItem | null>(null);
  const [learnScope, setLearnScope] = useState<RebalanceLearningScope>("PATTERN");
  const [learnChosenAccount, setLearnChosenAccount] = useState<string>("");

  useEffect(() => {
    fetchSettlementData();
    fetchRebalanceData();
    fetchAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, [month]);

  const fetchSettlementData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchSettlement(month);
      setSettlementData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRebalanceData = async () => {
    try {
      setRebalanceLoading(true);
      setRebalanceError(null);
      const data = await fetchRebalanceSuggestions(month);
      setRebalance(data);
      const initial: Record<number, string> = {};
      for (const s of data.suggestions) {
        if (s.suggested_account) initial[s.transaction_id] = s.suggested_account;
      }
      setChosenAccounts(initial);
      setAppliedIds(new Set());
      setDeferredIds(new Set());
      setWrongIds(new Set());
    } catch (err) {
      setRebalanceError(err instanceof Error ? err.message : "리밸런싱 정산을 불러오지 못했습니다.");
    } finally {
      setRebalanceLoading(false);
    }
  };

  const setChosenAccount = (transactionId: number, value: string) => {
    setChosenAccounts((prev) => ({ ...prev, [transactionId]: value }));
  };

  const markSet = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    setter((prev) => new Set(prev).add(id));
  };

  const commitOne = async (item: RebalanceSuggestionItem, decision: CommitRebalanceDecision["decision"]) => {
    const chosenAccount = chosenAccounts[item.transaction_id] ?? item.suggested_account ?? null;
    const payload: CommitRebalanceDecision = {
      transactionId: item.transaction_id,
      decision,
      chosenAccount,
    };
    await commitRebalance(month, [payload]);

    if (decision === "APPLY") {
      markSet(setAppliedIds, item.transaction_id);
      // 리밸런싱 완료 시 리밸런싱 세션 재조회 (완료된 항목 제외)
      await fetchRebalanceData();
      // 정산제안도 재조회 (완료된 항목이 정산제안에 추가됨)
      await fetchSettlementData();
    } else {
      if (decision === "DEFER") markSet(setDeferredIds, item.transaction_id);
      if (decision === "WRONG") markSet(setWrongIds, item.transaction_id);
    }
  };

  const openLearnModalForWrong = (item: RebalanceSuggestionItem) => {
    setLearnModalMode("WRONG");
    setLearnTarget(item);
    setLearnChosenAccount(chosenAccounts[item.transaction_id] ?? item.suggested_account ?? "");
    setLearnScope("PATTERN"); // 기본: 패턴 단위 학습
    setLearnModalOpen(true);
  };

  const openLearnModalForApplyDiff = (item: RebalanceSuggestionItem) => {
    setLearnModalMode("APPLY_DIFF");
    setLearnTarget(item);
    setLearnChosenAccount(chosenAccounts[item.transaction_id] ?? item.suggested_account ?? "");
    setLearnScope("PATTERN");
    setLearnModalOpen(true);
  };

  const closeLearnModal = () => {
    setLearnModalOpen(false);
    setLearnTarget(null);
  };

  const confirmLearnModal = async () => {
    if (!learnTarget) return;
    const chosenAccount = learnChosenAccount || (learnTarget.suggested_account ?? "");

    const payload: CommitRebalanceDecision = {
      transactionId: learnTarget.transaction_id,
      decision: learnModalMode === "WRONG" ? "WRONG" : "APPLY",
      chosenAccount: chosenAccount || null,
      learningScope: learnScope,
    };

    await commitRebalance(month, [payload]);

    if (payload.decision === "APPLY") markSet(setAppliedIds, learnTarget.transaction_id);
    if (payload.decision === "WRONG") markSet(setWrongIds, learnTarget.transaction_id);

    closeLearnModal();
  };

  const patternLabel = useMemo(() => {
    if (!learnTarget) return "";
    const pk = learnTarget.pattern_key;
    if (!pk) return "메모 패턴(추출 실패)";
    return `메모 패턴: ${pk}`;
  }, [learnTarget]);

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

  const handleApplySettlement = async () => {
    if (checkedSuggestions.size === 0) {
      alert("완료할 항목을 선택해주세요.");
      return;
    }

    try {
      await applySettlement(month, Array.from(checkedSuggestions));
      // 정산제안 데이터 다시 불러오기 (완료된 항목 제외)
      await fetchSettlementData();
      // 체크박스 초기화
      setCheckedSuggestions(new Set());
    } catch (err) {
      alert(err instanceof Error ? err.message : "정산제안 완료 처리에 실패했습니다.");
    }
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h5 className="settlement-subtitle">정산 제안</h5>
            {checkedSuggestions.size > 0 && (
              <button
                type="button"
                className="rebalance-session-btn rebalance-session-btn--apply"
                onClick={handleApplySettlement}
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                완료 ({checkedSuggestions.size})
              </button>
            )}
          </div>
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
          현재는 통장 간 정산이 필요하지 않습니다 👍
        </div>
      )}

      {/* 리밸런싱 정산 세션 */}
      <div className="settlement-transfers">
        <h5 className="settlement-subtitle">🔁 리밸런싱 정산 세션</h5>

        {rebalanceLoading && <div className="settlement-loading">리밸런싱 제안을 불러오는 중...</div>}
        {rebalanceError && <div className="settlement-error">{rebalanceError}</div>}

        {!rebalanceLoading && !rebalanceError && rebalance && (
          <div className="settlement-list">
            {rebalance.suggestions.length === 0 && (
              <div className="settlement-empty">이번 달은 리밸런싱이 필요하지 않습니다.</div>
            )}

            {rebalance.suggestions.map((item) => {
              const id = item.transaction_id;
              const chosen = chosenAccounts[id] ?? item.suggested_account ?? "";
              const isChosenDifferent = !!item.suggested_account && chosen && chosen !== item.suggested_account;
              const done = appliedIds.has(id) || deferredIds.has(id) || wrongIds.has(id);
              const statusLabel = appliedIds.has(id) ? "완료" : deferredIds.has(id) ? "보류" : wrongIds.has(id) ? "틀림" : "";

              return (
                <div key={id} className={`rebalance-session-item ${done ? "rebalance-session-item--done" : ""}`}>
                  <div className="rebalance-session-header">
                    <div className="rebalance-session-date">
                      {new Date(item.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </div>
                    {statusLabel && <span className="rebalance-session-status">{statusLabel}</span>}
                  </div>

                  <div className="rebalance-session-transfer">
                    <span className="rebalance-session-account">
                      {getAccountIcon(item.original_account ?? "")} {item.original_account}
                    </span>
                    <span className="rebalance-session-arrow">→</span>
                    <span className="rebalance-session-account">
                      {getAccountIcon(item.suggested_account ?? "")} {item.suggested_account}
                    </span>
                    <span className="rebalance-session-amount">{formatCurrency(item.amount)}원</span>
                  </div>

                  <div className="rebalance-session-memo">
                    <div>
                      {item.category && <span className="rebalance-session-memo-category">{item.category}</span>}
                      <span className="rebalance-session-memo-text">{item.memo ?? ""}</span>
                    </div>
                    {item.reason && <div className="rebalance-session-reason">{item.reason}</div>}
                  </div>

                  <div className="rebalance-session-actions">
                    <label>적용 통장</label>
                    <select
                      value={chosen}
                      onChange={(e) => setChosenAccount(id, e.target.value)}
                      disabled={done}
                    >
                      <option value="" disabled>
                        선택
                      </option>
                      {accounts.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))}
                    </select>

                    <div className="rebalance-session-btn-group">
                      <button
                        type="button"
                        className="rebalance-session-btn rebalance-session-btn--apply"
                        disabled={done}
                        onClick={() => (isChosenDifferent ? openLearnModalForApplyDiff(item) : commitOne(item, "APPLY"))}
                        title="원거래 통장분류 변경"
                      >
                        완료
                      </button>
                      <button
                        type="button"
                        className="rebalance-session-btn rebalance-session-btn--defer"
                        disabled={done}
                        onClick={() => commitOne(item, "DEFER")}
                        title="이번엔 반영하지 않음(학습도 안 함)"
                      >
                        보류
                      </button>
                      <button
                        type="button"
                        className="rebalance-session-btn rebalance-session-btn--wrong"
                        disabled={done}
                        onClick={() => openLearnModalForWrong(item)}
                        title="추천이 틀림(학습 범위를 선택할 수 있어요)"
                      >
                        틀림
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={learnModalOpen}
        title={learnModalMode === "WRONG" ? "정산 제안이 틀렸나요?" : "수정한 선택을 학습할까요?"}
        onClose={closeLearnModal}
      >
        {learnTarget ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="settlement-transfer-memo">
              <div>
                <strong>원거래</strong>: {learnTarget.original_account} · {formatCurrency(learnTarget.amount)}원
              </div>
              <div>
                <strong>메모</strong>: {learnTarget.memo ?? ""}
              </div>
              <div>
                <strong>카테고리</strong>: {learnTarget.category ?? "미입력"}
              </div>
              <div>
                <strong>추천</strong>: {learnTarget.suggested_account ?? "없음"} ({learnTarget.reason})
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label className="form-label" style={{ margin: 0 }}>
                적용/수정 통장
              </label>
              <select
                className="form-select"
                value={learnChosenAccount}
                onChange={(e) => setLearnChosenAccount(e.target.value)}
                style={{ width: 220 }}
              >
                <option value="" disabled>
                  선택
                </option>
                {accounts.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="form-label">학습 범위</div>
              <label className="radio-item radio-item--active" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="learn-scope"
                  checked={learnScope === "NONE"}
                  onChange={() => setLearnScope("NONE")}
                />
                이번만 (학습 안 함)
              </label>
              <label className="radio-item" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="learn-scope"
                  checked={learnScope === "PATTERN"}
                  onChange={() => setLearnScope("PATTERN")}
                />
                {patternLabel} 기준으로 학습
              </label>
              <label className="radio-item" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="learn-scope"
                  checked={learnScope === "CATEGORY"}
                  onChange={() => setLearnScope("CATEGORY")}
                />
                카테고리 전체({learnTarget.category ?? "미입력"}) 기준으로 학습
              </label>
              <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
                - <strong>보류</strong>는 학습에 반영되지 않아요.<br />
                - 여행처럼 케이스가 다양하면 “이번만” 또는 “패턴”을 추천해요.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={closeLearnModal}>
                취소
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmLearnModal}>
                {learnModalMode === "WRONG" ? "틀림으로 기록" : "완료 반영"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default SettlementSection;
