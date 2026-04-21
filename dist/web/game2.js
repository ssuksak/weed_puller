/**
 * 뽑아라! 잡초 — 매치 퍼즐 게임
 * 같은 잡초를 스와이프로 연결해 뽑는 캐주얼 퍼즐
 */

// ============ SUPABASE RANKING ============
const SUPABASE_URL = 'https://puwthqzbounohrdmacgo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3RocXpib3Vub2hyZG1hY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjA2MzMsImV4cCI6MjA5MDg5NjYzM30.AxUjNNTnLv2xVNC_UMFE3o0x0-s_tFJnRcMr7mBNOy0';

async function submitScore(nickname, score, maxCombo, surviveTime) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/weed_puller_rankings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        nickname: nickname.slice(0, 20),
        score,
        max_combo: maxCombo,
        survive_time: surviveTime,
      }),
    });
    return res.ok;
  } catch (e) { return false; }
}

async function getTopRankings(limit = 10) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/weed_puller_rankings?select=nickname,score,max_combo,survive_time,created_at&order=score.desc&limit=${limit}`,
      { headers: { 'apikey': SUPABASE_KEY } }
    );
    return res.ok ? await res.json() : [];
  } catch (e) { return []; }
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ============ AUDIO ============
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null, bgmGain = null, bgmPlaying = false, bgmInterval = null, bgmNextTime = 0, bgmIdx = 0;
let bgmBassIdx = 0, bgmBassNext = 0, bgmDrumNext = 0, bgmDrumBeat = 0;
let soundEnabled = localStorage.getItem('weedpuller_sound') !== 'off';

// 사운드 토글 버튼
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-sound');
  if (btn) {
    btn.textContent = soundEnabled ? '🔊 사운드 ON' : '🔇 사운드 OFF';
    btn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('weedpuller_sound', soundEnabled ? 'on' : 'off');
      btn.textContent = soundEnabled ? '🔊 사운드 ON' : '🔇 사운드 OFF';
      if (!soundEnabled && bgmPlaying) stopBGM();
    });
  }
});

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
    bgmGain = audioCtx.createGain();
    bgmGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    bgmGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// 🎵 동화풍 멜로디 (부드럽고 밝게)
const BGM_CALM = [
  [523,1],[494,0.5],[523,0.5],[587,1],[523,1],
  [494,0.5],[440,0.5],[494,1],[523,1],
  [440,1],[392,0.5],[440,0.5],[494,1],[440,1],
  [392,0.5],[349,0.5],[392,1],[440,1],
];
// 🎵 중반 멜로디 (약간 긴장)
const BGM_MID = [
  [523,0.5],[587,0.5],[659,0.5],[587,0.5],
  [523,0.5],[494,0.5],[523,1],
  [587,0.5],[659,0.5],[698,0.5],[659,0.5],
  [587,0.5],[523,0.5],[587,1],
];
// 🎵 긴장 멜로디 (빠르고 단조)
const BGM_TENSE = [
  [523,0.25],[494,0.25],[466,0.25],[440,0.25],
  [466,0.5],[523,0.5],[587,0.5],[523,0.5],
  [494,0.25],[466,0.25],[440,0.25],[392,0.25],
  [440,0.5],[494,0.5],[523,1],
];
const BGM_BASS = [
  [131,1],[165,1],[147,1],[131,1],
  [165,1],[175,1],[147,1],[131,1],
];

function startBGM() {
  if (bgmPlaying || !soundEnabled) return;
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  bgmPlaying = true; bgmIdx = 0; bgmBassIdx = 0; bgmDrumBeat = 0;
  bgmNextTime = bgmBassNext = bgmDrumNext = audioCtx.currentTime;
  scheduleBGM();
}
function scheduleBGM() {
  if (!bgmPlaying || !audioCtx) return;
  const mel = feverMode ? BGM_TENSE : BGM_CALM;
  // 시간에 따라 점진적으로 빨라짐
  const gameProgress = 1 - (timeLeft / 30); // 0→1
  const baseTempo = 0.18 - gameProgress * 0.06; // 0.18→0.12
  const tempo = feverMode ? Math.min(baseTempo, 0.13) : Math.max(baseTempo, 0.10);
  const mk = (type, freq, time, dur, vol) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(bgmGain); o.type = type;
    o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + dur);
    o.start(time); o.stop(time + dur);
  };
  while (bgmNextTime < audioCtx.currentTime + 0.5) {
    // 폭탄 있으면 긴장 멜로디!
    const hasBombs = typeof countBombsInGrid === 'function' && countBombsInGrid() > 0;
    const useMel = hasBombs ? BGM_TENSE : timeLeft <= 5 ? BGM_TENSE : timeLeft <= 15 ? BGM_MID : BGM_CALM;
    const [f, d] = useMel[bgmIdx % useMel.length];
    // 악기: 폭탄 있으면 날카롭게
    const waveType = hasBombs ? 'sawtooth' : timeLeft <= 5 ? 'square' : timeLeft <= 12 ? 'triangle' : 'sine';
    // 볼륨
    const vol = hasBombs ? 0.28 : 0.2 + gameProgress * 0.15;
    mk(waveType, f, bgmNextTime, d * tempo * 0.9, vol);

    // 폭탄 있으면 불안한 저음 추가
    if (hasBombs && bgmIdx % 2 === 0) {
      mk('sine', f * 0.5, bgmNextTime, d * tempo * 0.5, 0.1);
    }
    bgmNextTime += d * tempo; bgmIdx++;
  }
  const bt = tempo * 4;
  while (bgmBassNext < audioCtx.currentTime + 0.5) {
    const [f, d] = BGM_BASS[bgmBassIdx % BGM_BASS.length];
    const bassVol = 0.08 + gameProgress * 0.15; // 처음 약하게 → 점점 강하게
    const bassType = timeLeft <= 10 ? 'sawtooth' : 'sine'; // 처음 부드럽게 → 나중 거칠게
    mk(bassType, f, bgmBassNext, d * bt * 0.4, bassVol);
    if (gameProgress > 0.3) mk('sine', f * 0.5, bgmBassNext, d * bt * 0.3, bassVol * 0.6);
    bgmBassNext += d * bt; bgmBassIdx++;
  }
  const dt2 = tempo * (2 - gameProgress * 0.7); // 점진적으로 빨라짐
  while (bgmDrumNext < audioCtx.currentTime + 0.5) {
    const beat = bgmDrumBeat % 4;
    const hasBombs2 = typeof countBombsInGrid === 'function' && countBombsInGrid() > 0;
    const kickVol = hasBombs2 ? 0.35 : 0.15 + gameProgress * 0.25;
    if (beat === 0 || beat === 2) mk('sine', hasBombs2 ? 100 : 150, bgmDrumNext, 0.1, kickVol);
    if (beat === 1 || beat === 3) {
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.04, audioCtx.sampleRate);
      const sn = buf.getChannelData(0);
      for (let i = 0; i < sn.length; i++) sn[i] = (Math.random() * 2 - 1) * (1 - i / sn.length);
      const n = audioCtx.createBufferSource(), ng = audioCtx.createGain();
      n.buffer = buf; n.connect(ng); ng.connect(bgmGain);
      ng.gain.setValueAtTime(0.05 + gameProgress * 0.12, bgmDrumNext);
      ng.gain.exponentialRampToValueAtTime(0.01, bgmDrumNext + 0.04);
      n.start(bgmDrumNext);
    }
    bgmDrumNext += dt2 * 0.25; bgmDrumBeat++;
  }
  bgmInterval = setTimeout(scheduleBGM, 150);
}
function stopBGM() { bgmPlaying = false; clearTimeout(bgmInterval); }

// ============ PAUSE SYSTEM ============
function pauseGame() {
  if (!gameRunning || paused || gameOver) return;
  paused = true;
  clearInterval(timerInterval);
  stopBGM();
}

function resumeGame() {
  if (!gameRunning || !paused || gameOver) return;
  paused = false;
  lastTime = 0; // 다음 프레임에서 dt 리셋
  startBGM();
  // 타이머 재시작
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (paused) return;
    timeLeft--; updateHUD();
    if (timeLeft <= 10 && timeLeft > 0) sfx('countdown');
    if (timeLeft <= 0) endGame();
  }, 1000);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseGame();
  }
});

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 중앙 박스
  const bW = 240, bH = 140;
  const bX = (canvas.width - bW) / 2, bY = (canvas.height - bH) / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  const br = 20;
  ctx.moveTo(bX + br, bY); ctx.lineTo(bX + bW - br, bY);
  ctx.quadraticCurveTo(bX + bW, bY, bX + bW, bY + br);
  ctx.lineTo(bX + bW, bY + bH - br);
  ctx.quadraticCurveTo(bX + bW, bY + bH, bX + bW - br, bY + bH);
  ctx.lineTo(bX + br, bY + bH);
  ctx.quadraticCurveTo(bX, bY + bH, bX, bY + bH - br);
  ctx.lineTo(bX, bY + br);
  ctx.quadraticCurveTo(bX, bY, bX + br, bY);
  ctx.closePath(); ctx.fill();
  // 텍스트
  ctx.fillStyle = '#191F28';
  ctx.font = 'bold 28px Jua, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('⏸ 일시정지', canvas.width / 2, bY + bH * 0.35);
  ctx.fillStyle = '#8B95A1';
  ctx.font = '16px Jua, sans-serif';
  ctx.fillText('터치하면 재개', canvas.width / 2, bY + bH * 0.7);
  ctx.restore();
}

function drawTutorialOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2, cy = canvas.height / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // 손가락 스와이프 애니메이션
  const t = Date.now() / 600;
  const fingerX = cx + Math.sin(t) * 60;
  ctx.font = '48px sans-serif';
  ctx.fillStyle = 'white';
  ctx.fillText('👆', fingerX, cy - 30);
  // 안내 텍스트
  ctx.font = 'bold 22px Jua, sans-serif';
  ctx.fillText('같은 잡초를 쓱~ 연결하세요!', cx, cy + 40);
  ctx.font = '16px Jua, sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText('터치하여 시작', cx, cy + 80);
  ctx.restore();
}

function sfx(type, extra) {
  if (!audioCtx || !soundEnabled) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const mk = () => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); return { o, g }; };

  if (type === 'pop') {
    const pitch = 300 + (extra || 0) * 100;
    const { o, g } = mk(); o.type = 'sine';
    o.frequency.setValueAtTime(pitch, now);
    o.frequency.exponentialRampToValueAtTime(pitch * 2, now + 0.06);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    o.start(now); o.stop(now + 0.1);
  } else if (type === 'chain') {
    const pitch = 400 + (extra || 0) * 150;
    [0, 0.04, 0.08].forEach((d, i) => {
      const { o, g } = mk(); o.type = 'triangle';
      o.frequency.setValueAtTime(pitch + i * 100, now + d);
      g.gain.setValueAtTime(0.15, now + d);
      g.gain.exponentialRampToValueAtTime(0.01, now + d + 0.08);
      o.start(now + d); o.stop(now + d + 0.08);
    });
  } else if (type === 'bigpop') {
    const { o, g } = mk(); o.type = 'sine';
    o.frequency.setValueAtTime(200, now);
    o.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    o.start(now); o.stop(now + 0.15);
    // 노이즈
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
    const sn = buf.getChannelData(0);
    for (let i = 0; i < sn.length; i++) sn[i] = (Math.random() * 2 - 1) * (1 - i / sn.length);
    const n = audioCtx.createBufferSource(), ng = audioCtx.createGain();
    n.buffer = buf; n.connect(ng); ng.connect(audioCtx.destination);
    ng.gain.setValueAtTime(0.15, now + 0.06); ng.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    n.start(now + 0.06);
  } else if (type === 'miss') {
    const { o, g } = mk(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(300, now);
    o.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    o.start(now); o.stop(now + 0.25);
  } else if (type === 'fever') {
    [523, 659, 784, 1046].forEach((f, i) => {
      const { o, g } = mk(); o.type = 'square';
      o.frequency.setValueAtTime(f, now + i * 0.06);
      g.gain.setValueAtTime(0.1, now + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.12);
      o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.12);
    });
  } else if (type === 'countdown') {
    const { o, g } = mk(); o.type = 'sine';
    o.frequency.setValueAtTime(880, now);
    g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    o.start(now); o.stop(now + 0.1);
  } else if (type === 'go') {
    [523, 784, 1046].forEach((f, i) => {
      const { o, g } = mk(); o.type = 'square';
      o.frequency.setValueAtTime(f, now + i * 0.06);
      g.gain.setValueAtTime(0.12, now + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.1);
      o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.1);
    });
  } else if (type === 'end') {
    [440, 392, 349, 261].forEach((f, i) => {
      const { o, g } = mk(); o.type = 'triangle';
      o.frequency.setValueAtTime(f, now + i * 0.2);
      g.gain.setValueAtTime(0.12, now + i * 0.2);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.25);
      o.start(now + i * 0.2); o.stop(now + i * 0.2 + 0.25);
    });
  } else if (type === 'newrecord') {
    [523, 0, 659, 0, 784, 0, 1046].forEach((f, i) => {
      if (!f) return;
      const { o, g } = mk(); o.type = 'square';
      o.frequency.setValueAtTime(f, now + i * 0.08);
      g.gain.setValueAtTime(0.1, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
      o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.2);
    });
  } else if (type === 'drop') {
    const { o, g } = mk(); o.type = 'sine';
    o.frequency.setValueAtTime(600, now);
    o.frequency.exponentialRampToValueAtTime(200, now + 0.08);
    g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    o.start(now); o.stop(now + 0.08);
  }
}

// ============ STATE ============
const COLS = 6, ROWS = 8;
const WEED_COUNT = 4; // 4종류 (매치 확률 높이기)
let grid = []; // grid[col][row] = { type, x, y, targetY, ... }
let particles = [];
let score = 0, combo = 0, maxCombo = 0, chainLevel = 0;
let gameRunning = false, gameOver = false;
let pullCount = 0, elapsed = 0;
let feverMode = false, feverTimer = 0;
let screenShake = 0, shakeX = 0, shakeY = 0;
let animating = false;
let animTimeout = 0;
let paused = false;
let showTutorial = false;

// 폭탄 시스템 — 그리드 안에 섞여 내려옴
let bombCount = 0;
let swipeCount = 0;
let nextBombAt = 3;
let needsRebuild = false; // removeGroup 후 리빌드 필요 플래그
let timeLeft = 30;
let timerInterval = null;

// High score
let highScore = parseInt(localStorage.getItem('weedpuller_hs') || '0');
let isNewRecord = false;

// Grid geometry
let gridX = 0, gridY = 0, cellW = 0, cellH = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const pad = 16;
  const aW = canvas.width - pad * 2;
  const aH = canvas.height * 0.65;
  cellW = aW / COLS;
  cellH = aH / ROWS;
  gridX = pad;
  gridY = canvas.height * 0.14;
  // 셀 위치 업데이트
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (grid[c] && grid[c][r]) {
        grid[c][r].targetX = gridX + c * cellW + cellW / 2;
        grid[c][r].targetY = gridY + r * cellH + cellH / 2;
      }
    }
  }
}
window.addEventListener('resize', () => { resize(); invalidateBgCache(); });
resize();

// ============ WEED TYPES ============
const TYPES = [
  { id: 0, name: '민들레', bg: '#B5D8B8', face: '#E2F0E4', accent: '#6BA37A', expr: 'happy', headDeco: 'dandelion' },
  { id: 1, name: '쇠비름', bg: '#E8A8A0', face: '#F8E0DC', accent: '#C06060', expr: 'laugh', headDeco: 'purslane' },
  { id: 2, name: '바랭이', bg: '#88C0A0', face: '#D0E8D8', accent: '#4D8868', expr: 'wink', headDeco: 'crabgrass' },
  { id: 3, name: '명아주', bg: '#A8A0C8', face: '#E4E0F0', accent: '#706098', expr: 'surprised', headDeco: 'goosefoot' },
];

// ============ CELL ============
class Cell {
  constructor(col, row, typeId) {
    this.col = col;
    this.row = row;
    this.type = TYPES[typeId];
    this.typeId = typeId;
    this.x = gridX + col * cellW + cellW / 2;
    this.y = gridY + row * cellH + cellH / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.r = Math.min(cellW, cellH) * 0.42;
    this.scale = 0; // 등장 애니메이션
    this.wobble = Math.random() * Math.PI * 2;
    this.removing = false;
    this.removeAnim = 0;
    this.selected = false;
    this.shake = 0;
    this.isBomb = false;
    this.blinkTimer = Math.random() * 3; // 눈 깜빡임 타이머 (3초 주기)
    this._blink = false;
  }

  update(dt) {
    this.wobble += dt * 1.5;
    // 스케일 애니메이션
    if (this.scale < 1 && !this.removing) {
      this.scale = Math.min(1, this.scale + dt * 6);
    }
    // 제거 애니메이션
    if (this.removing) {
      this.removeAnim += dt * 5;
      this.scale = Math.max(0, 1 - this.removeAnim);
    }
    // 낙하 (부드럽게 목표 위치로)
    const dy = this.targetY - this.y;
    if (Math.abs(dy) > 0.5) {
      this.y += dy * dt * 12;
    } else {
      this.y = this.targetY;
    }
    if (this.shake > 0) this.shake *= 0.85;

    // 눈 깜빡임
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0 && !this._blink) {
      this._blink = true;
      this._blinkDur = 0;
    }
    if (this._blink) {
      if (this._blinkDur === undefined) this._blinkDur = 0;
      this._blinkDur += dt;
      if (this._blinkDur >= 0.15) {
        this._blink = false;
        this._blinkDur = 0;
        this.blinkTimer = 2.5 + Math.random() * 2; // 다음 깜빡임까지 2.5~4.5초
      }
    }
  }

  draw() {
    if (this.scale <= 0.01) this.scale = 0.1; // 안 보이는 셀 방지
    ctx.save();

    // idle: 상하 흔들림 (sin 기반, 2~3px)
    const idleY = Math.sin(this.wobble) * 2.5;
    // selected: 통통 바운스 (1.1~1.15)
    const selBounce = this.selected ? 1.1 + Math.sin(Date.now() * 0.008) * 0.05 : 1;
    const sc = this.scale * (1 + Math.sin(this.wobble) * 0.02) * selBounce;
    const r = this.r * sc;
    const sx = (Math.random() - 0.5) * this.shake;
    const x = this.x + sx, y = this.y + idleY;

    const t = this.type;

    // 선택 하이라이트 (글로우 + 스케일업)
    if (this.selected) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(x, y, r * 1.1, 0, Math.PI * 2); ctx.fill();
    }

    // --- 잡초 몸체 ---
    const faceR = r * 0.88;
    const w = this.wobble;

    // 작은 잎사귀 (몸체 양옆에 삐져나옴)
    ctx.fillStyle = t.accent + 'AA';
    for (let li = 0; li < 3; li++) {
      const la = (li / 3) * Math.PI * 2 + w * 0.1 + 1;
      const lx = x + Math.cos(la) * faceR * 0.85;
      const ly = y + Math.sin(la) * faceR * 0.7;
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(la);
      ctx.beginPath(); ctx.ellipse(0, 0, faceR * 0.2, faceR * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 부드러운 그림자
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = faceR * 0.35;
    ctx.shadowOffsetY = faceR * 0.1;
    ctx.fillStyle = t.accent;
    ctx.beginPath(); ctx.arc(x, y, faceR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 메인 몸체
    ctx.fillStyle = t.bg;
    ctx.beginPath(); ctx.arc(x, y, faceR * 0.93, 0, Math.PI * 2); ctx.fill();

    // 밝은 그라데이션 (상단)
    const faceGrad = ctx.createRadialGradient(x - faceR * 0.15, y - faceR * 0.3, faceR * 0.05, x, y, faceR);
    faceGrad.addColorStop(0, t.face);
    faceGrad.addColorStop(0.5, t.bg);
    faceGrad.addColorStop(1, t.bg);
    ctx.fillStyle = faceGrad;
    ctx.beginPath(); ctx.arc(x, y, faceR * 0.91, 0, Math.PI * 2); ctx.fill();

    // 하단 입체감
    ctx.fillStyle = t.accent + '30';
    ctx.beginPath(); ctx.arc(x, y + faceR * 0.1, faceR * 0.9, 0.1 * Math.PI, 0.9 * Math.PI); ctx.fill();

    // 외곽선 (토스 느낌 — 얇고 세련되게)
    ctx.strokeStyle = t.accent + 'CC';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, faceR, 0, Math.PI * 2); ctx.stroke();

    // 글로시 반사
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(x - faceR * 0.08, y - faceR * 0.32, faceR * 0.45, faceR * 0.2, -0.1, 0, Math.PI * 2); ctx.fill();

    // --- 머리 장식 (잡초 특징!) ---
    const deco = t.headDeco;
    if (deco === 'dandelion') {
      // 민들레 — 홀씨 솜털 뭉치 (더 부드러운 색)
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const dr = 2.5 + Math.sin(i * 1.7) * 1;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * faceR * 0.38, y - faceR * 0.95 + Math.sin(a) * faceR * 0.32, dr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#FFF8E1';
      ctx.beginPath(); ctx.arc(x, y - faceR * 0.95, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#A5D6A7'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - faceR * 0.82); ctx.lineTo(x, y - faceR * 0.6); ctx.stroke();
    } else if (deco === 'purslane') {
      // 쇠비름 — 두꺼운 둥근 잎 여러 개 (파스텔 핑크)
      ctx.fillStyle = '#E57393';
      [[-0.3, -0.85, 5], [0, -1.0, 6], [0.3, -0.85, 5], [-0.15, -0.95, 4], [0.15, -0.95, 4]].forEach(([dx, dy, sz]) => {
        ctx.beginPath(); ctx.ellipse(x + faceR * dx, y + faceR * dy, sz, sz * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = '#A1887F'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y - faceR * 0.8); ctx.lineTo(x, y - faceR * 0.6); ctx.stroke();
    } else if (deco === 'crabgrass') {
      // 바랭이 — 뾰족한 풀잎 여러 개 (부드러운 초록)
      ctx.strokeStyle = '#4A9E5C'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      [[-0.3, -0.4], [-0.15, -0.2], [0, 0], [0.15, -0.2], [0.3, -0.4]].forEach(([dx, rot]) => {
        ctx.save(); ctx.translate(x + faceR * dx, y - faceR * 0.8); ctx.rotate(rot);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -faceR * 0.4); ctx.stroke();
        ctx.restore();
      });
    } else if (deco === 'goosefoot') {
      // 명아주 — 다이아몬드 잎 + 보라 가루 (소프트 퍼플)
      ctx.fillStyle = '#9575CD';
      [[-0.25, -0.9, -0.3], [0, -1.05, 0], [0.25, -0.9, 0.3]].forEach(([dx, dy, rot]) => {
        ctx.save(); ctx.translate(x + faceR * dx, y + faceR * dy); ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0); ctx.closePath();
        ctx.fill(); ctx.restore();
      });
      ctx.fillStyle = 'rgba(206,162,216,0.5)';
      ctx.beginPath(); ctx.arc(x + 3, y - faceR * 1.05, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x - 4, y - faceR * 0.92, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // --- 폭탄이면 다르게 그리기 ---
    if (this.isBomb) {
      initBombState(this);
      const danger = 1 - (this._bombTimer / this._bombMaxTimer);
      // 빨간 글로우
      ctx.fillStyle = `rgba(255,0,0,${0.1 + danger * 0.25})`;
      ctx.beginPath(); ctx.arc(x, y, faceR * 1.6 + Math.sin(Date.now()*0.01)*4, 0, Math.PI*2); ctx.fill();
      // 폭탄 외곽 (검정)
      ctx.fillStyle = '#37474F';
      ctx.beginPath(); ctx.arc(x, y, faceR, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#546E7A';
      ctx.beginPath(); ctx.arc(x-faceR*0.08, y-faceR*0.08, faceR*0.88, 0, Math.PI*2); ctx.fill();
      // 위험색 오버레이
      ctx.fillStyle = `rgba(255,0,0,${danger * 0.35})`;
      ctx.beginPath(); ctx.arc(x, y, faceR*0.85, 0, Math.PI*2); ctx.fill();
      // 반사광
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.ellipse(x-faceR*0.2, y-faceR*0.35, faceR*0.3, faceR*0.12, -0.2, 0, Math.PI*2); ctx.fill();
      // 심지+불꽃
      ctx.strokeStyle = '#795548'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y-faceR*0.85); ctx.quadraticCurveTo(x+6, y-faceR-6, x+2, y-faceR-12); ctx.stroke();
      const fl = Math.sin(Date.now()*0.02);
      ctx.fillStyle = '#FF6D00';
      ctx.beginPath(); ctx.arc(x+2, y-faceR-14, 5+fl*2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFAB00';
      ctx.beginPath(); ctx.arc(x+2, y-faceR-15, 3+fl, 0, Math.PI*2); ctx.fill();
      // 카운트다운
      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${faceR*0.7}px Jua, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(this._bombTimer), x, y+2);
      // 진행도 바
      const bW = faceR*2.2, bH = 5, bX = x-bW/2, bY = y+faceR+6;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(bX, bY, bW, bH);
      const prog = this._bombTaps / this._bombMaxTaps;
      ctx.fillStyle = prog>0.7?'#4CAF50':prog>0.4?'#FFAB00':'#F44336';
      ctx.fillRect(bX, bY, bW*prog, bH);
      // 힌트
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 10px Jua, sans-serif';
      ctx.fillText(`👆${this._bombTaps}/${this._bombMaxTaps}`, x, bY+bH+10);
      ctx.restore();
      return; // 폭탄이면 여기서 끝 (일반 표정 안 그림)
    }

    // --- 표정 ---
    drawFace(t.expr, x, y, faceR, this._blink);

    ctx.restore();
  }

  contains(px, py) {
    return (px - this.x) ** 2 + (py - this.y) ** 2 < (this.r * 1.3) ** 2;
  }
}

// ============ FACES (귀엽고 세련되게) ============
function drawFace(type, x, y, r, blink) {
  const s = r * 0.9;
  const eyeY = y - s * 0.06;
  const eyeSpacing = s * 0.24;
  const eyeR = s * 0.17;

  // 헬퍼: 눈 감은 모양 (가로 선)
  function drawClosedEye(ex, ey, eR) {
    ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - eR * 0.7, ey);
    ctx.quadraticCurveTo(ex, ey + eR * 0.3, ex + eR * 0.7, ey);
    ctx.stroke();
  }

  // 헬퍼: 열린 눈 (흰자 + 눈동자 + 하이라이트)
  function drawOpenEye(ex, ey, eR, pupilScale, pupilOY) {
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(ex, ey, eR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2D2D2D';
    ctx.beginPath(); ctx.arc(ex, ey + (pupilOY || 0), eR * (pupilScale || 0.55), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(ex + 1.5, ey - 2, eR * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(ex - 1, ey + 1, eR * 0.12, 0, Math.PI * 2); ctx.fill();
  }

  // 공통 볼터치 (모든 표정에 적용)
  function drawCheeks() {
    ctx.fillStyle = 'rgba(255,160,180,0.30)';
    ctx.beginPath(); ctx.arc(x - s * 0.32, y + s * 0.1, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.32, y + s * 0.1, s * 0.1, 0, Math.PI * 2); ctx.fill();
  }

  if (type === 'angry') {
    if (blink) {
      drawClosedEye(x - eyeSpacing, eyeY, eyeR);
      drawClosedEye(x + eyeSpacing, eyeY, eyeR);
    } else {
      drawOpenEye(x - eyeSpacing, eyeY, eyeR, 0.6, 1);
      drawOpenEye(x + eyeSpacing, eyeY, eyeR, 0.6, 1);
    }
    // 화난 눈썹
    ctx.strokeStyle = '#4A4A4A'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - eyeSpacing - eyeR, eyeY - eyeR * 1.2);
    ctx.lineTo(x - eyeSpacing + eyeR * 0.5, eyeY - eyeR * 0.6);
    ctx.moveTo(x + eyeSpacing + eyeR, eyeY - eyeR * 1.2);
    ctx.lineTo(x + eyeSpacing - eyeR * 0.5, eyeY - eyeR * 0.6);
    ctx.stroke();
    // 입 (뾰로통)
    ctx.strokeStyle = '#4A4A4A'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y + s * 0.18, s * 0.08, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
    drawCheeks();
  } else if (type === 'happy') {
    if (blink) {
      drawClosedEye(x - eyeSpacing, eyeY, eyeR);
      drawClosedEye(x + eyeSpacing, eyeY, eyeR);
    } else {
      drawOpenEye(x - eyeSpacing, eyeY, eyeR, 0.55, -1);
      drawOpenEye(x + eyeSpacing, eyeY, eyeR, 0.55, -1);
    }
    // 웃는 입
    ctx.strokeStyle = '#4A4A4A'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y + s * 0.12, s * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    drawCheeks();
  } else if (type === 'surprised') {
    if (blink) {
      drawClosedEye(x - eyeSpacing, eyeY, eyeR * 1.1);
      drawClosedEye(x + eyeSpacing, eyeY, eyeR * 1.1);
    } else {
      drawOpenEye(x - eyeSpacing, eyeY, eyeR * 1.1, 0.4, 0);
      drawOpenEye(x + eyeSpacing, eyeY, eyeR * 1.1, 0.4, 0);
    }
    // O 입
    ctx.fillStyle = '#4A4A4A';
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.18, s * 0.06, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    drawCheeks();
  } else if (type === 'wink') {
    if (blink) {
      drawClosedEye(x - eyeSpacing, eyeY, eyeR);
      drawClosedEye(x + eyeSpacing, eyeY, eyeR);
    } else {
      // 왼쪽 눈 (정상)
      drawOpenEye(x - eyeSpacing, eyeY, eyeR, 0.55, 0);
      // 오른쪽 눈 (윙크 - 반달)
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x + eyeSpacing, eyeY, eyeR * 0.6, 0.05 * Math.PI, 0.95 * Math.PI); ctx.stroke();
    }
    // 웃는 입
    ctx.strokeStyle = '#4A4A4A'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y + s * 0.12, s * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    drawCheeks();
  } else if (type === 'laugh') {
    // laugh는 이미 눈 감은 스타일이므로 blink 무관
    ctx.fillStyle = '#2D2D2D';
    ctx.beginPath(); ctx.arc(x - eyeSpacing, eyeY, eyeR * 0.7, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing, eyeY, eyeR * 0.7, Math.PI, 2 * Math.PI); ctx.fill();
    // 크게 웃는 입
    ctx.fillStyle = '#4A4A4A';
    ctx.beginPath(); ctx.arc(x, y + s * 0.14, s * 0.12, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#F48FB1';
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.2, s * 0.06, s * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    drawCheeks();
  }
}

// ============ GRID LOGIC ============
function initGrid() {
  grid = new Array(COLS);
  for (let c = 0; c < COLS; c++) {
    grid[c] = new Array(ROWS);
    for (let r = 0; r < ROWS; r++) {
      grid[c][r] = new Cell(c, r, randomType());
    }
  }
  ensureMatches();
}

// 매치 최소 3개 보장 — 없으면 강제로 만들기
function ensureMatches() {
  let safety = 0;
  while (!hasAnyMatch() && safety < 30) {
    // 랜덤 위치에 가로 3개 또는 세로 3개 같은 타입으로 설정
    const t = randomType();
    if (Math.random() > 0.5 && COLS >= 3) {
      const c = Math.floor(Math.random() * (COLS - 2));
      const r = Math.floor(Math.random() * ROWS);
      for (let i = 0; i < 3; i++) {
        if (grid[c+i] && grid[c+i][r]) { grid[c+i][r].typeId = t; grid[c+i][r].type = TYPES[t]; }
      }
    } else {
      const c = Math.floor(Math.random() * COLS);
      const r = Math.floor(Math.random() * (ROWS - 2));
      for (let i = 0; i < 3; i++) {
        if (grid[c] && grid[c][r+i]) { grid[c][r+i].typeId = t; grid[c][r+i].type = TYPES[t]; }
      }
    }
    safety++;
  }
}

function randomType() {
  return Math.floor(Math.random() * WEED_COUNT);
}

function hasAnyMatch() {
  const visited = new Set();
  for (let c = 0; c < COLS; c++) {
    if (!grid[c]) continue;
    for (let r = 0; r < grid[c].length; r++) {
      const key = `${c},${r}`;
      if (visited.has(key)) continue;
      if (!grid[c][r] || grid[c][r].removing || grid[c][r].isBomb) continue;
      const group = findGroup(c, r);
      group.forEach(g => visited.add(`${g.c},${g.r}`));
      if (group.length >= 3) return true;
    }
  }
  return false;
}

// BFS로 같은 타입 연결된 그룹 찾기
function findGroup(col, row) {
  if (!grid[col] || !grid[col][row]) return [];
  const typeId = grid[col][row].typeId;
  const visited = new Set();
  const group = [];
  const queue = [[col, row]];

  while (queue.length > 0) {
    const [c, r] = queue.shift();
    const key = `${c},${r}`;
    if (visited.has(key)) continue;
    if (c < 0 || c >= COLS || r < 0) continue;
    if (!grid[c] || r < 0 || r >= grid[c].length) continue;
    if (!grid[c][r] || grid[c][r].removing || grid[c][r].isBomb) continue;
    if (grid[c][r].typeId !== typeId) continue;

    visited.add(key);
    group.push({ c, r });
    queue.push([c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]);
  }
  return group;
}

// 그룹 제거 + 점수
function removeGroup(group, chain) {
  // 유효한 셀만 필터
  group = group.filter(({ c, r }) => grid[c] && grid[c][r] && !grid[c][r].removing);
  const size = group.length;
  if (size < 1) return;

  // 점수: 크기 제곱 * 연쇄 배수
  const chainMult = 1 + chain * 0.5;
  const pts = Math.round(size * size * 5 * chainMult);
  score += pts;
  pullCount += size;
  combo += size;
  if (combo > maxCombo) maxCombo = combo;

  // 콤보 보상: 시간 추가!
  let bonusTime = 0;
  if (size >= 8) { bonusTime = 4; }
  else if (size >= 6) { bonusTime = 3; }
  else if (size >= 5) { bonusTime = 2; }
  else if (size >= 3) { bonusTime = 1; }
  if (bonusTime > 0) {
    timeLeft = Math.min(timeLeft + bonusTime, 60); // 최대 60초 캡
    showFB(canvas.width - 80, 30, `⏱+${bonusTime}s`, '#4FC3F7', 22);
  }

  // 피버
  if (combo >= 20 && !feverMode) {
    feverMode = true; feverTimer = 8;
    sfx('fever'); invalidateBgCache();
    document.getElementById('fever-overlay').classList.add('active');
    showFB(canvas.width / 2 - 50, canvas.height * 0.12, '🔥 FEVER! 🔥', '#FFD700', 30);
  }

  // 사운드
  if (size >= 6) sfx('bigpop');
  else sfx('pop', Math.min(size, 5));
  if (chain > 0) sfx('chain', chain);

  // 스크린 쉐이크
  triggerShake(2 + size + chain * 3);

  // 텍스트
  const centerX = group.reduce((s, g) => s + (grid[g.c] && grid[g.c][g.r] ? grid[g.c][g.r].x : canvas.width/2), 0) / size;
  const centerY = group.reduce((s, g) => s + (grid[g.c] && grid[g.c][g.r] ? grid[g.c][g.r].y : canvas.height/2), 0) / size;
  const chainText = chain > 0 ? ` 💥${chain + 1}연쇄!` : '';
  const sizeText = size >= 6 ? ' 대박!' : size >= 4 ? ' 좋아!' : '';
  const fontSize = Math.min(18 + size * 2 + chain * 3, 36);
  const color = chain >= 3 ? '#FF1744' : chain >= 2 ? '#FF9100' : size >= 6 ? '#FFD700' : '#4CAF50';
  showFB(centerX - 30, centerY, `+${pts}${sizeText}${chainText}`, color, fontSize);

  // 셀 마킹만 (실제 제거는 rebuildGrid에서)
  group.forEach(({ c, r }) => {
    if (!grid[c] || !grid[c][r]) return;
    const cell = grid[c][r];
    burst(cell.x, cell.y, cell.type ? cell.type.color : '#888', 4 + chain * 2);
    burst(cell.x, cell.y, '#A0522D', 2);
    cell._dead = true;
  });
  needsRebuild = true;
}

// 그리드 리빌드 — 유일한 그리드 변경 함수!
// 리빌드 — 배열 크기 COLS x ROWS 절대 불변!
// _dead 셀 제거 → 위 셀 아래로 떨어짐 → 맨 위에 새 셀 채움
function rebuildGrid() {
  let changed = false;
  let bombPlaced = false;

  for (let c = 0; c < COLS; c++) {
    // 안전장치: 열이 없으면 새로 생성
    if (!grid[c] || grid[c].length !== ROWS) {
      grid[c] = new Array(ROWS);
      for (let r = 0; r < ROWS; r++) grid[c][r] = new Cell(c, r, randomType());
      changed = true;
      continue;
    }

    // 살아있는 셀만 모으기
    const alive = [];
    for (let r = 0; r < ROWS; r++) {
      const cell = grid[c][r];
      if (cell && !cell._dead) {
        alive.push(cell);
      }
    }

    const deadCount = ROWS - alive.length;
    if (deadCount === 0) {
      // 변화 없음 — 위치만 갱신
      for (let r = 0; r < ROWS; r++) {
        grid[c][r].col = c;
        grid[c][r].row = r;
        grid[c][r].targetY = gridY + r * cellH + cellH / 2;
        grid[c][r].x = gridX + c * cellW + cellW / 2;
      }
      continue;
    }

    changed = true;

    // 새 배열 구성: [새셀 x deadCount] + [살아있는 셀들]
    // 배열 크기는 항상 ROWS!
    const newCol = new Array(ROWS);

    // 윗부분: 새 셀
    for (let i = 0; i < deadCount; i++) {
      const nc = new Cell(c, i, randomType());
      nc.y = gridY + (i - deadCount) * cellH + cellH / 2; // 화면 위에서 시작 (떨어지는 효과)
      nc.x = gridX + c * cellW + cellW / 2;
      nc.scale = 0.15;

      // 폭탄
      if (!bombPlaced && swipeCount >= nextBombAt && countBombsInGrid() < maxBombsAllowed() && i === 0) {
        nc.isBomb = true;
        bombCount++;
        nextBombAt = swipeCount + Math.max(1, 3 - Math.floor(bombCount * 0.3));
        bombPlaced = true;
      }
      newCol[i] = nc;
    }

    // 아랫부분: 살아있는 셀들 (아래로 밀림)
    for (let i = 0; i < alive.length; i++) {
      newCol[deadCount + i] = alive[i];
    }

    // 배열 교체 (크기 동일!)
    grid[c] = newCol;

    // 위치 갱신 (떨어지는 애니메이션)
    for (let r = 0; r < ROWS; r++) {
      grid[c][r].col = c;
      grid[c][r].row = r;
      grid[c][r].targetY = gridY + r * cellH + cellH / 2;
      grid[c][r].x = gridX + c * cellW + cellW / 2;
    }
  }
  if (changed) sfx('drop');
  return changed;
}

// 연쇄 체크
let chainCheckTimer = 0;
let currentChain = 0;

function checkChains() {
  // 모든 셀이 목표 위치에 도착했는지 확인
  let allSettled = true;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < grid[c].length; r++) {
      if (Math.abs(grid[c][r].y - grid[c][r].targetY) > 2) {
        allSettled = false;
        break;
      }
    }
    if (!allSettled) break;
  }
  if (!allSettled) {
    // 아직 떨어지는 중 → 200ms 후 재시도
    setTimeout(() => checkChains(), 200);
    return false;
  }

  // 매치 찾기
  const visited = new Set();
  let foundMatch = false;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < grid[c].length; r++) {
      const key = `${c},${r}`;
      if (visited.has(key)) continue;
      if (!grid[c][r] || grid[c][r].removing) continue;

      const group = findGroup(c, r);
      if (group.length >= 2) {
        group.forEach(g => visited.add(`${g.c},${g.r}`));
        removeGroup(group, currentChain);
        foundMatch = true;
      }
    }
  }

  if (foundMatch) {
    currentChain++;
    rebuildGrid();
    return true;
  } else {
    currentChain = 0;
    if (!hasAnyMatch()) shuffleGrid();
    return false;
  }
}

function shuffleGrid() {
  showFB(canvas.width / 2 - 40, canvas.height * 0.4, '🔀 섞는 중!', '#FFF', 24);
  sfx('drop');

  let attempts = 0;
  do {
    const types = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < grid[c].length; r++) {
        if (!grid[c][r].isBomb) types.push(grid[c][r].typeId);
      }
    }
    // Fisher-Yates
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    let idx = 0;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < grid[c].length; r++) {
        if (!grid[c][r].isBomb) {
          grid[c][r].typeId = types[idx];
          grid[c][r].type = TYPES[types[idx]];
          grid[c][r].shake = 5;
          idx++;
        }
      }
    }
    attempts++;
  } while (!hasAnyMatch() && attempts < 20);
  ensureMatches(); // 최종 보장
}

// ============ PARTICLES ============
const BURST_EXTRA_COLORS = ['#FFD700', '#FFF', '#FF80AB', '#FFEB3B', '#E1F5FE'];

function burst(x, y, color, n = 8) {
  const total = Math.ceil(n * 1.5); // 파티클 수 50% 증가
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 + Math.random() * 0.5, sp = 80 + Math.random() * 200;
    // 30% 확률로 밝은 보조 색상 사용
    const c = Math.random() < 0.3 ? BURST_EXTRA_COLORS[Math.floor(Math.random() * BURST_EXTRA_COLORS.length)] : color;
    // 20% 확률로 별 모양 파티클
    const isStar = Math.random() < 0.2;
    particles.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 1, size: 2 + Math.random() * 4.5,
      color: c, star: isStar,
      rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 8
    });
  }
}
function updateParticles(dt) {
  particles.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.96; p.vy *= 0.96;
    p.life -= dt * 2.5;
    if (p.rot !== undefined) p.rot += (p.rotSpeed || 0) * dt;
  });
  particles = particles.filter(p => p.life > 0);
}

function drawStar(cx, cy, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.4;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    else ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fill();
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
    if (p.star) {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      drawStar(0, 0, p.size * 1.2, 5);
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });
}

// ============ FEEDBACK ============
function showFB(x, y, text, color, size = 22) {
  const el = document.createElement('div');
  el.className = 'feedback-pop';
  el.textContent = text;
  el.style.left = x + 'px'; el.style.top = (y - 20) + 'px';
  el.style.color = color; el.style.fontSize = size + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
}
function triggerShake(n) { screenShake = n; }

// ============ BOMB SYSTEM (그리드 내 폭탄) ============
function countBombsInGrid() {
  let count = 0;
  for (let c = 0; c < COLS; c++) {
    if (!grid[c]) continue;
    for (let r = 0; r < grid[c].length; r++) {
      if (grid[c][r] && grid[c][r].isBomb && !grid[c][r]._dead) count++;
    }
  }
  return count;
}
function hasBombInGrid() { return countBombsInGrid() > 0; }

// 시간에 따라 허용되는 최대 폭탄 수
function maxBombsAllowed() {
  if (elapsed < 8) return 1;
  if (elapsed < 15) return 2;
  if (elapsed < 25) return 3;
  return 4;
}

function findBombCell() {
  for (let c = 0; c < COLS; c++) {
    if (!grid[c]) continue;
    for (let r = 0; r < grid[c].length; r++) {
      if (grid[c][r] && grid[c][r].isBomb && !grid[c][r].removing) return grid[c][r];
    }
  }
  return null;
}

function initBombState(cell) {
  if (!cell._bombInit) {
    cell._bombInit = true;
    cell._bombTaps = 0;
    const diff = Math.min(bombCount, 6);
    cell._bombMaxTaps = 3;
    cell._bombTimer = Math.max(3, 5 - diff * 0.2);
    cell._bombMaxTimer = cell._bombTimer;
  }
}

function tapBombCell(cell) {
  initBombState(cell);
  cell._bombTaps++;
  cell.shake = 8;
  sfx('pop', Math.floor((cell._bombTaps / cell._bombMaxTaps) * 5));
  burst(cell.x + (Math.random()-0.5)*20, cell.y + (Math.random()-0.5)*20, '#FF9800', 2);

  if (cell._bombTaps >= cell._bombMaxTaps) {
    // 해체 성공!
    const pts = 50 + Math.floor(cell._bombTimer * 20);
    score += pts; combo += 5;
    if (combo > maxCombo) maxCombo = combo;
    showFB(cell.x, cell.y - 30, `💪 해체! +${pts}`, '#4CAF50', 28);
    sfx('bigpop');
    burst(cell.x, cell.y, '#4CAF50', 15);
    burst(cell.x, cell.y, '#FFD700', 10);
    triggerShake(8);
    cell._dead = true;
    needsRebuild = true;
    updateHUD();
  }
}

function updateBombs(dt) {
  for (let c = 0; c < COLS; c++) {
    if (!grid[c]) continue;
    for (let r = 0; r < grid[c].length; r++) {
      const cell = grid[c][r];
      if (!cell || !cell.isBomb || cell.removing) continue;
      initBombState(cell);
      cell._bombTimer -= dt;
      if (cell._bombTimer < 2) {
        cell.shake = Math.sin(Date.now() * 0.03) * (3 - cell._bombTimer) * 2;
      }
      if (cell._bombTimer <= 0) {
        // 폭발! 시간 -7초 패널티
        sfx('miss');
        burst(cell.x, cell.y, '#FF1744', 20);
        burst(cell.x, cell.y, '#FF9100', 15);
        triggerShake(15);
        showFB(cell.x, cell.y - 30, '💥 -7초!', '#FF1744', 36);
        cell.isBomb = false;
        cell._dead = true;
        needsRebuild = true;
        timeLeft -= 7;
        updateHUD();
        if (timeLeft <= 0) {
          timeLeft = 0;
          updateHUD();
          setTimeout(() => endGame(), 500);
        }
      }
    }
  }
}

// drawBomb 제거됨 — Cell.draw에서 isBomb 처리

// ============ INPUT ============
let swipePath = []; // 스와이프 경로 [{c,r}, ...]
let swipeTypeId = -1; // 스와이프 중인 잡초 타입
let swiping = false;

canvas.addEventListener('touchstart', onDown, { passive: false });
canvas.addEventListener('touchmove', onMove, { passive: false });
canvas.addEventListener('touchend', onUp, { passive: false });
canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseup', onUp);

function pos(e) { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }

function findCellAt(x, y) {
  // 좌표 기반으로 직접 계산 (정확하고 빠름)
  const c = Math.floor((x - gridX) / cellW);
  const r = Math.floor((y - gridY) / cellH);
  if (c >= 0 && c < COLS && r >= 0 && r < ROWS && grid[c] && grid[c][r] && !grid[c][r]._dead) {
    return { c, r };
  }
  return null;
}

function isAdjacent(a, b) {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1;
}

function clearSwipeHighlight() {
  // 모든 셀 selected 해제
  for (let c = 0; c < COLS; c++) {
    if (!grid[c]) continue;
    for (let r = 0; r < grid[c].length; r++) {
      if (grid[c][r]) grid[c][r].selected = false;
    }
  }
  swipePath = [];
  swipeTypeId = -1;
}

function onDown(e) {
  if (showTutorial && gameRunning) {
    e.preventDefault?.();
    showTutorial = false;
    localStorage.setItem('weedpuller_tutorial', '1');
    startBGM();
    timerInterval = setInterval(() => {
      timeLeft--; updateHUD();
      if (timeLeft <= 10 && timeLeft > 0) sfx('countdown');
      if (timeLeft <= 0) endGame();
    }, 1000);
    return;
  }
  if (paused && gameRunning) {
    e.preventDefault?.();
    resumeGame();
    return;
  }
  if (!gameRunning) return;
  e.preventDefault?.();

  // 항상 이전 하이라이트 초기화
  clearSwipeHighlight();

  const { x, y } = pos(e);

  // 폭탄 터치 체크 (최우선!)
  const cell0 = findCellAt(x, y);
  if (cell0 && grid[cell0.c] && grid[cell0.c][cell0.r] && grid[cell0.c][cell0.r].isBomb) {
    tapBombCell(grid[cell0.c][cell0.r]);
    swiping = false;
    return;
  }

  const cell = findCellAt(x, y);
  if (!cell) return;

  const { c, r } = cell;
  const g = grid[c] && grid[c][r];
  if (!g || g.removing) return;

  swiping = true;
  swipeTypeId = g.typeId;
  swipePath = [{ c, r }];
  g.selected = true;
  g.shake = 3;
  sfx('pop', 0);
}

function onMove(e) {
  if (!swiping || !gameRunning) return;
  e.preventDefault?.();
  const { x, y } = pos(e);
  const cell = findCellAt(x, y);
  if (!cell) return;

  const { c, r } = cell;
  const g = grid[c][r];
  if (!g || g.removing) return;

  // 같은 타입 + 인접 + 아직 경로에 없음
  const last = swipePath[swipePath.length - 1];
  const alreadyInPath = swipePath.some(p => p.c === c && p.r === r);

  if (!alreadyInPath && g.typeId === swipeTypeId && isAdjacent(last, { c, r })) {
    swipePath.push({ c, r });
    g.selected = true;
    g.shake = 3;
    sfx('pop', Math.min(swipePath.length, 5));
  }
}

function onUp(e) {
  if (!swiping || !gameRunning) return;
  e.preventDefault?.();
  swiping = false;

  if (swipePath.length >= 3) {
    // 스와이프로 3개 이상 → 한꺼번에 터짐!
    swipeCount++;
    currentChain = 0;
    removeGroup(swipePath, 0); // _dead 마킹만, 리빌드는 게임 루프에서
    clearSwipeHighlight();
  } else if (swipePath.length <= 2) {
    // 2개 이하 → 폭탄 or 미스
    if (swipePath.length >= 1) {
      const { c, r } = swipePath[0];
      if (grid[c] && grid[c][r] && grid[c][r].isBomb) {
        tapBombCell(grid[c][r]);
        clearSwipeHighlight();
        return;
      }
    }
    if (swipePath.length === 2) {
      // 2개 스와이프 → 부족! 흔들기만
      swipePath.forEach(({ c, r }) => { if (grid[c] && grid[c][r]) grid[c][r].shake = 5; });
      sfx('miss');
    }
    clearSwipeHighlight();
  } else {
    clearSwipeHighlight();
  }
}

// 스와이프 라인 그리기 (게임 루프에서 호출)
function drawSwipeLine() {
  if (swipePath.length < 2) return;
  ctx.save();

  // 글로우 효과 라인 (밝은 노란색)
  ctx.strokeStyle = 'rgba(255,240,100,0.5)';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  swipePath.forEach(({ c, r }, i) => {
    const cell = grid[c][r];
    if (!cell) return;
    if (i === 0) ctx.moveTo(cell.x, cell.y);
    else ctx.lineTo(cell.x, cell.y);
  });
  ctx.stroke();

  // 메인 라인 (밝은 노랑, 더 두꺼움)
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,180,0.9)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  swipePath.forEach(({ c, r }, i) => {
    const cell = grid[c][r];
    if (!cell) return;
    if (i === 0) ctx.moveTo(cell.x, cell.y);
    else ctx.lineTo(cell.x, cell.y);
  });
  ctx.stroke();

  // 중심 하이라이트 라인
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  swipePath.forEach(({ c, r }, i) => {
    const cell = grid[c][r];
    if (!cell) return;
    if (i === 0) ctx.moveTo(cell.x, cell.y);
    else ctx.lineTo(cell.x, cell.y);
  });
  ctx.stroke();

  // 경로 위 숫자 표시
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 16px Jua, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const last = swipePath[swipePath.length - 1];
  const lastCell = grid[last.c][last.r];
  if (lastCell) {
    ctx.fillText(`${swipePath.length}개`, lastCell.x, lastCell.y - lastCell.r - 10);
  }
  ctx.restore();
}

// ============ BACKGROUND (캐시) ============
let bgDecos = [], bgDecoCache = [], bgCache = null, bgCacheKey = '';
// 배경 반짝이 (별/스파클)
let bgSparkles = [];
function initBgSparkles() {
  bgSparkles = [];
  for (let i = 0; i < 13; i++) {
    bgSparkles.push({
      x: Math.random() * 400,
      y: Math.random() * 300,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
      size: 1 + Math.random() * 2,
    });
  }
}
function invalidateBgCache() { bgCacheKey = ''; }

function initBgDecos() {
  bgDecos = []; bgDecoCache = [];
  const types = ['🐛', '🐞', '🦋', '🐝', '🌻', '🌾', '🐔', '🐣'];
  for (let i = 0; i < 10; i++) {
    const size = 10 + Math.random() * 6;
    const oc = document.createElement('canvas'); oc.width = size * 2; oc.height = size * 2;
    const c = oc.getContext('2d'); c.font = `${size}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(types[i % types.length], size, size);
    bgDecoCache.push(oc);
    bgDecos.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size, wobble: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() });
  }
}

function drawBG() {
  const key = `${feverMode}_${canvas.width}_${canvas.height}`;
  if (bgCacheKey !== key) {
    if (!bgCache) bgCache = document.createElement('canvas');
    bgCache.width = canvas.width; bgCache.height = canvas.height;
    const bg = bgCache.getContext('2d');
    const W = canvas.width, H = canvas.height;
    // 하늘 (더 깨끗하고 맑은 색)
    const sky = bg.createLinearGradient(0, 0, 0, gridY);
    if (feverMode) { sky.addColorStop(0, '#FF7043'); sky.addColorStop(1, '#FFCC80'); }
    else { sky.addColorStop(0, '#90CAF9'); sky.addColorStop(1, '#E3F2FD'); }
    bg.fillStyle = sky; bg.fillRect(0, 0, W, gridY);
    if (!feverMode) {
      bg.fillStyle = 'rgba(255,255,255,0.55)';
      [[W * 0.15, gridY * 0.35, 35], [W * 0.6, gridY * 0.25, 45], [W * 0.85, gridY * 0.4, 30]].forEach(([cx, cy, s]) => {
        bg.beginPath(); bg.arc(cx, cy, s * 0.5, 0, Math.PI * 2); bg.arc(cx + s * 0.35, cy - s * 0.15, s * 0.35, 0, Math.PI * 2);
        bg.arc(cx + s * 0.65, cy, s * 0.4, 0, Math.PI * 2); bg.fill();
      });
    }
    // 언덕 (더 부드러운 초록)
    bg.fillStyle = feverMode ? '#FF8A65' : '#A5D6A7';
    bg.beginPath(); bg.moveTo(0, gridY);
    for (let x = 0; x <= W; x += 20) bg.lineTo(x, gridY - 12 - Math.sin(x * 0.015) * 10);
    bg.lineTo(W, gridY); bg.closePath(); bg.fill();
    // 잔디 (따뜻한 톤)
    const gg = bg.createLinearGradient(0, gridY, 0, H);
    if (feverMode) { gg.addColorStop(0, '#E65100'); gg.addColorStop(1, '#BF360C'); }
    else { gg.addColorStop(0, '#A5D6A7'); gg.addColorStop(1, '#66BB6A'); }
    bg.fillStyle = gg; bg.fillRect(0, gridY, W, H - gridY);
    // 밭 (더 둥글고 따뜻한 흙색)
    const bw = 6, px = 10, py = 6;
    const bx = gridX - px, by = gridY - py, bW = cellW * COLS + px * 2, bH = cellH * ROWS + py * 2;
    const borderR = 16;
    bg.fillStyle = 'rgba(0,0,0,0.06)'; bgRR(bg, bx - bw + 2, by - bw + 3, bW + bw * 2, bH + bw * 2, borderR);
    bg.fillStyle = feverMode ? '#E8A088' : '#C8B8A8'; bgRR(bg, bx - bw, by - bw, bW + bw * 2, bH + bw * 2, borderR);
    const dirt = bg.createLinearGradient(bx, by, bx, by + bH);
    dirt.addColorStop(0, feverMode ? '#E8DDD0' : '#EDE4D8');
    dirt.addColorStop(0.5, feverMode ? '#D4C4B0' : '#DDD0C0');
    dirt.addColorStop(1, feverMode ? '#C0B0A0' : '#D0C4B4');
    bg.fillStyle = dirt; bgRR(bg, bx, by, bW, bH, borderR - 3);
    // 이랑
    for (let r = 0; r < ROWS; r++) {
      const ry = gridY + r * cellH + cellH * 0.5;
      bg.fillStyle = 'rgba(255,255,255,0.08)';
      bg.beginPath(); bg.ellipse(bx + bW / 2, ry, bW / 2 - 4, cellH * 0.25, 0, 0, Math.PI * 2); bg.fill();
    }
    bgCacheKey = key;
  }
  ctx.drawImage(bgCache, 0, 0);
  if (!bgDecos.length) initBgDecos();
  const t = Date.now() * 0.001;
  bgDecos.forEach((d, i) => {
    ctx.save(); ctx.globalAlpha = 0.3;
    ctx.drawImage(bgDecoCache[i], d.x + Math.sin(t * d.speed + d.wobble) * 4 - d.size, d.y + Math.cos(t * d.speed * 0.7 + d.wobble) * 3 - d.size);
    ctx.restore();
  });

  // 배경 반짝이 효과 (작은 별/점이 떠다니며 반짝)
  if (!bgSparkles.length) initBgSparkles();
  const W = canvas.width, H = canvas.height;
  bgSparkles.forEach(sp => {
    const sx = (sp.x % W + Math.sin(t * sp.speed + sp.phase) * 15) % W;
    const sy = (sp.y % H + Math.cos(t * sp.speed * 0.8 + sp.phase) * 10) % H;
    const alpha = 0.3 + Math.sin(t * 2 + sp.phase) * 0.3; // 0.0 ~ 0.6 반짝
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = '#FFF';
    // 십자 반짝이 모양
    const sz = sp.size;
    ctx.beginPath();
    ctx.moveTo(sx, sy - sz * 2); ctx.lineTo(sx + sz * 0.5, sy - sz * 0.5);
    ctx.lineTo(sx + sz * 2, sy); ctx.lineTo(sx + sz * 0.5, sy + sz * 0.5);
    ctx.lineTo(sx, sy + sz * 2); ctx.lineTo(sx - sz * 0.5, sy + sz * 0.5);
    ctx.lineTo(sx - sz * 2, sy); ctx.lineTo(sx - sz * 0.5, sy - sz * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });
}
function bgRR(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); c.fill();
}

// ============ HUD ============
function updateHUD() {
  document.getElementById('hud-score').textContent = score;
  document.getElementById('hud-timer').textContent = `${timeLeft}s`;
  const timerEl = document.getElementById('hud-timer');
  if (timeLeft <= 5) { timerEl.style.color = '#FF1744'; timerEl.style.fontSize = '20px'; }
  else { timerEl.style.color = ''; timerEl.style.fontSize = ''; }
  if (score > highScore) document.getElementById('hud-score').style.color = 'var(--farm-yellow)';
  const le = document.getElementById('hud-level');
  le.textContent = `🔥 콤보 ${combo}`;
  le.classList.remove('hidden');
}

// ============ GAME LOOP ============
let lastTime = 0;

function loop(ts) {
  if (!lastTime) lastTime = ts;
  let dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  // 일시정지 처리
  if (paused && gameRunning) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBG();
    // 셀 그리기 (정지 상태)
    for (let c = 0; c < COLS; c++) {
      if (!grid[c]) continue;
      for (let r = 0; r < grid[c].length; r++) {
        if (!grid[c][r]) continue;
        grid[c][r].draw();
      }
    }
    drawPauseOverlay();
    requestAnimationFrame(loop);
    return;
  }

  if (showTutorial && gameRunning) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBG();
    for (let c = 0; c < COLS; c++) { if (!grid[c]) continue; for (let r = 0; r < grid[c].length; r++) { if (grid[c][r]) grid[c][r].draw(); } }
    drawTutorialOverlay();
    requestAnimationFrame(loop);
    return;
  }

  if (screenShake > 0) {
    shakeX = (Math.random() - 0.5) * screenShake;
    shakeY = (Math.random() - 0.5) * screenShake;
    screenShake *= 0.85; if (screenShake < 0.3) screenShake = 0;
  } else { shakeX = 0; shakeY = 0; }

  ctx.save(); ctx.translate(shakeX, shakeY);
  ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);
  drawBG();

  // (animating 제거됨)

  if (feverMode && gameRunning) {
    feverTimer -= dt;
    if (feverTimer <= 0) { feverMode = false; invalidateBgCache(); document.getElementById('fever-overlay').classList.remove('active'); }
  }

  // 셀 업데이트 & 그리기
  for (let c = 0; c < COLS; c++) {
    if (!grid[c]) continue;
    for (let r = 0; r < grid[c].length; r++) {
      if (!grid[c][r]) continue;
      grid[c][r].update(dt);
      grid[c][r].draw();
    }
  }

  updateParticles(dt);
  drawParticles();
  if (swiping) drawSwipeLine();

  // 게임 업데이트
  if (gameRunning) {
    elapsed += dt;

    // 매 프레임 모든 셀 위치 강제 세팅
    for (let c = 0; c < COLS; c++) {
      if (!grid[c]) continue;
      for (let r = 0; r < grid[c].length; r++) {
        if (!grid[c][r]) continue;
        grid[c][r].col = c;
        grid[c][r].row = r;
        grid[c][r].targetY = gridY + r * cellH + cellH / 2;
        grid[c][r].x = gridX + c * cellW + cellW / 2;
      }
    }

    // 리빌드 필요하면 실행 (removeGroup에서 마킹 후)
    if (needsRebuild) {
      needsRebuild = false;
      rebuildGrid();
      if (!hasAnyMatch()) shuffleGrid();
    }
    // 안전장치: 어떤 열이라도 ROWS가 아니면 리빌드
    for (let c = 0; c < COLS; c++) {
      if (!grid[c] || grid[c].length !== ROWS || grid[c].some(x => !x || x._dead)) {
        rebuildGrid(); break;
      }
    }
    updateBombs(dt);
  }

  if (gameRunning) updateHUD();


  ctx.restore();
  requestAnimationFrame(loop);
}

// ============ START ============
document.getElementById('btn-start').addEventListener('click', startCountdown);
document.getElementById('btn-retry').addEventListener('click', (e) => {
  e.stopPropagation();
  startCountdown();
});

function startCountdown() {
  initAudio();
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('result-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');

  clearInterval(timerInterval); stopBGM();
  swiping = false; clearSwipeHighlight();
  particles = []; score = 0; combo = 0; maxCombo = 0; chainLevel = 0;
  pullCount = 0; elapsed = 0; feverMode = false; gameOver = false;
  animating = false; paused = false; timeLeft = 30; isNewRecord = false; currentChain = 0;
  bombCount = 0; swipeCount = 0; nextBombAt = 3; needsRebuild = false;
  document.getElementById('hud-score').style.color = '';
  document.getElementById('fever-overlay').classList.remove('active');
  document.getElementById('fever-overlay').style.boxShadow = '';

  initGrid();
  updateHUD();

  const cd = document.getElementById('countdown');
  let n = 3;
  (function tick() {
    if (n > 0) {
      cd.classList.remove('hidden'); cd.textContent = n;
      cd.style.animation = 'none'; void cd.offsetWidth; cd.style.animation = 'countPop 0.5s ease-out';
      sfx('countdown'); n--; setTimeout(tick, 700);
    } else {
      cd.textContent = 'GO!'; cd.style.color = '#4CAF50';
      cd.style.animation = 'none'; void cd.offsetWidth; cd.style.animation = 'countPop 0.5s ease-out';
      sfx('go');
      setTimeout(() => { cd.classList.add('hidden'); cd.style.color = 'white'; startGame(); }, 500);
    }
  })();
}

function startGame() {
  gameRunning = true; timeLeft = 30; resize(); updateHUD();
  clearInterval(timerInterval);
  if (!localStorage.getItem('weedpuller_tutorial')) {
    showTutorial = true; // 타이머·BGM은 터치 후 시작
    return;
  }
  startBGM();
  timerInterval = setInterval(() => {
    timeLeft--; updateHUD();
    if (timeLeft <= 10 && timeLeft > 0) sfx('countdown');
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  if (gameOver) return;
  gameOver = true; gameRunning = false; animating = false;
  swiping = false; clearSwipeHighlight();
  clearInterval(timerInterval); stopBGM(); sfx('end');
  document.getElementById('hud-timer').style.color = '';
  document.getElementById('hud-score').style.color = '';
  document.getElementById('fever-overlay').classList.remove('active');
  document.querySelectorAll('.feedback-pop').forEach(el => el.remove());

  isNewRecord = score > highScore;
  if (isNewRecord) {
    highScore = score;
    localStorage.setItem('weedpuller_hs', highScore);
    sfx('newrecord');
  }

  let emoji, title;
  if (isNewRecord) { emoji = '🎉'; title = '밭의 전설!'; }
  else if (score >= 3000) { emoji = '🧑‍🌾'; title = '프로 농부!'; }
  else if (score >= 1500) { emoji = '🌾'; title = '베테랑 농부!'; }
  else if (score >= 500) { emoji = '💪'; title = '열심히 뽑았어요!'; }
  else { emoji = '🌱'; title = '아직 초보 농부...'; }

  document.getElementById('hud').classList.add('hidden');
  document.getElementById('hud-combo').classList.add('hidden');
  document.getElementById('hud-level').classList.add('hidden');

  setTimeout(() => {
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('result-emoji').textContent = emoji;
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-score-value').textContent = score;
    document.getElementById('stat-weeds').textContent = pullCount;
    document.getElementById('stat-combo').textContent = `x${maxCombo}`;
    document.getElementById('stat-miss').textContent = `${isNewRecord ? '🎉 신기록!' : '🏅 ' + highScore}`;
    document.querySelector('.result-label').textContent = '점';
    const extraEl = document.getElementById('result-extra');
    if (extraEl) {
      const savedName = localStorage.getItem('weedpuller_name') || '';
      extraEl.innerHTML =
        `<div style="margin-bottom:8px;font-size:13px;color:#8B95A1">최고기록: ${highScore}점</div>` +
        `<div style="display:flex;gap:6px;margin-bottom:10px">` +
          `<input id="rank-name" type="text" maxlength="20" placeholder="닉네임 입력" value="${savedName}" style="flex:1;padding:10px 12px;border:1.5px solid #E5E8EB;border-radius:12px;font-size:14px;font-family:Jua,sans-serif;outline:none;text-align:center">` +
          `<button id="btn-rank" style="background:#3182F6;color:#FFF;border:none;border-radius:12px;padding:10px 16px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:Jua,sans-serif">등록</button>` +
        `</div>` +
        `<div id="rank-msg" style="font-size:12px;color:#8B95A1;margin-bottom:8px"></div>` +
        `<div id="rank-list" style="font-size:12px;color:#4E5968;margin-bottom:10px;max-height:120px;overflow-y:auto"></div>` +
        `<button id="btn-share" style="background:none;border:1px solid #E5E8EB;border-radius:12px;padding:8px 0;width:100%;font-size:13px;font-weight:600;color:#8B95A1;cursor:pointer">📤 공유</button>`;

      // 등록 버튼
      document.getElementById('btn-rank')?.addEventListener('click', async () => {
        let name = document.getElementById('rank-name')?.value?.trim();
        if (!name) { document.getElementById('rank-msg').textContent = '닉네임을 입력해주세요!'; return; }
        name = name.replace(/[^가-힣a-zA-Z0-9 ]/g, '').slice(0, 20); // sanitize
        if (!name) { document.getElementById('rank-msg').textContent = '한글/영문/숫자만 가능!'; return; }
        localStorage.setItem('weedpuller_name', name);
        document.getElementById('btn-rank').textContent = '...';
        const ok = await submitScore(name, score, maxCombo, Math.floor(elapsed));
        document.getElementById('rank-msg').textContent = ok ? '✅ 등록 완료!' : '❌ 등록 실패';
        document.getElementById('btn-rank').textContent = '등록';
        if (ok) loadRankings();
      });

      // 공유 버튼
      document.getElementById('btn-share')?.addEventListener('click', () => {
        const text = `🧑‍🌾 뽑아라! 잡초\n⭐ ${score}점 · 최대콤보 x${maxCombo}\n\n나도 도시농부 도전! 👇\nhttps://ssuksak.github.io/weed_puller/`;
        if (navigator.share) navigator.share({ text });
        else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => {
          document.getElementById('rank-msg').textContent = '📋 복사됨!';
        });
      });

      // 랭킹 로드
      loadRankings();
    }
  }, 500);
}

async function loadRankings() {
  const listEl = document.getElementById('rank-list');
  if (!listEl) return;
  listEl.innerHTML = '<div style="color:#aaa">로딩 중...</div>';
  const rankings = await getTopRankings(10);
  if (!rankings.length) { listEl.innerHTML = '<div style="color:#aaa">아직 기록이 없어요!</div>'; return; }
  listEl.innerHTML = '<div style="font-weight:700;margin-bottom:4px;color:#3182F6">🏆 TOP 10</div>' +
    rankings.map((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
      return `<div style="display:flex;justify-content:space-between;padding:2px 0;${i < 3 ? 'font-weight:700' : ''}">`+
        `<span>${medal} ${r.nickname}</span><span>${r.score}점</span></div>`;
    }).join('');
}

// 시작화면 랭킹 로드
(async function loadStartRanking() {
  const el = document.getElementById('start-ranking');
  if (!el) return;
  el.innerHTML = '<div style="color:#8B95A1;font-size:12px">랭킹 로딩 중...</div>';
  const rankings = await getTopRankings(5);
  if (!rankings.length) {
    el.innerHTML = '<div style="color:#8B95A1;font-size:13px;text-align:center">첫 번째 기록을 남겨보세요! 🌱</div>';
    return;
  }
  el.innerHTML = '<div style="font-size:14px;font-weight:700;color:#191F28;margin-bottom:8px">🏆 랭킹</div>' +
    rankings.map((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span style="color:#8B95A1;font-size:12px;width:20px;display:inline-block;text-align:center">${i+1}</span>`;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;${i < rankings.length - 1 ? 'border-bottom:1px solid #E5E8EB;' : ''}${i < 3 ? 'font-weight:700;' : ''}">`+
        `<span style="color:#191F28;font-size:14px">${medal} ${r.nickname}</span>`+
        `<span style="color:#3182F6;font-size:14px;font-weight:700">${r.score.toLocaleString()}점</span></div>`;
    }).join('');
})();

requestAnimationFrame(loop);
