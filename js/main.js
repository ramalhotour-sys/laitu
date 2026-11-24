/* ==========================================================================
   Laitu: interações da página
   Se uma biblioteca externa falhar, o conteúdo continua visível e utilizável.
   ========================================================================== */
(function () {
  'use strict';

  var raiz = document.documentElement;
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var temGsap = !!(window.gsap && window.ScrollTrigger);
  var animar = temGsap && !calmo;
  var lenis = null;

  /* --- Utilitários ------------------------------------------------------ */
  function todos(seletor) {
    return Array.prototype.slice.call(document.querySelectorAll(seletor));
  }

  function liberarPagina() {
    raiz.classList.remove('carregando');
    try { sessionStorage.setItem('laitu-abertura', '1'); } catch (e) {}
    if (lenis) lenis.start();
  }

  /* Separa um texto em palavras para animar, mantendo a leitura por voz. */
  function separarPalavras(el, comMascara) {
    var texto = el.textContent.trim();
    el.setAttribute('aria-label', texto);
    el.innerHTML = texto.split(/\s+/).map(function (p) {
      return comMascara
        ? '<span class="pal" aria-hidden="true"><span>' + p + '</span></span>'
        : '<span aria-hidden="true">' + p + '</span>';
    }).join(' ');
    return el.querySelectorAll(comMascara ? '.pal > span' : 'span');
  }

  /* --- Topo e menu do celular ------------------------------------------- */
  var topo = document.querySelector('.topo');
  var botaoMenu = document.querySelector('.menu-botao');

  function fecharMenu() {
    topo.classList.remove('aberto');
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.setAttribute('aria-label', 'Abrir menu');
  }

  botaoMenu.addEventListener('click', function () {
    var abrir = !topo.classList.contains('aberto');
    topo.classList.toggle('aberto', abrir);
    botaoMenu.setAttribute('aria-expanded', String(abrir));
    botaoMenu.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && topo.classList.contains('aberto')) {
      fecharMenu();
      botaoMenu.focus();
    }
  });

  function marcarRolagem() { topo.classList.toggle('rolou', window.scrollY > 24); }
  addEventListener('scroll', marcarRolagem, { passive: true });
  marcarRolagem();

  /* --- Simulação de busca ----------------------------------------------- */
  var nichos = {
    padaria: { termo: 'padaria perto de mim', nome: 'Sua padaria' },
    dentista: { termo: 'dentista perto de mim', nome: 'Seu consultório' },
    advogado: { termo: 'advogado no meu bairro', nome: 'Seu escritório' },
    restaurante: { termo: 'restaurante aberto agora', nome: 'Seu restaurante' }
  };
  var botoesNicho = todos('.nichos button');
  botoesNicho.forEach(function (botao) {
    botao.addEventListener('click', function () {
      var dado = nichos[botao.dataset.nicho];
      document.getElementById('termo').textContent = dado.termo;
      document.getElementById('nome-negocio').textContent = dado.nome;
      botoesNicho.forEach(function (b) { b.setAttribute('aria-pressed', String(b === botao)); });
    });
  });

  /* --- Carrossel de serviços --------------------------------------------- */
  (function () {
    var trilho = document.querySelector('.trilho');
    if (!trilho) return;
    var cartoes = todos('.trilho .serv');
    var pontos = todos('.pontos button');
    var setas = todos('.seta-btn');
    var atual = 0;

    /* Posição de rolagem em que cada cartão fica em destaque */
    function posicao(i) {
      var limite = trilho.scrollWidth - trilho.clientWidth;
      var centro = cartoes[i].offsetLeft + cartoes[i].offsetWidth / 2 - trilho.clientWidth / 2;
      return Math.max(0, Math.min(limite, centro));
    }

    /* Efeito: o cartão central fica em destaque e os vizinhos giram e recuam */
    var pedido = 0;
    function aplicarEfeito() {
      pedido = 0;
      if (calmo) return;
      var meio = trilho.scrollLeft + trilho.clientWidth / 2;
      cartoes.forEach(function (c) {
        var passo = c.offsetWidth + 16;
        var d = (c.offsetLeft + c.offsetWidth / 2 - meio) / passo;
        var perto = Math.min(1, Math.abs(d));
        c.style.transform = 'perspective(1100px) rotateY(' + (Math.max(-1, Math.min(1, d)) * -16).toFixed(2) +
          'deg) scale(' + (1 - perto * .12).toFixed(3) + ')';
        c.style.opacity = (1 - perto * .42).toFixed(3);
      });
    }
    function pedirEfeito() {
      if (!pedido) pedido = requestAnimationFrame(aplicarEfeito);
    }
    function maisProximo() {
      var melhor = 0, menor = Infinity;
      cartoes.forEach(function (c, i) {
        var dist = Math.abs(posicao(i) - trilho.scrollLeft);
        if (dist < menor) { menor = dist; melhor = i; }
      });
      return melhor;
    }
    function marcar(i) {
      atual = i;
      pontos.forEach(function (p, n) {
        if (n === i) p.setAttribute('aria-current', 'true');
        else p.removeAttribute('aria-current');
      });
      setas[0].disabled = i === 0;
      setas[1].disabled = i === cartoes.length - 1;
    }
    /* Enquanto o cartão desliza até o destino, o ponto não muda sozinho */
    var indo = false, quadroIda = 0;
    function pararIda() {
      cancelAnimationFrame(quadroIda);
      indo = false;
      trilho.classList.remove('deslizando');
    }
    function mostrar(i) {
      i = Math.max(0, Math.min(cartoes.length - 1, i));
      marcar(i);
      pararIda();
      var destino = posicao(i);
      if (calmo) { trilho.scrollLeft = destino; return; }

      /* Transição própria: acelera, desliza e freia suavemente */
      var origem = trilho.scrollLeft, comeco = null;
      indo = true;
      trilho.classList.add('deslizando');
      function quadro(agora) {
        if (comeco === null) comeco = agora;
        var p = Math.min(1, (agora - comeco) / 620);
        var curva = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        trilho.scrollLeft = origem + (destino - origem) * curva;
        if (p < 1) quadroIda = requestAnimationFrame(quadro);
        else pararIda();
      }
      quadroIda = requestAnimationFrame(quadro);
    }

    pontos.forEach(function (p, i) { p.addEventListener('click', function () { mostrar(i); }); });
    setas.forEach(function (s) {
      s.addEventListener('click', function () { mostrar(atual + Number(s.dataset.dir)); });
    });

    var espera;
    trilho.addEventListener('scroll', function () {
      pedirEfeito();
      if (indo || trilho.classList.contains('arrastando')) return;
      clearTimeout(espera);
      espera = setTimeout(function () { marcar(maisProximo()); }, 90);
    }, { passive: true });
    addEventListener('resize', function () {
      trilho.scrollLeft = posicao(atual);
      pedirEfeito();
    }, { passive: true });

    /* Arrastar com o mouse (no toque, o deslize já é nativo) */
    var inicioX = 0, inicioScroll = 0, apertado = false, moveu = false;
    trilho.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      pararIda();
      apertado = true; moveu = false;
      inicioX = e.clientX;
      inicioScroll = trilho.scrollLeft;
    });
    addEventListener('pointermove', function (e) {
      if (!apertado) return;
      var dx = e.clientX - inicioX;
      if (!moveu && Math.abs(dx) < 6) return;
      moveu = true;
      trilho.classList.add('arrastando');
      trilho.scrollLeft = inicioScroll - dx;
    });
    addEventListener('pointerup', function (e) {
      if (!apertado) return;
      apertado = false;
      if (!moveu) return;
      var dx = e.clientX - inicioX;
      var destino = Math.abs(dx) > 60 ? atual + (dx < 0 ? 1 : -1) : atual;
      trilho.classList.remove('arrastando');
      mostrar(destino);
    });
    /* Quem arrastou não deve abrir o WhatsApp sem querer */
    trilho.addEventListener('click', function (e) {
      if (moveu) { e.preventDefault(); e.stopPropagation(); moveu = false; }
    }, true);
    trilho.addEventListener('dragstart', function (e) { e.preventDefault(); });

    marcar(0);
    aplicarEfeito();
  })();

  /* --- Vídeo: mostra o 1º frame e só depois carrega o vídeo -------------- */
  function carregarVideo() {
    var caixa = document.querySelector('.hero-video');
    var conexao = navigator.connection || {};
    if (!caixa || caixa.dataset.videoAtivo !== 'true' || calmo || conexao.saveData) return;

    var video = caixa.querySelector('video');
    var celular = document.createElement('source');
    celular.src = caixa.dataset.fonteCelular;
    celular.type = 'video/mp4';
    celular.media = '(max-width: 767px)';
    var grande = document.createElement('source');
    grande.src = caixa.dataset.fonte;
    grande.type = 'video/mp4';
    video.appendChild(celular);
    video.appendChild(grande);
    video.addEventListener('canplaythrough', function () {
      var tocar = video.play();
      if (tocar && tocar.then) tocar.then(function () { video.classList.add('pronto'); }).catch(function () {});
    }, { once: true });
    video.load();
  }

  /* --- 3D: entra depois do conteúdo e só em aparelhos capazes ------------ */
  function aparelhoAguenta3D() {
    var conexao = navigator.connection || {};
    if (calmo || conexao.saveData) return false;
    if ((navigator.hardwareConcurrency || 4) <= 2) return false;
    if ((navigator.deviceMemory || 4) <= 2) return false;
    try {
      var teste = document.createElement('canvas');
      return !!(teste.getContext('webgl2') || teste.getContext('webgl'));
    } catch (e) { return false; }
  }

  function carregarScript(url, pronto) {
    var s = document.createElement('script');
    s.src = url;
    s.onload = pronto;
    document.body.appendChild(s);
  }

  function carregar3D() {
    if (!aparelhoAguenta3D()) return;
    carregarScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', function () {
      carregarScript('js/cidade3d.js');
    });
  }

  function depoisDaPagina() {
    carregarVideo();
    var ocioso = window.requestIdleCallback || function (fn) { setTimeout(fn, 400); };
    ocioso(carregar3D, { timeout: 2000 });
  }
  if (document.readyState === 'complete') depoisDaPagina();
  else addEventListener('load', depoisDaPagina, { once: true });

  /* Sem GSAP ou com movimento reduzido: página estática e funcional. */
  if (!animar) {
    liberarPagina();
    todos('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', fecharMenu);
    });
    return;
  }

  /* ======================================================================
     Daqui em diante: animações
     ====================================================================== */
  gsap.registerPlugin(ScrollTrigger);
  raiz.classList.add('animado');

  /* --- Scroll suave ------------------------------------------------------ */
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (tempo) { lenis.raf(tempo * 1000); });
    gsap.ticker.lagSmoothing(0);
    if (raiz.classList.contains('carregando')) lenis.stop();
  }

  /* --- Transição entre seções (cortina) ---------------------------------- */
  var cortina = document.querySelector('.cortina');
  var emTransicao = false;

  function irPara(alvo, hash) {
    function pular() {
      if (lenis) lenis.scrollTo(alvo, { immediate: true, force: true, offset: alvo.id === 'inicio' ? 0 : -64 });
      else alvo.scrollIntoView();
      ScrollTrigger.update();
      alvo.setAttribute('tabindex', '-1');
      alvo.focus({ preventScroll: true });
      history.pushState(null, '', hash);
    }
    emTransicao = true;
    gsap.timeline({ onComplete: function () { emTransicao = false; } })
      .set(cortina, { autoAlpha: 1, yPercent: 101, y: 0 })
      .to(cortina, { yPercent: 0, duration: .36, ease: 'power3.inOut' })
      .add(pular)
      .to(cortina, { yPercent: -101, duration: .44, ease: 'power3.inOut' }, '+=.04')
      .set(cortina, { autoAlpha: 0 });
  }

  todos('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var hash = link.getAttribute('href');
      var alvo = hash.length > 1 && document.querySelector(hash);
      if (!alvo) return;
      e.preventDefault();
      fecharMenu();
      if (!emTransicao) irPara(alvo, hash);
    });
  });

  /* --- Sequência de entrada (até ~2,3 s) --------------------------------- */
  var palavrasHero = separarPalavras(document.querySelector('.hero-titulo'), true);
  var restoHero = ['.hero-apoio', '.hero-acoes'];
  gsap.set(palavrasHero, { yPercent: 115 });
  gsap.set(restoHero, { autoAlpha: 0, y: 16 });

  function entrada() {
    var comAbertura = raiz.classList.contains('carregando');
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (comAbertura) {
      tl.from('.pre-l', { scaleY: 0, transformOrigin: '50% 100%', duration: .4 })
        .from('.pre-pe', { scaleX: 0, transformOrigin: '0% 50%', duration: .26 }, '-=.1')
        .from('.pre-seta', { y: 26, autoAlpha: 0, duration: .36 }, '-=.04')
        .from('.pre-nome', { yPercent: 115, duration: .4 }, '-=.3')
        .to('.pre', { yPercent: -100, duration: .56, ease: 'power4.inOut', onComplete: liberarPagina }, '+=.1');
    } else {
      liberarPagina();
    }

    tl.to(palavrasHero, { yPercent: 0, duration: .66, stagger: .035 }, comAbertura ? '-=.26' : 0)
      .to(restoHero, { autoAlpha: 1, y: 0, duration: .45, stagger: .08 }, '-=.36');
  }

  /* Espera as fontes por no máximo 700 ms para não atrasar a leitura. */
  var fontes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontes, new Promise(function (ok) { setTimeout(ok, 700); })]).then(entrada);

  /* --- Animações com scroll ---------------------------------------------- */
  /* Conteúdo da abertura sobe devagar ao rolar */
  gsap.to('.hero-conteudo', {
    y: -70, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* Busca: o negócio passa os concorrentes conforme a rolagem */
  var seu = document.querySelector('.resultado.seu');
  var concorrenteA = document.querySelector('.r-a');
  var concorrenteB = document.querySelector('.r-b');
  function passo() {
    var lista = seu.parentElement;
    return seu.offsetHeight + parseFloat(getComputedStyle(lista).rowGap || 8);
  }
  gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: '.busca-secao', start: 'top top', end: 'bottom bottom',
      scrub: .5, invalidateOnRefresh: true
    }
  })
    .fromTo(seu, { y: function () { return passo() * 2; } }, { y: function () { return passo(); }, duration: 1 }, .1)
    .fromTo(concorrenteB, { y: function () { return -passo(); } }, { y: 0, duration: 1 }, .1)
    .fromTo(concorrenteA, { y: function () { return -passo(); } }, { y: 0, duration: 1 }, 1.3)
    .to(seu, { y: 0, duration: 1 }, 1.3)
    .to({}, { duration: .3 });

  /* Títulos surgem por máscara */
  todos('.secao-topo h2, .provas h2, .perguntas h2, .contato h2').forEach(function (titulo) {
    var p = separarPalavras(titulo, true);
    gsap.from(p, {
      yPercent: 115, duration: .75, stagger: .04, ease: 'power3.out',
      scrollTrigger: { trigger: titulo, start: 'top 88%', once: true }
    });
  });

  /* Serviços: o carrossel entra deslizando da direita */
  gsap.from('.trilho', {
    x: 90, autoAlpha: 0, duration: .8, ease: 'power3.out',
    clearProps: 'transform,opacity,visibility',
    scrollTrigger: { trigger: '.trilho', start: 'top 86%', once: true }
  });

  /* Diferenciais: palavras acendem com a rolagem */
  var manifesto = document.querySelector('.manifesto-texto');
  gsap.fromTo(separarPalavras(manifesto, false), { opacity: .2 }, {
    opacity: 1, stagger: .06, ease: 'none',
    scrollTrigger: { trigger: manifesto, start: 'top 78%', end: 'bottom 52%', scrub: .4 }
  });

  /* Foto: abre com recorte e tem parallax leve */
  gsap.from('.foto', {
    clipPath: 'inset(100% 0 0 0 round 20px)', duration: 1, ease: 'power3.inOut',
    scrollTrigger: { trigger: '.foto', start: 'top 82%', once: true }
  });
  gsap.fromTo('.foto > *', { yPercent: -15 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.foto', start: 'top bottom', end: 'bottom top', scrub: true }
  });

  /* Blocos simples */
  todos('.quem-texto, .provas-lista li, .faq details, .dados > div').forEach(function (el) {
    gsap.from(el, {
      y: 18, autoAlpha: 0, duration: .55, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });

  /* A altura muda ao abrir uma pergunta */
  todos('.faq details').forEach(function (item) {
    item.addEventListener('toggle', function () { ScrollTrigger.refresh(); });
  });

  addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });
})();
