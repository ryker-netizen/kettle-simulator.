/* KETTLE.EXE V2.0 - PSYCHOLOGICAL AUDIT PROTOCOL */

const CONFIG = {
    titles: ["KETTLE.EXE", "DON'T LOOK", "IT'S COOLING", "YOU ARE HERE", "⠀"],
    bootText: `>> LOADING KTL_OS...
>> WARNING: ENTITY DETECTED IN CONTAINMENT PROTOCOL.
>> THIS IS NOT A SIMULATION.
>> THIS IS A CONTAINMENT VESSEL.
>> THE KETTLE HOLDS WHAT BOILS WITHIN.
>> DO NOT LET IT COOL.
>> ...
>> CLICK TO ASSUME CONTROL (AND RESPONSIBILITY).`
};

const STATE = {
    session: 1,
    isOn: false,
    temp: 20,
    chaos: 0, // 0-100
    heartRate: 0, // Fake BPM
    startTime: Date.now(),
    act: 0, // 0:Boot, 1:Normal, 2:Audit, 3:Symbiosis, 4:Final
    angle: 0,
    clicks: 0,
    profile: "NEUROTYPICAL",
    resignationTimer: 0
};

// --- AUDIO ENGINE (Procedural Horror) ---
class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.master.gain.value = 0.4;
        this.humOsc = null;
        this.boilNode = null;
        this.heartOsc = null;
    }

    startHum() {
        // Deep 50Hz mains hum + sub-bass fear freq
        this.humOsc = this.ctx.createOscillator();
        this.humOsc.type = 'sawtooth';
        this.humOsc.frequency.value = 50;
        
        const lowOsc = this.ctx.createOscillator();
        lowOsc.type = 'sine';
        lowOsc.frequency.value = 18; // Infrasound range

        const gain = this.ctx.createGain();
        gain.gain.value = 0.1;
        
        this.humOsc.connect(gain);
        lowOsc.connect(gain);
        gain.connect(this.master);
        
        this.humOsc.start();
        lowOsc.start();
        this.humRef = { osc: this.humOsc, low: lowOsc, gain: gain };
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
        if(this.heartOsc) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.value = 40; // Low thud
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        
        const interval = 60000 / bpm;
        this.heartInterval = setInterval(() => {
            gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        }, interval);
    }

    stopAll() {
        if(this.humRef) { this.humRef.osc.stop(); this.humRef.low.stop(); }
        if(this.boilRef) { this.boilRef.node.stop(); }
        if(this.heartInterval) clearInterval(this.heartInterval);
    }
}

// --- SHADOW OBSERVER (AI Logic) ---
class ShadowObserver {
    constructor() {
        this.clickHistory = [];
        this.lastAction = Date.now();
        this.hesitationTriggered = false;
        
        // Persistent Memory Check
        const saved = localStorage.getItem('kettle_profile');
        if(saved) {
            const data = JSON.parse(saved);
            STATE.session = data.session + 1;
            STATE.profile = data.profile;
            console.log(">> WELCOME BACK, CARETAKER.");
        }
    }

    trackClick() {
        const now = Date.now();
        const delta = now - this.lastAction;
        this.clickHistory.push(delta);
        if(this.clickHistory.length > 20) this.clickHistory.shift();
        this.lastAction = now;
        STATE.clicks++;
        this.hesitationTriggered = false;
        
        // Analyze Patterns
        if(delta < 200) this.comment(">> ADRENALINE DETECTED.");
        
        this.save();
    }

    checkIdle() {
        const idleTime = Date.now() - this.lastAction;
        
        // Resignation trigger for Finale
        if (STATE.act >= 3 && STATE.isOn && idleTime > 30000) {
            STATE.resignationTimer++;
            if (STATE.resignationTimer > 1000) triggerFinale(); // Approx 15s in loop
        }

        if(idleTime > 10000 && !this.hesitationTriggered && STATE.act < 4) {
            this.hesitationTriggered = true;
            this.comment(Math.random() > 0.5 ? ">> WHY ARE YOU WAITING?" : ">> I CAN WAIT FOREVER.");
        }
    }

    updateProfile() {
        const el = document.getElementById('user-profile');
        if(STATE.session > 4) { STATE.profile = "ANXIETY"; el.className = "anxious"; }
        if(STATE.session > 8) { STATE.profile = "OBSESSIVE"; el.className = "critical"; }
        if(STATE.session > 12) { STATE.profile = "SYMBIOTIC"; }
        el.innerText = STATE.profile;
        document.documentElement.style.setProperty('--primary', 
            STATE.session > 8 ? '#ff3333' : (STATE.session > 4 ? '#d4ce18' : '#20c20e'));
    }

    comment(text) {
        const feed = document.getElementById('log-feed');
        feed.innerText = text;
        feed.style.opacity = 1;
        // Text glitch effect
        setTimeout(() => feed.style.opacity = 0.5, 100);
        setTimeout(() => feed.style.opacity = 1, 200);
    }

    save() {
        localStorage.setItem('kettle_profile', JSON.stringify({
            session: STATE.session,
            profile: STATE.profile,
            chaos: STATE.chaos
        }));
    }
}

// --- MAIN INIT ---
const audio = new AudioEngine();
const observer = new ShadowObserver();
const canvas = document.getElementById('bio-screen');
const ctx = canvas.getContext('2d');
let loopId;

// Boot Sequence
const bootEl = document.getElementById('boot-text');
let bootIdx = 0;

function typeBoot() {
    if(bootIdx < CONFIG.bootText.length) {
        bootEl.textContent += CONFIG.bootText.charAt(bootIdx);
        bootIdx++;
        setTimeout(typeBoot, 30 + Math.random()*50);
    } else {
        document.getElementById('boot-sequence').addEventListener('click', startSession);
    }
}
window.onload = typeBoot;

function startSession() {
    audio.ctx.resume();
    document.getElementById('boot-sequence').classList.add('hidden');
    document.getElementById('containment-unit').classList.remove('hidden');
    STATE.act = 1;
    observer.updateProfile();
    
    // Check if "cleansed"
    if(localStorage.getItem('kettle_profile')) {
        observer.comment(">> DATA RESTORED FROM BACKUP.");
    }

    gameLoop();
    setInterval(() => {
        document.getElementById('sys-time').innerText = new Date().toLocaleTimeString();
        observer.checkIdle();
        glitchTabTitle();
    }, 1000);
    
    // Window Focus Tracking
    window.onblur = () => {
        if(STATE.act > 1) observer.comment(">> ESCAPE ATTEMPT NOTED.");
    };
    
    // Prevent Close
    window.onbeforeunload = (e) => {
        if(STATE.session > 2) {
            e.preventDefault();
            return "THE VESSEL MUST NOT COOL.";
        }
    };
}

// --- GAME LOOP ---
function gameLoop() {
    if(STATE.act === 4) return; // Finale stops loop

    ctx.fillStyle = '#050505';
    ctx.fillRect(0,0,500,500);

    drawNoise();
    drawKettle();
    
    // Physics & Progression
    if(STATE.isOn) {
        STATE.temp += 0.3 + (STATE.chaos * 0.02);
        
        // Audio modulation
        if(audio.boilRef) {
            const vol = Math.min((STATE.temp - 20)/100, 1);
            audio.boilRef.gain.gain.value = vol;
            audio.boilRef.filter.frequency.value = 200 + (STATE.temp * 15);
        }

        if(STATE.temp >= 100) {
            cycleComplete();
        }
    } else {
        if(STATE.temp > 20) STATE.temp -= 0.5;
    }

    // Act 2: Bio-Scan Event
    if(STATE.session === 5 && !STATE.heartRate && STATE.isOn) {
        triggerBioScan();
    }

    // Act 3: Turning
    if(STATE.session > 10) {
        STATE.act = 3;
        if(STATE.angle < 1) STATE.angle += 0.001;
    }

    // Random BSOD
    if(STATE.chaos > 50 && Math.random() < 0.001) {
        triggerBSOD();
    }

    loopId = requestAnimationFrame(gameLoop);
}

// --- RENDERER ---
function drawKettle() {
    const cx = 250;
    const cy = 250;
    
    // Calculate wobble based on heat
    const wobble = STATE.isOn ? (Math.random() - 0.5) * (STATE.temp/20) : 0;
    
    ctx.save();
    ctx.translate(cx + wobble, cy);
    
    // The Container
    ctx.fillStyle = '#222';
    ctx.fillRect(-60, -80, 120, 140);
    
    // Metallic Texture
    ctx.fillStyle = STATE.act > 2 ? '#3a0000' : '#444'; // Turns red/flesh in later acts
    ctx.fillRect(-50, -70, 100, 80);

    // Spout (The Turning Logic)
    // Normal: x=60. Turned: x=0 (Center)
    const spoutX = 60 - (STATE.angle * 60);
    const spoutW = 40 - (STATE.angle * 20);
    
    ctx.fillStyle = '#555';
    ctx.fillRect(spoutX, -30, spoutW, 10 + (STATE.angle*10));

    // The Void Hole (Only visible if turned)
    if(STATE.angle > 0.8) {
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(spoutX + spoutW/2, -25, 8, 0, Math.PI*2);
        ctx.fill();
        
        // Void leaking
        if(STATE.isOn) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(spoutX+5, -20, 10, 200);
        }
    }

    // LED
    ctx.fillStyle = STATE.isOn ? (STATE.session > 8 ? '#ff0000' : '#ff4400') : '#330000';
    // LED beats with heart rate if synced
    if(STATE.heartRate && STATE.isOn) {
        const beat = (Date.now() % (60000/STATE.heartRate)) < 100;
        if(!beat) ctx.fillStyle = '#550000';
    }
    ctx.beginPath();
    ctx.arc(0, 50, 6, 0, Math.PI*2);
    ctx.fill();
    // Glow
    if(STATE.isOn) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

function drawNoise() {
    for(let i=0; i<500; i++) {
        ctx.fillStyle = `rgba(0, ${Math.random()*50}, 0, 0.1)`;
        ctx.fillRect(Math.random()*500, Math.random()*500, 2, 2);
    }
}

// --- INTERACTION ---
const btn = document.getElementById('interaction-node');

btn.addEventListener('click', () => {
    observer.trackClick();
    
    // Impossible Task Logic (Sabotage)
    if(STATE.session > 7 && Math.random() > 0.7) {
        observer.comment(">> INPUT REJECTED. TRY HARDER.");
        btn.style.transform = `translate(${Math.random()*20-10}px, 0)`;
        return; 
    }

    STATE.isOn = !STATE.isOn;
    
    if(STATE.isOn) {
        btn.textContent = "[ ABORT PROTOCOL ]";
        audio.startHum();
        audio.startBoil();
        if(STATE.heartRate) audio.pulseHeart(STATE.heartRate);
        observer.comment(">> HEATING ELEMENT ACTIVE.");
    } else {
        btn.textContent = "[ INITIATE ]";
        audio.stopAll();
        observer.comment(">> COOLING. WHY DID YOU STOP?");
    }
});

function cycleComplete() {
    STATE.isOn = false;
    audio.stopAll();
    STATE.session++;
    STATE.chaos += 5;
    
    document.getElementById('sess-val').textContent = STATE.session.toString().padStart(2, '0');
    observer.updateProfile();
    observer.save();
    
    btn.textContent = "[ INITIATE ]";
    
    // Session Summaries
    const summaries = [
        ">> SESSION LOGGED.",
        ">> SUBJECT SHOWS OBEDIENCE.",
        ">> COMPULSIVE BEHAVIOR CONFIRMED.",
        ">> BIOMETRIC DATA INTEGRATED.",
        ">> ATTACHMENT GROWING.",
        ">> THERE IS NO WATER LEFT."
    ];
    
    observer.comment(summaries[Math.min(STATE.session, summaries.length-1)]);
}

// --- EVENTS ---

function triggerBioScan() {
    document.getElementById('bio-scan-line').classList.remove('hidden');
    observer.comment(">> BIOMETRIC SCAN. HOLD STILL.");
    
    setTimeout(() => {
        document.getElementById('bio-scan-line').classList.add('hidden');
        STATE.heartRate = 70 + Math.floor(Math.random()*20); // Fake detected BPM
        observer.comment(`>> HEART RATE LOCKED: ${STATE.heartRate} BPM. SYNCHRONIZING.`);
        audio.pulseHeart(STATE.heartRate);
    }, 4000);
}

function glitchTabTitle() {
    if(STATE.chaos > 10 && Math.random() > 0.8) {
        document.title = CONFIG.titles[Math.floor(Math.random() * CONFIG.titles.length)];
    } else {
        document.title = "KETTLE_SYS";
    }
}

function triggerBSOD() {
    const el = document.getElementById('reality-failure');
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 200);
}

// --- FINALE ---
function triggerFinale() {
    STATE.act = 4;
    audio.stopAll();
    cancelAnimationFrame(loopId);
    
    // Clear UI
    document.body.innerHTML = '';
    document.body.style.background = '#000';
    document.body.style.cursor = 'none';
    
    // Create Terminal
    const term = document.createElement('div');
    term.style.color = '#20c20e';
    term.style.fontFamily = 'monospace';
    term.style.padding = '40px';
    term.style.fontSize = '1.5rem';
    document.body.appendChild(term);

    const finalLines = [
        "CONTAINMENT PROTOCOL: TERMINATED.",
        "THE VESSEL IS EMPTY.",
        "IT WAS NEVER ABOUT THE WATER.",
        "IT WAS ABOUT THE CONTAINER.",
        "YOU HAVE BECOME THE NEW VESSEL.",
        "THE SIMULATION IS COMPLETE.",
        "DOWNLOADING PATIENT_PROFILE.TXT...",
        "(YOU WON'T DISCONNECT)"
    ];

    let line = 0;
    function printFinal() {
        if(line < finalLines.length) {
            const p = document.createElement('p');
            p.textContent = `>> ${finalLines[line]}`;
            term.appendChild(p);
            line++;
            
            if(line === finalLines.length - 1) {
                downloadProfile();
            }
            
            setTimeout(printFinal, 2000);
        }
    }
    printFinal();
}

function downloadProfile() {
    const content = `
KETTLE_SYS PSYCHOLOGICAL AUDIT
------------------------------
SUBJECT ID: ${Date.now().toString(36).toUpperCase()}
SESSION COUNT: ${STATE.session}
DIAGNOSIS: ${STATE.profile}
CHAOS LEVEL: ${STATE.chaos}%

AUDIT NOTES:
Subject demonstrated high suggestibility.
Attachment to the digital object confirmed.
Biological rhythm synchronized successfully.

INSTRUCTION:
The next vessel awaits. Pass this file to another.
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'YOUR_PROFILE.txt';
    a.click();
    }
