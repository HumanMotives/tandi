const quizData = [
  {
    icon: '🌲',
    title: 'Wat doe jij het liefst buiten?',
    text: 'Kies wat het meest als jou voelt.',
    answers: [
      { label: 'Een hut bouwen of een route ontdekken', type: 'avonturier' },
      { label: 'Samen een spel winnen', type: 'teamspeler' },
      { label: 'Iets maken met takken, verf of touw', type: 'maker' }
    ]
  },
  {
    icon: '🔥',
    title: 'Kampvuuravond. Jij...',
    text: 'Wat past het beste bij jou?',
    answers: [
      { label: 'Gaat op zoek naar marshmallows en verhalen', type: 'avonturier' },
      { label: 'Zorgt dat iedereen mee kan doen', type: 'teamspeler' },
      { label: 'Bedenkt een liedje, sketch of gek plan', type: 'maker' }
    ]
  },
  {
    icon: '🎨',
    title: 'Regen opkomst?',
    text: 'Geen probleem. Wat doe je?',
    answers: [
      { label: 'Laarzen aan. Juist nu naar buiten', type: 'avonturier' },
      { label: 'Binnen een groepsspel organiseren', type: 'teamspeler' },
      { label: 'Knutselen, bouwen of iets nieuws verzinnen', type: 'maker' }
    ]
  },
  {
    icon: '🤝',
    title: 'Nieuwe kinderen in de groep',
    text: 'Hoe reageer jij?',
    answers: [
      { label: 'Ik neem ze mee op ontdekking', type: 'avonturier' },
      { label: 'Ik zorg dat ze zich welkom voelen', type: 'teamspeler' },
      { label: 'Ik bedenk iets grappigs om het ijs te breken', type: 'maker' }
    ]
  },
  {
    icon: '🧭',
    title: 'Een onbekende opdracht',
    text: 'Wat is jouw eerste reactie?',
    answers: [
      { label: 'Gewoon proberen en kijken wat gebeurt', type: 'avonturier' },
      { label: 'Eerst samen een plan maken', type: 'teamspeler' },
      { label: 'Een slimme of creatieve oplossing zoeken', type: 'maker' }
    ]
  },
  {
    icon: '🏕️',
    title: 'Op kamp vind jij vooral leuk...',
    text: 'Kies jouw favoriet.',
    answers: [
      { label: 'Speurtocht, bosspel en slapen in een tent', type: 'avonturier' },
      { label: 'Samen eten, lachen en herinneringen maken', type: 'teamspeler' },
      { label: 'Bonte avond, bouwen en gekke opdrachten', type: 'maker' }
    ]
  },
  {
    icon: '⭐',
    title: 'Waar word jij trots van?',
    text: 'Laatste vraag.',
    answers: [
      { label: 'Iets durven dat ik eerst spannend vond', type: 'avonturier' },
      { label: 'Samen iets bereiken als groep', type: 'teamspeler' },
      { label: 'Iets bedenken dat niemand verwachtte', type: 'maker' }
    ]
  }
];

const results = {
  avonturier: {
    badge: 'Avonturier',
    title: 'Jij bent een echte Avonturier',
    text: 'Jij krijgt energie van ontdekken, buiten zijn en nieuwe dingen proberen. Bij Jong Nederland kun je spelen, groeien en avontuur beleven met kinderen uit de buurt.'
  },
  teamspeler: {
    badge: 'Teamspeler',
    title: 'Jij bent een echte Teamspeler',
    text: 'Jij vindt samen lachen, helpen en meedoen belangrijk. Bij Jong Nederland draait het om vriendschap, vertrouwen en samen herinneringen maken.'
  },
  maker: {
    badge: 'Creatieve Maker',
    title: 'Jij bent een echte Creatieve Maker',
    text: 'Jij bedenkt graag iets nieuws en maakt van gewone dingen iets bijzonders. Bij Jong Nederland is er ruimte voor fantasie, bouwen, knutselen en gekke ideeën.'
  }
};

const startState = document.getElementById('quiz-start');
const questionState = document.getElementById('quiz-question');
const resultState = document.getElementById('quiz-result');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const questionIcon = document.getElementById('question-icon');
const questionTitle = document.getElementById('question-title');
const questionText = document.getElementById('question-text');
const answerList = document.getElementById('answer-list');
const stepLabel = document.getElementById('step-label');
const scoreLabel = document.getElementById('score-label');
const progressBar = document.getElementById('progress-bar');
const resultBadge = document.getElementById('result-badge');
const resultTitle = document.getElementById('result-title');
const resultText = document.getElementById('result-text');

let currentQuestion = 0;
let scores = { avonturier: 0, teamspeler: 0, maker: 0 };

function showState(state) {
  [startState, questionState, resultState].forEach(item => item.classList.remove('is-active'));
  state.classList.add('is-active');
}

function updateProgress() {
  const progress = Math.round((currentQuestion / quizData.length) * 100);
  progressBar.style.width = `${progress}%`;
  scoreLabel.textContent = `${progress}%`;
  stepLabel.textContent = currentQuestion >= quizData.length
    ? 'Resultaat'
    : `Vraag ${currentQuestion + 1} van ${quizData.length}`;
}

function renderQuestion() {
  const question = quizData[currentQuestion];
  questionIcon.textContent = question.icon;
  questionTitle.textContent = question.title;
  questionText.textContent = question.text;
  answerList.innerHTML = '';

  question.answers.forEach(answer => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer-btn';
    button.textContent = answer.label;
    button.addEventListener('click', () => selectAnswer(answer.type));
    answerList.appendChild(button);
  });

  updateProgress();
  showState(questionState);
}

function selectAnswer(type) {
  scores[type] += 1;
  currentQuestion += 1;

  if (currentQuestion >= quizData.length) {
    showResult();
  } else {
    renderQuestion();
  }
}

function showResult() {
  updateProgress();
  progressBar.style.width = '100%';
  scoreLabel.textContent = '100%';

  const winningType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const result = results[winningType];

  resultBadge.textContent = result.badge;
  resultTitle.textContent = result.title;
  resultText.textContent = result.text;
  showState(resultState);
}

function resetQuiz() {
  currentQuestion = 0;
  scores = { avonturier: 0, teamspeler: 0, maker: 0 };
  updateProgress();
  showState(startState);
}

startBtn.addEventListener('click', renderQuestion);
restartBtn.addEventListener('click', resetQuiz);
resetQuiz();
