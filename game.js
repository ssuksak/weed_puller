// =============================================
// 🌿 잡초 뽑기 - Weed Puller v3 (생존형 연타)
// 연타 + 성장 + 번식 + 골든잡초 + 게임오버
// =============================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ============ AUDIO ============
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null, bgmGain = null, bgmPlaying = false, bgmInterval = null, bgmNextTime = 0, bgmIdx = 0;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new AudioCtx();
  bgmGain = audioCtx.createGain();
  bgmGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
  bgmGain.connect(audioCtx.destination);
}

const BGM = [
  [261,0.5],[329,0.5],[392,0.5],[329,0.5],[349,0.5],[440,0.5],[392,1],
  [293,0.5],[349,0.5],[440,0.5],[349,0.5],[392,0.5],[493,0.5],[440,1],
];
const BGM_FAST = [
  [392,0.25],[440,0.25],[493,0.25],[523,0.25],[587,0.25],[523,0.25],[493,0.25],[440,0.25],
  [523,0.5],[659,0.5],[784,1],[659,0.25],[587,0.25],[523,0.25],[493,0.25],
];

function startBGM() {
  if (bgmPlaying) return; bgmPlaying = true; bgmIdx = 0;
  bgmNextTime = audioCtx.currentTime; scheduleBGM();
}
function scheduleBGM() {
  if (!bgmPlaying || !audioCtx) return;
  const mel = feverMode ? BGM_FAST : BGM;
  const tempo = feverMode ? 0.11 : 0.17;
  while (bgmNextTime < audioCtx.currentTime + 0.5) {
    const [f, d] = mel[bgmIdx % mel.length];
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(bgmGain);
    o.type = feverMode ? 'square' : 'triangle';
    o.frequency.setValueAtTime(f, bgmNextTime);
    g.gain.setValueAtTime(0.12, bgmNextTime);
    g.gain.exponentialRampToValueAtTime(0.01, bgmNextTime + d * tempo * 0.9);
    o.start(bgmNextTime); o.stop(bgmNextTime + d * tempo);
    bgmNextTime += d * tempo; bgmIdx++;
  }
  bgmInterval = setTimeout(scheduleBGM, 200);
}
function stopBGM() { bgmPlaying = false; clearTimeout(bgmInterval); }

function sfx(type, extra) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const mk = () => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); return {o,g}; };

  if (type === 'tap') {
    // 탭 피치: extra = progress (0~1)
    const p = extra || 0;
    const {o,g} = mk();
    o.type = 'sine';
    o.frequency.setValueAtTime(300 + p * 800, now);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    o.start(now); o.stop(now + 0.06);
  } else if (type === 'pull') {
    const {o,g} = mk();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, now);
    o.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    o.start(now); o.stop(now + 0.15);
    // noise burst
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.04, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const n = audioCtx.createBufferSource(), ng = audioCtx.createGain();
    n.buffer = buf; n.connect(ng); ng.connect(audioCtx.destination);
    ng.gain.setValueAtTime(0.2, now + 0.08);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    n.start(now + 0.08);
  } else if (type === 'combo') {
    const pitch = Math.min(600 + (extra || 0) * 80, 2000);
    const {o,g} = mk();
    o.type = 'triangle';
    o.frequency.setValueAtTime(pitch, now);
    o.frequency.exponentialRampToValueAtTime(pitch * 1.5, now + 0.06);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    o.start(now); o.stop(now + 0.18);
  } else if (type === 'fever') {
    [523,659,784,1046].forEach((f,i) => {
      const {o,g} = mk();
      o.type = 'square'; o.frequency.setValueAtTime(f, now+i*0.06);
      g.gain.setValueAtTime(0.1, now+i*0.06);
      g.gain.exponentialRampToValueAtTime(0.01, now+i*0.06+0.12);
      o.start(now+i*0.06); o.stop(now+i*0.06+0.12);
    });
  } else if (type === 'miss') {
    const {o,g} = mk();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(400, now);
    o.frequency.exponentialRampToValueAtTime(80, now + 0.25);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    o.start(now); o.stop(now + 0.3);
  } else if (type === 'golden') {
    [784,988,1175,1568].forEach((f,i) => {
      const {o,g} = mk();
      o.type = 'triangle'; o.frequency.setValueAtTime(f, now+i*0.05);
      g.gain.setValueAtTime(0.15, now+i*0.05);
      g.gain.exponentialRampToValueAtTime(0.01, now+i*0.05+0.15);
      o.start(now+i*0.05); o.stop(now+i*0.05+0.15);
    });
  } else if (type === 'pop') {
    const {o,g} = mk();
    o.type = 'sine';
    o.frequency.setValueAtTime(250+Math.random()*200, now);
    o.frequency.exponentialRampToValueAtTime(500+Math.random()*200, now+0.04);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.01, now+0.05);
    o.start(now); o.stop(now+0.05);
  } else if (type === 'spread') {
    const {o,g} = mk();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, now);
    o.frequency.exponentialRampToValueAtTime(300, now+0.15);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.01, now+0.2);
    o.start(now); o.stop(now+0.2);
  } else if (type === 'countdown') {
    const {o,g} = mk(); o.type='sine'; o.frequency.setValueAtTime(880,now);
    g.gain.setValueAtTime(0.12,now); g.gain.exponentialRampToValueAtTime(0.01,now+0.1);
    o.start(now); o.stop(now+0.1);
  } else if (type === 'go') {
    [523,784,1046].forEach((f,i) => { const {o,g}=mk(); o.type='square'; o.frequency.setValueAtTime(f,now+i*0.06); g.gain.setValueAtTime(0.12,now+i*0.06); g.gain.exponentialRampToValueAtTime(0.01,now+i*0.06+0.1); o.start(now+i*0.06); o.stop(now+i*0.06+0.1); });
  } else if (type === 'end') {
    [440,392,349,261].forEach((f,i) => { const {o,g}=mk(); o.type='triangle'; o.frequency.setValueAtTime(f,now+i*0.2); g.gain.setValueAtTime(0.12,now+i*0.2); g.gain.exponentialRampToValueAtTime(0.01,now+i*0.2+0.25); o.start(now+i*0.2); o.stop(now+i*0.2+0.25); });
  } else if (type === 'warning') {
    const {o,g}=mk(); o.type='square'; o.frequency.setValueAtTime(200,now);
    g.gain.setValueAtTime(0.08,now); g.gain.exponentialRampToValueAtTime(0.01,now+0.1);
    o.start(now); o.stop(now+0.1);
  }
}

// ============ STATE ============
let plants = [], particles = [], holes = [];
let score = 0, combo = 0, maxCombo = 0;
let gameRunning = false, gameOver = false;
let pullCount = 0, flowerMissCount = 0;
let spawnTimer = 0, elapsed = 0;
let feverMode = false, feverTimer = 0;
let screenShake = 0, shakeX = 0, shakeY = 0;

// ============ GRID ============
const COLS = 5, ROWS = 7;
let gridX = 0, gridY = 0, cellW = 0, cellH = 0;
const occupied = new Set();
function cellKey(c,r) { return `${c},${r}`; }

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const aW = canvas.width - 32, aH = canvas.height * 0.62;
  cellW = aW / COLS; cellH = aH / ROWS;
  gridX = 16; gridY = canvas.height * 0.15;
}
window.addEventListener('resize', () => { resize(); invalidateBgCache(); });
resize();

// ============ FACES ============
function drawFace(type, x, y, r) {
  const s = r;
  if (type === 'angry') {
    ctx.fillStyle='#000';
    ctx.fillRect(x-s*0.3-2,y-s*0.15-1.5,4,3); ctx.fillRect(x+s*0.3-2,y-s*0.15-1.5,4,3);
    ctx.strokeStyle='#000'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x-s*0.45,y-s*0.35); ctx.lineTo(x-s*0.15,y-s*0.25);
    ctx.moveTo(x+s*0.45,y-s*0.35); ctx.lineTo(x+s*0.15,y-s*0.25); ctx.stroke();
    ctx.lineWidth=1.5; ctx.beginPath();
    ctx.moveTo(x-s*0.2,y+s*0.2); ctx.lineTo(x,y+s*0.15); ctx.lineTo(x+s*0.2,y+s*0.2); ctx.stroke();
  } else if (type === 'happy') {
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.arc(x-s*0.25,y-s*0.1,3,Math.PI,0); ctx.fill();
    ctx.beginPath(); ctx.arc(x+s*0.25,y-s*0.1,3,Math.PI,0); ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y+s*0.1,s*0.2,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
  } else if (type === 'surprised') {
    ctx.fillStyle='#FFF';
    ctx.beginPath(); ctx.arc(x-s*0.25,y-s*0.1,4,0,Math.PI*2); ctx.arc(x+s*0.25,y-s*0.1,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.arc(x-s*0.25,y-s*0.1,2,0,Math.PI*2); ctx.arc(x+s*0.25,y-s*0.1,2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y+s*0.15,4,0,Math.PI*2); ctx.stroke();
  } else if (type === 'cute') {
    ctx.fillStyle='#FF6B9D';
    [-1,1].forEach(d => {
      const ex=x+d*s*0.25,ey=y-s*0.1;
      ctx.beginPath(); ctx.moveTo(ex,ey+2);
      ctx.bezierCurveTo(ex-3,ey-2,ex-5,ey+2,ex,ey+5);
      ctx.bezierCurveTo(ex+5,ey+2,ex+3,ey-2,ex,ey+2); ctx.fill();
    });
    ctx.fillStyle='rgba(255,150,150,0.4)';
    ctx.beginPath(); ctx.arc(x-s*0.4,y+s*0.1,4,0,Math.PI*2); ctx.arc(x+s*0.4,y+s*0.1,4,0,Math.PI*2); ctx.fill();
  } else if (type === 'dead') {
    ctx.strokeStyle='#000'; ctx.lineWidth=2;
    [-1,1].forEach(d => {
      const ex=x+d*s*0.25,ey=y-s*0.1;
      ctx.beginPath(); ctx.moveTo(ex-3,ey-3); ctx.lineTo(ex+3,ey+3);
      ctx.moveTo(ex+3,ey-3); ctx.lineTo(ex-3,ey+3); ctx.stroke();
    });
    ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y+s*0.15,4,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
    ctx.fillStyle='#FF6B6B'; ctx.beginPath(); ctx.ellipse(x+2,y+s*0.25,3,4,0.2,0,Math.PI*2); ctx.fill();
  } else if (type === 'scared') {
    ctx.fillStyle='#FFF';
    ctx.beginPath(); ctx.ellipse(x-s*0.25,y-s*0.12,4,5,0,0,Math.PI*2); ctx.ellipse(x+s*0.25,y-s*0.12,4,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.arc(x-s*0.25,y-s*0.06,2,0,Math.PI*2); ctx.arc(x+s*0.25,y-s*0.06,2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x-4,y+s*0.2); ctx.lineTo(x-1,y+s*0.15); ctx.lineTo(x+1,y+s*0.22); ctx.lineTo(x+4,y+s*0.17); ctx.stroke();
  } else if (type === 'golden') {
    // 별눈
    ctx.fillStyle='#FFD700';
    [-1,1].forEach(d => {
      const ex=x+d*s*0.25, ey=y-s*0.1;
      ctx.beginPath();
      for (let i=0;i<5;i++) {
        const a = (i/5)*Math.PI*2 - Math.PI/2;
        const r2 = i%2===0 ? 4 : 2;
        ctx.lineTo(ex+Math.cos(a)*r2, ey+Math.sin(a)*r2);
      }
      ctx.closePath(); ctx.fill();
    });
    ctx.strokeStyle='#B8860B'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y+s*0.12,s*0.15,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
  }
}

// ============ PLANT TYPES ============
const WEED_TYPES = [
  { name:'민들레', color:'#7CB342', inner:'#AED581', face:'angry', leaves:6, leafL:12 },
  { name:'바랭이', color:'#558B2F', inner:'#8BC34A', face:'surprised', leaves:4, leafL:18 },
  { name:'쇠비름', color:'#BF360C', inner:'#E57373', face:'happy', leaves:8, leafL:8 },
  { name:'명아주', color:'#33691E', inner:'#9CCC65', face:'angry', leaves:5, leafL:14 },
];
const FLOWER_TYPES = [
  { name:'데이지', color:'#388E3C', inner:'#FFF176', face:'cute', petal:'white', petalN:8 },
  { name:'튤립', color:'#2E7D32', inner:'#F48FB1', face:'cute', petal:'#E91E63', petalN:5 },
];

// ============ PLANT ============
// size: 1=작음(3탭), 2=중간(5탭), 3=큼(8탭)
// golden: 특수 (5탭, 대박 점수)
class Plant {
  constructor(col, row, opts = {}) {
    this.col = col; this.row = row;
    this.isFlower = opts.flower || false;
    this.isGolden = opts.golden || false;

    if (this.isGolden) {
      this.type = { name:'골든잡초', color:'#FFD700', inner:'#FFF9C4', face:'golden', leaves:6, leafL:14 };
      this.maxTaps = 5;
      this.points = 100;
    } else if (this.isFlower) {
      const ft = FLOWER_TYPES[Math.floor(Math.random()*FLOWER_TYPES.length)];
      this.type = ft;
      this.maxTaps = 1; // 1탭에 바로 뽑힘 (함정)
      this.points = -30;
    } else {
      this.type = WEED_TYPES[Math.floor(Math.random()*WEED_TYPES.length)];
      this.maxTaps = 3; // 기본, growStage에 따라 증가
      this.points = 10;
    }

    this.taps = 0;
    this.x = gridX + col * cellW + cellW / 2;
    this.y = gridY + row * cellH + cellH / 2;
    this.r = Math.min(cellW, cellH) * 0.22;
    this.growAnim = 0;
    this.growStage = 1; // 1~3
    this.growTimer = 0;
    this.isPulled = false;
    this.opacity = 1;
    this.wobble = Math.random() * Math.PI * 2;
    this.face = this.type.face;
    this.shake = 0;
    this.pullDir = {x:0,y:0};
    this.spreadTimer = 0; // 번식 타이머
  }

  get progress() { return this.taps / this.maxTaps; }

  update(dt) {
    if (this.growAnim < 1) this.growAnim = Math.min(1, this.growAnim + dt * 5);
    this.wobble += dt * 2;

    if (this.isPulled) {
      this.opacity -= dt * 4;
      this.x += this.pullDir.x * dt * 300;
      this.y += this.pullDir.y * dt * 300;
      return;
    }

    // 성장 (잡초만, 꽃/골든 제외)
    if (!this.isFlower && !this.isGolden && this.growStage < 3) {
      this.growTimer += dt;
      const growTime = 8 - Math.min(elapsed * 0.05, 4); // 시간 지날수록 빨리 자람
      if (this.growTimer > growTime) {
        this.growTimer = 0;
        this.growStage++;
        this.r *= 1.2;
        this.maxTaps = [0, 3, 5, 8][this.growStage];
        this.points = [0, 10, 20, 35][this.growStage];
        this.taps = Math.min(this.taps, this.maxTaps - 1);
        sfx('pop');
      }
    }

    // 번식 (큰 잡초만)
    if (!this.isFlower && !this.isGolden && this.growStage >= 3) {
      this.spreadTimer += dt;
      const spreadTime = 10 - Math.min(elapsed * 0.03, 5);
      if (this.spreadTimer > spreadTime) {
        this.spreadTimer = 0;
        spreadWeed(this.col, this.row);
      }
    }

    if (this.shake > 0) this.shake *= 0.85;
  }

  draw() {
    if (this.opacity <= 0) return;
    ctx.save(); ctx.globalAlpha = this.opacity;

    const sc = this.growAnim < 1 ? easeOutBack(this.growAnim) : 1 + Math.sin(this.wobble) * 0.03;
    const r = this.r * sc;
    const sx = (Math.random()-0.5) * this.shake;
    const sy = (Math.random()-0.5) * this.shake;
    const x = this.x + sx, y = this.y + sy;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(x, y+r*0.7, r*0.8, r*0.25, 0, 0, Math.PI*2); ctx.fill();

    if (this.isGolden) {
      // 골든 글로우
      ctx.fillStyle = 'rgba(255,215,0,0.2)';
      ctx.beginPath(); ctx.arc(x, y, r*1.5 + Math.sin(this.wobble*2)*3, 0, Math.PI*2); ctx.fill();
      // 잎
      ctx.fillStyle = '#FFD700';
      for (let i=0;i<6;i++) {
        const a=(i/6)*Math.PI*2+Math.sin(this.wobble+i)*0.15;
        ctx.save(); ctx.translate(x,y); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(r*0.8,0,r*0.5,r*0.2,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.arc(x,y,r*0.55,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFF9C4'; ctx.beginPath(); ctx.arc(x-r*0.06,y-r*0.06,r*0.4,0,Math.PI*2); ctx.fill();
      // 반짝임
      const sp = Math.sin(Date.now()*0.008);
      ctx.fillStyle=`rgba(255,255,255,${0.5+sp*0.4})`;
      ctx.beginPath(); ctx.arc(x+r*0.4,y-r*0.4,3+sp*2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x-r*0.3,y+r*0.2,2+sp,0,Math.PI*2); ctx.fill();
    } else if (this.isFlower) {
      const pc=this.type.petalN;
      ctx.fillStyle=this.type.petal;
      for (let i=0;i<pc;i++) {
        const a=(i/pc)*Math.PI*2+this.wobble*0.3;
        ctx.beginPath(); ctx.ellipse(x+Math.cos(a)*r*0.55,y+Math.sin(a)*r*0.45,r*0.3,r*0.16,a,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle=this.type.inner;
      ctx.beginPath(); ctx.arc(x,y,r*0.38,0,Math.PI*2); ctx.fill();
      // 반짝
      const sp2=Math.sin(Date.now()*0.005+this.wobble);
      ctx.fillStyle=`rgba(255,255,255,${0.3+sp2*0.3})`;
      ctx.beginPath(); ctx.arc(x+r*0.3,y-r*0.3,2+sp2,0,Math.PI*2); ctx.fill();
    } else {
      // Weed
      const lc=this.type.leaves, ll=this.type.leafL*sc*(0.7+this.growStage*0.15);
      ctx.fillStyle=this.type.color;
      for (let i=0;i<lc;i++) {
        const a=(i/lc)*Math.PI*2+Math.sin(this.wobble+i)*0.15;
        ctx.save(); ctx.translate(x,y); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(ll*0.65,0,ll*0.45,r*0.18,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle=this.type.color; ctx.beginPath(); ctx.arc(x,y,r*0.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=this.type.inner; ctx.beginPath(); ctx.arc(x-r*0.06,y-r*0.06,r*0.38,0,Math.PI*2); ctx.fill();

      // 성장 단계 표시 (크기로 자연스럽게 + 작은 싹 표시)
      if (this.growStage >= 2) {
        ctx.fillStyle = this.type.color;
        ctx.globalAlpha *= 0.5;
        ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = this.opacity;
      }
    }

    // Face
    drawFace(this.isPulled ? 'dead' : this.face, x, y, r);

    // 탭 진행도 바
    if (this.taps > 0 && !this.isPulled && this.maxTaps > 1) {
      const barW = r * 1.6, barH = 4;
      const bx = x - barW/2, by = y + r + 6;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx, by, barW, barH);
      const prog = this.taps / this.maxTaps;
      ctx.fillStyle = prog > 0.7 ? '#4CAF50' : prog > 0.4 ? '#FFC107' : '#FF9800';
      ctx.fillRect(bx, by, barW * prog, barH);
    }

    ctx.restore();
  }

  contains(px, py) {
    const dx = px - this.x, dy = py - this.y;
    return dx * dx + dy * dy < (this.r * 1.4) ** 2;
  }
}

function easeOutBack(t) { const c=1.7; return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2); }

// ============ SPREAD (번식) ============
function spreadWeed(col, row) {
  const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
  const shuffled = dirs.sort(() => Math.random() - 0.5);
  for (const [dc,dr] of shuffled) {
    const nc = col+dc, nr = row+dr;
    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !occupied.has(cellKey(nc,nr))) {
      const p = new Plant(nc, nr);
      plants.push(p);
      occupied.add(cellKey(nc,nr));
      sfx('spread');
      // 번식 파티클
      burst(p.x, p.y, '#8BC34A', 4);
      return;
    }
  }
}

// ============ HOLES ============
class Hole {
  constructor(x,y,r) { this.x=x; this.y=y; this.r=r; this.life=1; }
  update(dt) { this.life -= dt * 0.8; }
  draw() {
    if (this.life<=0) return;
    ctx.save(); ctx.globalAlpha=this.life*0.4;
    ctx.fillStyle='#3E2723';
    ctx.beginPath(); ctx.ellipse(this.x,this.y,this.r*0.4,this.r*0.3,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ============ PARTICLES ============
function burst(x, y, color, n=8) {
  for (let i=0;i<n;i++) {
    const a=(i/n)*Math.PI*2, sp=100+Math.random()*200;
    particles.push({ x,y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:1, size:3+Math.random()*5, color });
  }
}
function updateParticles(dt) {
  particles.forEach(p => { p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.95; p.vy*=0.95; p.life-=dt*3; });
  particles = particles.filter(p => p.life > 0);
}
function drawParticles() {
  particles.forEach(p => {
    ctx.save(); ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

// ============ FEEDBACK ============
function showFB(x, y, text, color, size=22) {
  const el = document.createElement('div');
  el.className='feedback-pop';
  el.textContent=text;
  el.style.left=x+'px'; el.style.top=(y-20)+'px';
  el.style.color=color; el.style.fontSize=size+'px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 600);
}
function triggerShake(n) { screenShake=n; }

// ============ SPAWN ============
function spawnPlant() {
  const empty=[];
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (!occupied.has(cellKey(c,r))) empty.push({c,r});
  if (!empty.length) return;
  const cell = empty[Math.floor(Math.random()*empty.length)];

  // 골든잡초 (3% 확률)
  if (Math.random() < 0.03) {
    const p = new Plant(cell.c, cell.r, { golden: true });
    plants.push(p); occupied.add(cellKey(cell.c,cell.r));
    sfx('pop'); return;
  }
  // 꽃 (15~30%)
  const flowerRate = Math.min(0.15 + elapsed * 0.002, 0.3);
  if (Math.random() < flowerRate) {
    const p = new Plant(cell.c, cell.r, { flower: true });
    plants.push(p); occupied.add(cellKey(cell.c,cell.r));
    sfx('pop'); return;
  }
  // 잡초
  const p = new Plant(cell.c, cell.r);
  plants.push(p); occupied.add(cellKey(cell.c,cell.r));
  sfx('pop');
}

// ============ TAP (핵심 메카닉!) ============
function tapPlant(plant) {
  if (plant.isPulled) return;

  plant.taps++;
  plant.shake = 6;
  const progress = plant.taps / plant.maxTaps;

  // 탭 사운드 (피치 올라감)
  sfx('tap', progress);

  if (plant.taps >= plant.maxTaps) {
    // 뽑혔다!
    completePull(plant);
  }
}

function completePull(plant) {
  plant.isPulled = true;
  plant.face = 'dead';
  plant.pullDir = { x: (Math.random()-0.5)*2, y: -1 };
  occupied.delete(cellKey(plant.col, plant.row));
  holes.push(new Hole(plant.x, plant.y, plant.r));

  if (plant.isFlower) {
    score = Math.max(0, score + plant.points);
    combo = 0; flowerMissCount++;
    showFB(plant.x, plant.y, '🌸 앗! -30', '#F04452', 24);
    sfx('miss'); triggerShake(10);
    feverMode = false;
    document.getElementById('fever-overlay').classList.remove('active');
    burst(plant.x, plant.y, '#FFB7C5', 8);
  } else if (plant.isGolden) {
    // 골든: 대박 점수 + 주변 잡초 전부 제거!
    const pts = 100 * Math.max(combo, 1);
    score += pts; pullCount++;
    combo += 3;
    if (combo > maxCombo) maxCombo = combo;
    showFB(plant.x, plant.y, `⭐ +${pts}!`, '#FFD700', 32);
    sfx('golden'); triggerShake(8);
    burst(plant.x, plant.y, '#FFD700', 15);
    burst(plant.x, plant.y, '#FFF9C4', 10);
    // 주변 잡초 제거
    clearAdjacentWeeds(plant.col, plant.row);
  } else {
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    const mult = feverMode ? combo * 2 : Math.min(combo, 10);
    const pts = plant.points * mult;
    score += pts; pullCount++;
    sfx('pull'); triggerShake(4);

    if (combo >= 10 && !feverMode) {
      feverMode = true; feverTimer = 8; invalidateBgCache();
      sfx('fever');
      document.getElementById('fever-overlay').classList.add('active');
      showFB(canvas.width/2-50, canvas.height*0.12, '🔥 FEVER! 🔥', '#FFD700', 30);
    } else if (combo > 1) sfx('combo', combo);

    const ct = combo>1 ? ` x${combo}${feverMode?'🔥':''}` : '';
    showFB(plant.x, plant.y, `+${pts}${ct}`, feverMode?'#FFD700':combo>=5?'#FFC107':'#4CAF50', combo>=5?28:22);
    burst(plant.x, plant.y, '#8D6E63', 8);
    burst(plant.x, plant.y, '#A0522D', 5);
  }
  updateHUD();
}

function clearAdjacentWeeds(col, row) {
  const dirs = [[0,0],[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]];
  dirs.forEach(([dc,dr]) => {
    const nc=col+dc, nr=row+dr;
    const target = plants.find(p => p.col===nc && p.row===nr && !p.isPulled && !p.isFlower);
    if (target && target !== plants.find(p=>p.isGolden && p.col===col && p.row===row)) {
      target.isPulled = true; target.face = 'dead';
      target.pullDir = { x:(Math.random()-0.5)*2, y:-1 };
      occupied.delete(cellKey(nc,nr));
      holes.push(new Hole(target.x, target.y, target.r));
      burst(target.x, target.y, '#FFD700', 5);
      score += 10;
    }
  });
}

// ============ CHECK GAME OVER ============
function checkGameOver() {
  // 모든 칸이 차면 게임 오버
  let filledCount = 0;
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    if (occupied.has(cellKey(c,r))) filledCount++;
  }
  // 90% 이상 차면 경고
  const fillRate = filledCount / (COLS * ROWS);
  if (fillRate > 0.9 && !gameOver) {
    sfx('warning');
  }
  if (filledCount >= COLS * ROWS) {
    endGame();
  }
}

// ============ INPUT ============
canvas.addEventListener('touchstart', onTap, { passive: false });
canvas.addEventListener('mousedown', onTap);

function pos(e) { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }

function onTap(e) {
  if (!gameRunning) return;
  e.preventDefault?.();
  const { x, y } = pos(e);
  for (let i = plants.length-1; i >= 0; i--) {
    if (!plants[i].isPulled && plants[i].contains(x, y)) {
      tapPlant(plants[i]);
      break;
    }
  }
}

// ============ BACKGROUND (캐시) ============
let bgDecos=[], bgDecoCache=[], bgCache=null, bgCacheKey='';
function invalidateBgCache() { bgCacheKey=''; }

function initBgDecos() {
  bgDecos=[]; bgDecoCache=[];
  const types=['🐛','🐞','🦋','🐌','🍄','🌻','💧','🪨','🐜','🪱'];
  for (let i=0;i<14;i++) {
    const size=10+Math.random()*8;
    const oc=document.createElement('canvas'); oc.width=size*2; oc.height=size*2;
    const c=oc.getContext('2d'); c.font=`${size}px serif`; c.textAlign='center'; c.textBaseline='middle';
    c.fillText(types[i%types.length],size,size);
    bgDecoCache.push(oc);
    bgDecos.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, size, wobble:Math.random()*Math.PI*2, speed:0.5+Math.random()*1.5 });
  }
}

function drawBG() {
  const key=`${feverMode}_${canvas.width}_${canvas.height}`;
  if (bgCacheKey!==key) {
    if (!bgCache) bgCache=document.createElement('canvas');
    bgCache.width=canvas.width; bgCache.height=canvas.height;
    const bg=bgCache.getContext('2d');
    const gr=bg.createRadialGradient(canvas.width/2,canvas.height/2,50,canvas.width/2,canvas.height/2,canvas.height);
    if (feverMode) { gr.addColorStop(0,'#FF8A65'); gr.addColorStop(1,'#BF360C'); }
    else { gr.addColorStop(0,'#66BB6A'); gr.addColorStop(1,'#2E7D32'); }
    bg.fillStyle=gr; bg.fillRect(0,0,canvas.width,canvas.height);
    const gc=feverMode?['#FF7043','#E64A19']:['#81C784','#4CAF50','#388E3C'];
    for (let i=0;i<100;i++) {
      bg.globalAlpha=0.2+Math.sin(i*0.7)*0.1; bg.fillStyle=gc[i%gc.length];
      bg.beginPath(); bg.ellipse((i*41+Math.sin(i*2.7)*25)%canvas.width,(i*29+Math.cos(i*1.9)*20)%canvas.height,2+Math.sin(i),5+Math.cos(i)*2,Math.sin(i*0.5)*0.5,0,Math.PI*2); bg.fill();
    }
    bg.globalAlpha=1;
    const bw=8,px=10,py=6,bx=gridX-px,by=gridY-py,bW=cellW*COLS+px*2,bH=cellH*ROWS+py*2;
    bg.fillStyle='rgba(0,0,0,0.2)'; bgRR(bg,bx-bw+3,by-bw+3,bW+bw*2,bH+bw*2,12);
    bg.fillStyle=feverMode?'#D84315':'#6D4C41'; bgRR(bg,bx-bw,by-bw,bW+bw*2,bH+bw*2,12);
    bg.fillStyle=feverMode?'#FF8A65':'#8D6E63'; bgRR(bg,bx-2,by-2,bW+4,bH+4,8);
    const dg=bg.createLinearGradient(bx,by,bx,by+bH);
    if(feverMode){dg.addColorStop(0,'#A1887F');dg.addColorStop(1,'#795548');}
    else{dg.addColorStop(0,'#A1887F');dg.addColorStop(0.3,'#8D6E63');dg.addColorStop(1,'#6D4C41');}
    bg.fillStyle=dg; bgRR(bg,bx,by,bW,bH,6);
    bg.strokeStyle='rgba(0,0,0,0.06)'; bg.lineWidth=1; bg.setLineDash([4,4]);
    for(let c=1;c<COLS;c++){bg.beginPath();bg.moveTo(gridX+c*cellW,by+4);bg.lineTo(gridX+c*cellW,by+bH-4);bg.stroke();}
    for(let r=1;r<ROWS;r++){bg.beginPath();bg.moveTo(bx+4,gridY+r*cellH);bg.lineTo(bx+bW-4,gridY+r*cellH);bg.stroke();}
    bg.setLineDash([]);
    bgCacheKey=key;
  }
  ctx.drawImage(bgCache,0,0);
  if(!bgDecos.length) initBgDecos();
  const t=Date.now()*0.001;
  bgDecos.forEach((d,i)=>{
    ctx.save(); ctx.globalAlpha=0.3;
    ctx.drawImage(bgDecoCache[i], d.x+Math.sin(t*d.speed+d.wobble)*5-d.size, d.y+Math.cos(t*d.speed*0.7+d.wobble)*3-d.size);
    ctx.restore();
  });
}
function bgRR(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();c.fill();}

// ============ HUD ============
function updateHUD() {
  document.getElementById('hud-score').textContent = score;
  // 타이머 대신 채움률 표시
  const filled = plants.filter(p=>!p.isPulled).length;
  const pct = Math.round(filled / (COLS*ROWS) * 100);
  document.getElementById('hud-timer').textContent = `${pct}%`;
  if (pct >= 80) document.getElementById('hud-timer').style.color = '#F04452';
  else if (pct >= 60) document.getElementById('hud-timer').style.color = '#FF9800';
  else document.getElementById('hud-timer').style.color = '';

  const ce=document.getElementById('hud-combo');
  if (combo>=2) {
    ce.textContent=feverMode?`🔥FEVER x${combo}🔥`:`🔥x${combo} COMBO`;
    ce.classList.remove('hidden','show'); void ce.offsetWidth; ce.classList.add('show');
  } else ce.classList.add('hidden');

  const le=document.getElementById('hud-level');
  const surviveTime = Math.floor(elapsed);
  le.textContent = `⏱ ${surviveTime}초 생존`;
  le.classList.remove('hidden');
}

// ============ GAME LOOP ============
let lastTime = 0;

function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (screenShake > 0) {
    shakeX=(Math.random()-0.5)*screenShake; shakeY=(Math.random()-0.5)*screenShake;
    screenShake*=0.85; if(screenShake<0.3) screenShake=0;
  } else { shakeX=0; shakeY=0; }

  ctx.save(); ctx.translate(shakeX, shakeY);
  ctx.clearRect(-10,-10,canvas.width+20,canvas.height+20);
  drawBG();

  holes.forEach(h=>{h.update(dt);h.draw()});
  holes=holes.filter(h=>h.life>0);

  if (gameRunning) {
    elapsed += dt;

    // 스폰 속도: 시간 지날수록 빨라짐
    spawnTimer += dt;
    const rate = Math.max(0.8, 2.0 - elapsed * 0.015);
    if (spawnTimer > rate) { spawnTimer = 0; spawnPlant(); }

    if (feverMode) {
      feverTimer -= dt;
      if (feverTimer <= 0) { feverMode = false; invalidateBgCache(); document.getElementById('fever-overlay').classList.remove('active'); }
    }

    // 게임 오버 체크
    checkGameOver();
  }

  plants.forEach(p => p.update(dt));
  plants = plants.filter(p => p.opacity > 0);
  plants.forEach(p => p.draw());
  updateParticles(dt); drawParticles();

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
  plants=[]; particles=[]; holes=[]; occupied.clear();
  score=0; combo=0; maxCombo=0; elapsed=0;
  pullCount=0; flowerMissCount=0; feverMode=false; gameOver=false;
  document.getElementById('fever-overlay').classList.remove('active');
  invalidateBgCache(); updateHUD();

  const cd=document.getElementById('countdown');
  let n=3;
  (function tick(){
    if(n>0){
      cd.classList.remove('hidden'); cd.textContent=n;
      cd.style.animation='none'; void cd.offsetWidth; cd.style.animation='countPop 0.5s ease-out';
      sfx('countdown'); n--; setTimeout(tick,700);
    } else {
      cd.textContent='GO!'; cd.style.color='#4CAF50';
      cd.style.animation='none'; void cd.offsetWidth; cd.style.animation='countPop 0.5s ease-out';
      sfx('go');
      setTimeout(()=>{cd.classList.add('hidden');cd.style.color='white';startGame();},500);
    }
  })();
}

function startGame() {
  gameRunning = true; resize(); startBGM();
  for (let i=0;i<3;i++) setTimeout(spawnPlant, i*300);
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  gameRunning = false; stopBGM(); sfx('end');
  document.getElementById('hud-timer').style.color = '';

  const surviveTime = Math.floor(elapsed);
  let emoji, title;
  if (surviveTime >= 120) { emoji='🏆'; title='잡초 마스터!'; }
  else if (surviveTime >= 60) { emoji='🌟'; title='잡초 전문가!'; }
  else if (surviveTime >= 30) { emoji='💪'; title='열심히 뽑았어요!'; }
  else { emoji='😅'; title='다시 도전!'; }

  document.getElementById('hud').classList.add('hidden');
  document.getElementById('hud-combo').classList.add('hidden');
  document.getElementById('hud-level').classList.add('hidden');

  setTimeout(()=>{
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('result-emoji').textContent=emoji;
    document.getElementById('result-title').textContent=title;
    document.getElementById('result-score-value').textContent=score;
    document.getElementById('stat-weeds').textContent=pullCount;
    document.getElementById('stat-combo').textContent=`x${maxCombo}`;
    document.getElementById('stat-miss').textContent=flowerMissCount;
    // 생존시간도 표시
    document.querySelector('.result-label').textContent=`점 · ${surviveTime}초 생존`;
  }, 500);
}

requestAnimationFrame(loop);
