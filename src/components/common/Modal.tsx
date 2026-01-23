import { useEffect, type PropsWithChildren } from "react";
import { createPortal } from "react-dom";

type ModalProps = PropsWithChildren<{
  open: boolean;
  title?: string;
  onClose: () => void;
}>;

function Modal({ open, title, onClose, children }: ModalProps) {
  // 모달이 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (open) {
      // 현재 스크롤 위치를 저장하고 고정
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      // 저장된 스크롤 위치로 복원
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
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

  const modalContent = (
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

  // Portal을 사용하여 document.body에 직접 렌더링
  return createPortal(modalContent, document.body);
}

export default Modal;
