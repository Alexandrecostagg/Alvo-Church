# Correções de segurança — 10/10/2026

Continuação da [auditoria](auditoria-seguranca-2026-10-10.md), autorizada pelo usuário. As evidências anteriores são históricas; este documento registra a remediação.

## Alterações

| Achado | Correção | Verificação / limite |
| --- | --- | --- |
| SEC-01 | IDs de cobrança exclusivos do servidor; bootstrap gratuito estrito; faturas exigem pedido canônico da mesma instituição e correspondência de cliente/assinatura | Escrita maliciosa negada, vínculo testado, fluxo de cobrança/webhook aprovado com provedor simulado. Assinaturas legadas sem pedido canônico retornam 409 e precisam de conferência, sem atribuição automática |
| SEC-02 | Dados de famílias, recepção, acompanhamento e avaliações internos restritos aos operadores; histórico individual ao titular/admin; membros só consultam relatórios financeiros publicados | Controles positivos e negativos nos emuladores; consulta do app ajustada para relatórios publicados |
| SEC-03 | Rascunhos globais fechados; aulas globais pelo backend com instituição, conta, módulo e compra ativos; cursos institucionais somente ativos para membros | Compra ativa permite conteúdo; ausência/revogação nega. Cursos arquivados e backups preservados |
| SEC-04 | Corrigida a consulta de existência do Storage; instituição deve estar ativa; marcas limitadas a tipos/tamanho/prefixos explícitos | PNG legítimo permitido, HTML e instituição inativa negados em emulador; produção mudou para R2 privado, conforme complemento abaixo |
| SEC-05 | Next 16.3.8 e atualizações transitivas compatíveis, sem audit-fix forçado | Auditoria residual abaixo; não equivale a ausência de vulnerabilidades |
| SEC-06 | Corpo de upload limitado durante leitura; PNG/JPEG/WEBP conferidos pelos bytes e tipo; SVG/ICO recusados; nomes gerados no servidor | Testes de conteúdo disfarçado, payload anexado e tamanho. Não é antivírus nem decodificação/re-encodificação completa |
| SEC-07 | Headers de proteção e CSP na LP; assets do domínio próprio passam pelo proxy; câmera permitida somente na própria origem do painel para Kids | Conferência HTTP após publicação. CSP ainda aceita scripts inline por compatibilidade; endurecimento com nonce/hash segue separado |
| SEC-08 | Toda API que usa o verificador comum consulta conta desativada e validSince no Firebase Auth; falha fechada e timeout | Conta desativada com token emitido retorna 401 no emulador; algoritmo de revogação testado; teste inicial usou uma identidade local diferente da produção; permissão do backend ainda pendente, conforme complemento abaixo |
| SEC-09 | Mobile rejeita esquemas externos inseguros, restringe links variáveis a HTTPS, remove log sensível e permissão de microfone; iOS sem exceção de rede local | Exportações e pacotes Android/iOS aprovados; manifestos, assinatura e entitlements conferidos. Teste físico e distribuição ainda pendentes |
| SEC-10 | Endpoint legado de comprovantes em bucket público retirado (410); fluxo atual privado mantido | Não foram apagados objetos antigos. Inventário histórico do R2 ainda pendente |
| SEC-11 | Limitador Wi-Fi persistente em Durable Object compartilhado entre instâncias; SSID obrigatório; corpo limitado e erros genéricos | Teste de persistência, janela e limpeza. O endpoint legado não implementa por si só a persistência cadastral/integração de roteador |

Sabedoria Pastoral também valida os oito tipos de entrada no servidor, antes de reservar cota ou chamar o provedor. Campos desconhecidos não entram no prompt.

## Validação

- 47 arquivos, **464 testes unitários** aprovados (incluindo autorização de cobrança, uploads, revogação, URLs, limitador e entradas).
- As novas provas também foram adicionadas à rotina de autorização do GitHub Actions, incluindo a API local.
- [44 provas de segurança](security/2026-10-10/correcoes-regressao.json): **44 respostas esperadas**, com acessos legítimos e tentativas indevidas, exclusivamente em emuladores com dados fictícios.
- QA: cadastro; entrega 6 (101), entrega 7 (136), entrega 8 (43), entrega 9 (36), entrega 10 (20), custódia Kids (77), mídia Kids (62), vínculo/Pass (78), parceiros (41). O cenário da cota gratuita usa agora entrada válida para testar 429; campos inválidos têm testes próprios.
- Typecheck de todos os pacotes aprovado no estado final.
- GitHub Actions do commit `68f6ffc`: todos os cinco jobs aprovados ([execução 38056065305](https://github.com/Alexandrecostagg/Alvo-Church/actions/runs/38056065305)).
- Build LP, dry-run Worker, build Cloudflare do painel e exportação Hermes Android/iOS aprovados.
- Nenhuma cobrança real, mudança de titularidade, restauração de cursos ou exclusão de dados pessoais.

## Publicação e pendências

Publicações confirmadas:

- Painel/API: `d7f661ff-a1de-49ed-99f1-bdee7c8de54a`.
- Worker API: `cda13810-7c81-4ae5-bf89-5ed91ccc39db`.
- LP: `05798bde-05a1-4d3e-a473-b044e58eafe5`.
- Router do domínio principal: `0d44e09b-8823-495e-81ed-d4ae945e5926`.
- [Firestore/Storage publicados e relidos](security/2026-10-10/regras-publicadas-apos-correcoes.json), com hashes idênticos ao código final. O login antigo do Firebase CLI expirou; publicação feita pela Rules API com a service account existente.
- [HTTP público](security/2026-10-10/http-apos-correcoes.json): LP/painel 200, assets na mesma origem 200, APIs protegidas 401 sem login, endpoint legado de comprovantes 410.

A conversão de uma imagem sintética pela dependência Sharp 0.35.5 também passou.

Após autorização específica do usuário, os testes sintéticos de produção foram executados e seus registros removidos. Eles revelaram bucket Firebase inexistente e uma permissão ausente na identidade realmente usada pelo backend. Os resultados negativos de Auth não provam revogação correta, pois o controle positivo também falhou. Ver complemento abaixo; a aprovação pendente agora é exclusivamente a concessão IAM mínima.

O inventário somente de metadados do prefixo `events/` no R2 foi tentado pelo proxy remoto oficial do Wrangler, mas não retornou; processo encerrado sem ler conteúdo nem modificar objetos. SEC-10 continua parcial quanto ao passado, embora o endpoint tenha sido retirado.

O iOS foi compilado localmente porque o Expo não tinha credenciais de distribuição configuradas para o projeto. Archive Release **1.0.0 (2)** e IPA exportados; `codesign --verify --deep --strict` aprovado com acesso normal ao Keychain. [Entitlements conferidos](security/2026-10-10/ios2.json): `get-task-allow=false`, APNs `production`, sem microfone, `NSAllowsArbitraryLoads=false`. A logo colorida foi preservada. IPA em `apps/mobile/build/ios/security-2-distribution/EsdrasApp.ipa`, pronto para upload; não enviado à Apple nesta entrega.

O Android 16 foi inspecionado e revelou `allowBackup=true` e `SYSTEM_ALERT_WINDOW` herdado. O [AAB definitivo **17**](security/2026-10-10/android17.json) foi validado pelo bundletool e pelo jarsigner: `allowBackup=false`, `usesCleartextTraffic=false`, sem `SYSTEM_ALERT_WINDOW` nem microfone, sem modo debug. O certificado de assinatura coincide com o da versão 15. Arquivo entregue em `/Users/alexandregomesdacosta/Downloads/EsdrasApp-v17-seguranca.aab`. A versão 16 foi substituída e não deve ser enviada às lojas.

Um build gerado não é automaticamente publicado nas lojas.

[Auditoria final das dependências](security/2026-10-10/dependencias-apos-correcoes.json): **201 → 42 ocorrências**; críticas **4 → 0**, altas **82 → 6**, moderadas **91 → 31**, baixas **24 → 5**. Contagens do pnpm, não número de falhas exploráveis distintas. As seis altas restantes são três avisos de Sharp 0.34.5 em ferramentas antigas de Cloudflare, um de basic-ftp 5 (migração para 6), e um de cada node-forge/braces sem versão corrigida indicada pelo advisory. Next usa Sharp 0.35.5; as dependências de ferramentas antigas não foram forçadas a uma versão de API incompatível. O uso de certificados, entradas de regex e arquivos não confiáveis nessas ferramentas continua sendo uma restrição operacional. Alertas moderados/baixos estão integralmente listados na evidência, sem alegação de correção total.

SEC-01/02/03/06/07/11 têm correções publicadas e provas locais pertinentes; SEC-04 aguarda a verificação positiva do R2 em produção; SEC-08 está bloqueada pela permissão IAM do backend, negando inclusive sessões válidas; SEC-05 mantém dívida de dependências; SEC-09 aguarda teste físico e distribuição da nova versão; SEC-10 aguarda inventário legado. Não declarar 100% de segurança nem transformar cobertura de testes em porcentagem de proteção.

O progresso funcional permanece **sistema 96,40%, mobile 97%, LP 100% do escopo funcional**. Estes números não são uma nota de segurança. O plano gratuito permanece limitado a **50 membros**.


## Complemento — Firebase Spark + Cloudflare R2 privado

O usuário confirmou que utiliza os dois provedores para aproveitar as respectivas franquias gratuitas. **Nenhum upgrade para Blaze foi feito.** O teste autorizado mostrou que `alvo-church.firebasestorage.app` e o bucket legado retornam 404; publicar regras do Firebase Storage não provisiona um bucket. A interface do Firebase exibe Spark e exige upgrade para Storage. [Evidência de infraestrutura](security/2026-10-10/storage-infraestrutura.json).

Fotos Kids e comprovantes financeiros passam agora pelo binding `ESDRAS_PRIVATE_MEDIA`, bucket R2 `esdras-private-media`, classe Standard. A URL pública r2.dev está desativada e não há domínio personalizado. O adaptador só aceita os prefixos privados previstos, PNG/JPEG e até 500 KB; grava `private, no-store`. As APIs existentes mantêm as verificações de instituição, usuário, função, vínculo, consentimento e módulo. Marca pública já usa outro fluxo R2 e não compartilha este bucket. O Storage emulado permanece exclusivamente para QA local. Não houve migração de objetos reais: o bucket Firebase configurado não existe.

Validação desta continuação: **470 testes unitários**, typecheck web, build Cloudflare, **62 provas Kids** e **136 provas de finanças/retenção/billing simulado** aprovados. O R2 foi publicado no painel/API na versão `c72a207d-913f-43bb-a829-5e28398365a0`. [Smoke HTTP](security/2026-10-10/http-r2-apos-deploy.json) apenas confirma a página e recusas anônimas; ainda não valida o fluxo autenticado em produção.

### Bloqueio de autenticação — confirmação necessária

A identidade em produção é `esdras-billing-webhook@alvo-church.iam.gserviceaccount.com`, com papel Cloud Datastore User. O erro sanitizado retornou `INSUFFICIENT_PERMISSION` em `accounts:lookup`. A credencial local `firebase-adminsdk` tem mais permissões e **não foi copiada para produção**. A afirmação anterior de que a permissão de produção estava confirmada pelo teste de UID inexistente estava incorreta: aquele teste usou a credencial local.

Foi preparado no Google Cloud o papel personalizado `Esdras Auth Session Verifier` (`esdrasAuthSessionVerifier`), contendo somente `firebaseauth.users.get`. O formulário está pronto, mas **o papel ainda não foi criado nem concedido**. A política de controle do navegador exige confirmação no momento de ampliar acesso sensível; o pedido específico foi enviado e permanece pendente. Essa permissão é de leitura de conta identificada, sem alterar contas e sem listar usuários. Sem ela, as APIs que usam o verificador comum continuam recusando inclusive tokens legítimos; não há bypass da revogação.

Depois da confirmação: criar e conceder esse papel à identidade acima, preservando Cloud Datastore User; executar `ESDRAS_AUTHORIZE_TEMP_PRODUCTION_TEST=yes node scripts/verify-security-production.mjs`. O script testa Auth e mídia privada R2 com uma única instituição/conta sintética, documentos sintéticos de sessão/check-in e PNG de 1 pixel; não consulta clientes reais. Inclui controle positivo, responsável autorizado, bloqueio institucional, conta inativa, revogação, exclusão física do objeto e limpeza dos documentos/conta. O novo roteiro de 22 verificações está preparado, **ainda não executado**.

[Primeiro teste de produção](security/2026-10-10/producao-autorizada-inicial.json) e [diagnóstico de Auth](security/2026-10-10/producao-autorizada.json) preservam as falhas encontradas e a confirmação de limpeza. Nenhum dado pessoal real ou curso foi alterado. Não é necessário gerar outro AAB/IPA para esta troca de backend; a distribuição dos pacotes de segurança permanece pendente.

Franquias do R2 são compartilhadas pela conta; esta alteração não é garantia de custo zero se o consumo agregado ultrapassar a franquia. Não foi ativado novo plano nem verificado o consumo agregado dos demais projetos. Referência: [preços oficiais do R2](https://developers.cloudflare.com/r2/pricing/).
