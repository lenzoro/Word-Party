// 🔥 FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, getDoc, onSnapshot } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔌 CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyA3s1IM2z5Ws6MREn9ZLohkY5_P3yBgwRs",
  authDomain: "word-party-6de5a.firebaseapp.com",
  projectId: "word-party-6de5a",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔥 STATE
let roomId = "";
let playerName = "";
let interval = null;
let usedHint = false;
let lastScoresJSON = "";
let lastWordIndex = -1;
let audioReady = false;
let soundEnabled = true;

// 🔊 AUDIO UNLOCK (UNCHANGED CORE)
document.addEventListener("click", () => {
  if (audioReady) return;

  const correct = document.getElementById("correctSound");
  const tick = document.getElementById("tickSound");

  if (!correct || !tick) return;
    correct.load();
  tick.load();
  correct.muted = true;
  tick.muted = true;

  correct.play().then(() => {
    correct.pause();
    correct.currentTime = 0;
    correct.muted = false;
  }).catch(() => {});

  tick.play().then(() => {
    tick.pause();
    tick.currentTime = 0;
    tick.muted = false;
  }).catch(() => {});

  audioReady = true;
});

// 🔊 TOGGLE SOUND
window.toggleSound = function () {
  soundEnabled = !soundEnabled;
  alert(soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF");
};

// 🔊 PLAY SOUND
function playSound(id) {
  if (!audioReady || !soundEnabled) return;

  const audio = document.getElementById(id);
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// 🏠 CREATE ROOM
window.createRoom = async function () {
  const nameInput = document.getElementById("nameInput");

  if (!nameInput.value) {
    alert("Enter your name");
    return;
  }

  playerName = nameInput.value;
  roomId = Math.random().toString(36).substring(2, 7);

  await setDoc(doc(db, "rooms", roomId), {
    players: [playerName],
    submittedPlayers: [], // ✅ NEW
    host: playerName,
    phase: "lobby",
    words: [],
    currentIndex: 0,
    scores: {},
    time: 80
  });

  enterRoom();
};

// 🚪 JOIN ROOM
window.joinRoom = async function () {
  playerName = document.getElementById("nameInput").value;
  roomId = document.getElementById("roomInput").value;

  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Room not found!");
    return;
  }

  let data = snap.data();

  await updateDoc(ref, {
    players: [...data.players, playerName]
  });

  enterRoom();
};

// 🎮 ENTER ROOM
function enterRoom() {
  document.getElementById("lobby").style.display = "none";
  document.getElementById("room").style.display = "block";
  document.getElementById("roomCode").innerText = roomId;

  listenToRoom();
}

// 👂 LISTENER
function listenToRoom() {
  const ref = doc(db, "rooms", roomId);

  onSnapshot(ref, (snap) => {
    const data = snap.data();
    if (!data) return;

    updateUI(data);
  });
}

// 🎨 UI
function updateUI(data) {
  hideAll();

  if (data.phase === "lobby") show("room");
  if (data.phase === "submission") show("submission");
  if (data.phase === "game") show("game");

  if (data.phase === "end") {
    show("scoreboard");
    renderScores(data.scores);
  }

const submitted = data.submittedPlayers || [];
const notSubmitted = data.players.filter(p => !submitted.includes(p));

if (data.phase === "submission") {
  document.getElementById("submissionStatus").innerText =
    "Players: " + data.players.join(", ") +
    "\nSubmitted: " + submitted.join(", ") +
    "\nWaiting on: " + notSubmitted.join(", ");
} else {
  document.getElementById("playerList").innerText =
    "Players: " + data.players.join(", ");
}
  const startBtn = document.getElementById("startBtn");
  if (startBtn) {
    startBtn.style.display = data.host === playerName ? "block" : "none";
  }

  if (data.phase === "game") {
    const current = data.words[data.currentIndex];
    if (!current) return;

    const el = document.getElementById("scrambledWord");

    if (data.currentIndex !== lastWordIndex) {
      document.getElementById("guessInput").value = "";
      document.getElementById("hint").innerText = "";
      usedHint = false;

      el.classList.remove("animateWord");
      void el.offsetWidth;
      el.classList.add("animateWord");

      lastWordIndex = data.currentIndex;
    }

    el.innerText =
      current.owner === playerName ? "⛔ Your word" : current.scrambled;

    document.getElementById("timer").innerText = `Time: ${data.time}`;

    renderLiveScores(data.scores);
  }
}

// UI HELPERS
function hideAll() {
  ["room", "submission", "game", "scoreboard"].forEach(id => {
    document.getElementById(id).style.display = "none";
  });
}

function show(id) {
  document.getElementById(id).style.display = "block";
}

// ▶️ START SUBMISSION
window.startSubmission = async function () {
  const ref = doc(db, "rooms", roomId);
  await updateDoc(ref, { phase: "submission" });
};

// 🔀 SCRAMBLE
function scrambleWord(word) {
  let scrambled = word;
  let attempts = 0;

  while (scrambled === word && attempts < 10) {
    scrambled = word.split("").sort(() => Math.random() - 0.5).join("");
    attempts++;
  }

  return scrambled;
}

// 🔁 ALTERNATE WORDS
function alternateWords(words) {
  const grouped = {};

  words.forEach(w => {
    if (!grouped[w.owner]) grouped[w.owner] = [];
    grouped[w.owner].push(w);
  });

  const owners = Object.keys(grouped);
  let result = [];
  let stillWords = true;

  while (stillWords) {
    stillWords = false;

    for (let owner of owners) {
      if (grouped[owner].length > 0) {
        result.push(grouped[owner].shift());
        stillWords = true;
      }
    }
  }

  return result;
}

// ✍️ SUBMIT WORDS
window.submitWords = async function () {
  const words = [
    { word: word1.value.toLowerCase(), hint: hint1.value, owner: playerName },
    { word: word2.value.toLowerCase(), hint: hint2.value, owner: playerName },
    { word: word3.value.toLowerCase(), hint: hint3.value, owner: playerName }
  ];

  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  const data = snap.data();

  let existing = data.words || [];

  let filteredNew = words.filter(newWord =>
    !existing.some(e => e.word === newWord.word && e.owner === newWord.owner)
  );

  let updatedWords = [...existing, ...filteredNew];

 let submitted = data.submittedPlayers || [];

if (!submitted.includes(playerName)) {
  submitted.push(playerName);
}

await updateDoc(ref, { 
  words: updatedWords,
  submittedPlayers: submitted // ✅ NEW
});

  alert("Words submitted!");

  //if (
  //  updatedWords.length >= data.players.length * 3 &&
//    data.host === playerName
 // ) {
  //  let prepared = updatedWords.map(w => ({
   //   ...w,
  //    scrambled: scrambleWord(w.word),
   //   used: false
  //  }));

   // let ordered = alternateWords(prepared);
//
 //   await updateDoc(ref, {
 //     words: ordered,
 //     phase: "game",
 //     currentIndex: 0,
 //     time: 80
  //  });

  //  startTimer();
 // }
}

// ⏱️ TIMER
function startTimer() {
  clearInterval(interval);

  interval = setInterval(async () => {
    const ref = doc(db, "rooms", roomId);
    const snap = await getDoc(ref);
    const data = snap.data();

    if (!data) return;

    let time = data.time;

    if (time <= 0) {
      nextWord();
      return;
    }

    if (time <= 10 && time % 2 === 0) {
      playSound("tickSound");
    }

    await updateDoc(ref, { time: time - 1 });

  }, 1000);
}

// ➡️ NEXT WORD
let advancing = false;

async function nextWord() {
  if (advancing) return;
  advancing = true;

  const tick = document.getElementById("tickSound");
  if (tick) {
    tick.pause();
    tick.currentTime = 0;
  }

  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  const data = snap.data();

  if (!data) {
    advancing = false;
    return;
  }

  let index = data.currentIndex + 1;

  while (index < data.words.length && data.words[index].used) {
    index++;
  }

  if (index >= data.words.length) {
    await updateDoc(ref, { phase: "end" });
    advancing = false;
    return;
  }

  await updateDoc(ref, {
    currentIndex: index,
    time: 80
  });

  advancing = false;
}

// 🎯 GUESS
window.submitGuess = async function () {
  const guess = document.getElementById("guessInput").value.toLowerCase();
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  const data = snap.data();

  const current = data.words[data.currentIndex];

  if (!guess || guess.length < 4) return;
  if (/^(.)\1+$/.test(guess)) return;
  if (current.owner === playerName) return;

  if (guess === current.word) {

    let speedBonus = Math.max(data.time / 80, 0.2);
    let basePoints = usedHint ? 0.5 : 1;
    let totalPoints = basePoints * speedBonus;

    let scores = data.scores || {};
    let words = data.words;

    words[data.currentIndex].used = true;

    scores[playerName] = Number(((scores[playerName] || 0) + totalPoints).toFixed(2));
    scores[current.owner] = Number(((scores[current.owner] || 0) + 0.25).toFixed(2));

    await updateDoc(ref, { scores, words });

    playSound("correctSound");

    setTimeout(() => nextWord(), 800);
  }
};

// 💡 HINT
window.useHint = async function () {
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);

  const current = snap.data().words[snap.data().currentIndex];

  document.getElementById("hint").innerText = current.hint;
  usedHint = true;
};

// 🏆 FINAL SCORES
function renderScores(scores) {
  const json = JSON.stringify(scores);
  if (json === lastScoresJSON) return;
  lastScoresJSON = json;

  const div = document.getElementById("scores");
  div.innerHTML = "";

  let sorted = Object.entries(scores || {}).sort((a, b) => b[1] - a[1]);

  if (sorted.length > 0) {
    div.innerHTML += `<h2>🏆 Winner: ${sorted[0][0]}</h2>`;
  }

  sorted.forEach(([name, score]) => {
    div.innerHTML += `<p>${name}: ${score.toFixed(2)}</p>`;
  });
}

// 📊 LIVE SCORES
function renderLiveScores(scores) {
  const div = document.getElementById("liveScores");

  let sorted = Object.entries(scores || {})
    .sort((a, b) => b[1] - a[1]);

  div.innerHTML = "<h3>Scores</h3>";

  sorted.forEach(([name, score]) => {
    div.innerHTML += `<p>${name}: ${score.toFixed(2)}</p>`;
  });
}

// 🔁 REPLAY
window.replayGame = async function () {
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  const data = snap.data();

  if (data.host !== playerName) {
    alert("Only host can restart");
    return;
  }

  await updateDoc(ref, {
    phase: "lobby",
    words: [],
    currentIndex: 0,
    time: 80,
    scores: {}
  });
};

// ⏭️ SKIP
window.skipWord = function () {
  nextWord();
};

// 🔀 RESCRAMBLE
window.rescramble = async function () {
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  const data = snap.data();

  if (!data) return;

  let words = data.words;
  let current = words[data.currentIndex];

  if (!current) return;

  current.scrambled = scrambleWord(current.word);

  await updateDoc(ref, { words });
};
// ▶️ HOST START GAME MANUALLY
window.startGame = async function () {
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  const data = snap.data();

  if (data.host !== playerName) {
    alert("Only host can start");
    return;
  }

  if (!data.words || data.words.length < data.players.length * 3) {
    alert("Not all players submitted yet");
    return;
  }

  let prepared = data.words.map(w => ({
    ...w,
    scrambled: scrambleWord(w.word),
    used: false
  }));

  let ordered = alternateWords(prepared);

  await updateDoc(ref, {
    words: ordered,
    phase: "game",
    currentIndex: 0,
    time: 80
  });

  startTimer();
};
// 📱 MOBILE FIX (ENTER TO GUESS)
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    submitGuess();
  }
});