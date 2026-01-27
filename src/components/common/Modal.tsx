import { useEffect, type PropsWithChildren } from "react";
import { createPortal } from "react-dom";

type ModalProps = PropsWithChildren<{
  open: boolean;
  title?: string;
  onClose: () => void;
  hideFooter?: boolean;
}>;

function Modal({ open, title, onClose, children, hideFooter = false }: ModalProps) {
  // 모달이 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = "hidden";

      document.body.dataset.scrollY = String(scrollY);
    } else {
      const scrollY = parseInt(document.body.dataset.scrollY || "0");

      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.paddingRight = "";
      document.body.style.overflow = "";
      delete document.body.dataset.scrollY;

      window.scrollTo(0, scrollY);
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.paddingRight = "";
      document.body.style.overflow = "";
      delete document.body.dataset.scrollY;
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
        {!hideFooter && (
          <footer className="modal__footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              닫기
            </button>
          </footer>
        )}
      </div>
    </div>
  );

  // Portal을 사용하여 document.body에 직접 렌더링
  return createPortal(modalContent, document.body);
}

export default Modal;
