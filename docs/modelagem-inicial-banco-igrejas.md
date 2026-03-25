# Modelagem inicial do banco de dados - sistema de gestão de igrejas

Data: 17 de março de 2026

## 1. Objetivo

Definir uma modelagem inicial de banco de dados para sustentar o MVP e a evolução do sistema completo de gestão de igrejas descrito no PRD.

Esta proposta foi desenhada para:

- arquitetura SaaS multi-tenant
- expansão modular
- timeline unificada da pessoa
- suporte a famílias, células, crianças, jovens, eventos e follow-up
- base pronta para automações, comunicação e financeiro futuro

## 2. Premissas arquiteturais

- banco relacional como núcleo transacional
- recomendação inicial: `PostgreSQL`
- multi-tenancy por `organization_id`
- suporte opcional a múltiplos campi por organização
- auditoria e soft delete desde o início
- dados sensíveis com controle de acesso em camada de aplicação

## 3. Convenções recomendadas

- tabelas no plural
- chave primária `id` em `UUID`
- colunas de tenant em todas as tabelas de negócio: `organization_id`
- timestamps padrão: `created_at`, `updated_at`
- soft delete quando fizer sentido: `deleted_at`
- usuário responsável por ação crítica: `created_by_user_id`, `updated_by_user_id`
- enums críticos podem começar como `VARCHAR` controlado pela aplicação e migrar para enum nativo depois

## 4. Visão dos domínios

### Domínio 1. Estrutura organizacional

- organizations
- campuses
- ministries

### Domínio 2. Identidade e acesso

- users
- roles
- permissions
- user_roles

### Domínio 3. Pessoas e famílias

- people
- families
- family_members
- people_contacts
- people_addresses
- tags
- person_tags

### Domínio 4. Jornada e timeline

- person_timelines
- visitor_journeys
- journey_stages
- tasks
- notes

### Domínio 5. Células e grupos

- groups
- group_members
- group_meetings
- group_attendances
- group_leadership_tracks

### Domínio 6. Crianças e segurança

- child_profiles
- guardianships
- checkin_sessions
- checkin_entries
- rooms
- incidents

### Domínio 7. Juventude

- youth_profiles
- discipleship_tracks

### Domínio 8. Eventos

- events
- event_tickets
- event_registrations
- event_registration_people
- event_checkins

### Domínio 9. Voluntariado

- volunteer_profiles
- serving_teams
- serving_schedules
- serving_assignments

### Domínio 10. Comunicação

- communication_campaigns
- communication_audiences
- communication_deliveries

### Domínio 11. Financeiro futuro

- funds
- donations
- payment_transactions

## 5. Entidades centrais do MVP

## 5.1 organizations

Representa a igreja cliente ou organização principal no modelo SaaS.

Campos principais:

- `id`
- `name`
- `legal_name`
- `slug`
- `timezone`
- `locale`
- `country_code`
- `status`
- `created_at`
- `updated_at`

Regras:

- `slug` único
- uma organização pode ter vários campi

## 5.2 campuses

Representa campus, unidade ou congregação vinculada à organização.

Campos principais:

- `id`
- `organization_id`
- `name`
- `code`
- `email`
- `phone`
- `status`
- `address_line_1`
- `address_line_2`
- `city`
- `state`
- `postal_code`
- `country_code`
- `created_at`
- `updated_at`

## 5.3 ministries

Representa ministérios ou áreas, como infantil, jovens, louvor, células.

Campos principais:

- `id`
- `organization_id`
- `campus_id`
- `name`
- `slug`
- `category`
- `status`
- `created_at`
- `updated_at`

## 5.4 users

Representa a conta autenticável.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `email`
- `password_hash`
- `last_login_at`
- `is_active`
- `created_at`
- `updated_at`

Regras:

- um usuário pode estar vinculado a uma pessoa
- email único por organização no MVP

## 5.5 roles

Papéis do sistema.

Campos principais:

- `id`
- `organization_id`
- `name`
- `slug`
- `description`
- `is_system_role`

Papéis iniciais sugeridos:

- super_admin
- church_admin
- pastor
- secretary
- group_leader
- kids_leader
- youth_leader
- volunteer_leader
- member

## 5.6 permissions

Tabela de permissões atômicas.

Campos principais:

- `id`
- `key`
- `description`

Exemplos:

- `people.read`
- `people.write`
- `groups.manage`
- `checkin.execute`
- `pastoral.read_sensitive`

## 5.7 user_roles

Relação entre usuário, papel e escopo.

Campos principais:

- `id`
- `organization_id`
- `user_id`
- `role_id`
- `campus_id`
- `ministry_id`
- `group_id`
- `scope_type`
- `scope_id`
- `created_at`

Observação:

Essa tabela permite papéis globais ou escopados.

## 5.8 people

Entidade central do sistema.

Campos principais:

- `id`
- `organization_id`
- `campus_id`
- `first_name`
- `last_name`
- `preferred_name`
- `full_name`
- `birth_date`
- `gender`
- `marital_status`
- `email`
- `phone_mobile`
- `phone_whatsapp`
- `profile_photo_url`
- `member_status`
- `faith_stage`
- `baptism_status`
- `joined_at`
- `is_deceased`
- `person_type`
- `primary_family_id`
- `created_at`
- `updated_at`
- `deleted_at`

Campos estratégicos:

- `member_status`: visitante, congregado, membro, líder, voluntário
- `faith_stage`: novo convertido, em integração, discipulado, liderança
- `person_type`: adulto, criança, adolescente, jovem

## 5.9 families

Representa unidade familiar.

Campos principais:

- `id`
- `organization_id`
- `campus_id`
- `family_name`
- `display_name`
- `status`
- `address_line_1`
- `address_line_2`
- `city`
- `state`
- `postal_code`
- `country_code`
- `created_at`
- `updated_at`

## 5.10 family_members

Relaciona pessoas à família.

Campos principais:

- `id`
- `organization_id`
- `family_id`
- `person_id`
- `relationship_type`
- `is_primary_contact`
- `is_financial_responsible`
- `is_legal_guardian`
- `start_date`
- `end_date`
- `created_at`

Exemplos de `relationship_type`:

- self
- spouse
- child
- parent
- sibling
- other

## 5.11 people_contacts

Contato adicional da pessoa.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `type`
- `label`
- `value`
- `is_primary`

Exemplos:

- email secundário
- telefone comercial
- telefone de emergência

## 5.12 people_addresses

Endereço individual quando diferente do endereço familiar.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `label`
- `address_line_1`
- `address_line_2`
- `city`
- `state`
- `postal_code`
- `country_code`
- `is_primary`

## 5.13 tags

Classificação flexível.

Campos principais:

- `id`
- `organization_id`
- `name`
- `slug`
- `color`
- `category`

## 5.14 person_tags

Relaciona pessoas a tags.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `tag_id`
- `created_at`

## 5.15 person_timelines

Timeline unificada por pessoa.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `event_type`
- `event_title`
- `event_description`
- `occurred_at`
- `source_type`
- `source_id`
- `visibility`
- `metadata_json`
- `created_at`

Eventos possíveis:

- visitor_registered
- joined_group
- attended_group
- child_checked_in
- event_registered
- became_member
- started_volunteering
- pastoral_note_added

## 5.16 visitor_journeys

Controla acolhimento e assimilação.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `origin_channel`
- `first_visit_date`
- `current_stage`
- `assigned_to_user_id`
- `assigned_to_person_id`
- `status`
- `notes`
- `next_action_at`
- `closed_at`
- `created_at`
- `updated_at`

Exemplos de `current_stage`:

- new_visitor
- welcomed
- invited_to_group
- attending_class
- ready_for_membership
- completed

## 5.17 journey_stages

Histórico das mudanças de estágio da jornada.

Campos principais:

- `id`
- `organization_id`
- `visitor_journey_id`
- `stage`
- `changed_at`
- `changed_by_user_id`
- `notes`

## 5.18 tasks

Tarefas operacionais e pastorais.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `family_id`
- `journey_id`
- `group_id`
- `assigned_to_user_id`
- `title`
- `description`
- `task_type`
- `status`
- `priority`
- `due_at`
- `completed_at`
- `created_at`
- `updated_at`

Tipos iniciais:

- follow_up
- pastoral_contact
- document_review
- volunteer_approval

## 5.19 notes

Observações internas.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `family_id`
- `group_id`
- `author_user_id`
- `note_type`
- `content`
- `visibility`
- `created_at`

Tipos iniciais:

- general
- pastoral
- children
- admin

## 5.20 groups

Representa célula, pequeno grupo, turma ou grupo ministerial.

Campos principais:

- `id`
- `organization_id`
- `campus_id`
- `ministry_id`
- `parent_group_id`
- `name`
- `slug`
- `group_type`
- `status`
- `visibility`
- `meeting_day_of_week`
- `meeting_time`
- `frequency`
- `address_line_1`
- `address_line_2`
- `city`
- `state`
- `postal_code`
- `country_code`
- `latitude`
- `longitude`
- `capacity`
- `network_name`
- `region_name`
- `created_at`
- `updated_at`

Valores iniciais de `group_type`:

- cell
- small_group
- youth_group
- class
- volunteer_team

## 5.21 group_members

Relaciona pessoas aos grupos.

Campos principais:

- `id`
- `organization_id`
- `group_id`
- `person_id`
- `role_in_group`
- `membership_status`
- `joined_at`
- `left_at`

Valores iniciais de `role_in_group`:

- member
- visitor
- leader
- co_leader
- host
- supervisor

## 5.22 group_meetings

Ocorrências de reuniões de grupo.

Campos principais:

- `id`
- `organization_id`
- `group_id`
- `scheduled_start_at`
- `scheduled_end_at`
- `actual_start_at`
- `actual_end_at`
- `meeting_status`
- `notes`
- `created_at`

## 5.23 group_attendances

Presença em reunião de grupo.

Campos principais:

- `id`
- `organization_id`
- `group_meeting_id`
- `group_id`
- `person_id`
- `attendance_status`
- `guest_count`
- `checkin_source`
- `created_at`

Valores de `attendance_status`:

- present
- absent
- justified
- first_time_guest

## 5.24 group_leadership_tracks

Trilha de formação de liderança.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `group_id`
- `track_stage`
- `mentor_person_id`
- `started_at`
- `completed_at`
- `status`
- `notes`

## 5.25 child_profiles

Extensão da pessoa para dados específicos de criança.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `allergies`
- `medical_notes`
- `special_needs`
- `authorized_pickup_notes`
- `school_stage`
- `created_at`
- `updated_at`

## 5.26 guardianships

Define responsáveis por uma criança.

Campos principais:

- `id`
- `organization_id`
- `child_person_id`
- `guardian_person_id`
- `relationship_type`
- `is_legal_guardian`
- `is_primary`
- `pickup_authorized`
- `created_at`

## 5.27 rooms

Salas usadas por check-in infantil ou eventos.

Campos principais:

- `id`
- `organization_id`
- `campus_id`
- `ministry_id`
- `name`
- `code`
- `room_type`
- `age_min_months`
- `age_max_years`
- `capacity`
- `status`

## 5.28 checkin_sessions

Sessões de check-in por culto, evento ou período.

Campos principais:

- `id`
- `organization_id`
- `campus_id`
- `event_id`
- `session_type`
- `name`
- `started_at`
- `ended_at`
- `status`

Exemplos de `session_type`:

- weekend_service
- kids_service
- event

## 5.29 checkin_entries

Registro individual de check-in de criança.

Campos principais:

- `id`
- `organization_id`
- `checkin_session_id`
- `child_person_id`
- `guardian_person_id`
- `room_id`
- `checkin_code`
- `checked_in_at`
- `checked_out_at`
- `checked_out_by_user_id`
- `status`
- `security_notes`

## 5.30 incidents

Incidentes ou observações relevantes.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `child_person_id`
- `room_id`
- `reported_by_user_id`
- `incident_type`
- `description`
- `severity`
- `occurred_at`
- `resolved_at`

## 5.31 youth_profiles

Extensão da pessoa para adolescentes e jovens.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `guardian_contact_required`
- `school_name`
- `education_stage`
- `notes`

## 5.32 discipleship_tracks

Trilha de discipulado e desenvolvimento.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `track_type`
- `current_stage`
- `assigned_mentor_person_id`
- `started_at`
- `completed_at`
- `status`
- `notes`

Exemplos de `track_type`:

- new_believer
- membership
- leadership
- youth_discipleship

## 5.33 events

Eventos gerais do sistema.

Campos principais:

- `id`
- `organization_id`
- `campus_id`
- `ministry_id`
- `name`
- `slug`
- `description`
- `event_type`
- `status`
- `starts_at`
- `ends_at`
- `location_type`
- `location_name`
- `address_line_1`
- `address_line_2`
- `city`
- `state`
- `postal_code`
- `country_code`
- `capacity`
- `is_paid`
- `created_at`
- `updated_at`

## 5.34 event_tickets

Lotes ou tipos de inscrição.

Campos principais:

- `id`
- `organization_id`
- `event_id`
- `name`
- `description`
- `price_amount`
- `currency`
- `quantity_available`
- `sales_start_at`
- `sales_end_at`
- `status`

## 5.35 event_registrations

Inscrição principal.

Campos principais:

- `id`
- `organization_id`
- `event_id`
- `responsible_person_id`
- `registration_code`
- `status`
- `total_amount`
- `currency`
- `payment_status`
- `registered_at`
- `cancelled_at`

## 5.36 event_registration_people

Pessoas vinculadas a uma inscrição.

Campos principais:

- `id`
- `organization_id`
- `event_registration_id`
- `person_id`
- `event_ticket_id`
- `price_amount`
- `checkin_status`

## 5.37 event_checkins

Check-in no evento.

Campos principais:

- `id`
- `organization_id`
- `event_id`
- `person_id`
- `event_registration_person_id`
- `checked_in_at`
- `checked_in_by_user_id`

## 5.38 volunteer_profiles

Perfil de serviço.

Campos principais:

- `id`
- `organization_id`
- `person_id`
- `availability_notes`
- `skills_json`
- `background_check_status`
- `training_status`
- `status`
- `created_at`
- `updated_at`

## 5.39 serving_teams

Times de voluntariado.

Campos principais:

- `id`
- `organization_id`
- `campus_id`
- `ministry_id`
- `name`
- `description`
- `status`

## 5.40 serving_schedules

Escalas por data ou período.

Campos principais:

- `id`
- `organization_id`
- `serving_team_id`
- `event_id`
- `schedule_name`
- `starts_at`
- `ends_at`
- `status`

## 5.41 serving_assignments

Pessoas escaladas.

Campos principais:

- `id`
- `organization_id`
- `serving_schedule_id`
- `person_id`
- `role_name`
- `confirmation_status`
- `confirmed_at`
- `notes`

## 5.42 communication_campaigns

Campanhas de comunicação.

Campos principais:

- `id`
- `organization_id`
- `name`
- `channel`
- `campaign_type`
- `status`
- `subject`
- `message_body`
- `scheduled_at`
- `sent_at`
- `created_by_user_id`

Valores de `channel`:

- email
- sms
- whatsapp
- push

## 5.43 communication_audiences

Define público-alvo de campanha.

Campos principais:

- `id`
- `organization_id`
- `communication_campaign_id`
- `audience_type`
- `filter_json`

## 5.44 communication_deliveries

Entrega por pessoa.

Campos principais:

- `id`
- `organization_id`
- `communication_campaign_id`
- `person_id`
- `channel`
- `delivery_status`
- `sent_at`
- `delivered_at`
- `read_at`
- `failed_at`
- `failure_reason`

## 6. Estruturas preparadas para fase futura

Estas tabelas podem entrar após o MVP, mas vale já reservar o desenho conceitual.

### funds

- fundos, causas e centros de custo

Campos:

- `id`
- `organization_id`
- `name`
- `code`
- `status`

### donations

- doações por pessoa, campanha ou evento

Campos:

- `id`
- `organization_id`
- `person_id`
- `family_id`
- `fund_id`
- `event_id`
- `amount`
- `currency`
- `donation_type`
- `method`
- `donated_at`
- `status`

### payment_transactions

- transações de gateway

Campos:

- `id`
- `organization_id`
- `provider`
- `reference_type`
- `reference_id`
- `provider_transaction_id`
- `amount`
- `currency`
- `status`
- `paid_at`
- `raw_payload_json`

## 7. Relacionamentos principais

### Relações centrais

- `organizations 1:N campuses`
- `organizations 1:N ministries`
- `organizations 1:N people`
- `organizations 1:N families`
- `families 1:N family_members`
- `people 1:N family_members`
- `people 1:N person_timelines`
- `people 1:N tasks`
- `people 1:N notes`
- `people 1:N visitor_journeys`
- `people N:N groups` via `group_members`
- `groups 1:N group_meetings`
- `group_meetings 1:N group_attendances`
- `people 1:1 child_profiles` quando for criança
- `people 1:N guardianships` como criança ou responsável
- `checkin_sessions 1:N checkin_entries`
- `events 1:N event_tickets`
- `events 1:N event_registrations`
- `event_registrations 1:N event_registration_people`
- `people 1:N volunteer_profiles` idealmente um ativo por pessoa
- `serving_teams 1:N serving_schedules`
- `serving_schedules 1:N serving_assignments`

## 8. Índices recomendados para o MVP

- índice por `organization_id` em todas as tabelas de negócio
- `people (organization_id, email)`
- `people (organization_id, phone_mobile)`
- `people (organization_id, full_name)`
- `families (organization_id, family_name)`
- `visitor_journeys (organization_id, status, current_stage)`
- `tasks (organization_id, assigned_to_user_id, status, due_at)`
- `groups (organization_id, group_type, status)`
- `group_members (organization_id, group_id, person_id)`
- `group_attendances (organization_id, group_id, person_id)`
- `checkin_entries (organization_id, child_person_id, checked_in_at)`
- `events (organization_id, starts_at, status)`
- `event_registrations (organization_id, event_id, status)`
- `communication_deliveries (organization_id, communication_campaign_id, delivery_status)`

## 9. Regras de segurança e conformidade

- separar dados sensíveis de pastoral e infância por permissão
- registrar auditoria em ações críticas
- evitar exposição direta de dados médicos em listagens amplas
- restringir consulta de check-in infantil por papel e escopo
- guardar consentimentos e preferências de comunicação
- prever anonimização futura para exclusão compatível com LGPD

## 10. Estratégia de implementação em banco

### Sprint 1. Fundação

- organizations
- campuses
- ministries
- users
- roles
- permissions
- user_roles
- people
- families
- family_members
- tags
- person_tags

### Sprint 2. Jornada e grupos

- person_timelines
- visitor_journeys
- journey_stages
- tasks
- notes
- groups
- group_members
- group_meetings
- group_attendances

### Sprint 3. Crianças e eventos

- child_profiles
- guardianships
- rooms
- checkin_sessions
- checkin_entries
- incidents
- events
- event_tickets
- event_registrations
- event_registration_people
- event_checkins

### Sprint 4. Voluntariado e comunicação

- volunteer_profiles
- serving_teams
- serving_schedules
- serving_assignments
- communication_campaigns
- communication_audiences
- communication_deliveries

## 11. Decisões de modelagem mais importantes

- `people` é a entidade central do sistema
- `families` existe como agregado complementar, não substitui a pessoa
- `person_timelines` unifica visão do relacionamento
- `visitor_journeys` e `tasks` tornam acolhimento operacional
- `groups` foi desenhada para servir tanto células quanto classes e grupos ministeriais
- infância e juventude usam extensão da pessoa, não bases isoladas
- eventos e check-in já nascem conectados à jornada da pessoa

## 12. Próximo passo recomendado

Depois desta modelagem, o melhor próximo documento é o backlog do MVP com:

1. épicos
2. histórias de usuário
3. critérios de aceite
4. ordem de implementação

Em seguida, faz muito sentido transformar esta modelagem em:

- diagrama ER
- migrations iniciais
- arquitetura de API
