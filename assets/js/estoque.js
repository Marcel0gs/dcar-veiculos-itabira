// ============================================================
// Página "Nossos veículos": filtros e ordenação
//
// Tudo acontece no navegador, sobre a lista já carregada. Estoque de
// loja de bairro é dezenas de linhas: filtrar local responde na hora
// e não gasta requisição a cada mexida no seletor.
//
// Os filtros também leem a query string (?marca=Fiat&preco=70000).
// Isso é o que permite mandar o anúncio do Google Ads direto pra
// lista já filtrada, em vez de jogar todo mundo na home.
// ============================================================

(function () {
  'use strict';

  const { cardVeiculo, aplicarLoja, ligarMenu, pintarIcones, mostrarAvisoDemo } = window.DCar;

  let ESTOQUE = [];

  const campos = {
    busca:     () => document.getElementById('f-busca'),
    marca:     () => document.getElementById('f-marca'),
    categoria: () => document.getElementById('f-categoria'),
    cambio:    () => document.getElementById('f-cambio'),
    preco:     () => document.getElementById('f-preco'),
    ordem:     () => document.getElementById('f-ordem'),
  };

  async function iniciar() {
    pintarIcones();
    ligarMenu();

    await Store.init();
    mostrarAvisoDemo();

    const loja = await Store.loja();
    aplicarLoja(loja);
    pintarIcones();

    ESTOQUE = await Store.listar();
    montarMarcas(ESTOQUE);
    lerUrl();
    ligarEventos();
    aplicar();
  }

  // As marcas do seletor saem do estoque real. Lista fixa de marca
  // ficaria com opção que não tem carro, e o cliente clica, não acha
  // nada e vai embora achando que a loja está vazia.
  function montarMarcas(lista) {
    const sel = campos.marca();
    const marcas = [...new Set(lista.map((v) => v.marca).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    marcas.forEach((m) => {
      const o = document.createElement('option');
      o.value = m; o.textContent = m;
      sel.appendChild(o);
    });
  }

  function lerUrl() {
    const p = new URLSearchParams(location.search);
    ['busca', 'marca', 'categoria', 'cambio', 'preco', 'ordem'].forEach((k) => {
      const valor = p.get(k);
      if (!valor) return;
      const el = campos[k]();
      // Só aceita valor que existe no seletor. Query string é entrada de
      // fora: "?categoria=<script>" não pode virar opção selecionada.
      if (el.tagName === 'SELECT') {
        if ([...el.options].some((o) => o.value === valor)) el.value = valor;
      } else {
        el.value = valor;
      }
    });
  }

  function ligarEventos() {
    Object.values(campos).forEach((get) => {
      const el = get();
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', aplicar);
    });
    document.getElementById('f-limpar').addEventListener('click', () => {
      Object.values(campos).forEach((get) => { get().value = ''; });
      campos.ordem().value = 'relevancia';
      aplicar();
    });
  }

  function aplicar() {
    const busca = campos.busca().value.trim().toLowerCase();
    const marca = campos.marca().value;
    const categoria = campos.categoria().value;
    const cambio = campos.cambio().value;
    const tetoPreco = Number(campos.preco().value) || Infinity;
    const ordem = campos.ordem().value;

    let lista = ESTOQUE.filter((v) => {
      if (marca && v.marca !== marca) return false;
      if (categoria && v.categoria !== categoria) return false;
      if (cambio && v.cambio !== cambio) return false;
      // Preço zero quer dizer "sob consulta". Cortar por teto de preço
      // esconderia o veículo de quem filtrou, sem ele saber que existe.
      if (Number(v.preco) > 0 && Number(v.preco) > tetoPreco) return false;
      if (busca) {
        const alvo = `${v.marca} ${v.modelo} ${v.versao || ''} ${v.cor || ''}`.toLowerCase();
        if (!alvo.includes(busca)) return false;
      }
      return true;
    });

    lista = ordenar(lista, ordem);
    desenhar(lista);
    guardarUrl();
  }

  // Vendido sempre por último, em qualquer ordenação. Quem ordena por
  // "menor preço" não quer abrir a lista e encontrar carro que já saiu.
  function ordenar(lista, ordem) {
    const fim = (v) => (v.status === 'vendido' ? 1 : 0);
    // Sem preço vai para o fim das ordenações por valor: "Sob consulta"
    // no topo de "menor preço" não é o que a pessoa pediu.
    const semPreco = (v) => (Number(v.preco) > 0 ? 0 : 1);
    const criterios = {
      'preco-asc':  (a, b) => semPreco(a) - semPreco(b) || a.preco - b.preco,
      'preco-desc': (a, b) => semPreco(a) - semPreco(b) || b.preco - a.preco,
      'ano-desc':   (a, b) => (b.ano_modelo || 0) - (a.ano_modelo || 0),
      'km-asc':     (a, b) => (a.km || 0) - (b.km || 0),
      'relevancia': (a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) ||
                              (a.ordem || 0) - (b.ordem || 0),
    };
    const cmp = criterios[ordem] || criterios.relevancia;
    return lista.slice().sort((a, b) => fim(a) - fim(b) || cmp(a, b));
  }

  function desenhar(lista) {
    const alvo = document.querySelector('[data-lista]');
    const contagem = document.querySelector('[data-contagem]');

    // Conta o que está na tela, não o que está "disponível": a lista
    // mostra reservado e vendido com selo, e número que não bate com o
    // que a pessoa vê na frente derruba a confiança na página inteira.
    contagem.innerHTML = lista.length
      ? `<b>${lista.length}</b> ${lista.length === 1 ? 'veículo' : 'veículos'}`
      : 'Nenhum veículo com esses filtros';

    if (!lista.length) {
      alvo.innerHTML =
        '<div class="vazio" style="grid-column:1/-1">' +
        '<h3>Nenhum carro com esses filtros</h3>' +
        '<p>Tente ampliar a faixa de preço ou limpar os filtros. ' +
        'Se você procura um modelo específico, chame no WhatsApp que a gente busca para você.</p>' +
        '</div>';
      pintarIcones(alvo);
      return;
    }
    alvo.innerHTML = lista.map((v) => cardVeiculo(v)).join('');
  }

  // Mantém o filtro na URL para o cliente poder mandar o link do que
  // achou pra alguém, e pro Ads apontar direto pra uma faixa.
  function guardarUrl() {
    const p = new URLSearchParams();
    Object.entries(campos).forEach(([nome, get]) => {
      const v = get().value;
      if (v && v !== 'relevancia') p.set(nome, v);
    });
    const qs = p.toString();
    // replaceState estoura em contexto sem origem (arquivo aberto direto
    // pelo Explorer, preview em sandbox). Isso não pode derrubar a
    // filtragem, que é a função principal da página.
    try {
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    } catch (e) { /* segue sem sincronizar a URL */ }
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
