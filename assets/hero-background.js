/* Method Magic — animated hero background
 * Usage: see README.txt / index.html. Attach with:
 *   MethodMagicHeroBG.init(document.querySelector('.mm-hero-bg'));
 */
(function () {
  function init(container, opts) {
    opts = opts || {};
    var motionSpeed = opts.motionSpeed || 1;
    var particleDensity = opts.particleDensity || 1;

    var canvas = container.querySelector('canvas.mm-hero-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'mm-hero-canvas';
      container.appendChild(canvas);
    }
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0;
    var dust = [], webs = [];
    var raf = null;

    function rand(a, b) { return a + Math.random() * (b - a); }

    function makeWeb(cx, cy, spanX, spanY, nodeCount, hueMix) {
      var nodes = [], i;
      for (i = 0; i < nodeCount; i++) {
        nodes.push({
          bx: cx + rand(-spanX, spanX),
          by: cy + rand(-spanY, spanY),
          r: rand(1, 2.6),
          phase: rand(0, Math.PI * 2),
          amp: rand(4, 14),
          twinklePhase: rand(0, Math.PI * 2),
          twinkleSpeed: rand(0.4, 1.4),
          hue: hueMix[Math.floor(Math.random() * hueMix.length)],
          stem: Math.random() < 0.25 ? rand(30, 90) : 0
        });
      }
      var links = [];
      for (i = 0; i < nodes.length; i++) {
        var dists = nodes.map(function (n, j) {
          return { j: j, d: Math.hypot(n.bx - nodes[i].bx, n.by - nodes[i].by) };
        }).filter(function (o) { return o.j !== i; })
          .sort(function (a, b) { return a.d - b.d; });
        for (var k = 0; k < 2 && k < dists.length; k++) {
          if (dists[k].d < Math.max(spanX, spanY) * 0.7) {
            var a = Math.min(i, dists[k].j), b = Math.max(i, dists[k].j);
            var dup = links.some(function (l) { return l[0] === a && l[1] === b; });
            if (!dup) links.push([a, b]);
          }
        }
      }
      return { nodes: nodes, links: links };
    }

    function buildScene() {
      var d = particleDensity;
      dust = [];
      var n = Math.round(70 * d * (W / 1600));
      for (var i = 0; i < n; i++) {
        dust.push({
          x: Math.random() * W, y: Math.random() * H,
          r: rand(0.5, 1.6),
          vx: rand(-0.06, 0.06), vy: rand(-0.10, -0.02),
          tw: rand(0, Math.PI * 2), tws: rand(0.3, 1.2),
          a: rand(0.15, 0.5)
        });
      }
      var cyan = ['176,80%,72%', '200,85%,75%'];
      var violet = ['255,75%,74%', '280,60%,72%'];
      webs = [
        makeWeb(W * 0.13, H * 0.72, W * 0.14, H * 0.20, Math.round(16 * d), cyan.concat(violet)),
        makeWeb(W * 0.80, H * 0.38, W * 0.16, H * 0.14, Math.round(18 * d), ['225,80%,75%'].concat(violet)),
        makeWeb(W * 0.48, H * 0.88, W * 0.10, H * 0.06, Math.round(7 * d), cyan)
      ];
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      W = r.width; H = r.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildScene();
    }

    var last = performance.now();
    var t = 0;
    function frame(now) {
      /* Pause while the hero still covers the viewport, or when the tab is hidden. */
      if (document.hidden || window.scrollY < window.innerHeight * 0.6) {
        last = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt * motionSpeed;
      ctx.clearRect(0, 0, W, H);

      var i, p;
      for (i = 0; i < dust.length; i++) {
        p = dust[i];
        p.x += p.vx * motionSpeed; p.y += p.vy * motionSpeed;
        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
        var tw = 0.5 + 0.5 * Math.sin(t * p.tws + p.tw);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(220,60%,85%,' + (p.a * tw).toFixed(3) + ')';
        ctx.fill();
      }

      for (var w = 0; w < webs.length; w++) {
        var web = webs[w], nd, j;
        for (j = 0; j < web.nodes.length; j++) {
          nd = web.nodes[j];
          nd.x = nd.bx + Math.sin(t * 0.25 + nd.phase) * nd.amp;
          nd.y = nd.by + Math.cos(t * 0.2 + nd.phase * 1.3) * nd.amp * 0.6;
        }
        ctx.lineWidth = 0.6;
        for (j = 0; j < web.links.length; j++) {
          var A = web.nodes[web.links[j][0]], B = web.nodes[web.links[j][1]];
          var pulse = 0.5 + 0.5 * Math.sin(t * 0.6 + A.phase + B.phase);
          ctx.beginPath();
          ctx.moveTo(A.x, A.y);
          ctx.lineTo(B.x, B.y);
          ctx.strokeStyle = 'hsla(230,60%,80%,' + (0.05 + 0.09 * pulse).toFixed(3) + ')';
          ctx.stroke();
        }
        for (j = 0; j < web.nodes.length; j++) {
          nd = web.nodes[j];
          var tw2 = 0.45 + 0.55 * Math.sin(t * nd.twinkleSpeed + nd.twinklePhase);
          if (nd.stem) {
            var g = ctx.createLinearGradient(nd.x, nd.y, nd.x, nd.y - nd.stem);
            g.addColorStop(0, 'hsla(' + nd.hue + ',' + (0.25 * tw2).toFixed(3) + ')');
            g.addColorStop(1, 'hsla(' + nd.hue + ',0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nd.x, nd.y);
            ctx.lineTo(nd.x, nd.y - nd.stem);
            ctx.stroke();
          }
          var halo = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, nd.r * 6);
          halo.addColorStop(0, 'hsla(' + nd.hue + ',' + (0.35 * tw2).toFixed(3) + ')');
          halo.addColorStop(1, 'hsla(' + nd.hue + ',0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, nd.r * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2);
          ctx.fillStyle = 'hsla(' + nd.hue + ',' + (0.55 + 0.45 * tw2).toFixed(3) + ')';
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    }

    var ro = new ResizeObserver(function () {
      var r = canvas.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1)) resize();
    });
    ro.observe(canvas);
    window.addEventListener('resize', resize);

    function tryStart() {
      var r = canvas.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        resize();
        raf = requestAnimationFrame(frame);
      } else {
        raf = requestAnimationFrame(tryStart);
      }
    }
    raf = requestAnimationFrame(tryStart);

    return {
      destroy: function () {
        if (raf) cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('resize', resize);
      }
    };
  }

  window.MethodMagicHeroBG = { init: init };
})();
