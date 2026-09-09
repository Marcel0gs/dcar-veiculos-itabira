// ============================================================
// Painel do vendedor: D-Car Veículos
//
// Regra que guiou as decisões daqui: quem usa isso está EM PÉ, NO
// PÁTIO, COM O CELULAR NA MÃO e o carro na frente. Se cadastrar um
// veículo der trabalho, a loja para de cadastrar, o site envelhece e
// vira prova contra a loja. Então: campo obrigatório é o mínimo, foto
// entra pela câmera, e as alterações só valem quando aperta Salvar.
// ============================================================

(function () {
  'use strict';

  const D = window.DCar;
  const { Fmt, esc, ico, pintarIcones } = D;

  const OPCIONAIS_COMUNS = [
    'Ar-condicionado', 'Ar-condicionado digital', 'Direção hidráulica', 'Direção elétrica',
    'Vidros elétricos', 'Travas elétricas', 'Airbag', 'Freios ABS',
    'Central multimídia', 'Câmera de ré', 'Sensor de estacionamento', 'Piloto automático',
    'Bancos em couro', 'Rodas de liga leve', 'Faróis de LED', 'Teto solar',
    'Computador de bordo', 'Volante multifuncional', 'Retrovisores elétricos', 'Start/Stop',
  ];

  let ESTOQUE = [];
  let editando = null;          // veículo em edição, ou null para novo
  let fotosForm = [];           // [{id?, url, caminho?, arquivo?, novo?}]
  let fotosRemovidas = [];      // fotos existentes marcadas para apagar no Salvar
  let opcionaisForm = [];
  let modoPagina = false;       // cadastro ocupa a tela inteira; edição é gaveta
  let empurrouHistorico = false;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  // ---------- entrada ----------

  async function iniciar() {
    pintarIcones();
    await Store.init();

    if (Store.usuario) { abrirPainel(); }
    else { prepararLogin(); }
  }

  function prepararLogin() {
    if (Store.ehDemo()) {
      recado($('[data-erro-login]'), 'aviso',
        'Modo demonstração. Qualquer e-mail e senha entram, e nada é salvo de verdade.');
    }

    $('[data-form-login]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('[data-btn-entrar]');
      btn.disabled = true; btn.textContent = 'Entrando...';

      const r = await Store.entrar($('#email').value.trim(), $('#senha').value);

      btn.disabled = false; btn.textContent = 'Entrar';
      if (!r.ok) { recado($('[data-erro-login]'), 'erro', r.erro); return; }
      abrirPainel();
    });
  }

  async function abrirPainel() {
    $('[data-login]').hidden = true;
    $('[data-app]').hidden = false;

    $('[data-quem]').textContent = Store.usuario?.email || '';

    if (Store.ehDemo()) {
      recado($('[data-aviso-demo]'), 'aviso',
        'Modo demonstração: o estoque abaixo é de exemplo e nada é gravado. ' +
        'Recarregar a página volta tudo ao início.');
    }

    ligarPainel();
    montarChips();
    await carregar();
    await carregarLoja();
    pintarIcones();
  }

  function ligarPainel() {
    $('[data-sair]').addEventListener('click', async () => {
      await Store.sair();
      location.reload();
    });

    $$('.aba').forEach((b) => b.addEventListener('click', () => {
      $$('.aba').forEach((x) => x.classList.toggle('ativa', x === b));
      $$('[data-painel]').forEach((p) => { p.hidden = p.dataset.painel !== b.dataset.aba; });
    }));

    $('[data-novo]').addEventListener('click', () => abrirForm(null));
    $('[data-busca-admin]').addEventListener('input', desenharLinhas);
    // Envolvido numa arrow de propósito: passar `fecharForm` direto
    // entregaria o objeto Event como primeiro argumento, e ele seria lido
    // como "veio do histórico".
    $$('[data-fechar]').forEach((b) => b.addEventListener('click', () => fecharForm()));
    $('[data-salvar]').addEventListener('click', salvar);
    $('[data-form-loja]').addEventListener('submit', salvarLoja);

    // Clicar fora da gaveta fecha, mas só se o clique começou fora.
    // Sem isso, arrastar texto de dentro pra fora fecha o formulário
    // no meio da digitação e perde tudo.
    const gaveta = $('[data-gaveta]');
    let comecouFora = false;
    gaveta.addEventListener('mousedown', (e) => { comecouFora = e.target === gaveta; });
    gaveta.addEventListener('click', (e) => {
      if (!modoPagina && e.target === gaveta && comecouFora) fecharForm();
    });

    // Esc só fecha a gaveta. No modo página seria um formulário longo
    // inteiro perdido por um toque em tecla errada.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !gaveta.hidden && !modoPagina) fecharForm();
    });

    // O botão voltar do navegador (e o gesto de voltar no celular) fecha
    // o cadastro em vez de sair do painel. É o que faz o modo página se
    // comportar como página de verdade.
    window.addEventListener('popstate', () => {
      if (!$('[data-gaveta]').hidden) { empurrouHistorico = false; fecharForm(true); }
    });

    ligarFotos();
  }

  // ---------- lista ----------

  async function carregar() {
    ESTOQUE = await Store.listar();
    desenharLinhas();
    desenharKpis();
  }

  function desenharKpis() {
    const conta = (s) => ESTOQUE.filter((v) => v.status === s).length;
    $('[data-kpi="disponivel"]').textContent = conta('disponivel');
    $('[data-kpi="reservado"]').textContent  = conta('reservado');
    $('[data-kpi="vendido"]').textContent    = conta('vendido');

    // Em modo demo não existe contagem real. Mostrar "0" ali seria
    // mentira com cara de dado; "sem dados" diz o que está acontecendo.
    Store.contarLeads(30).then((n) => {
      const alvo = $('[data-kpi="leads"]');
      if (n === null || n === undefined) {
        alvo.textContent = 'sem dados';
        alvo.style.fontSize = '16px';
      } else {
        alvo.textContent = String(n);
      }
    });
  }

  function desenharLinhas() {
    const termo = ($('[data-busca-admin]').value || '').trim().toLowerCase();
    const lista = ESTOQUE.filter((v) =>
      !termo || `${v.marca} ${v.modelo} ${v.versao || ''}`.toLowerCase().includes(termo));

    const alvo = $('[data-linhas]');

    if (!lista.length) {
      alvo.innerHTML = `<div class="vazio">
        <h3>${termo ? 'Nada encontrado' : 'Nenhum veículo cadastrado'}</h3>
        <p>${termo ? 'Tente outro termo.' : 'Clique em "Novo veículo" para começar o estoque.'}</p>
      </div>`;
      return;
    }

    alvo.innerHTML = lista.map((v) => {
      const capa = D.fotoCapa(v);
      const qtd = (v.fotos || []).length;
      return `
      <div class="linha">
        <div class="linha-foto">
          ${capa ? `<img src="${esc(capa)}" alt="" loading="lazy">` : ico('camera')}
        </div>
        <div class="linha-info">
          <h3>${esc(Fmt.nome(v))}</h3>
          <p>${esc(v.versao || Fmt.categoria(v.categoria))} · ${esc(Fmt.ano(v))} · ${esc(Fmt.km(v.km))}</p>
          <div class="meta">
            <span class="pill pill-preco">${Fmt.preco(v.preco)}</span>
            <span class="pill pill-${esc(v.status)}">${esc(Fmt.status(v.status))}</span>
            ${v.destaque ? '<span class="pill pill-destaque">Na home</span>' : ''}
            ${qtd === 0 ? '<span class="pill pill-alerta">Sem foto</span>' : ''}
            ${Number(v.preco) > 0 ? '' : '<span class="pill pill-alerta">Sem preço</span>'}
          </div>
        </div>
        <div class="linha-acoes">
          <button class="ib" data-editar="${esc(v.id)}" aria-label="Editar" title="Editar">${ico('lapis')}</button>
          <button class="ib perigo" data-excluir="${esc(v.id)}" aria-label="Excluir" title="Excluir">${ico('lixeira')}</button>
        </div>
      </div>`;
    }).join('');

    $$('[data-editar]', alvo).forEach((b) =>
      b.addEventListener('click', () => abrirForm(ESTOQUE.find((v) => v.id === b.dataset.editar))));
    $$('[data-excluir]', alvo).forEach((b) =>
      b.addEventListener('click', () => excluir(b.dataset.excluir)));
  }

  async function excluir(id) {
    const v = ESTOQUE.find((x) => x.id === id);
    if (!v) return;
    // Apagar carro é destrutivo e leva as fotos junto, então pede o
    // nome do carro na confirmação em vez de um "tem certeza?" genérico.
    if (!confirm(`Excluir ${Fmt.nome(v)} ${Fmt.ano(v)}?\n\nAs fotos também são apagadas. Não dá para desfazer.`)) return;

    const r = await Store.remover(id);
    if (!r.ok) { torrada('Não deu para excluir: ' + r.erro, true); return; }
    torrada('Veículo excluído.');
    await carregar();
  }

  // ---------- formulário ----------

  function abrirForm(veiculo) {
    editando = veiculo || null;
    fotosRemovidas = [];
    fotosForm = (veiculo?.fotos || []).map((f) => Object.assign({}, f));
    opcionaisForm = (veiculo?.opcionais || []).slice();

    // Cadastrar abre em página inteira; editar continua na gaveta.
    // Cadastro tem 13 campos, 20 etiquetas de opcional e upload de foto,
    // e numa faixa estreita isso vira rolagem sem fim. Editar quase
    // sempre é mexer em um campo só, e a gaveta deixa a lista à vista.
    modoPagina = !veiculo;
    const gaveta = $('[data-gaveta]');
    gaveta.classList.toggle('pagina', modoPagina);

    const btnVoltar = $('.gaveta-topo [data-fechar]');
    btnVoltar.innerHTML = ico(modoPagina ? 'esquerda' : 'fechar');
    btnVoltar.setAttribute('aria-label', modoPagina ? 'Voltar para o estoque' : 'Fechar');

    $('[data-titulo-form]').textContent = veiculo ? 'Editar veículo' : 'Novo veículo';
    $('[data-recado-form]').innerHTML = '';

    const f = $('[data-form-veiculo]');
    f.reset();

    if (veiculo) {
      f.marca.value = veiculo.marca || '';
      f.modelo.value = veiculo.modelo || '';
      f.versao.value = veiculo.versao || '';
      f.ano_fabricacao.value = veiculo.ano_fabricacao || '';
      f.ano_modelo.value = veiculo.ano_modelo || '';
      f.km.value = veiculo.km ?? '';
      // Preço 0 aparece como campo vazio, porque no site ele significa
      // "sob consulta". Mostrar "0" faria o vendedor achar que alguém
      // digitou zero por engano.
      f.preco.value = Number(veiculo.preco) > 0 ? veiculo.preco : '';
      f.categoria.value = veiculo.categoria || 'sedan';
      f.cor.value = veiculo.cor || '';
      f.cambio.value = veiculo.cambio || 'manual';
      f.combustivel.value = veiculo.combustivel || 'flex';
      f.portas.value = veiculo.portas ? String(veiculo.portas) : '';
      f.status.value = veiculo.status || 'disponivel';
      f.descricao.value = veiculo.descricao || '';
      f.destaque.checked = !!veiculo.destaque;
    } else {
      // Ano do modelo acompanha o de fabricação enquanto ninguém mexer:
      // na maioria dos carros são iguais, e digitar dois campos iguais
      // toda vez é atrito à toa.
      const ano = new Date().getFullYear();
      f.ano_fabricacao.value = ano - 3;
      f.ano_modelo.value = ano - 3;
    }

    montarChips();
    desenharFotos();

    gaveta.hidden = false;
    document.body.style.overflow = 'hidden';
    // Reabrir precisa começar do topo: o painel guarda a rolagem do
    // formulário anterior e abriria no meio dos opcionais.
    $('.gaveta-painel').scrollTop = 0;

    if (modoPagina) {
      try {
        history.pushState({ dcarForm: true }, '', '#novo-veiculo');
        empurrouHistorico = true;
      } catch (e) { empurrouHistorico = false; }
    }

    setTimeout(() => f.marca.focus(), 60);
  }

  // `vindoDoHistorico` evita empurrar o histórico de volta quando quem
  // fechou já foi o botão voltar do navegador.
  function fecharForm(vindoDoHistorico) {
    const gaveta = $('[data-gaveta]');
    gaveta.hidden = true;
    gaveta.classList.remove('pagina');
    document.body.style.overflow = '';
    modoPagina = false;
    editando = null;
    fotosForm = []; fotosRemovidas = []; opcionaisForm = [];

    if (empurrouHistorico && !vindoDoHistorico) {
      empurrouHistorico = false;
      try { history.back(); } catch (e) { /* segue fechado mesmo assim */ }
    } else {
      empurrouHistorico = false;
    }
  }

  function montarChips() {
    const alvo = $('[data-chips]');
    if (!alvo) return;

    // Preset + o que já estava salvo no carro. Um opcional digitado à
    // mão numa edição anterior continua aparecendo como etiqueta.
    const todos = [...new Set([...OPCIONAIS_COMUNS, ...opcionaisForm])];

    alvo.innerHTML = todos.map((o) => `
      <button type="button" class="chip ${opcionaisForm.includes(o) ? 'on' : ''}" data-opc="${esc(o)}">
        ${opcionaisForm.includes(o) ? ico('check') : ''}${esc(o)}
      </button>`).join('') +
      `<button type="button" class="chip chip-novo" data-opc-novo>${ico('mais')} Outro</button>`;

    $$('[data-opc]', alvo).forEach((b) => b.addEventListener('click', () => {
      const o = b.dataset.opc;
      const i = opcionaisForm.indexOf(o);
      if (i >= 0) opcionaisForm.splice(i, 1); else opcionaisForm.push(o);
      montarChips();
    }));

    $('[data-opc-novo]', alvo).addEventListener('click', () => {
      const texto = (prompt('Qual item?') || '').trim();
      if (texto && !opcionaisForm.includes(texto)) { opcionaisForm.push(texto); montarChips(); }
    });
  }

  // ---------- fotos ----------

  function ligarFotos() {
    const solta = $('[data-solta]');
    const input = $('[data-arquivos]');

    solta.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { receberArquivos([...input.files]); input.value = ''; });

    ['dragenter', 'dragover'].forEach((ev) =>
      solta.addEventListener(ev, (e) => { e.preventDefault(); solta.classList.add('sobre'); }));
    ['dragleave', 'drop'].forEach((ev) =>
      solta.addEventListener(ev, (e) => { e.preventDefault(); solta.classList.remove('sobre'); }));
    solta.addEventListener('drop', (e) => {
      receberArquivos([...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/')));
    });
  }

  // O preview já é a versão reduzida, não o arquivo original. Assim o
  // vendedor vê exatamente o que vai para o site, e o navegador não
  // segura 12 fotos de 4 MB na memória do celular.
  async function receberArquivos(arquivos) {
    if (!arquivos.length) return;
    const aviso = $('[data-aviso-fotos]');
    aviso.textContent = `Preparando ${arquivos.length} foto${arquivos.length > 1 ? 's' : ''}...`;

    for (const arquivo of arquivos) {
      try {
        const pronta = await Store.prepararFoto(arquivo);
        fotosForm.push({ url: pronta.dataUrl, arquivo: pronta.blob, novo: true });
        desenharFotos();
      } catch (e) {
        torrada('Não deu para ler uma das fotos.', true);
      }
    }
    aviso.textContent = '';
  }

  function desenharFotos() {
    const alvo = $('[data-fotos]');
    alvo.innerHTML = fotosForm.map((f, i) => `
      <div class="foto-item">
        ${i === 0 ? '<span class="capa">Capa</span>' : ''}
        <img src="${esc(f.url)}" alt="">
        <div class="ctrl">
          <button type="button" data-mover="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''}
                  aria-label="Mover para trás">${ico('esquerda')}</button>
          <button type="button" data-mover="${i}" data-dir="1" ${i === fotosForm.length - 1 ? 'disabled' : ''}
                  aria-label="Mover para frente">${ico('direita')}</button>
          <button type="button" data-tirar="${i}" aria-label="Remover foto">${ico('lixeira')}</button>
        </div>
      </div>`).join('');

    $$('[data-mover]', alvo).forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.mover), j = i + Number(b.dataset.dir);
      if (j < 0 || j >= fotosForm.length) return;
      [fotosForm[i], fotosForm[j]] = [fotosForm[j], fotosForm[i]];
      desenharFotos();
    }));

    $$('[data-tirar]', alvo).forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.tirar);
      const f = fotosForm[i];
      if (f.id) fotosRemovidas.push(f);   // existente: só some de verdade no Salvar
      fotosForm.splice(i, 1);
      desenharFotos();
    }));
  }

  // ---------- salvar ----------

  async function salvar() {
    const f = $('[data-form-veiculo]');
    if (!f.reportValidity()) return;

    const btn = $('[data-salvar]');
    btn.disabled = true;
    const rotular = (t) => { btn.textContent = t; };
    rotular('Salvando...');

    const dados = {
      id: editando?.id,
      marca: f.marca.value, modelo: f.modelo.value, versao: f.versao.value,
      categoria: f.categoria.value,
      ano_fabricacao: f.ano_fabricacao.value, ano_modelo: f.ano_modelo.value,
      km: f.km.value, preco: f.preco.value, cor: f.cor.value,
      combustivel: f.combustivel.value, cambio: f.cambio.value, portas: f.portas.value,
      status: f.status.value, descricao: f.descricao.value, destaque: f.destaque.checked,
      opcionais: opcionaisForm,
      ordem: editando?.ordem || 0,
    };

    const r = await Store.salvar(dados);
    if (!r.ok) {
      btn.disabled = false; rotular('Salvar veículo');
      recado($('[data-recado-form]'), 'erro', 'Não deu para salvar: ' + r.erro);
      return;
    }

    const id = r.id;

    // As fotos removidas saem antes das novas entrarem, para não passar
    // do limite de armazenamento durante uma troca de galeria inteira.
    for (const foto of fotosRemovidas) {
      await Store.removerFoto(id, foto);
    }

    const novas = fotosForm.filter((x) => x.novo);
    let feitas = 0;
    for (let i = 0; i < fotosForm.length; i++) {
      const item = fotosForm[i];
      if (!item.novo) continue;
      feitas++;
      rotular(`Enviando foto ${feitas} de ${novas.length}...`);
      const up = await Store.subirFoto(id, item.arquivo, i);
      if (!up.ok) {
        btn.disabled = false; rotular('Salvar veículo');
        recado($('[data-recado-form]'), 'erro',
          'O veículo foi salvo, mas uma foto falhou: ' + up.erro);
        await carregar();
        return;
      }
      item.id = up.foto.id; item.novo = false;
    }

    // Reordena depois de tudo no lugar: a ordem da tela é a verdade.
    const existentes = fotosForm.filter((x) => x.id);
    if (existentes.length) await Store.reordenarFotos(id, existentes);

    btn.disabled = false; rotular('Salvar veículo');
    fecharForm();
    torrada(editando ? 'Veículo atualizado.' : 'Veículo cadastrado.');
    await carregar();
  }

  // ---------- dados da loja ----------

  async function carregarLoja() {
    const loja = await Store.loja();
    const f = $('[data-form-loja]');
    ['nome', 'whatsapp', 'endereco', 'cidade', 'horario', 'instagram', 'sobre'].forEach((k) => {
      if (f[k]) f[k].value = loja[k] || '';
    });
  }

  async function salvarLoja(e) {
    e.preventDefault();
    const f = e.target;
    const dados = {
      nome: f.nome.value.trim(),
      whatsapp: f.whatsapp.value.replace(/\D/g, ''),
      endereco: f.endereco.value.trim() || null,
      cidade: f.cidade.value.trim() || null,
      horario: f.horario.value.trim() || null,
      instagram: f.instagram.value.trim().replace(/^@/, '') || null,
      sobre: f.sobre.value.trim() || null,
    };

    const r = await Store.salvarLoja(dados);
    if (!r.ok) { recado($('[data-recado-loja]'), 'erro', r.erro); return; }
    recado($('[data-recado-loja]'), 'ok', 'Dados salvos. O site já está mostrando os novos.');
  }

  // ---------- avisos ----------

  function recado(alvo, tipo, texto) {
    if (!alvo) return;
    const icone = tipo === 'ok' ? 'check' : tipo === 'erro' ? 'fechar' : 'escudo';
    alvo.innerHTML = `<div class="recado recado-${tipo}">${ico(icone)}<span>${esc(texto)}</span></div>`;
  }

  let torradaTimer = null;
  function torrada(texto, erro) {
    document.querySelector('.torrada')?.remove();
    const el = document.createElement('div');
    el.className = 'torrada' + (erro ? ' erro' : '');
    el.textContent = texto;
    document.body.appendChild(el);
    clearTimeout(torradaTimer);
    torradaTimer = setTimeout(() => el.remove(), 3200);
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
