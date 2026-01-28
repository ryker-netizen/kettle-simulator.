// СОСТОЯНИЕ ИГРЫ
const state = {
    isOn: false,
    cycles: 0,
    isBroken: false,
    terrorLevel: 0,
    startTime: null,
    glitchMode: false,
    whisperPlayed: false
};

// ЭЛЕМЕНТЫ DOM
const canvas = document.getElementById('kettleCanvas');
const ctx = canvas.getContext('2d');
const powerBtn = document.getElementById('power-btn');
const statusEl = document.getElementById('status');
const counterEl = document.getElementById('cycle-count');
const timeEl = document.getElementById('time-display');
const messagesEl = document.getElementById('messages');
const exitDialog = document.getElementById('exit-dialog');
const dialogNo = document.getElementById('dialog-no');
const dialogYes = document.getElementById('dialog-yes');

// АУДИО
const boilSound = document.getElementById('boilSound');
const clickSound = document.getElementById('clickSound');
const whisperSound = document.getElementById('whisperSound');
const heartbeatSound = document.getElementById('heartbeatSound');

// ИНИЦИАЛИЗАЦИЯ
function init() {
    state.startTime = new Date();
    updateTimer();
    drawKettle();
    setupEventListeners();
    setInterval(updateTimer, 1000);
    setInterval(checkTerror, 30000); // Проверка каждые 30 сек

    // Захват попытки выхода
    window.addEventListener('beforeunload', (e) => {
        if (state.cycles > 3) {
            e.preventDefault();
            e.returnValue = '';
            showExitDialog();
        }
    });
}

// ОТРИСОВКА ПИКСЕЛЬ-ЧАЙНИКА
function drawKettle(isBoiling = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;

    // Основа чайника (пластик, потёртый)
    ctx.fillStyle = state.isBroken ? '#3a3a3a' : '#555';
    ctx.fillRect(w/2 - 60, h/2 - 80, 120, 140);

    // Металлическая часть
    ctx.fillStyle = state.isBroken ? '#777' : '#aaa';
    ctx.fillRect(w/2 - 50, h/2 - 70, 100, 80);

    // Индикатор
    ctx.fillStyle = state.isOn ? '#ff0000' : '#330000';
    ctx.beginPath();
    ctx.arc(w/2 + 40, h/2 - 50, 8, 0, Math.PI * 2);
    ctx.fill();

    // Носик
    ctx.fillStyle = '#777';
    ctx.fillRect(w/2 + 60, h/2 - 30, 40, 10);

    // Ручка
    ctx.fillStyle = '#333';
    ctx.fillRect(w/2 - 80, h/2 - 60, 20, 60);

    // Блики (если чайник работает)
    if (isBoiling) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(w/2 - 45, h/2 - 65, 30, 10);
    }

    // Накипь (появляется со временем)
    if (state.cycles > 10) {
        ctx.fillStyle = '#ccc';
        for(let i = 0; i < 5; i++) {
            const x = w/2 - 40 + Math.random() * 80;
            const y = h/2 - 30 + Math.random() * 60;
            ctx.fillRect(x, y, 2, 2);
        }
    }

    // Глючи на высоком уровне террора
    if (state.glitchMode) {
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(w/2 - 70 + Math.random()*20, h/2 - 90, 5, 160);
    }
}

// ОБНОВЛЕНИЕ ТАЙМЕРА
function updateTimer() {
    if (!state.startTime) return;
    const now = new Date();
    const diff = new Date(now - state.startTime);
    const hours = diff.getUTCHours().toString().padStart(2, '0');
    const minutes = diff.getUTCMinutes().toString().padStart(2, '0');
    const seconds = diff.getUTCSeconds().toString().padStart(2, '0');
    timeEl.textContent = `${hours}:${minutes}:${seconds}`;

    // Специальный триггер в 00:03:00 (3 минуты)
    if (hours === '00' && minutes === '03' && seconds === '00') {
        triggerSpecialEvent();
    }
}

// ОБРАБОТЧИК КНОПКИ
powerBtn.addEventListener('click', function() {
    if (state.isBroken && Math.random() > 0.5) {
        showMessage('>> ОШИБКА: НЕТ ОТВЕТА');
        powerBtn.classList.add('shake');
        setTimeout(() => powerBtn.classList.remove('shake'), 500);
        return;
    }

    clickSound.currentTime = 0;
    clickSound.play();

    state.isOn = !state.isOn;
    state.cycles++;
    counterEl.textContent = state.cycles;

    if (state.isOn) {
        statusEl.textContent = '>> КИПЕНИЕ...';
        powerBtn.textContent = '[ ВЫКЛ ]';
        boilSound.play();
        setTimeout(boilComplete, 2000 + Math.random() * 2000); // Случайная задержка

        // Визуал кипения
        const boilInterval = setInterval(() => {
            if (!state.isOn) clearInterval(boilInterval);
            drawKettle(true);
        }, 300);
    } else {
        statusEl.textContent = '>> ОЖИДАНИЕ';
        powerBtn.textContent = '[ ВКЛ ]';
        boilSound.pause();
        boilSound.currentTime = 0;
        drawKettle();
    }

    // ПСИ-ЭФФЕКТЫ ПОСЛЕ ОПРЕДЕЛЁННОГО ЧИСЛА ЦИКЛОВ
    if (state.cycles === 5 && !state.whisperPlayed) {
        setTimeout(() => {
            whisperSound.play();
            showMessage('>> ...не смотри...');
            state.whisperPlayed = true;
        }, 1000);
    }

    if (state.cycles === 8) {
        state.isBroken = true;
        showMessage('>> СИСТЕМНЫЙ СБОЙ');
        statusEl.classList.add('glitch');
    }

    if (state.cycles > 12) {
        state.terrorLevel++;
        startGlitchMode();
    }

    // СЛУЧАЙНЫЙ ГЛЮЧ КНОПКИ
    if (Math.random() < 0.1 && state.cycles > 3) {
        const btnRect = powerBtn.getBoundingClientRect();
        powerBtn.style.position = 'fixed';
        powerBtn.style.left = (btnRect.left + (Math.random() * 40 - 20)) + 'px';
        powerBtn.style.top = (btnRect.top + (Math.random() * 40 - 20)) + 'px';
    }
});

function boilComplete() {
    if (state.isOn) {
        state.isOn = false;
        statusEl.textContent = '>> ГОТОВО';
        powerBtn.textContent = '[ ВКЛ ]';
        boilSound.pause();
        boilSound.currentTime = 0;
        drawKettle();
        showMessage('>> ПРОЦЕСС ЗАВЕРШЁН');
    }
}

// СООБЩЕНИЯ
function showMessage(text) {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.className = 'terminal-text pulse';
    messagesEl.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

// ГЛЮЧ-РЕЖИМ
function startGlitchMode() {
    if (state.glitchMode) return;
    state.glitchMode = true;

    document.body.classList.add('glitch');
    setInterval(() => {
        if (!state.glitchMode) return;
        timeEl.style.color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
        statusEl.style.transform = `translate(${Math.random()*4-2}px, ${Math.random()*4-2}px)`;
    }, 100);
}

// ПРОВЕРКА УРОВНЯ ТЕРРОРА
function checkTerror() {
    if (state.terrorLevel > 2) {
        document.getElementById('ui').classList.add('shake');
    }
    if (state.terrorLevel > 4 && !heartbeatSound.played) {
        heartbeatSound.loop = true;
        heartbeatSound.play();
        document.body.classList.add('pulse');
    }
}

// СПЕЦИАЛЬНОЕ СОБЫТИЕ (3 МИНУТЫ)
function triggerSpecialEvent() {
    showMessage('>> ОН ВИДИТ ТЕБЯ');
    state.terrorLevel = 10;
    canvas.style.filter = 'invert(1)';
    setTimeout(() => canvas.style.filter = '', 2000);
}

// ДИАЛОГ ВЫХОДА
function showExitDialog() {
    exitDialog.style.display = 'flex';
}

dialogNo.addEventListener('click', () => {
    exitDialog.style.display = 'none';
    showMessage('>> ПРОДОЛЖЕНИЕ СЕАНСА...');
});

dialogYes.addEventListener('click', () => {
    showMessage('>> ВЫХОД ОТКЛОНЁН');
    exitDialog.style.display = 'none';
    // Не даём выйти - перенаправляем обратно
    setTimeout(() => {
        document.body.innerHTML = '<h1 class="terminal-text">>> СЕАНС ПРОДОЛЖАЕТСЯ</h1>';
        heartbeatSound.play();
    }, 1000);
});

// ЗАПУСК
window.onload = init;
