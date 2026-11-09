/* =====================================================================
   BIND – configuração, armazenamento local e envio de e-mail
   ===================================================================== */

/* ---------- 1) EMAILJS (crie conta grátis em https://www.emailjs.com) ----------
   Crie um "Email Service" e um "Email Template". No template, use estas variáveis:
   {{to_email}} {{to_name}} {{from_name}} {{message}}
   Em "To Email" do template coloque {{to_email}}.                         */
const EMAILJS = {
  SERVICE_ID:  "service_gsl69fs",
  TEMPLATE_ID: "template_kvi86gb",
  PUBLIC_KEY:  "ykQUN-pbMxwAoEoU9"
};

/* ---------- 2) MENSAGENS PERSONALIZÁVEIS (edite aqui) ----------
   Variáveis disponíveis: {nome} = pessoa cadastrada | {contato} = nome do contato
   {mapa} = link da localização no Google Maps                              */
const MENSAGENS = {
  ASSUNTO_SOS: "🚨 URGENTE: {nome} está em perigo! Chame a polícia (190)",
  MENSAGEM_SOS:
    "{contato}, {nome} acionou o botão de emergência (S.O.S.) do BIND e está em perigo.\n\n" +
    "📍 Localização: {mapa}\n\n" +
    "O QUE FAZER AGORA:\n" +
    "1. Ligue imediatamente para a polícia (190).\n" +
    "2. Informe que {nome} está em perigo e passe o link da localização acima.\n" +
    "Não ligue para {nome}, pois isso pode colocá-lo(a) em risco. Deixe a polícia fazer o contato.\n\n" +
    "Esta mensagem foi enviada automaticamente. Aja o mais rápido possível.",

  ASSUNTO_OK: "✅ BIND – {nome} está bem",
  MENSAGEM_OK: "Olá, {contato}! {nome} informou que está bem. Não é mais necessário ajuda."
};

/* ---------- Armazenamento (localStorage) ---------- */
const DB = {
  get(k, padrao){ try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; }catch{ return padrao; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
  usuario(){ return this.get("bind_usuario", null); },
  contatos(){ return this.get("bind_contatos", []); },
  limpar(){ localStorage.removeItem("bind_usuario"); localStorage.removeItem("bind_contatos"); }
};

function exigeCadastro(){
  if(!DB.usuario() || !DB.contatos().length) location.replace("cadastro.html");
}
const emailValido = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const preencher = (txt, d) => txt.replace(/\{(\w+)\}/g, (_, k) => d[k] ?? "");

/* ---------- Localização ---------- */
function pegarLocalizacao(){
  return new Promise(res => {
    if(!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res(`https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`),
      () => res(null), { enableHighAccuracy:true, timeout:8000 });
  });
}

/* ---------- Envio de e-mail para todos os contatos de confiança ---------- */
async function enviarEmail(assunto, mensagem, mapa){
  const u = DB.usuario();
  const envios = DB.contatos().map(async c => {
    const dados = { nome:u.nome, contato:c.nome, mapa: mapa || "localização indisponível" };
    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        service_id: EMAILJS.SERVICE_ID, template_id: EMAILJS.TEMPLATE_ID, user_id: EMAILJS.PUBLIC_KEY,
        template_params: {
          to_email: c.email, to_name: c.nome, from_name: u.nome,
          subject: preencher(assunto, dados),
          message: preencher(mensagem, dados)
        }
      })
    });
    if(!r.ok){
      const detalhe = await r.text();
      console.error("EmailJS:", r.status, detalhe);
      throw new Error("Falha ao enviar para " + c.email + " – " + detalhe);
    }
  });
  await Promise.all(envios);
}

/* ---------- Logo (SVG) ---------- */
document.querySelectorAll("[data-logo]").forEach(el => {
  el.innerHTML = `<svg viewBox="0 0 200 120" aria-label="BIND">
  <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#f5a76a"/><stop offset=".5" stop-color="#f3d9bd"/><stop offset="1" stop-color="#3a9be0"/></linearGradient></defs>
  <circle cx="72" cy="12" r="8" fill="#1f7ac4"/><circle cx="128" cy="12" r="8" fill="#f97316"/>
  <path d="M100 52C80 24 36 30 36 56s44 32 64 4c20-28 64-22 64 4s-44 32-64 4Z" fill="none" stroke="url(#g)" stroke-width="14" stroke-linecap="round"/>
  <text x="100" y="112" text-anchor="middle" font-size="40" font-weight="300" fill="#1f7ac4" letter-spacing="6">BIND</text></svg>`;
});
