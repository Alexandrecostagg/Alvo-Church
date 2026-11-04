export function BrandLogo() {
  return (
    <a className="lp-logo" href="/" aria-label="Plataforma Esdras — início">
      <img
        className="lp-logo-mark"
        src="/esdras-book-quill-preview.png"
        width="60"
        height="40"
        alt=""
      />
      <span className="lp-logo-wordmark" aria-hidden="true">
        <span className="lp-logo-label">Plataforma</span>
        <span className="lp-logo-name">Esdras</span>
      </span>
    </a>
  );
}
