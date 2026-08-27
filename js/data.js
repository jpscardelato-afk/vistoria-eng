/* =====================================================================
   VISTORIA DE ENGENHARIA
   data.js  ::  listas de opções (sem dados de vistoria)
   ===================================================================== */

const PROCESSO = {
  numero: '',
  requerente: '',
  requerida: '',
  perito: '',
  crea: '',
  formacao: [],
  dataVistoria: '',
  horaVistoria: '',
  local: '',
  anoReferencia: ''
};

/* ------------------------- LISTAS DE OPÇÕES ------------------------- */

const OPT = {
  setorStatus: ['Não iniciado', 'Em andamento', 'Concluído', 'Pendente'],

  classificacao: [
    'Equipamento de processo', 'Equipamento auxiliar', 'Equipamento de manutenção',
    'Peça de reposição', 'Ferramenta', 'Veículo', 'Logística',
    'Laboratório', 'Segurança', 'Insumo', 'Outro'
  ],

  condicao: [
    'Em operação', 'Reserva', 'Em manutenção', 'Desativado',
    'Substituído', 'Baixado', 'Sucateado', 'Não localizado'
  ],

  utilizacao: ['Contínua', 'Intermitente', 'Sazonal', 'Eventual'],

  evid2017: ['Sim', 'Não', 'Indeterminado', 'Depende de documento'],

  evidenciaTipos: [
    'Nota Fiscal', 'CIAP', 'Ficha patrimonial', 'Ordem de manutenção',
    'Foto histórica', 'Relatório técnico', 'Registro de produção',
    'Contrato / laudo anterior', 'Outro'
  ],

  integraProcesso: ['Sim', 'Não', 'Parcialmente', 'Indeterminado'],

  ausenciaCompromete: [
    'Continuidade operacional', 'Eficiência', 'Segurança',
    'Qualidade', 'Controle do processo', 'Nenhum dos anteriores'
  ],

  confianca: ['Alto', 'Médio', 'Baixo'],

  etapaProcesso: [
    'Recepção / preparo / moagem', 'Tratamento de caldo', 'Evaporação',
    'Fabricação de açúcar', 'Destilaria / etanol', 'Levedura', 'Vinhaça',
    'Geração de vapor e energia', 'Utilidades / água', 'Manutenção',
    'Laboratório / controle de processo', 'Agrícola / frota',
    'Apoio / áreas de vivência', 'Não aplicável'
  ],

  fotoCategorias: [
    'Foto panorâmica', 'Equipamento', 'Placa de identificação', 'TAG',
    'Patrimônio', 'Entrada de processo', 'Saída de processo',
    'Painel elétrico', 'Instrumentação', 'Conexões',
    'Contexto do processo', 'Documento apresentado', 'Outra'
  ],

  quesitoStatus: [
    'Não analisado', 'Parcialmente respondido', 'Respondido',
    'Depende de documento', 'Matéria jurídica', 'Depende de especialista'
  ],

  pendTipos: [
    'CIAP / EFD', 'Ficha patrimonial', 'Nota Fiscal', 'Documento de baixa',
    'Documento de substituição', 'Ordem de manutenção', 'Fluxograma de processo',
    'P&ID', 'Layout / planta', 'Diagrama elétrico / unifilar', 'Lista de TAG',
    'Relatório de consumo', 'Movimentação de almoxarifado', 'FISPQ / SDS',
    'Procedimento operacional', 'Registros laboratoriais', 'Controle de frota',
    'Documentação de biomassa', 'Documentação de área de vivência', 'Outros'
  ],

  prioridade: ['Alta', 'Média', 'Baixa'],

  pendStatus: ['Aberta', 'Solicitada em diligência', 'Atendida parcialmente', 'Atendida', 'Não atendida'],

  utilizacaoFreq: ['Diária', 'Semanal', 'Mensal', 'Safra', 'Entressafra', 'Eventual', 'Sem uso']
};

/* --------------------------- LEMBRETES ------------------------------ */

const CADEIA_RASTREABILIDADE = [
  'NF / CIAP',
  'Código patrimonial',
  'Localização e setor',
  'Função técnica',
  'Evidência histórica de 2017',
  'Situação atual',
  'Fotografias',
  'Impacto no processo',
  'Conclusão técnica'
];

const LEMBRETES = [
  'Não concluir apenas pela situação atual do bem.',
  'Verificar sempre a documentação histórica (NF, CIAP, ficha patrimonial).',
  'Fotografar a placa de identificação E o contexto de instalação.',
  'Não fotografar somente o equipamento isolado — registrar entrada/saída de processo.',
  'Separar rigorosamente conclusão técnica de conclusão jurídica.',
  'Registrar formalmente a ausência de documentos solicitados.',
  'Registrar quando a conclusão depender de especialista de outra área.'
];

const ALERTA_QUESITOS =
  'O Perito deve responder dentro dos limites técnico-científicos e não substituir ' +
  'o Juízo na interpretação tributária ou jurídica.';

/* ---------------------------------------------------------------------
   Este aplicativo é distribuído sem dados de vistoria.
   Os setores, bens, insumos e quesitos são carregados no próprio
   dispositivo, pela tela inicial ("Carregar arquivo da vistoria") ou
   pela tela Backup.
   --------------------------------------------------------------------- */

const SETORES_SEED = [];
const ITENS_SEED = [];
const INSUMOS_SEED = [];
const QUESITOS_SEED = [];

window.PERICIA_DATA = {
  PROCESSO, OPT, SETORES_SEED, ITENS_SEED, INSUMOS_SEED, QUESITOS_SEED,
  CADEIA_RASTREABILIDADE, LEMBRETES, ALERTA_QUESITOS
};
