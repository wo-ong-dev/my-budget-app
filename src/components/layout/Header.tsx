import { useState, useRef, useEffect } from "react";

type HeaderProps = {
  onClickTitle?: () => void;
  onExportCSV?: () => void;
  onImportCSV?: () => void;
  onCompareCSV?: () => void;
};

function Header({ onClickTitle, onExportCSV, onImportCSV, onCompareCSV }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuItemClick = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <header className="app-header">
      <div className="app-header__content" onClick={onClickTitle}>
        <h1 className="app-header__title">내 가계부</h1>
        <p className="app-header__subtitle">간편한 수입·지출 관리</p>
      </div>
      {(onExportCSV || onImportCSV || onCompareCSV) && (
        <div className="app-header__menu" ref={menuRef}>
          <button
            type="button"
            className="menu-toggle-btn"
            onClick={handleMenuToggle}
            aria-label="메뉴"
          >
            ⋮
          </button>
          {isMenuOpen && (
            <div className="dropdown-menu">
              {onExportCSV && (
                <button
                  type="button"
                  className="dropdown-menu__item"
                  onClick={() => handleMenuItemClick(onExportCSV)}
                >
                  📤 CSV 내보내기
                </button>
              )}
              {onImportCSV && (
                <button
                  type="button"
                  className="dropdown-menu__item"
                  onClick={() => handleMenuItemClick(onImportCSV)}
                >
                  📥 CSV 가져오기
                </button>
              )}
              {onCompareCSV && (
                <button
                  type="button"
                  className="dropdown-menu__item"
                  onClick={() => handleMenuItemClick(onCompareCSV)}
                >
                  🔍 CSV 비교하기
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default Header;
