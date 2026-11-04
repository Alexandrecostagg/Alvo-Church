"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const MANAGEMENT_REPORT_PRINT_ROOT = "esdras-management-report-print";

export interface ManagementReportData {
  organizationName: string;
  organizationLocation: string;
  generatedAt: string;
  reference: string;
  summary: Array<{
    indicator: string;
    current: string;
    previous: string;
    change: string;
  }>;
  hasFinance: boolean;
  income: Array<{ month: string; amount: string }>;
  composition: Array<{ label: string; count: number; percentage: string }>;
  tribes: Array<{ label: string; count: number }>;
}

// The portal is a direct child of body. Printing never depends on the app's
// sidebar width, sticky headers, charts, overflow or nested flex layouts.
export function ManagementReportPrintPortal({
  data,
  onReady,
}: {
  data: ManagementReportData;
  onReady: (ready: boolean) => void;
}) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const element = document.createElement("div");
    element.id = MANAGEMENT_REPORT_PRINT_ROOT;
    document.body.appendChild(element);
    setHost(element);
    return () => element.remove();
  }, []);
  useEffect(() => {
    onReady(Boolean(host));
  }, [host, onReady]);
  return host
    ? createPortal(<ManagementReportDocument data={data} />, host)
    : null;
}

export function ManagementReportDocument({
  data,
}: {
  data: ManagementReportData;
}) {
  return (
    <>
      <style>{PRINT_STYLES}</style>
      <article
        className="esdras-report-document"
        aria-label="Relatório gerencial para impressão"
      >
        <header className="esdras-report-header">
          <p className="esdras-report-brand">PLATAFORMA ESDRAS</p>
          <h1>{data.organizationName}</h1>
          {data.organizationLocation && <p>{data.organizationLocation}</p>}
          <h2>Relatório gerencial</h2>
          <dl className="esdras-report-metadata">
            <div>
              <dt>Referência</dt>
              <dd>{data.reference}</dd>
            </div>
            <div>
              <dt>Dados consultados em</dt>
              <dd>{data.generatedAt}</dd>
            </div>
          </dl>
        </header>

        <section className="esdras-report-section">
          <h2>1. Resumo executivo</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Indicador</th>
                <th scope="col">Atual</th>
                <th scope="col">Mês anterior</th>
                <th scope="col">Variação</th>
              </tr>
            </thead>
            <tbody>
              {data.summary.map((row) => (
                <tr key={row.indicator}>
                  <th scope="row">{row.indicator}</th>
                  <td>{row.current}</td>
                  <td>{row.previous}</td>
                  <td>{row.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="esdras-report-note">
            Os indicadores cadastrais mostram a posição atual. Comparativos
            mensais aparecem somente quando há histórico disponível; variações
            sem base anterior são indicadas por um traço.
          </p>
        </section>

        <section className="esdras-report-section">
          <h2>2. Arrecadação nos últimos seis meses</h2>
          {data.hasFinance ? (
            <table>
              <thead>
                <tr>
                  <th scope="col">Mês de referência</th>
                  <th scope="col">Entradas registradas</th>
                </tr>
              </thead>
              <tbody>
                {data.income.map((row) => (
                  <tr key={row.month}>
                    <th scope="row">{row.month}</th>
                    <td>{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>
              Nenhum lançamento financeiro registrado no conjunto de dados
              consultado.
            </p>
          )}
        </section>

        <div className="esdras-report-breakdowns">
          <section className="esdras-report-section">
            <h2>3. Composição dos cadastros</h2>
            <table>
              <thead>
                <tr>
                  <th scope="col">Classificação</th>
                  <th scope="col">Pessoas</th>
                  <th scope="col">%</th>
                </tr>
              </thead>
              <tbody>
                {data.composition.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.count}</td>
                    <td>{row.percentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="esdras-report-section">
            <h2>4. Membros por tribo</h2>
            {data.tribes.length ? (
              <table>
                <thead>
                  <tr>
                    <th scope="col">Tribo</th>
                    <th scope="col">Membros</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tribes.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>
                Nenhum membro classificado em tribos no cadastro consultado.
              </p>
            )}
          </section>
        </div>

        <footer className="esdras-report-footer">
          <p>
            Fonte: cadastros, grupos, eventos e lançamentos financeiros da
            instituição.
          </p>
          <p>Plataforma Esdras · Relatório gerencial para uso interno.</p>
        </footer>
      </article>
    </>
  );
}

const PRINT_STYLES = `
  #${MANAGEMENT_REPORT_PRINT_ROOT} { display: none; }
  @page { size: A4 portrait; margin: 15mm 15mm 16mm; }
  @media print {
    html:has(body > #${MANAGEMENT_REPORT_PRINT_ROOT}),
    body:has(> #${MANAGEMENT_REPORT_PRINT_ROOT}) {
      display: block !important; height: auto !important; min-height: 0 !important;
      overflow: visible !important; margin: 0 !important; padding: 0 !important;
      background: #fff !important; color: #111 !important;
    }
    body:has(> #${MANAGEMENT_REPORT_PRINT_ROOT}) > :not(#${MANAGEMENT_REPORT_PRINT_ROOT}) { display: none !important; }
    body:has(> #${MANAGEMENT_REPORT_PRINT_ROOT})::before,
    body:has(> #${MANAGEMENT_REPORT_PRINT_ROOT})::after { display: none !important; content: none !important; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} {
      display: block !important;
      position: static !important; width: auto !important; max-width: none !important;
      margin: 0 !important; padding: 0 !important; background: #fff !important;
    }
    #${MANAGEMENT_REPORT_PRINT_ROOT} *, #${MANAGEMENT_REPORT_PRINT_ROOT} *::before, #${MANAGEMENT_REPORT_PRINT_ROOT} *::after {
      box-sizing: border-box; text-shadow: none !important; box-shadow: none !important;
      animation: none !important; transition: none !important;
    }
    #${MANAGEMENT_REPORT_PRINT_ROOT} .esdras-report-document {
      width: 100%; margin: 0; padding: 0; font: 10pt/1.35 Arial, Helvetica, sans-serif;
      color: #111; background: #fff; overflow-wrap: anywhere;
    }
    #${MANAGEMENT_REPORT_PRINT_ROOT} .esdras-report-header { border-bottom: 2px solid #222; padding-bottom: 10pt; margin-bottom: 12pt; break-inside: avoid; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} p { margin: 4pt 0; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} h1 { font: bold 19pt/1.2 Arial, sans-serif; margin: 6pt 0; color: #111; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} h2 { font: bold 11pt/1.3 Arial, sans-serif; margin: 0 0 7pt; color: #111; break-after: avoid; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} .esdras-report-header h2 { font-size: 14pt; margin: 9pt 0; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} .esdras-report-brand { font-size: 8pt; letter-spacing: 1.4pt; font-weight: bold; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} .esdras-report-metadata { display: flex; flex-wrap: wrap; gap: 10pt 28pt; margin: 8pt 0 0; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} dt { font-size: 8pt; color: #444; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} dd { margin: 1pt 0 0; font-size: 9pt; font-weight: bold; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} .esdras-report-section { margin: 0 0 13pt; break-inside: avoid; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 9pt; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} thead { display: table-header-group; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} tr { break-inside: avoid; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} th, #${MANAGEMENT_REPORT_PRINT_ROOT} td { padding: 5pt 6pt; border: 1px solid #c5c5c5; vertical-align: top; text-align: left; color: #111; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} thead th { background: #f1f1f1; font-weight: bold; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} tbody th { font-weight: normal; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} td { font-variant-numeric: tabular-nums; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} .esdras-report-note { font-size: 8pt; line-height: 1.4; color: #444; margin-top: 6pt; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} .esdras-report-breakdowns { display: block; }
    #${MANAGEMENT_REPORT_PRINT_ROOT} .esdras-report-footer { border-top: 1px solid #aaa; padding-top: 6pt; margin-top: 5pt; font-size: 8pt; color: #444; break-inside: avoid; }
  }
`;
