# Questionário inteligente de tribos ministeriais

Data: 17 de março de 2026

## 1. Objetivo

Definir um questionário inteligente para recomendar ao membro:

- tribo principal
- tribo secundária
- ministérios recomendados
- trilha de desenvolvimento sugerida

O questionário deve transformar o conceito das tribos em uma experiência prática, leve e confiável.

## 2. Princípios do questionário

- simples para o membro responder
- profundo o suficiente para gerar recomendação útil
- focado em vocação, estilo de serviço, dons e inclinações
- não determinista: recomenda, não decreta
- revisável no tempo
- validado por liderança

## 3. Resultado esperado

Ao final do questionário, o sistema deve conseguir calcular:

- `tribe_primary`
- `tribe_secondary`
- `tribe_score_breakdown`
- `recommended_ministries`
- `recommended_development_track`
- `confidence_level`

## 4. Estrutura recomendada

Minha recomendação é dividir o questionário em 5 blocos.

### Bloco 1. Motivação de serviço

Descobre o que mais move a pessoa.

### Bloco 2. Estilo de atuação

Descobre como a pessoa funciona melhor.

### Bloco 3. Habilidades e dons percebidos

Descobre o que a pessoa sente que faz bem.

### Bloco 4. Ambiente ministerial preferido

Descobre onde ela floresce mais.

### Bloco 5. Maturidade e disponibilidade

Ajuda a calibrar recomendação e trilha, não apenas tribo.

## 5. Formato recomendado

Sugestão ideal para o MVP:

- 20 perguntas
- cada pergunta com 4 ou 5 opções
- respostas com pesos por tribo
- 5 a 7 minutos de preenchimento

Formato de resposta:

- alternativa única na maior parte das perguntas
- algumas perguntas com múltipla escolha opcional
- escala de intensidade em perguntas específicas

## 6. Lógica de pontuação

Cada resposta soma pontos para uma ou mais tribos.

Exemplo:

- resposta ligada a música, adoração e ambiente de culto: soma para `Levi`
- resposta ligada a organização e processos: soma para `José`
- resposta ligada a estratégia e entendimento: soma para `Issacar`

## Regras de cálculo sugeridas

- a tribo com maior pontuação vira `tribo principal`
- a segunda pontuação vira `tribo secundária`
- se a diferença entre primeira e segunda for pequena, o sistema exibe ambas com equilíbrio
- se o nível de coerência for baixo, o sistema marca recomendação com menor confiança

## Camadas do resultado

### Camada 1. Recomendação principal

- tribo principal

### Camada 2. Afinidade complementar

- tribo secundária

### Camada 3. Recomendação prática

- ministérios compatíveis
- tipo de célula sugerida
- trilha de desenvolvimento

## 7. Mapeamento base das tribos

Para o motor de recomendação, o sistema deve trabalhar com estes eixos:

### Levi

- adoração
- música
- ambiente de culto
- intercessão
- sensibilidade espiritual

### Judá

- liderança
- direção
- influência
- responsabilidade
- tomada de decisão

### Issacar

- estratégia
- ensino
- discernimento
- análise
- planejamento

### José

- administração
- organização
- finanças
- processos
- sustentabilidade

### Aser

- acolhimento
- hospitalidade
- cuidado
- atenção às pessoas
- suporte prático

### Naftali

- comunicação
- criatividade
- expressão
- mídia
- mobilização por mensagem

### Zebulom

- logística
- expansão
- missões
- mobilização
- projetos

### Gade

- ação
- coragem
- resposta rápida
- campo
- evangelismo externo

### Manassés

- restauração
- escuta
- cuidado profundo
- apoio emocional
- reconciliação

### Efraim

- multiplicação
- crescimento
- frutificação
- implantação
- desenvolvimento de novas frentes

### Benjamim

- prontidão
- execução
- intensidade
- suporte tático
- resolução rápida

### Rúben

- pioneirismo
- iniciativa
- experimentação
- começo de processos
- liderança em formação

## 8. Questionário proposto

## Pergunta 1

Quando você pensa em servir na igreja, o que mais te anima?

- `A` Conduzir pessoas em adoração e criar ambiente espiritual forte
- `B` Liderar pessoas e assumir responsabilidade
- `C` Entender a direção certa e ajudar no planejamento
- `D` Organizar bastidores para tudo funcionar bem
- `E` Acolher e cuidar bem das pessoas

Pontuação:

- `A`: Levi +3
- `B`: Judá +3
- `C`: Issacar +3
- `D`: José +3
- `E`: Aser +3

## Pergunta 2

Em qual tipo de atividade você naturalmente se destaca mais?

- `A` Música, adoração ou intercessão
- `B` Falar, conduzir e motivar pessoas
- `C` Analisar cenários e propor direção
- `D` Planejar, organizar e executar processos
- `E` Receber, integrar e acompanhar pessoas

Pontuação:

- `A`: Levi +3
- `B`: Judá +2, Naftali +1
- `C`: Issacar +3
- `D`: José +3
- `E`: Aser +3

## Pergunta 3

Qual ambiente ministerial combina mais com você?

- `A` Culto, oração, louvor e celebração
- `B` Liderança de equipes ou supervisão
- `C` Formação, ensino e planejamento
- `D` Administração, secretaria ou organização
- `E` Recepção, cuidado e relacionamento

Pontuação:

- `A`: Levi +3
- `B`: Judá +3
- `C`: Issacar +2, Efraim +1
- `D`: José +3
- `E`: Aser +3

## Pergunta 4

Quando surge um desafio novo, você tende a:

- `A` agir rápido e entrar em campo
- `B` reunir pessoas e conduzir a resposta
- `C` analisar antes de agir
- `D` organizar recursos e fluxo
- `E` apoiar quem está fragilizado

Pontuação:

- `A`: Gade +2, Benjamim +1
- `B`: Judá +3
- `C`: Issacar +3
- `D`: José +2, Zebulom +1
- `E`: Manassés +2, Aser +1

## Pergunta 5

O que mais combina com a sua forma de servir?

- `A` Sensibilidade espiritual
- `B` Influência e condução
- `C` Sabedoria e clareza
- `D` Eficiência e estrutura
- `E` Cuidado e acolhimento

Pontuação:

- `A`: Levi +2, Manassés +1
- `B`: Judá +3
- `C`: Issacar +3
- `D`: José +3
- `E`: Aser +2, Manassés +1

## Pergunta 6

Se você fosse ajudar em um grande evento da igreja, qual área escolheria primeiro?

- `A` Louvor, palco, oração ou ambiente
- `B` Coordenação geral e liderança
- `C` Conteúdo, direção ou estratégia
- `D` Operação, secretaria, credenciamento ou finanças
- `E` Recepção, suporte às pessoas e cuidado

Pontuação:

- `A`: Levi +3
- `B`: Judá +3
- `C`: Issacar +2, Naftali +1
- `D`: José +2, Benjamim +1
- `E`: Aser +2, Manassés +1

## Pergunta 7

Qual frase mais descreve você?

- `A` Gosto de criar ambientes onde pessoas se conectam com Deus
- `B` Gosto de conduzir pessoas para um propósito
- `C` Gosto de entender profundamente antes de decidir
- `D` Gosto de fazer a estrutura funcionar
- `E` Gosto de fazer pessoas se sentirem vistas e cuidadas

Pontuação:

- `A`: Levi +3
- `B`: Judá +3
- `C`: Issacar +3
- `D`: José +3
- `E`: Aser +3

## Pergunta 8

Qual destas áreas mais desperta seu coração?

- `A` Comunicação, criatividade e expressão
- `B` Missões, mobilização e projetos externos
- `C` Evangelismo de rua, ação prática e resposta rápida
- `D` Restauração e cuidado profundo
- `E` Multiplicação, crescimento e abertura de novas frentes

Pontuação:

- `A`: Naftali +3
- `B`: Zebulom +3
- `C`: Gade +2, Benjamim +1
- `D`: Manassés +3
- `E`: Efraim +3

## Pergunta 9

Em um time, você tende a funcionar como:

- `A` o que inspira o ambiente
- `B` o que lidera a direção
- `C` o que traz clareza
- `D` o que organiza a execução
- `E` o que cuida das pessoas

Pontuação:

- `A`: Levi +2, Naftali +1
- `B`: Judá +3
- `C`: Issacar +3
- `D`: José +2, Benjamim +1
- `E`: Aser +2, Manassés +1

## Pergunta 10

Que tipo de impacto mais te empolga?

- `A` ver pessoas adorando e sendo tocadas por Deus
- `B` ver pessoas sendo lideradas e mobilizadas
- `C` ver decisões sábias sendo tomadas
- `D` ver a obra sustentada com ordem e excelência
- `E` ver pessoas sendo acolhidas e restauradas

Pontuação:

- `A`: Levi +3
- `B`: Judá +2, Efraim +1
- `C`: Issacar +3
- `D`: José +3
- `E`: Aser +2, Manassés +1

## Pergunta 11

Se você pudesse abrir uma nova frente na igreja, qual seria?

- `A` Uma equipe de adoração e oração
- `B` Uma nova liderança ou supervisão
- `C` Uma escola de formação
- `D` Um sistema melhor de gestão e organização
- `E` Um ambiente forte de acolhimento e integração

Pontuação:

- `A`: Levi +3
- `B`: Judá +2, Efraim +1
- `C`: Issacar +3
- `D`: José +3
- `E`: Aser +2, Manassés +1

## Pergunta 12

Qual dessas habilidades mais aparece em você?

- `A` Criatividade e comunicação
- `B` Logística e mobilização
- `C` Coragem para agir sob pressão
- `D` Escuta e restauração
- `E` Capacidade de multiplicar pessoas e frentes

Pontuação:

- `A`: Naftali +3
- `B`: Zebulom +3
- `C`: Benjamim +2, Gade +1
- `D`: Manassés +3
- `E`: Efraim +3

## Pergunta 13

Qual tipo de desafio mais combina com você?

- `A` Colocar um projeto em movimento
- `B` Crescer e multiplicar o que já existe
- `C` Sustentar a operação no dia a dia
- `D` Restaurar pessoas em crise
- `E` Servir de forma intensa quando mais precisam

Pontuação:

- `A`: Rúben +2, Zebulom +1
- `B`: Efraim +3
- `C`: José +3
- `D`: Manassés +3
- `E`: Benjamim +2, Gade +1

## Pergunta 14

Qual destes perfis se parece mais com você?

- `A` Comunicador criativo
- `B` Mobilizador de projetos
- `C` Guerreiro de campo
- `D` Restaurador
- `E` Executor intenso

Pontuação:

- `A`: Naftali +3
- `B`: Zebulom +3
- `C`: Gade +3
- `D`: Manassés +3
- `E`: Benjamim +3

## Pergunta 15

Qual dessas frases mais te representa?

- `A` Eu gosto de começar coisas novas
- `B` Eu gosto de ver pessoas e ministérios crescerem
- `C` Eu gosto de manter tudo em ordem e funcionando
- `D` Eu gosto de ajudar pessoas a se reconstruírem
- `E` Eu gosto de estar pronto para agir quando necessário

Pontuação:

- `A`: Rúben +3
- `B`: Efraim +3
- `C`: José +2, Issacar +1
- `D`: Manassés +3
- `E`: Benjamim +2, Gade +1

## Pergunta 16

Em relação ao seu momento espiritual e ministerial hoje:

- `A` Estou descobrindo onde posso florescer
- `B` Já me vejo conduzindo pessoas
- `C` Sinto que contribuo melhor com entendimento e direção
- `D` Vejo meu valor em sustentar e organizar a obra
- `E` Sinto forte chamado para cuidar de pessoas

Pontuação:

- `A`: Rúben +3
- `B`: Judá +2, Efraim +1
- `C`: Issacar +3
- `D`: José +3
- `E`: Manassés +2, Aser +1

## Pergunta 17

Qual área você teria mais alegria em desenvolver?

- `A` Música, oração ou ambiência espiritual
- `B` Liderança e supervisão
- `C` Ensino e formação
- `D` Administração e bastidores
- `E` Recepção, hospitalidade ou cuidado

Pontuação:

- `A`: Levi +3
- `B`: Judá +3
- `C`: Issacar +3
- `D`: José +3
- `E`: Aser +3

## Pergunta 18

O que as pessoas geralmente reconhecem em você?

- `A` Criatividade e expressão
- `B` Coragem e iniciativa
- `C` Organização e confiabilidade
- `D` Cuidado e escuta
- `E` Capacidade de liderar e influenciar

Pontuação:

- `A`: Naftali +3
- `B`: Gade +2, Rúben +1
- `C`: José +3
- `D`: Manassés +2, Aser +1
- `E`: Judá +3

## Pergunta 19

Se a igreja te chamasse para um projeto novo, onde você se sentiria mais vivo?

- `A` Abrindo uma nova frente
- `B` Estruturando a operação
- `C` Expandindo algo que já está dando fruto
- `D` Indo ao campo ou para a linha de frente
- `E` Produzindo comunicação e mobilização

Pontuação:

- `A`: Rúben +2, Zebulom +1
- `B`: José +3
- `C`: Efraim +3
- `D`: Gade +2, Benjamim +1
- `E`: Naftali +2, Zebulom +1

## Pergunta 20

Qual combinação mais se aproxima de você?

- `A` Adoração e sensibilidade
- `B` Governo e liderança
- `C` Entendimento e estratégia
- `D` Cuidado e restauração
- `E` Ação e expansão

Pontuação:

- `A`: Levi +3
- `B`: Judá +3
- `C`: Issacar +3
- `D`: Manassés +2, Aser +1
- `E`: Efraim +2, Gade +1

## 9. Regras de interpretação

### Regra 1. Resultado principal

- maior pontuação = tribo principal

### Regra 2. Resultado complementar

- segunda maior pontuação = tribo secundária

### Regra 3. Resultado híbrido

Se a diferença entre a primeira e a segunda pontuação for pequena, por exemplo até `2 pontos`, o sistema pode mostrar:

- "Você tem perfil híbrido entre Levi e Issacar"

### Regra 4. Baixa confiança

Se a distribuição de pontos ficar muito espalhada, o sistema deve:

- reduzir o nível de confiança
- sugerir validação pastoral prioritária

### Regra 5. Peso pastoral

Após o questionário:

- líder pode confirmar a tribo
- líder pode ajustar a tribo
- sistema registra motivo do ajuste

## 10. Recomendação de ministérios por tribo

### Levi

- louvor
- música
- intercessão
- culto
- apoio litúrgico

### Judá

- liderança de célula
- supervisão
- coordenação de ministério
- liderança pastoral

### Issacar

- ensino
- formação
- planejamento
- estratégia

### José

- secretaria
- administração
- finanças
- operações

### Aser

- recepção
- hospitalidade
- integração
- cuidado de famílias

### Naftali

- mídia
- comunicação
- design
- produção de conteúdo

### Zebulom

- logística
- eventos
- missões
- mobilização externa

### Gade

- evangelismo
- ação social de campo
- apoio externo
- segurança

### Manassés

- cuidado pastoral
- consolidação
- restauração
- escuta e apoio

### Efraim

- implantação de grupos
- expansão
- discipulado multiplicador
- abertura de novas frentes

### Benjamim

- operação de evento
- suporte tático
- resposta rápida
- execução intensa

### Rúben

- projetos novos
- liderança em formação
- novas iniciativas
- frentes experimentais

## 11. Dados que o sistema deve armazenar

- `member_tribe_primary`
- `member_tribe_secondary`
- `member_tribe_confidence`
- `member_tribe_scores_json`
- `member_tribe_assessment_version`
- `member_tribe_assessed_at`
- `member_tribe_validated_by_user_id`
- `member_tribe_validated_at`
- `member_tribe_validation_status`

## 12. Modelo de experiência do usuário

Fluxo sugerido:

1. membro cria ou completa o perfil
2. sistema oferece o questionário de tribos
3. membro responde em poucos minutos
4. sistema mostra resultado principal e complementar
5. sistema sugere ministérios, célula e trilha
6. liderança recebe opção de validar ou ajustar

## 13. Minha recomendação prática

No lançamento, eu começaria com:

- 12 tribos principais
- 20 perguntas
- resultado principal + secundário
- validação por líder
- recomendação de ministérios

Depois evoluiria para:

- pesos personalizados por igreja
- questionário adaptativo
- recomendações baseadas em comportamento real dentro da plataforma
- histórico de mudança de tribo ao longo da jornada

## 14. Próximo passo ideal

Depois deste documento, os melhores próximos entregáveis são:

1. modelagem do módulo `tribos` no banco de dados
2. regras do algoritmo de pontuação em formato técnico
3. wireframe da experiência do questionário
4. mapeamento de tribos para ministérios, células e trilhas
