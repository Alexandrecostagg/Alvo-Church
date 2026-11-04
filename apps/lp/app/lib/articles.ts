export type Article = {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  sections: { title: string; paragraphs: string[]; checklist?: string[] }[];
};

export const articles: Article[] = [
  {
    slug: "organizar-cadastro-de-membros",
    title: "Um cadastro que a equipe consegue manter em dia",
    description: "Por onde começar, quem atualiza as informações e como evitar que a organização dependa de uma única pessoa.",
    category: "Secretaria", date: "2026-09-28",
    sections: [
      { title: "Comece pelo uso, não pela quantidade de campos", paragraphs: [
        "Antes de reunir planilhas, pergunte à secretaria quais informações ela precisa consultar toda semana. Um cadastro extenso, com campos que ninguém usa, pode ser mais difícil de manter do que uma base simples e confiável.",
        "Liste as tarefas: localizar uma pessoa, confirmar um contato, identificar sua família ou encaminhar uma atualização. A partir delas, defina quais informações são necessárias e quem pode consultá-las. Evite reunir dados pessoais sem uma finalidade clara.",
      ] },
      { title: "Escolha uma fonte principal", paragraphs: [
        "Quando existem versões diferentes da lista de membros, ninguém sabe qual é a mais recente. Escolha onde ficará o cadastro principal e combine como as outras equipes devem pedir correções.",
        "Revise possíveis duplicidades com atenção. Duas pessoas podem ter o mesmo nome; não una cadastros apenas por essa semelhança. Confirme a identidade antes de substituir informações e mantenha uma forma de conferir o que foi alterado.",
      ] },
      { title: "Dê um responsável a cada etapa", paragraphs: [
        "Quem recebe um contato novo pode não ser a pessoa que o confere. Defina quem registra, quem revisa e quem resolve dúvidas. Combine também um substituto para períodos de ausência.",
        "Uma revisão periódica, curta e com tarefas claras costuma ser mais viável do que esperar uma grande campanha de atualização. Convide o próprio membro a informar mudanças de contato e vínculo, sem expor sua ficha a outras pessoas.",
      ], checklist: ["Definir o local do cadastro principal.", "Listar os campos necessários à rotina.", "Revisar duplicidades antes de importar.", "Combinar responsáveis e acessos.", "Separar um momento para conferir atualizações."] },
      { title: "Experimente com uma rotina pequena", paragraphs: [
        "Escolha uma tarefa real, como atualizar contatos recebidos pela secretaria durante a semana. Acompanhe onde aparecem dúvidas e ajuste o procedimento antes de ampliar o uso para toda a equipe.",
        "No Esdras, a apresentação do módulo de pessoas é um ponto de partida para essa conversa. Leve à demonstração as dificuldades do seu processo, sem compartilhar fichas ou dados reais de membros.",
      ] },
    ],
  },
  {
    slug: "acolhimento-de-visitantes",
    title: "Depois das boas-vindas: como organizar o acompanhamento",
    description: "Um roteiro para conectar recepção e liderança sem transformar o acolhimento em uma sequência de cobranças.",
    category: "Acolhimento", date: "2026-09-28",
    sections: [
      { title: "Escute antes de registrar", paragraphs: [
        "A primeira visita pode vir acompanhada de expectativas e dúvidas. Antes de apresentar um formulário, receba a pessoa e explique por que a equipe gostaria de manter contato. Dê espaço para ela escolher se quer receber uma mensagem.",
        "Pergunte qual canal ela prefere e evite transformar esse primeiro encontro em uma entrevista. A conversa deve continuar sendo uma experiência de acolhimento, mesmo quando a igreja usa uma ferramenta de gestão.",
      ] },
      { title: "Combine quem dará continuidade", paragraphs: [
        "Recepção e liderança precisam saber onde termina uma tarefa e começa a seguinte. Ao encaminhar um visitante, indique quem fará o contato e o que já foi combinado. Isso evita que várias pessoas enviem a mesma mensagem ou que todas imaginem que alguém já o fez.",
        "Registre o necessário para dar continuidade, com cuidado para não transformar impressões pessoais em rótulos. Informações particulares compartilhadas em uma conversa não precisam circular por toda a equipe.",
      ] },
      { title: "Respeite o ritmo de cada pessoa", paragraphs: [
        "Uma mensagem de boas-vindas pode agradecer a visita, apresentar um contato para dúvidas e informar um próximo encontro. Não é preciso pressionar por uma resposta imediata nem repetir convites quando a pessoa pede para não receber contato.",
        "Se houver interesse em conhecer uma célula ou ministério, confirme antes de encaminhar seus dados ao responsável. O acompanhamento funciona melhor quando a pessoa entende o próximo passo e participa dessa escolha.",
      ], checklist: ["Explicar a finalidade do contato.", "Confirmar o canal de preferência.", "Definir uma pessoa responsável pelo retorno.", "Registrar o próximo passo combinado.", "Respeitar pedidos de pausa ou de encerramento do contato."] },
      { title: "Revise o processo com a equipe", paragraphs: [
        "Converse com a recepção sobre os pontos em que o acompanhamento se perde: falta de responsável, contato desatualizado ou encaminhamento sem retorno. Escolha um desses pontos para melhorar primeiro.",
        "Ao conhecer o Esdras, peça para percorrer o caminho entre recepção, cadastro e vínculo com a instituição. Uma demonstração com dados fictícios ajuda a equipe a discutir o processo sem expor os visitantes.",
      ] },
    ],
  },
  {
    slug: "adotar-sistema-com-a-equipe",
    title: "Como apresentar um novo sistema à equipe da igreja",
    description: "Uma implantação por etapas, com tarefas reais e espaço para ouvir quem vai usar a plataforma.",
    category: "Rotina da equipe", date: "2026-09-28",
    sections: [
      { title: "Escolha um problema que todos reconheçam", paragraphs: [
        "Uma apresentação com muitos recursos pode impressionar e, ainda assim, deixar a equipe sem saber por onde começar. Escolha uma dificuldade concreta: encontrar um cadastro, conferir uma escala ou acompanhar um encaminhamento.",
        "Descreva como essa tarefa acontece hoje e o que vocês gostariam de tornar mais claro. Esse objetivo ajuda a avaliar a ferramenta durante a demonstração e oferece uma referência para as primeiras semanas de uso.",
      ] },
      { title: "Inclua quem executa o trabalho", paragraphs: [
        "Convide pessoas da secretaria e do ministério envolvido para a conversa. A liderança conhece a prioridade; quem executa a tarefa conhece os detalhes que podem dificultar a mudança.",
        "Peça que cada participante percorra uma tarefa com dados fictícios. Observe onde surgem dúvidas. Ter uma pessoa apresentando todos os cliques é diferente de verificar se a equipe consegue repetir o caminho depois.",
      ] },
      { title: "Avance por etapas", paragraphs: [
        "Combine um pequeno grupo inicial e um responsável pelas dúvidas. Registre instruções curtas, ligadas às tarefas escolhidas, e defina onde a equipe encontra ajuda. Amplie o uso quando esse primeiro processo estiver compreendido.",
        "Durante a transição, deixe claro qual registro vale como fonte principal. Manter anotações paralelas indefinidamente costuma gerar versões divergentes e trabalho repetido.",
      ], checklist: ["Escolher uma rotina para começar.", "Convidar as pessoas que a executam.", "Testar com dados fictícios.", "Definir um contato para dúvidas.", "Combinar uma revisão depois do primeiro ciclo de uso."] },
      { title: "Avalie o processo, além dos acessos", paragraphs: [
        "Pergunte se a informação ficou mais fácil de encontrar, se as responsabilidades estão claras e se alguma etapa ainda exige retrabalho. Uma conta criada não significa que a ferramenta já faz parte da rotina.",
        "O plano gratuito do Esdras permite começar com até 50 membros. Consulte os recursos de cada plano e use a demonstração para discutir o percurso mais adequado à sua instituição, antes de ampliar a adoção.",
      ] },
    ],
  },
];

export function readingMinutes(article: Article) {
  const words = article.sections.flatMap(section => [section.title, ...section.paragraphs, ...(section.checklist || [])]).join(" ").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function articleDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
