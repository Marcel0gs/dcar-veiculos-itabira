// ============================================================
// Estoque REAL da D-Car, levantado em 09/09/2026
//
// Fonte: as legendas dos posts do Instagram da loja, transcritas em
// `Carros do Estoque atual/`, mais o que está escrito na tarja das
// próprias fotos (modelo, ano e km batem nas duas fontes).
//
// PREÇO: nenhuma legenda da loja traz preço. Todos entraram com
// `preco: 0`, que a vitrine escreve como "Sob consulta". Assim que os
// valores chegarem, é trocar o número aqui e no 03-seed.sql.
//
// Este arquivo é o modo demonstração. Quando o Supabase estiver
// configurado, o site passa a ler do banco e ignora tudo isto.
// ============================================================

window.ESTOQUE_DEMO = [
  {
    id: 'onix-premier-2020',
    marca: 'Chevrolet', modelo: 'Onix', versao: 'Premier 1.0 Turbo', categoria: 'hatch',
    ano_fabricacao: 2020, ano_modelo: 2020, km: 77400, preco: 0, cor: 'Vermelho',
    combustivel: 'flex', cambio: 'automatico', portas: 4,
    destaque: true, status: 'disponivel', ordem: 1,
    opcionais: [
      'Ar-condicionado digital', 'Direção elétrica', 'Central multimídia',
      'Comando de som no volante', 'Sensor de estacionamento', 'Start/Stop',
      'Volante com ajuste de altura e profundidade', 'Retrovisores elétricos',
      'Rodas de liga leve', 'Vidros e travas elétricas', 'Airbag',
      'Chave reserva', 'Manual',
    ],
    descricao: 'Motor 1.0 turbo de 116 cv, câmbio automático. Carro de procedência para pessoas exigentes.',
    fotos: fotos('onix', 12),
  },
  {
    id: 'voyage-2017',
    marca: 'Volkswagen', modelo: 'Voyage', versao: '1.6 MSI', categoria: 'sedan',
    ano_fabricacao: 2017, ano_modelo: 2017, km: 106000, preco: 0, cor: 'Prata',
    combustivel: 'flex', cambio: 'manual', portas: 4,
    destaque: true, status: 'disponivel', ordem: 2,
    opcionais: [
      'Ar-condicionado', 'Direção hidráulica', 'Central multimídia',
      'Comando de som no volante', 'Sensor de estacionamento',
      'Engate para reboque', 'Rebatimento de seta no retrovisor',
      'Retrovisores elétricos', 'Rodas de liga leve', 'Vidros e travas elétricas',
      'Airbag', 'Chave reserva', 'Manual',
    ],
    descricao: 'Segundo dono. Carro de procedência para pessoas exigentes.',
    fotos: fotos('voyage', 14),
  },
  {
    id: 'fox-2013',
    marca: 'Volkswagen', modelo: 'Fox', versao: '1.6', categoria: 'hatch',
    ano_fabricacao: 2013, ano_modelo: 2013, km: 145000, preco: 0, cor: 'Branco',
    combustivel: 'flex', cambio: 'manual', portas: 4,
    destaque: true, status: 'disponivel', ordem: 3,
    opcionais: [
      'Ar-condicionado', 'Direção hidráulica', 'Vidros elétricos nas 4 portas',
      'Airbag duplo', 'Rodas de liga leve', 'Rebatimento de seta no retrovisor',
      'Retrovisor com ajuste elétrico', 'Alarme e trava elétrica', 'Rádio', 'Manual',
    ],
    descricao: 'Compra, venda e consignação de veículos com confiança, qualidade e transparência.',
    fotos: fotos('fox', 9),
  },
  {
    id: 'xre300-rally-2021',
    marca: 'Honda', modelo: 'XRE 300', versao: 'Rally', categoria: 'moto',
    ano_fabricacao: 2021, ano_modelo: 2021, km: 23000, preco: 0, cor: 'Vermelha',
    combustivel: 'gasolina', cambio: 'manual', portas: null,
    destaque: true, status: 'disponivel', ordem: 4,
    opcionais: [
      'Baú', 'Prolongador de suspensão', 'Proteção de tanque',
      'Chave reserva', 'Manual',
    ],
    descricao: 'Segundo dono, com manual e chave reserva.',
    fotos: fotos('xre', 8),
  },
  {
    id: 'uno-fire-2013',
    marca: 'Fiat', modelo: 'Uno', versao: 'Fire 1.0', categoria: 'hatch',
    ano_fabricacao: 2013, ano_modelo: 2013, km: 213000, preco: 0, cor: 'Branco',
    combustivel: 'flex', cambio: 'manual', portas: 4,
    destaque: true, status: 'disponivel', ordem: 5,
    opcionais: [
      'Vidros elétricos', 'Travas elétricas', 'Alarme', 'Faróis em LED',
      'Rádio com entrada USB', 'Porta-malas com abertura elétrica',
      'Placa Mercosul',
    ],
    descricao: 'Quatro pneus acima de 80%. Carro de procedência para pessoas exigentes.',
    fotos: fotos('uno', 10),
  },
];

// As fotos foram numeradas em ordem no `site/assets/img/estoque/`, com a
// capa (a que tem a tarja da marca) sempre em 01.
function fotos(pasta, quantidade) {
  const lista = [];
  for (let i = 1; i <= quantidade; i++) {
    const n = String(i).padStart(2, '0');
    lista.push({ id: `${pasta}-${n}`, url: `assets/img/estoque/${pasta}/${n}.jpg`, ordem: i - 1 });
  }
  return lista;
}
