export default function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="loading-spinner__avatar">🤖</div>
      <div className="loading-spinner__dots">
        <span style={{ animationDelay: "0s" }} />
        <span style={{ animationDelay: "0.2s" }} />
        <span style={{ animationDelay: "0.4s" }} />
      </div>
      <p className="loading-spinner__text">Thinking…</p>
    </div>
  );
}
