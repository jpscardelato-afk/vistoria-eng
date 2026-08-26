/* =====================================================================
   app.js :: interface, roteamento, coleta de campo
   Vistoria de Engenharia
   ===================================================================== */

(function () {
  const D = window.PERICIA_DATA;
  const P = window.PERICIA_DB;
  const X = window.PERICIA_EXPORT;
  const DB = P.DB;
  const OPT = D.OPT;

  const app = () => document.getElementById('app');
  const topo = () => document.getElementById('topo');

  /* ------------------------------ util ------------------------------ */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  const A = esc; // atributo

  function ir(hash) { location.hash = hash; }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 1600);
  }

  function anoRef() { return (DB.meta && DB.meta.processo && DB.meta.processo.anoReferencia) || ''; }
  function refTexto(prefixo) { const a = anoRef(); return a ? prefixo + ' em ' + a : prefixo + ' no período de referência dos autos'; }

  function setor(id) { return DB.setores.find(s => s.id === id); }
  function item(id) { return DB.itens.find(i => i.id === id); }
  function setorNome(id) { const s = setor(id); return s ? s.nome : '—'; }

  function fotosDo(itemId) { return DB.fotos.filter(f => f.itemId === itemId); }
  function fotosSetor(sid) { return DB.fotos.filter(f => f.setorId === sid && !f.itemId); }

  function statusSetorClasse(st) {
    return st === 'Concluído' ? 'ok' : st === 'Em andamento' ? 'and' : st === 'Pendente' ? 'pend' : '';
  }
  function tagStatusSetor(st) {
    const c = st === 'Concluído' ? 'ok' : st === 'Em andamento' ? 'aviso' : st === 'Pendente' ? 'crit' : '';
    return `<span class="tag ${c}">${esc(st)}</span>`;
  }

  /* -------------------- construtores de formulário ------------------- */

  function attrs(store, id, field) {
    return `data-s="${A(store)}" data-i="${A(id)}" data-f="${A(field)}"`;
  }

  function inpt(store, id, obj, field, label, type, ajuda, cls) {
    return `<div class="campo ${cls || ''}"><label>${esc(label)}${ajuda ? ` <span class="ajuda">${esc(ajuda)}</span>` : ''}</label>
      <input type="${type || 'text'}" ${attrs(store, id, field)} value="${A(obj[field] || '')}"></div>`;
  }

  function txta(store, id, obj, field, label, ajuda) {
    return `<div class="campo largo"><label>${esc(label)}${ajuda ? ` <span class="ajuda">${esc(ajuda)}</span>` : ''}</label>
      <textarea ${attrs(store, id, field)}>${esc(obj[field] || '')}</textarea></div>`;
  }

  function sel(store, id, obj, field, label, options, ajuda, cls) {
    const o = ['<option value="">— selecionar —</option>'].concat(
      options.map(v => `<option value="${A(v)}"${obj[field] === v ? ' selected' : ''}>${esc(v)}</option>`)).join('');
    return `<div class="campo ${cls || ''}"><label>${esc(label)}${ajuda ? ` <span class="ajuda">${esc(ajuda)}</span>` : ''}</label>
      <select ${attrs(store, id, field)}>${o}</select></div>`;
  }

  function radios(store, id, obj, field, label, options, ajuda) {
    const o = options.map(v => `<label class="opcao ${obj[field] === v ? 'sel' : ''}">
      <input type="radio" name="${A(store + id + field)}" ${attrs(store, id, field)} data-radio value="${A(v)}"${obj[field] === v ? ' checked' : ''}>
      ${esc(v)}</label>`).join('');
    return `<div class="campo largo"><label>${esc(label)}${ajuda ? ` <span class="ajuda">${esc(ajuda)}</span>` : ''}</label>
      <div class="opcoes">${o}</div></div>`;
  }

  function multi(store, id, obj, field, label, options, ajuda) {
    const cur = obj[field] || [];
    const o = options.map(v => `<label class="opcao ${cur.indexOf(v) >= 0 ? 'sel' : ''}">
      <input type="checkbox" ${attrs(store, id, field)} data-multi value="${A(v)}"${cur.indexOf(v) >= 0 ? ' checked' : ''}>
      ${esc(v)}</label>`).join('');
    return `<div class="campo largo"><label>${esc(label)}${ajuda ? ` <span class="ajuda">${esc(ajuda)}</span>` : ''}</label>
      <div class="opcoes">${o}</div></div>`;
  }

  function check(store, id, obj, field, label) {
    return `<div class="campo largo"><div class="opcoes"><label class="opcao ${obj[field] ? 'sel' : ''}">
      <input type="checkbox" ${attrs(store, id, field)} data-bool${obj[field] ? ' checked' : ''}> ${esc(label)}</label></div></div>`;
  }

  function selSetor(store, id, obj, field, label) {
    const o = ['<option value="">— selecionar —</option>'].concat(
      DB.setores.map(s => `<option value="${A(s.id)}"${obj[field] === s.id ? ' selected' : ''}>${s.ordem}. ${esc(s.nome)}</option>`)).join('');
    return `<div class="campo"><label>${esc(label)}</label><select ${attrs(store, id, field)}>${o}</select></div>`;
  }

  /* --------------------------- persistência -------------------------- */

  function objDe(store, id) {
    if (store === 'meta') return DB.meta;
    if (store === 'processo') return DB.meta.processo;
    const arr = DB[store];
    return arr ? arr.find(o => o.id === id) : null;
  }

  function persistir(store, obj) {
    if (store === 'processo' || store === 'meta') return P.salvar('meta', DB.meta);
    return P.salvar(store, obj);
  }

  document.addEventListener('input', ev => {
    const el = ev.target;
    if (!el.dataset || !el.dataset.s) return;
    if (el.dataset.multi !== undefined || el.dataset.bool !== undefined || el.dataset.radio !== undefined) return;
    const obj = objDe(el.dataset.s, el.dataset.i);
    if (!obj) return;
    obj[el.dataset.f] = el.value;
    persistir(el.dataset.s, obj);
  });

  document.addEventListener('change', ev => {
    const el = ev.target;
    if (!el.dataset || !el.dataset.s) return;
    const obj = objDe(el.dataset.s, el.dataset.i);
    if (!obj) return;
    const f = el.dataset.f;

    if (el.dataset.multi !== undefined) {
      const cur = new Set(obj[f] || []);
      if (el.checked) cur.add(el.value); else cur.delete(el.value);
      obj[f] = Array.from(cur);
      el.closest('.opcao').classList.toggle('sel', el.checked);
    } else if (el.dataset.bool !== undefined) {
      obj[f] = el.checked;
      el.closest('.opcao').classList.toggle('sel', el.checked);
    } else if (el.dataset.radio !== undefined) {
      obj[f] = el.value;
      const box = el.closest('.opcoes');
      if (box) box.querySelectorAll('.opcao').forEach(o => o.classList.toggle('sel', o.querySelector('input').checked));
    } else {
      obj[f] = el.value;
    }
    persistir(el.dataset.s, obj);
    if (el.dataset.rerender !== undefined) render();
  });

  /* ------------------------------ modal ------------------------------ */

  let modalAtual = null;
  function abrirModal(html, aoAbrir) {
    fecharModal();
    const d = document.createElement('div');
    d.className = 'modal';
    d.innerHTML = `<div class="caixa">${html}</div>`;
    d.addEventListener('click', e => { if (e.target === d) fecharModal(); });
    document.body.appendChild(d);
    modalAtual = d;
    if (aoAbrir) aoAbrir(d);
  }
  function fecharModal() { if (modalAtual) { modalAtual.remove(); modalAtual = null; } }
  window.fecharModal = fecharModal;

  /* --------------------------- fotos: cache -------------------------- */

  const urlCache = {};
  async function urlFoto(id) {
    if (urlCache[id]) return urlCache[id];
    const b = await P.idbGet('blobs', id);
    if (!b || !b.blob) return '';
    const u = URL.createObjectURL(b.blob);
    urlCache[id] = u;
    return u;
  }

  async function pintarFotos(raiz) {
    const nodes = (raiz || document).querySelectorAll('img[data-foto]');
    for (const n of nodes) {
      const u = await urlFoto(n.dataset.foto);
      if (u) n.src = u;
    }
  }

  function redimensionar(file, max) {
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let { width: w, height: h } = img;
        const escala = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * escala); h = Math.round(h * escala);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(b => resolve(b || file), 'image/jpeg', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function adicionarFotos(files, setorId, itemId, categoriaPadrao) {
    const st = setor(setorId);
    const it = itemId ? item(itemId) : null;
    for (const file of files) {
      const blob = await redimensionar(file, 1920);
      DB.meta.contadorFoto = (DB.meta.contadorFoto || 0) + 1;
      const n = DB.meta.contadorFoto;
      const num = String(n).padStart(3, '0');
      const alvo = it ? ('ITEM_' + (it.codigo || 'S-COD')) : 'GERAL';
      const arquivo = `FOTO_${num}_SETOR_${(st && st.slug) || 'SEM_SETOR'}_${alvo}.jpg`;
      const id = P.uid('fo');
      const agora = new Date();
      const meta = {
        id, numero: n, arquivo,
        data: agora.toLocaleDateString('pt-BR'), hora: agora.toTimeString().slice(0, 5),
        setorId: setorId || '', itemId: itemId || '', itemCodigo: it ? it.codigo : '',
        categoria: categoriaPadrao || (it ? 'Equipamento' : 'Foto panorâmica'),
        legenda: it ? (it.codigo + ' - ' + it.descricao) : (st ? st.nome : ''),
        observacao: '', principal: it ? fotosDo(itemId).length === 0 : false,
        tamanho: blob.size, criadoEm: P.nowISO()
      };
      DB.fotos.push(meta);
      await P.idbPut('fotos', meta);
      await P.idbPut('blobs', { id, blob });
      await P.idbPut('meta', DB.meta);
    }
    toast(files.length + (files.length > 1 ? ' fotos salvas' : ' foto salva'));
    render();
  }

  function botaoFoto(setorId, itemId, rotulo) {
    const idInp = 'f_' + (itemId || setorId || 'x');
    return `<input type="file" accept="image/*" capture="environment" multiple class="arquivo-oculto"
        id="${A(idInp)}" data-foto-input data-setor="${A(setorId || '')}" data-item="${A(itemId || '')}">
      <button class="btn primario" onclick="document.getElementById('${A(idInp)}').click()">📷 ${esc(rotulo || 'Tirar / anexar fotos')}</button>`;
  }

  document.addEventListener('change', ev => {
    const el = ev.target;
    if (el.dataset && el.dataset.fotoInput !== undefined && el.files && el.files.length) {
      const arr = Array.from(el.files);
      el.value = '';
      adicionarFotos(arr, el.dataset.setor, el.dataset.item);
    }
  });

  function galeria(fotos) {
    if (!fotos.length) return '<div class="vazio">Nenhuma fotografia registrada.</div>';
    return '<div class="galeria">' + fotos.map(f => `
      <div class="foto" onclick="PERICIA_APP.abrirFoto('${A(f.id)}')">
        <img data-foto="${A(f.id)}" alt="${A(f.arquivo)}">
        <span class="n">${f.numero}</span>
        ${f.principal ? '<span class="p">PRINCIPAL</span>' : ''}
        <span class="lg">${esc(f.categoria)}${f.legenda ? ' — ' + esc(f.legenda) : ''}</span>
      </div>`).join('') + '</div>';
  }

  async function abrirFoto(id) {
    const f = DB.fotos.find(x => x.id === id);
    if (!f) return;
    const u = await urlFoto(id);
    abrirModal(`
      <h3>Foto nº ${f.numero}</h3>
      <img class="grande" src="${A(u)}" alt="">
      <div class="aviso info"><b>${esc(f.arquivo)}</b>
        ${esc(f.data)} às ${esc(f.hora)} • Setor: ${esc(setorNome(f.setorId))}${f.itemCodigo ? ' • Item ' + esc(f.itemCodigo) : ''}</div>
      <div class="campos uma">
        ${sel('fotos', f.id, f, 'categoria', 'Categoria', OPT.fotoCategorias)}
        ${inpt('fotos', f.id, f, 'legenda', 'Legenda')}
        ${txta('fotos', f.id, f, 'observacao', 'Observação')}
        ${f.itemId ? check('fotos', f.id, f, 'principal', 'Foto principal do item') : ''}
      </div>
      <div class="barra-botoes">
        <button class="btn primario" onclick="fecharModal();PERICIA_APP.render()">Concluir</button>
        <button class="btn perigo" onclick="PERICIA_APP.excluirFoto('${A(f.id)}')">Excluir foto</button>
      </div>`);
  }

  async function excluirFoto(id) {
    if (!confirm('Excluir definitivamente esta fotografia?')) return;
    DB.fotos = DB.fotos.filter(f => f.id !== id);
    await P.idbDel('fotos', id); await P.idbDel('blobs', id);
    delete urlCache[id];
    fecharModal(); render(); toast('Foto excluída');
  }

  /* ------------------------- seletor genérico ------------------------ */

  function abrirSeletorItens(quesitoId) {
    const q = DB.quesitos.find(x => x.id === quesitoId);
    const sel0 = new Set(q.itensRel || []);
    const linhas = DB.itens.map(i => `<label class="opcao" style="width:100%;justify-content:flex-start">
      <input type="checkbox" data-pick value="${A(i.id)}"${sel0.has(i.id) ? ' checked' : ''}>
      <b style="min-width:46px">${esc(i.codigo)}</b> ${esc(i.descricao)}
      <span class="tag" style="margin-left:auto">${esc(setorNome(i.setorId))}</span></label>`).join('');
    abrirModal(`<h3>Vincular itens ao quesito</h3>
      <div class="busca"><input type="text" id="pickBusca" placeholder="Filtrar por código ou descrição..."></div>
      <div id="pickLista" style="max-height:48vh;overflow:auto;display:flex;flex-direction:column;gap:6px">${linhas}</div>
      <div class="barra-botoes">
        <button class="btn primario" id="pickOk">Confirmar</button>
        <button class="btn" onclick="fecharModal()">Cancelar</button>
      </div>`, d => {
      d.querySelector('#pickBusca').addEventListener('input', e => {
        const t = e.target.value.toLowerCase();
        d.querySelectorAll('#pickLista .opcao').forEach(l => {
          l.style.display = l.textContent.toLowerCase().indexOf(t) >= 0 ? '' : 'none';
        });
      });
      d.querySelector('#pickOk').addEventListener('click', () => {
        q.itensRel = Array.from(d.querySelectorAll('[data-pick]:checked')).map(c => c.value);
        P.salvar('quesitos', q, true);
        fecharModal(); render();
      });
    });
  }

  function abrirSeletorFotos(quesitoId) {
    const q = DB.quesitos.find(x => x.id === quesitoId);
    const sel0 = new Set(q.fotosRel || []);
    if (!DB.fotos.length) { alert('Nenhuma fotografia registrada ainda.'); return; }
    const linhas = DB.fotos.map(f => `<label class="opcao" style="width:100%;justify-content:flex-start">
      <input type="checkbox" data-pick value="${f.numero}"${sel0.has(f.numero) ? ' checked' : ''}>
      <b style="min-width:46px">${f.numero}</b> ${esc(f.categoria)} — ${esc(f.legenda || setorNome(f.setorId))}</label>`).join('');
    abrirModal(`<h3>Vincular fotografias</h3>
      <div id="pickLista" style="max-height:52vh;overflow:auto;display:flex;flex-direction:column;gap:6px">${linhas}</div>
      <div class="barra-botoes">
        <button class="btn primario" id="pickOk">Confirmar</button>
        <button class="btn" onclick="fecharModal()">Cancelar</button>
      </div>`, d => {
      d.querySelector('#pickOk').addEventListener('click', () => {
        q.fotosRel = Array.from(d.querySelectorAll('[data-pick]:checked')).map(c => parseInt(c.value, 10));
        P.salvar('quesitos', q, true);
        fecharModal(); render();
      });
    });
  }

  /* ============================= TELAS =============================== */

  function cabecalho(titulo, sub, voltarHash, acoes) {
    topo().innerHTML =
      (voltarHash !== null ? `<button class="voltar" onclick="location.hash='${A(voltarHash || '#/')}'">‹</button>` : '') +
      `<h1>${esc(titulo)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</h1>` +
      `<div class="acoes">${acoes || ''}</div>`;
  }

  /* ---------------------------- DASHBOARD ---------------------------- */

  function telaPrimeiroUso() {
    cabecalho('Vistoria de Engenharia', 'Nenhuma vistoria carregada', null);
    app().innerHTML = `
    <div class="cabecalho-processo">
      <div class="num">Aplicativo pronto para uso</div>
      <div class="linha">Este dispositivo ainda não tem uma vistoria carregada.</div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>Carregar os dados da vistoria</h3>
      <p style="font-size:15px;color:#4a545e;margin-top:0">
        Toque abaixo e selecione o arquivo-semente que você recebeu (arquivo <code>.zip</code> na pasta
        Downloads do tablet). Ele traz os setores, os bens, os insumos e os quesitos já cadastrados.</p>
      <input type="file" accept=".zip,.json" id="inpSeed" class="arquivo-oculto">
      <div class="barra-botoes">
        <button class="btn primario bloco" onclick="document.getElementById('inpSeed').click()">
          ↓ Carregar arquivo da vistoria</button>
      </div>
      <div id="progSeed" class="progresso-exp"></div>
    </div>
    <div class="card">
      <h3>Ou começar do zero</h3>
      <p style="font-size:15px;color:#4a545e;margin-top:0">
        Cria uma vistoria vazia: você cadastra os setores e os bens manualmente.</p>
      <div class="barra-botoes">
        <button class="btn bloco" onclick="PERICIA_APP.criarVistoriaVazia()">Criar vistoria em branco</button>
      </div>
    </div>`;
    document.getElementById('inpSeed').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      const prog = document.getElementById('progSeed');
      prog.textContent = 'Carregando...';
      try {
        await X.restaurarBackup(f);
        prog.textContent = 'Dados carregados. Reabrindo o aplicativo...';
        location.hash = '#/'; setTimeout(() => location.reload(), 600);
      } catch (err) { prog.textContent = 'Falha: ' + err.message; }
    });
  }

  async function criarVistoriaVazia() {
    const base = [
      'Reunião inicial / identificação dos presentes',
      'Vistoria técnica',
      'Encerramento / documentos pendentes'
    ];
    for (let k = 0; k < base.length; k++) {
      const s = { id: 's' + String(k + 1).padStart(2, '0'), ordem: k + 1, nome: base[k],
        slug: 'SETOR_' + (k + 1), status: 'Não iniciado', inicio: '', fim: '',
        participantes: [], observacoes: '', documentos: '' };
      DB.setores.push(s); await P.idbPut('setores', s);
    }
    render();
  }

  function telaDashboard() {
    if (!DB.setores.length && !DB.itens.length) return telaPrimeiroUso();
    const s = X.stats(), p = DB.meta.processo;
    cabecalho(p.numero ? 'Perícia Judicial' : 'Vistoria de Engenharia',
      p.perito || 'Vistoria técnica de engenharia', null,
      `<button onclick="location.hash='#/lembretes'">Lembretes</button>`);

    const dataBR = (p.dataVistoria || '').split('-').reverse().join('/');
    const backup = DB.meta.ultimoBackup
      ? new Date(DB.meta.ultimoBackup).toLocaleString('pt-BR') : 'nenhum backup realizado';

    app().innerHTML = `
    <div class="cabecalho-processo">
      <div class="num">Processo nº ${esc(p.numero)}</div>
      <div class="linha"><b>Requerente:</b> ${esc(p.requerente)}</div>
      <div class="linha"><b>Requerida:</b> ${esc(p.requerida)}</div>
      <div class="linha"><b>Perito:</b> ${esc(p.perito)} — ${esc(p.crea)}</div>
      <div class="linha"><b>Vistoria:</b> ${esc(dataBR)} às ${esc(p.horaVistoria)}</div>
      <div class="linha"><b>Local:</b> ${esc(p.local)}</div>
      <div class="progresso">
        <div class="rot"><span>Progresso geral da diligência</span><span>${s.percentual}%</span></div>
        <div class="barra"><i style="width:${s.percentual}%"></i></div>
      </div>
    </div>

    <div class="grid-kpi">
      <div class="kpi ok"><div class="v">${s.setoresConcluidos}/${s.setoresTotal}</div><div class="r">Setores concluídos</div></div>
      <div class="kpi aviso"><div class="v">${s.setoresTotal - s.setoresConcluidos}</div><div class="r">Setores pendentes</div></div>
      <div class="kpi"><div class="v">${s.itensVistoriados}/${s.itensTotal}</div><div class="r">Itens vistoriados</div></div>
      <div class="kpi crit"><div class="v">${s.itensNaoLocalizados}</div><div class="r">Itens não localizados</div></div>
      <div class="kpi"><div class="v">${s.fotos}</div><div class="r">Fotografias</div></div>
      <div class="kpi ${s.pendenciasAbertas ? 'crit' : 'ok'}"><div class="v">${s.pendenciasAbertas}</div><div class="r">Pendências documentais</div></div>
      <div class="kpi ok"><div class="v">${s.quesitosRespondidos}</div><div class="r">Quesitos respondidos</div></div>
      <div class="kpi aviso"><div class="v">${s.quesitosPendentes}</div><div class="r">Quesitos pendentes</div></div>
      <div class="kpi"><div class="v">${s.participantes}</div><div class="r">Participantes</div></div>
      <div class="kpi"><div class="v">${s.insumosVistoriados}/${s.insumosTotal}</div><div class="r">Insumos analisados</div></div>
    </div>

    <h2 class="secao">Navegação</h2>
    <div class="grid-menu">
      <button class="btn-menu destaque" onclick="PERICIA_APP.iniciarVistoria()">
        <span class="t">${DB.meta.vistoriaIniciada ? '▶ Continuar Vistoria' : '▶ Iniciar Vistoria'}</span>
        <span class="d">${DB.meta.vistoriaIniciada ? 'Retomar no setor em aberto' : 'Registra o horário de início'}</span></button>
      <button class="btn-menu" onclick="location.hash='#/setores'"><span class="t">Setores</span><span class="d">16 etapas sequenciais</span></button>
      <button class="btn-menu" onclick="location.hash='#/itens'"><span class="t">Itens</span><span class="d">${s.itensTotal} bens cadastrados</span></button>
      <button class="btn-menu" onclick="location.hash='#/insumos'"><span class="t">Insumos</span><span class="d">${s.insumosTotal} produtos químicos</span></button>
      <button class="btn-menu" onclick="location.hash='#/quesitos'"><span class="t">Quesitos</span><span class="d">13 Autora + 16 Fazenda</span></button>
      <button class="btn-menu" onclick="location.hash='#/pendencias'"><span class="t">Pendências</span><span class="d">${s.pendenciasTotal} registradas</span></button>
      <button class="btn-menu" onclick="location.hash='#/participantes'"><span class="t">Participantes</span><span class="d">${s.participantes} registrados</span></button>
      <button class="btn-menu" onclick="location.hash='#/fotos'"><span class="t">Fotografias</span><span class="d">${s.fotos} registradas</span></button>
      <button class="btn-menu" onclick="location.hash='#/pacote'"><span class="t">Pacote para o Laudo</span><span class="d">JSON, CSV, HTML e ZIP</span></button>
      <button class="btn-menu" onclick="location.hash='#/backup'"><span class="t">Backup</span><span class="d">${esc(backup)}</span></button>
      <button class="btn-menu" onclick="location.hash='#/instalar'"><span class="t">Instalar no tablet</span><span class="d">Android e iPad</span></button>
      <button class="btn-menu" onclick="location.hash='#/dados'"><span class="t">Dados do processo</span><span class="d">Editar identificação</span></button>
    </div>

    <div class="aviso" style="margin-top:18px"><b>Cadeia de rastreabilidade a observar em cada item</b>
      <div class="cadeia">${D.CADEIA_RASTREABILIDADE.map(t => `<span>${esc(t)}</span>`).join('<i>›</i>')}</div>
    </div>`;
  }

  function iniciarVistoria() {
    if (!DB.meta.vistoriaIniciada) {
      DB.meta.vistoriaIniciada = true;
      DB.meta.vistoriaInicio = new Date().toLocaleString('pt-BR');
      P.salvar('meta', DB.meta, true);
    }
    const alvo = DB.setores.find(s => s.status === 'Em andamento') ||
      DB.setores.find(s => s.status !== 'Concluído') || DB.setores[0];
    if (!alvo) { toast('Nenhum setor cadastrado'); return ir('#/setores'); }
    ir('#/setor/' + alvo.id);
  }

  /* ----------------------------- SETORES ----------------------------- */

  function telaSetores() {
    cabecalho('Setores da diligência', '16 etapas sequenciais', '#/');
    app().innerHTML = '<div class="lista">' + DB.setores.map(s => {
      const nItens = DB.itens.filter(i => i.setorId === s.id).length;
      const nVist = DB.itens.filter(i => i.setorId === s.id && i.vistoriado).length;
      const nFotos = DB.fotos.filter(f => f.setorId === s.id).length;
      return `<button class="item-lista ${statusSetorClasse(s.status)}" onclick="location.hash='#/setor/${A(s.id)}'">
        <span class="cod">${s.ordem}</span>
        <span class="txt"><span class="t">${esc(s.nome)}</span>
        <span class="d">${nItens ? nVist + '/' + nItens + ' itens • ' : ''}${nFotos} fotos${s.inicio ? ' • início ' + esc(s.inicio) : ''}</span>
        <span class="tags">${tagStatusSetor(s.status)}</span></span>
        <span class="seta">›</span></button>`;
    }).join('') + '</div>';
  }

  function telaSetor(id) {
    const s = setor(id);
    if (!s) return ir('#/setores');
    const idx = DB.setores.indexOf(s);
    const ant = DB.setores[idx - 1], prox = DB.setores[idx + 1];
    const itens = DB.itens.filter(i => i.setorId === s.id);
    const fotos = fotosSetor(s.id);
    const pend = DB.pendencias.filter(p => p.setorId === s.id);

    cabecalho(`${s.ordem}. ${s.nome}`, 'Setor ' + s.ordem + ' de ' + DB.setores.length, '#/setores',
      `<button onclick="PERICIA_APP.marcarSetor('${A(s.id)}','Concluído')">✓ Concluir</button>`);

    app().innerHTML = `
    <div class="card">
      <div class="campos">
        ${sel('setores', s.id, s, 'status', 'Status do setor', OPT.setorStatus)}
        ${inpt('setores', s.id, s, 'inicio', 'Horário de início', 'time')}
        ${inpt('setores', s.id, s, 'fim', 'Horário de término', 'time')}
      </div>
      <div class="barra-botoes">
        <button class="btn pequeno" onclick="PERICIA_APP.marcarHora('${A(s.id)}','inicio')">Registrar início agora</button>
        <button class="btn pequeno" onclick="PERICIA_APP.marcarHora('${A(s.id)}','fim')">Registrar término agora</button>
      </div>
    </div>

    <div class="card">
      <div class="campos uma">
        ${multi('setores', s.id, s, 'participantes', 'Participantes presentes neste setor',
      DB.participantes.length ? DB.participantes.map(p => p.nome + (p.empresa ? ' (' + p.empresa + ')' : '')) : [],
      DB.participantes.length ? '' : 'Cadastre os participantes na tela "Participantes".')}
        ${txta('setores', s.id, s, 'observacoes', 'Observações gerais do setor', 'Descrição do que foi constatado, condições, pessoas ouvidas.')}
        ${txta('setores', s.id, s, 'documentos', 'Documentos apresentados neste setor')}
      </div>
    </div>

    <h2 class="secao">Fotos gerais do setor (${fotos.length})</h2>
    <div class="barra-botoes">${botaoFoto(s.id, '', 'Fotos gerais do setor')}</div>
    ${galeria(fotos)}

    <h2 class="secao">Itens deste setor (${itens.filter(i => i.vistoriado).length}/${itens.length} vistoriados)</h2>
    <div class="barra-botoes">
      <button class="btn" onclick="PERICIA_APP.novoItemNoSetor('${A(s.id)}')">+ Novo item neste setor</button>
    </div>
    <div class="lista">${itens.length ? itens.map(linhaItem).join('') : '<div class="vazio">Nenhum item cadastrado neste setor.</div>'}</div>

    <h2 class="secao">Pendências deste setor (${pend.length})</h2>
    <div class="barra-botoes">
      <button class="btn" onclick="PERICIA_APP.novaPendencia('${A(s.id)}','')">+ Registrar pendência</button>
    </div>
    <div class="lista">${pend.length ? pend.map(linhaPendencia).join('') : '<div class="vazio">Sem pendências registradas.</div>'}</div>

    <div class="rodape-nav">
      ${ant ? `<button class="btn" onclick="location.hash='#/setor/${A(ant.id)}'">‹ Setor anterior</button>` : '<button class="btn" disabled>‹ Setor anterior</button>'}
      ${prox ? `<button class="btn primario" onclick="PERICIA_APP.proximoSetor('${A(s.id)}','${A(prox.id)}')">Próximo setor ›</button>` : `<button class="btn verde" onclick="PERICIA_APP.marcarSetor('${A(s.id)}','Concluído');location.hash='#/pacote'">Encerrar e gerar pacote</button>`}
    </div>`;
    pintarFotos();
  }

  function marcarHora(sid, campo) {
    const s = setor(sid);
    s[campo] = P.agoraHora();
    if (campo === 'inicio' && s.status === 'Não iniciado') s.status = 'Em andamento';
    P.salvar('setores', s, true); render(); toast('Horário registrado');
  }
  function marcarSetor(sid, st) {
    const s = setor(sid);
    s.status = st;
    if (st === 'Concluído' && !s.fim) s.fim = P.agoraHora();
    P.salvar('setores', s, true); render(); toast('Setor marcado como ' + st);
  }
  function proximoSetor(atual, prox) {
    const s = setor(atual);
    if (s.status !== 'Concluído' && s.status !== 'Pendente') { s.status = 'Concluído'; if (!s.fim) s.fim = P.agoraHora(); P.salvar('setores', s, true); }
    const n = setor(prox);
    if (n.status === 'Não iniciado') { n.status = 'Em andamento'; if (!n.inicio) n.inicio = P.agoraHora(); P.salvar('setores', n, true); }
    ir('#/setor/' + prox);
  }

  /* ------------------------------ ITENS ------------------------------ */

  const filtroItens = { busca: '', f: new Set() };

  function linhaItem(i) {
    const nf = fotosDo(i.id).length;
    const cls = i.condicao === 'Não localizado' ? 'crit' : i.vistoriado ? 'ok' : '';
    const tags = [];
    if (i.condicao) tags.push(`<span class="tag ${i.condicao === 'Não localizado' ? 'crit' : 'azul'}">${esc(i.condicao)}</span>`);
    if (i.evid2017) tags.push(`<span class="tag ${i.evid2017 === 'Sim' ? 'ok' : i.evid2017 === 'Não' ? 'crit' : 'aviso'}">2017: ${esc(i.evid2017)}</span>`);
    if (i.confianca) tags.push(`<span class="tag ${i.confianca === 'Alto' ? 'ok' : i.confianca === 'Baixo' ? 'crit' : 'aviso'}">Confiança ${esc(i.confianca)}</span>`);
    tags.push(`<span class="tag ${nf ? '' : 'aviso'}">${nf} foto${nf === 1 ? '' : 's'}</span>`);
    return `<button class="item-lista ${cls}" onclick="location.hash='#/item/${A(i.id)}'">
      <span class="cod">${esc(i.codigo)}</span>
      <span class="txt"><span class="t">${esc(i.descricao)}</span>
      <span class="d">${esc(setorNome(i.setorId))}${i.tag ? ' • TAG ' + esc(i.tag) : ''}</span>
      <span class="tags">${tags.join('')}</span></span><span class="seta">›</span></button>`;
  }

  function aplicaFiltro(i) {
    const b = filtroItens.busca.trim().toLowerCase();
    if (b) {
      const alvo = [i.codigo, i.descricao, i.tag, i.patrimonio, i.fabricante, i.modelo, setorNome(i.setorId)]
        .join(' ').toLowerCase();
      if (alvo.indexOf(b) < 0) return false;
    }
    const f = filtroItens.f;
    if (f.has('pendente') && i.vistoriado) return false;
    if (f.has('concluido') && !i.vistoriado) return false;
    if (f.has('naoloc') && i.condicao !== 'Não localizado') return false;
    if (f.has('semfoto') && fotosDo(i.id).length) return false;
    if (f.has('semdoc') && (i.notaFiscal || (i.evidenciaTipos || []).length)) return false;
    if (f.has('baixa') && i.confianca !== 'Baixo') return false;
    if (f.has('analise') && !(i.requerAnalise || i.evid2017 === 'Depende de documento' || i.evid2017 === 'Indeterminado')) return false;
    return true;
  }

  function telaItens() {
    const lista = DB.itens.filter(aplicaFiltro);
    cabecalho('Itens / bens', lista.length + ' de ' + DB.itens.length + ' exibidos', '#/',
      `<button onclick="PERICIA_APP.novoItemNoSetor('')">+ Item</button>`);
    const chips = [['pendente', 'Pendente'], ['concluido', 'Vistoriado'], ['naoloc', 'Não localizado'],
    ['semfoto', 'Sem foto'], ['semdoc', 'Sem documento'], ['baixa', 'Baixa confiança'], ['analise', 'Requer análise']];
    app().innerHTML = `
      <div class="busca"><input type="text" id="buscaItens" placeholder="Pesquisar código, equipamento, TAG, setor..." value="${A(filtroItens.busca)}"></div>
      <div class="filtros">${chips.map(c => `<button class="chip ${filtroItens.f.has(c[0]) ? 'on' : ''}" onclick="PERICIA_APP.toggleFiltro('${c[0]}')">${esc(c[1])}</button>`).join('')}</div>
      <div class="lista">${lista.length ? lista.map(linhaItem).join('') : '<div class="vazio">Nenhum item corresponde ao filtro.</div>'}</div>`;
    const b = document.getElementById('buscaItens');
    b.addEventListener('input', e => {
      filtroItens.busca = e.target.value;
      const l = DB.itens.filter(aplicaFiltro);
      document.querySelector('.lista').innerHTML = l.length ? l.map(linhaItem).join('') : '<div class="vazio">Nenhum item corresponde ao filtro.</div>';
      topo().querySelector('.sub').textContent = l.length + ' de ' + DB.itens.length + ' exibidos';
    });
  }

  function toggleFiltro(k) {
    filtroItens.f.has(k) ? filtroItens.f.delete(k) : filtroItens.f.add(k);
    render();
  }

  async function novoItemNoSetor(sid) {
    const it = P.novoItem({ setorId: sid || '', setorAutos: sid ? setorNome(sid) : '' });
    DB.itens.push(it);
    await P.idbPut('itens', it);
    P.ordenar();
    ir('#/item/' + it.id);
  }

  function telaItem(id) {
    const i = item(id);
    if (!i) return ir('#/itens');
    const fotos = fotosDo(i.id);
    const pend = DB.pendencias.filter(p => p.itemId === i.id);

    cabecalho('Cód. ' + (i.codigo || '—') + ' — ' + (i.descricao || 'Novo item'),
      setorNome(i.setorId), i.setorId ? '#/setor/' + i.setorId : '#/itens',
      `<button onclick="PERICIA_APP.marcarVistoriado('${A(i.id)}')">${i.vistoriado ? '✓ Vistoriado' : 'Marcar vistoriado'}</button>`);

    app().innerHTML = `
    <div class="aviso info"><b>Cadeia de rastreabilidade</b>
      <div class="cadeia">${D.CADEIA_RASTREABILIDADE.map(t => `<span>${esc(t)}</span>`).join('<i>›</i>')}</div></div>

    <h2 class="secao">1. Identificação</h2>
    <div class="card"><div class="campos">
      ${inpt('itens', i.id, i, 'codigo', 'Código do bem')}
      ${inpt('itens', i.id, i, 'descricao', 'Descrição', 'text', '', 'largo')}
      ${inpt('itens', i.id, i, 'contaContabil', 'Conta contábil')}
      ${inpt('itens', i.id, i, 'fabricante', 'Fabricante')}
      ${inpt('itens', i.id, i, 'modelo', 'Modelo')}
      ${inpt('itens', i.id, i, 'tag', 'TAG')}
      ${inpt('itens', i.id, i, 'patrimonio', 'Nº de patrimônio')}
      ${inpt('itens', i.id, i, 'notaFiscal', 'Nº da Nota Fiscal')}
      ${inpt('itens', i.id, i, 'aquisicao', 'Data / ano de aquisição')}
    </div></div>

    <h2 class="secao">2. Localização</h2>
    <div class="card"><div class="campos">
      ${inpt('itens', i.id, i, 'setorAutos', 'Setor declarado nos autos')}
      ${selSetor('itens', i.id, i, 'setorId', 'Setor no aplicativo')}
      ${inpt('itens', i.id, i, 'setorEncontrado', 'Setor encontrado na vistoria')}
      ${inpt('itens', i.id, i, 'localizacaoFisica', 'Localização física detalhada', 'text', '', 'largo')}
      ${inpt('itens', i.id, i, 'referencia', 'Coordenada interna / referência (opcional)', 'text', '', 'largo')}
    </div></div>

    <h2 class="secao">3. Função</h2>
    <div class="card"><div class="campos uma">
      ${txta('itens', i.id, i, 'funcaoAutos', 'Função declarada nos autos')}
      ${txta('itens', i.id, i, 'funcaoConstatada', 'Função constatada pelo perito')}
      ${sel('itens', i.id, i, 'etapaProcesso', 'Etapa do processo produtivo', OPT.etapaProcesso)}
    </div></div>

    <h2 class="secao">4. Classificação e condição</h2>
    <div class="card"><div class="campos uma">
      ${radios('itens', i.id, i, 'classificacao', 'Classificação técnica', OPT.classificacao)}
      ${radios('itens', i.id, i, 'condicao', 'Condição operacional', OPT.condicao)}
      ${radios('itens', i.id, i, 'utilizacao', 'Utilização', OPT.utilizacao)}
      ${sel('itens', i.id, i, 'frequenciaUso', 'Frequência de uso', OPT.utilizacaoFreq)}
    </div></div>

    <h2 class="secao">5. Situação histórica${anoRef() ? ' — referência ' + anoRef() : ''}</h2>
    <div class="card">
      <div class="aviso"><b>Campo obrigatório</b>Não concluir apenas pela situação atual: verificar NF, CIAP, ficha patrimonial, ordens de manutenção e registros de produção.</div>
      <div class="campos uma">
        ${radios('itens', i.id, i, 'evid2017', refTexto('Há evidência de que este item estava instalado ou era utilizado') + '?', OPT.evid2017)}
        ${multi('itens', i.id, i, 'evidenciaTipos', 'Evidência histórica (tipos apresentados)', OPT.evidenciaTipos)}
        ${txta('itens', i.id, i, 'evidenciaDescricao', 'Descrição da evidência histórica', 'Nº do documento, data, emitente, o que comprova.')}
      </div>
    </div>

    <h2 class="secao">6. Avaliação técnica</h2>
    <div class="card"><div class="campos uma">
      ${radios('itens', i.id, i, 'integraProcesso', 'Este item integra diretamente o processo produtivo?', OPT.integraProcesso)}
      ${multi('itens', i.id, i, 'ausenciaCompromete', 'Sua ausência compromete:', OPT.ausenciaCompromete, 'Seleção múltipla.')}
      ${txta('itens', i.id, i, 'impactoRetirada', 'O que ocorre tecnicamente se este item for retirado ou indisponibilizado?')}
      ${txta('itens', i.id, i, 'conclusaoPreliminar', 'Conclusão técnica preliminar')}
      ${txta('itens', i.id, i, 'conclusaoFinal', 'Conclusão técnica final')}
      ${radios('itens', i.id, i, 'confianca', 'Grau de confiança da conclusão', OPT.confianca)}
      ${check('itens', i.id, i, 'requerAnalise', 'Requer análise adicional / especialista de outra área')}
      ${txta('itens', i.id, i, 'observacoes', 'Observações técnicas livres')}
    </div></div>

    <h2 class="secao">7. Fotografias (${fotos.length})</h2>
    <div class="aviso">Fotografar a placa de identificação <b style="display:inline">E</b> o contexto de instalação — não apenas o equipamento isolado.</div>
    <div class="barra-botoes">${botaoFoto(i.setorId, i.id, 'Tirar / anexar fotos do item')}</div>
    ${galeria(fotos)}

    <h2 class="secao">8. Pendências vinculadas (${pend.length})</h2>
    <div class="barra-botoes">
      <button class="btn" onclick="PERICIA_APP.novaPendencia('${A(i.setorId)}','${A(i.id)}')">+ Registrar pendência deste item</button>
    </div>
    <div class="lista">${pend.length ? pend.map(linhaPendencia).join('') : '<div class="vazio">Sem pendências.</div>'}</div>

    <div class="rodape-nav">
      <button class="btn" onclick="PERICIA_APP.irItemVizinho('${A(i.id)}',-1)">‹ Item anterior</button>
      <button class="btn verde" onclick="PERICIA_APP.marcarVistoriado('${A(i.id)}',true)">✓ Concluir item</button>
      <button class="btn" onclick="PERICIA_APP.irItemVizinho('${A(i.id)}',1)">Próximo item ›</button>
    </div>
    <div class="barra-botoes">
      <button class="btn perigo pequeno" onclick="PERICIA_APP.excluirItem('${A(i.id)}')">Excluir este item</button>
    </div>`;
    pintarFotos();
  }

  function marcarVistoriado(id, avancar) {
    const i = item(id);
    i.vistoriado = avancar === true ? true : !i.vistoriado;
    P.salvar('itens', i, true);
    toast(i.vistoriado ? 'Item marcado como vistoriado' : 'Marcação removida');
    if (avancar === true) irItemVizinho(id, 1); else render();
  }

  function irItemVizinho(id, dir) {
    const mesmoSetor = DB.itens.filter(x => x.setorId === item(id).setorId);
    const arr = mesmoSetor.length > 1 ? mesmoSetor : DB.itens;
    const k = arr.findIndex(x => x.id === id);
    const n = arr[k + dir];
    if (n) ir('#/item/' + n.id); else { toast('Fim da lista do setor'); render(); }
  }

  async function excluirItem(id) {
    if (!confirm('Excluir este item e suas fotos?')) return;
    for (const f of fotosDo(id)) { await P.idbDel('fotos', f.id); await P.idbDel('blobs', f.id); }
    DB.fotos = DB.fotos.filter(f => f.itemId !== id);
    const sid = item(id).setorId;
    DB.itens = DB.itens.filter(x => x.id !== id);
    await P.idbDel('itens', id);
    ir(sid ? '#/setor/' + sid : '#/itens');
  }

  /* ----------------------------- INSUMOS ----------------------------- */

  function telaInsumos() {
    cabecalho('Insumos industriais', DB.insumos.length + ' produtos químicos', '#/',
      `<button onclick="PERICIA_APP.novoInsumo()">+ Insumo</button>`);
    app().innerHTML = '<div class="lista">' + DB.insumos.map(i => `
      <button class="item-lista ${i.vistoriado ? 'ok' : ''}" onclick="location.hash='#/insumo/${A(i.id)}'">
        <span class="txt"><span class="t">${esc(i.nome)}</span>
        <span class="d">${esc(i.funcaoFQ || 'função a definir')}${i.pontoDosagem ? ' • ' + esc(i.pontoDosagem) : ''}</span>
        <span class="tags">${i.evid2017 ? `<span class="tag ${i.evid2017 === 'Sim' ? 'ok' : 'aviso'}">2017: ${esc(i.evid2017)}</span>` : ''}
        ${i.fispq ? '<span class="tag ok">FISPQ</span>' : '<span class="tag aviso">sem FISPQ</span>'}</span></span>
        <span class="seta">›</span></button>`).join('') + '</div>';
  }

  async function novoInsumo() {
    const i = P.novoInsumo({});
    DB.insumos.push(i); await P.idbPut('insumos', i); ir('#/insumo/' + i.id);
  }

  function telaInsumo(id) {
    const i = DB.insumos.find(x => x.id === id);
    if (!i) return ir('#/insumos');
    cabecalho(i.nome || 'Novo insumo', 'Insumo industrial', '#/insumos',
      `<button onclick="PERICIA_APP.toggleInsumo('${A(i.id)}')">${i.vistoriado ? '✓ Analisado' : 'Marcar analisado'}</button>`);
    app().innerHTML = `
    <div class="card"><div class="campos">
      ${inpt('insumos', i.id, i, 'nome', 'Insumo / produto', 'text', '', 'largo')}
      ${inpt('insumos', i.id, i, 'principioAtivo', 'Princípio ativo')}
      ${inpt('insumos', i.id, i, 'concentracao', 'Concentração')}
      ${inpt('insumos', i.id, i, 'fornecedor', 'Fornecedor')}
      ${inpt('insumos', i.id, i, 'lote', 'Lote')}
      ${inpt('insumos', i.id, i, 'notaFiscal', 'Nota Fiscal')}
      ${inpt('insumos', i.id, i, 'pontoDosagem', 'Ponto de dosagem')}
      ${inpt('insumos', i.id, i, 'dosagem', 'Dosagem', 'text', 'ppm, L/h, kg/t...')}
      ${sel('insumos', i.id, i, 'frequencia', 'Frequência de utilização', OPT.utilizacaoFreq)}
      ${inpt('insumos', i.id, i, 'entradaEstoque', 'Entrada no estoque')}
      ${inpt('insumos', i.id, i, 'saidaEstoque', 'Saída do estoque')}
      ${inpt('insumos', i.id, i, 'consumo', 'Consumo apurado')}
      ${inpt('insumos', i.id, i, 'fispq', 'FISPQ / SDS', 'text', 'apresentada? nº / revisão')}
    </div>
    <div class="campos uma">
      ${txta('insumos', i.id, i, 'funcaoFQ', 'Função físico-química no processo')}
      ${txta('insumos', i.id, i, 'destinoProcesso', 'Destino no processo')}
      ${radios('insumos', i.id, i, 'evid2017', refTexto('Há evidência de consumo') + '?', OPT.evid2017)}
      ${txta('insumos', i.id, i, 'evidenciaDescricao', 'Descrição da evidência de consumo')}
      ${txta('insumos', i.id, i, 'observacoes', 'Observações')}
    </div></div>
    <div class="barra-botoes">
      ${botaoFoto('s15', '', 'Fotos do insumo / rótulo')}
      <button class="btn perigo pequeno" onclick="PERICIA_APP.excluirInsumo('${A(i.id)}')">Excluir insumo</button>
    </div>`;
  }

  function toggleInsumo(id) {
    const i = DB.insumos.find(x => x.id === id);
    i.vistoriado = !i.vistoriado; P.salvar('insumos', i, true); render();
  }
  async function excluirInsumo(id) {
    if (!confirm('Excluir este insumo?')) return;
    DB.insumos = DB.insumos.filter(x => x.id !== id);
    await P.idbDel('insumos', id); ir('#/insumos');
  }

  /* ----------------------------- QUESITOS ---------------------------- */

  function corStatusQuesito(st) {
    if (st === 'Respondido') return 'ok';
    if (st === 'Não analisado') return '';
    if (st === 'Matéria jurídica') return 'crit';
    return 'aviso';
  }

  function telaQuesitos() {
    const s = X.stats();
    cabecalho('Quesitos', s.quesitosRespondidos + ' respondidos de ' + s.quesitosTotal, '#/');
    const bloco = parte => {
      const qs = DB.quesitos.filter(q => q.parte === parte);
      return `<h2 class="secao">${parte === 'AUTORA' ? 'Quesitos da Autora (' + qs.length + ')' : 'Quesitos da Fazenda Pública do Estado de São Paulo (' + qs.length + ')'}</h2>
      <div class="lista">${qs.map(q => `
        <button class="item-lista ${corStatusQuesito(q.status) === 'ok' ? 'ok' : corStatusQuesito(q.status) === 'crit' ? 'crit' : q.status === 'Não analisado' ? '' : 'and'}"
          onclick="location.hash='#/quesito/${A(q.id)}'">
          <span class="cod">${q.numero}</span>
          <span class="txt"><span class="t">${esc(q.texto ? q.texto.slice(0, 90) : '(texto do quesito a inserir)')}</span>
          <span class="d">${esc(setorNome(q.setorId))}${(q.itensRel || []).length ? ' • ' + q.itensRel.length + ' itens vinculados' : ''}</span>
          <span class="tags"><span class="tag ${corStatusQuesito(q.status)}">${esc(q.status)}</span></span></span>
          <span class="seta">›</span></button>`).join('')}</div>`;
    };
    app().innerHTML = `<div class="aviso crit"><b>Limite da atuação pericial</b>${esc(D.ALERTA_QUESITOS)}</div>`
      + bloco('AUTORA') + bloco('FAZENDA')
      + `<div class="barra-botoes"><button class="btn" onclick="PERICIA_APP.novoQuesito('AUTORA')">+ Quesito da Autora</button>
         <button class="btn" onclick="PERICIA_APP.novoQuesito('FAZENDA')">+ Quesito da Fazenda</button>
         <button class="btn" onclick="PERICIA_APP.novoQuesito('COMPLEMENTAR')">+ Quesito complementar</button></div>`;
  }

  async function novoQuesito(parte) {
    const n = DB.quesitos.filter(q => q.parte === parte).length + 1;
    const q = P.novoQuesito({ parte, numero: n });
    DB.quesitos.push(q); await P.idbPut('quesitos', q); P.ordenar(); ir('#/quesito/' + q.id);
  }

  function telaQuesito(id) {
    const q = DB.quesitos.find(x => x.id === id);
    if (!q) return ir('#/quesitos');
    cabecalho('Quesito nº ' + q.numero + ' — ' + (q.parte === 'AUTORA' ? 'Autora' : q.parte === 'FAZENDA' ? 'Fazenda' : 'Complementar'),
      esc(q.status), '#/quesitos');
    app().innerHTML = `
    <div class="aviso crit"><b>Atenção permanente</b>${esc(D.ALERTA_QUESITOS)}</div>
    <div class="card"><div class="campos uma">
      ${txta('quesitos', q.id, q, 'texto', 'Texto integral do quesito', 'Cole aqui o texto exato constante dos autos.')}
      ${selSetor('quesitos', q.id, q, 'setorId', 'Setor relacionado')}
      ${sel('quesitos', q.id, q, 'status', 'Status', OPT.quesitoStatus)}
    </div>
    <div class="barra-botoes">
      <button class="btn pequeno" onclick="PERICIA_APP.abrirSeletorItens('${A(q.id)}')">Vincular itens (${(q.itensRel || []).length})</button>
      <button class="btn pequeno" onclick="PERICIA_APP.abrirSeletorFotos('${A(q.id)}')">Vincular fotos (${(q.fotosRel || []).length})</button>
    </div>
    ${(q.itensRel || []).length ? `<div class="tags">${q.itensRel.map(x => { const i = item(x); return `<span class="tag azul">${esc(i ? i.codigo + ' - ' + i.descricao.slice(0, 34) : x)}</span>`; }).join('')}</div>` : ''}
    ${(q.fotosRel || []).length ? `<div class="tags">${q.fotosRel.map(n => `<span class="tag">Foto ${n}</span>`).join('')}</div>` : ''}
    <div class="campos uma" style="margin-top:12px">
      ${txta('quesitos', q.id, q, 'documentosRel', 'Documentos relacionados')}
      ${txta('quesitos', q.id, q, 'respostaPreliminar', 'Resposta preliminar (campo)')}
      ${txta('quesitos', q.id, q, 'respostaFinal', 'Resposta final (gabinete)')}
    </div></div>
    <div class="rodape-nav">
      <button class="btn" onclick="PERICIA_APP.irQuesitoVizinho('${A(q.id)}',-1)">‹ Anterior</button>
      <button class="btn verde" onclick="PERICIA_APP.marcarQuesito('${A(q.id)}')">✓ Marcar respondido</button>
      <button class="btn" onclick="PERICIA_APP.irQuesitoVizinho('${A(q.id)}',1)">Próximo ›</button>
    </div>`;
  }

  function marcarQuesito(id) {
    const q = DB.quesitos.find(x => x.id === id);
    q.status = 'Respondido'; P.salvar('quesitos', q, true); render(); toast('Quesito marcado como respondido');
  }
  function irQuesitoVizinho(id, dir) {
    const arr = DB.quesitos.filter(q => q.parte === DB.quesitos.find(x => x.id === id).parte);
    const k = arr.findIndex(x => x.id === id);
    const n = arr[k + dir];
    if (n) ir('#/quesito/' + n.id); else toast('Fim da lista');
  }

  /* ---------------------------- PENDÊNCIAS --------------------------- */

  function linhaPendencia(p) {
    const cls = p.status === 'Atendida' ? 'ok' : p.prioridade === 'Alta' ? 'crit' : 'pend';
    return `<button class="item-lista ${cls}" onclick="location.hash='#/pendencia/${A(p.id)}'">
      <span class="txt"><span class="t">${esc(p.tipo || 'Pendência')}${p.descricao ? ' — ' + esc(p.descricao.slice(0, 70)) : ''}</span>
      <span class="d">${esc(setorNome(p.setorId))}${p.responsavel ? ' • ' + esc(p.responsavel) : ''}</span>
      <span class="tags"><span class="tag ${p.status === 'Atendida' ? 'ok' : 'aviso'}">${esc(p.status)}</span>
      <span class="tag ${p.prioridade === 'Alta' ? 'crit' : ''}">${esc(p.prioridade)}</span></span></span>
      <span class="seta">›</span></button>`;
  }

  function telaPendencias() {
    const s = X.stats();
    cabecalho('Pendências documentais', s.pendenciasAbertas + ' em aberto', '#/',
      `<button onclick="PERICIA_APP.novaPendencia('','')">+ Nova</button>`);
    app().innerHTML = `
      <div class="aviso"><b>Registre formalmente a ausência de documentos</b>Toda documentação solicitada e não apresentada deve constar do laudo.</div>
      <div class="lista">${DB.pendencias.length ? DB.pendencias.map(linhaPendencia).join('') : '<div class="vazio">Nenhuma pendência registrada.</div>'}</div>`;
  }

  async function novaPendencia(sid, iid) {
    const p = P.novaPendencia({ setorId: sid || '', itemId: iid || '', dataSolicitada: new Date().toISOString().slice(0, 10) });
    DB.pendencias.push(p); await P.idbPut('pendencias', p); ir('#/pendencia/' + p.id);
  }

  function telaPendencia(id) {
    const p = DB.pendencias.find(x => x.id === id);
    if (!p) return ir('#/pendencias');
    cabecalho(p.tipo || 'Nova pendência', 'Pendência documental', '#/pendencias');
    const itensOpts = ['<option value="">— nenhum —</option>'].concat(
      DB.itens.map(i => `<option value="${A(i.id)}"${p.itemId === i.id ? ' selected' : ''}>${esc(i.codigo)} - ${esc(i.descricao)}</option>`)).join('');
    app().innerHTML = `
    <div class="card"><div class="campos">
      ${sel('pendencias', p.id, p, 'tipo', 'Tipo de documento', OPT.pendTipos, '', 'largo')}
      ${selSetor('pendencias', p.id, p, 'setorId', 'Setor')}
      <div class="campo"><label>Item relacionado</label><select ${attrs('pendencias', p.id, 'itemId')}>${itensOpts}</select></div>
      ${inpt('pendencias', p.id, p, 'responsavel', 'Responsável pela entrega')}
      ${sel('pendencias', p.id, p, 'prioridade', 'Prioridade', OPT.prioridade)}
      ${inpt('pendencias', p.id, p, 'dataSolicitada', 'Data solicitada', 'date')}
      ${sel('pendencias', p.id, p, 'status', 'Status', OPT.pendStatus)}
    </div>
    <div class="campos uma">
      ${txta('pendencias', p.id, p, 'descricao', 'Descrição do que foi solicitado')}
      ${txta('pendencias', p.id, p, 'observacao', 'Observação')}
    </div></div>
    <div class="barra-botoes">
      <button class="btn perigo pequeno" onclick="PERICIA_APP.excluirPendencia('${A(p.id)}')">Excluir pendência</button>
    </div>`;
  }

  async function excluirPendencia(id) {
    if (!confirm('Excluir esta pendência?')) return;
    DB.pendencias = DB.pendencias.filter(x => x.id !== id);
    await P.idbDel('pendencias', id); ir('#/pendencias');
  }

  /* --------------------------- PARTICIPANTES ------------------------- */

  function telaParticipantes() {
    cabecalho('Participantes da diligência', DB.participantes.length + ' registrados', '#/',
      `<button onclick="PERICIA_APP.novoParticipante()">+ Participante</button>`);
    app().innerHTML = '<div class="lista">' + (DB.participantes.length ? DB.participantes.map(p => `
      <button class="item-lista" onclick="location.hash='#/participante/${A(p.id)}'">
        <span class="txt"><span class="t">${esc(p.nome || '(sem nome)')}</span>
        <span class="d">${esc(p.funcao)}${p.empresa ? ' • ' + esc(p.empresa) : ''}${p.registro ? ' • ' + esc(p.registro) : ''}</span>
        <span class="tags">${p.chegada ? `<span class="tag azul">chegada ${esc(p.chegada)}</span>` : ''}
        ${p.saida ? `<span class="tag">saída ${esc(p.saida)}</span>` : ''}</span></span>
        <span class="seta">›</span></button>`).join('') : '<div class="vazio">Registre os presentes na reunião inicial.</div>') + '</div>';
  }

  async function novoParticipante() {
    const p = P.novoParticipante({ chegada: P.agoraHora() });
    DB.participantes.push(p); await P.idbPut('participantes', p); ir('#/participante/' + p.id);
  }

  function telaParticipante(id) {
    const p = DB.participantes.find(x => x.id === id);
    if (!p) return ir('#/participantes');
    cabecalho(p.nome || 'Novo participante', 'Participante da diligência', '#/participantes');
    app().innerHTML = `
    <div class="card"><div class="campos">
      ${inpt('participantes', p.id, p, 'nome', 'Nome completo', 'text', '', 'largo')}
      ${inpt('participantes', p.id, p, 'funcao', 'Função')}
      ${inpt('participantes', p.id, p, 'empresa', 'Empresa / parte')}
      ${inpt('participantes', p.id, p, 'registro', 'CREA / CRQ / OAB')}
      ${inpt('participantes', p.id, p, 'telefone', 'Telefone', 'tel')}
      ${inpt('participantes', p.id, p, 'email', 'E-mail', 'email')}
      ${inpt('participantes', p.id, p, 'chegada', 'Horário de chegada', 'time')}
      ${inpt('participantes', p.id, p, 'saida', 'Horário de saída', 'time')}
    </div>
    <div class="campos uma">${txta('participantes', p.id, p, 'observacao', 'Observação')}</div></div>
    <div class="barra-botoes">
      <button class="btn perigo pequeno" onclick="PERICIA_APP.excluirParticipante('${A(p.id)}')">Excluir participante</button>
    </div>`;
  }

  async function excluirParticipante(id) {
    if (!confirm('Excluir este participante?')) return;
    DB.participantes = DB.participantes.filter(x => x.id !== id);
    await P.idbDel('participantes', id); ir('#/participantes');
  }

  /* ------------------------------ FOTOS ------------------------------ */

  function telaFotos() {
    cabecalho('Índice fotográfico', DB.fotos.length + ' fotografias', '#/');
    app().innerHTML = `
      <div class="busca"><input type="text" id="buscaFoto" placeholder="Filtrar por nº, setor, item, categoria, legenda..."></div>
      <div id="galFotos">${galeria(DB.fotos)}</div>`;
    pintarFotos();
    document.getElementById('buscaFoto').addEventListener('input', e => {
      const t = e.target.value.toLowerCase();
      const l = DB.fotos.filter(f => [f.numero, f.arquivo, setorNome(f.setorId), f.itemCodigo, f.categoria, f.legenda]
        .join(' ').toLowerCase().indexOf(t) >= 0);
      document.getElementById('galFotos').innerHTML = galeria(l);
      pintarFotos();
    });
  }

  /* ---------------------------- LEMBRETES ---------------------------- */

  function telaLembretes() {
    cabecalho('Lembretes técnicos', 'Metodologia da diligência', '#/');
    app().innerHTML = `
    <div class="card"><h3>Cadeia de rastreabilidade de cada item</h3>
      <div class="cadeia">${D.CADEIA_RASTREABILIDADE.map(t => `<span>${esc(t)}</span>`).join('<i>›</i>')}</div></div>
    ${D.LEMBRETES.map(l => `<div class="aviso">${esc(l)}</div>`).join('')}
    <div class="aviso crit"><b>Limite da atuação pericial</b>${esc(D.ALERTA_QUESITOS)}</div>`;
  }

  /* -------------------------- DADOS PROCESSO ------------------------- */

  function telaDados() {
    const p = DB.meta.processo;
    cabecalho('Dados do processo', 'Identificação e vistoria', '#/');
    app().innerHTML = `
    <div class="card"><div class="campos">
      ${inpt('processo', 'meta', p, 'numero', 'Número do processo', 'text', '', 'largo')}
      ${inpt('processo', 'meta', p, 'requerente', 'Requerente', 'text', '', 'largo')}
      ${inpt('processo', 'meta', p, 'requerida', 'Requerida', 'text', '', 'largo')}
      ${inpt('processo', 'meta', p, 'perito', 'Perito Judicial', 'text', '', 'largo')}
      ${inpt('processo', 'meta', p, 'crea', 'Registro profissional')}
      ${inpt('processo', 'meta', p, 'anoReferencia', 'Ano de referência', 'number')}
      ${inpt('processo', 'meta', p, 'dataVistoria', 'Data da vistoria', 'date')}
      ${inpt('processo', 'meta', p, 'horaVistoria', 'Horário', 'time')}
      ${inpt('processo', 'meta', p, 'local', 'Local', 'text', '', 'largo')}
    </div>
    <div class="campos uma">
      ${inpt('meta', 'meta', DB.meta, 'vistoriaInicio', 'Início real da diligência')}
      ${inpt('meta', 'meta', DB.meta, 'vistoriaFim', 'Término real da diligência')}
      ${txta('meta', 'meta', DB.meta, 'observacoesFinais', 'Observações finais do perito')}
    </div></div>`;
  }

  /* ------------------------------ PACOTE ----------------------------- */

  function telaPacote() {
    const s = X.stats();
    cabecalho('Pacote para o Laudo', 'Exportação dos dados', '#/');
    app().innerHTML = `
    ${window.SEM_SW ? `<div class="aviso crit"><b>Versão online (arquivo único)</b>
      Nesta versão o visualizador entrega apenas arquivos <code>.json</code>, <code>.csv</code> e <code>.html</code> —
      o pacote <code>.zip</code> com as fotografias exige a versão instalada do aplicativo.</div>` : ''}
    <div class="aviso info"><b>Resumo do que será exportado</b>
      ${s.setoresTotal} setores • ${s.itensTotal} itens (${s.itensVistoriados} vistoriados) • ${s.fotos} fotos •
      ${s.insumosTotal} insumos • ${s.quesitosTotal} quesitos • ${s.pendenciasTotal} pendências • ${s.participantes} participantes.</div>

    <div class="card">
      <h3>Pacote completo</h3>
      <p style="font-size:14px;color:#4a545e;margin-top:0">Arquivo ZIP contendo JSON completo, pacote para ChatGPT, sete planilhas CSV, relatório HTML imprimível e todas as fotografias.</p>
      <div class="barra-botoes">
        <button class="btn primario bloco" onclick="PERICIA_APP.exportar(true)">⬇ EXPORTAR PACOTE PARA O LAUDO (com fotos)</button>
      </div>
      <div class="barra-botoes">
        <button class="btn" onclick="PERICIA_APP.exportar(false)">Exportar sem fotos (arquivo leve)</button>
      </div>
      <div id="progExp" class="progresso-exp"></div>
    </div>

    <div class="card">
      <h3>Arquivo específico para o ChatGPT</h3>
      <p style="font-size:14px;color:#4a545e;margin-top:0">JSON estruturado com instruções embutidas para geração automática do Laudo Pericial.</p>
      <div class="barra-botoes">
        <button class="btn verde bloco" onclick="PERICIA_APP.exportarChatGPT()">🤖 Gerar Arquivo para ChatGPT</button>
      </div>
    </div>

    <div class="card">
      <h3>Arquivos avulsos</h3>
      <div class="barra-botoes">
        <button class="btn pequeno" onclick="PERICIA_APP.baixarTexto('json')">JSON completo</button>
        <button class="btn pequeno" onclick="PERICIA_APP.baixarTexto('html')">Relatório HTML</button>
        <button class="btn pequeno" onclick="PERICIA_APP.imprimir()">Abrir para impressão</button>
      </div>
      <div class="barra-botoes">
        <button class="btn pequeno" onclick="PERICIA_APP.baixarCsv('itens')">CSV itens</button>
        <button class="btn pequeno" onclick="PERICIA_APP.baixarCsv('setores')">CSV setores</button>
        <button class="btn pequeno" onclick="PERICIA_APP.baixarCsv('quesitos')">CSV quesitos</button>
        <button class="btn pequeno" onclick="PERICIA_APP.baixarCsv('pendencias')">CSV pendências</button>
        <button class="btn pequeno" onclick="PERICIA_APP.baixarCsv('participantes')">CSV participantes</button>
        <button class="btn pequeno" onclick="PERICIA_APP.baixarCsv('insumos')">CSV insumos</button>
        <button class="btn pequeno" onclick="PERICIA_APP.baixarCsv('fotos')">CSV índice fotográfico</button>
      </div>
    </div>`;
  }

  async function exportar(comFotos) {
    const prog = document.getElementById('progExp');
    prog.textContent = 'Gerando pacote...';
    try {
      await P.flushSaves();
      await X.exportarPacote(comFotos, (i, n) => { prog.textContent = `Compactando fotografias ${i}/${n}...`; });
      prog.textContent = 'Pacote gerado. Verifique os downloads do tablet.';
      toast('Pacote exportado');
    } catch (e) { prog.textContent = 'Erro: ' + e.message; alert('Erro ao exportar: ' + e.message); }
  }

  async function exportarChatGPT() {
    const blob = new Blob([JSON.stringify(X.pacoteChatGPT(), null, 2)], { type: 'application/json' });
    await X.baixar(blob, 'CHATGPT_' + X.nomeBase() + '.json');
    toast('Arquivo para ChatGPT gerado');
  }

  async function baixarTexto(tipo) {
    if (tipo === 'json') await X.baixar(new Blob([JSON.stringify(X.pacoteJSON(), null, 2)], { type: 'application/json' }), X.nomeBase() + '.json');
    else await X.baixar(new Blob([X.relatorioHTML()], { type: 'text/html' }), 'RELATORIO_' + X.nomeBase() + '.html');
  }

  async function baixarCsv(qual) {
    const m = { itens: X.csvItens, setores: X.csvSetores, quesitos: X.csvQuesitos, pendencias: X.csvPendencias, participantes: X.csvParticipantes, insumos: X.csvInsumos, fotos: X.csvFotos };
    await X.baixar(new Blob([m[qual]()], { type: 'text/csv' }), qual + '_' + X.nomeBase() + '.csv');
  }

  function imprimir() {
    const w = window.open('', '_blank');
    if (!w) { alert('Permita janelas pop-up para abrir o relatório.'); return; }
    w.document.write(X.relatorioHTML());
    w.document.close();
  }

  /* ------------------------------ BACKUP ----------------------------- */

  function telaBackup() {
    cabecalho('Backup e restauração', 'Segurança dos dados', '#/');
    const ub = DB.meta.ultimoBackup ? new Date(DB.meta.ultimoBackup).toLocaleString('pt-BR') : 'nunca';
    app().innerHTML = `
    ${window.SEM_SW ? `<div class="aviso crit"><b>Versão online (arquivo único)</b>
      O backup é gerado em <code>.zip</code>, formato que esta versão não entrega.
      Use a versão instalada do aplicativo para backup e restauração.</div>` : ''}
    <div class="aviso ${DB.meta.ultimoBackup ? 'info' : 'crit'}"><b>Último backup realizado em:</b>${esc(ub)}</div>
    <div class="card">
      <h3>Backup manual</h3>
      <p style="font-size:14px;color:#4a545e;margin-top:0">Gera um arquivo ZIP com todos os dados e fotografias. Faça backup ao final de cada setor.</p>
      <div class="barra-botoes"><button class="btn primario bloco" onclick="PERICIA_APP.backup()">💾 Gerar backup completo</button></div>
      <div id="progBk" class="progresso-exp"></div>
    </div>
    <div class="card">
      <h3>Restaurar backup</h3>
      <div class="aviso crit"><b>Atenção</b>A restauração substitui integralmente os dados existentes neste dispositivo.</div>
      <input type="file" accept=".zip,.json" id="inpRestore" class="arquivo-oculto">
      <div class="barra-botoes"><button class="btn bloco" onclick="document.getElementById('inpRestore').click()">↺ Selecionar arquivo de backup</button></div>
    </div>
    <div class="card">
      <h3>Armazenamento</h3>
      <div id="uso" class="progresso-exp">calculando...</div>
      <div class="barra-botoes"><button class="btn perigo pequeno" onclick="PERICIA_APP.zerar()">Apagar todos os dados deste dispositivo</button></div>
    </div>`;

    document.getElementById('inpRestore').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      if (!confirm('Restaurar "' + f.name + '"? Todos os dados atuais serão substituídos.')) return;
      try {
        await X.restaurarBackup(f);
        alert('Backup restaurado. O aplicativo será recarregado.');
        location.hash = '#/'; location.reload();
      } catch (err) { alert('Falha na restauração: ' + err.message); }
    });

    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(x => {
        const mb = n => (n / 1048576).toFixed(1) + ' MB';
        document.getElementById('uso').textContent =
          'Utilizado: ' + mb(x.usage || 0) + ' de aproximadamente ' + mb(x.quota || 0) + ' disponíveis.';
      });
    }
  }

  async function backup() {
    const prog = document.getElementById('progBk');
    prog.textContent = 'Gerando backup...';
    try {
      await P.flushSaves();
      const nome = await X.backupCompleto((i, n) => { prog.textContent = `Incluindo fotografias ${i}/${n}...`; });
      prog.textContent = 'Backup gerado: ' + nome;
      toast('Backup concluído');
      render();
    } catch (e) { prog.textContent = 'Erro: ' + e.message; }
  }

  async function zerar() {
    if (!confirm('APAGAR TODOS OS DADOS deste dispositivo? Esta ação não pode ser desfeita.')) return;
    if (!confirm('Confirme novamente: todos os itens, fotos e respostas serão perdidos.')) return;
    for (const s of ['meta', 'setores', 'itens', 'fotos', 'blobs', 'insumos', 'quesitos', 'pendencias', 'participantes']) await P.idbClear(s);
    location.reload();
  }

  /* ---------------------------- INSTALAÇÃO --------------------------- */

  function telaInstalar() {
    cabecalho('Como instalar no tablet', 'Android e iPad', '#/');
    app().innerHTML = `
    ${window.SEM_SW ? `<div class="aviso crit"><b>Esta é a versão de demonstração online (arquivo único)</b>
      Ela salva os dados no navegador e exporta normalmente, mas <b style="display:inline">não</b> possui cache offline.
      Para uso em campo sem internet, hospede a versão completa em pasta (com <code>sw.js</code> e <code>manifest.webmanifest</code>)
      e instale-a pelo endereço próprio.</div>` : ''}
    <div class="card"><h3>Android (Chrome)</h3>
      <ol class="passos">
        <li>Abra o endereço do aplicativo no <b>Chrome</b>.</li>
        <li>Toque no menu <b>⋮</b> (três pontos), no canto superior direito.</li>
        <li>Escolha <b>“Instalar aplicativo”</b> ou <b>“Adicionar à tela inicial”</b>.</li>
        <li>Confirme. O ícone “Perícia JS” aparecerá na tela inicial.</li>
        <li>Abra pelo ícone: o app funcionará em tela cheia e offline.</li>
      </ol>
      <div class="barra-botoes"><button class="btn primario" id="btnInstalar" style="display:none">Instalar agora</button></div>
    </div>
    <div class="card"><h3>iPad (Safari)</h3>
      <ol class="passos">
        <li>Abra o endereço do aplicativo no <b>Safari</b> (não funciona no Chrome do iPad).</li>
        <li>Toque no botão <b>Compartilhar</b> (quadrado com seta para cima).</li>
        <li>Role e escolha <b>“Adicionar à Tela de Início”</b>.</li>
        <li>Confirme em <b>Adicionar</b>.</li>
      </ol>
    </div>
    <div class="card"><h3>Antes da diligência</h3>
      <ol class="passos">
        <li>Abra o app uma vez conectado à internet — o conteúdo fica gravado no tablet.</li>
        <li>Percorra as telas principais para garantir o cache completo.</li>
        <li>Ative o modo avião e confirme que o app continua abrindo.</li>
        <li>Verifique se a câmera abre pelo botão “Tirar / anexar fotos”.</li>
        <li>Gere um backup de teste para confirmar que o download funciona no tablet.</li>
      </ol>
    </div>
    <div class="aviso"><b>Importante</b>Os dados ficam gravados no próprio tablet (IndexedDB). Não limpe os dados do navegador durante a perícia e faça backups frequentes.</div>`;
    if (window._deferredPrompt) {
      const b = document.getElementById('btnInstalar');
      b.style.display = '';
      b.onclick = async () => { window._deferredPrompt.prompt(); window._deferredPrompt = null; b.style.display = 'none'; };
    }
  }

  /* ----------------------------- ROTEADOR ---------------------------- */

  function render() {
    const h = location.hash || '#/';
    const [rota, arg] = h.replace(/^#\//, '').split('/');
    fecharModal();
    window.scrollTo(0, 0);
    try {
      switch (rota) {
        case '': case undefined: telaDashboard(); break;
        case 'setores': telaSetores(); break;
        case 'setor': telaSetor(arg); break;
        case 'itens': telaItens(); break;
        case 'item': telaItem(arg); break;
        case 'insumos': telaInsumos(); break;
        case 'insumo': telaInsumo(arg); break;
        case 'quesitos': telaQuesitos(); break;
        case 'quesito': telaQuesito(arg); break;
        case 'pendencias': telaPendencias(); break;
        case 'pendencia': telaPendencia(arg); break;
        case 'participantes': telaParticipantes(); break;
        case 'participante': telaParticipante(arg); break;
        case 'fotos': telaFotos(); break;
        case 'lembretes': telaLembretes(); break;
        case 'dados': telaDados(); break;
        case 'pacote': telaPacote(); break;
        case 'backup': telaBackup(); break;
        case 'instalar': telaInstalar(); break;
        default: telaDashboard();
      }
    } catch (e) {
      console.error(e);
      app().innerHTML = `<div class="aviso crit"><b>Erro ao montar a tela</b>${esc(e.message)}</div>
        <div class="barra-botoes"><button class="btn primario" onclick="location.hash='#/'">Voltar ao início</button></div>`;
    }
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('beforeunload', () => { try { P.flushSaves(); } catch (e) { } });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window._deferredPrompt = e; });

  /* ------------------------------ início ----------------------------- */

  let _iniciado = false;
  async function iniciar() {
    if (_iniciado) return;
    _iniciado = true;
    try {
      await P.openDB();
      await P.seedIfEmpty();
      if (navigator.storage && navigator.storage.persist) { try { await navigator.storage.persist(); } catch (e) { } }
      render();
    } catch (e) {
      document.getElementById('app').innerHTML =
        `<div class="aviso crit"><b>Não foi possível abrir o banco de dados local</b>${esc(e.message)}<br>
        Verifique se o navegador não está em modo privado/anônimo.</div>`;
    }
  }

  window.PERICIA_APP = {
    render, iniciar, iniciarVistoria, marcarHora, marcarSetor, proximoSetor,
    criarVistoriaVazia, novoItemNoSetor, marcarVistoriado, irItemVizinho, excluirItem, toggleFiltro,
    novoInsumo, toggleInsumo, excluirInsumo,
    novoQuesito, marcarQuesito, irQuesitoVizinho, abrirSeletorItens, abrirSeletorFotos,
    novaPendencia, excluirPendencia, novoParticipante, excluirParticipante,
    abrirFoto, excluirFoto, exportar, exportarChatGPT, baixarTexto, baixarCsv, imprimir,
    backup, zerar
  };

  document.addEventListener('DOMContentLoaded', iniciar);
  if (document.readyState !== 'loading') iniciar();
})();
