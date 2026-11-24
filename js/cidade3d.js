/* ==========================================================================
   Laitu: bairro em 3D na abertura
   Os quarteirões reagem ao mouse e ao toque. O prédio âmbar (o negócio do
   cliente) cresce com a rolagem. Pausa fora da tela e desliga se o aparelho
   não conseguir manter a fluidez.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('cidade');
  var hero = document.querySelector('.hero');
  if (!canvas || !hero || !window.THREE) return;

  var celular = innerWidth < 1000;
  var COLUNAS = celular ? 18 : 34;
  var LINHAS = celular ? 22 : 24;
  var PASSO = 1.18;
  var RUA = .42;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, alpha: true, antialias: !celular, powerPreference: 'low-power'
    });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, celular ? 1.25 : 1.6));
  renderer.setClearColor(0x000000, 0);

  var cena = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(21, 1, .1, 160);
  var foco = new THREE.Vector3();

  /* Luzes */
  cena.add(new THREE.AmbientLight(0x9fc0d0, .55));
  var sol = new THREE.DirectionalLight(0xffe6c4, .62);
  sol.position.set(-8, 16, 9);
  cena.add(sol);

  /* Sorteio fixo: o bairro é sempre igual */
  var semente = 7;
  function sorteio() {
    semente = (semente * 16807) % 2147483647;
    return (semente - 1) / 2147483646;
  }

  /* Quarteirões */
  var caixa = new THREE.BoxGeometry(.96, 1, .96);
  caixa.translate(0, .5, 0);
  var material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  var total = COLUNAS * LINHAS;
  var predios = new THREE.InstancedMesh(caixa, material, total);
  predios.frustumCulled = false;
  cena.add(predios);

  var dados = [];
  var cor = new THREE.Color();
  var corA = new THREE.Color(0x10344A);
  var corB = new THREE.Color(0x1D4E69);
  var largura = (COLUNAS - 1) * PASSO + Math.floor((COLUNAS - 1) / 4) * RUA;
  var fundo = (LINHAS - 1) * PASSO + Math.floor((LINHAS - 1) / 4) * RUA;

  for (var c = 0; c < COLUNAS; c++) {
    for (var l = 0; l < LINHAS; l++) {
      var x = c * PASSO + Math.floor(c / 4) * RUA - largura / 2;
      var z = l * PASSO + Math.floor(l / 4) * RUA - fundo / 2;
      var r = sorteio();
      dados.push({ x: x, z: z, base: .22 + r * r * 1.9, atual: .05 });
      cor.copy(corA).lerp(corB, sorteio());
      predios.setColorAt(dados.length - 1, cor);
    }
  }
  predios.instanceColor.needsUpdate = true;

  /* Prédio do cliente, escolhido perto do ponto de destaque da tela */
  var destaqueX = celular ? 1.2 : 7.6;
  var destaqueZ = celular ? -7.5 : -2.4;
  var indiceDestaque = 0, menor = Infinity;
  dados.forEach(function (d, i) {
    var dist = (d.x - destaqueX) * (d.x - destaqueX) + (d.z - destaqueZ) * (d.z - destaqueZ);
    if (dist < menor) { menor = dist; indiceDestaque = i; }
  });
  var alvoPredio = dados[indiceDestaque];
  alvoPredio.base = 0;

  /* Cores fixas por face: o âmbar da marca não estoura com as luzes */
  var ambar = new THREE.MeshBasicMaterial({ color: 0xF2A33A });
  var ambarTopo = new THREE.MeshBasicMaterial({ color: 0xF7B55C });
  var ambarLado = new THREE.MeshBasicMaterial({ color: 0xC47A1E });
  var predioAmbar = new THREE.Mesh(caixa, [ambarLado, ambarLado, ambarTopo, ambar, ambar, ambarLado]);
  predioAmbar.position.set(alvoPredio.x, 0, alvoPredio.z);
  cena.add(predioAmbar);

  /* Seta de crescimento da marca */
  var seta = new THREE.Group();
  var ponta = new THREE.Mesh(new THREE.ConeGeometry(.62, .72, 4), ambar);
  ponta.rotation.y = Math.PI / 4;
  ponta.position.y = .62;
  var haste = new THREE.Mesh(new THREE.BoxGeometry(.3, .5, .3), ambar);
  haste.position.y = .05;
  seta.add(ponta, haste);
  seta.position.set(alvoPredio.x, 2, alvoPredio.z);
  cena.add(seta);

  var brilho = new THREE.PointLight(0xF2A33A, .95, 8, 1.6);
  cena.add(brilho);

  /* Mouse e toque */
  var raio = new THREE.Raycaster();
  var plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  var ndc = new THREE.Vector2(0, 0);
  var ponto = new THREE.Vector3(999, 0, 999);
  var parallax = { x: 0, y: 0 };
  var forca = 0, alvoForca = 0, ultimoToque = 0;

  function aoMover(e) {
    var caixaHero = hero.getBoundingClientRect();
    if (e.clientY > caixaHero.bottom) return;
    ndc.x = (e.clientX / innerWidth) * 2 - 1;
    ndc.y = -((e.clientY - caixaHero.top) / caixaHero.height) * 2 + 1;
    raio.setFromCamera(ndc, camera);
    raio.ray.intersectPlane(plano, ponto);
    alvoForca = 1;
    ultimoToque = performance.now();
  }
  addEventListener('pointermove', aoMover, { passive: true });
  addEventListener('pointerdown', aoMover, { passive: true });

  /* Tamanho */
  function ajustar() {
    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', ajustar, { passive: true });
  ajustar();

  /* Laço de desenho */
  var auxiliar = new THREE.Object3D();
  var visivel = true, rodando = false, ligado = true;
  var inicio = performance.now(), anterior = inicio;
  var somaQuadros = 0, quadros = 0;
  var alturaAmbar = .1;

  function desenhar(agora) {
    if (!ligado || !visivel || document.hidden) { rodando = false; return; }
    requestAnimationFrame(desenhar);

    /* Se ficar lento, desliga o 3D e mantém o fundo em CSS */
    var delta = agora - anterior;
    anterior = agora;
    if (delta < 250) { somaQuadros += delta; quadros++; }
    if (quadros === 90) {
      if (somaQuadros / quadros > 42) { desligar(); return; }
      somaQuadros = 0; quadros = 0;
    }

    var progresso = Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight)));
    var entrada = Math.min(1, (agora - inicio) / 1400);
    entrada = 1 - Math.pow(1 - entrada, 3);

    if (agora - ultimoToque > 1400) alvoForca = 0;
    forca += (alvoForca - forca) * .06;

    /* Quarteirões */
    for (var i = 0; i < dados.length; i++) {
      var d = dados[i];
      var alvo = .05;
      if (i !== indiceDestaque) {
        var dx = d.x - ponto.x, dz = d.z - ponto.z;
        alvo = (d.base + Math.exp(-(dx * dx + dz * dz) / 6.5) * 1.5 * forca) * entrada;
      }
      d.atual += (alvo - d.atual) * .11;
      auxiliar.position.set(d.x, 0, d.z);
      auxiliar.scale.set(1, Math.max(.04, d.atual), 1);
      auxiliar.updateMatrix();
      predios.setMatrixAt(i, auxiliar.matrix);
    }
    predios.instanceMatrix.needsUpdate = true;

    /* Prédio âmbar cresce com a rolagem */
    var alvoAmbar = (2.5 + progresso * 4.2) * entrada;
    alturaAmbar += (alvoAmbar - alturaAmbar) * .09;
    predioAmbar.scale.y = Math.max(.05, alturaAmbar);
    seta.position.y = alturaAmbar + .55 + Math.sin(agora * .0016) * .09;
    seta.visible = entrada > .25;
    brilho.position.set(alvoPredio.x + .3, alturaAmbar * .65 + .6, alvoPredio.z + 1.3);

    /* Câmera */
    parallax.x += ((ndc.x * forca) - parallax.x) * .04;
    parallax.y += ((ndc.y * forca) - parallax.y) * .04;
    var distancia = celular ? 1.78 : 1.74;
    camera.position.set(
      (celular ? 1 : 0) + parallax.x * 1.1,
      (17.5 - progresso * 3) * distancia + parallax.y * .6,
      (17 - progresso * 3.5) * distancia
    );
    foco.set(celular ? 1 : 0, progresso * 1.4, celular ? -2.4 : -.5);
    camera.lookAt(foco);

    renderer.render(cena, camera);
  }

  function retomar() {
    if (rodando || !ligado || !visivel || document.hidden) return;
    rodando = true;
    anterior = performance.now();
    requestAnimationFrame(desenhar);
  }

  function desligar() {
    ligado = false;
    document.documentElement.classList.remove('tres-ativo');
    removeEventListener('pointermove', aoMover);
    removeEventListener('pointerdown', aoMover);
    setTimeout(function () { renderer.dispose(); }, 1100);
  }

  new IntersectionObserver(function (itens) {
    visivel = itens[0].isIntersecting;
    retomar();
  }).observe(hero);
  document.addEventListener('visibilitychange', retomar);

  document.documentElement.classList.add('tres-ativo');
  retomar();
})();
