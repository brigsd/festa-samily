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
    particle.style.color = ['#ff6fae', '#b89cff', '#7fdcc8'][index % 3];
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

function renderEvent(evento) {
  currentEvent = evento;
  $('#event-date').textContent = formatDate(evento.dataIso);
  $('#event-address').textContent = evento.endereco;
  $('#event-note').textContent = evento.observacoes;
  $('#open-map').hidden = !evento.mapa;
  if (evento.mapa) $('#open-map').href = evento.mapa;
}

function renderEventError() {
  ['#event-date', '#event-address', '#event-note'].forEach((selector) => { $(selector).textContent = 'Indisponível no momento'; });
}

async function copyText(button, text, copiedLabel) {
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = copiedLabel;
  } catch {
    button.textContent = 'Não foi possível copiar';
  }
  setTimeout(() => { button.textContent = label; }, 1800);
}

$('#copy-address').addEventListener('click', () => {
  if (currentEvent) copyText($('#copy-address'), currentEvent.endereco, 'Endereço copiado!');
});

document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', () => {
  copyText(button, button.dataset.copy, button.dataset.copied);
}));

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

const MAX_PESSOAS = 20;

// Mostra um campo de nome para cada pessoa, preservando o que já foi digitado.
function renderNameFields() {
  const lista = $('#party-names-list');
  const digitados = [...lista.querySelectorAll('input')].map((input) => input.value);
  const total = Math.min(MAX_PESSOAS, Math.max(1, Math.floor(Number($('#party-size').value) || 1)));
  lista.innerHTML = '';
  for (let index = 0; index < total; index += 1) {
    const label = document.createElement('label');
    label.textContent = index === 0 ? 'Seu nome' : `Pessoa ${index + 1}`;
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'nomes';
    input.maxLength = 80;
    input.autocomplete = index === 0 ? 'name' : 'off';
    input.required = true;
    input.value = digitados[index] || '';
    label.appendChild(input);
    lista.appendChild(label);
  }
}

function toggleAttendance() {
  const vai = document.querySelector('input[name="resposta"]:checked')?.value !== 'nao';
  $('#party-size-label').hidden = !vai;
  $('#party-names').hidden = !vai;
  $('#party-names').disabled = !vai;
}

document.querySelectorAll('input[name="resposta"]').forEach((input) => input.addEventListener('change', toggleAttendance));
$('#party-size').addEventListener('input', renderNameFields);
renderNameFields();

$('#rsvp-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const resposta = form.get('resposta');
  const nomes = resposta === 'sim' ? form.getAll('nomes').map((nome) => String(nome).trim()) : [];
  const quantidade = nomes.length;
  const message = $('#rsvp-message');
  const button = $('#rsvp-submit');
  if (nomes.some((nome) => !nome)) {
    message.textContent = 'Informe o nome de cada pessoa.';
    return;
  }
  message.textContent = 'Enviando...';
  button.disabled = true;
  try {
    const saved = localStorage.getItem(rsvpKey);
    const { token, mensagem } = await request('confirmarPresenca', { resposta, quantidade, nomes, token: saved || undefined });
    localStorage.setItem(rsvpKey, token);
    message.textContent = mensagem;
    if (resposta === 'sim') celebrate();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

// Aceita "50", "50,00", "1.250,50" e "R$ 80".
function parseValor(texto) {
  const limpo = String(texto).replace(/[R$\s]/g, '');
  const milhar = /^\d{1,3}(\.\d{3})+$/.test(limpo);
  const normalizado = limpo.includes(',') || milhar ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : NaN;
}

$('#gift-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#gift-message');
  const button = $('#gift-submit');
  const valor = parseValor($('#gift-value').value);
  if (!(valor > 0)) {
    message.textContent = 'Informe um valor válido.';
    return;
  }
  message.textContent = 'Enviando...';
  button.disabled = true;
  try {
    const { mensagem } = await request('informarPresente', { valor });
    message.textContent = mensagem;
    $('#gift-value').value = '';
    celebrate();
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
