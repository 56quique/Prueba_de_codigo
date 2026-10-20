(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s);};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function get(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok) throw new Error(u);return r.json();});}
  function parrafos(a){return (a||[]).map(function(p){return '<p>'+esc(p)+'</p>';}).join('');}
  var N=window.Novedades, D=window.Devocional;
  var estado={arts:[],dev:null,fecha:null,t:0,primera:true};

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
      var im=new Image(); im.className='logo-img'; im.alt=(l.linea1||'')+' '+(l.linea2||'');
      im.onload=function(){box.replaceChildren(im);};
      im.src=l.imagen;
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
    return '<article class="tarjeta '+o.clase+'"'+(o.dev?' data-clave-dev="'+esc(o.dev)+'"':'')+'>'+
      '<div class="tarjeta-img">'+img(o.imagen)+'</div>'+
      '<div class="tarjeta-cuerpo">'+
        '<div class="fila-etiqueta"><span class="etiqueta">'+esc(o.etiqueta)+'</span>'+
          (o.dev?'<span class="nuevo" data-nuevo-dev="'+esc(o.dev)+'" hidden>Nuevo</span>':'')+'</div>'+
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
    var d=D.elegir(devs); estado.dev=d;
    if(d) html+=tarjetaExpandible({clase:'t-devocional',etiqueta:'Devocional de hoy',dev:d.fecha,fecha:D.fechaLarga(d.fecha),titulo:d.titulo,referencia:d.referencia,imagen:d.imagen||'img/devocional.webp',parrafos:d.parrafos});
    $('#tarjetas').innerHTML=html;
  }

  /* ---------- Carrusel ---------- */
  function carrusel(cats){
    $('#carrusel').innerHTML=(cats||[]).map(function(c){
      var conNum=c.insignia==='articulos'||/^articulos\.html/.test(c.href||'');
      return '<a class="cat cat-'+esc(c.color||'verde')+(c.pronto?' pronto':'')+'" href="'+esc(c.href)+'">'+
        '<span class="cat-img">'+img(c.imagen)+'</span>'+
        (conNum?'<span class="cat-num" data-num-art hidden></span>':'')+
        '<span class="cat-pie"><span>'+esc(c.nombre)+'</span><span aria-hidden="true">→</span></span></a>';
    }).join('');
  }

  /* ---------- Artículo destacado ---------- */
  function destacado(arts){
    var a=(arts||[]).filter(function(x){return x.destacado;})[0]||(arts||[])[0];
    var box=$('#destacado');
    if(!a){box.innerHTML='';return;}
    box.innerHTML='<article class="tarjeta t-destacado">'+
      '<div class="tarjeta-img">'+img(a.imagen)+'</div>'+
      '<div class="tarjeta-cuerpo">'+
        '<div class="fila-etiqueta"><span class="etiqueta">Artículo destacado</span>'+
          '<span class="nuevo" data-nuevo-art="'+esc(a.id)+'" hidden>Nuevo</span></div>'+
        '<h3>'+esc(a.titulo)+'</h3>'+
        '<p class="resumen">'+esc(a.resumen)+'</p>'+
        '<a class="btn-leer pronto" data-art-id="'+esc(a.id)+'" href="articulo.html?id='+encodeURIComponent(a.id)+'">Leer más</a>'+
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

  /* ---------- Avisos "Nuevo" y número en el ícono ---------- */
  function refrescarAvisos(){
    var nDev=(estado.dev&&N.devNuevo(estado.dev.fecha))?1:0;
    var nArt=N.nuevosArt(estado.arts).length;
    document.querySelectorAll('[data-nuevo-dev]').forEach(function(el){el.hidden=!N.devNuevo(el.getAttribute('data-nuevo-dev'));});
    document.querySelectorAll('[data-nuevo-art]').forEach(function(el){el.hidden=!N.artNuevo(el.getAttribute('data-nuevo-art'));});
    document.querySelectorAll('[data-num-art]').forEach(function(el){el.textContent=nArt;el.hidden=nArt<1;});
    N.insignia(nDev+nArt);
  }

  /* ---------- Instalación ---------- */
  var promptInst=null;
  function esStandalone(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;}
  function instCerrado(){try{return localStorage.getItem('mda_inst_cerrado')==='1';}catch(e){return false;}}
  function esIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);}
  function bannerInstalar(modo){
    if(esStandalone()||instCerrado()) return;
    $('#instalar').innerHTML='<div class="instalar">'+
      '<p>'+(modo==='ios'?'Instalá la app: tocá Compartir y elegí “Agregar a inicio”.':'Instalá la app en tu celular y abrila como cualquier otra.')+'</p>'+
      (modo==='android'?'<button type="button" class="btn-leer" id="btn-instalar">Instalar</button>':'')+
      '<button type="button" class="cerrar" data-cerrar-inst aria-label="Cerrar">×</button></div>';
  }
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();promptInst=e;bannerInstalar('android');});
  window.addEventListener('appinstalled',function(){promptInst=null;$('#instalar').innerHTML='';});
  if(esIOS()&&!esStandalone()) bannerInstalar('ios');

  /* ---------- Eventos ---------- */
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-leer]');
    if(b){
      var card=b.closest('.tarjeta'), abierta=card.classList.toggle('abierta');
      b.textContent=abierta?'Leer menos':'Leer más'; b.setAttribute('aria-expanded',abierta);
      if(abierta&&card.getAttribute('data-clave-dev')){N.marcarDev(card.getAttribute('data-clave-dev'));refrescarAvisos();}
      return;
    }
    if(e.target.closest('#btn-instalar')&&promptInst){
      promptInst.prompt();
      promptInst.userChoice.then(function(){promptInst=null;$('#instalar').innerHTML='';});
      return;
    }
    if(e.target.closest('[data-cerrar-inst]')){
      try{localStorage.setItem('mda_inst_cerrado','1');}catch(er){}
      $('#instalar').innerHTML='';
      return;
    }
    var l=e.target.closest('[data-art-id]');
    if(l){N.marcarArt(l.getAttribute('data-art-id'));refrescarAvisos();}
    var p=e.target.closest('a.pronto,[data-pronto]');
    if(p){e.preventDefault();aviso('Esta sección llega en la próxima etapa.');}
  });
  $('#prev').addEventListener('click',function(){$('#carrusel').scrollBy({left:-$('#carrusel').clientWidth*.8,behavior:'smooth'});});
  $('#next').addEventListener('click',function(){$('#carrusel').scrollBy({left:$('#carrusel').clientWidth*.8,behavior:'smooth'});});

  /* ---------- Carga de datos ---------- */
  function ok(p){return p.status==='fulfilled'?p.value:null;}
  function cargarTodo(){
    estado.t=Date.now(); estado.fecha=D.hoyISO();
    return Promise.allSettled([get('data/config.json'),get('data/testimonio.json'),get('data/devocionales.json'),get('data/articulos.json')])
    .then(function(r){
      var cfg=ok(r[0]);
      if(!cfg){
        if(estado.primera) $('#tarjetas').innerHTML='<div class="error-carga">No se pudieron cargar los datos. Abrí la app desde GitHub Pages o con un servidor local (no directamente desde el archivo).</div>';
        return;
      }
      document.title=cfg.nombreApp||document.title;
      logo(cfg.logo); hero(cfg.hero);
      estado.arts=ok(r[3])||[];
      N.iniciar(estado.arts);
      tarjetas(ok(r[1]),ok(r[2])); carrusel(cfg.categorias); destacado(estado.arts);
      $('#pie-texto').textContent='© '+new Date().getFullYear()+' '+((cfg.pie&&cfg.pie.texto)||'');
      refrescarAvisos();
      if(estado.primera){revelar();estado.primera=false;}
    });
  }
  cargarTodo();

  /* Al volver a la app después de un rato (o si cambió el día), busca contenido nuevo. */
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'&&!estado.primera&&(Date.now()-estado.t>30*60*1000||D.hoyISO()!==estado.fecha)) cargarTodo();
  });

  /* ---------- App instalable: service worker ---------- */
  if('serviceWorker' in navigator){
    window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
  }
})();
