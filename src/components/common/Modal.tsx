import { useEffect, type PropsWithChildren } from "react";

type ModalProps = PropsWithChildren<{
  open: boolean;
  title?: string;
  onClose: () => void;
}>;

function Modal({ open, title, onClose, children }: ModalProps) {
  // 모달이 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 백드롭 자체를 클릭했을 때만 닫기 (모달 내부 클릭 시 닫지 않음)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={handleBackdropClick}>
      <div className="modal">
        <header className="modal__header">
          {title ? <h3>{title}</h3> : null}
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
        <footer className="modal__footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}

export default Modal;
