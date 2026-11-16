# Vídeos privados da Escola EAD

Implementação inicial: upload MP4 pelo gerenciador de cursos, preservando os links externos. Não usa Cloudflare Stream nem habilita uma assinatura nova.

- Produção: binding R2 privado existente `ESDRAS_PRIVATE_MEDIA`, exclusivamente no prefixo `course-videos/{organizationId}/{videoId}`. As APIs Kids/Finance não aceitam esse prefixo.
- QA: somente o projeto `demo-alvo-qa` com Auth e Firestore locais usa `/tmp/esdras-qa-course-videos`; nunca há fallback para armazenamento público ou produção.
- Limites iniciais: 200 MB por arquivo; 1 GB por instituição; 5 GB para o conjunto dos vídeos da plataforma. Unidades decimais. O teto global deixa margem para outros objetos da conta, mas não é garantia de custo zero: a franquia R2 é compartilhada e operações/Workers/Firestore têm suas próprias tarifas.
- Reserva atômica no Firestore antes do envio, incluindo envios pendentes. Partes de 8 MiB com identidade estável e hash imutável; repetição não duplica a cota. Conclusão idempotente verifica tamanho no R2. Exclusão libera cota somente após remover/abortar no armazenamento.
- MP4 recomendado: H.264/AAC, 720p, com fast start. O navegador valida metadados antes do upload e o servidor verifica assinatura MP4. Não há transcodificação, DRM nem garantia de compatibilidade de todo codec contido em MP4. Não anunciar como streaming adaptativo.
- Curso em rascunho: gestores podem gerenciar e conferir os vídeos. Alunos só recebem acesso quando o curso está publicado e a aula referencia o vídeo.
- Reprodução: cookie HttpOnly restrito à rota do vídeo, validade de quatro horas, verificação da instituição/conta/módulo/curso a cada requisição e suporte a Range/206. O identificador do arquivo não é uma URL pública.
- App: solicita credencial de uso único (60 segundos) e abre o player web do Esdras. O segredo fica no fragmento da URL, é retirado do histórico e trocado por cookie; o aluno volta ao app para marcar conclusão. Não há novo player nativo/dependência. A mudança no app requer nova distribuição móvel.
- Se a página fechar durante o envio, o arquivo pendente aparece na lista do curso para remoção. O cancelamento é explícito; não há promessas de retomada entre sessões. R2 aborta uploads multipart incompletos após sete dias; a reserva da aplicação permanece até limpeza para não subestimar espaço.
- Uma falha depois de completar no R2 pode deixar o estado `finishing`: o botão Finalizar repete a conclusão e recupera via head, sem reenviar o arquivo.
- Remover uma aula não apaga silenciosamente seu arquivo. Em “Gerenciar arquivos e liberar espaço”, remover o arquivo sem aula associada libera a cota. Arquivos em uso não podem ser apagados.

Coleções privadas (negadas por padrão nas regras Firestore): `courseVideos` e subcoleção `access`, `courseVideoUsage`, `platformMediaUsage`. Clientes não escrevem contadores, estado de upload ou credenciais.

## Validação local

Gerar um MP4 sintético, sem conteúdo de terceiros:

```sh
ffmpeg -f lavfi -i color=c=0x17483c:s=640x360:r=24 -f lavfi -i sine=frequency=440:sample_rate=44100 -t 3 -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart -y /tmp/esdras-qa-aula.mp4
```

Com QA Auth/Firestore locais (rotas executadas diretamente, sem depender de compilação do servidor):

```sh
node scripts/with-qa-env.mjs corepack pnpm exec tsx scripts/verify-qa-course-videos.ts
corepack pnpm exec vitest run apps/web/src/lib/course-video.test.ts apps/web/app/api/_lib/course-videos.test.ts apps/web/app/api/_lib/course-management.test.ts
corepack pnpm --filter @alvo/web typecheck
corepack pnpm --filter @alvo/mobile typecheck
WRANGLER_SEND_METRICS=false node scripts/verify-qa-course-videos-r2.mjs
```

Para o mesmo fluxo via HTTP, suba a web QA na porta 3001 e execute com `QA_HTTP=true`. O teste R2 cria uma configuração fictícia em `/tmp`, usa o runtime local e remove sua área temporária ao concluir.

O teste integrado usa exclusivamente instituições, contas e arquivo fictícios. Inclui identidade, rascunho/publicação, isolamento, multipart, repetição, integridade, cota concorrente, limites globais, reprodução parcial, abertura pelo app, revogação e remoção.
