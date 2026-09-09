// ============================================================
// Página do veículo
//
// Recebe o id pela query string, monta a galeria, a ficha e o botão
// de WhatsApp já com o carro escrito na mensagem. Esse texto pronto
// é o detalhe que mais muda a conversa: o vendedor recebe "quero o
// Corolla 2019" em vez de "oi".
// ============================================================

(function () {
  'use strict';

  const D = window.DCar;
  const { Fmt, esc, ico, cardVeiculo, aplicarLoja, ligarMenu, pintarIcones } = D;

  let VEICULO = null, LOJA = null, FOTOS = [], indice = 0;

  async function iniciar() {
    pintarIcones();
    ligarMenu();

    await Store.init();

    LOJA = await Store.loja();
    aplicarLoja(LOJA);
    pintarIcones();

    const id = new URLSearchParams(location.search).get('id');
    VEICULO = id ? await Store.obter(id) : null;

    if (!VEICULO) { naoEncontrado(); return; }

    FOTOS = VEICULO.fotos || [];
    desenhar();
    document.title = `${Fmt.nomeCompleto(VEICULO)} ${Fmt.ano(VEICULO)} | D-Car Veículos`;

    const estoque = await Store.listar();
    desenharRelacionados(estoque);
  }

  function naoEncontrado() {
    document.querySelector('[data-conteudo]').innerHTML = `
      <div class="container">
        <div class="vazio">
          ${ico('carro')}
          <h3>Veículo não encontrado</h3>
          <p>Esse carro pode ter sido vendido ou saído do pátio.</p>
          <a class="btn btn-escuro" href="veiculos.html" style="margin-top:16px">Ver todos os veículos</a>
        </div>
      </div>`;
  }

  function desenhar() {
    const v = VEICULO;
    const vendido = v.status === 'vendido';
    const zap = D.linkZap(LOJA, D.textoZapVeiculo(v, LOJA));

    // A linha de portas só existe se houver porta. Moto entra no estoque
    // com o campo nulo, e "4 portas" numa XRE queima a ficha inteira.
    const ficha = [
      ['Ano', Fmt.ano(v)],
      ['Quilometragem', Fmt.km(v.km)],
      ['Câmbio', Fmt.cambio(v.cambio)],
      ['Combustível', Fmt.combustivel(v.combustivel)],
      ['Categoria', Fmt.categoria(v.categoria)],
      ['Cor', v.cor || 'Não informada'],
      v.portas ? ['Portas', String(v.portas)] : null,
      ['Situação', Fmt.status(v.status)],
    ].filter(Boolean);

    document.querySelector('[data-conteudo]').innerHTML = `
      <div class="container">
        <p style="font-size:14px; color:var(--texto-2); margin:0 0 18px">
          <a href="index.html" style="color:var(--texto-2)">Início</a> /
          <a href="veiculos.html" style="color:var(--texto-2)">Nossos veículos</a> /
          <span style="color:var(--texto)">${esc(Fmt.nome(v))}</span>
        </p>

        <!-- Três blocos irmãos, não dois aninhados. É o que permite ao
             CSS colocar o preço logo abaixo da foto no celular, sem
             empurrar o botão de WhatsApp para depois de todo o texto. -->
        <div class="det">
          <div class="det-galeria">
            <div class="galeria" data-galeria></div>
          </div>

          <aside class="det-painel">
            <div class="painel-preco">
              <span class="marca">${esc(v.marca)}</span>
              <h1>${esc(v.modelo)}</h1>
              <p class="versao">${esc(v.versao || Fmt.categoria(v.categoria))}</p>

              <div class="valor${Fmt.temPreco(v) ? '' : ' consulta'}">${Fmt.preco(v.preco)}</div>
              <p class="obs">${vendido
                ? 'Este veículo já foi vendido.'
                : Fmt.temPreco(v)
                  ? 'Aceitamos troca e financiamos. Consulte as condições.'
                  : 'Chame no WhatsApp para o valor. Aceitamos troca e financiamos.'}</p>

              ${vendido ? `
                <a class="btn btn-escuro" href="veiculos.html">Ver carros disponíveis</a>
              ` : `
                <a class="btn btn-zap" href="${esc(zap)}" target="_blank" rel="noopener" data-zap-veiculo>
                  ${ico('zap')} Tenho interesse
                </a>
                <a class="btn btn-escuro" href="${esc(zap)}" target="_blank" rel="noopener" data-zap-veiculo>
                  ${ico('troca')} Simular troca
                </a>
              `}

              <dl class="ficha">
                ${ficha.map(([rot, val]) => `
                  <div><dt>${esc(rot)}</dt><dd>${esc(val)}</dd></div>`).join('')}
              </dl>
            </div>
          </aside>

          <div class="det-blocos">
            ${v.descricao ? `
              <div class="bloco">
                <h2>Sobre esse veículo</h2>
                <p style="margin:0; color:var(--texto-2); font-size:16px">${esc(v.descricao)}</p>
              </div>` : ''}

            ${(v.opcionais || []).length ? `
              <div class="bloco">
                <h2>Itens e opcionais</h2>
                <ul class="opcionais">
                  ${v.opcionais.map((o) => `<li>${ico('check')}${esc(o)}</li>`).join('')}
                </ul>
              </div>` : ''}
          </div>
        </div>

        <div data-relacionados></div>
      </div>`;

    desenharGaleria();

    // O clique no botão do carro registra o lead com o veículo junto,
    // que é o que permite responder depois "qual carro puxou contato".
    document.querySelectorAll('[data-zap-veiculo]').forEach((a) =>
      a.addEventListener('click', () => Store.registrarLead(VEICULO.id, 'detalhe')));
  }

  function desenharGaleria() {
    const alvo = document.querySelector('[data-galeria]');

    if (!FOTOS.length) {
      alvo.innerHTML = `
        <div class="galeria-principal">
          <div class="sem-foto">${ico('camera')}<span>Fotos em breve</span></div>
        </div>`;
      return;
    }

    const atual = FOTOS[indice];
    const alt = `${Fmt.nomeCompleto(VEICULO)} ${Fmt.ano(VEICULO)}, foto ${indice + 1}`;

    alvo.innerHTML = `
      <div class="galeria-principal">
        <img src="${esc(atual.url)}" alt="${esc(alt)}" width="1200" height="900">
        ${FOTOS.length > 1 ? `
          <button class="galeria-nav ant" aria-label="Foto anterior" ${indice === 0 ? 'disabled' : ''}>
            ${ico('esquerda')}</button>
          <button class="galeria-nav prox" aria-label="Próxima foto" ${indice === FOTOS.length - 1 ? 'disabled' : ''}>
            ${ico('direita')}</button>` : ''}
      </div>
      ${FOTOS.length > 1 ? `
        <div class="miniaturas">
          ${FOTOS.map((f, i) => `
            <button class="${i === indice ? 'ativa' : ''}" data-i="${i}" aria-label="Ver foto ${i + 1}">
              <img src="${esc(f.url)}" alt="" loading="lazy">
            </button>`).join('')}
        </div>` : ''}`;

    alvo.querySelector('.ant')?.addEventListener('click', () => irPara(indice - 1));
    alvo.querySelector('.prox')?.addEventListener('click', () => irPara(indice + 1));
    alvo.querySelectorAll('.miniaturas button').forEach((b) =>
      b.addEventListener('click', () => irPara(Number(b.dataset.i))));
  }

  function irPara(i) {
    if (i < 0 || i >= FOTOS.length) return;
    indice = i;
    desenharGaleria();
  }

  // Mesma categoria primeiro; se não houver, mesma marca. Sem isso a
  // seção vira uma lista aleatória que não ajuda quem já sabe o que quer.
  function desenharRelacionados(estoque) {
    const alvo = document.querySelector('[data-relacionados]');
    if (!alvo) return;

    const outros = estoque.filter((v) => v.id !== VEICULO.id && v.status === 'disponivel');
    const mesmaCategoria = outros.filter((v) => v.categoria === VEICULO.categoria);
    const mesmaMarca = outros.filter((v) => v.marca === VEICULO.marca);

    const lista = [...new Map(
      [...mesmaCategoria, ...mesmaMarca, ...outros].map((v) => [v.id, v])
    ).values()].slice(0, 4);

    if (!lista.length) { alvo.innerHTML = ''; return; }

    alvo.innerHTML = `
      <section style="margin-top:56px">
        <p class="rotulo rotulo-escuro">Também no pátio</p>
        <h2 class="secao-titulo" style="font-size:26px; margin-bottom:24px">Veja outras opções</h2>
        <div class="grid-veic">${lista.map(cardVeiculo).join('')}</div>
      </section>`;
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
