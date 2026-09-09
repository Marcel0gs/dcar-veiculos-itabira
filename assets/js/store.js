// ============================================================
// Camada de dados: D-Car Veículos
//
// Dois modos, mesma interface:
//
//   supabase: quando config.js tem URL e chave publishable.
//             Leitura do estoque é pública; escrita exige login.
//   demo:     enquanto o Supabase não foi configurado. Carrega o
//             ESTOQUE_DEMO em memória. NADA é persistido: recarregar
//             a página volta tudo ao estado inicial. É de propósito,
//             pra não existir meio-salvo que confunda numa demonstração.
//
// Filtro e ordenação são feitos aqui no navegador, depois da leitura.
// Estoque de loja de bairro é dezenas de linhas, não milhares: uma
// consulta só e filtro local responde na hora, sem ida e volta a cada
// mexida no seletor.
// ============================================================

(function () {
  'use strict';

  const Store = { modo: 'demo', sb: null, usuario: null, _cache: null, _loja: null };

  // ---------- inicialização ----------

  Store.init = async function () {
    const cfg = window.CONFIG || {};
    const chave = cfg.SUPABASE_PUBLISHABLE_KEY || cfg.SUPABASE_ANON_KEY || '';

    if (cfg.SUPABASE_URL && chave && window.supabase) {
      Store.sb = window.supabase.createClient(cfg.SUPABASE_URL, chave);
      Store.modo = 'supabase';
      const { data } = await Store.sb.auth.getSession();
      Store.usuario = data?.session?.user || null;
      Store.sb.auth.onAuthStateChange((_e, sessao) => {
        Store.usuario = sessao?.user || null;
      });
    } else {
      Store.modo = 'demo';
      // Cópia profunda: o painel edita esse array à vontade sem
      // corromper o ESTOQUE_DEMO original, que é a fonte do reset.
      Store._cache = JSON.parse(JSON.stringify(window.ESTOQUE_DEMO || []));
    }
    return Store.modo;
  };

  Store.ehDemo = () => Store.modo === 'demo';

  // ---------- dados da loja ----------

  Store.loja = async function () {
    if (Store._loja) return Store._loja;
    const padrao = Object.assign({}, (window.CONFIG || {}).LOJA || {});

    if (Store.modo === 'supabase') {
      const { data, error } = await Store.sb.from('loja').select('*').eq('id', 1).maybeSingle();
      // Sem linha na tabela ou sem rede, o site continua de pé com o
      // fallback do config.js. Rodapé sem telefone é pior que telefone
      // ligeiramente desatualizado.
      if (!error && data) Object.assign(padrao, limpar(data));
    }
    if (padrao.whatsapp && !padrao.whatsapp_exibicao) {
      padrao.whatsapp_exibicao = formatarTelefone(padrao.whatsapp);
    }
    Store._loja = padrao;
    return padrao;
  };

  Store.salvarLoja = async function (dados) {
    if (Store.modo === 'demo') { Object.assign(Store._loja || {}, dados); return { ok: true }; }
    const { error } = await Store.sb.from('loja').update(dados).eq('id', 1);
    if (error) return { ok: false, erro: error.message };
    Store._loja = null;
    return { ok: true };
  };

  // ---------- leitura do estoque ----------

  Store.listar = async function () {
    if (Store.modo === 'demo') return ordenarPadrao(Store._cache.slice());

    const { data, error } = await Store.sb
      .from('veiculos')
      .select('*, fotos:veiculo_fotos(id, url, caminho, ordem)')
      .order('ordem', { ascending: true });

    if (error) { console.error('[store] listar:', error.message); return []; }

    const lista = (data || []).map((v) => {
      v.fotos = (v.fotos || []).sort((a, b) => a.ordem - b.ordem);
      return v;
    });
    return ordenarPadrao(lista);
  };

  Store.obter = async function (id) {
    if (Store.modo === 'demo') return Store._cache.find((v) => v.id === id) || null;

    const { data, error } = await Store.sb
      .from('veiculos')
      .select('*, fotos:veiculo_fotos(id, url, caminho, ordem)')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    data.fotos = (data.fotos || []).sort((a, b) => a.ordem - b.ordem);
    return data;
  };

  // ---------- escrita do estoque (painel) ----------

  Store.salvar = async function (veiculo) {
    const dados = limparParaBanco(veiculo);

    if (Store.modo === 'demo') {
      if (veiculo.id) {
        const i = Store._cache.findIndex((v) => v.id === veiculo.id);
        if (i >= 0) Store._cache[i] = Object.assign({}, Store._cache[i], dados);
        return { ok: true, id: veiculo.id };
      }
      const novo = Object.assign({ id: 'demo-' + Date.now(), fotos: [] }, dados);
      Store._cache.unshift(novo);
      return { ok: true, id: novo.id };
    }

    if (veiculo.id) {
      const { error } = await Store.sb.from('veiculos').update(dados).eq('id', veiculo.id);
      if (error) return { ok: false, erro: error.message };
      return { ok: true, id: veiculo.id };
    }
    const { data, error } = await Store.sb.from('veiculos').insert(dados).select('id').single();
    if (error) return { ok: false, erro: error.message };
    return { ok: true, id: data.id };
  };

  Store.remover = async function (id) {
    if (Store.modo === 'demo') {
      Store._cache = Store._cache.filter((v) => v.id !== id);
      return { ok: true };
    }

    // As fotos precisam sair do Storage ANTES da linha. O `on delete
    // cascade` limpa a tabela veiculo_fotos, mas não toca no bucket:
    // sem isso o arquivo fica órfão ocupando cota pra sempre.
    const veic = await Store.obter(id);
    const caminhos = (veic?.fotos || []).map((f) => f.caminho).filter(Boolean);
    if (caminhos.length) {
      await Store.sb.storage.from(window.CONFIG.BUCKET).remove(caminhos);
    }

    const { error } = await Store.sb.from('veiculos').delete().eq('id', id);
    if (error) return { ok: false, erro: error.message };
    return { ok: true };
  };

  Store.mudarStatus = async function (id, status) {
    if (Store.modo === 'demo') {
      const v = Store._cache.find((x) => x.id === id);
      if (v) v.status = status;
      return { ok: true };
    }
    const { error } = await Store.sb.from('veiculos').update({ status }).eq('id', id);
    return error ? { ok: false, erro: error.message } : { ok: true };
  };

  // ---------- fotos ----------

  // Redimensiona no navegador de quem cadastra. Foto de celular chega
  // com 4 MB e o Storage do plano free é 1 GB: sem isso, o estoque de
  // uma loja pequena estoura a cota em poucos meses.
  Store.prepararFoto = async function (arquivo) {
    const cfg = window.CONFIG || {};
    const ladoMax = cfg.FOTO_LADO_MAX || 1600;
    const qualidade = cfg.FOTO_QUALIDADE || 0.82;

    const bitmap = await carregarBitmap(arquivo);
    const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();

    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', qualidade));
    return { blob, largura: w, altura: h, dataUrl: canvas.toDataURL('image/jpeg', qualidade) };
  };

  // `imageOrientation: 'from-image'` é o que impede a foto tirada em
  // pé pelo celular de subir deitada. Sem isso o EXIF é ignorado no
  // canvas e o carro aparece girado no site.
  async function carregarBitmap(arquivo) {
    if (window.createImageBitmap) {
      try {
        return await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
      } catch (e) { /* navegador antigo, cai no Image abaixo */ }
    }
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(arquivo);
    });
  }

  Store.subirFoto = async function (veiculoId, arquivo, ordem) {
    const pronta = await Store.prepararFoto(arquivo);

    if (Store.modo === 'demo') {
      const v = Store._cache.find((x) => x.id === veiculoId);
      if (!v) return { ok: false, erro: 'veículo não encontrado' };
      const foto = { id: 'f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
                     url: pronta.dataUrl, caminho: null, ordem: ordem || (v.fotos || []).length };
      v.fotos = (v.fotos || []).concat(foto);
      return { ok: true, foto };
    }

    const bucket = window.CONFIG.BUCKET;
    const nome = `${veiculoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    const { error: erroUp } = await Store.sb.storage
      .from(bucket).upload(nome, pronta.blob, { contentType: 'image/jpeg', upsert: false });
    if (erroUp) return { ok: false, erro: erroUp.message };

    const { data: pub } = Store.sb.storage.from(bucket).getPublicUrl(nome);

    const { data, error } = await Store.sb.from('veiculo_fotos')
      .insert({ veiculo_id: veiculoId, caminho: nome, url: pub.publicUrl, ordem: ordem || 0 })
      .select('id, url, caminho, ordem').single();

    if (error) {
      // A linha falhou mas o arquivo subiu. Desfaz, senão fica lixo no bucket.
      await Store.sb.storage.from(bucket).remove([nome]);
      return { ok: false, erro: error.message };
    }
    return { ok: true, foto: data };
  };

  Store.removerFoto = async function (veiculoId, foto) {
    if (Store.modo === 'demo') {
      const v = Store._cache.find((x) => x.id === veiculoId);
      if (v) v.fotos = (v.fotos || []).filter((f) => f.id !== foto.id);
      return { ok: true };
    }
    if (foto.caminho) {
      await Store.sb.storage.from(window.CONFIG.BUCKET).remove([foto.caminho]);
    }
    const { error } = await Store.sb.from('veiculo_fotos').delete().eq('id', foto.id);
    return error ? { ok: false, erro: error.message } : { ok: true };
  };

  Store.reordenarFotos = async function (veiculoId, fotos) {
    if (Store.modo === 'demo') {
      const v = Store._cache.find((x) => x.id === veiculoId);
      if (v) v.fotos = fotos.map((f, i) => Object.assign({}, f, { ordem: i }));
      return { ok: true };
    }
    for (let i = 0; i < fotos.length; i++) {
      await Store.sb.from('veiculo_fotos').update({ ordem: i }).eq('id', fotos[i].id);
    }
    return { ok: true };
  };

  // ---------- login ----------

  Store.entrar = async function (email, senha) {
    if (Store.modo === 'demo') { Store.usuario = { email: 'demo@dcar' }; return { ok: true }; }
    const { data, error } = await Store.sb.auth.signInWithPassword({ email, password: senha });
    if (error) return { ok: false, erro: traduzirErroLogin(error.message) };
    Store.usuario = data.user;
    return { ok: true };
  };

  Store.sair = async function () {
    if (Store.modo === 'supabase') await Store.sb.auth.signOut();
    Store.usuario = null;
  };

  function traduzirErroLogin(msg) {
    if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(msg)) return 'E-mail ainda não confirmado no Supabase.';
    return msg;
  }

  // ---------- leads ----------

  // Dispara e segue. Se falhar, o clique no WhatsApp não pode ser
  // atrapalhado por causa de uma linha de estatística.
  Store.registrarLead = function (veiculoId, origem) {
    if (Store.modo !== 'supabase') return;
    try {
      Store.sb.from('leads').insert({
        veiculo_id: veiculoId || null,
        origem: origem || 'site',
      }).then(() => {}, () => {});
    } catch (e) { /* silencioso de propósito */ }
  };

  Store.contarLeads = async function (dias) {
    if (Store.modo !== 'supabase') return null;
    const desde = new Date(Date.now() - (dias || 30) * 864e5).toISOString();
    const { count, error } = await Store.sb.from('leads')
      .select('id', { count: 'exact', head: true }).gte('criado_em', desde);
    return error ? null : count;
  };

  // ---------- auxiliares ----------

  // Disponível primeiro, reservado depois, vendido por último. Dentro
  // de cada grupo vale a ordem manual do painel. Carro vendido no topo
  // da vitrine faz a loja parecer vazia.
  const PESO = { disponivel: 0, reservado: 1, vendido: 2 };
  function ordenarPadrao(lista) {
    return lista.sort((a, b) =>
      (PESO[a.status] ?? 3) - (PESO[b.status] ?? 3) ||
      (a.ordem || 0) - (b.ordem || 0) ||
      String(a.modelo).localeCompare(String(b.modelo), 'pt-BR'));
  }

  function limpar(obj) {
    const saida = {};
    Object.keys(obj).forEach((k) => {
      if (obj[k] !== null && obj[k] !== undefined && obj[k] !== '') saida[k] = obj[k];
    });
    return saida;
  }

  // O formulário devolve tudo como string. O Postgres recusa `''` numa
  // coluna int e derruba o insert inteiro, então a conversão acontece
  // aqui, num lugar só.
  function limparParaBanco(v) {
    return {
      marca: (v.marca || '').trim(),
      modelo: (v.modelo || '').trim(),
      versao: (v.versao || '').trim() || null,
      categoria: v.categoria || 'sedan',
      ano_fabricacao: Number(v.ano_fabricacao) || new Date().getFullYear(),
      ano_modelo: Number(v.ano_modelo) || Number(v.ano_fabricacao) || new Date().getFullYear(),
      km: Number(v.km) || 0,
      // preco 0 é estado válido: quer dizer "sob consulta", e é como o
      // estoque inicial entrou. Não trocar por null nem recusar.
      preco: Number(v.preco) || 0,
      cor: (v.cor || '').trim() || null,
      combustivel: v.combustivel || 'flex',
      cambio: v.cambio || 'manual',
      // Vazio vira null, não 4: é o que permite cadastrar moto.
      portas: v.portas === '' || v.portas === null || v.portas === undefined
        ? null : (Number(v.portas) || null),
      opcionais: Array.isArray(v.opcionais) ? v.opcionais : [],
      descricao: (v.descricao || '').trim() || null,
      destaque: !!v.destaque,
      status: v.status || 'disponivel',
      ordem: Number(v.ordem) || 0,
    };
  }

  function formatarTelefone(numero) {
    const d = String(numero).replace(/\D/g, '').replace(/^55/, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return numero;
  }

  window.Store = Store;
})();
