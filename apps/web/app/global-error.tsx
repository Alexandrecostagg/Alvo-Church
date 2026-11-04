"use client";

export default function GlobalError() {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#f8fafc", color: "#1f2937", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeContent: "center", padding: 24, textAlign: "center" }}>
          <title>Retomar acesso | Plataforma Esdras</title>
          <h1>Vamos retomar seu acesso</h1>
          <p role="alert">Não foi possível carregar esta página. Tente abrir o acesso novamente.</p>
          <a href="/login" style={{ color: "#166534", fontWeight: 700 }}>Abrir página de entrada</a>
          <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 16, padding: 12 }}>Recarregar página</button>
        </main>
      </body>
    </html>
  );
}
