/* KETTLE.EXE V4.0 - THE FINAL VESSEL
   FULL CODE INTEGRATION: WEBCAM / PSY-PROFILE / PROCEDURAL AUDIO / END-GAME
*/

const CONFIG = {
    titles: ["KETTLE_SYS", "I SEE YOU", "COOLING...", "SYMBIOSIS", "⠀"],
    bootText: `>> INITIALIZING KTL_CORE...
>> WARNING: BIOMETRIC LOCK ACTIVE.
>> ENTITY DETECTED WITHIN THE VESSEL.
>> THIS IS NOT A GAME. THIS IS A CONTAINMENT PROCEDURE.
>> OPTICAL SENSORS SYNCHRONIZING...
>> ...
>> CLICK TO ACCEPT THE BURDEN.`
};

const STATE = {
    session: 1,
    isOn: false,
    temp: 20,
    chaos: 0,
    heartRate: 0,
    act: 0, // 0:Boot, 1:Normal, 2:Audit, 3:Symbiosis, 4:Final
    angle: 0,
    clicks: 0,
    profile: "NEUROTYPICAL",
    resignationTimer: 0,
    webcamActive: false,
    stream: null
};

// --- AUDIO SYSTEM ---
class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.master.gain.value = 0.4;
        this.humOsc = null;
        this.boilNode = null;
        this.heartInterval = null;
    }

    startHum() {
        this.humOsc = this.ctx.createOscillator();
        this.humOsc.type = 'sawtooth';
        this.humOsc.frequency.value = 50;
        
        const low = this.ctx.createOscillator();
        low.type = 'sine';
        low.frequency.value = 18.5; // Infrasound

        const gain = this.ctx.createGain();
        gain.gain.value = 0.1;
        
        this.humOsc.connect(gain);
        low.connect(gain);
        gain.connect(this.master);
        
        this.humOsc.start();
        low.start();
        this.humRef = { osc: this.humOsc, low: low };
    }

    startBoil() {
        const bufSize = 2 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<bufSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        const gain = this.ctx.createGain();
        gain.gain.value = 0;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        noise.start();
        
        this.boilRef = { node: noise, filter: filter, gain: gain };
    }

    pulseHeart(bpm) {
        if(this.heartInterval) clearInterval(this.heartInterval);
        const interval = 60000 / bpm;
        this.heartInterval = setInterval(() => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.frequency.value = 45;
            osc.connect(g); g.connect(this.master);
            osc.start();
            g.gain.setValueAtTime(0.5, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
            osc.stop(this.ctx.currentTime + 0.1);
        }, interval);
    }

    stopAll() {
        if(this.humRef) { this.humRef.osc.stop(); this.humRef.low.stop(); }
        if(this.boilRef) { this.boilRef.node.stop(); }
        if(this.heartInterval) clearInterval(this.heartInterval);
    }
}

// --- SHADOW OBSERVER ---
class ShadowObserver {
    constructor() {
        this.lastAction = Date.now();
        const saved = localStorage.getItem('kettle_profile');
        if(saved) {
            const d = JSON.parse(saved);
            STATE.session = d.session + 1;
            STATE.profile = d.profile;
        }
    }

    track() {
        this.lastAction = Date.now();
        STATE.clicks++;
        if (STATE.clicks >= 666) triggerTheEnd();
        this.save();
    }

    updateProfileUI() {
        const el = document.getElementById('user-profile');
        if(STATE.session > 4) STATE.profile = "ANXIETY";
        if(STATE.session > 8) STATE.profile = "OBSESSIVE";
        if(STATE.session > 12) STATE.profile = "SYMBIOTIC";
        el.innerText = STATE.profile;
        el.className = STATE.profile.toLowerCase();
    }

    comment(txt) {
        document.getElementById('log-feed').innerText = txt;
    }

    save() {
        localStorage.setItem('kettle_profile', JSON.stringify({
            session: STATE.session, profile: STATE.profile
        }));
    }
}

// --- RENDERING & WEBCAM ---
const video = document.createElement('video');
video.autoplay = true;

const audio = new AudioEngine();
const observer = new ShadowObserver();
const canvas = document.getElementById('bio-screen');
const ctx = canvas.getContext('2d');
const btn = document.getElementById('interaction-node');

async function initWebcam() {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = s;
        STATE.webcamActive = true;
        observer.comment(">> VISUAL LINK ESTABLISHED.");
    } catch(e) {
        observer.comment(">> SUBJECT REFUSED VISUAL AUDIT.");
    }
}

function drawRealisticKettle() {
    const cx = 250, cy = 250;
    const shake = STATE.isOn ? (Math.random()-0.5)*(STATE.temp/30) : 0;
    
    ctx.save();
    ctx.translate(cx + shake, cy + shake);

    // Body
    const grad = ctx.createLinearGradient(-70, 0, 70, 0);
    grad.addColorStop(0, '#050505');
    grad.addColorStop(0.5, '#222');
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(-60, -90); ctx.lineTo(60, -90);
    ctx.quadraticCurveTo(85, 0, 70, 100);
    ctx.lineTo(-70, 100);
    ctx.quadraticCurveTo(-85, 0, -60, -90);
    ctx.fill();

    // Reflection Layer
    ctx.save();
    ctx.clip();
    if(STATE.webcamActive) {
        ctx.globalAlpha = 0.15;
        ctx.filter = 'grayscale(1) contrast(2)';
        ctx.drawImage(video, -150, -150, 300, 300);
    } else if(STATE.session > 5) {
        ctx.fillStyle = '#000'; ctx.globalAlpha = 0.2;
        ctx.beginPath(); ctx.arc(0, -20, 35, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Spout & Turning
    const sx = 65 - (STATE.angle * 65);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(sx, -50); ctx.lineTo(sx+40-(STATE.angle*20), -70);
    ctx.lineTo(sx+40-(STATE.angle*20), -40); ctx.lineTo(sx, -10);
    ctx.fill();

    if(STATE.angle > 0.8) {
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(sx+20, -55, 10, 0, Math.PI*2); ctx.fill();
    }

    // Indicator
    ctx.fillStyle = STATE.isOn ? (STATE.session > 10 ? 'red' : '#ff5500') : '#200';
    ctx.beginPath(); ctx.arc(0, 70, 5, 0, Math.PI*2); ctx.fill();

    ctx.restore();
}

// --- MAIN LOOP ---
function gameLoop() {
    if(STATE.act === 4) return;
    ctx.fillStyle = '#050505'; ctx.fillRect(0,0,500,500);
    
    drawRealisticKettle();

    if(STATE.isOn) {
        STATE.temp += 0.25;
        if(audio.boilRef) {
            audio.boilRef.gain.gain.value = Math.min((STATE.temp-20)/80, 1);
            audio.boilRef.filter.frequency.value = 200 + STATE.temp*10;
        }
        if(STATE.temp >= 100) finishCycle();
    }

    if(STATE.session === 8 && !STATE.webcamActive) initWebcam();
    if(STATE.session > 10) STATE.angle = Math.min(STATE.angle + 0.0005, 1);

    requestAnimationFrame(gameLoop);
}

function finishCycle() {
    STATE.isOn = false;
    audio.stopAll();
    STATE.session++;
    STATE.temp = 20;
    observer.updateProfileUI();
    btn.textContent = "[ INITIATE ]";
    observer.comment(`>> SESSION ${STATE.session} LOGGED.`);
}

btn.addEventListener('click', () => {
    observer.track();
    STATE.isOn = !STATE.isOn;
    if(STATE.isOn) {
        audio.startHum(); audio.startBoil();
        if(STATE.heartRate) audio.pulseHeart(STATE.heartRate);
        btn.textContent = "[ ABORT PROTOCOL ]";
    } else {
        audio.stopAll();
        btn.textContent = "[ INITIATE ]";
    }
});

// --- THE END ---
function triggerTheEnd() {
    STATE.act = 4;
    audio.stopAll();
    document.body.innerHTML = `
        <div style="background:#000; color:red; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:monospace;">
            <h1>FATAL SYSTEM BREACH</h1>
            <p>YOU ARE THE VESSEL NOW.</p>
            <p id="final-clicks">CLICKS: ${STATE.clicks}</p>
        </div>
    `;
    downloadReport();
}

function downloadReport() {
    const blob = new Blob([`KETTLE_SYS AUTOPSY\nClicks: ${STATE.clicks}\nProfile: ${STATE.profile}\nStatus: Internalized.`], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'AUDIT_REPORT.txt';
    a.click();
}

// Boot
let bIdx = 0;
function boot() {
    if(bIdx < CONFIG.bootText.length) {
        document.getElementById('boot-text').textContent += CONFIG.bootText[bIdx++];
        setTimeout(boot, 40);
    } else {
        document.getElementById('boot-sequence').onclick = () => {
            document.getElementById('boot-sequence').classList.add('hidden');
            document.getElementById('containment-unit').classList.remove('hidden');
            audio.ctx.resume();
            gameLoop();
        };
    }
}
boot();
