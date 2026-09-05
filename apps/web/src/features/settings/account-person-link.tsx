"use client";

import { useEffect, useState } from "react";
import type { Person } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";

export function AccountPersonLink({ userId, email, onClose }: { userId: string; email: string; onClose: () => void }) {
  const { user, organizationId, firebaseConfig } = useAppAuth();
  const [listLimit, setListLimit] = useState(500);
  const [people, setPeople] = useState<Person[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setReady(false); setMessage("");
    void (async () => {
      try {
        if (!user) throw new Error("Entre na sua conta.");
        const token = await user.getIdToken();
        const sdk = await import("@alvo/firebase");
        const [response, list] = await Promise.all([
          fetch(`/api/members/account-link?${new URLSearchParams({ organizationId, userId })}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal }),
          sdk.fetchPeople(firebaseConfig, { organizationId }, 500),
        ]);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (cancelled) return;
        setPeople(list); setCurrent(data.personId); setCurrentName(data.personName);
        setSelected(data.personId ?? ""); setReady(true);
      } catch (error) { if (!cancelled) setMessage(error instanceof Error ? error.message : "Não foi possível carregar o vínculo."); }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [user, organizationId, userId, firebaseConfig, revision]);

  async function save(personId: string | null) {
    if (!user || !ready) return;
    setBusy(true); setMessage("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/members/account-link", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organizationId, userId, personId, expectedPersonId: current }),
      });
      const data = await response.json();
      if (!response.ok) { if (response.status === 409) setReady(false); throw new Error(data.error); }
      setCurrent(data.personId); setSelected(data.personId ?? "");
      const person = people.find(p => p.id === data.personId);
      setCurrentName(person ? `${person.firstName} ${person.lastName}` : null);
      setMessage(personId ? "Vínculo confirmado. O membro já pode atualizar o Passe no aplicativo." : "Vínculo removido. O aplicativo deixará de exibir o Passe na próxima verificação.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  async function loadMore() {
    setBusy(true);
    try {
      const sdk = await import("@alvo/firebase");
      const nextLimit = listLimit + 500;
      setPeople(await sdk.fetchPeople(firebaseConfig, { organizationId }, nextLimit));
      setListLimit(nextLimit);
    } catch { setMessage("Não foi possível carregar mais cadastros."); }
    finally { setBusy(false); }
  }
  const options = people.filter(p => p.status === "active" && `${p.firstName} ${p.lastName}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  return <section aria-label={`Vínculo de ${email}`} style={{ marginTop: 24, padding: 20, border: "1px solid var(--color-border-tertiary)", borderRadius: 12 }}>
    <h2 style={{ fontSize: 18 }}>Vincular conta ao cadastro</h2>
    <p>{email}</p>
    <p>Confirme a identidade antes de salvar. Cada pessoa pode ter uma conta vinculada. Esta confirmação permite acessar o cadastro pessoal e o Esdras Passe no app, quando habilitado.</p>
    {ready && <>
      <p><strong>Vínculo atual:</strong> {current ? currentName || current : "Nenhum vínculo confirmado"}</p>
      <label style={{ display: "block", marginBottom: 12 }}>Buscar pessoa por nome
        <input value={search} onChange={e => setSearch(e.target.value)} style={{ display: "block", width: "100%", padding: 10 }} />
      </label>
      {people.length >= listLimit && <p>Busca nos primeiros {listLimit} cadastros. <button disabled={busy} onClick={() => void loadMore()}>Carregar mais cadastros</button></p>}
      <label style={{ display: "block" }}>Pessoa cadastrada
        <select value={selected} onChange={e => setSelected(e.target.value)} disabled={busy} style={{ display: "block", width: "100%", padding: 10 }}>
          <option value="">Selecione uma pessoa</option>
          {selected && !options.some(p => p.id === selected) && <option value={selected}>{people.find(p => p.id === selected)?.firstName ?? currentName ?? selected} (selecionada)</option>}
          {options.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.id}</option>)}
        </select>
      </label>
    </>}
    <p role="status" aria-live="polite">{message || (!ready ? "Carregando…" : "")}</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <button disabled={!ready || busy || !selected || selected === current} onClick={() => void save(selected)}>Confirmar vínculo</button>
      <button disabled={!ready || busy || !current} onClick={() => void save(null)}>Remover vínculo</button>
      <button disabled={busy} onClick={() => setRevision(r => r + 1)}>Atualizar</button>
      <button disabled={busy} onClick={onClose}>Fechar</button>
    </div>
  </section>;
}
