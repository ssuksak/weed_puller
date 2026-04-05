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

const BGM_MEL = [
  [392,0.5],[370,0.25],[349,0.25],[330,0.5],[294,0.25],[330,0.25],
  [349,0.5],[392,0.5],[440,0.5],[392,0.5],
  [370,0.5],[349,0.25],[330,0.25],[294,0.5],[262,0.25],[294,0.25],
  [330,0.5],[349,0.5],[392,1],
];
const BGM_BASS = [[131,1],[147,1],[165,1],[131,1],[147,1],[165,1],[175,1],[131,1]];
const BGM_FEVER = [
  [523,0.25],[587,0.25],[659,0.25],[698,0.25],[784,0.5],[659,0.25],[587,0.25],
  [523,0.25],[587,0.25],[784,0.5],[698,0.25],[659,0.25],[587,0.5],[523,0.5],[659,1],
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
  const mel = feverMode ? BGM_FEVER : BGM_MEL;
  const tempo = feverMode ? 0.10 : 0.15;
  const mk = (type, freq, time, dur, vol) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(bgmGain); o.type = type;
    o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + dur);
    o.start(time); o.stop(time + dur);
  };
  while (bgmNextTime < audioCtx.currentTime + 0.5) {
    const [f, d] = mel[bgmIdx % mel.length];
    mk(feverMode ? 'square' : 'triangle', f, bgmNextTime, d * tempo * 0.9, 0.3);
    bgmNextTime += d * tempo; bgmIdx++;
  }
  const bt = tempo * 4;
  while (bgmBassNext < audioCtx.currentTime + 0.5) {
    const [f, d] = BGM_BASS[bgmBassIdx % BGM_BASS.length];
    mk('sawtooth', f, bgmBassNext, d * bt * 0.4, 0.2);
    mk('sine', f * 0.5, bgmBassNext, d * bt * 0.3, 0.15);
    bgmBassNext += d * bt; bgmBassIdx++;
  }
  const dt2 = tempo * 2;
  while (bgmDrumNext < audioCtx.currentTime + 0.5) {
    const beat = bgmDrumBeat % 4;
    if (beat === 0 || beat === 2) mk('sine', 150, bgmDrumNext, 0.1, 0.4);
    if (beat === 1 || beat === 3) {
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.04, audioCtx.sampleRate);
      const sn = buf.getChannelData(0);
      for (let i = 0; i < sn.length; i++) sn[i] = (Math.random() * 2 - 1) * (1 - i / sn.length);
      const n = audioCtx.createBufferSource(), ng = audioCtx.createGain();
      n.buffer = buf; n.connect(ng); ng.connect(bgmGain);
      ng.gain.setValueAtTime(0.15, bgmDrumNext);
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
let animating = false; // 낙하/연쇄 애니메이션 중
let timeLeft = 60; // 60초 타임어택
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
  { id: 0, name: '토마토', bg: '#EF5350', face: '#FFCDD2', accent: '#C62828', expr: 'happy', headDeco: 'tomato' },
  { id: 1, name: '당근', bg: '#FF8A65', face: '#FFE0B2', accent: '#E64A19', expr: 'laugh', headDeco: 'carrot' },
  { id: 2, name: '양배추', bg: '#81C784', face: '#C8E6C9', accent: '#388E3C', expr: 'wink', headDeco: 'cabbage' },
  { id: 3, name: '옥수수', bg: '#FFD54F', face: '#FFF9C4', accent: '#F9A825', expr: 'surprised', headDeco: 'corn' },
  { id: 4, name: '가지', bg: '#AB47BC', face: '#E1BEE7', accent: '#7B1FA2', expr: 'angry', headDeco: 'eggplant' },
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
    this.selected = false; // 하이라이트
    this.shake = 0;
    this.taps = 0; // 연타용 (혼자일 때 3탭 필요)
    this.maxTaps = 3;
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
    } else if (deco === 'eggplant') {
      // 가지 꼭지 (초록 모자)
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.moveTo(x - faceR * 0.5, y - faceR * 0.75);
      ctx.quadraticCurveTo(x - faceR * 0.3, y - faceR * 1.1, x, y - faceR * 0.85);
      ctx.quadraticCurveTo(x + faceR * 0.3, y - faceR * 1.1, x + faceR * 0.5, y - faceR * 0.75);
      ctx.quadraticCurveTo(x, y - faceR * 0.7, x - faceR * 0.5, y - faceR * 0.75);
      ctx.fill();
      // 꼭지 줄기
      ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - faceR * 0.9); ctx.lineTo(x, y - faceR * 1.1); ctx.stroke();
    }

    // --- 표정 ---
    drawFace(t.expr, x, y, faceR);

    // 연타 진행도 바 (혼자일 때)
    if (this.taps > 0 && this.taps < this.maxTaps) {
      const barW = r * 1.4, barH = 3;
      const bx2 = x - barW / 2, by2 = y + r * 0.7;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx2, by2, barW, barH);
      ctx.fillStyle = this.taps >= 2 ? '#4CAF50' : '#FF9800';
      ctx.fillRect(bx2, by2, barW * (this.taps / this.maxTaps), barH);
    }

    ctx.restore();
  }

  contains(px, py) {
    return (px - this.x) ** 2 + (py - this.y) ** 2 < (this.r * 1.3) ** 2;
  }
}

// ============ FACES (귀엽고 세련되게) ============
function drawFace(type, x, y, r) {
  const s = r * 0.9;
  const eyeY = y - s * 0.08;
  const eyeSpacing = s * 0.22;
  const eyeR = s * 0.14;

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
      // 인접한 같은 타입이 3개 이상 안 되도록 배치
      let typeId = randomType();
      let attempts = 0;
      while (attempts < 10) {
        // 왼쪽 2개, 위쪽 2개 체크
        const leftMatch = c >= 2 && grid[c-1][r] && grid[c-2][r] &&
          grid[c-1][r].typeId === typeId && grid[c-2][r].typeId === typeId;
        const topMatch = r >= 2 && grid[c][r-1] && grid[c][r-2] &&
          grid[c][r-1].typeId === typeId && grid[c][r-2].typeId === typeId;
        if (!leftMatch && !topMatch) break;
        typeId = randomType();
        attempts++;
      }
      grid[c][r] = new Cell(c, r, typeId);
    }
  }
}

function randomType() {
  return Math.floor(Math.random() * WEED_COUNT);
}

function hasAnyMatch() {
  for (let c = 0; c < COLS; c++) {
    if (!grid[c]) continue;
    for (let r = 0; r < grid[c].length; r++) {
      if (grid[c][r] && !grid[c][r].removing && findGroup(c, r).length >= 2) return true;
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
    if (!grid[c] || r >= grid[c].length) continue;
    if (!grid[c][r] || grid[c][r].removing) continue;
    if (grid[c][r].typeId !== typeId) continue;

    visited.add(key);
    group.push({ c, r });
    queue.push([c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]);
  }
  return group;
}

// 그룹 제거 + 점수
function removeGroup(group, chain) {
  const size = group.length;
  if (size < 2) return;

  // 점수: 크기 제곱 * 연쇄 배수
  const chainMult = 1 + chain * 0.5;
  const pts = Math.round(size * size * 5 * chainMult);
  score += pts;
  pullCount += size;
  combo += size;
  if (combo > maxCombo) maxCombo = combo;

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
  const centerX = group.reduce((s, g) => s + grid[g.c][g.r].x, 0) / size;
  const centerY = group.reduce((s, g) => s + grid[g.c][g.r].y, 0) / size;
  const chainText = chain > 0 ? ` 💥${chain + 1}연쇄!` : '';
  const sizeText = size >= 6 ? ' 대박!' : size >= 4 ? ' 좋아!' : '';
  const fontSize = Math.min(18 + size * 2 + chain * 3, 36);
  const color = chain >= 3 ? '#FF1744' : chain >= 2 ? '#FF9100' : size >= 6 ? '#FFD700' : '#4CAF50';
  showFB(centerX - 30, centerY, `+${pts}${sizeText}${chainText}`, color, fontSize);

  // 파티클
  group.forEach(({ c, r }) => {
    const cell = grid[c][r];
    if (cell) {
      cell.removing = true;
      burst(cell.x, cell.y, cell.type.color, 4 + chain * 2);
      burst(cell.x, cell.y, '#A0522D', 2);
    }
  });
}

// 낙하 처리
function dropColumns() {
  let dropped = false;
  for (let c = 0; c < COLS; c++) {
    if (!grid[c]) { grid[c] = []; continue; }

    // 실제 제거 (removeAnim이 진행된 것들)
    grid[c] = grid[c].filter(cell => !cell.removing);

    // 빈 칸 수
    const empty = ROWS - grid[c].length;
    if (empty > 0) dropped = true;

    // 위에서 새 셀 생성
    for (let i = 0; i < empty; i++) {
      const newCell = new Cell(c, -empty + i, randomType());
      newCell.y = gridY + (-empty + i) * cellH + cellH / 2; // 화면 위에서 시작
      grid[c].unshift(newCell);
    }

    // row 인덱스 + 목표 위치 재설정
    for (let r = 0; r < grid[c].length; r++) {
      grid[c][r].col = c;
      grid[c][r].row = r;
      grid[c][r].targetY = gridY + r * cellH + cellH / 2;
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
  if (!allSettled) return false;

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
    animating = true;
    // 딜레이 후 낙하
    setTimeout(() => {
      dropColumns();
      // 낙하 후 다시 체크
      setTimeout(() => checkChains(), 400);
    }, 300);
    return true;
  } else {
    currentChain = 0;
    animating = false;
    // 매치 가능한 거 있는지 체크
    if (!hasAnyMatch()) {
      // 섞기
      shuffleGrid();
    }
    return false;
  }
}

function shuffleGrid() {
  showFB(canvas.width / 2 - 40, canvas.height * 0.4, '🔀 섞는 중!', '#FFF', 24);
  const types = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < grid[c].length; r++) {
      types.push(grid[c][r].typeId);
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
      grid[c][r].typeId = types[idx];
      grid[c][r].type = TYPES[types[idx]];
      grid[c][r].shake = 5;
      idx++;
    }
  }
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

// ============ INPUT (스와이프 + 연타 하이브리드) ============
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
  swipePath.forEach(({ c, r }) => { if (grid[c] && grid[c][r]) grid[c][r].selected = false; });
  swipePath = [];
  swipeTypeId = -1;
}

function onDown(e) {
  if (!gameRunning || animating) return;
  e.preventDefault?.();
  const { x, y } = pos(e);
  const cell = findCellAt(x, y);
  if (!cell) return;

  const { c, r } = cell;
  const g = grid[c][r];
  if (!g || g.removing) return;

  swiping = true;
  swipeTypeId = g.typeId;
  swipePath = [{ c, r }];
  g.selected = true;
  g.shake = 3;
  sfx('pop', 0);
}

function onMove(e) {
  if (!swiping || !gameRunning || animating) return;
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
  if (!swiping || !gameRunning || animating) return;
  e.preventDefault?.();
  swiping = false;

  if (swipePath.length >= 2) {
    // 스와이프로 2개 이상 → 한꺼번에 터짐!
    currentChain = 0;
    removeGroup(swipePath, 0);
    animating = true;
    clearSwipeHighlight();
    setTimeout(() => {
      dropColumns();
      setTimeout(() => checkChains(), 350);
    }, 250);
  } else if (swipePath.length === 1) {
    // 단독 탭 → 연타 모드
    const { c, r } = swipePath[0];
    const g = grid[c][r];
    if (g && !g.removing) {
      // 먼저 BFS로 그룹 체크
      const group = findGroup(c, r);
      if (group.length >= 2) {
        // 그룹이 있으면 탭으로도 터뜨릴 수 있음
        currentChain = 0;
        removeGroup(group, 0);
        animating = true;
        clearSwipeHighlight();
        setTimeout(() => {
          dropColumns();
          setTimeout(() => checkChains(), 350);
        }, 250);
      } else {
        // 혼자 → 연타!
        g.taps++;
        g.shake = 6;
        sfx('pop', g.taps);
        showFB(g.x, g.y - g.r, `${g.taps}/${g.maxTaps}`, '#FFF', 14);

        if (g.taps >= g.maxTaps) {
          // 연타 완료 → 뽑힘!
          g.taps = 0;
          currentChain = 0;
          removeGroup([{ c, r }], 0);
          animating = true;
          clearSwipeHighlight();
          setTimeout(() => {
            dropColumns();
            setTimeout(() => checkChains(), 350);
          }, 250);
        }
      }
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
  ctx.font = 'bold 16px sans-serif';
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
  if (timeLeft <= 10) document.getElementById('hud-timer').style.color = '#F04452';
  else document.getElementById('hud-timer').style.color = '';
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
  if (gameRunning) updateHUD();

  ctx.restore();
  requestAnimationFrame(loop);
}

// ============ START ============
document.getElementById('btn-start').addEventListener('click', startCountdown);
document.getElementById('btn-retry').addEventListener('click', startCountdown);

function startCountdown() {
  initAudio();
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('result-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');

  particles = []; score = 0; combo = 0; maxCombo = 0; chainLevel = 0;
  pullCount = 0; elapsed = 0; feverMode = false; gameOver = false;
  animating = false; timeLeft = 60; isNewRecord = false; currentChain = 0;
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
  gameRunning = true; resize(); startBGM();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--; updateHUD();
    if (timeLeft <= 10 && timeLeft > 0) sfx('countdown');
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  if (gameOver) return;
  gameOver = true; gameRunning = false; stopBGM(); sfx('end');
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
