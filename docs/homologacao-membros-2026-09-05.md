# Homologação local: login e membros

Sessão de 04/09/2026 em Belém, concluída em 05/09 UTC. Ambiente isolado
`demo-alvo-qa`, Auth e Firestore emulados, painel em `http://localhost:3001`.
Foram usados somente dados fictícios; não houve alteração em produção.

## Como repetir

É necessário Java 21 para os emuladores. Na raiz do repositório:

```bash
# Terminal 1 — manter aberto
corepack pnpm qa:emulators

# Terminal 2 — criar as contas locais e abrir o painel
corepack pnpm qa:seed
corepack pnpm qa:web
```

Contas exclusivas de teste, ambas com a senha `Local-QA-2026!`:

| E-mail | Igreja | Plano |
| --- | --- | --- |
| admin.principal@example.test | Igreja QA principal | Pastoral |
| admin.secundaria@example.test | Igreja QA secundaria | Gratuito |

O script sobrescreve explicitamente a configuração Firebase com o projeto demo.
Não usar as credenciais reais no painel de QA. Os dados dos emuladores são
temporários; ao reiniciar sem exportação, execute o seed e o roteiro novamente.
O seed cria contas e igrejas; o membro abaixo é cadastrado pela interface.

## Roteiro executado no navegador

1. Login com senha incorreta apresenta erro; senha correta abre a igreja principal.
2. Igreja vazia mostra zero pessoas/grupos, sem registros de demonstração no painel.
3. Cadastro rejeita CPF `11111111111`.
4. Selecionar 31/01/2000 e trocar para fevereiro limpa o dia. Salvar nessa situação
   apresenta a mensagem de data incompleta.
5. CEP `01001000` preenche Praça da Sé, Sé, São Paulo, SP; número preenchido: 100.
6. Salvar nome `Pessoa QA`, sobrenome `Homologação`, nascimento 29/02/2000,
   CPF sintético `52998224725`, e-mail `pessoa.qa@example.test`, família
   `Família QA Local`. Consentimento e passe permanecem desmarcados.
7. Sucesso no cadastro; lista com uma pessoa e uma família; ficha abre com a
   família correta e nascimento **29 de fev. de 2000** no fuso de Belém.
8. Ficha sem telefone, célula ou passe não inventa esses dados.
9. Dashboard atualizado com uma pessoa e zero grupos.
10. Segunda igreja mostra sua própria identidade, lista vazia e menu do plano
    gratuito. Acesso direto a `/finance` mostra o bloqueio para upgrade.
11. Voltar à primeira conta e tentar salvar o mesmo CPF informa o cadastro
    existente; continua havendo apenas uma pessoa.

Depois do roteiro:

```bash
corepack pnpm qa:verify
TZ=America/Belem corepack pnpm test
corepack pnpm typecheck
# Pare qa:web antes do build: ambos usam apps/web/.next.
corepack pnpm build:cloudflare:web
```

`qa:verify` autentica usuários de teste pela API do emulador, lê os registros
pelas regras Firestore e verifica nascimento, endereço, família, CPF único,
consentimento e passe. Confirma também que uma conta de outra igreja recebe
403 ao tentar ler a ficha e que leitura anônima é recusada. O script não usa
Admin SDK para essas leituras e não imprime tokens.

## Correções resultantes

Validação concluída: **158 testes em 14 arquivos**, typecheck do monorepo,
`qa:verify` e build de produção OpenNext passaram. Nenhum deploy foi executado.

- Flag de emuladores passada ao provedor Firebase e CSP de desenvolvimento
  compatível com Next/HMR e Auth/Firestore locais; relaxamentos só em desenvolvimento.
- CEP com fallback também em falha de rede/timeout e cancelamento de consultas antigas.
- Validação de datas reais/futuras, limpeza do dia incompatível e exibição de
  datas de calendário sem deslocamento de fuso horário.
- Proteção contra envios simultâneos do formulário e invalidação do cache após salvar.
- Remoção dos preenchimentos fictícios no dashboard e na ficha, incluindo
  números financeiros, pessoas, progresso acadêmico, telefone, célula e passe.
- Lista local filtrada pela igreja e consultas aguardando resolução da organização.
- Navegação não confunde `/members` com `/me`.
- Removido o disparo de snapshots de rede pelo navegador: as regras reservam
  essa escrita ao backend, que já possui o agendamento correspondente.

## Limites desta validação

A inspeção visual foi feita no navegador desktop. Não certifica o aplicativo
nativo, todas as telas, regras de escrita de todos os papéis ou produção.
O controle de módulos foi verificado na interface para dois planos; não é uma
auditoria completa de autorização das APIs.

Ainda existem telas com dados simulados fora deste fluxo. A lista/painel usam
consultas limitadas, sem paginação completa; totais de bases grandes exigem
agregações. Duplicidade de CPF e limite de plano continuam validados pelo cliente,
e pessoa/família/vínculo são gravados separadamente; a próxima etapa deve tornar
essas garantias atômicas no backend e testar regras de escrita entre igrejas.
O plano geral de segurança continua em
`plano-acao-seguranca-estabilizacao-2026-08-21.md`.
