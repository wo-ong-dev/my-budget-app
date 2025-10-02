﻿import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { TransactionDraft, TransactionType } from "../../types";
import { formatCurrencyInput, parseCurrencyInput, todayInputValue } from "../../utils/formatters";

type TransactionFormProps = {
  accounts: string[];
  categories: string[];
  defaultValues?: Partial<TransactionDraft>;
  onSubmit: (values: TransactionDraft) => Promise<void> | void;
  submitting?: boolean;
  submitLabel?: string;
  resetAfterSubmit?: boolean;
};

const blankDraft: TransactionDraft = {
  date: todayInputValue(),
  type: "지출",
  account: "",
  category: "",
  amount: 0,
  memo: "",
};

function TransactionForm({
  accounts,
  categories,
  defaultValues,
  onSubmit,
  submitting = false,
  submitLabel = "기록하기",
  resetAfterSubmit = true,
}: TransactionFormProps) {
  const mergedDefaults = { ...blankDraft, ...defaultValues } as TransactionDraft;

  const [draft, setDraft] = useState<TransactionDraft>(mergedDefaults);
  const [amountInput, setAmountInput] = useState(() => formatCurrencyInput(mergedDefaults.amount));

  useEffect(() => {
    setDraft(mergedDefaults);
    setAmountInput(formatCurrencyInput(mergedDefaults.amount));
  }, [
    mergedDefaults.date,
    mergedDefaults.type,
    mergedDefaults.account,
    mergedDefaults.category,
    mergedDefaults.amount,
    mergedDefaults.memo,
  ]);

  const handleChangeType = (type: TransactionType) => {
    setDraft((prev) => ({ ...prev, type }));
  };

  const handleChange = (field: keyof TransactionDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleAmountChange = (value: string) => {
    setAmountInput(value);
    const numeric = parseCurrencyInput(value);
    setDraft((prev) => ({ ...prev, amount: numeric }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.account || !draft.category || !draft.amount) {
      return;
    }
    await onSubmit({ ...draft, amount: Math.abs(draft.amount) });

    if (resetAfterSubmit) {
      setDraft(blankDraft);
      setAmountInput(formatCurrencyInput(blankDraft.amount));
    }
  };

  return (
    <form className="transaction-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label" htmlFor="transaction-date">
          날짜
        </label>
        <input
          id="transaction-date"
          type="date"
          className="form-input"
          value={draft.date}
          onChange={(event) => handleChange("date", event.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <span className="form-label">구분</span>
        <div className="radio-group">
          <label className={`radio-item${draft.type === "수입" ? " radio-item--active" : ""}`}>
            <input
              type="radio"
              name="transaction-type"
              value="수입"
              checked={draft.type === "수입"}
              onChange={() => handleChangeType("수입")}
            />
            수입
          </label>
          <label className={`radio-item${draft.type === "지출" ? " radio-item--active" : ""}`}>
            <input
              type="radio"
              name="transaction-type"
              value="지출"
              checked={draft.type === "지출"}
              onChange={() => handleChangeType("지출")}
            />
            지출
          </label>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="transaction-amount">
          금액
        </label>
        <input
          id="transaction-amount"
          className="form-input amount-input"
          inputMode="numeric"
          placeholder="0"
          value={amountInput}
          onChange={(event) => handleAmountChange(event.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="transaction-account">
          계좌/카드
        </label>
        <select
          id="transaction-account"
          className="form-select"
          value={draft.account}
          onChange={(event) => handleChange("account", event.target.value)}
          required
        >
          <option value="">선택해주세요</option>
          {accounts.map((account) => (
            <option key={account} value={account}>
              {account}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="transaction-category">
          카테고리
        </label>
        <select
          id="transaction-category"
          className="form-select"
          value={draft.category}
          onChange={(event) => handleChange("category", event.target.value)}
          required
        >
          <option value="">선택해주세요</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="transaction-memo">
          메모
        </label>
        <input
          id="transaction-memo"
          className="form-input"
          placeholder="메모를 입력하세요 (선택)"
          value={draft.memo ?? ""}
          onChange={(event) => handleChange("memo", event.target.value)}
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "저장 중..." : submitLabel}
      </button>
    </form>
  );
}

export default TransactionForm;
