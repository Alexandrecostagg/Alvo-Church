# Módulos da Camada 2 — Ministério e cuidado - Alvo Church

Data: 19 de junho de 2026

## 1. Objetivo

Definir os módulos ministeriais da Camada 2 do Alvo Church: funcionalidades ativadas no Plano Crescimento, que a organização habilita quando está pronta para expandir além da operação básica.

Cada módulo desta camada entra como sub-item ou aba dentro de um módulo já existente — nunca como tela nova isolada — até ter maturidade e frequência de uso que justifique entrada própria no menu.

---

## 2. Módulo: Jovens e Adolescentes (`modules.youth`)

### Problema que resolve

O sistema atual trata crianças (Kids Security) mas não tem diferenciação para adolescentes (12–17) e jovens (18–29). Essas faixas têm liderança, jornada e dinâmica distintas.

### Como entra no sistema

Sem módulo novo no menu. Entra como filtro e seção dentro de Células/Grupos:

- `/groups?ageRange=youth` — lista grupos de jovens/adolescentes
- `/groups?ageRange=teens` — lista grupos de adolescentes
- Perfil da pessoa ganha campo `ageRange` calculado por data de nascimento

### Capacidades

- marcação automática de faixa etária por data de nascimento
- filtro de grupos por faixa
- jornada específica para adolescentes (diferente da jornada padrão)
- jornada específica para jovens
- líderes de juventude com permissão restrita ao grupo
- presença e follow-up separados por faixa
- relatório de distribuição etária

### Integração com Kids Security

Quando uma criança do Kids Security completa 12 anos:

- sistema gera alerta pastoral no Dashboard
- sugere transição para grupo de adolescentes
- cria tarefa de follow-up para líder de juventude

### Feature gate

- `modules.youth: { enabled: true }`
- sem item próprio no menu até o módulo atingir maturidade suficiente

---

## 3. Módulo: Cuidado Pastoral e Aconselhamento (`modules.pastoralCare`)

### Problema que resolve

O sistema tem IA Pastoral com sinais e sugestões. Mas não tem o registro estruturado do cuidado humano: visitas pastorais, atendimentos, anotações confidenciais e encaminhamentos.

### Como entra no sistema

Entra como aba dentro do Perfil da Pessoa (`/members/[personId]`):

- aba "Cuidado" visível apenas para pastores e administradores pastorais
- nunca visível para líderes de célula ou secretaria
- dados isolados por permissão: `pastoral.read_sensitive`

### Capacidades

- registro de visita pastoral (data, tipo, duração, responsável)
- anotações confidenciais criptografadas (não indexadas em buscas)
- status de cuidado: `ativo | em_acompanhamento | concluido | encaminhado`
- encaminhamento para pastor sênior ou profissional externo
- histórico de atendimentos com linha do tempo
- alertas de cuidado ativos visíveis no Dashboard (sem expor o conteúdo)
- relatório pastoral: quantas pessoas em acompanhamento por categoria

### Regras de privacidade

- anotações confidenciais nunca aparecem na IA Pastoral sem aprovação explícita
- histórico de cuidado não exportável em relatórios gerais
- acesso restrito: apenas usuários com papel `pastor` ou `pastoral_care_admin`
- trilha de auditoria de quem acessou o registro

### Feature gate

- `modules.pastoralCare: { enabled: true }`
- sem item no menu; acesso via aba no perfil da pessoa

---

## 4. Módulo: Automações e Workflows (`modules.workflows`)

### Problema que resolve

Hoje o acompanhamento de visitantes e membros depende de ação humana manual. Plataformas como Pushpay e MinistryPlatform têm "process queues" — regras que disparam ações automaticamente com base em eventos do sistema.

### Como entra no sistema

Item próprio no menu lateral quando ativo: "Automações" (`/workflows`).

Justifica entrada própria porque: frequência de configuração pela secretaria ou admin é alta e não se encaixa naturalmente em outro módulo.

### Capacidades

Motor de regras visuais sem código (estilo if → then):

```
SE [condição] ENTÃO [ação]
```

**Condições disponíveis:**

- visitante cadastrado há mais de X dias sem follow-up
- membro sem presença em culto/célula há X dias
- novo membro cadastrado
- inscrição em evento confirmada
- pessoa completou etapa de jornada
- doação recorrente falhou
- membro aniversariante hoje

**Ações disponíveis:**

- criar tarefa de follow-up para líder
- enviar mensagem (push, email, SMS — via módulo de comunicação)
- mover pessoa para próxima etapa de jornada
- notificar pastor
- adicionar tag à pessoa

### Interface

- `/workflows` — lista de automações ativas e pausadas
- `/workflows/new` — criador visual de regra (if-then builder)
- `/workflows/[id]/history` — histórico de execuções

### Regras de segurança

- automações que envolvem dados de cuidado pastoral requerem aprovação humana antes de agir
- limite de execuções por dia por organização (controlado pelo feature gate)
- log de cada execução com resultado

### Feature gate

- `modules.workflows: { enabled: true, limits: { dailyRuns: 500 } }`

---

## 5. Módulo: EAD Completo (`modules.ead`)

### Problema que resolve

A Escola EAD já existe em `/learning/academy` mas sem estrutura pedagógica real: sem progresso por aula, sem quiz, sem certificado, sem upload de vídeo próprio.

### Expansão do módulo existente

Mantém a rota `/learning/academy`. Adiciona:

- estrutura de cursos com módulos e aulas
- progresso por aula (assistido / não assistido)
- quiz por aula com aprovação mínima
- certificado em PDF gerado automaticamente ao concluir
- upload de vídeo próprio via Firebase Storage ou integração com Vimeo/YouTube
- planos de leitura bíblica com progresso diário
- devocionais agendados (enviados por push ou email no horário configurado)
- trilhas por tribo (conectado ao módulo de tribos)

### Interface adicional

- `/learning/academy/[courseId]` — curso com lista de aulas e progresso
- `/learning/academy/[courseId]/[lessonId]` — aula individual com vídeo e quiz
- `/learning/certificates` — certificados emitidos por pessoa

### Feature gate

- `modules.ead: { enabled: true, limits: { storageGb: 10 } }`

---

## 6. Módulo: Analytics Pastorais (`modules.analytics`)

### Problema que resolve

O Dashboard já mostra indicadores operacionais em tempo real. O módulo de Analytics adiciona visão histórica, tendências e relatórios exportáveis para tomada de decisão da liderança.

### Como entra no sistema

Item próprio no menu: "Analytics" (`/analytics`). Justifica entrada própria pela natureza de ferramenta de decisão usada semanalmente pelo pastor sênior ou administrador.

### Capacidades

**Visão de pessoas:**
- crescimento de membros por período
- taxa de retenção de visitantes (visitou → voltou → virou membro)
- distribuição por faixa etária, gênero e status
- membros em risco de desengajamento

**Visão de células:**
- crescimento médio por grupo
- grupos acima e abaixo da média
- taxa de multiplicação
- líderes com mais e menos follow-up registrado

**Visão financeira:**
- evolução de dízimos e ofertas por período
- doadores recorrentes vs avulsos
- campanhas com maior engajamento
- comparativo por período

**Exportação:**
- todos os relatórios exportáveis em PDF e CSV
- relatório de saúde ministerial para o conselho pastoral

### Feature gate

- `modules.analytics: { enabled: true }`

---

## 7. Módulo: Missões Externas (`modules.missions`)

### Problema que resolve

O sistema tem "missões" como mecânica de gamificação da jornada do membro. O módulo de Missões Externas é diferente: registra missionários apoiados pela igreja, projetos de campo e repasses financeiros por projeto.

### Como entra no sistema

Entra como sub-item dentro do módulo de Finanças inicialmente:

- Finanças > Missões — lista de projetos e missionários

Se o módulo crescer em uso, pode ganhar entrada própria no menu.

### Capacidades

- cadastro de missionário apoiado (pessoa vinculada ao sistema ou externa)
- projeto missionário com: país/região, denominação parceira, objetivo, prazo
- repasse financeiro mensal ou pontual vinculado a um fundo
- relatório de campo enviado pelo missionário (texto, fotos, documentos)
- visualização no app do membro: "nossa rede de missões"
- integração com campanhas de oferta dedicadas a projetos missionários

### Feature gate

- `modules.missions: { enabled: true }`

---

## 8. Regra de entrada no menu — resumo desta camada

| Módulo | Entra como |
|---|---|
| Jovens e Adolescentes | Filtro dentro de Células, sem item próprio |
| Cuidado Pastoral | Aba no Perfil da Pessoa, sem item próprio |
| Automações | Item próprio: "Automações" |
| EAD Completo | Expansão da rota existente `/learning/academy` |
| Analytics | Item próprio: "Analytics" |
| Missões Externas | Sub-item dentro de Finanças inicialmente |

Itens próprios no menu somente quando:
- frequência de uso diária ou semanal
- fluxo não se encaixa como sub-item de outro módulo
- já tem maturidade funcional para o usuário não se perder
