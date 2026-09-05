import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Excluir conta | Plataforma Esdras",
  description: "Como solicitar a exclusão de uma conta e dos dados pessoais na Plataforma Esdras."
};

const updatedAt = "22 de agosto de 2026";

export default function AccountDeletionPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link className="legal-brand" href="/landing" aria-label="Voltar para a Plataforma Esdras">
          <span className="legal-brand-mark">E</span>
          <span>Plataforma Esdras</span>
        </Link>

        <article className="legal-card">
          <p className="legal-eyebrow">CONTA E PRIVACIDADE</p>
          <h1>Solicitar exclusão de conta</h1>
          <p className="legal-updated">Última atualização: {updatedAt}</p>

          <p>
            Você pode solicitar a exclusão da sua conta de acesso à Plataforma Esdras e dos dados
            pessoais vinculados a ela. Esta página se aplica ao aplicativo EsdrasApp e à versão web
            da plataforma.
          </p>

          <Section title="Como solicitar">
            <ol>
              <li>
                Envie um e-mail para{" "}
                <a href="mailto:contato@plataformaesdras.com.br?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20conta%20EsdrasApp">
                  contato@plataformaesdras.com.br
                </a>
                .
              </li>
              <li>Use o assunto “Solicitação de exclusão de conta EsdrasApp”.</li>
              <li>Informe o e-mail usado na conta e o nome da igreja ou organização vinculada.</li>
              <li>Responderemos para confirmar sua identidade e a solicitação.</li>
            </ol>
          </Section>

          <Section title="O que será excluído">
            <p>
              Após a confirmação, excluímos ou anonimizamos, quando aplicável, o perfil de acesso e
              os dados pessoais diretamente vinculados à sua conta, como nome, e-mail, telefone,
              preferências e identificadores de autenticação.
            </p>
            <p>
              Registros inseridos em nome de uma igreja — por exemplo, dados de membros, atividades,
              comunicações, presenças e lançamentos financeiros — pertencem à organização responsável.
              Quando necessário, ela será envolvida para preservar a continuidade dos seus registros e
              atender obrigações legais.
            </p>
          </Section>

          <Section title="Prazo e retenções necessárias">
            <p>
              Concluímos a solicitação em até 30 dias após validar a identidade. Poderemos reter os
              dados estritamente necessários por prazo maior quando houver obrigação legal, prevenção
              a fraudes, defesa de direitos ou necessidade de comprovar transações. Esses dados ficam
              restritos a essa finalidade durante o período de retenção.
            </p>
          </Section>

          <Section title="Dúvidas sobre privacidade">
            <p>
              Consulte nossa <Link href="/privacy">Política de Privacidade</Link> ou escreva para{" "}
              <a href="mailto:contato@plataformaesdras.com.br">contato@plataformaesdras.com.br</a>.
            </p>
          </Section>
        </article>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
