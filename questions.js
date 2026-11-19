// Perguntas da enquete. correctIndex é opcional — se undefined, a pergunta
// não tem "resposta certa" e o botão de revelar só mostra a distribuição.
module.exports = [
  {
    text: "Conflitos, cobranças e divergências recorrentes são assédio?",
    options: ["Sim", "Não"],
    correctIndex: 1
  },
  {
    text: "Um gestor pode pressionar, ameaçar ou oferecer vantagem a um colaborador para que ele vote em um determinado candidato?",
    options: ["Sim", "Não"],
    correctIndex: 1
  },
  {
    text: "Quais fatores podem contribuir para a ocorrência do assédio no ambiente de trabalho?",
    options: [
      "Relações de poder desiguais e abuso de autoridade",
      "Falta de comunicação e respeito",
      "Cultura organizacional que naturaliza comportamentos abusivos",
      "Todas as alternativas anteriores"
    ],
    correctIndex: 3
  },
  {
    text: "Quais grupos podem ser mais vulneráveis a sofrer assédio no ambiente de trabalho?",
    options: [
      "Mulheres",
      "Pessoas negras e LGBTQIA+",
      "Pessoas com deficiência ou outros grupos socialmente marginalizados",
      "Todos os grupos selecionados"
    ],
    correctIndex: 3
  },
  {
    text: "O assédio no ambiente de trabalho afeta somente a pessoa que sofre diretamente a violência?",
    options: [
      "Sim, seus efeitos são exclusivamente individuais",
      "Não, também afeta colegas, equipe, a organização e o ambiente de trabalho",
      "Sim, desde que aconteça fora do horário de expediente",
      "Não, mas afeta somente a gestão"
    ],
    correctIndex: 1
  },
  {
    text: "Em um ambiente de trabalho onde cada profissional é incentivado a priorizar exclusivamente seus próprios resultados, quais podem ser as consequências para as relações entre colegas?",
    options: [
      "Maior cooperação e fortalecimento dos vínculos",
      "Redução da solidariedade, enfraquecimento dos vínculos coletivos e maior tolerância a práticas abusivas",
      "Maior facilidade para resolver conflitos coletivamente",
      "Fortalecimento do sentimento de pertencimento à equipe"
    ],
    correctIndex: 1
  }
];
