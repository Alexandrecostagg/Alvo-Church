# Preparação para demonstração — 24/11/2026

## Identificação e método

Commit base: `4f76c1f3f070b72cd140b713c017553bdde39f85`. Testes transacionais no projeto fictício `demo-alvo-qa`, com Auth, Firestore e Storage emulados. Consultas em produção foram de leitura ou chamadas anônimas para comprovar recusa de acesso. Sem mensagens, pagamentos ou notificações reais.

Worker ativo observado: `281d7f5d-1554-4242-9459-4c91700f8ea6`, de 18/11/2026. Sem tag/mensagem que vincule o artefato a um commit; não se afirma identidade com o checkout testado.

## Resultados

**Parecer: apto para demonstração guiada do escopo validado, com as ressalvas abaixo.** A rodada não certifica operação irrestrita em produção ou entrega dos provedores externos.

[Pipeline completo, tentativa 2](https://github.com/Alexandrecostagg/Alvo-Church/actions/runs/44179794471/attempts/2): **sucesso** no commit base. Todos os cinco jobs passaram: qualidade, autorização, build web, build mobile e build LP. O job de autorização executou os 27 roteiros de módulos, a auditoria de segurança com API e o teste Pub/Sub. O build web incluiu Worker com configuração de produção e smoke test do runtime.

- Unitários: 766/766 em 84 arquivos.
- Typecheck: todos os workspaces aprovados.
- Worker compilado local: login, arquivos JS, QR privado, bloqueio anônimo e CORS aprovados.
- Dependências: zero alertas conhecidos na consulta de 24/11. O aviso antigo [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) foi retirado oficialmente em 18/11 por não ser questão de segurança.
- Produção: 13 páginas HTTP 200, login e arquivos JS disponíveis. As 17 APIs privadas válidas consultadas negaram acesso anônimo com 401 e `private, no-store`. Uma tentativa inicial usou `/api/marketplace`, inexistente; corrigida para `/api/marketplace/community`, que retornou 401. Esse 404 não é defeito do aplicativo.
- Firestore: hash das regras remoto igual ao local; 23 índices READY.
- Diretório: 3 verificações aprovadas.
- WhatsApp: repetição de webhook, opt-out, inscrições, lotação, tenant desconhecido, vínculo verificado e privacidade aprovados com provedor simulado.
- R2 local: 7/7 controles de upload multipart, retomada, leitura parcial, remoção e cancelamento.
- Mobile: export Android e iOS aprovado.
- Autorização em ambiente limpo: 27 roteiros completos aprovados; auditoria de segurança 48/48, zero achados no escopo automatizado.
- Dashboards: 79 verificações de administração, pastor, líder de célula, membro e rede; isolamento e navegação autorizada aprovados.
- Vídeos: 50 verificações adicionais de handlers, transações, privacidade e integração de repositórios web/mobile aprovadas.

## Navegador

Login fictício e painel local carregados. Registro de Visitante Demonstração QA gerou entrada integrada e jornada. Contato presencial confirmado. Não foi concedido consentimento de WhatsApp ou saudação pública; controles correspondentes permaneceram bloqueados.

Login publicado: desktop e celular 390 × 844, sem rolagem horizontal (scrollWidth=clientWidth=390), identidade atual e controles visíveis. Tab do e-mail alcançou a senha. Recuperação sem e-mail apresentou orientação e não enviou mensagem.

A navegação para Jornadas ficou em compilação no servidor dev durante a carga de testes. A suíte parou e encerrou o servidor, tornando a continuidade visual inconclusiva. Não se atribui essa falha de laboratório à versão publicada.

## Ocorrências e limites

1. Primeira execução de escalas recebeu 409/409 na criação concorrente esperada 200/200; emulador registrou `Transaction lock timeout`. Repetição local passou 54 controles, sem relaxar expectativas, e a execução limpa do GitHub também passou. A máquina estava sob carga elevada (load average observado 46,70). A ocorrência é compatível com contenção no laboratório; não foi reproduzida como falha funcional no ambiente limpo. O teste passou a incluir os corpos das respostas na mensagem de erro para facilitar investigações futuras.
2. Reinício do servidor dev excedeu 120 segundos sob a mesma carga. Os cenários restantes passaram a chamar diretamente os handlers reais.
3. Os nove patches recomendados pelo Expo foram aplicados em 24/11, mantendo o SDK 57. A validação online `expo install --check` passou. Após a atualização, os 766 testes, o typecheck de todos os workspaces, os exports Android/iOS e a consulta de vulnerabilidades (zero alertas) passaram novamente. O teste físico continua pendente.
4. Nesta rodada não houve teste físico do AAB 19 via Play, câmera/Kids, push real, segundo plano, rede instável e revogação no aparelho.
5. Integrações externas foram simuladas. Não prometer WhatsApp oficial, recebimento PIX ou IA ao vivo sem confirmar provisionamento e ensaiar o fluxo controlado.

## Revisão web

| Bloco | Estado | Evidência e limite |
|---|---|---|
| Componentes e responsividade | Parcialmente verificado | Login desktop/mobile e recepção; não foram auditados todos os breakpoints e o teclado de todas as abas |
| Modais e ajuda contextual | Parcial/inconclusivo | Recuperação confirmada; ciclo de foco/Escape de todos os modais não exercitado |
| Desempenho | Medição limitada | Tempos HTTP pontuais em production.json; não são LCP/INP nem teste de carga. Lentidão de dev registrada separadamente |
| Segurança e autenticação | Verificado no escopo descrito | Regras, índices, autorização, isolamento e privacidade; não equivale a pentest externo completo |

## Roteiro para o cliente

1. Entrar em instituição demonstrativa com dados fictícios. Confirmar instituição e perfil no topo.
2. Mostrar líder, pastor e presidência conforme acessos provisionados; explicar escopo de célula, igreja e rede.
3. Registrar visitante com autorização explícita; abrir Pessoas e Jornada e mostrar persistência.
4. Vincular célula, registrar encontro/presença e atualizar painel. Distinguir ausência de registro de ausência da pessoa.
5. Mostrar pedido pastoral, triagem, responsável e prazo; presidência acompanha indicadores autorizados da rede.
6. Demonstrar declaração e conciliação de contribuição fictícia; intenção/comprovante não equivale a recebimento.
7. Mostrar o mesmo vínculo no Android instalado e ensaiado. Enquanto faltar teste físico, apresentar o roteiro web.
8. Encerrar sessão e conferir bloqueio de acesso.

Antes de marcar a reunião, ensaiar o roteiro completo no ambiente e aparelho da apresentação. Preparar pessoas, encontros e pedidos coerentes para evitar painéis vazios. Preservar dados pastorais e financeiros reais.

Evidências técnicas em `docs/qa/2026-11-24`.

## Repetição

Executar com Node 22 e pnpm 10.6.3:

```sh
corepack pnpm test
corepack pnpm --filter @alvo/web exec next typegen
corepack pnpm typecheck
corepack pnpm audit --audit-level=high
corepack pnpm exec firebase emulators:exec --only auth,firestore,storage --project demo-alvo-qa 'node scripts/qa-ci.mjs'
corepack pnpm qa:cloudflare-runtime
corepack pnpm --filter @alvo/mobile exec expo export --platform android --platform ios --output-dir /tmp/esdras-readiness-mobile
```

O smoke do runtime requer Worker previamente compilado com `corepack pnpm build:cloudflare:web`. Esse build também foi repetido e aprovado no pipeline limpo. A suíte grava somente nos emuladores. O teste adicional de vídeos exige fixture MP4 local; o R2 é local/workerd, sem gravação no bucket publicado.

Não houve deploy, alteração de regras ou mudança de dados de negócio de produção nesta rodada.
