// © 2026 Martín Viera. Todos los derechos reservados.
//
// Traducción de la landing. El español está escrito en el HTML; acá viven el
// inglés y el portugués. Cada elemento con data-i="clave" recibe su texto
// (innerHTML, porque algunos llevan <b>/<code>); data-i-ph, data-i-alt y
// data-i-aria traducen placeholder, alt y aria-label.
//
// Idioma: ?lang=es|en|pt  >  localStorage("mvmd_lang")  >  idioma del navegador.
// Archivo externo a propósito: la CSP del sitio (script-src 'self') prohíbe
// <script> inline.
(function () {
  "use strict";
  var IDIOMAS = ["es", "en", "pt"];
  var CLAVE = "mvmd_lang";

  var I18N = {
    en: {
      _title: "MV Marketing Digital — Social media and competitor analytics with AI",
      _desc: "Your social networks and your competitors' in one dashboard: analytics for 8 networks, benchmarking, rankings with projections, social listening, planner and AI assistant. Windows + web demo. ES/EN/PT.",
      skip: "Skip to content",
      nav1: "Platform", nav2: "Video", nav3: "Comparison", nav4: "Rankings", nav5: "AI", nav6: "FAQ",
      langLbl: "Language", navCta: "Download",
      kick: "Social analytics · competitors · AI",
      h1: "Your social networks and your competitors’, <em>in one dashboard</em>",
      lead: "Metrics for Instagram, Facebook, TikTok, X, LinkedIn, YouTube, Pinterest and Threads; benchmarking against your competitors, rankings with projections, social listening with alerts and an AI assistant that tells you what to do next. All on your PC, in English, Spanish and Portuguese.",
      cta1: "Download for Windows", cta2: "Try the web demo",
      heroNota: "Windows 10/11, 64-bit. The web demo needs no sign-up and runs on <strong>100% synthetic data</strong>: the figures you see are illustrative, not customer results.",
      st1: "social networks", st2: "analysis views", st3: "AI providers", st4: "languages: ES · EN · PT",
      heroCap: "Real app screenshot · demo data",
      heroAlt: "MV Marketing Digital Overview screen: KPIs, followers per network, prioritized suggestions and social listening",
      vEy: "Video", vH: "One minute across the whole platform",
      vL: "A recording of the real app going through overview, networks, competitors, rankings, listening, search, planner, suggestions and the assistant. No separately staged animations.",
      vCap: "The video uses the demo data (a fictional coffee shop and fictional competitors). Figures are illustrative.",
      pEy: "Platform", pH: "Everything you need to decide what to post",
      pL: "Fourteen views on top of one engine. Every number shows where it comes from and every recommendation explains why.",
      f1t: "Per-network analytics", f1p: "Followers, reach, engagement, clicks and posts for 8 networks, with a best-time heatmap by day and hour and performance by format.",
      f2t: "Competitor benchmark", f2p: "Share of voice, growth, who is accelerating, format and topic gaps, and the posts that work best for them.",
      f3t: "Social Blade-style rankings", f3p: "A++ to D− grades, daily stats, follower projections from 30 days to 5 years, next milestone and estimated earnings by CPM.",
      f4t: "Social listening", f4p: "Explainable sentiment in three languages —it shows which words drove it— and spike alerts with a probable cause: city and topic.",
      f5t: "Deep search", f5p: "Operators <code>red:</code>, <code>pais:</code>, <code>ciudad:</code>, <code>marca:</code>, <code>formato:</code>, <code>sent:</code>, <code>tema:</code> and <code>\"exact phrase\"</code>, plus a trend radar per country and content ideas.",
      f6t: "Audience and filters", f6p: "Filter everything by country, city, age, gender, interest, format and period. Views recalculate instantly.",
      f7t: "Planner", f7p: "Per-network validation (length, image, hashtags), best slots from your own data, calendar and a queue exportable to CSV. It does not post on its own: you decide.",
      f8t: "Unified inbox", f8p: "Comments and messages from every network in one list, sorted by urgency, with suggested replies you can edit.",
      f9t: "Campaigns", f9p: "UTM builder, per-campaign tracking and <strong>estimated</strong> ROI, labeled as an estimate on every screen.",
      f10t: "Prioritized suggestions", f10p: "Rules that score every action by impact × probability ÷ effort and rank it as Urgent, High, Medium or Low.",
      f11t: "AI assistant", f11p: "Claude, ChatGPT, Gemini, Groq, Mistral, DeepSeek, Grok or Ollama. Plus a local engine that answers “what if…?” with no key at all.",
      f12t: "Reports and exports", f12p: "An executive HTML report ready to send and CSV exports of every table.",
      f13t: "Your real data via CSV", f13p: "Import the exports from Meta Business Suite, TikTok Studio, LinkedIn, X and YouTube Studio. They are processed on your PC.",
      f14t: "Desktop and web", f14p: "A Windows installer and the same interface in the browser to try it out. Trilingual end to end.",
      cEy: "The best of each tool", cH: "Ideas that work in the market, on our own engine",
      cL: "Each category has a tool that made it famous. We brought those features together in one app. The table compares features, not third-party pricing or quality.",
      cAria: "Feature comparison",
      cC1: "Feature", cC2: "Category reference", cC3: "In MV Marketing Digital",
      c1a: "Best time to post", c1c: "7 × 24 heatmap per network from your own data",
      c2a: "Competitor benchmark", c2c: "Share of voice, acceleration and format and topic gaps",
      c3a: "Unified inbox", c3c: "Every network in one list, by urgency, with a suggested reply",
      c4a: "Post queue and calendar", c4c: "Per-network validation and exportable queue (no automatic posting)",
      c5a: "Social listening and sentiment", c5c: "Explainable ES/EN/PT sentiment and spike alerts with probable cause",
      c6a: "Campaigns, UTM and return", c6c: "UTM builder and estimated ROI per campaign",
      c7a: "Rankings, grades and projections", c7c: "A++–D− grades, daily stats, 5-year projection and next milestone",
      c8a: "AI assistant", c8b: "Several", c8c: "8 providers of your choice + local what-if with no key",
      c9a: "Reports", c9b: "All", c9c: "Executive HTML report and CSV of every table",
      cNota: "The brands mentioned belong to their respective owners and are cited only as a category reference. MV Marketing Digital is not affiliated with them and does not use their code.",
      rEy: "Rankings and projections", rH: "Know where you stand and where you are heading",
      rL: "Every account —yours or a competitor’s— gets a grade and a profile with its history and its likely future.",
      r1: "<b>A++ to D− grade</b> combining size (40%), 30-day growth (35%) and engagement (25%), as percentiles.",
      r2: "<b>Daily stats</b>: follower gain, impressions, interactions and posts, day by day.",
      r3: "<b>Projections from 30 days to 5 years</b> with a confidence band and damped growth; long horizons are flagged as extrapolation.",
      r4: "<b>Next milestone</b> (for example, 100k followers) and the estimated date to reach it.",
      r5: "<b>Estimated earnings by CPM</b>: a range you tune to your market, never presented as real income.",
      rAria: "Example ranking profile with synthetic data",
      rmSub: "#1 in followers · #3 in engagement",
      rmK1: "Followers", rmK2: "Daily avg.", rmK3: "Monthly pace",
      rmGraf: "History and projection with confidence band",
      rmH1: "Horizon", rmH2: "Estimate", rmH3: "90% range",
      rmP1: "30 days", rmP2: "6 months", rmP3: "5 years", rmEx: "extrapolation",
      rmNota: "Example with synthetic demo data: fictional brand and figures.",
      iEy: "AI assistant", iH: "Pick your AI. Or none.",
      iL: "AI adds, it doesn’t gate: the rules engine, the suggestions and the local simulator work without a key. Connect a provider and the assistant answers any question about your metrics.",
      iAria: "Supported providers", iLocal: "(local)",
      i1t: "Keys encrypted on your PC", i1p: "Your key is stored encrypted with the operating system’s secure storage and used only by the app’s main process. It never travels to our servers or gets exposed in the interface.",
      i2t: "Always up-to-date models", i2p: "Every 7 days the app refreshes each provider’s model list and recommends the newest one. When a better model ships, you don’t have to wait for an update.",
      i3t: "“What if…?” with no key", i3p: "Ask “what if I post 3 more reels per week on Instagram?” and the local engine estimates the effect with a probable range, from your own data.",
      iPriv: "<b>Privacy:</b> only aggregated metrics are sent to the AI provider. Third-party comment texts and authors never leave your computer.",
      fEy: "Filters and search", fH: "From global to a single city, in one click",
      fL: "Every view responds to the same filters. See how you are doing in a country, a city or with an audience, and search everything that is said about you and your competitors.",
      fAria: "Available filters",
      fc1: "Country", fc2: "City", fc3: "Age", fc4: "Gender", fc5: "Interest", fc6: "Format", fc7: "Network", fc8: "Period",
      fCons: "Deep search",
      fConsP: "Results come with their sentiment explained, the country’s trend radar and content ideas to make the most of them.",
      dEy: "Downloads", dH: "Install it or try it in your browser",
      d1t: "Windows", d1p: "<code>.exe</code> installer (NSIS) for 64-bit Windows 10 and 11. You choose the folder, it creates the shortcut and it works offline except for the assistant with an external AI.",
      d1b: "Download for Windows",
      d1n: "The installer is built by GitHub Actions on every tagged version and published on the repository’s releases page.",
      d2t: "Web demo", d2p: "The same interface, in the browser, with nothing to install. It uses 100% synthetic data and the assistant runs on the local rules engine.",
      d2b: "Open the web demo",
      d2n: "To work with your real data, install the app and import each network’s CSV files.",
      qEy: "FAQ", qH: "What people ask us most",
      q1: "Does it post automatically to my networks?",
      a1: "No. The planner builds the calendar and the queue, validates each post for its network and suggests the best time, but it does not post on your behalf: you export the queue to CSV and publish it yourself or load it into each network’s official tool.",
      q2: "Is the data real?",
      a2: "The demo data is not: it is 100% synthetic, with fictional brands and a fixed seed, so you can explore everything without connecting anything. To work with your real data, import the CSV files exported by Meta Business Suite, TikTok Studio, LinkedIn, X and YouTube Studio.",
      q3: "Where are my AI keys stored?",
      a3: "On your PC, encrypted with the operating system’s secure storage. Only the app’s main process uses them to call the provider you chose; they never go through any server of ours. The web demo does not accept keys.",
      q4: "Do I need an AI key to use it?",
      a4: "No. Metrics, rankings, suggestions, alerts and the “what if…?” simulator work on the local engine. A key only adds open-ended answers to any question.",
      q5: "How reliable are the projections and the ROI?",
      a5: "They are estimates and the app labels them as such. Projections use a regression over the last 90 days with damped growth and show a confidence band; beyond one year they are flagged as extrapolation. ROI and CPM earnings depend on assumptions you can adjust.",
      q6: "Are the figures on this page customer results?",
      a6: "No. Every screenshot, the video and the sample profile come from the synthetic demo and illustrate how the product works. We do not publish testimonials or reviews.",
      q7: "Which languages does it support?",
      a7: "English, Spanish and Portuguese, including the interface, social-listening sentiment and the assistant.",
      legal: "Analytics for your own and your competitors’ social networks, with an AI assistant. The demo data, the video and the screenshots are synthetic and impact figures are illustrative. Third-party brands belong to their owners.",
      rights: "All rights reserved."
    },
    pt: {
      _title: "MV Marketing Digital — Análise de redes sociais e concorrência com IA",
      _desc: "Suas redes e as da concorrência em um só painel: análise de 8 redes, benchmark, rankings com projeções, escuta social, planejador e assistente IA. Windows + demo web. ES/EN/PT.",
      skip: "Pular para o conteúdo",
      nav1: "Plataforma", nav2: "Vídeo", nav3: "Comparativo", nav4: "Rankings", nav5: "IA", nav6: "Perguntas",
      langLbl: "Idioma", navCta: "Baixar",
      kick: "Análise social · concorrência · IA",
      h1: "Suas redes e as da concorrência, <em>em um só painel</em>",
      lead: "Métricas de Instagram, Facebook, TikTok, X, LinkedIn, YouTube, Pinterest e Threads; benchmark contra seus concorrentes, rankings com projeções, escuta social com alertas e um assistente IA que diz o que fazer em seguida. Tudo no seu PC, em português, espanhol e inglês.",
      cta1: "Baixar para Windows", cta2: "Testar a demo web",
      heroNota: "Windows 10/11 de 64 bits. A demo web não pede cadastro e trabalha com <strong>dados 100% sintéticos</strong>: os números que você vê são ilustrativos, não resultados de clientes.",
      st1: "redes sociais", st2: "telas de análise", st3: "provedores de IA", st4: "idiomas: ES · EN · PT",
      heroCap: "Captura real do app · dados de demonstração",
      heroAlt: "Tela de Resumo do MV Marketing Digital: KPIs, seguidores por rede, sugestões priorizadas e escuta social",
      vEy: "Vídeo", vH: "Um minuto por toda a plataforma",
      vL: "Gravação do app real passando por resumo, redes, concorrência, rankings, escuta, busca, planejador, sugestões e o assistente. Sem animações montadas à parte.",
      vCap: "O vídeo usa os dados de demonstração (uma cafeteria fictícia e concorrentes fictícios). Os números são ilustrativos.",
      pEy: "Plataforma", pH: "Tudo o que você precisa para decidir o que publicar",
      pL: "Catorze telas sobre um mesmo motor. Cada número mostra de onde vem e cada recomendação explica por quê.",
      f1t: "Análise por rede", f1p: "Seguidores, alcance, engajamento, cliques e publicações de 8 redes, com mapa de calor do melhor horário por dia e hora e desempenho por formato.",
      f2t: "Benchmark da concorrência", f2p: "Share of voice, crescimento, quem está acelerando, lacunas de formato e de tema e as publicações que mais funcionam para eles.",
      f3t: "Rankings estilo Social Blade", f3p: "Notas de A++ a D−, estatísticas diárias, projeções de seguidores de 30 dias a 5 anos, próximo marco e receita estimada por CPM.",
      f4t: "Escuta social", f4p: "Sentimento explicável em três idiomas —mostra quais palavras o definiram— e alertas de picos com causa provável: cidade e tema.",
      f5t: "Busca avançada", f5p: "Operadores <code>red:</code>, <code>pais:</code>, <code>ciudad:</code>, <code>marca:</code>, <code>formato:</code>, <code>sent:</code>, <code>tema:</code> e <code>\"frase exata\"</code>, além de radar de tendências por país e ideias de conteúdo.",
      f6t: "Público e filtros", f6p: "Filtre tudo por país, cidade, idade, gênero, interesse, formato e período. As telas se recalculam na hora.",
      f7t: "Planejador", f7p: "Validação por rede (tamanho, imagem, hashtags), melhores horários segundo seus dados, calendário e fila exportável em CSV. Não publica sozinho: quem decide é você.",
      f8t: "Caixa de entrada unificada", f8p: "Comentários e mensagens de todas as redes em uma lista, ordenados por urgência, com respostas sugeridas para editar.",
      f9t: "Campanhas", f9p: "Construtor de UTM, acompanhamento por campanha e ROI <strong>estimado</strong>, marcado como estimativa em cada tela.",
      f10t: "Sugestões priorizadas", f10p: "Regras que pontuam cada ação por impacto × probabilidade ÷ esforço e a classificam como Urgente, Alta, Média ou Baixa.",
      f11t: "Assistente IA", f11p: "Claude, ChatGPT, Gemini, Groq, Mistral, DeepSeek, Grok ou Ollama. E um motor local que responde «e se…?» sem nenhuma chave.",
      f12t: "Relatórios e exportação", f12p: "Relatório executivo em HTML pronto para enviar e exportações CSV de cada tabela.",
      f13t: "Seus dados reais por CSV", f13p: "Importe as exportações do Meta Business Suite, TikTok Studio, LinkedIn, X e YouTube Studio. São processadas no seu PC.",
      f14t: "Desktop e web", f14p: "Instalador para Windows e a mesma interface no navegador para testar. Trilíngue de ponta a ponta.",
      cEy: "O melhor de cada ferramenta", cH: "As ideias que funcionam no mercado, sobre um motor próprio",
      cL: "Cada categoria tem uma ferramenta que a tornou conhecida. Reunimos essas funções em um só app. A tabela compara funções, não preços nem qualidade de terceiros.",
      cAria: "Comparativo de funções",
      cC1: "Função", cC2: "Referência da categoria", cC3: "No MV Marketing Digital",
      c1a: "Melhor horário para publicar", c1c: "Mapa de calor 7 × 24 por rede com seus próprios dados",
      c2a: "Benchmark de concorrentes", c2c: "Share of voice, aceleração e lacunas de formato e tema",
      c3a: "Caixa de entrada unificada", c3c: "Todas as redes em uma lista, por urgência, com resposta sugerida",
      c4a: "Fila e calendário de publicações", c4c: "Validação por rede e fila exportável (sem publicação automática)",
      c5a: "Escuta social e sentimento", c5c: "Sentimento explicável ES/EN/PT e alertas de picos com causa provável",
      c6a: "Campanhas, UTM e retorno", c6c: "Construtor de UTM e ROI estimado por campanha",
      c7a: "Rankings, notas e projeções", c7c: "Notas A++–D−, estatísticas diárias, projeção de 5 anos e próximo marco",
      c8a: "Assistente com IA", c8b: "Várias", c8c: "8 provedores à escolha + what-if local sem chave",
      c9a: "Relatórios", c9b: "Todas", c9c: "Relatório executivo HTML e CSV de cada tabela",
      cNota: "As marcas citadas pertencem a seus respectivos donos e são mencionadas só como referência de categoria. O MV Marketing Digital não tem afiliação com elas nem usa seu código.",
      rEy: "Rankings e projeções", rH: "Saiba onde você está e para onde vai",
      rL: "Cada conta —sua ou da concorrência— recebe uma nota e uma ficha com sua história e seu futuro provável.",
      r1: "<b>Nota de A++ a D−</b> combinando tamanho (40%), crescimento de 30 dias (35%) e engajamento (25%), em percentis.",
      r2: "<b>Estatísticas diárias</b>: ganho de seguidores, impressões, interações e publicações dia a dia.",
      r3: "<b>Projeções de 30 dias a 5 anos</b> com faixa de confiança e crescimento amortecido; os horizontes longos são marcados como extrapolação.",
      r4: "<b>Próximo marco</b> (por exemplo, 100 mil seguidores) e a data estimada para alcançá-lo.",
      r5: "<b>Receita estimada por CPM</b>: uma faixa que você ajusta ao seu mercado, nunca apresentada como receita real.",
      rAria: "Exemplo de ficha de ranking com dados sintéticos",
      rmSub: "#1 em seguidores · #3 em engajamento",
      rmK1: "Seguidores", rmK2: "Média diária", rmK3: "Ritmo mensal",
      rmGraf: "Histórico e projeção com faixa de confiança",
      rmH1: "Horizonte", rmH2: "Estimado", rmH3: "Faixa 90%",
      rmP1: "30 dias", rmP2: "6 meses", rmP3: "5 anos", rmEx: "extrapolação",
      rmNota: "Exemplo com dados sintéticos da demo: marca e números fictícios.",
      iEy: "Assistente IA", iH: "Escolha sua IA. Ou nenhuma.",
      iL: "A IA soma, não condiciona: o motor de regras, as sugestões e o simulador local funcionam sem chave. Se você conectar um provedor, o assistente responde qualquer pergunta sobre suas métricas.",
      iAria: "Provedores compatíveis", iLocal: "(local)",
      i1t: "Chaves criptografadas no seu PC", i1p: "A chave é guardada criptografada com o armazenamento seguro do sistema operacional e só é usada pelo processo principal do app. Nunca vai para os nossos servidores nem fica exposta na interface.",
      i2t: "Modelos sempre atualizados", i2p: "A cada 7 dias o app atualiza a lista de modelos de cada provedor e recomenda o mais novo. Se sair um modelo melhor, você não precisa esperar uma atualização.",
      i3t: "«E se…?» sem chave", i3p: "Pergunte «e se eu publicar 3 reels a mais por semana no Instagram?» e o motor local estima o efeito com uma faixa provável, a partir dos seus próprios dados.",
      iPriv: "<b>Privacidade:</b> para o provedor de IA vão só métricas agregadas. Os textos e autores de comentários de terceiros não saem do seu computador.",
      fEy: "Filtros e busca", fH: "Do global a uma cidade, em um clique",
      fL: "Cada tela responde aos mesmos filtros. Veja como você está em um país, em uma cidade ou com um público, e busque em tudo o que se diz de você e da concorrência.",
      fAria: "Filtros disponíveis",
      fc1: "País", fc2: "Cidade", fc3: "Idade", fc4: "Gênero", fc5: "Interesse", fc6: "Formato", fc7: "Rede", fc8: "Período",
      fCons: "Busca avançada",
      fConsP: "Os resultados vêm com o sentimento explicado, o radar de tendências do país e ideias de conteúdo para aproveitá-las.",
      dEy: "Downloads", dH: "Instale ou teste no navegador",
      d1t: "Windows", d1p: "Instalador <code>.exe</code> (NSIS) para Windows 10 e 11 de 64 bits. Você escolhe a pasta, ele cria o atalho e funciona sem conexão, exceto o assistente com IA externa.",
      d1b: "Baixar para Windows",
      d1n: "O instalador é compilado pelo GitHub Actions a cada versão marcada e publicado na página de versões do repositório.",
      d2t: "Demo web", d2p: "A mesma interface, no navegador e sem instalar nada. Usa dados 100% sintéticos e o assistente funciona com o motor local de regras.",
      d2b: "Abrir a demo web",
      d2n: "Para trabalhar com seus dados reais, instale o app e importe os CSV de cada rede.",
      qEy: "Perguntas", qH: "O que mais nos perguntam",
      q1: "Publica automaticamente nas minhas redes?",
      a1: "Não. O planejador monta o calendário e a fila, valida cada publicação conforme a rede e sugere o melhor horário, mas não publica em seu nome: você exporta a fila em CSV e publica, ou a carrega na ferramenta oficial de cada rede.",
      q2: "Os dados são reais?",
      a2: "Os da demo, não: são 100% sintéticos, com marcas fictícias e semente fixa, para você explorar tudo sem conectar nada. Para trabalhar com seus dados reais, importe os CSV exportados pelo Meta Business Suite, TikTok Studio, LinkedIn, X e YouTube Studio.",
      q3: "Onde ficam guardadas minhas chaves de IA?",
      a3: "No seu PC, criptografadas com o armazenamento seguro do sistema operacional. Só o processo principal do app as usa para chamar o provedor que você escolheu; não passam por nenhum servidor nosso. A demo web não aceita chaves.",
      q4: "Preciso de uma chave de IA para usar?",
      a4: "Não. Métricas, rankings, sugestões, alertas e o simulador «e se…?» funcionam com o motor local. A chave só acrescenta respostas abertas a qualquer pergunta.",
      q5: "Quão confiáveis são as projeções e o ROI?",
      a5: "São estimativas e o app as marca assim. As projeções usam uma regressão sobre os últimos 90 dias com crescimento amortecido e mostram uma faixa de confiança; além de um ano são sinalizadas como extrapolação. O ROI e a receita por CPM dependem de premissas que você pode ajustar.",
      q6: "Os números desta página são resultados de clientes?",
      a6: "Não. Todas as capturas, o vídeo e o exemplo de ficha saem da demo sintética e ilustram o funcionamento do produto. Não publicamos depoimentos nem avaliações.",
      q7: "Em quais idiomas está?",
      a7: "Português, espanhol e inglês, tanto a interface quanto o sentimento da escuta social e o assistente.",
      legal: "Análise de redes sociais próprias e da concorrência com assistente IA. Os dados da demo, o vídeo e as capturas são sintéticos e os números de impacto são ilustrativos. As marcas de terceiros pertencem aos seus donos.",
      rights: "Todos os direitos reservados."
    }
  };

  // El español sale del propio HTML: se guarda antes de tocar nada para poder volver.
  var ORIG = { _title: document.title, _desc: "" };
  var meta = document.querySelector('meta[name="description"]');
  if (meta) ORIG._desc = meta.getAttribute("content");
  var ATRIBUTOS = [["data-i", null], ["data-i-ph", "placeholder"], ["data-i-alt", "alt"], ["data-i-aria", "aria-label"]];
  ATRIBUTOS.forEach(function (par) {
    document.querySelectorAll("[" + par[0] + "]").forEach(function (el) {
      var k = el.getAttribute(par[0]);
      ORIG[k] = par[1] ? el.getAttribute(par[1]) : el.innerHTML;
    });
  });

  function leer() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return null; }
  }
  function guardar(l) {
    try { localStorage.setItem(CLAVE, l); } catch (e) { /* modo privado: no pasa nada */ }
  }

  function inicial() {
    var q = new URLSearchParams(location.search).get("lang");
    if (IDIOMAS.indexOf(q) >= 0) return q;
    var g = leer();
    if (IDIOMAS.indexOf(g) >= 0) return g;
    var nav = (navigator.language || "es").slice(0, 2).toLowerCase();
    return IDIOMAS.indexOf(nav) >= 0 ? nav : "es";
  }

  // El video tiene una versión por idioma; sólo se recarga si cambia y no se
  // está reproduciendo a mitad de camino en el mismo idioma.
  function video(lang) {
    var v = document.getElementById("demoVideo");
    if (!v) return;
    var src = "/video/demo-" + lang + ".mp4";
    var s = v.querySelector("source");
    if (s && s.getAttribute("src") === src) return;
    if (s) s.setAttribute("src", src);
    v.load();
  }

  function aplicar(lang) {
    var d = lang === "es" ? ORIG : I18N[lang];
    ATRIBUTOS.forEach(function (par) {
      document.querySelectorAll("[" + par[0] + "]").forEach(function (el) {
        var k = el.getAttribute(par[0]);
        var txt = d[k] != null ? d[k] : ORIG[k]; // sin traducción: queda el español
        if (txt == null) return;
        if (par[1]) el.setAttribute(par[1], txt); else el.innerHTML = txt;
      });
    });
    document.documentElement.lang = lang;
    document.title = d._title || ORIG._title;
    if (meta) meta.setAttribute("content", d._desc || ORIG._desc);
    var sel = document.getElementById("langSel");
    if (sel) sel.value = lang;
    // La demo web abre en el mismo idioma que la landing.
    document.querySelectorAll('a[href^="/app/"]').forEach(function (a) { a.setAttribute("href", "/app/?lang=" + lang); });
    video(lang);
  }

  var sel = document.getElementById("langSel");
  if (sel) {
    sel.addEventListener("change", function () {
      var l = sel.value;
      guardar(l);
      var u = new URL(location.href);
      u.searchParams.set("lang", l);
      history.replaceState(null, "", u.pathname + u.search + u.hash);
      aplicar(l);
    });
  }

  var l0 = inicial();
  guardar(l0);
  aplicar(l0);
})();
