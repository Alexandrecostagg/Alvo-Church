"use client";
import { useEffect, useRef, useState } from "react";
import { useAppAuth } from "../../../app/providers";
export function KidsRetentionPanel() {
  const { user, organizationId } = useAppAuth();
  const [days, setDays] = useState(30),
    [rows, setRows] = useState<any[]>([]),
    [reviewed, setReviewed] = useState(false),
    [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    setRows([]);
    setReviewed(false);
    setConfirm(false);
    setMessage("");
  }, [organizationId, days]);
  async function request(body: Record<string, unknown>) {
    if (!user) throw new Error("Entre na sua conta.");
    const response = await fetch("/api/kids/retention", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ...body, organizationId, days }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }
  async function run(purge = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      let removed = 0;
      if (purge) {
        if (!confirm) throw new Error("Confirme a remoção das fotos listadas.");
        for (const row of rows) {
          await request({
            action: "purge",
            checkInId: row.id,
            fingerprint: row.fingerprint,
            confirm: true,
          });
          removed++;
        }
      }
      const data = await request({ action: "preview" });
      setRows(data.candidates);
      setReviewed(true);
      setConfirm(false);
      setMessage(
        `${purge ? `${removed} foto(s) removida(s). ` : ""}${data.hasMore ? "Há mais resultados. Revise o próximo lote depois de concluir este." : "Prévia atualizada."}`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Operação indisponível. Atualize a prévia para conferir possíveis remoções já concluídas.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="content-section" style={{ marginTop: 24 }}>
      <h2>Retenção de fotos Kids</h2>
      <p>
        Revise fotos de entradas encerradas há mais de {days} dias. A remoção
        preserva os registros de entrada, responsáveis e retirada. Nenhuma foto
        é apagada automaticamente.
      </p>
      <label>
        Prazo após a retirada{" "}
        <select
          disabled={busy}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {[7, 30, 90, 365].map((d) => (
            <option key={d} value={d}>
              {d} dias
            </option>
          ))}
        </select>
      </label>{" "}
      <button className="btn-secondary" disabled={busy} onClick={() => run()}>
        Revisar fotos antigas
      </button>
      {message && <p role="status">{message}</p>}
      {reviewed && !rows.length && <p>Nenhuma foto elegível neste lote.</p>}
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            {row.childName} — retirada em{" "}
            {new Date(row.checkedOutAt).toLocaleDateString("pt-BR")}
            {row.legacyExternal
              ? " — arquivo externo exige remoção adicional na origem"
              : ""}
          </li>
        ))}
      </ul>
      {rows.length > 0 && (
        <>
          <label>
            <input
              type="checkbox"
              disabled={busy}
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />{" "}
            Confirmo a exclusão definitiva das fotos listadas.
          </label>
          <p>
            <button
              className="btn-primary"
              disabled={busy || !confirm}
              onClick={() => run(true)}
            >
              {busy ? "Processando..." : "Remover fotos revisadas"}
            </button>
          </p>
        </>
      )}
      <p>
        Entradas anteriores a esta rotina precisam de inventário e migração
        assistida. Arquivos externos antigos não são apagados na origem por esta
        tela.
      </p>
    </section>
  );
}
