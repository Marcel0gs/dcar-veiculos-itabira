// ============================================================
// Home: D-Car Veículos
// Vitrine de destaques, molduras de entrega, avaliações do Google,
// leque do Instagram e os dados da loja ligados na página.
// ============================================================

(function () {
  'use strict';

  const D = window.DCar;
  const { cardVeiculo, esc, ico, aplicarLoja, ligarMenu, pintarIcones,
          mostrarAvisoDemo, movimentoReduzido, animarNaRolagem,
          ligarHeaderTransparente } = D;

  const MAX_DESTAQUES = 6;

  // As oito fotos de entrega SEM o adesivo verde "Vendido". As outras
  // seis carregam um selo de story que destoa do site.
  const MOLDURAS = [
    ['01', '06', '11'],
    ['02', '08', '12'],
    ['03', '09'],
  ];

  // O Instagram não expõe os posts sem token da API da Meta, então isto
  // é uma vitrine montada com as fotos que a própria loja publicou, já
  // baixadas. NÃO atualiza sozinha quando a loja posta: para virar feed
  // de verdade seria preciso um token do Graph API ou um widget pago.
  //
  // Cinco cards, na ordem do leque. O do meio (i: 0) é o mais visível,
  // então leva a foto mais forte. Os valores de dy, r e n são os mesmos
  // dos outros sites; mexer neles desmancha o leque.
  const INSTA = [
    { foto: 'insta/02.jpg',          i: -2, dy: 18, r: '-4deg', n: 0.86, z: 10,
      alt: 'Publicação do Instagram: fachada da D-Car com os carros do pátio' },
    { foto: 'estoque/voyage/01.jpg', i: -1, dy: 38, r: '-2deg', n: 0.94, z: 20,
      alt: 'Publicação do Instagram: Volkswagen Voyage 1.6 2017 no showroom' },
    { foto: 'estoque/onix/01.jpg',   i:  0, dy:  4, r:  '0deg', n: 1.00, z: 40,
      alt: 'Publicação do Instagram: Chevrolet Onix Premier 2020 vermelho no showroom' },
    { foto: 'insta/01.jpg',          i:  1, dy: 30, r:  '2deg', n: 0.94, z: 20,
      alt: 'Publicação do Instagram: equipe e clientes da D-Car na loja' },
    { foto: 'estoque/xre/01.jpg',    i:  2, dy: 12, r:  '4deg', n: 0.86, z: 10,
      alt: 'Publicação do Instagram: Honda XRE 300 Rally 2021 no showroom' },
  ];

  const PERFIL = 'https://www.instagram.com/dcar_itabira/';

  // Ficha do Google conferida em 09/09/2026: nota 5,0 com UMA avaliação.
  const GOOGLE = {
    nota: '5,0',
    total: 1,
    ficha: 'https://maps.app.goo.gl/NhJKapZXvDHibk2s5',
  };

  // Depoimentos do Google. VAZIO de propósito: a ficha tem uma avaliação
  // só e o texto dela ainda não foi capturado. Enquanto a lista estiver
  // vazia, o site mostra apenas o selo da nota, que é fato conferido.
  // NÃO preencher com texto inventado: avaliação fabricada é registro
  // falso, e num site que leva o nome da loja isso não entra.
  //
  // Para ligar: adicionar { texto, nome, fonte } e o carrossel monta
  // sozinho, sem mexer em CSS nem em HTML.
  const AVALIACOES = [
    // { texto: 'Atendimento direto, sem enrolação.', nome: 'Nome S.', fonte: 'Google, há 2 meses' },
  ];

  async function iniciar() {
    pintarIcones();
    ligarMenu();
    ligarHeaderTransparente();

    montarEntregas();
    montarAvaliacoes();
    montarLeque();

    await Store.init();
    mostrarAvisoDemo();

    const loja = await Store.loja();
    aplicarLoja(loja);
    pintarIcones();

    const estoque = await Store.listar();
    montarDestaques(estoque);

    // Depois de tudo montado: o observador precisa enxergar os cards do
    // estoque, que só existem no DOM neste ponto.
    animarNaRolagem();
  }

  // ---------- destaques ----------

  function montarDestaques(estoque) {
    const alvo = document.querySelector('[data-destaques]');
    if (!alvo) return;

    const disponiveis = estoque.filter((v) => v.status !== 'vendido');

    // Marcados como destaque primeiro. Se a loja não marcou nenhum, a
    // home não pode ficar vazia: cai para os primeiros disponíveis.
    const marcados = disponiveis.filter((v) => v.destaque);
    const lista = (marcados.length ? marcados : disponiveis).slice(0, MAX_DESTAQUES);

    if (!lista.length) {
      alvo.innerHTML =
        '<div class="vazio" style="grid-column:1/-1">' +
        '<h3>Veículos em atualização</h3>' +
        '<p>Chame no WhatsApp que a gente manda o que tem no pátio agora.</p></div>';
      return;
    }

    alvo.innerHTML = lista.map((v) => cardVeiculo(v, { anima: true })).join('');
  }

  // ---------- molduras de entrega ----------

  function montarEntregas() {
    const alvo = document.querySelector('[data-entregas]');
    if (!alvo) return;

    alvo.innerHTML = MOLDURAS.map((grupo) => `
      <div class="entrega-quadro" data-anima>
        ${grupo.map((n, j) => `
          <img src="assets/img/entregas/${n}.jpg" class="${j === 0 ? 'ativa' : ''}"
               alt="Cliente recebendo o carro na D-Car Veículos"
               loading="lazy" width="800" height="1000">`).join('')}
      </div>`).join('');

    // Com movimento reduzido, cada moldura fica parada na primeira foto.
    // Continua sendo conteúdo real, só não alterna.
    if (movimentoReduzido()) return;

    alvo.querySelectorAll('.entrega-quadro').forEach((quadro, i) => {
      const fotos = [...quadro.querySelectorAll('img')];
      if (fotos.length < 2) return;
      let atual = 0;
      // Escalonado: as três trocarem juntas pareceria falha de carregamento.
      setTimeout(() => {
        setInterval(() => {
          fotos[atual].classList.remove('ativa');
          atual = (atual + 1) % fotos.length;
          fotos[atual].classList.add('ativa');
        }, 5000);
      }, i * 1600);
    });
  }

  // ---------- avaliações do Google ----------

  function montarAvaliacoes() {
    const alvo = document.querySelector('[data-avaliacoes]');
    if (!alvo) return;

    const estrelas = '★★★★★';
    const plural = GOOGLE.total === 1 ? 'avaliação' : 'avaliações';

    const selo = `
      <div class="google-selo">
        <span class="nota">${esc(GOOGLE.nota)}</span>
        <span>
          <span class="estrelas" aria-hidden="true">${estrelas}</span>
          <span class="fonte">${GOOGLE.total} ${plural} no Google ·
            <a href="${esc(GOOGLE.ficha)}" target="_blank" rel="noopener">ver a ficha</a></span>
        </span>
      </div>`;

    // Sem depoimento capturado, fica só o selo. Nota é fato conferido na
    // ficha; texto de avaliação não se escreve por conta.
    if (!AVALIACOES.length) { alvo.innerHTML = selo; return; }

    alvo.innerHTML = selo + `
      <div class="carrossel" data-carrossel>
        <div class="carrossel__janela">
          <div class="avals" data-trilho>
            ${AVALIACOES.map((a) => `
              <article class="aval">
                <div class="aval__estrelas" aria-hidden="true">${estrelas}</div>
                <blockquote>“${esc(a.texto)}”</blockquote>
                <div class="aval__quem">
                  <span class="aval__ini" aria-hidden="true">${esc((a.nome || '?').trim().charAt(0))}</span>
                  <div><b>${esc(a.nome)}</b><span class="fonte">${esc(a.fonte || 'Google')}</span></div>
                </div>
              </article>`).join('')}
          </div>
        </div>
        <div class="carrossel__controles">
          <button class="seta" type="button" data-anterior aria-label="Avaliação anterior">&lsaquo;</button>
          <div class="pontos" data-pontos role="group" aria-label="Escolher avaliação"></div>
          <button class="seta" type="button" data-proximo aria-label="Próxima avaliação">&rsaquo;</button>
        </div>
      </div>`;

    ligarCarrossel(alvo.querySelector('[data-carrossel]'), 'Avaliação');
  }

  // Carrossel do padrão da casa: um por vez, girando sozinho a cada 5s.
  // Sem JS os itens ficam empilhados e todos legíveis; é este código que
  // adiciona `carrossel--on` e troca para o trilho deslizante.
  function ligarCarrossel(car, rotulo) {
    if (!car) return;
    const trilho = car.querySelector('[data-trilho]');
    const slides = [...trilho.children];
    if (slides.length < 2) return;

    const semMovimento = movimentoReduzido();
    car.classList.add('carrossel--on');

    const pontos = car.querySelector('[data-pontos]');
    let atual = 0, timer = null;
    const INTERVALO = 5000;

    function ir(n) {
      atual = (n + slides.length) % slides.length;
      trilho.style.transform = `translateX(${-atual * 100}%)`;
      [...pontos.children].forEach((p, i) =>
        p.setAttribute('aria-current', i === atual ? 'true' : 'false'));
      // Esconde os inativos do leitor de tela: senão ele lê todos
      // seguidos, como se fossem um parágrafo só.
      slides.forEach((s, i) => s.setAttribute('aria-hidden', i === atual ? 'false' : 'true'));
    }
    function parar() { if (timer) { clearInterval(timer); timer = null; } }
    function girar() { parar(); if (!semMovimento) timer = setInterval(() => ir(atual + 1), INTERVALO); }

    slides.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ponto';
      b.setAttribute('aria-label', `${rotulo} ${i + 1} de ${slides.length}`);
      b.addEventListener('click', () => { ir(i); girar(); });
      pontos.appendChild(b);
    });

    car.querySelector('[data-anterior]').addEventListener('click', () => { ir(atual - 1); girar(); });
    car.querySelector('[data-proximo]').addEventListener('click', () => { ir(atual + 1); girar(); });

    // Pausa só na faixa de controles, nunca no carrossel inteiro: a seção
    // fica no meio da página e quem rola de mouse deixa o cursor parado
    // em cima dela. Pausar tudo faria o giro nunca acontecer.
    const controles = car.querySelector('.carrossel__controles');
    if (controles) {
      controles.addEventListener('mouseenter', parar);
      controles.addEventListener('mouseleave', girar);
    }
    car.addEventListener('focusin', parar);
    car.addEventListener('focusout', girar);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) parar(); else girar();
    });

    let x0 = null;
    car.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; parar(); }, { passive: true });
    car.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
      x0 = null;
      girar();
    }, { passive: true });

    ir(0);
    girar();
  }

  // ---------- leque do Instagram ----------

  function montarLeque() {
    const leque = document.querySelector('[data-leque]');
    if (!leque) return;

    leque.innerHTML = INSTA.map((p) => `
      <a class="insta__item" href="${PERFIL}" target="_blank" rel="noopener"
         style="--i:${p.i};--dy:${p.dy};--r:${p.r};--n:${p.n};z-index:${p.z}">
        <img src="assets/img/${esc(p.foto)}" alt="${esc(p.alt)}"
             width="540" height="675" loading="lazy" decoding="async">
      </a>`).join('');

    // Os cinco saem empilhados no centro e abrem em leque quando a seção
    // entra na tela. Sem observador ou com movimento reduzido eles já
    // nascem abertos: a animação é reforço, nunca requisito.
    if (movimentoReduzido() || !('IntersectionObserver' in window)) return;

    leque.querySelectorAll('.insta__item').forEach((card, i) => {
      card.classList.add('insta__item--entrando');
      card.style.transitionDelay = (i * 110) + 'ms';
    });

    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        leque.classList.add('insta__leque--visivel');
        obs.disconnect();
      });
    }, { threshold: 0.3 });
    obs.observe(leque);
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
