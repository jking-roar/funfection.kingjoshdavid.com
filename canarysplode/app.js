const canary = document.getElementById('canary');
const stage = document.getElementById('stage');
const tapsEl = document.getElementById('taps');
const tempoEl = document.getElementById('tempo');
const statusEl = document.getElementById('status');
const potentialEl = document.getElementById('potential');
const meterFill = document.getElementById('meter-fill');
const meter = document.querySelector('.meter');
const overlay = document.getElementById('overlay');
const resultEl = document.getElementById('result');
const again = document.getElementById('again');

let threshold, pressure, taps, lastTap, finished, frame;

function newGame() {
  threshold = 18 + Math.floor(Math.random() * 15);
  pressure = 0;
  taps = 0;
  lastTap = 0;
  finished = false;
  tapsEl.textContent = '0';
  tempoEl.textContent = 'Warming up';
  statusEl.textContent = 'It looks suspiciously calm.';
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden', 'true');
  canary.disabled = false;
  updateVisuals();
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(coolDown);
}

function updateVisuals() {
  const ratio = Math.min(pressure / threshold, 1);
  canary.style.setProperty('--bird-scale', Math.min(0.72 + ratio * 0.28, 1));
  stage.dataset.mood =
    ratio > 0.82 ? 'panic' : ratio > 0.58 ? 'worried' : ratio > 0.28 ? 'uneasy' : 'calm';
  const displayPercent = Math.round(ratio * 100);
  meterFill.style.width = `${displayPercent}%`;
  potentialEl.textContent = `${displayPercent}%`;
  meter.setAttribute('aria-valuenow', displayPercent);
}

function tapBird() {
  if (finished) return;
  const now = performance.now();
  const gap = lastTap ? now - lastTap : 1000;
  lastTap = now;
  taps++;
  pressure += 1;
  tapsEl.textContent = taps;

  const ratio = pressure / threshold;
  let animation = 'bump';
  if (gap < 260 || ratio > 0.58) animation = 'rattle';
  if (gap < 150 || ratio > 0.82) animation = 'panic';
  canary.classList.remove('bump', 'rattle', 'panic');
  void canary.offsetWidth;
  canary.classList.add(animation);

  if (gap < 190) tempoEl.textContent = 'Feather frenzy!';
  else if (gap < 400) tempoEl.textContent = 'Pecking fast';
  else tempoEl.textContent = 'Steady taps';

  if (ratio > 0.82) statusEl.textContent = 'It is shaking like a tiny volcano!';
  else if (ratio > 0.55) statusEl.textContent = 'The feathers are getting tense…';
  else if (ratio > 0.25) statusEl.textContent = 'Something is definitely brewing.';
  else statusEl.textContent = 'A little puffier. Keep going!';

  updateVisuals();
  if (pressure >= threshold) explode();
}

function coolDown(now) {
  if (!finished && lastTap && now - lastTap > 850 && pressure > 0) {
    pressure = Math.max(0, pressure - 0.012);
    if (now - lastTap > 1800) {
      tempoEl.textContent = 'Cooling off';
      statusEl.textContent =
        pressure > 1 ? 'The boom potential is fading…' : 'Calm again. Better get tapping!';
    }
    updateVisuals();
  }
  frame = requestAnimationFrame(coolDown);
}

function explode() {
  finished = true;
  canary.disabled = true;
  for (let i = 0; i < 28; i++) {
    const particle = document.createElement('i');
    particle.className = 'particle';
    const angle = (Math.PI * 2 * i) / 28;
    const distance = 120 + Math.random() * 180;
    particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
    particle.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    particle.style.background = i % 3 === 0 ? '#ee4b2b' : i % 2 ? '#ffd83d' : '#ff8a2a';
    stage.appendChild(particle);
    setTimeout(() => particle.remove(), 850);
  }
  resultEl.textContent = `That canary lasted ${taps} tap${taps === 1 ? '' : 's'}. The next one could pop sooner!`;
  setTimeout(() => {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    again.focus();
  }, 450);
}

canary.addEventListener('click', tapBird);
again.addEventListener('click', newGame);
newGame();
