# Contexto para retomada — 21/08/2026

## Estado publicado

- Worker web publicado no Cloudflare: `alvo-church-web`.
- Última versão publicada: `13d382ee-9efc-496f-a4db-715dd1e7cbb5`.
- URL da plataforma: `https://alvo-church-web.alexandrecostagg.workers.dev`.

## Rotas públicas e painel

- `/` redireciona para `/landing`, evitando o erro 500 do runtime OpenNext na rota raiz.
- `/app` é a entrada autenticada do painel.
- Login e cadastro redirecionam usuários autenticados para `/app`.
- Navegação do dashboard e links de retorno internos foram ajustados para `/app`, sem voltar à LP pública.

## Interface de recepção

- Textos técnicos voltados ao usuário foram removidos da recepção: não exibir Firebase, Firestore, nuvem, banco de dados ou simulador.
- A linguagem agora é operacional: registros, atualizações, entradas recentes e jornada de acolhimento.
- A publicação desta limpeza foi concluída, mas vale conferir visualmente a tela `/reception` após reiniciar.

## Marca e módulos

- O nome exibido como “Getro Church” e os módulos faltantes não indicam deploy antigo.
- Eles vêm da organização ativa e das configurações de marca/módulos cadastradas para esse perfil.
- Antes de trocar marca ou liberar menus, confirmar qual organização deve ser usada e quais módulos devem ficar ativos.

## Próxima prioridade: cadastro de novos membros

Solicitações pendentes:

1. Corrigir busca de CEP para preencher endereço automaticamente.
2. Melhorar a escolha de data de nascimento (avaliar campo de data mais amigável).
3. Quando não houver CEP definido, listar todos os estados no seletor.
4. Remover mensagens técnicas que aparecem ao salvar membro.
5. Conferir a base e o fluxo de validação de CPF antes de validar ou bloquear cadastros.

## Arquivos provavelmente envolvidos

- `apps/web/src/features/members/`
- `apps/web/app/(authenticated)/members/`
- `packages/firebase/src/repositories.ts`
- `apps/web/app/providers.tsx`

## Validações realizadas

- Build de produção do web concluído antes dos deploys.
- Login com sessão ativa foi testado no navegador: `/login` levou corretamente para `/app` e o painel carregou.
- `/`, `/landing` e `/login` responderam corretamente após a separação de rotas.
