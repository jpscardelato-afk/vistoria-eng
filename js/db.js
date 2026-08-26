/* =====================================================================
   db.js :: camada IndexedDB + cache em memória + autosave
   ===================================================================== */

const DB_NAME = 'vistoria_eng_v1';
const DB_VERSION = 1;
const STORES = ['meta', 'setores', 'itens', 'fotos', 'blobs', 'insumos', 'quesitos', 'pendencias', 'participantes'];

let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ev => {
      const db = ev.target.result;
      STORES.forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode) { return _db.transaction(store, mode).objectStore(store); }

function idbPut(store, obj) {
  return new Promise((res, rej) => { const r = tx(store, 'readwrite').put(obj); r.onsuccess = () => res(obj); r.onerror = () => rej(r.error); });
}
function idbGet(store, id) {
  return new Promise((res, rej) => { const r = tx(store, 'readonly').get(id); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
function idbDel(store, id) {
  return new Promise((res, rej) => { const r = tx(store, 'readwrite').delete(id); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
}
function idbAll(store) {
  return new Promise((res, rej) => { const r = tx(store, 'readonly').getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); });
}
function idbClear(store) {
  return new Promise((res, rej) => { const r = tx(store, 'readwrite').clear(); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
}

/* ------------------------- cache em memória ------------------------- */

const DB = {
  meta: null,
  setores: [],
  itens: [],
  fotos: [],      // metadados (sem blob)
  insumos: [],
  quesitos: [],
  pendencias: [],
  participantes: []
};

function uid(pref) {
  return pref + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function nowISO() { return new Date().toISOString(); }

function hojeData() {
  const d = new Date();
  return d.toLocaleDateString('pt-BR');
}
function agoraHora() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

/* ------------------------------ SEED -------------------------------- */

function novoItem(base) {
  return Object.assign({
    id: uid('it'),
    codigo: '', descricao: '', contaContabil: '', fabricante: '', modelo: '',
    tag: '', patrimonio: '', notaFiscal: '', aquisicao: '',
    setorId: '', setorAutos: '', setorEncontrado: '', localizacaoFisica: '', referencia: '',
    funcaoAutos: '', funcaoConstatada: '', etapaProcesso: '',
    classificacao: '', condicao: '', utilizacao: '', frequenciaUso: '',
    evid2017: '', evidenciaTipos: [], evidenciaDescricao: '',
    integraProcesso: '', ausenciaCompromete: [], impactoRetirada: '',
    conclusaoPreliminar: '', conclusaoFinal: '', confianca: '',
    observacoes: '', vistoriado: false, requerAnalise: false,
    preCadastrado: false, criadoEm: nowISO(), atualizadoEm: nowISO()
  }, base || {});
}

function novoInsumo(base) {
  return Object.assign({
    id: uid('in'),
    nome: '', principioAtivo: '', concentracao: '', fornecedor: '', lote: '',
    notaFiscal: '', pontoDosagem: '', dosagem: '', frequencia: '', funcaoFQ: '',
    entradaEstoque: '', saidaEstoque: '', consumo: '', fispq: '',
    evid2017: '', evidenciaDescricao: '', destinoProcesso: '',
    observacoes: '', vistoriado: false, criadoEm: nowISO(), atualizadoEm: nowISO()
  }, base || {});
}

function novoQuesito(base) {
  return Object.assign({
    id: uid('qu'), parte: 'AUTORA', numero: 1, texto: '',
    setorId: '', itensRel: [], fotosRel: [], documentosRel: '',
    respostaPreliminar: '', respostaFinal: '', status: 'Não analisado',
    atualizadoEm: nowISO()
  }, base || {});
}

function novaPendencia(base) {
  return Object.assign({
    id: uid('pd'), tipo: '', descricao: '', setorId: '', itemId: '',
    responsavel: '', prioridade: 'Média', dataSolicitada: '',
    status: 'Aberta', observacao: '', criadoEm: nowISO(), atualizadoEm: nowISO()
  }, base || {});
}

function novoParticipante(base) {
  return Object.assign({
    id: uid('pa'), nome: '', funcao: '', empresa: '', registro: '',
    telefone: '', email: '', chegada: '', saida: '', observacao: '',
    criadoEm: nowISO()
  }, base || {});
}

async function seedIfEmpty() {
  const D = window.PERICIA_DATA;

  let meta = await idbGet('meta', 'meta');
  if (!meta) {
    meta = {
      id: 'meta',
      processo: JSON.parse(JSON.stringify(D.PROCESSO)),
      vistoriaIniciada: false,
      vistoriaInicio: '', vistoriaFim: '',
      observacoesFinais: '',
      contadorFoto: 0,
      ultimoBackup: '',
      criadoEm: nowISO()
    };
    await idbPut('meta', meta);
  }
  DB.meta = meta;

  DB.setores = await idbAll('setores');
  if (!DB.setores.length) {
    DB.setores = D.SETORES_SEED.map(s => ({
      id: s.id, ordem: s.ordem, nome: s.nome, slug: s.slug,
      status: 'Não iniciado', inicio: '', fim: '',
      participantes: [], observacoes: '', documentos: ''
    }));
    for (const s of DB.setores) await idbPut('setores', s);
  }
  DB.setores.sort((a, b) => a.ordem - b.ordem);

  DB.itens = await idbAll('itens');
  if (!DB.itens.length) {
    const setorNome = {}; D.SETORES_SEED.forEach(s => setorNome[s.id] = s.nome);
    DB.itens = D.ITENS_SEED.map(row => novoItem({
      codigo: row[0], descricao: row[1], setorId: row[2],
      setorAutos: setorNome[row[2]] || '', classificacao: row[3] || '',
      preCadastrado: true
    }));
    for (const it of DB.itens) await idbPut('itens', it);
  }

  DB.insumos = await idbAll('insumos');
  if (!DB.insumos.length) {
    DB.insumos = D.INSUMOS_SEED.map(i => novoInsumo({ nome: i.nome, funcaoFQ: i.funcaoFQ }));
    for (const i of DB.insumos) await idbPut('insumos', i);
  }

  DB.quesitos = await idbAll('quesitos');
  if (!DB.quesitos.length) {
    DB.quesitos = D.QUESITOS_SEED.map(q => novoQuesito({ parte: q.parte, numero: q.numero }));
    for (const q of DB.quesitos) await idbPut('quesitos', q);
  }

  DB.fotos = await idbAll('fotos');
  DB.pendencias = await idbAll('pendencias');
  DB.participantes = await idbAll('participantes');

  ordenar();
}

function ordenar() {
  DB.setores.sort((a, b) => a.ordem - b.ordem);
  const ordemSetor = {}; DB.setores.forEach(s => ordemSetor[s.id] = s.ordem);
  DB.itens.sort((a, b) => {
    const d = (ordemSetor[a.setorId] || 99) - (ordemSetor[b.setorId] || 99);
    if (d) return d;
    return (parseInt(a.codigo, 10) || 9999) - (parseInt(b.codigo, 10) || 9999);
  });
  DB.quesitos.sort((a, b) => a.parte === b.parte ? a.numero - b.numero : (a.parte < b.parte ? -1 : 1));
  DB.fotos.sort((a, b) => a.numero - b.numero);
}

/* ------------------------ salvar (com debounce) --------------------- */

const _pend = {};
let _bloqueado = false;

/* Durante a restauração de backup as escritas em memória precisam parar:
   caso contrário o flush do beforeunload regrava o estado antigo por cima. */
function bloquearEscritas() {
  _bloqueado = true;
  Object.keys(_pend).forEach(k => { clearTimeout(_pend[k]); delete _pend[k]; });
}
function liberarEscritas() { _bloqueado = false; }

function salvar(store, obj, immediate) {
  if (_bloqueado) return Promise.resolve(obj);
  obj.atualizadoEm = nowISO();
  if (immediate) return idbPut(store, obj);
  const k = store + ':' + obj.id;
  clearTimeout(_pend[k]);
  _pend[k] = setTimeout(() => { idbPut(store, obj); delete _pend[k]; }, 350);
  return Promise.resolve(obj);
}

async function flushSaves() {
  if (_bloqueado) return;
  const keys = Object.keys(_pend);
  keys.forEach(k => clearTimeout(_pend[k]));
  // re-salva tudo de forma síncrona-ish
  for (const s of ['meta', 'setores', 'itens', 'fotos', 'insumos', 'quesitos', 'pendencias', 'participantes']) {
    if (s === 'meta') { if (DB.meta) await idbPut('meta', DB.meta); continue; }
    for (const o of DB[s]) await idbPut(s, o);
  }
  keys.forEach(k => delete _pend[k]);
}

window.PERICIA_DB = {
  openDB, seedIfEmpty, DB, salvar, flushSaves, bloquearEscritas, liberarEscritas,
  idbPut, idbGet, idbDel, idbAll, idbClear,
  uid, nowISO, hojeData, agoraHora,
  novoItem, novoInsumo, novoQuesito, novaPendencia, novoParticipante, ordenar
};
