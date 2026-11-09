/* Mahmood Idelbi portfolio: slides, phone scrolling and the article reader */
(function(){
  var root = document.documentElement;
  var track = document.getElementById('track');
  var screens = Array.prototype.slice.call(document.querySelectorAll('.screen'));
  var dots = document.getElementById('dots');
  var reader = document.getElementById('reader');
  var closeBtn = document.getElementById('close');
  var current = 0, locked = false, LOCK_MS = 1000;
  root.classList.add('snap');

  screens.forEach(function(s, i){
    var b = document.createElement('button');
    b.setAttribute('aria-label', 'Go to ' + (s.id === 'top' ? 'start' : s.id));
    b.addEventListener('click', function(){ goTo(i); });
    dots.appendChild(b);
  });

  // Every screen was designed at 1440 x 900. On laptops smaller than that we
  // shrink the design so each chapter fits; big screens keep the original size.
  // Phones get the stacked layout instead, and each section scrolls on its own.
  var DESIGN_W = 1440, DESIGN_H = 900;
  function scale(){
    var w = window.innerWidth, h = window.innerHeight;
    var roots = document.querySelectorAll('.screen [data-root]');
    var i;
    root.classList.toggle('small', w <= 900);
    if (w <= 900){
      for (i = 0; i < roots.length; i++){ roots[i].style.zoom = ''; roots[i].style.height = ''; roots[i].style.minHeight = ''; }
      return;
    }
    var z = Math.max(0.7, Math.min(1, Math.min(w / DESIGN_W, h / DESIGN_H)));
    for (i = 0; i < roots.length; i++){
      roots[i].style.zoom = z;
      roots[i].style.minHeight = '0';
      roots[i].style.height = (h / z) + 'px';
    }
  }
  function refresh(){ scale(); place(false); }

  function place(animate){
    if (!animate){ track.style.transition = 'none'; }
    track.style.transform = 'translate3d(0,' + (-screens[current].offsetTop) + 'px,0)';
    if (!animate){ track.offsetHeight; track.style.transition = ''; }
    var b = dots.querySelectorAll('button');
    for (var i = 0; i < b.length; i++) b[i].classList.toggle('on', i === current);
  }
  // fromBelow: we came back up from the next section, so land at the bottom
  function goTo(i, instant, fromBelow){
    var next = Math.max(0, Math.min(screens.length - 1, i));
    if (next === current && !instant){ return; }
    var sc = screens[next];
    sc.scrollTop = fromBelow ? sc.scrollHeight : 0;
    current = next;
    place(!instant);
    locked = true; setTimeout(function(){ locked = false; }, instant ? 0 : LOCK_MS);
  }
  function indexOf(id){
    for (var i = 0; i < screens.length; i++) if (screens[i].id === id) return i;
    return -1;
  }
  // can the current section still scroll in this direction?
  function atEdge(dir){
    var sc = screens[current];
    if (dir > 0) return sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
    return sc.scrollTop <= 1;
  }
  function flip(dir){ goTo(current + dir, false, dir < 0); }

  // Wheel / trackpad. A flick fires a long stream of events (with momentum).
  // We decide at the start of each gesture: if the section has more to show,
  // the gesture just scrolls it, and stops at its end. Only a NEW gesture that
  // starts at the edge slides to the next section, once.
  var gesture = null, quietTimer = null, QUIET_MS = 180;
  window.addEventListener('wheel', function(e){
    if (reader.classList.contains('open')) return;
    var dir = e.deltaY > 0 ? 1 : -1;
    clearTimeout(quietTimer);
    quietTimer = setTimeout(function(){ gesture = null; }, QUIET_MS);
    if (!gesture) gesture = { flip: atEdge(dir), used: false };
    if (locked || gesture.flip){
      e.preventDefault();
      if (!locked && gesture.flip && !gesture.used && Math.abs(e.deltaY) >= 2){ gesture.used = true; flip(dir); }
    }
  }, {passive: false});

  // Touch (phones): same idea. Swipe to read through a section; it stops at
  // the end. The next swipe from the end slides to the next section.
  var ty = 0, startTop = false, startBottom = false;
  window.addEventListener('touchstart', function(e){
    if (reader.classList.contains('open')) return;
    ty = e.touches[0].clientY;
    startTop = atEdge(-1); startBottom = atEdge(1);
  }, {passive: true});
  window.addEventListener('touchmove', function(e){
    if (reader.classList.contains('open')) return;
    var d = ty - e.touches[0].clientY;
    // at an edge, hold the page still so the swipe becomes a slide
    if (locked || (d > 0 && startBottom) || (d < 0 && startTop)) e.preventDefault();
  }, {passive: false});
  window.addEventListener('touchend', function(e){
    if (locked || reader.classList.contains('open')) return;
    var d = ty - e.changedTouches[0].clientY;
    if (d > 50 && startBottom) flip(1);
    else if (d < -50 && startTop) flip(-1);
  });

  window.addEventListener('keydown', function(e){
    if (reader.classList.contains('open')){ if (e.key === 'Escape') closeArticle(); return; }
    if (locked) return;
    var dir = 0;
    if (['ArrowDown','PageDown',' '].indexOf(e.key) > -1) dir = 1;
    if (['ArrowUp','PageUp'].indexOf(e.key) > -1) dir = -1;
    if (dir){
      e.preventDefault();
      if (atEdge(dir)) flip(dir);
      else screens[current].scrollBy({top: dir * screens[current].clientHeight * 0.8, behavior: 'smooth'});
    }
    if (e.key === 'Home') goTo(0);
    if (e.key === 'End') goTo(screens.length - 1);
  });

  // articles
  function openArticle(id){
    var a = document.getElementById(id);
    if (!a) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-article]'), function(x){ x.hidden = x !== a; });
    reader.classList.add('open'); root.classList.add('reading');
    reader.scrollTop = 0;
    document.title = a.querySelector('h1').innerHTML.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '') + ' · Mahmood Idelbi';
    closeBtn.focus({preventScroll: true});
  }
  function closeArticle(){
    if (!reader.classList.contains('open')) return;
    reader.classList.remove('open'); root.classList.remove('reading');
    Array.prototype.forEach.call(reader.querySelectorAll('video'), function(v){ v.pause(); });
    document.title = 'Mahmood Idelbi';
    history.replaceState(null, '', '#' + screens[current].id);
  }
  closeBtn.addEventListener('click', closeArticle);

  function route(instant){
    var id = decodeURIComponent(location.hash.slice(1)) || 'top';
    var el = document.getElementById(id);
    if (el && el.hasAttribute('data-article')){
      var ci = indexOf(el.getAttribute('data-chapter'));
      if (ci > -1 && !reader.classList.contains('open') && ci !== current){ current = ci; place(false); }
      openArticle(id);
      return;
    }
    var i = indexOf(id);
    if (i > -1){
      if (reader.classList.contains('open')){ closeArticle(); if (i !== current){ current = i; place(false); } }
      else goTo(i, instant);
    }
  }
  window.addEventListener('hashchange', function(){ route(false); });
  window.addEventListener('resize', refresh);

  // Decode the big painted backgrounds and card images up front, so nothing
  // has to be unpacked in the middle of a slide.
  (function(){
    var urls = {};
    screens.forEach(function(sc){
      Array.prototype.forEach.call(sc.querySelectorAll('*'), function(el){
        var bg = getComputedStyle(el).backgroundImage;
        var m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (m) urls[m[1]] = 1;
      });
      Array.prototype.forEach.call(sc.querySelectorAll('img'), function(im){ urls[im.currentSrc || im.src] = 1; });
    });
    Object.keys(urls).forEach(function(u){
      var im = new Image(); im.decoding = 'async'; im.src = u;
      if (im.decode) im.decode().catch(function(){});
    });
  })();

  scale();
  route(true);
  place(false);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);
})();
