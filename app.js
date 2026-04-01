// 🔥 FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, getDoc, onSnapshot } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔌 CONFIG (PUT YOUR REAL KEYS)
const firebaseConfig = {
  apiKey: "AIzaSyA3s1IM2z5Ws6MREn9ZLohkY5_P3yBgwRs",
  authDomain: "word-party-6de5a.firebaseapp.com",
  projectId: "word-party-6de5a",
};

// INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔥 STATE
let roomId = "";
let playerName = "";
let interval = null;
let usedHint = false;

// 🏠 CREATE ROOM
window.createRoom = async function () {
  playerName = document.getElementById("nameInput").value;
  roomId = Math.random().toString(36).substring(2, 7);

  await setDoc(doc(db, "rooms", roomId), {
    players: [playerName],
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

  document.getElementById("playerList").innerText = data.players.join(", ");

  if (data.phase === "game") {
    const current = data.words[data.currentIndex];
    if (!current) return;

  if (current.owner === playerName) {
  document.getElementById("scrambledWord").innerText = "⛔ Your word";
} else {
  document.getElementById("scrambledWord").innerText = current.scrambled;
}//scrambleWord(current.word);
    document.getElementById("timer").innerText = `Time: ${data.time}`;
  }
  renderLiveScores(data.scores);
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

  let updatedWords = [...existing, ...words];

  await updateDoc(ref, {
    words: updatedWords
  });

  alert("Words submitted!");

  // 🔥 AUTO START CHECK
  const totalPlayers = data.players.length;
const totalWordsNeeded = totalPlayers * 3;

if (updatedWords.length >= totalWordsNeeded) {
  alert("All players submitted. Starting game...");

  let shuffled = updatedWords.map(w => ({
    ...w,
    scrambled: scrambleWord(w.word)
  })).sort(() => Math.random() - 0.5);

  await updateDoc(ref, {
    words: shuffled,
    phase: "game",
    currentIndex: 0,
    time: 80
  });

  startTimer();
}
};

// 🔀 SHUFFLE
function scrambleWord2(word) {
  return word.split("").sort(() => Math.random() - 0.5).join("");
}

// ▶️ START GAME
 function scrambleWord(word) {
  return word.split("").sort(() => Math.random() - 0.5).join("");
}

window.startGame = async function () {
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);

  let words = snap.data().words.map(w => ({
    ...w,
    scrambled: scrambleWord(w.word)
  }));

  words = words.sort(() => Math.random() - 0.5);

  await updateDoc(ref, {
    words,
    phase: "game",
    currentIndex: 0,
    time: 80
  });

  startTimer();
};

// ⏱️ TIMER
function startTimer() {
  clearInterval(interval);

  interval = setInterval(async () => {
    const ref = doc(db, "rooms", roomId);
    const snap = await getDoc(ref);
    let time = snap.data().time;

    if (time <= 0) {
      nextWord();
      return;
    }

    await updateDoc(ref, { time: time - 1 });

  }, 1000);
  if (time <= 10) {
  document.getElementById("tickSound").play();
}
}

// ➡️ NEXT WORD
let advancing = false;

async function nextWord() {
  if (advancing) return;
  advancing = true;

  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);

  let data = snap.data();
  let index = data.currentIndex + 1;

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

 if (guess === current.word) {

  if (current.owner === playerName) {
    alert("You can't guess your own word!");
    return;
  }

  let scores = data.scores || {};
  let speedBonus = Math.max(data.time / 80, 0.2); // 0.2 min

let basePoints = usedHint ? 0.5 : 1;
let totalPoints = basePoints * speedBonus;

scores[playerName] = (scores[playerName] || 0) + totalPoints;
  //scores[playerName] = (scores[playerName] || 0) + (usedHint ? 0.5 : 1);
  scores[current.owner] = (scores[current.owner] || 0) + 0.25;

  let newTime = Math.min(data.time + 3, 100);

  await updateDoc(ref, {
    scores,
    time: newTime
  });

  alert("Correct!");

  // 🔥 MOVE TO NEXT WORD IMMEDIATELY
  nextWord();
}
document.getElementById("correctSound").play();
document.getElementById("guessInput").value = "";

};

// 💡 HINT
window.useHint = async function () {
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);

  const current = snap.data().words[snap.data().currentIndex];

  document.getElementById("hint").innerText = current.hint;
  usedHint = true;
};

// 🏆 SCORES
function renderScores(scores) {
  const div = document.getElementById("scores");
  div.innerHTML = "";

  Object.entries(scores).forEach(([name, score]) => {
    div.innerHTML += `<p>${name}: ${score}</p>`;
  });
}

//Rescramble
window.rescramble = async function () {
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  const data = snap.data();

  let words = data.words;
  let current = words[data.currentIndex];

  current.scrambled = scrambleWord(current.word);

  words[data.currentIndex] = current;

  await updateDoc(ref, { words });
};

//Live Scores
function renderLiveScores(scores) {
  const div = document.getElementById("liveScores");

  let sorted = Object.entries(scores || {})
    .sort((a, b) => b[1] - a[1]);

  div.innerHTML = "<h3>🏆 Live Scores</h3>";

  sorted.forEach(([name, score]) => {
    div.innerHTML += `<p>${name}: ${score.toFixed(2)}</p>`;
  });
}

//Skip
window.skipWord = async function () {
  const ref = doc(db, "rooms", roomId);

  alert("Word skipped!");
  nextWord();
};