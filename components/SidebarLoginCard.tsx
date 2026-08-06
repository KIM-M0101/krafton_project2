export default function SidebarLoginCard() {
  return (
    <div className="login-card">
      <p className="login-card-text">
        티스토리에 로그인하시고 더 많은 기능을 이용해보세요!
      </p>
      <button type="button" className="login-cta">
        <span className="login-cta-icon">💬</span>
        카카오계정으로 시작하기
      </button>
    </div>
  );
}