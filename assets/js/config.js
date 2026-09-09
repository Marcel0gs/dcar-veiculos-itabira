// ============================================================
// Configuração do Supabase: D-Car Veículos
//
// Os dois valores saem de Supabase > Project Settings > API Keys.
//
// A chave publishable (`sb_publishable_…`) é pública por natureza:
// ela roda dentro do navegador de qualquer visitante do site. Quem
// protege os dados é o RLS do 01-schema.sql, que libera leitura do
// estoque pra todo mundo e escrita só pra quem está logado.
// NUNCA colocar aqui a chave `sb_secret_…`: aquela ignora o RLS.
//
// Enquanto SUPABASE_URL estiver vazia, o site roda em MODO DEMO:
// estoque de exemplo em memória, painel sem senha, nada é salvo.
// Serve pra desenvolver e pra mostrar a interface sem nuvem.
// ============================================================

window.CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_PUBLISHABLE_KEY: '',

  // Bucket das fotos, criado pelo 02-storage.sql.
  BUCKET: 'veiculos',

  // Fallback dos dados da loja: é o que o site mostra em modo demo e
  // enquanto a tabela `loja` não responde. Os valores abaixo foram
  // conferidos na fachada e na bio do Instagram em 09/09/2026.
  LOJA: {
    nome: 'D-Car Veículos',
    whatsapp: '5531997822520',
    whatsapp_exibicao: '(31) 99782-2520',
    // Endereço confirmado na ficha do Google em 09/09/2026.
    endereco: 'R. Armindo Costa Lage, 77 - Maj. Lage de Baixo',
    cep: '35900-212',
    cidade: 'Itabira/MG',
    // Horário completo lido na ficha do Google em 09/09/2026.
    horario: 'Segunda a sexta, 8h às 18h. Sábado, 8h às 12h. Domingo fechado.',
    instagram: 'dcar_itabira',
    sobre: 'Veículos conservados, de qualidade e procedência.',
  },

  // Teto do redimensionamento no navegador, antes do upload.
  // 1600px e 0,82 derrubam uma foto de celular de ~4 MB pra ~200 KB
  // sem estragar a leitura da lataria. Ver 02-storage.sql.
  FOTO_LADO_MAX: 1600,
  FOTO_QUALIDADE: 0.82,
};
