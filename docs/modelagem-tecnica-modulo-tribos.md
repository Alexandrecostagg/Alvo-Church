# Modelagem técnica do módulo de tribos

Data: 17 de março de 2026

## 1. Objetivo

Definir a estrutura técnica do módulo `tribos` para o sistema de gestão de igrejas.

Este módulo precisa suportar:

- catálogo de tribos ministeriais
- questionário de classificação
- pontuação e recomendação
- tribo principal e secundária
- validação pastoral
- revisão e reclassificação
- histórico completo
- auditoria e explicabilidade

## 2. Papel do módulo no sistema

O módulo `tribos` não substitui:

- ministérios
- células
- papéis de liderança

Ele funciona como:

- camada de identidade ministerial
- camada de recomendação
- camada de direcionamento de jornada

## 3. Entidades principais

Minha recomendação é criar 9 estruturas centrais.

### 1. tribes

Catálogo das tribos disponíveis no sistema.

### 2. tribe_traits

Traços, arquétipos ou afinidades complementares.

### 3. tribe_assessments

Registro de cada avaliação ou reavaliação feita pelo membro.

### 4. tribe_assessment_answers

Respostas dadas em cada avaliação.

### 5. tribe_assessment_scores

Pontuação por tribo em cada avaliação.

### 6. member_tribe_profiles

Estado atual da classificação da pessoa.

### 7. member_tribe_history

Histórico de mudanças da classificação.

### 8. tribe_review_requests

Pedidos de revisão e reclassificação.

### 9. tribe_ministry_mappings

Mapeamento entre tribos e ministérios recomendados.

## 4. Modelagem das tabelas

## 4.1 tribes

Catálogo principal das tribos.

Campos sugeridos:

- `id`
- `organization_id`
- `code`
- `name`
- `slug`
- `description`
- `biblical_reference`
- `symbolic_summary`
- `ministry_summary`
- `display_order`
- `is_active`
- `created_at`
- `updated_at`

Exemplos de `code`:

- LEVI
- JUDAH
- ISSACHAR
- JOSEPH
- ASHER
- NAPHTALI
- ZEBULUN
- GAD
- MANASSEH
- EPHRAIM
- BENJAMIN
- REUBEN

Observação:

- essas tribos podem ser globais do sistema ou customizáveis por organização

## 4.2 tribe_traits

Traços secundários e arquétipos complementares.

Campos sugeridos:

- `id`
- `organization_id`
- `code`
- `name`
- `description`
- `is_active`
- `created_at`
- `updated_at`

Exemplos:

- discernment
- restoration
- execution
- hospitality
- creativity

Uso:

- ajuda a representar `Dã`, `Simeão` ou outros traços sem transformar tudo em tribo principal

## 4.3 tribe_assessments

Registro de cada tentativa de avaliação.

Campos sugeridos:

- `id`
- `organization_id`
- `person_id`
- `assessment_type`
- `assessment_version`
- `status`
- `started_at`
- `submitted_at`
- `completed_at`
- `requested_by_user_id`
- `trigger_type`
- `trigger_reference_type`
- `trigger_reference_id`
- `confidence_level`
- `primary_tribe_id`
- `secondary_tribe_id`
- `leader_validation_status`
- `leader_validated_by_user_id`
- `leader_validated_at`
- `leader_validation_notes`
- `created_at`
- `updated_at`

Valores iniciais de `assessment_type`:

- initial
- revalidation
- partial_review
- full_reclassification
- tie_breaker

Valores iniciais de `status`:

- draft
- submitted
- scored
- pending_validation
- validated
- rejected
- superseded

Valores de `trigger_type`:

- onboarding
- scheduled_review
- phase_change
- behavior_divergence
- manual_request
- pastoral_override

## 4.4 tribe_assessment_answers

Respostas individuais por pergunta.

Campos sugeridos:

- `id`
- `organization_id`
- `tribe_assessment_id`
- `question_code`
- `question_text_snapshot`
- `answer_code`
- `answer_text_snapshot`
- `answer_weight_json`
- `created_at`

Observação:

- guardar o texto da pergunta e da resposta no momento da avaliação ajuda auditoria mesmo se o questionário mudar

## 4.5 tribe_assessment_scores

Pontuação final por tribo em uma avaliação.

Campos sugeridos:

- `id`
- `organization_id`
- `tribe_assessment_id`
- `tribe_id`
- `score_raw`
- `score_normalized`
- `rank_position`
- `is_primary`
- `is_secondary`
- `created_at`

Uso:

- guarda o ranking inteiro, não só o vencedor

## 4.6 member_tribe_profiles

Estado atual do membro em relação às tribos.

Campos sugeridos:

- `id`
- `organization_id`
- `person_id`
- `current_primary_tribe_id`
- `current_secondary_tribe_id`
- `current_assessment_id`
- `classification_status`
- `confidence_level`
- `fit_score`
- `validation_status`
- `last_assessed_at`
- `next_review_due_at`
- `last_review_type`
- `behavior_alignment_score`
- `leader_alignment_score`
- `member_self_alignment_score`
- `is_review_recommended`
- `review_recommendation_reason`
- `created_at`
- `updated_at`

Valores de `classification_status`:

- unclassified
- provisionally_classified
- classified
- under_review
- reclassification_pending

## 4.7 member_tribe_history

Histórico de mudanças de classificação.

Campos sugeridos:

- `id`
- `organization_id`
- `person_id`
- `old_primary_tribe_id`
- `new_primary_tribe_id`
- `old_secondary_tribe_id`
- `new_secondary_tribe_id`
- `old_assessment_id`
- `new_assessment_id`
- `review_request_id`
- `change_type`
- `change_reason`
- `change_source`
- `approved_by_user_id`
- `approved_at`
- `effective_from`
- `created_at`

Valores de `change_type`:

- initial_assignment
- manual_adjustment
- scheduled_revalidation
- partial_reclassification
- full_reclassification
- pastoral_override

Valores de `change_source`:

- system
- member
- leader
- pastor
- admin

## 4.8 tribe_review_requests

Solicitações de revisão.

Campos sugeridos:

- `id`
- `organization_id`
- `person_id`
- `requested_by_type`
- `requested_by_user_id`
- `request_reason_type`
- `request_reason_text`
- `request_status`
- `recommended_review_type`
- `approved_review_type`
- `assigned_to_user_id`
- `opened_at`
- `review_due_at`
- `closed_at`
- `resolution_notes`
- `created_at`
- `updated_at`

Valores de `requested_by_type`:

- member
- leader
- pastor
- admin
- system

Valores de `request_reason_type`:

- self_perception_change
- phase_change
- ministry_change
- behavior_divergence
- initial_error
- pastoral_discernment
- annual_review

Valores de `request_status`:

- open
- approved
- denied
- in_progress
- completed
- cancelled

## 4.9 tribe_ministry_mappings

Mapeia tribos para ministérios recomendados.

Campos sugeridos:

- `id`
- `organization_id`
- `tribe_id`
- `ministry_id`
- `recommendation_strength`
- `notes`
- `created_at`

Valores de `recommendation_strength`:

- primary
- secondary
- exploratory

## 4.10 tribe_group_mappings

Opcional no MVP, mas útil desde cedo.

Campos sugeridos:

- `id`
- `organization_id`
- `tribe_id`
- `group_id`
- `mapping_type`
- `created_at`

Uso:

- sugerir células, trilhas ou grupos compatíveis com a tribo

## 4.11 tribe_behavior_signals

Tabela para sinais comportamentais observados depois do questionário.

Campos sugeridos:

- `id`
- `organization_id`
- `person_id`
- `signal_type`
- `signal_source`
- `signal_value`
- `suggested_tribe_id`
- `confidence_weight`
- `observed_at`
- `metadata_json`

Exemplos de `signal_type`:

- ministry_participation
- leadership_assignment
- event_role_pattern
- communication_preference
- pastoral_feedback

## 5. Relacionamentos principais

- `people 1:N tribe_assessments`
- `tribe_assessments 1:N tribe_assessment_answers`
- `tribe_assessments 1:N tribe_assessment_scores`
- `people 1:1 member_tribe_profiles`
- `people 1:N member_tribe_history`
- `people 1:N tribe_review_requests`
- `tribes 1:N tribe_assessment_scores`
- `tribes 1:N member_tribe_profiles` por tribo principal e secundária
- `tribes N:N ministries` via `tribe_ministry_mappings`

## 6. Regras de negócio técnicas

## Regra 1. Uma classificação atual por pessoa

Cada pessoa deve ter apenas um registro ativo em `member_tribe_profiles`.

## Regra 2. Toda classificação válida nasce de uma avaliação

Toda atribuição nova de tribo deve apontar para:

- `current_assessment_id`

Exceção:

- ajustes pastorais emergenciais podem ocorrer, mas devem gerar histórico e motivo

## Regra 3. Histórico imutável

`member_tribe_history` não deve ser editado depois de gravado, salvo por procedimento administrativo auditado.

## Regra 4. Reclassificação não apaga histórico

Uma nova tribo:

- substitui a classificação atual
- mas preserva a classificação anterior no histórico

## Regra 5. Revisão tem workflow

Toda revisão deve seguir ao menos estes estados:

- aberta
- aprovada
- em andamento
- concluída

## Regra 6. Revisão programada

Ao validar uma classificação, o sistema deve preencher:

- `last_assessed_at`
- `next_review_due_at`

## Regra 7. Divergência comportamental

Se o `fit_score` cair abaixo de um limite definido, o sistema deve:

- marcar `is_review_recommended = true`
- abrir sugestão de revisão

## 7. Dados para explicabilidade

Esse módulo precisa explicar por que classificou alguém.

Por isso, o sistema deve guardar:

- respostas escolhidas
- pesos atribuídos
- score por tribo
- critérios de desempate
- validação pastoral
- sinais comportamentais posteriores

## 8. Fluxos técnicos principais

## Fluxo 1. Classificação inicial

1. criar `tribe_assessment` com tipo `initial`
2. salvar respostas em `tribe_assessment_answers`
3. calcular scores e salvar em `tribe_assessment_scores`
4. definir tribo principal e secundária
5. enviar para validação pastoral quando exigido
6. atualizar `member_tribe_profiles`
7. gravar `member_tribe_history`

## Fluxo 2. Revalidação simples

1. abrir `tribe_review_request`
2. criar `tribe_assessment` tipo `revalidation`
3. aplicar mini questionário
4. recalcular score parcial
5. manter ou ajustar classificação
6. registrar decisão

## Fluxo 3. Revisão parcial

1. abrir `tribe_review_request`
2. criar `tribe_assessment` tipo `partial_review`
3. apresentar perguntas dirigidas
4. combinar score novo com histórico anterior
5. exigir aprovação se houver mudança de tribo principal

## Fluxo 4. Reclassificação completa

1. abrir `tribe_review_request`
2. criar `tribe_assessment` tipo `full_reclassification`
3. aplicar questionário completo
4. recalcular ranking total
5. comparar com classificação vigente
6. aprovar mudança
7. atualizar perfil atual
8. gravar histórico

## 9. Regras de permissão

### O membro pode

- responder questionário
- pedir revisão
- ver resultado atual
- ver recomendação principal

### O líder pode

- sugerir revisão
- ver resultado do liderado quando houver permissão
- validar ou recomendar ajuste em nível permitido

### O pastor ou administrador pastoral pode

- aprovar reclassificação sensível
- fazer override com justificativa
- acessar histórico completo

## 10. Regras para cálculo de revisão futura

Sugestão de campos derivados:

- `days_since_last_assessment`
- `active_ministry_days`
- `behavior_alignment_score`
- `review_urgency_score`

Fórmula conceitual de urgência:

- baixa urgência: score alto e contexto estável
- média urgência: pequenas divergências
- alta urgência: divergência forte ou mudança de fase

## 11. Índices recomendados

- `tribe_assessments (organization_id, person_id, assessment_type, status)`
- `tribe_assessment_scores (organization_id, tribe_assessment_id, rank_position)`
- `member_tribe_profiles (organization_id, person_id)`
- `member_tribe_profiles (organization_id, current_primary_tribe_id)`
- `member_tribe_profiles (organization_id, next_review_due_at)`
- `member_tribe_history (organization_id, person_id, effective_from)`
- `tribe_review_requests (organization_id, person_id, request_status)`
- `tribe_behavior_signals (organization_id, person_id, observed_at)`

## 12. Integrações com outros módulos

## Integração com pessoas

- a pessoa terá tribo principal e secundária no perfil

## Integração com ministérios

- o sistema recomendará ministérios conforme tribo

## Integração com células

- poderá sugerir células, trilhas e grupos com base na tribo

## Integração com voluntariado

- tribo ajudará em alocação inicial e desenvolvimento

## Integração com analytics

- dashboards por tribo
- distribuição da igreja por tribo
- taxa de aderência entre tribo e serviço real

## 13. Decisões recomendadas para o MVP

No MVP, eu implementaria:

- `tribes`
- `tribe_assessments`
- `tribe_assessment_answers`
- `tribe_assessment_scores`
- `member_tribe_profiles`
- `member_tribe_history`
- `tribe_review_requests`
- `tribe_ministry_mappings`

E deixaria para a fase seguinte:

- `tribe_traits`
- `tribe_group_mappings`
- `tribe_behavior_signals`

## 14. Minha recomendação prática

Se quisermos manter o projeto sólido e escalável, esta é a melhor tese técnica:

`tribo atual + histórico completo + revisão estruturada + validação pastoral + explicabilidade do score`

Isso transforma a funcionalidade em um módulo sério, auditável e pastoralmente confiável.

## 15. Próximo passo ideal

Depois desta modelagem, os melhores próximos passos são:

1. algoritmo técnico de pontuação do questionário
2. versão 2 do questionário com perguntas situacionais e desempate
3. ajuste da modelagem geral do banco para incluir o módulo `tribos`
