(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s);};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function get(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok) throw new Error(u);return r.json();});}
  function parrafos(a){return (a||[]).map(function(p){return '<p>'+esc(p)+'</p>';}).join('');}

  var toastT;
  function aviso(msg){
    var e=$('#toast'); e.textContent=msg; e.classList.add('on');
    clearTimeout(toastT); toastT=setTimeout(function(){e.classList.remove('on');},2600);
  }

  /* ---------- Logo (texto editable o imagen) ---------- */
  function logo(l){
    var box=$('#logo'); l=l||{};
    function texto(){box.innerHTML='<span class="logo-1">'+esc(l.linea1)+'</span><span class="logo-2">'+esc(l.linea2)+'</span>';}
    texto();
    if(l.imagen){
      var img=new Image(); img.className='logo-img'; img.alt=(l.linea1||'')+' '+(l.linea2||'');
      img.onload=function(){box.replaceChildren(img);};
      img.src=l.imagen;
    }
  }

  /* ---------- Hero ---------- */
  function hero(h){
    h=h||{};
    if(h.imagen) $('#hero-foto').style.backgroundImage='url("'+h.imagen+'")';
    $('#hero-frase').textContent=h.frasePrincipal||'';
    $('#hero-sub').textContent=h.fraseSecundaria||'';
  }

  /* ---------- Tarjetas ---------- */
  function img(src){return src?'<img src="'+esc(src)+'" alt="" loading="lazy" onerror="this.remove()">':'';}

  function tarjetaExpandible(o){
    return '<article class="tarjeta '+o.clase+'">'+
      '<div class="tarjeta-img">'+img(o.imagen)+'</div>'+
      '<div class="tarjeta-cuerpo">'+
        '<span class="etiqueta">'+esc(o.etiqueta)+'</span>'+
        (o.fecha?'<time class="fecha">'+esc(o.fecha)+'</time>':'')+
        '<h3>'+esc(o.titulo)+'</h3>'+
        (o.referencia?'<p class="referencia">'+esc(o.referencia)+'</p>':'')+
        '<div class="texto-fade">'+parrafos(o.parrafos)+'</div>'+
        '<button type="button" class="btn-leer" data-leer aria-expanded="false">Leer más</button>'+
      '</div></article>';
  }

  function tarjetas(test,devs){
    var html='';
    if(test) html+=tarjetaExpandible({clase:'t-testimonio',etiqueta:test.etiqueta||'Testimonio',titulo:test.titulo,imagen:test.imagen,parrafos:test.parrafos});
    var d=window.Devocional.elegir(devs);
    if(d) html+=tarjetaExpandible({clase:'t-devocional',etiqueta:'Devocional de hoy',fecha:window.Devocional.fechaLarga(d.fecha),titulo:d.titulo,referencia:d.referencia,imagen:d.imagen||'img/devocional.webp',parrafos:d.parrafos});
    $('#tarjetas').innerHTML=html;
  }

  /* ---------- Carrusel ---------- */
  function carrusel(cats){
    $('#carrusel').innerHTML=(cats||[]).map(function(c){
      return '<a class="cat cat-'+esc(c.color||'verde')+(c.pronto?' pronto':'')+'" href="'+esc(c.href)+'">'+
        '<span class="cat-img">'+img(c.imagen)+'</span>'+
        '<span class="cat-pie"><span>'+esc(c.nombre)+'</span><span aria-hidden="true">→</span></span></a>';
    }).join('');
  }

  /* ---------- Artículo destacado ---------- */
  function destacado(arts){
    var a=(arts||[]).filter(function(x){return x.destacado;})[0]||(arts||[])[0];
    var box=$('#destacado');
    if(!a){box.remove();return;}
    box.innerHTML='<article class="tarjeta t-destacado">'+
      '<div class="tarjeta-img">'+img(a.imagen)+'</div>'+
      '<div class="tarjeta-cuerpo">'+
        '<span class="etiqueta">Artículo destacado</span>'+
        '<h3>'+esc(a.titulo)+'</h3>'+
        '<p class="resumen">'+esc(a.resumen)+'</p>'+
        '<a class="btn-leer pronto" href="articulo.html?id='+encodeURIComponent(a.id)+'">Leer más</a>'+
      '</div></article>';
  }

  function revelar(){
    var els=document.querySelectorAll('.reveal');
    if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('visible');});return;}
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}});
    },{threshold:.2});
    els.forEach(function(e){io.observe(e);});
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-leer]');
    if(b){
      var card=b.closest('.tarjeta'), abierta=card.classList.toggle('abierta');
      b.textContent=abierta?'Leer menos':'Leer más'; b.setAttribute('aria-expanded',abierta);
      return;
    }
    var p=e.target.closest('a.pronto,[data-pronto]');
    if(p){e.preventDefault();aviso('Esta sección llega en la próxima etapa.');}
  });
  $('#prev').addEventListener('click',function(){$('#carrusel').scrollBy({left:-$('#carrusel').clientWidth*.8,behavior:'smooth'});});
  $('#next').addEventListener('click',function(){$('#carrusel').scrollBy({left:$('#carrusel').clientWidth*.8,behavior:'smooth'});});

  /* ---------- Arranque ---------- */
  function ok(p){return p.status==='fulfilled'?p.value:null;}
  Promise.allSettled([get('data/config.json'),get('data/testimonio.json'),get('data/devocionales.json'),get('data/articulos.json')])
  .then(function(r){
    var cfg=ok(r[0]);
    if(!cfg){
      $('#tarjetas').innerHTML='<div class="error-carga">No se pudieron cargar los datos. Abrí la app desde GitHub Pages o con un servidor local (no directamente desde el archivo).</div>';
      return;
    }
    document.title=cfg.nombreApp||document.title;
    logo(cfg.logo); hero(cfg.hero);
    tarjetas(ok(r[1]),ok(r[2])); carrusel(cfg.categorias); destacado(ok(r[3]));
    var pie=(cfg.pie&&cfg.pie.texto)||'';
    $('#pie-texto').textContent='© '+new Date().getFullYear()+' '+pie;
    revelar();
  });
})();
