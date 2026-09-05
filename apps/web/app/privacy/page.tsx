import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Plataforma Esdras",
  description: "Como a Plataforma Esdras trata os dados pessoais dos usuários."
};

const updatedAt = "21 de agosto de 2026";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link className="legal-brand" href="/landing" aria-label="Voltar para a Plataforma Esdras">
          <span className="legal-brand-mark">E</span>
          <span>Plataforma Esdras</span>
        </Link>

        <article className="legal-card">
          <p className="legal-eyebrow">LEGAL E PRIVACIDADE</p>
          <h1>Política de Privacidade</h1>
          <p className="legal-updated">Última atualização: {updatedAt}</p>

          <p>
            Esta Política explica como a Plataforma Esdras trata dados pessoais ao oferecer
            ferramentas de gestão, comunicação e acompanhamento para igrejas e comunidades.
          </p>

          <Section title="1. Quem trata os dados">
            <p>
              A Plataforma Esdras disponibiliza a tecnologia. Cada igreja ou organização que
              utiliza a plataforma é responsável pelos dados que cadastra e pelas permissões
              concedidas à sua equipe.
            </p>
          </Section>

          <Section title="2. Dados que podemos tratar">
            <p>
              Conforme os recursos utilizados e as permissões da organização, podemos tratar
              dados de cadastro e contato, como nome, e-mail, telefone, data de nascimento,
              endereço, participação em eventos e grupos, registros de presença e informações
              fornecidas voluntariamente pelo usuário.
            </p>
            <p>
              Para doações e inscrições, o aplicativo pode exibir dados de PIX definidos pela
              própria igreja. A confirmação de pagamentos é feita pela organização responsável;
              a Plataforma Esdras não armazena dados completos de cartão de crédito.
            </p>
          </Section>

          <Section title="3. Finalidades do tratamento">
            <p>
              Usamos os dados para autenticar usuários, disponibilizar os módulos contratados,
              organizar membros e atividades, enviar comunicações autorizadas, fornecer suporte,
              prevenir fraudes e incidentes de segurança e cumprir obrigações legais.
            </p>
          </Section>

          <Section title="4. Compartilhamento e armazenamento">
            <p>
              Os dados são hospedados em provedores de infraestrutura e autenticação necessários
              ao funcionamento do serviço. Não vendemos dados pessoais. O compartilhamento ocorre
              apenas com a organização à qual o usuário está vinculado, fornecedores essenciais
              ao serviço ou quando exigido por lei.
            </p>
          </Section>

          <Section title="5. Segurança e retenção">
            <p>
              Adotamos controles de acesso, autenticação e medidas técnicas proporcionais para
              proteger os dados. As informações são mantidas pelo tempo necessário para as
              finalidades descritas, para atendimento de obrigações legais e para a continuidade
              do vínculo com a organização.
            </p>
          </Section>

          <Section title="6. Seus direitos">
            <p>
              Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso,
              correção, anonimização, eliminação quando aplicável, informação sobre
              compartilhamentos e revogação de consentimento. Solicitações relacionadas aos
              dados de uma igreja devem ser feitas primeiro à própria igreja; também é possível
              falar com a Plataforma Esdras.
            </p>
          </Section>

          <Section title="7. Contato">
            <p>
              Para dúvidas sobre privacidade ou para exercer direitos, escreva para{" "}
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
