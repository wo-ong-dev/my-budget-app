import { useState, useMemo } from "react";
import Modal from "../common/Modal";

type ExportCSVModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onExport: (startMonth: string, endMonth: string) => void;
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
      onExport(startMonth, endMonth);
      onClose();
    }
  };

  // 모달이 열릴 때마다 현재 월로 초기화
  const handleClose = () => {
    setStartMonth(currentMonth);
    setEndMonth(currentMonth);
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={handleClose} hideFooter>
      <div className="export-modal">
        <h3 className="export-modal__title">CSV 내보내기</h3>
        <p className="export-modal__desc">내보낼 기간을 선택하세요</p>

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

        {isInvalidRange && (
          <p className="export-modal__error">시작월이 종료월보다 이후입니다</p>
        )}

        {!isInvalidRange && monthCount > 0 && (
          <p className="export-modal__info">
            총 <strong>{monthCount}개월</strong> 데이터를 내보냅니다
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
