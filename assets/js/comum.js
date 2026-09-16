// ============================================================
// Peças compartilhadas: D-Car Veículos
// Formatação, ícones, card de veículo e ligação com o WhatsApp.
// Carregado por todas as páginas, inclusive o painel.
// ============================================================

(function () {
  'use strict';

  // ---------- formatação ----------

  const Fmt = {
    // preco 0 quer dizer "ainda não informado", não "de graça". A loja
    // não publica valor nas legendas do Instagram, então o estoque
    // inicial entrou inteiro assim. "R$ 0" num card destruiria a página.
    preco(n) {
      const v = Number(n) || 0;
      if (v <= 0) return 'Sob consulta';
      return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },
    temPreco(v) { return Number(v?.preco) > 0; },
    km(n) {
      const v = Number(n) || 0;
      if (v === 0) return '0 km';
      return v.toLocaleString('pt-BR') + ' km';
    },
    // "2019/2020" só quando fabricação e modelo diferem. Repetir o
    // mesmo ano dos dois lados é ruído que a loja não escreve.
    ano(v) {
      const f = v.ano_fabricacao, m = v.ano_modelo;
      return (f && m && f !== m) ? `${f}/${m}` : String(m || f || '');
    },
    cambio(c) {
      return { manual: 'Manual', automatico: 'Automático',
               automatizado: 'Automatizado', cvt: 'CVT' }[c] || c || '';
    },
    combustivel(c) {
      return { flex: 'Flex', gasolina: 'Gasolina', diesel: 'Diesel', etanol: 'Etanol',
               hibrido: 'Híbrido', eletrico: 'Elétrico', gnv: 'GNV' }[c] || c || '';
    },
    categoria(c) {
      return { hatch: 'Hatch', sedan: 'Sedã', suv: 'SUV', picape: 'Picape',
               utilitario: 'Utilitário', moto: 'Moto', outro: 'Outro' }[c] || c || '';
    },
    status(s) {
      return { disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido' }[s] || s;
    },
    nome(v) {
      return [v.marca, v.modelo].filter(Boolean).join(' ');
    },
    nomeCompleto(v) {
      return [v.marca, v.modelo, v.versao].filter(Boolean).join(' ');
    },
    // 'AAAA-MM-DD' (o que o <input type="date"> devolve) pro formato
    // que se lê rápido numa lista, sem depender de fuso: monta a data
    // por partes, nunca por `new Date(string)`.
    dataCurta(iso) {
      const [a, m, d] = String(iso).split('-');
      return d && m ? `${d}/${m}` : String(iso);
    },
  };

  // Todo texto vindo do banco passa por aqui antes de virar innerHTML.
  // A descrição e os opcionais são digitados por gente no painel, então
  // um `<` solto ali não pode virar tag na página do cliente.
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- ícones ----------

  const TRACOS = {
    carro: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    km: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    ano: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    cambio: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    combustivel: '<line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
    cor: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    porta: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561z"/>',
    check: '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
    esquerda: '<path d="m15 18-6-6 6-6"/>',
    direita: '<path d="m9 18 6-6-6-6"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    fotos: '<path d="M18 22H4a2 2 0 0 1-2-2V6"/><path d="m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"/><circle cx="12" cy="8" r="2"/><rect width="16" height="16" x="6" y="2" rx="2"/>',
    busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    local: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    relogio: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    instagram: '<rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
    escudo: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    chave: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
    documento: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    dinheiro: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    troca: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    etiqueta: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><path d="M7.5 7.5h.01"/>',
    cartao: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    chave2: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
    fechar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    seta: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    ferramenta: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    pessoas: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    lixeira: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    lapis: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    mais: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    grafico: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    expandir: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>',
  };

  const ZAP_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';

  function ico(nome) {
    if (nome === 'zap') {
      return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${ZAP_PATH}"/></svg>`;
    }
    const d = TRACOS[nome] || '';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
           `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  }

  // ---------- WhatsApp ----------

  // `wa.me` em vez de `api.whatsapp.com`: é o esquema que abre o app
  // direto no celular em vez de passar pela tela intermediária do
  // navegador, que é onde o lead desiste.
  function linkZap(loja, texto) {
    const numero = String(loja?.whatsapp || '').replace(/\D/g, '');
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto || '')}`;
  }

  // Com preço, a mensagem já cita o valor, e o vendedor sabe que a
  // pessoa viu quanto custa. Sem preço, a mensagem PERGUNTA o valor,
  // que é exatamente o que falta hoje no estoque da loja.
  function textoZapVeiculo(v, loja) {
    const nome = Fmt.nomeCompleto(v);
    const ano = Fmt.ano(v);
    const casa = loja?.nome || 'D-Car';
    return Fmt.temPreco(v)
      ? `Olá! Vi o ${nome} ${ano} por ${Fmt.preco(v.preco)} no site da ${casa} e queria mais informações.`
      : `Olá! Vi o ${nome} ${ano} no site da ${casa} e queria saber o valor e as condições.`;
  }

  function textoZapGeral(loja) {
    return `Olá! Vim pelo site da ${loja?.nome || 'D-Car Veículos'} e queria falar sobre um veículo.`;
  }

  // ---------- card de veículo ----------

  function fotoCapa(v) {
    const f = (v.fotos || [])[0];
    return f ? f.url : null;
  }

  function blocoFoto(v, alt) {
    const capa = fotoCapa(v);
    const qtd = (v.fotos || []).length;
    const marcador =
      v.status === 'vendido'   ? '<span class="tag tag-vendido">Vendido</span>' :
      v.status === 'reservado' ? '<span class="tag tag-reservado">Reservado</span>' :
      v.destaque               ? '<span class="tag tag-destaque">Destaque</span>' : '';

    const contador = qtd > 1
      ? `<span class="conta-fotos">${ico('fotos')}${qtd}</span>` : '';

    const imagem = capa
      ? `<img src="${esc(capa)}" alt="${esc(alt)}" loading="lazy" width="800" height="600">`
      : `<div class="sem-foto">${ico('camera')}<span>Foto em breve</span></div>`;

    return `<div class="veic-foto">${marcador}${imagem}${contador}</div>`;
  }

  // `opcoes.anima` só é usado na home. Na página de estoque os cards são
  // redesenhados a cada mexida no filtro, e um card que nasce invisível
  // esperando o observador ficaria invisível para sempre.
  function cardVeiculo(v, opcoes) {
    const alt = `${Fmt.nomeCompleto(v)} ${Fmt.ano(v)}`;
    const vendido = v.status === 'vendido';
    const anima = opcoes && opcoes.anima ? ' data-anima' : '';

    return `
      <a class="veic"${anima} href="veiculo.html?id=${encodeURIComponent(v.id)}">
        ${blocoFoto(v, alt)}
        <div class="veic-corpo">
          <span class="veic-marca">${esc(v.marca)}</span>
          <h3 class="veic-nome">${esc(v.modelo)}</h3>
          <p class="veic-versao">${esc(v.versao || Fmt.categoria(v.categoria))}</p>
          <div class="veic-specs">
            <span>${esc(Fmt.ano(v))}</span>
            <span>${esc(Fmt.km(v.km))}</span>
            <span>${esc(Fmt.cambio(v.cambio))}</span>
          </div>
          <div class="veic-rodape">
            <div class="veic-preco${vendido ? ' vendido' : ''}${Fmt.temPreco(v) ? '' : ' consulta'}">
              ${Fmt.temPreco(v)
                ? `<small>${vendido ? 'Vendido por' : 'à vista'}</small>`
                : '<small>Preço</small>'}
              <b>${Fmt.preco(v.preco)}</b>
            </div>
            <span class="veic-cta">Ver detalhes ${ico('seta')}</span>
          </div>
        </div>
      </a>`;
  }

  // ---------- header, rodapé e WhatsApp da página ----------

  // Preenche telefone, endereço e links a partir da tabela `loja`.
  // Tudo que é dado de contato mora em um lugar só: trocar o número
  // no painel troca em todas as páginas, sem mexer em HTML.
  function aplicarLoja(loja) {
    const zapGeral = linkZap(loja, textoZapGeral(loja));

    document.querySelectorAll('[data-zap]').forEach((el) => {
      el.setAttribute('href', zapGeral);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
      el.addEventListener('click', () => {
        window.Store?.registrarLead(null, el.dataset.zap || 'site');
      });
    });

    document.querySelectorAll('[data-loja]').forEach((el) => {
      const campo = el.dataset.loja;
      const valor = loja[campo];
      if (!valor) { el.closest('[data-loja-linha]')?.remove(); return; }
      el.textContent = valor;
    });

    document.querySelectorAll('[data-insta]').forEach((el) => {
      if (loja.instagram) el.setAttribute('href', 'https://instagram.com/' + loja.instagram);
      else el.remove();
    });

    const ano = document.querySelector('[data-ano]');
    if (ano) ano.textContent = new Date().getFullYear();
  }

  function ligarMenu() {
    const btn = document.querySelector('.menu-btn');
    const nav = document.querySelector('.nav');
    if (!btn || !nav) return;
    // Estado inicial pintado aqui, e não no HTML: o ícone alterna entre
    // menu e fechar, então quem manda nele é o JS do começo ao fim.
    // Sem isto o botão abre a página como um quadrado vazio no celular.
    btn.innerHTML = ico('menu');
    btn.addEventListener('click', () => {
      const aberto = nav.classList.toggle('aberto');
      btn.setAttribute('aria-expanded', String(aberto));
      btn.innerHTML = ico(aberto ? 'fechar' : 'menu');
    });
    nav.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        nav.classList.remove('aberto');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = ico('menu');
      }));
  }

  // Troca todo `<i data-ico="nome">` da página pelo SVG. Evita repetir
  // caminho de SVG dentro do HTML, que é o que deixa a página ilegível.
  function pintarIcones(raiz) {
    (raiz || document).querySelectorAll('[data-ico]').forEach((el) => {
      el.outerHTML = ico(el.dataset.ico);
    });
  }

  // Não existe aviso de "modo demonstração" nas páginas públicas, e é de
  // propósito: a tarja amarela no topo era a primeira coisa que aparecia no
  // celular, inclusive pra quem o link for mostrado. O estado do banco é
  // assunto de bastidor, e vive no README de `supabase/` e no CLAUDE.md
  // daqui. O painel, esse sim, continua avisando: lá dentro alguém pode
  // achar que cadastrou um carro de verdade.

  // ---------- cabeçalho sobre o hero ----------

  // Na home o cabeçalho começa transparente, por cima da foto. Assim que
  // a página sai do topo ele ganha fundo sólido, senão o menu ficaria
  // branco sobre conteúdo claro e sumiria.
  function ligarHeaderTransparente() {
    if (!document.body.classList.contains('home')) return;
    const marcar = () => {
      document.body.classList.toggle('rolado', window.scrollY > 40);
    };
    window.addEventListener('scroll', marcar, { passive: true });
    marcar();
  }

  // ---------- movimento ----------

  function movimentoReduzido() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  // ---------- aparecer ao rolar ----------

  // A classe `js-anima` entra no <html> só quando este código roda. Sem
  // ela, o CSS nunca esconde nada: se o JS falhar ou não carregar, a
  // página aparece inteira em vez de ficar em branco. Estado de repouso
  // nunca pode ser opacidade zero.
  function animarNaRolagem() {
    const alvos = [...document.querySelectorAll('[data-anima]')];
    if (!alvos.length) return;

    document.documentElement.classList.add('js-anima');

    const mostrarTudo = () => alvos.forEach((el) => el.classList.add('visivel'));
    if (movimentoReduzido() || !('IntersectionObserver' in window)) { mostrarTudo(); return; }

    // Escalonamento por posição entre os irmãos: os cards de uma grade
    // entram em cascata em vez de todos de uma vez.
    alvos.forEach((el) => {
      const irmaos = [...el.parentElement.children].filter((x) => x.hasAttribute('data-anima'));
      const i = irmaos.indexOf(el);
      if (i > 0) el.style.transitionDelay = Math.min(i * 70, 280) + 'ms';
    });

    let observadorRespondeu = false;

    const obs = new IntersectionObserver((entradas) => {
      observadorRespondeu = true;
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visivel');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

    alvos.forEach((el) => obs.observe(el));

    // Rede de segurança contra o observador nunca responder. O
    // IntersectionObserver chama o callback logo no `observe()`, mesmo
    // para quem está fora da tela, então `observadorRespondeu` fica
    // verdadeiro em um quadro. Se em 2s não respondeu, alguma coisa está
    // errada e é melhor mostrar tudo do que deixar a página em branco.
    //
    // A checagem da flag é o que importa: revelar tudo por tempo, sem
    // condição, apagaria o efeito de rolagem, porque o conteúdo lá
    // embaixo apareceria antes de a pessoa chegar nele.
    setTimeout(() => { if (!observadorRespondeu) mostrarTudo(); }, 2000);
  }

  window.DCar = {
    Fmt, esc, ico, linkZap, textoZapVeiculo, textoZapGeral,
    cardVeiculo, blocoFoto, fotoCapa, aplicarLoja, ligarMenu, pintarIcones,
    movimentoReduzido, animarNaRolagem, ligarHeaderTransparente,
  };
})();
