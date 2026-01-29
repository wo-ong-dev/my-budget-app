import Modal from "../common/Modal";
import { formatCurrency } from "../../utils/formatters";

type CategoryDetail = {
  category: string;
  amount: number;
};

type OtherCategoriesModalProps = {
  open: boolean;
  onClose: () => void;
  details: CategoryDetail[];
  totalAmount: number;
  onCategoryClick?: (category: string) => void;
};

function OtherCategoriesModal({
  open,
  onClose,
  details,
  totalAmount,
  onCategoryClick,
}: OtherCategoriesModalProps) {
  const handleCategoryClick = (category: string) => {
    if (onCategoryClick) {
      onClose();
      onCategoryClick(category);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="그 외 카테고리" hideFooter>
      <div className="other-categories-modal">
        <div className="other-categories-modal__total">
          <span>합계</span>
          <strong>{formatCurrency(totalAmount)}원</strong>
        </div>
        <ul className="other-categories-modal__list">
          {details.map((detail) => (
            <li
              key={detail.category}
              className={`other-categories-modal__item ${onCategoryClick ? "other-categories-modal__item--clickable" : ""}`}
              onClick={() => handleCategoryClick(detail.category)}
              role={onCategoryClick ? "button" : undefined}
              tabIndex={onCategoryClick ? 0 : undefined}
              onKeyDown={
                onCategoryClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCategoryClick(detail.category);
                      }
                    }
                  : undefined
              }
            >
              <span className="other-categories-modal__category">{detail.category}</span>
              <div className="other-categories-modal__amount-wrapper">
                <span className="other-categories-modal__amount">
                  {formatCurrency(detail.amount)}원
                </span>
                {onCategoryClick && (
                  <span className="other-categories-modal__arrow">›</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="other-categories-modal__hint">
          카테고리를 클릭하면 해당 내역을 조회할 수 있습니다
        </p>
      </div>
    </Modal>
  );
}

export default OtherCategoriesModal;
