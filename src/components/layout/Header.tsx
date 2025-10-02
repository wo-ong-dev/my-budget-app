type HeaderProps = {
  onClickTitle?: () => void;
};

function Header({ onClickTitle }: HeaderProps) {
  return (
    <header className="app-header" onClick={onClickTitle}>
      <div className="app-header__content">
        <h1 className="app-header__title">내 가계부</h1>
        <p className="app-header__subtitle">간편하게 관리하는 나만의 가계부</p>
      </div>
    </header>
  );
}

export default Header;
