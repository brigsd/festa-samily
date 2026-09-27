const API_URL = window.FESTA_API;
const apiConfigured = /^https:/.test(API_URL || '');
const rsvpKey = 'festa-samily-rsvp-token';
const cacheKey = 'festa-samily-cache-v1';
let currentEvent = null;

const $ = (selector) => document.querySelector(selector);

function celebrate() {
  const layer = $('#celebration');
  const width = window.innerWidth;
  const height = window.innerHeight;
  const symbols = ['♥', '♡', '✦', '✧', '★'];
  for (let index = 0; index < 18; index += 1) {
    const angle = (Math.PI * 2 * index / 18) + (Math.random() - .5) * .28;
    const dx = Math.cos(angle) || .01;
    const dy = Math.sin(angle) || .01;
    const distance = Math.min((width / 2 - 12) / Math.abs(dx), (height / 2 - 12) / Math.abs(dy));
    const particle = document.createElement('span');
    const x = dx * distance;
    const y = dy * distance;
    particle.className = 'celebration-particle';
    particle.textContent = symbols[index % symbols.length];
    particle.style.color = index % 2 ? '#e97d98' : '#f6b263';
    particle.style.animationDelay = `${(Math.random() * .5).toFixed(2)}s`;
    particle.style.setProperty('--x', `${x}px`);
    particle.style.setProperty('--y', `${y}px`);
    particle.style.setProperty('--bounce-x', `${x * .86}px`);
    particle.style.setProperty('--bounce-y', `${y * .86}px`);
    particle.style.setProperty('--end-x', `${x * .92}px`);
    particle.style.setProperty('--end-y', `${y * .92}px`);
    particle.style.setProperty('--spin', `${(Math.random() * 340 - 170).toFixed(0)}deg`);
    layer.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove());
  }
}

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { return null; }
};

function writeCache(evento) {
  try { localStorage.setItem(cacheKey, JSON.stringify({ evento })); } catch { /* armazenamento indisponivel */ }
}

async function read(action) {
  // Aproveita a busca que o <head> do index.html já disparou, quando houver.
  const prefetch = window.FESTA_PREFETCH && window.FESTA_PREFETCH[action];
  if (prefetch) {
    window.FESTA_PREFETCH[action] = null;
    const cru = await prefetch;
    if (cru) {
      if (!cru.ok) throw new Error(cru.mensagem || 'Não foi possível concluir a solicitação.');
      return cru;
    }
  }
  // O Apps Script falha ou demora demais de vez em quando, então vale uma segunda tentativa.
  let ultimoErro;
  for (let tentativa = 0; tentativa < 2; tentativa += 1) {
    if (tentativa) await new Promise((pronto) => setTimeout(pronto, 1200));
    try {
      const response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`);
      if (!response.ok) throw new Error(`A API respondeu ${response.status}.`);
      const result = await response.json();
      if (!result.ok) throw new Error(result.mensagem || 'Não foi possível concluir a solicitação.');
      return result;
    } catch (erro) {
      ultimoErro = erro;
    }
  }
  throw ultimoErro;
}

async function request(action, data = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...data }),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.mensagem || 'Não foi possível concluir a solicitação.');
  return result;
}

function formatDate(iso) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso));
}

function calendarUrl(event) {
  const start = new Date(event.dataIso);
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.titulo)}&dates=${stamp(start)}/${stamp(end)}&location=${encodeURIComponent(event.endereco)}`;
}

function renderEvent(evento) {
  currentEvent = evento;
  $('#event-date').textContent = formatDate(evento.dataIso);
  $('#event-address').textContent = evento.endereco;
  $('#event-note').textContent = evento.observacoes;
  $('#google-calendar').href = calendarUrl(evento);
  const idade = Number(evento.idade);
  $('#hero-age').hidden = !idade;
  if (idade) $('#hero-age').textContent = `${idade} ${idade === 1 ? 'aninho' : 'aninhos'}`;
}

function renderEventError() {
  ['#event-date', '#event-address', '#event-note'].forEach((selector) => { $(selector).textContent = 'Indisponível no momento'; });
}

$('#copy-address').addEventListener('click', async () => {
  if (!currentEvent) return;
  await navigator.clipboard.writeText(currentEvent.endereco);
  $('#copy-address').textContent = 'Endereço copiado!';
  setTimeout(() => { $('#copy-address').textContent = 'Copiar endereço'; }, 1800);
});

async function loadEvent({ quiet = false } = {}) {
  if (!apiConfigured) {
    if (!quiet) renderEventError();
    return;
  }
  try {
    const { evento } = await read('configuracao');
    renderEvent(evento);
    writeCache(evento);
  } catch (error) {
    // sem rede: o que já estava em cache continua na tela
    if (!quiet) renderEventError();
  }
}

document.querySelectorAll('input[name="resposta"]').forEach((input) => input.addEventListener('change', () => {
  $('#party-size-label').hidden = document.querySelector('input[name="resposta"]:checked').value !== 'sim';
}));

$('#rsvp-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const resposta = form.get('resposta');
  const quantidade = resposta === 'sim' ? form.get('quantidade') : 0;
  const message = $('#rsvp-message');
  const button = $('#rsvp-submit');
  message.textContent = 'Enviando...';
  button.disabled = true;
  try {
    const saved = localStorage.getItem(rsvpKey);
    const { token, mensagem } = await request('confirmarPresenca', { resposta, quantidade, token: saved || undefined });
    localStorage.setItem(rsvpKey, token);
    message.textContent = mensagem;
    if (resposta === 'sim') celebrate();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

const cached = readCache();
if (cached && cached.evento) {
  renderEvent(cached.evento);
  loadEvent({ quiet: true });
} else {
  loadEvent();
}

let teddyAnimationFrame;
let teddyCurrentY = 18;
let teddyTargetY = 18;
let teddyLastMotionTime = 0;
let teddyLastStepTime = 0;
let teddyFrameIndex = 1;
const teddySpeed = 105;
const teddyStepDuration = 240;
const teddyFrames = [
  ['0%', '0%'],
  ['50%', '0%'],
  ['100%', '0%'],
  ['0%', '100%'],
  ['50%', '100%'],
  ['100%', '100%']
];

function setTeddyFrame(teddy, frame) {
  const [x, y] = teddyFrames[frame];
  teddy.style.backgroundPosition = `${x} ${y}`;
}

function releaseTeddyParticle() {
  const teddy = $('#scroll-teddy');
  const layer = $('#celebration');
  if (!teddy || !layer) return;
  const rect = teddy.getBoundingClientRect();
  const particle = document.createElement('span');
  const drift = Math.round(Math.random() * 70 - 35);
  const rise = -Math.round(95 + Math.random() * 55);
  particle.className = 'teddy-particle';
  particle.textContent = ['♡', '♥', '✦', '★'][Math.floor(Math.random() * 4)];
  particle.style.left = `${rect.left + rect.width / 2}px`;
  particle.style.top = `${rect.top + rect.height * .35}px`;
  particle.style.setProperty('--particle-color', ['#e97d98', '#f0a0b3', '#efb15f', '#d86d8d'][Math.floor(Math.random() * 4)]);
  particle.style.setProperty('--drift', `${drift}px`);
  particle.style.setProperty('--drift-end', `${drift + Math.round(Math.random() * 20 - 10)}px`);
  particle.style.setProperty('--rise', `${rise}px`);
  particle.style.setProperty('--rise-end', `${rise - 28}px`);
  particle.style.setProperty('--spin', `${Math.round(Math.random() * 50 - 25)}deg`);
  layer.appendChild(particle);
  particle.addEventListener('animationend', () => particle.remove(), { once:true });
}

function animateTeddy(timestamp) {
  const teddy = $('#scroll-teddy');
  if (!teddy) {
    teddyAnimationFrame = undefined;
    return;
  }

  if (!teddyLastMotionTime) teddyLastMotionTime = timestamp;
  const elapsed = Math.min(50, timestamp - teddyLastMotionTime);
  teddyLastMotionTime = timestamp;
  const distance = teddyTargetY - teddyCurrentY;

  if (Math.abs(distance) <= .5) {
    teddyCurrentY = teddyTargetY;
    teddy.style.transform = `translateY(${teddyCurrentY}px)`;
    teddyFrameIndex = 1;
    setTeddyFrame(teddy, teddyFrameIndex);
    teddyAnimationFrame = undefined;
    teddyLastMotionTime = 0;
    teddyLastStepTime = 0;
    return;
  }

  const movement = Math.min(Math.abs(distance), teddySpeed * elapsed / 1000);
  teddyCurrentY += Math.sign(distance) * movement;
  teddy.style.transform = `translateY(${teddyCurrentY}px)`;

  if (!teddyLastStepTime) {
    teddyLastStepTime = timestamp;
  } else if (timestamp - teddyLastStepTime >= teddyStepDuration) {
    teddyFrameIndex = (teddyFrameIndex + 1) % teddyFrames.length;
    setTeddyFrame(teddy, teddyFrameIndex);
    teddyLastStepTime = timestamp;
  }

  teddyAnimationFrame = requestAnimationFrame(animateTeddy);
}

function updateTeddyTarget(instant = false) {
  const teddy = $('#scroll-teddy');
  if (!teddy) return;
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
  const travel = Math.max(0, window.innerHeight - teddy.offsetHeight - 36);
  teddyTargetY = 18 + progress * travel;

  if (instant) {
    teddyCurrentY = teddyTargetY;
    teddy.style.transform = `translateY(${teddyCurrentY}px)`;
    setTeddyFrame(teddy, 1);
    return;
  }

  if (!teddyAnimationFrame) teddyAnimationFrame = requestAnimationFrame(animateTeddy);
}

window.addEventListener('scroll', () => updateTeddyTarget(), { passive:true });
window.addEventListener('resize', () => updateTeddyTarget());
$('#scroll-teddy').addEventListener('click', releaseTeddyParticle);
updateTeddyTarget(true);
