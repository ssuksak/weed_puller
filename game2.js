// =============================================
// 🌿 잡초 뽑기 v4 — 매치 퍼즐 (애니팡 스타일)
// 같은 잡초 2개+ 탭 → 한꺼번에 뽑힘 → 낙하 → 연쇄!
// =============================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ============ AUDIO ============
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null, bgmGain = null, bgmPlaying = false, bgmInterval = null, bgmNextTime = 0, bgmIdx = 0;
let bgmBassIdx = 0, bgmBassNext = 0, bgmDrumNext = 0, bgmDrumBeat = 0;

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
  if (bgmPlaying) return;
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
    // 시간에 따라 멜로디 전환: 동화풍 → 중반 → 긴장
    const useMel = timeLeft <= 5 ? BGM_TENSE : timeLeft <= 15 ? BGM_MID : BGM_CALM;
    const [f, d] = useMel[bgmIdx % useMel.length];
    // 악기: 시간 갈수록 날카로워짐
    const waveType = timeLeft <= 5 ? 'square' : timeLeft <= 12 ? 'triangle' : 'sine';
    // 볼륨: 시간 갈수록 커짐
    const vol = 0.2 + gameProgress * 0.15;
    mk(waveType, f, bgmNextTime, d * tempo * 0.9, vol);
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
    const kickVol = 0.15 + gameProgress * 0.25; // 처음 살짝 → 나중 쿵쿵
    if (beat === 0 || beat === 2) mk('sine', 150, bgmDrumNext, 0.1, kickVol);
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

function sfx(type, extra) {
  if (!audioCtx) return;
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
const WEED_COUNT = 5; // 잡초 종류 수
let grid = []; // grid[col][row] = { type, x, y, targetY, ... }
let particles = [];
let score = 0, combo = 0, maxCombo = 0, chainLevel = 0;
let gameRunning = false, gameOver = false;
let pullCount = 0, elapsed = 0;
let feverMode = false, feverTimer = 0;
let screenShake = 0, shakeX = 0, shakeY = 0;
let animating = false;
let animTimeout = 0;

// 폭탄 시스템 — 그리드 안에 섞여 내려옴
let bombCount = 0; // 지금까지 나온 폭탄 수
let swipeCount = 0; // 드래그 수확 횟수 (3번마다 폭탄)
let nextBombAt = 3; // 다음 폭탄이 나올 수확 횟수
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
  { id: 0, name: '토마토', bg: '#F44336', face: '#FFCDD2', accent: '#B71C1C', expr: 'happy', headDeco: 'tomato' },
  { id: 1, name: '당근', bg: '#FF7043', face: '#FFE0B2', accent: '#D84315', expr: 'laugh', headDeco: 'carrot' },
  { id: 2, name: '양배추', bg: '#66BB6A', face: '#C8E6C9', accent: '#2E7D32', expr: 'wink', headDeco: 'cabbage' },
  { id: 3, name: '옥수수', bg: '#FFCA28', face: '#FFF9C4', accent: '#F57F17', expr: 'surprised', headDeco: 'corn' },
  { id: 4, name: '포도', bg: '#7E57C2', face: '#D1C4E9', accent: '#4527A0', expr: 'angry', headDeco: 'grape' },
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
  }

  draw() {
    if (this.scale <= 0) return;
    ctx.save();

    const sc = this.scale * (1 + Math.sin(this.wobble) * 0.02);
    const r = this.r * sc;
    const sx = (Math.random() - 0.5) * this.shake;
    const x = this.x + sx, y = this.y;

    const t = this.type;

    // 선택 하이라이트 (글로우 + 스케일업)
    if (this.selected) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(x, y, r * 1.1, 0, Math.PI * 2); ctx.fill();
    }

    // --- 큰 동글 얼굴 (셀 꽉 채움) ---
    const faceR = r * 0.88;

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + faceR * 0.15, faceR * 0.9, faceR * 0.3, 0, 0, Math.PI * 2); ctx.fill();

    // 외곽 (테두리)
    ctx.fillStyle = t.accent;
    ctx.beginPath(); ctx.arc(x, y, faceR, 0, Math.PI * 2); ctx.fill();

    // 메인 얼굴
    ctx.fillStyle = t.bg;
    ctx.beginPath(); ctx.arc(x, y, faceR * 0.92, 0, Math.PI * 2); ctx.fill();

    // 얼굴 밝은 부분 (상단 그라데이션)
    const faceGrad = ctx.createRadialGradient(x - faceR * 0.15, y - faceR * 0.3, faceR * 0.1, x, y, faceR);
    faceGrad.addColorStop(0, t.face);
    faceGrad.addColorStop(0.6, t.bg);
    faceGrad.addColorStop(1, t.bg);
    ctx.fillStyle = faceGrad;
    ctx.beginPath(); ctx.arc(x, y, faceR * 0.9, 0, Math.PI * 2); ctx.fill();

    // 글로시 반사 (상단)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(x - faceR * 0.1, y - faceR * 0.35, faceR * 0.45, faceR * 0.2, -0.15, 0, Math.PI * 2); ctx.fill();

    // --- 머리 장식 (채소/과일 특징) ---
    const deco = t.headDeco;
    if (deco === 'tomato') {
      // 토마토 꼭지 + 잎
      ctx.strokeStyle = '#388E3C'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - faceR * 0.82); ctx.lineTo(x, y - faceR * 1.05); ctx.stroke();
      ctx.fillStyle = '#4CAF50';
      [[-0.4, -0.9, -0.5], [0, -0.95, 0], [0.4, -0.9, 0.5]].forEach(([dx, dy, rot]) => {
        ctx.save(); ctx.translate(x + faceR * dx, y + faceR * dy); ctx.rotate(rot);
        ctx.beginPath(); ctx.ellipse(0, -2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    } else if (deco === 'carrot') {
      // 당근 잎사귀 (풍성하게)
      ctx.fillStyle = '#66BB6A';
      [[-0.25, -0.95, -0.3], [0, -1.1, 0], [0.25, -0.95, 0.3], [-0.12, -1.05, -0.15], [0.12, -1.05, 0.15]].forEach(([dx, dy, rot]) => {
        ctx.save(); ctx.translate(x + faceR * dx, y + faceR * dy); ctx.rotate(rot);
        ctx.beginPath(); ctx.ellipse(0, -5, 3, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    } else if (deco === 'cabbage') {
      // 양배추 겹잎 (머리 위에 작은 잎들)
      ctx.fillStyle = '#A5D6A7';
      ctx.beginPath(); ctx.ellipse(x, y - faceR * 0.85, faceR * 0.35, faceR * 0.15, 0, Math.PI, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#81C784';
      ctx.beginPath(); ctx.ellipse(x, y - faceR * 0.9, faceR * 0.25, faceR * 0.12, 0, Math.PI, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#66BB6A';
      ctx.beginPath(); ctx.ellipse(x, y - faceR * 0.95, faceR * 0.15, faceR * 0.08, 0, Math.PI, 2 * Math.PI); ctx.fill();
    } else if (deco === 'corn') {
      // 옥수수 껍질 (양쪽으로 벌어진 잎)
      ctx.fillStyle = '#C8E6C9';
      ctx.save(); ctx.translate(x - faceR * 0.5, y - faceR * 0.7); ctx.rotate(-0.4);
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(x + faceR * 0.5, y - faceR * 0.7); ctx.rotate(0.4);
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // 옥수수 알갱이 장식 (이마에)
      ctx.fillStyle = '#FBC02D';
      [[-0.15, -0.6], [0.15, -0.6], [0, -0.7]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(x + faceR * dx, y + faceR * dy, 2, 0, Math.PI * 2); ctx.fill();
      });
    } else if (deco === 'grape') {
      // 포도 알갱이 (머리 위에 작은 원들)
      ctx.fillStyle = '#9575CD';
      [[-0.2, -0.95], [0.2, -0.95], [0, -1.1], [-0.1, -1.0], [0.1, -1.0]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.arc(x + faceR * dx, y + faceR * dy, 4, 0, Math.PI * 2); ctx.fill();
      });
      // 줄기
      ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - faceR * 1.1); ctx.lineTo(x + 3, y - faceR * 1.25); ctx.stroke();
      // 잎
      ctx.fillStyle = '#66BB6A';
      ctx.beginPath(); ctx.ellipse(x + 5, y - faceR * 1.2, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
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
    drawFace(t.expr, x, y, faceR);

    ctx.restore();
  }

  contains(px, py) {
    return (px - this.x) ** 2 + (py - this.y) ** 2 < (this.r * 1.3) ** 2;
  }
}

// ============ FACES (귀엽고 세련되게) ============
function drawFace(type, x, y, r) {
  const s = r * 0.9;
  const eyeY = y - s * 0.06;
  const eyeSpacing = s * 0.24;
  const eyeR = s * 0.17;

  // 공통: 큰 둥근 눈 (캐릭터감)
  if (type === 'angry') {
    // 흰자
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x - eyeSpacing, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
    // 눈동자
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(x - eyeSpacing, eyeY + 1, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing, eyeY + 1, eyeR * 0.6, 0, Math.PI * 2); ctx.fill();
    // 하이라이트
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x - eyeSpacing + 1, eyeY - 1, eyeR * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing + 1, eyeY - 1, eyeR * 0.25, 0, Math.PI * 2); ctx.fill();
    // 화난 눈썹
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - eyeSpacing - eyeR, eyeY - eyeR * 1.2);
    ctx.lineTo(x - eyeSpacing + eyeR * 0.5, eyeY - eyeR * 0.6);
    ctx.moveTo(x + eyeSpacing + eyeR, eyeY - eyeR * 1.2);
    ctx.lineTo(x + eyeSpacing - eyeR * 0.5, eyeY - eyeR * 0.6);
    ctx.stroke();
    // 입 (뾰로통)
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y + s * 0.18, s * 0.08, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
  } else if (type === 'happy') {
    // 흰자
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x - eyeSpacing, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
    // 눈동자 (위를 봄 — 행복)
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(x - eyeSpacing, eyeY - 1, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing, eyeY - 1, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
    // 하이라이트
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x - eyeSpacing + 1, eyeY - 2, eyeR * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing + 1, eyeY - 2, eyeR * 0.25, 0, Math.PI * 2); ctx.fill();
    // 웃는 입
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y + s * 0.12, s * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    // 볼터치
    ctx.fillStyle = 'rgba(255,150,150,0.3)';
    ctx.beginPath(); ctx.arc(x - s * 0.32, y + s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.32, y + s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'surprised') {
    // 흰자 (더 크게)
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x - eyeSpacing, eyeY, eyeR * 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing, eyeY, eyeR * 1.1, 0, Math.PI * 2); ctx.fill();
    // 눈동자 (작게 — 놀란 느낌)
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(x - eyeSpacing, eyeY, eyeR * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing, eyeY, eyeR * 0.45, 0, Math.PI * 2); ctx.fill();
    // 하이라이트
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x - eyeSpacing + 1, eyeY - 1.5, eyeR * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing + 1, eyeY - 1.5, eyeR * 0.2, 0, Math.PI * 2); ctx.fill();
    // O 입
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.18, s * 0.06, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'wink') {
    // 왼쪽 눈 (정상)
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x - eyeSpacing, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(x - eyeSpacing, eyeY, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x - eyeSpacing + 1, eyeY - 1.5, eyeR * 0.25, 0, Math.PI * 2); ctx.fill();
    // 오른쪽 눈 (윙크 — 반달)
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x + eyeSpacing, eyeY, eyeR * 0.6, 0.05 * Math.PI, 0.95 * Math.PI); ctx.stroke();
    // 웃는 입
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y + s * 0.12, s * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    // 볼터치
    ctx.fillStyle = 'rgba(255,150,150,0.3)';
    ctx.beginPath(); ctx.arc(x + s * 0.32, y + s * 0.08, s * 0.07, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'laugh') {
    // 반달 눈 (둘 다 — 크게 웃음)
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(x - eyeSpacing, eyeY, eyeR * 0.7, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeSpacing, eyeY, eyeR * 0.7, Math.PI, 2 * Math.PI); ctx.fill();
    // 크게 웃는 입
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(x, y + s * 0.14, s * 0.12, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#FF8A80';
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.2, s * 0.06, s * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    // 볼터치
    ctx.fillStyle = 'rgba(255,150,150,0.35)';
    ctx.beginPath(); ctx.arc(x - s * 0.3, y + s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.3, y + s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
  }
}

// ============ GRID LOGIC ============
function initGrid() {
  grid = [];
  for (let c = 0; c < COLS; c++) {
    grid[c] = [];
    for (let r = 0; r < ROWS; r++) {
      grid[c][r] = new Cell(c, r, randomType());
    }
  }
  // 3개+ 매치가 최소 3개는 있도록 보장
  let safety = 0;
  while (!hasAnyMatch() && safety < 50) {
    // 랜덤으로 일부 셀 타입 변경
    for (let i = 0; i < 8; i++) {
      const rc = Math.floor(Math.random() * COLS);
      const rr = Math.floor(Math.random() * ROWS);
      if (grid[rc][rr]) grid[rc][rr].typeId = grid[rc][rr > 0 ? rr-1 : rr+1]?.typeId ?? randomType();
      if (grid[rc][rr]) grid[rc][rr].type = TYPES[grid[rc][rr].typeId];
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

  // 콤보 보상: 시간 추가 (큰 콤보만!)
  let bonusTime = 0;
  if (size >= 8) { bonusTime = 2; }
  else if (size >= 6) { bonusTime = 1; }
  if (bonusTime > 0) {
    timeLeft = Math.min(timeLeft + bonusTime, 45); // 최대 45초 캡
    showFB(canvas.width - 80, 30, `⏱+${bonusTime}s`, '#4FC3F7', 20);
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

  // 파티클 + 즉시 제거 — 셀 객체 참조로 찾아서 제거
  group.forEach(({ c, r }) => {
    // c,r 인덱스가 아니라 해당 열에서 셀 객체를 찾아서 제거
    if (!grid[c]) return;
    const cell = grid[c][r];
    if (cell) {
      burst(cell.x, cell.y, cell.type ? cell.type.color : '#888', 4 + chain * 2);
      burst(cell.x, cell.y, '#A0522D', 2);
    }
    // 해당 셀을 marked로 표시 (나중에 한번에 필터)
    if (grid[c][r]) grid[c][r]._dead = true;
  });

  // 모든 열에서 dead 셀 제거 + 즉시 채움
  for (let c = 0; c < COLS; c++) {
    if (!grid[c]) continue;
    const hadDead = grid[c].some(cell => cell && cell._dead);
    if (hadDead) {
      grid[c] = grid[c].filter(cell => cell && !cell._dead);
      const empty = ROWS - grid[c].length;
      const newCells = [];
      for (let i = 0; i < empty; i++) {
        const nc = new Cell(c, i, randomType());
        nc.y = gridY + (i - empty) * cellH + cellH / 2;
        nc.x = gridX + c * cellW + cellW / 2;
        nc.scale = 0;
        // 폭탄 스폰
        if (swipeCount >= nextBombAt && countBombsInGrid() < maxBombsAllowed() && i === 0 && !newCells.some(n => n.isBomb)) {
          nc.isBomb = true;
          bombCount++;
          nextBombAt = swipeCount + Math.max(2, 4 - Math.floor(bombCount * 0.3));
        }
        newCells.push(nc);
      }
      grid[c] = [...newCells, ...grid[c]];
      // row 재설정
      for (let r2 = 0; r2 < grid[c].length; r2++) {
        grid[c][r2].col = c;
        grid[c][r2].row = r2;
        grid[c][r2].targetY = gridY + r2 * cellH + cellH / 2;
        grid[c][r2].x = gridX + c * cellW + cellW / 2;
      }
    }
  }
}

// 낙하 처리 (심플하고 확실하게)
function dropColumns() {
  let dropped = false;
  let bombPlaced = false;

  for (let c = 0; c < COLS; c++) {
    if (!grid[c]) grid[c] = new Array(ROWS).fill(null);

    // 아래부터 채움: null이 아닌 셀만 모아서 아래로 몰기
    const alive = [];
    for (let r = 0; r < ROWS; r++) {
      if (grid[c][r] && !grid[c][r].removing) {
        alive.push(grid[c][r]);
      }
    }

    const empty = ROWS - alive.length;
    if (empty > 0) dropped = true;

    // 새 셀 생성 (위쪽 빈 칸)
    const newCells = [];
    for (let i = 0; i < empty; i++) {
      const newCell = new Cell(c, i, randomType());
      newCell.y = gridY + (i - empty) * cellH + cellH / 2; // 화면 위에서 시작
      newCell.scale = 0;

      // 폭탄
      if (!bombPlaced && swipeCount >= nextBombAt && countBombsInGrid() < maxBombsAllowed() && i === 0) {
        newCell.isBomb = true;
        bombCount++;
        nextBombAt = swipeCount + Math.max(2, 4 - Math.floor(bombCount * 0.3));
        bombPlaced = true;
      }

      newCells.push(newCell);
    }

    // 그리드 재구성: 새 셀(위) + 기존 살아있는 셀(아래)
    grid[c] = [...newCells, ...alive];

    // row/위치 재설정
    for (let r = 0; r < ROWS; r++) {
      grid[c][r].col = c;
      grid[c][r].row = r;
      grid[c][r].targetY = gridY + r * cellH + cellH / 2;
      grid[c][r].x = gridX + c * cellW + cellW / 2;
    }
  }
  if (dropped) sfx('drop');
  return dropped;
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
    dropColumns();
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
}

// ============ PARTICLES ============
function burst(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, sp = 80 + Math.random() * 180;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, size: 2 + Math.random() * 4, color });
  }
}
function updateParticles(dt) {
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt * 2.5; });
  particles = particles.filter(p => p.life > 0);
}
function drawParticles() {
  particles.forEach(p => {
    ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
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
  if (elapsed < 10) return 1;
  if (elapsed < 20) return 2;
  return 3;
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
    cell._bombMaxTaps = 5 + diff * 2;
    cell._bombTimer = Math.max(3, 5 - diff * 0.3);
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
    // 셀을 dead로 표시 + 즉시 낙하
    cell._dead = true;
    const bc = cell.col;
    if (grid[bc]) {
      grid[bc] = grid[bc].filter(c2 => c2 && !c2._dead);
      const empty = ROWS - grid[bc].length;
      const newCells = [];
      for (let i = 0; i < empty; i++) {
        const nc = new Cell(bc, i, randomType());
        nc.y = gridY + (i - empty) * cellH + cellH / 2;
        nc.x = gridX + bc * cellW + cellW / 2;
        nc.scale = 0;
        newCells.push(nc);
      }
      grid[bc] = [...newCells, ...grid[bc]];
      for (let r = 0; r < grid[bc].length; r++) {
        grid[bc][r].col = bc; grid[bc][r].row = r;
        grid[bc][r].targetY = gridY + r * cellH + cellH / 2;
        grid[bc][r].x = gridX + bc * cellW + cellW / 2;
      }
    }
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
        // 폭발! 게임 오버!
        sfx('miss');
        burst(cell.x, cell.y, '#FF1744', 20);
        burst(cell.x, cell.y, '#FF9100', 15);
        triggerShake(15);
        showFB(cell.x, cell.y - 30, '💥 펑!', '#FF1744', 36);
        cell.isBomb = false;
        setTimeout(() => endGame(), 500);
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
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < grid[c].length; r++) {
      if (grid[c][r] && grid[c][r].contains(x, y)) return { c, r };
    }
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
    removeGroup(swipePath, 0); // 내부에서 낙하까지 처리
    clearSwipeHighlight();
    setTimeout(() => { if (!hasAnyMatch()) shuffleGrid(); }, 300);
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
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  swipePath.forEach(({ c, r }, i) => {
    const cell = grid[c][r];
    if (!cell) return;
    if (i === 0) ctx.moveTo(cell.x, cell.y);
    else ctx.lineTo(cell.x, cell.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // 경로 위 숫자 표시
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
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
    // 하늘
    const sky = bg.createLinearGradient(0, 0, 0, gridY);
    if (feverMode) { sky.addColorStop(0, '#FF6F00'); sky.addColorStop(1, '#FFB74D'); }
    else { sky.addColorStop(0, '#64B5F6'); sky.addColorStop(1, '#E1F5FE'); }
    bg.fillStyle = sky; bg.fillRect(0, 0, W, gridY);
    if (!feverMode) {
      bg.fillStyle = 'rgba(255,255,255,0.6)';
      [[W * 0.15, gridY * 0.35, 35], [W * 0.6, gridY * 0.25, 45], [W * 0.85, gridY * 0.4, 30]].forEach(([cx, cy, s]) => {
        bg.beginPath(); bg.arc(cx, cy, s * 0.5, 0, Math.PI * 2); bg.arc(cx + s * 0.35, cy - s * 0.15, s * 0.35, 0, Math.PI * 2);
        bg.arc(cx + s * 0.65, cy, s * 0.4, 0, Math.PI * 2); bg.fill();
      });
    }
    // 언덕
    bg.fillStyle = feverMode ? '#FF8A65' : '#81C784';
    bg.beginPath(); bg.moveTo(0, gridY);
    for (let x = 0; x <= W; x += 20) bg.lineTo(x, gridY - 12 - Math.sin(x * 0.015) * 10);
    bg.lineTo(W, gridY); bg.closePath(); bg.fill();
    // 잔디
    const gg = bg.createLinearGradient(0, gridY, 0, H);
    if (feverMode) { gg.addColorStop(0, '#E65100'); gg.addColorStop(1, '#BF360C'); }
    else { gg.addColorStop(0, '#81C784'); gg.addColorStop(1, '#4CAF50'); }
    bg.fillStyle = gg; bg.fillRect(0, gridY, W, H - gridY);
    // 밭
    const bw = 6, px = 8, py = 4;
    const bx = gridX - px, by = gridY - py, bW = cellW * COLS + px * 2, bH = cellH * ROWS + py * 2;
    bg.fillStyle = 'rgba(0,0,0,0.15)'; bgRR(bg, bx - bw + 2, by - bw + 2, bW + bw * 2, bH + bw * 2, 10);
    bg.fillStyle = feverMode ? '#FF7043' : '#8D6E63'; bgRR(bg, bx - bw, by - bw, bW + bw * 2, bH + bw * 2, 10);
    const dirt = bg.createLinearGradient(bx, by, bx, by + bH);
    dirt.addColorStop(0, feverMode ? '#BCAAA4' : '#BCAAA4');
    dirt.addColorStop(1, feverMode ? '#A1887F' : '#8D6E63');
    bg.fillStyle = dirt; bgRR(bg, bx, by, bW, bH, 6);
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
  if (score > highScore) document.getElementById('hud-score').style.color = '#FFD700';
  const le = document.getElementById('hud-level');
  le.textContent = `🔥 콤보 ${combo}`;
  le.classList.remove('hidden');
}

// ============ GAME LOOP ============
let lastTime = 0;

function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

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

    let needsDrop = false;
    for (let c = 0; c < COLS; c++) {
      if (!grid[c] || grid[c].length !== ROWS) { needsDrop = true; break; }
      for (let r = 0; r < ROWS; r++) {
        if (!grid[c][r]) { needsDrop = true; break; }
      }
      if (needsDrop) break;
    }
    if (needsDrop) dropColumns();
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
  animating = false; timeLeft = 30; isNewRecord = false; currentChain = 0;
  bombCount = 0; swipeCount = 0; nextBombAt = 3; animTimeout = 0;
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
  gameRunning = true; timeLeft = 30; resize(); startBGM(); updateHUD();
  clearInterval(timerInterval);
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

  isNewRecord = score > highScore;
  if (isNewRecord) {
    highScore = score;
    localStorage.setItem('weedpuller_hs', highScore);
    sfx('newrecord');
  }

  let emoji, title;
  if (isNewRecord) { emoji = '🎉'; title = '신기록!'; }
  else if (score >= 3000) { emoji = '🏆'; title = '잡초 마스터!'; }
  else if (score >= 1500) { emoji = '🌟'; title = '잡초 전문가!'; }
  else if (score >= 500) { emoji = '💪'; title = '잘 뽑았어요!'; }
  else { emoji = '😅'; title = '다시 도전!'; }

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
      extraEl.innerHTML = `<div style="margin-bottom:12px;font-size:13px;color:#8B95A1">최고기록: ${highScore}점</div>` +
        `<button id="btn-share" style="background:none;border:1px solid #E5E8EB;border-radius:12px;padding:10px 0;width:100%;font-size:14px;font-weight:600;color:#4E5968;cursor:pointer;margin-bottom:8px">📤 점수 공유하기</button>`;
      document.getElementById('btn-share')?.addEventListener('click', () => {
        const text = `🌿 잡초 뽑기\n⭐ ${score}점 · 최대콤보 x${maxCombo}\n\n도전해보세요! 👇\nhttps://ssuksak.github.io/weed_puller/`;
        if (navigator.share) navigator.share({ text });
        else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showFB(canvas.width / 2 - 40, canvas.height * 0.5, '📋 복사됨!', '#4CAF50', 20));
      });
    }
  }, 500);
}

requestAnimationFrame(loop);
