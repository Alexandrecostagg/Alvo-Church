import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ManagementReportDocument,
  type ManagementReportData,
} from "./management-report-document";

const data: ManagementReportData = {
  organizationName: "Instituição Fictícia de Testes",
  organizationLocation: "Cidade Fictícia / PA",
  generatedAt: "28/10/2026, 09:00:00",
  reference: "outubro de 2026",
  summary: [
    {
      indicator: "Total de Membros",
      current: "30",
      previous: "—",
      change: "—",
    },
    {
      indicator: "Arrecadação",
      current: "R$ 1.200,00",
      previous: "R$ 1.000,00",
      change: "+20.0%",
    },
  ],
  hasFinance: true,
  income: [
    { month: "maio de 2026", amount: "R$ 800,00" },
    { month: "outubro de 2026", amount: "R$ 1.200,00" },
  ],
  composition: [
    { label: "Membro", count: 30, percentage: "75%" },
    { label: "Visitante", count: 10, percentage: "25%" },
  ],
  tribes: [
    { label: "Judá", count: 20 },
    { label: "Sem tribo", count: 10 },
  ],
};
const render = (report = data) =>
  renderToStaticMarkup(
    React.createElement(ManagementReportDocument, { data: report }),
  );

describe("documento gerencial de impressão", () => {
  it("identifica instituição, referência, data e mantém os dados em tabelas sem os controles do painel", () => {
    const html = render();
    for (const value of [
      data.organizationName,
      data.organizationLocation,
      data.reference,
      data.generatedAt,
      "Resumo executivo",
      "R$ 1.200,00",
      "maio de 2026",
      "Composição dos cadastros",
      "Judá",
    ])
      expect(html).toContain(value);
    expect(html.match(/<table>/g)).toHaveLength(4);
    expect(html).not.toMatch(
      /<nav|<button|<svg|<canvas|Exportar CSV|Imprimir \/ PDF/,
    );
  });

  it("explica a ausência de registros financeiros sem inventar valores zerados", () => {
    const html = render({
      ...data,
      hasFinance: false,
      income: [],
      summary: data.summary.slice(0, 1),
      tribes: [],
    });
    expect(html).toContain("Nenhum lançamento financeiro registrado");
    expect(html).toContain("Nenhum membro classificado");
    expect(html).not.toContain("R$");
  });

  it("escapa nomes da instituição e preserva todas as linhas de um relatório extenso", () => {
    const html = render({
      ...data,
      organizationName: '<img src="x" onerror="alert(1)">',
      tribes: Array.from({ length: 40 }, (_, n) => ({
        label: `Tribo fictícia ${n}`,
        count: n,
      })),
    });
    expect(html).not.toContain('<img src="x"');
    expect(html).toContain("&lt;img");
    expect(html).toContain("Tribo fictícia 39");
    expect(html).toContain("table-header-group");
  });
});
