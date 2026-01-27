import { useState, useMemo } from "react";
import Modal from "../common/Modal";

type ExportFormat = "csv" | "excel";

type ExportCSVModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onExport: (startMonth: string, endMonth: string, format: ExportFormat) => void;
  availableMonths: string[];
  currentMonth: string;
};

function ExportCSVModal({
  isOpen,
  onClose,
  onExport,
  availableMonths,
  currentMonth
}: ExportCSVModalProps) {
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [format, setFormat] = useState<ExportFormat>("csv");

  // 월을 "YYYY년 MM월" 형식으로 표시
  const formatMonthLabel = (month: string) => {
    const [year, m] = month.split("-");
    return `${year}년 ${parseInt(m)}월`;
  };

  // 시작월이 종료월보다 이후인지 체크
  const isInvalidRange = useMemo(() => {
    return startMonth > endMonth;
  }, [startMonth, endMonth]);

  // 선택된 기간의 월 수 계산
  const monthCount = useMemo(() => {
    if (isInvalidRange) return 0;
    const [startYear, startM] = startMonth.split("-").map(Number);
    const [endYear, endM] = endMonth.split("-").map(Number);
    return (endYear - startYear) * 12 + (endM - startM) + 1;
  }, [startMonth, endMonth, isInvalidRange]);

  const handleExport = () => {
    if (!isInvalidRange) {
      onExport(startMonth, endMonth, format);
      onClose();
    }
  };

  // 모달이 열릴 때마다 현재 월로 초기화
  const handleClose = () => {
    setStartMonth(currentMonth);
    setEndMonth(currentMonth);
    setFormat("csv");
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={handleClose} hideFooter>
      <div className="export-modal">
        <h3 className="export-modal__title">데이터 내보내기</h3>
        <p className="export-modal__desc">내보낼 기간과 형식을 선택하세요</p>

        <div className="export-modal__range">
          <div className="export-modal__field">
            <label htmlFor="start-month">시작</label>
            <select
              id="start-month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="export-modal__select"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </div>

          <span className="export-modal__separator">~</span>

          <div className="export-modal__field">
            <label htmlFor="end-month">종료</label>
            <select
              id="end-month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              className="export-modal__select"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 내보내기 형식 선택 */}
        <div className="export-modal__format">
          <label className="export-modal__format-label">형식</label>
          <div className="export-modal__format-options">
            <label className={`export-modal__format-option ${format === "csv" ? "export-modal__format-option--active" : ""}`}>
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === "csv"}
                onChange={() => setFormat("csv")}
              />
              <span className="export-modal__format-icon">📄</span>
              <span className="export-modal__format-text">
                <strong>CSV</strong>
                <small>단일 파일</small>
              </span>
            </label>
            <label className={`export-modal__format-option ${format === "excel" ? "export-modal__format-option--active" : ""}`}>
              <input
                type="radio"
                name="format"
                value="excel"
                checked={format === "excel"}
                onChange={() => setFormat("excel")}
              />
              <span className="export-modal__format-icon">📊</span>
              <span className="export-modal__format-text">
                <strong>Excel</strong>
                <small>카테고리별 시트</small>
              </span>
            </label>
          </div>
        </div>

        {isInvalidRange && (
          <p className="export-modal__error">시작월이 종료월보다 이후입니다</p>
        )}

        {!isInvalidRange && monthCount > 0 && (
          <p className="export-modal__info">
            총 <strong>{monthCount}개월</strong> 데이터를 내보냅니다
            {format === "excel" && " (카테고리별 시트 분리)"}
          </p>
        )}

        <div className="export-modal__actions">
          <button
            type="button"
            className="export-modal__btn export-modal__btn--cancel"
            onClick={handleClose}
          >
            취소
          </button>
          <button
            type="button"
            className="export-modal__btn export-modal__btn--export"
            onClick={handleExport}
            disabled={isInvalidRange}
          >
            내보내기
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ExportCSVModal;
export type { ExportFormat };
