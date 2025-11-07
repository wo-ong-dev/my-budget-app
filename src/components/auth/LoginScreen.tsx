import { useState, useEffect } from "react";
import "./LoginScreen.css";

type LoginScreenProps = {
  onLogin: () => void;
};

function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 저장된 토큰 확인
    const token = localStorage.getItem("budget-app-auth");
    if (token === "authenticated") {
      // 토큰이 있으면 즉시 로그인
      onLogin();
    } else {
      setIsChecking(false);
    }
  }, [onLogin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 비밀번호 확인 (환경변수 또는 고정값)
    const correctPassword = import.meta.env.VITE_APP_PASSWORD || "1234";

    if (password === correctPassword) {
      // 로그인 성공
      localStorage.setItem("budget-app-auth", "authenticated");
      onLogin();
    } else {
      setError("비밀번호가 올바르지 않습니다.");
      setPassword("");
    }
  };

  // 체크 중일 때는 아무것도 표시하지 않음 (빠른 자동 로그인)
  if (isChecking) {
    return null;
  }

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>🔒 내 가계부</h1>
          <p>비밀번호를 입력하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="password"
            className="login-input"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            autoFocus
          />

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button">
            로그인
          </button>
        </form>

        <div className="login-hint">
          기본 비밀번호: 1234
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
