
const screen = document.getElementById("screen");
const startBtn = document.getElementById("startBtn");
const params = new URLSearchParams(window.location.search);
const accessKey = params.get("key");

if (!accessKey) {
  alert("アクセスキーがありません。正しいURLからアクセスしてください。");
  startBtn.disabled = true;
}

let player = null;
let playerReady = false;

let correctAnswer = "";
let selectedAnswer = null;

let timer = null;
let timeLeft = 15;
let isEnded = false;

let currentQuestion = 0;
const TOTAL_QUESTIONS = 4;
let results = [];

/* =========================
   YouTube API
========================= */
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 0,
      controls: 0,
      playsinline: 1
    },
    events: {
      onReady: () => {
        playerReady = true;
        startBtn.disabled = false;
      }
    }
  });
}

/* =========================
   スタート
========================= */
startBtn.onclick = () => {
  if (!playerReady) {
    alert("YouTubeプレイヤー準備中です。少し待ってください");
    return;
  }

  startBtn.style.display = "none";
  currentQuestion = 0;
  results = Array(TOTAL_QUESTIONS).fill(null);
  startGame();
};

function startGame() {
  currentQuestion++;
  selectedAnswer = null;
  isEnded = false;

  fetch(`/question?num=${currentQuestion}&key=${accessKey}`)
    .then(res => res.json())
    .then(data => {
      correctAnswer = data.correct;
      showIntro(data);
    });
}

/* =========================
   表示
========================= */
function showIntro(data) {
  screen.innerHTML = `
    <div id="progress">${currentQuestion} / ${TOTAL_QUESTIONS} 問目</div>
    <div id="history">${renderHistory()}</div>
    <p id="question">この曲の題名は？</p>
    <div id="choices"></div>
    <p id="timer"></p>
  `;

  playIntro(data.video_id);

  setTimeout(() => {
    startQuestion(data);
  }, 5000);
}

function renderHistory() {
  return results
    .map(r => (r === null ? "・" : r ? "○" : "×"))
    .join(" ");
}

/* =========================
   再生（イントロ）
========================= */
function playIntro(videoId) {
  player.loadVideoById(videoId);
  player.setVolume(30);
  player.playVideo();

  setTimeout(() => {
    player.pauseVideo();
  }, 5000);
}

/* =========================
   選択肢
========================= */
function startQuestion(data) {
  const choicesDiv = document.getElementById("choices");
  choicesDiv.innerHTML = "";

  data.choices.forEach(title => {
    const btn = document.createElement("button");
    btn.textContent = title;
    btn.className = "choice";

    btn.onclick = () => {
      if (isEnded) return;

      selectedAnswer = title;
      document.querySelectorAll(".choice").forEach(b =>
        b.classList.remove("selected")
      );
      btn.classList.add("selected");
    };

    choicesDiv.appendChild(btn);
  });

  startCountdown();
}

/* =========================
   カウントダウン
========================= */
function startCountdown() {
  timeLeft = 10;
  const timerEl = document.getElementById("timer");
  timerEl.textContent = timeLeft;

  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    if (timeLeft === 0) {
      clearInterval(timer);
      endQuestion();
    }
  }, 1000);
}

/* =========================
   終了演出
========================= */
function endQuestion() {
  if (isEnded) return;
  isEnded = true;

  document.querySelectorAll(".choice").forEach(b => b.disabled = true);

  const endMsg = document.createElement("p");
  endMsg.id = "end";
  endMsg.textContent = "終了！";
  screen.appendChild(endMsg);

  setTimeout(() => {
    endMsg.textContent = "答えは…";
  }, 3000);

  setTimeout(showAnswer, 6000);
}

/* =========================
   正解発表
========================= */
function showAnswer() {
  // 続きから再生（ロードしない）
  player.setVolume(30);
  player.playVideo();

  const isCorrect = selectedAnswer === correctAnswer;
  results[currentQuestion - 1] = isCorrect;

  document.querySelectorAll(".choice").forEach(btn => {
    if (btn.textContent === correctAnswer) {
      btn.style.background = "green";
    } else if (btn.textContent === selectedAnswer) {
      btn.style.background = "red";
    }
  });

  document.getElementById("history").textContent = renderHistory();
  showNextButton();
}

/* =========================
   次へ / 再スタート
========================= */
function showNextButton() {
  const btn = document.createElement("button");

  if (currentQuestion < TOTAL_QUESTIONS) {
    btn.textContent = "次の問題へ";
    btn.onclick = startGame;
  } else {
    btn.textContent = "もう一度遊ぶ";
    btn.onclick = resetGame;
  }

  screen.appendChild(btn);
}

function resetGame() {
  clearInterval(timer);

  if (player) {
    player.stopVideo();
  }

  currentQuestion = 0;
  results = Array(TOTAL_QUESTIONS).fill(null);
  selectedAnswer = null;
  isEnded = false;

  screen.innerHTML = "";
  startBtn.style.display = "inline-block";
  startBtn.disabled = false;
}
