/* =====================================================================
   export.js :: JSON, CSV, HTML imprimível, ZIP, pacote ChatGPT, backup
   ===================================================================== */

(function () {
  const { DB, idbGet, idbAll, idbPut, idbClear, salvar, nowISO } = window.PERICIA_DB;
  const { criarZip, lerZip } = window.PERICIA_ZIP;

  /* ------------------------------ util ------------------------------ */

  /* Entrega de arquivo ao usuário.
     - Aplicativo hospedado (uso normal): link de download do navegador.
     - Página publicada no claude.ai: usa a capacidade "downloads" do visualizador. */
  let _dlCap;
  async function _capDownloads() {
    if (_dlCap !== undefined) return _dlCap;
    try {
      _dlCap = (window.claude && typeof window.claude.use === 'function')
        ? await window.claude.use('downloads') : null;
    } catch (e) { _dlCap = null; }
    return _dlCap;
  }

  function _baixarNavegador(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
    return true;
  }

  async function baixar(blob, nome) {
    const cap = await _capDownloads();
    if (!cap) return _baixarNavegador(blob, nome);
    try {
      await cap.save({ filename: nome, data: blob });
      return true;
    } catch (err) {
      const c = err && err.code;
      if (c === 'declined' || c === 'rate_limited') return false;
      if (c === 'rejected_extension' || c === 'extension_not_enabled') {
        alert('A versão online não entrega arquivos ".' + String(nome).split('.').pop() + '".\n\n' +
          'Use a versão instalada do aplicativo (pasta hospedada) para gerar o pacote ZIP completo, ' +
          'ou exporte o JSON avulso nesta tela.');
        return false;
      }
      if (c === 'too_large') {
        alert('Arquivo acima do limite de 16 MB desta versão online.\n\n' +
          'Exporte sem fotos ou utilize a versão instalada do aplicativo.');
        return false;
      }
      return _baixarNavegador(blob, nome);
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function csvCampo(v) {
    if (Array.isArray(v)) v = v.join(' | ');
    const s = String(v == null ? '' : v).replace(/"/g, '""');
    return '"' + s + '"';
  }

  function csv(linhas) {
    return '﻿' + linhas.map(l => l.map(csvCampo).join(';')).join('\r\n');
  }

  function setorNome(id) { const s = DB.setores.find(x => x.id === id); return s ? s.nome : ''; }
  function itemLabel(id) { const i = DB.itens.find(x => x.id === id); return i ? (i.codigo + ' - ' + i.descricao) : ''; }

  function nomeBase() {
    const d = DB.meta.processo;
    const data = (d.dataVistoria || '').split('-').reverse().join('-');
    return 'PERICIA_' + d.numero + '_' + (data || 'sem-data');
  }

  /* ---------------------------- ESTATÍSTICAS ------------------------ */

  function stats() {
    const setores = DB.setores;
    const itens = DB.itens;
    const concl = setores.filter(s => s.status === 'Concluído').length;
    const vistoriados = itens.filter(i => i.vistoriado).length;
    const naoLocalizados = itens.filter(i => i.condicao === 'Não localizado').length;
    const quesRespondidos = DB.quesitos.filter(q => q.status === 'Respondido').length;
    const insumosVist = DB.insumos.filter(i => i.vistoriado).length;

    const totalUnidades = setores.length + itens.length + DB.insumos.length + DB.quesitos.length;
    const feitas = concl + vistoriados + insumosVist + quesRespondidos;
    const perc = totalUnidades ? Math.round(feitas * 100 / totalUnidades) : 0;

    return {
      setoresTotal: setores.length,
      setoresConcluidos: concl,
      setoresPendentes: setores.filter(s => s.status === 'Pendente').length,
      setoresEmAndamento: setores.filter(s => s.status === 'Em andamento').length,
      setoresNaoIniciados: setores.filter(s => s.status === 'Não iniciado').length,
      itensTotal: itens.length,
      itensVistoriados: vistoriados,
      itensNaoLocalizados: naoLocalizados,
      itensSemFoto: itens.filter(i => !DB.fotos.some(f => f.itemId === i.id)).length,
      fotos: DB.fotos.length,
      pendenciasAbertas: DB.pendencias.filter(p => p.status !== 'Atendida').length,
      pendenciasTotal: DB.pendencias.length,
      quesitosTotal: DB.quesitos.length,
      quesitosRespondidos: quesRespondidos,
      quesitosPendentes: DB.quesitos.length - quesRespondidos,
      insumosTotal: DB.insumos.length,
      insumosVistoriados: insumosVist,
      participantes: DB.participantes.length,
      percentual: perc
    };
  }

  /* ------------------------------ JSON ------------------------------ */

  function pacoteJSON() {
    return {
      _formato: 'PERICIA_JUDICIAL_APP_v1',
      _geradoEm: nowISO(),
      identificacao: DB.meta.processo,
      vistoria: {
        iniciada: DB.meta.vistoriaIniciada,
        inicio: DB.meta.vistoriaInicio,
        fim: DB.meta.vistoriaFim,
        observacoesFinais: DB.meta.observacoesFinais
      },
      resumo: stats(),
      participantes: DB.participantes,
      setores: DB.setores.map(s => Object.assign({}, s, {
        itens: DB.itens.filter(i => i.setorId === s.id).map(i => i.id),
        fotos: DB.fotos.filter(f => f.setorId === s.id).map(f => f.numero)
      })),
      itens: DB.itens.map(i => Object.assign({}, i, {
        setorNome: setorNome(i.setorId),
        fotos: DB.fotos.filter(f => f.itemId === i.id).map(f => ({
          numero: f.numero, arquivo: f.arquivo, categoria: f.categoria,
          legenda: f.legenda, principal: !!f.principal
        }))
      })),
      insumos: DB.insumos,
      fotografias: DB.fotos.map(f => ({
        numero: f.numero, arquivo: f.arquivo, data: f.data, hora: f.hora,
        setorId: f.setorId, setorNome: setorNome(f.setorId),
        itemId: f.itemId, itemCodigo: f.itemCodigo || '',
        categoria: f.categoria, legenda: f.legenda,
        observacao: f.observacao, principal: !!f.principal
      })),
      pendencias: DB.pendencias.map(p => Object.assign({}, p, {
        setorNome: setorNome(p.setorId), item: itemLabel(p.itemId)
      })),
      quesitos: DB.quesitos.map(q => Object.assign({}, q, {
        setorNome: setorNome(q.setorId),
        itensRelacionados: (q.itensRel || []).map(itemLabel)
      })),
      lembretes: window.PERICIA_DATA.LEMBRETES,
      alertaQuesitos: window.PERICIA_DATA.ALERTA_QUESITOS
    };
  }

  /* --------------------- PACOTE ESPECÍFICO CHATGPT ------------------- */

  function pacoteChatGPT() {
    const p = DB.meta.processo;
    const s = stats();
    return {
      instrucoes_para_o_sistema:
        'Este arquivo contém os dados brutos coletados em diligência de perícia judicial de engenharia. ' +
        'Utilize-o para elaborar um Laudo Pericial de Engenharia completo, em português do Brasil, ' +
        'estruturado em: 1) Identificação do processo e do perito; 2) Objeto da perícia; 3) Metodologia; ' +
        '4) Data, local e participantes da diligência; 5) Descrição do processo produtivo por setor; ' +
        '6) Relação dos bens vistoriados com análise técnica individual; 7) Bens não localizados; ' +
        '8) Insumos industriais; 9) Documentos solicitados e pendências; 10) Respostas fundamentadas aos quesitos ' +
        'da Autora e da Fazenda; 11) Índice fotográfico; 12) Conclusão. ' +
        'Restrinja-se aos limites técnico-científicos: NÃO emita juízo jurídico ou tributário. ' +
        'Onde a informação for insuficiente, declare expressamente a insuficiência e indique o documento faltante.',
      identificacao_do_processo: {
        numero_do_processo: p.numero,
        requerente: p.requerente,
        requerida: p.requerida,
        perito_judicial: p.perito,
        registro_profissional: p.crea,
        formacao: p.formacao,
        ano_de_referencia_da_controversia: p.anoReferencia
      },
      dados_da_vistoria: {
        data_prevista: p.dataVistoria,
        hora_prevista: p.horaVistoria,
        local: p.local,
        inicio_real: DB.meta.vistoriaInicio,
        termino_real: DB.meta.vistoriaFim,
        observacoes_finais_do_perito: DB.meta.observacoesFinais
      },
      resumo_quantitativo: s,
      participantes: DB.participantes.map(x => ({
        nome: x.nome, funcao: x.funcao, empresa_ou_parte: x.empresa,
        registro_profissional: x.registro, telefone: x.telefone, email: x.email,
        chegada: x.chegada, saida: x.saida, observacao: x.observacao
      })),
      setores: DB.setores.map(st => ({
        ordem: st.ordem, nome: st.nome, status: st.status,
        horario_inicio: st.inicio, horario_termino: st.fim,
        observacoes_gerais: st.observacoes,
        documentos_apresentados: st.documentos,
        quantidade_de_itens: DB.itens.filter(i => i.setorId === st.id).length,
        fotos: DB.fotos.filter(f => f.setorId === st.id && !f.itemId).map(f => f.arquivo)
      })),
      bens_vistoriados: DB.itens.map(i => ({
        codigo_do_bem: i.codigo,
        descricao: i.descricao,
        conta_contabil: i.contaContabil,
        fabricante: i.fabricante, modelo: i.modelo, tag: i.tag,
        numero_patrimonio: i.patrimonio, nota_fiscal: i.notaFiscal,
        data_aquisicao: i.aquisicao,
        setor_declarado_nos_autos: i.setorAutos,
        setor_encontrado_na_vistoria: i.setorEncontrado || setorNome(i.setorId),
        localizacao_fisica: i.localizacaoFisica,
        referencia_interna: i.referencia,
        funcao_declarada_nos_autos: i.funcaoAutos,
        funcao_constatada_pelo_perito: i.funcaoConstatada,
        etapa_do_processo_produtivo: i.etapaProcesso,
        classificacao_tecnica: i.classificacao,
        condicao_operacional: i.condicao,
        utilizacao: i.utilizacao,
        frequencia_de_uso: i.frequenciaUso,
        havia_evidencia_de_uso_em_2017: i.evid2017,
        tipos_de_evidencia_historica: i.evidenciaTipos,
        descricao_da_evidencia_historica: i.evidenciaDescricao,
        integra_diretamente_o_processo_produtivo: i.integraProcesso,
        a_ausencia_compromete: i.ausenciaCompromete,
        efeito_tecnico_da_retirada: i.impactoRetirada,
        conclusao_tecnica_preliminar: i.conclusaoPreliminar,
        conclusao_tecnica_final: i.conclusaoFinal,
        grau_de_confianca: i.confianca,
        observacoes: i.observacoes,
        vistoriado: !!i.vistoriado,
        fotos: DB.fotos.filter(f => f.itemId === i.id).map(f => ({
          arquivo: f.arquivo, categoria: f.categoria, legenda: f.legenda,
          observacao: f.observacao, principal: !!f.principal
        }))
      })),
      bens_nao_localizados: DB.itens.filter(i => i.condicao === 'Não localizado')
        .map(i => ({ codigo: i.codigo, descricao: i.descricao, setor: setorNome(i.setorId), observacoes: i.observacoes })),
      insumos_industriais: DB.insumos.map(i => ({
        nome: i.nome, principio_ativo: i.principioAtivo, concentracao: i.concentracao,
        fornecedor: i.fornecedor, lote: i.lote, nota_fiscal: i.notaFiscal,
        ponto_de_dosagem: i.pontoDosagem, dosagem: i.dosagem,
        frequencia_de_utilizacao: i.frequencia, funcao_fisico_quimica: i.funcaoFQ,
        entrada_estoque: i.entradaEstoque, saida_estoque: i.saidaEstoque,
        consumo: i.consumo, fispq_sds: i.fispq,
        evidencia_de_consumo_em_2017: i.evid2017,
        descricao_da_evidencia: i.evidenciaDescricao,
        destino_no_processo: i.destinoProcesso, observacoes: i.observacoes
      })),
      documentos_pendentes: DB.pendencias.map(p2 => ({
        tipo: p2.tipo, descricao: p2.descricao, setor: setorNome(p2.setorId),
        item: itemLabel(p2.itemId), responsavel: p2.responsavel,
        prioridade: p2.prioridade, data_solicitada: p2.dataSolicitada,
        status: p2.status, observacao: p2.observacao
      })),
      quesitos: {
        alerta: window.PERICIA_DATA.ALERTA_QUESITOS,
        autora: DB.quesitos.filter(q => q.parte === 'AUTORA').map(mapQuesito),
        fazenda: DB.quesitos.filter(q => q.parte === 'FAZENDA').map(mapQuesito)
      },
      indice_fotografico: DB.fotos.map(f => ({
        numero: f.numero, arquivo: f.arquivo, data: f.data, hora: f.hora,
        setor: setorNome(f.setorId), item: f.itemCodigo || '',
        categoria: f.categoria, legenda: f.legenda, observacao: f.observacao
      }))
    };

    function mapQuesito(q) {
      return {
        numero: q.numero, texto_do_quesito: q.texto,
        setor_relacionado: setorNome(q.setorId),
        itens_relacionados: (q.itensRel || []).map(itemLabel),
        fotos_relacionadas: (q.fotosRel || []),
        documentos_relacionados: q.documentosRel,
        resposta_preliminar_do_perito: q.respostaPreliminar,
        resposta_final_do_perito: q.respostaFinal,
        status: q.status
      };
    }
  }

  /* ------------------------------ CSVs ------------------------------ */

  function csvItens() {
    const h = ['Código', 'Descrição', 'Setor', 'Conta contábil', 'Fabricante', 'Modelo', 'TAG',
      'Patrimônio', 'Nota Fiscal', 'Aquisição', 'Setor nos autos', 'Setor encontrado',
      'Localização física', 'Referência', 'Função nos autos', 'Função constatada', 'Etapa do processo',
      'Classificação', 'Condição', 'Utilização', 'Frequência de uso', 'Evidência 2017',
      'Tipos de evidência', 'Descrição da evidência', 'Integra o processo', 'Ausência compromete',
      'Efeito da retirada', 'Conclusão preliminar', 'Conclusão final', 'Grau de confiança',
      'Observações', 'Vistoriado', 'Qtd. fotos'];
    const rows = DB.itens.map(i => [i.codigo, i.descricao, setorNome(i.setorId), i.contaContabil,
      i.fabricante, i.modelo, i.tag, i.patrimonio, i.notaFiscal, i.aquisicao, i.setorAutos,
      i.setorEncontrado, i.localizacaoFisica, i.referencia, i.funcaoAutos, i.funcaoConstatada,
      i.etapaProcesso, i.classificacao, i.condicao, i.utilizacao, i.frequenciaUso, i.evid2017,
      i.evidenciaTipos, i.evidenciaDescricao, i.integraProcesso, i.ausenciaCompromete,
      i.impactoRetirada, i.conclusaoPreliminar, i.conclusaoFinal, i.confianca, i.observacoes,
      i.vistoriado ? 'Sim' : 'Não', DB.fotos.filter(f => f.itemId === i.id).length]);
    return csv([h].concat(rows));
  }

  function csvSetores() {
    const h = ['Ordem', 'Setor', 'Status', 'Início', 'Término', 'Itens', 'Fotos', 'Observações', 'Documentos apresentados'];
    return csv([h].concat(DB.setores.map(s => [s.ordem, s.nome, s.status, s.inicio, s.fim,
      DB.itens.filter(i => i.setorId === s.id).length,
      DB.fotos.filter(f => f.setorId === s.id).length, s.observacoes, s.documentos])));
  }

  function csvQuesitos() {
    const h = ['Parte', 'Nº', 'Texto do quesito', 'Setor', 'Itens relacionados', 'Fotos relacionadas',
      'Documentos', 'Resposta preliminar', 'Resposta final', 'Status'];
    return csv([h].concat(DB.quesitos.map(q => [q.parte, q.numero, q.texto, setorNome(q.setorId),
      (q.itensRel || []).map(itemLabel), (q.fotosRel || []), q.documentosRel,
      q.respostaPreliminar, q.respostaFinal, q.status])));
  }

  function csvPendencias() {
    const h = ['Tipo', 'Descrição', 'Setor', 'Item', 'Responsável', 'Prioridade', 'Data solicitada', 'Status', 'Observação'];
    return csv([h].concat(DB.pendencias.map(p => [p.tipo, p.descricao, setorNome(p.setorId),
      itemLabel(p.itemId), p.responsavel, p.prioridade, p.dataSolicitada, p.status, p.observacao])));
  }

  function csvParticipantes() {
    const h = ['Nome', 'Função', 'Empresa / Parte', 'CREA/CRQ/OAB', 'Telefone', 'E-mail', 'Chegada', 'Saída', 'Observação'];
    return csv([h].concat(DB.participantes.map(p => [p.nome, p.funcao, p.empresa, p.registro,
      p.telefone, p.email, p.chegada, p.saida, p.observacao])));
  }

  function csvInsumos() {
    const h = ['Insumo', 'Princípio ativo', 'Concentração', 'Fornecedor', 'Lote', 'Nota Fiscal',
      'Ponto de dosagem', 'Dosagem', 'Frequência', 'Função físico-química', 'Entrada estoque',
      'Saída estoque', 'Consumo', 'FISPQ/SDS', 'Evidência 2017', 'Descrição da evidência',
      'Destino no processo', 'Observações'];
    return csv([h].concat(DB.insumos.map(i => [i.nome, i.principioAtivo, i.concentracao, i.fornecedor,
      i.lote, i.notaFiscal, i.pontoDosagem, i.dosagem, i.frequencia, i.funcaoFQ, i.entradaEstoque,
      i.saidaEstoque, i.consumo, i.fispq, i.evid2017, i.evidenciaDescricao, i.destinoProcesso, i.observacoes])));
  }

  function csvFotos() {
    const h = ['Nº', 'Arquivo', 'Data', 'Hora', 'Setor', 'Código do item', 'Categoria', 'Legenda', 'Observação', 'Foto principal'];
    return csv([h].concat(DB.fotos.map(f => [f.numero, f.arquivo, f.data, f.hora, setorNome(f.setorId),
      f.itemCodigo || '', f.categoria, f.legenda, f.observacao, f.principal ? 'Sim' : ''])));
  }

  /* --------------------------- HTML relatório ------------------------ */

  function relatorioHTML() {
    const p = DB.meta.processo, s = stats();
    const T = (t, body) => `<h2>${esc(t)}</h2>${body}`;

    const tab = (headers, rows) =>
      '<table><thead><tr>' + headers.map(h => `<th>${esc(h)}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map(c => `<td>${esc(Array.isArray(c) ? c.join(', ') : c)}</td>`).join('') + '</tr>').join('') +
      '</tbody></table>';

    let html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório preliminar de diligência - ${esc(p.numero)}</title>
<style>
 body{font-family:Georgia,'Times New Roman',serif;color:#111;max-width:1000px;margin:0 auto;padding:28px;line-height:1.5}
 h1{font-size:20px;text-align:center;margin-bottom:4px}
 h2{font-size:15px;background:#123a5e;color:#fff;padding:7px 10px;margin-top:26px}
 h3{font-size:13px;margin:16px 0 6px;border-bottom:1px solid #999;padding-bottom:3px}
 table{width:100%;border-collapse:collapse;font-size:10.5px;margin:8px 0}
 th,td{border:1px solid #999;padding:4px 5px;text-align:left;vertical-align:top}
 th{background:#e8eef4}
 .cab{text-align:center;font-size:12px;margin-bottom:18px}
 .kv{font-size:12px} .kv td{border:none;padding:2px 6px}
 .aviso{border:1px solid #b58900;background:#fff8e1;padding:8px 10px;font-size:11px;margin:10px 0}
 .obs{white-space:pre-wrap;font-size:11px;border:1px solid #ccc;padding:6px;background:#fafafa}
 @media print{h2{-webkit-print-color-adjust:exact;print-color-adjust:exact} .quebra{page-break-before:always}}
</style></head><body>
<h1>RELATÓRIO PRELIMINAR DE DILIGÊNCIA PERICIAL</h1>
<div class="cab">Documento de trabalho — subsídio para elaboração do Laudo Pericial</div>
<table class="kv">
<tr><td><b>Processo nº</b></td><td>${esc(p.numero)}</td></tr>
<tr><td><b>Requerente</b></td><td>${esc(p.requerente)}</td></tr>
<tr><td><b>Requerida</b></td><td>${esc(p.requerida)}</td></tr>
<tr><td><b>Perito Judicial</b></td><td>${esc(p.perito)} — ${esc(p.crea)}</td></tr>
<tr><td><b>Formação</b></td><td>${esc(p.formacao.join(' • '))}</td></tr>
<tr><td><b>Data da vistoria</b></td><td>${esc(p.dataVistoria)} às ${esc(p.horaVistoria)}</td></tr>
<tr><td><b>Local</b></td><td>${esc(p.local)}</td></tr>
<tr><td><b>Início / término reais</b></td><td>${esc(DB.meta.vistoriaInicio || '—')} / ${esc(DB.meta.vistoriaFim || '—')}</td></tr>
</table>`;

    html += T('1. Resumo da diligência', tab(
      ['Indicador', 'Valor'],
      [['Percentual geral concluído', s.percentual + '%'],
      ['Setores concluídos', s.setoresConcluidos + ' de ' + s.setoresTotal],
      ['Itens vistoriados', s.itensVistoriados + ' de ' + s.itensTotal],
      ['Itens não localizados', s.itensNaoLocalizados],
      ['Fotografias registradas', s.fotos],
      ['Insumos analisados', s.insumosVistoriados + ' de ' + s.insumosTotal],
      ['Pendências documentais em aberto', s.pendenciasAbertas],
      ['Quesitos respondidos', s.quesitosRespondidos + ' de ' + s.quesitosTotal]]));

    html += T('2. Participantes da diligência', DB.participantes.length
      ? tab(['Nome', 'Função', 'Empresa / Parte', 'Registro', 'Chegada', 'Saída', 'Observação'],
        DB.participantes.map(x => [x.nome, x.funcao, x.empresa, x.registro, x.chegada, x.saida, x.observacao]))
      : '<p><i>Nenhum participante registrado.</i></p>');

    html += T('3. Resumo por setor',
      tab(['#', 'Setor', 'Status', 'Início', 'Término', 'Itens', 'Fotos'],
        DB.setores.map(st => [st.ordem, st.nome, st.status, st.inicio, st.fim,
          DB.itens.filter(i => i.setorId === st.id).length,
          DB.fotos.filter(f => f.setorId === st.id).length])));

    DB.setores.forEach(st => {
      if (!st.observacoes && !st.documentos) return;
      html += `<h3>Setor ${st.ordem} — ${esc(st.nome)}</h3>`;
      if (st.observacoes) html += `<div class="obs"><b>Observações:</b>\n${esc(st.observacoes)}</div>`;
      if (st.documentos) html += `<div class="obs"><b>Documentos apresentados:</b>\n${esc(st.documentos)}</div>`;
    });

    html += '<div class="quebra"></div>';
    html += T('4. Equipamentos e bens vistoriados',
      tab(['Cód.', 'Descrição', 'Setor', 'TAG/Patrim.', 'Condição', 'Utilização', 'Evid. 2017',
        'Integra o processo', 'Grau de confiança', 'Fotos'],
        DB.itens.filter(i => i.vistoriado).map(i => [i.codigo, i.descricao, setorNome(i.setorId),
          (i.tag || i.patrimonio), i.condicao, i.utilizacao, i.evid2017, i.integraProcesso, i.confianca,
          DB.fotos.filter(f => f.itemId === i.id).length])));

    const comConclusao = DB.itens.filter(i => i.conclusaoPreliminar || i.conclusaoFinal);
    if (comConclusao.length) {
      html += '<h3>4.1 Conclusões técnicas preliminares por bem</h3>';
      comConclusao.forEach(i => {
        html += `<div class="obs"><b>Cód. ${esc(i.codigo)} — ${esc(i.descricao)}</b> (${esc(setorNome(i.setorId))})\n` +
          (i.funcaoConstatada ? `Função constatada: ${esc(i.funcaoConstatada)}\n` : '') +
          (i.impactoRetirada ? `Efeito técnico da retirada: ${esc(i.impactoRetirada)}\n` : '') +
          (i.conclusaoPreliminar ? `Conclusão preliminar: ${esc(i.conclusaoPreliminar)}\n` : '') +
          (i.conclusaoFinal ? `Conclusão final: ${esc(i.conclusaoFinal)}\n` : '') +
          (i.confianca ? `Grau de confiança: ${esc(i.confianca)}` : '') + '</div>';
      });
    }

    const naoLoc = DB.itens.filter(i => i.condicao === 'Não localizado');
    html += T('5. Itens não localizados', naoLoc.length
      ? tab(['Cód.', 'Descrição', 'Setor declarado', 'Observações'],
        naoLoc.map(i => [i.codigo, i.descricao, i.setorAutos || setorNome(i.setorId), i.observacoes]))
      : '<p><i>Nenhum item registrado como não localizado.</i></p>');

    html += T('6. Insumos industriais e produtos químicos',
      tab(['Insumo', 'Princípio ativo', 'Função físico-química', 'Ponto de dosagem', 'Dosagem',
        'Frequência', 'Evid. 2017', 'FISPQ'],
        DB.insumos.map(i => [i.nome, i.principioAtivo, i.funcaoFQ, i.pontoDosagem, i.dosagem,
          i.frequencia, i.evid2017, i.fispq])));

    html += T('7. Pendências documentais', DB.pendencias.length
      ? tab(['Tipo', 'Descrição', 'Setor', 'Item', 'Responsável', 'Prioridade', 'Solicitada em', 'Status'],
        DB.pendencias.map(p2 => [p2.tipo, p2.descricao, setorNome(p2.setorId), itemLabel(p2.itemId),
          p2.responsavel, p2.prioridade, p2.dataSolicitada, p2.status]))
      : '<p><i>Nenhuma pendência registrada.</i></p>');

    html += '<div class="quebra"></div>';
    html += T('8. Respostas preliminares aos quesitos',
      `<div class="aviso">${esc(window.PERICIA_DATA.ALERTA_QUESITOS)}</div>`);
    ['AUTORA', 'FAZENDA'].forEach(parte => {
      html += `<h3>Quesitos da ${parte === 'AUTORA' ? 'Autora' : 'Fazenda Pública do Estado de São Paulo'}</h3>`;
      DB.quesitos.filter(q => q.parte === parte).forEach(q => {
        html += `<div class="obs"><b>Quesito nº ${q.numero}</b> — <i>${esc(q.status)}</i>\n` +
          (q.texto ? `Texto: ${esc(q.texto)}\n` : 'Texto: (a inserir)\n') +
          (q.respostaPreliminar ? `Resposta preliminar: ${esc(q.respostaPreliminar)}\n` : '') +
          (q.respostaFinal ? `Resposta final: ${esc(q.respostaFinal)}\n` : '') +
          ((q.itensRel || []).length ? `Itens relacionados: ${esc((q.itensRel || []).map(itemLabel).join('; '))}` : '') +
          '</div>';
      });
    });

    html += '<div class="quebra"></div>';
    html += T('9. Índice fotográfico',
      tab(['Nº', 'Arquivo', 'Data', 'Hora', 'Setor', 'Item', 'Categoria', 'Legenda'],
        DB.fotos.map(f => [f.numero, f.arquivo, f.data, f.hora, setorNome(f.setorId),
          f.itemCodigo || '', f.categoria, f.legenda])));

    html += T('10. Observações finais do perito',
      `<div class="obs">${esc(DB.meta.observacoesFinais || '(sem observações finais registradas)')}</div>`);

    html += `<p style="margin-top:40px;text-align:center;font-size:11px">
      ${esc(p.perito)}<br>${esc(p.crea)}<br>Perito Judicial<br><br>
      Documento gerado em ${new Date().toLocaleString('pt-BR')}</p></body></html>`;
    return html;
  }

  /* --------------------------- PACOTE ZIP ---------------------------- */

  async function exportarPacote(comFotos, onProgress) {
    const base = nomeBase();
    const arquivos = [
      { name: 'dados/pericia_completo.json', data: JSON.stringify(pacoteJSON(), null, 2) },
      { name: 'dados/pacote_chatgpt.json', data: JSON.stringify(pacoteChatGPT(), null, 2) },
      { name: 'csv/itens.csv', data: csvItens() },
      { name: 'csv/setores.csv', data: csvSetores() },
      { name: 'csv/quesitos.csv', data: csvQuesitos() },
      { name: 'csv/pendencias.csv', data: csvPendencias() },
      { name: 'csv/participantes.csv', data: csvParticipantes() },
      { name: 'csv/insumos.csv', data: csvInsumos() },
      { name: 'csv/indice_fotografico.csv', data: csvFotos() },
      { name: 'relatorio_preliminar.html', data: relatorioHTML() },
      { name: 'LEIA-ME.txt', data: leiaMe() }
    ];

    if (comFotos) {
      for (let i = 0; i < DB.fotos.length; i++) {
        const f = DB.fotos[i];
        const b = await idbGet('blobs', f.id);
        if (b && b.blob) arquivos.push({ name: 'fotos/' + f.arquivo, data: b.blob });
        if (onProgress) onProgress(i + 1, DB.fotos.length);
      }
    }

    const zip = await criarZip(arquivos);
    await baixar(zip, base + '.zip');
    return zip;
  }

  function leiaMe() {
    const p = DB.meta.processo;
    return [
      'PACOTE DE DADOS DA DILIGÊNCIA PERICIAL',
      '======================================',
      '',
      'Processo nº: ' + p.numero,
      'Requerente: ' + p.requerente,
      'Requerida: ' + p.requerida,
      'Perito: ' + p.perito + ' (' + p.crea + ')',
      'Local: ' + p.local,
      'Gerado em: ' + new Date().toLocaleString('pt-BR'),
      '',
      'CONTEÚDO',
      '--------',
      'dados/pericia_completo.json .... base de dados integral da vistoria',
      'dados/pacote_chatgpt.json ...... arquivo estruturado para geração do Laudo por IA',
      'csv/ ........................... planilhas (itens, setores, quesitos, pendências,',
      '                                 participantes, insumos, índice fotográfico)',
      'relatorio_preliminar.html ...... relatório imprimível (abrir no navegador e Ctrl+P)',
      'fotos/ ......................... fotografias nomeadas conforme o índice fotográfico',
      '',
      'COMO USAR COM O ChatGPT',
      '-----------------------',
      '1. Envie o arquivo dados/pacote_chatgpt.json na conversa.',
      '2. Peça: "Elabore o Laudo Pericial de Engenharia com base neste arquivo,',
      '   seguindo as instruções contidas no campo instrucoes_para_o_sistema."',
      '3. Envie as fotos separadamente quando for montar o anexo fotográfico.',
      '',
      'ATENÇÃO: o perito deve responder dentro dos limites técnico-científicos e não',
      'substituir o Juízo na interpretação tributária ou jurídica.'
    ].join('\n');
  }

  /* ---------------------- BACKUP / RESTAURAÇÃO ----------------------- */

  async function backupCompleto(onProgress) {
    const dump = {
      _formato: 'PERICIA_BACKUP_v1',
      _geradoEm: nowISO(),
      meta: DB.meta,
      setores: DB.setores, itens: DB.itens, fotos: DB.fotos,
      insumos: DB.insumos, quesitos: DB.quesitos,
      pendencias: DB.pendencias, participantes: DB.participantes
    };
    const arquivos = [{ name: 'backup.json', data: JSON.stringify(dump) }];
    for (let i = 0; i < DB.fotos.length; i++) {
      const f = DB.fotos[i];
      const b = await idbGet('blobs', f.id);
      if (b && b.blob) arquivos.push({ name: 'blobs/' + f.id + '.bin', data: b.blob });
      if (onProgress) onProgress(i + 1, DB.fotos.length);
    }
    const zip = await criarZip(arquivos);
    const nome = 'BACKUP_' + nomeBase() + '_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.zip';
    await baixar(zip, nome);
    DB.meta.ultimoBackup = nowISO();
    await idbPut('meta', DB.meta);
    return nome;
  }

  async function restaurarBackup(file) {
    window.PERICIA_DB.bloquearEscritas();
    let dump = null, blobs = {};
    if (/\.json$/i.test(file.name)) {
      dump = JSON.parse(await file.text());
    } else {
      const entradas = await lerZip(file);
      for (const e of entradas) {
        if (e.name === 'backup.json') dump = JSON.parse(new TextDecoder().decode(e.data));
        else if (e.name.startsWith('blobs/')) {
          const id = e.name.slice(6).replace(/\.bin$/, '');
          blobs[id] = new Blob([e.data], { type: 'image/jpeg' });
        }
      }
    }
    if (!dump || dump._formato !== 'PERICIA_BACKUP_v1') {
      window.PERICIA_DB.liberarEscritas();
      throw new Error('Arquivo de backup inválido.');
    }

    for (const s of ['meta', 'setores', 'itens', 'fotos', 'blobs', 'insumos', 'quesitos', 'pendencias', 'participantes']) {
      await idbClear(s);
    }
    await idbPut('meta', dump.meta);
    for (const k of ['setores', 'itens', 'fotos', 'insumos', 'quesitos', 'pendencias', 'participantes']) {
      await window.PERICIA_DB.idbPutMany(k, dump[k] || []);
    }
    for (const id in blobs) await idbPut('blobs', { id, blob: blobs[id] });
    return true;
  }

  window.PERICIA_EXPORT = {
    baixar, stats, pacoteJSON, pacoteChatGPT, relatorioHTML, exportarPacote,
    backupCompleto, restaurarBackup, nomeBase,
    csvItens, csvSetores, csvQuesitos, csvPendencias, csvParticipantes, csvInsumos, csvFotos
  };
})();
