let roomId = "";
let playerName = "";

async function createRoom() {
  playerName = nameInput.value;
  roomId = Math.random().toString(36).substring(2,7);

  await db.collection("rooms").doc(roomId).set({
    players: [playerName],
    host: playerName,
    phase: "lobby",
    words: [],
    currentIndex: 0,
    scores: {}
  });

  enterRoom();
}

function listenToRoom() {
  db.collection("rooms").doc(roomId)
    .onSnapshot(doc => {
      const data = doc.data();

      updateUI(data);
    });
}

function updateUI(data) {
  hideAll();

  if (data.phase === "lobby") show("room");
  if (data.phase === "submission") show("submission");
  if (data.phase === "game") show("game");
  if (data.phase === "end") show("scoreboard");

  playerList.innerText = data.players.join(", ");
}

async function submitWords() {
  const words = [
    { word: word1.value, hint: hint1.value, owner: playerName },
    { word: word2.value, hint: hint2.value, owner: playerName },
    { word: word3.value, hint: hint3.value, owner: playerName }
  ];

  const roomRef = db.collection("rooms").doc(roomId);
  const doc = await roomRef.get();

  let existing = doc.data().words || [];

  await roomRef.update({
    words: existing.concat(words)
  });
}
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

async function startGame() {
  const roomRef = db.collection("rooms").doc(roomId);
  const doc = await roomRef.get();

  let words = shuffle(doc.data().words);

  await roomRef.update({
    words,
    phase: "game",
    currentIndex: 0,
    time: 80
  });
}
function getCurrentWord(data) {
  return data.words[data.currentIndex];
}
function startTimer() {
  interval = setInterval(async () => {
    const ref = db.collection("rooms").doc(roomId);
    const doc = await ref.get();
    let time = doc.data().time;

    if (time <= 0) {
      nextWord();
      return;
    }

    await ref.update({ time: time - 1 });

  }, 1000);
}
async function nextWord() {
  const ref = db.collection("rooms").doc(roomId);
  const doc = await ref.get();

  let index = doc.data().currentIndex + 1;

  if (index >= doc.data().words.length) {
    await ref.update({ phase: "end" });
    return;
  }

  await ref.update({
    currentIndex: index,
    time: 80
  });
}
async function submitGuess() {
  const guess = guessInput.value.toLowerCase();
  const ref = db.collection("rooms").doc(roomId);
  const doc = await ref.get();
  const data = doc.data();

  const current = getCurrentWord(data);

  if (guess.length < 4) return;
  if (/^(.)\1+$/.test(guess)) return;

  if (guess === current.word) {

    let scores = data.scores;
    scores[playerName] = (scores[playerName] || 0) + (usedHint ? 0.5 : 1);

    scores[current.owner] = (scores[current.owner] || 0) + 0.25;

    let newTime = Math.min(data.time + 3, 100);

    await ref.update({
      scores,
      time: newTime
    });
  }
}
function useHint(data) {
  hint.innerText = getCurrentWord(data).hint;
  usedHint = true;
}
function renderScores(scores) {
  scoresDiv.innerHTML = "";

  Object.entries(scores).forEach(([name, score]) => {
    scoresDiv.innerHTML += `<p>${name}: ${score}</p>`;
  });
}