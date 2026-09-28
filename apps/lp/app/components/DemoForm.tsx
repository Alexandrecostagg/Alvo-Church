"use client";

import { useRef, useState, type FormEvent } from "react";
import { CONTACT_EMAIL, DEMO_WHATSAPP, WEB_APP_URL } from "../lib/site";

export function DemoForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const preview = useRef<HTMLDivElement>(null);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const church = String(data.get("church") || "").trim();
    if (!name || !church) {
      setError("Preencha seu nome e o nome da instituição.");
      (event.currentTarget.elements.namedItem(!name ? "name" : "church") as HTMLInputElement)?.focus();
      return;
    }
    setError("");
    setMessage([
      "Olá! Quero agendar uma demonstração da Plataforma Esdras.",
      `Meu nome: ${name}`, `Instituição: ${church}`,
      `Quero conhecer: ${data.get("interest")}`,
      `Melhor período para conversar: ${data.get("period")}`,
      "Podemos combinar uma data e um horário?",
    ].join("\n"));
    requestAnimationFrame(() => preview.current?.focus());
  }

  return <div className="lp-demo-form-wrap">
    <form className="lp-demo-form" onSubmit={prepare} onChange={() => { setMessage(""); setError(""); }}>
      <h2>Conte o que você quer conhecer</h2>
      <p className="lp-form-help">Preparamos uma mensagem para você revisar e enviar pelo WhatsApp.</p>
      <div className="lp-form-grid">
        <label htmlFor="demo-name">Seu nome<input id="demo-name" name="name" autoComplete="name" required maxLength={80} aria-describedby={error ? "demo-form-error" : undefined} placeholder="Como podemos chamar você?" /></label>
        <label htmlFor="demo-church">Nome da instituição<input id="demo-church" name="church" autoComplete="organization" required maxLength={120} aria-describedby={error ? "demo-form-error" : undefined} placeholder="Sua igreja ou instituição" /></label>
        <label htmlFor="demo-interest">O que deseja conhecer?<select id="demo-interest" name="interest" defaultValue="Visão geral da plataforma">
          <option>Visão geral da plataforma</option><option>Membros e recepção</option><option>Células e cuidado pastoral</option><option>Segurança Kids</option><option>Finanças e planos</option><option>App e Esdras Passe</option>
        </select></label>
        <label htmlFor="demo-period">Período de preferência<select id="demo-period" name="period" defaultValue="A combinar">
          <option>A combinar</option><option>Manhã</option><option>Tarde</option><option>Noite</option>
        </select></label>
      </div>
      <p className="lp-form-help">O período é uma preferência. A equipe combina com você a data, o horário e o fuso pelo WhatsApp.</p>
      {error && <p id="demo-form-error" className="lp-form-error" role="alert">{error}</p>}
      <button type="submit" className="lp-btn-primary">Preparar solicitação</button>
      <p className="lp-form-help">Os dados ficam nesta página até você abrir o WhatsApp. Não inclua informações de membros. <a href={`${WEB_APP_URL}/privacy`}>Política de privacidade</a>.</p>
    </form>
    {message && <div className="lp-demo-preview" ref={preview} tabIndex={-1} aria-labelledby="demo-preview-title">
      <h2 id="demo-preview-title">Confira e continue no WhatsApp</h2>
      <pre>{message}</pre>
      <a className="lp-btn-primary" href={`https://wa.me/${DEMO_WHATSAPP}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" data-analytics-event="contact_click" data-analytics-placement="contact" data-analytics-target="whatsapp">Abrir WhatsApp e enviar</a>
      <p className="lp-form-help">Uma nova aba será aberta. Envie a mensagem por lá; o agendamento só estará confirmado depois da resposta da equipe.</p>
    </div>}
    <p className="lp-demo-alternative">Prefere e-mail? <a href={`mailto:${CONTACT_EMAIL}?subject=Agendar%20demonstra%C3%A7%C3%A3o%20Esdras`}>{CONTACT_EMAIL}</a></p>
    <noscript>Para agendar, escreva para {CONTACT_EMAIL} ou fale pelo WhatsApp +55 (62) 99333-0336.</noscript>
  </div>;
}
