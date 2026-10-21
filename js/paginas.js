/* Pantallas internas: artículos, artículo, devocional, testimonio, recursos y contacto. */
(function(){
  'use strict';
  var C=window.Comun, N=window.Novedades, D=window.Devocional;
  var esc=C.esc, cont=document.getElementById('contenido');
  var pagina=cont.getAttribute('data-pagina');

  function img(src){return src?'<img src="'+esc(src)+'" alt="" loading="lazy" onerror="this.remove()">':'';}
  function portada(src){return src?'<div class="portada">'+img(src)+'</div>':'';}
  function error(msg){cont.innerHTML='<div class="error-carga">'+esc(msg)+'</div>';}
  function vacio(msg){cont.innerHTML='<p class="vacio">'+esc(msg)+'</p>';}
  function sinDatos(){error('No se pudieron cargar los datos. Revisá tu conexión e intentá de nuevo.');}
  function porFecha(a,b){return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0;}
  function fechaTxt(f){return (f&&/^\d{4}-\d{2}-\d{2}$/.test(f))?D.fechaLarga(f):'';}
  function devs(){return C.get('data/devocionales.json').catch(function(){return [];});}
  function base(){return Promise.all([C.get('data/articulos.json').catch(function(){return [];}),devs()]);}

  /* ---------- Artículos ---------- */
  function pArticulos(){
    base().then(function(r){
      var arts=Array.isArray(r[0])?r[0]:[];
      C.avisos(arts,r[1]);
      if(!arts.length) return vacio('Todavía no hay artículos publicados.');
      var orden=arts.slice().sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');});
      var cats=[]; orden.forEach(function(a){if(a.categoria&&cats.indexOf(a.categoria)<0) cats.push(a.categoria);});
      var actual=C.params().get('cat')||'Todas';
      if(actual!=='Todas'&&cats.indexOf(actual)<0) actual='Todas';
      cont.innerHTML='<div class="chips" id="chips"></div><div class="lista" id="lista-art"></div>';
      function tarjeta(a){
        return '<a class="item-art" href="articulo.html?id='+encodeURIComponent(a.id)+'">'+
          '<span class="item-img">'+img(a.imagen)+'</span>'+
          '<span class="item-cuerpo">'+
            '<span class="fila-etiqueta">'+(a.categoria?'<span class="etiqueta">'+esc(a.categoria)+'</span>':'')+(N.artNuevo(a.id)?'<span class="nuevo">Nuevo</span>':'')+'</span>'+
            '<h3>'+esc(a.titulo)+'</h3>'+
            (a.resumen?'<span class="resumen">'+esc(a.resumen)+'</span>':'')+
            (fechaTxt(a.fecha)?'<span class="fecha">'+esc(fechaTxt(a.fecha))+'</span>':'')+
          '</span></a>';
      }
      function pintar(){
        document.getElementById('chips').innerHTML=['Todas'].concat(cats).map(function(c){
          return '<button type="button" class="chip'+(c===actual?' activa':'')+'" data-cat="'+esc(c)+'">'+esc(c)+'</button>';
        }).join('');
        var items=orden.filter(function(a){return actual==='Todas'||a.categoria===actual;});
        document.getElementById('lista-art').innerHTML=items.length?items.map(tarjeta).join(''):'<p class="vacio">Todavía no hay artículos en esta categoría.</p>';
      }
      cont.addEventListener('click',function(e){var b=e.target.closest('[data-cat]'); if(b){actual=b.getAttribute('data-cat'); pintar();}});
      pintar();
    }).catch(sinDatos);
  }

  /* ---------- Artículo ---------- */
  function pArticulo(){
    var id=C.params().get('id');
    base().then(function(r){
      var arts=Array.isArray(r[0])?r[0]:[];
      var a=arts.filter(function(x){return String(x.id)===String(id);})[0];
      if(!a){ C.avisos(arts,r[1]); return vacio('No encontramos este artículo.'); }
      document.title=a.titulo+' · Mujeres de Acción';
      var texto=C.lista(a), desc=Array.isArray(a.descargas)?a.descargas:[];
      cont.innerHTML='<article class="lectura">'+portada(a.imagen)+
        (a.categoria?'<div class="fila-etiqueta"><span class="etiqueta">'+esc(a.categoria)+'</span></div>':'')+
        '<h2>'+esc(a.titulo)+'</h2>'+
        (fechaTxt(a.fecha)?'<p class="meta">'+esc(fechaTxt(a.fecha))+'</p>':'')+
        (a.versiculo?'<blockquote class="cita versiculo">'+C.conSaltos(a.versiculo)+'</blockquote>':'')+
        '<div class="cuerpo">'+(texto.length?C.bloques(texto):'<p>'+esc(a.resumen||'')+'</p><p class="aviso-vacio">El texto completo de este artículo todavía no está cargado.</p>')+'</div>'+
        (desc.length?'<div class="descargas"><h3>Para descargar</h3>'+desc.map(function(d){
          return '<a class="btn-leer btn-descarga" href="'+esc(d.archivo)+'" download target="_blank" rel="noopener">'+esc(d.titulo||'Descargar')+'</a>';
        }).join('')+'</div>':'')+
        '<div class="nav-lect"><a class="btn-sec" href="articulos.html">‹ Todos los artículos</a></div></article>';
      N.marcarArt(a.id); C.avisos(arts,r[1]);
    }).catch(sinDatos);
  }

  /* ---------- Devocional ---------- */
  function pDevocional(){
    Promise.all([C.get('data/devocionales.json'),C.get('data/articulos.json').catch(function(){return [];})]).then(function(r){
      var todos=Array.isArray(r[0])?r[0]:[], arts=r[1];
      if(!todos.length) return vacio('Todavía no hay devocionales cargados.');
      var hoy=D.hoyISO();
      /* Solo se muestran los publicados (fecha de hoy o anterior). */
      var disp=todos.filter(function(x){return x.fecha<=hoy;}).sort(porFecha);
      if(!disp.length) disp=[D.elegir(todos)];
      var pedido=C.params().get('fecha');
      var el=disp.filter(function(x){return x.fecha===pedido;})[0]||D.elegir(todos);
      var i=disp.indexOf(el), ant=disp[i-1], sig=disp[i+1];
      var texto=C.lista(el);
      var previos=disp.filter(function(x){return x!==el;}).reverse().slice(0,30);
      document.title=el.titulo+' · Mujeres de Acción';
      cont.innerHTML='<article class="lectura">'+portada(el.imagen)+
        '<div class="fila-etiqueta"><span class="etiqueta">'+(el.fecha===hoy?'Devocional de hoy':'Devocional')+'</span></div>'+
        '<p class="meta">'+esc(fechaTxt(el.fecha))+'</p>'+
        '<h2>'+esc(el.titulo)+'</h2>'+
        (el.referencia?'<p class="referencia">'+esc(el.referencia)+'</p>':'')+
        '<div class="cuerpo">'+C.bloques(texto)+'</div>'+
        '<div class="nav-lect">'+
          (ant?'<a class="btn-sec" href="devocional.html?fecha='+encodeURIComponent(ant.fecha)+'">‹ Anterior</a>':'<span></span>')+
          (sig?'<a class="btn-sec" href="devocional.html?fecha='+encodeURIComponent(sig.fecha)+'">Siguiente ›</a>':'<span></span>')+
        '</div></article>'+
        (previos.length?'<section class="anteriores"><h3>Devocionales anteriores</h3><div class="lista">'+previos.map(function(x){
          return '<a class="item-dev" href="devocional.html?fecha='+encodeURIComponent(x.fecha)+'"><span class="fecha">'+esc(fechaTxt(x.fecha))+'</span><span>'+esc(x.titulo)+'</span></a>';
        }).join('')+'</div></section>':'');
      N.marcarDev(el.fecha); C.avisos(arts,todos);
    }).catch(sinDatos);
  }

  /* ---------- Testimonio ---------- */
  function pTestimonio(){
    C.get('data/testimonio.json').then(function(t){
      var texto=C.lista(t);
      document.title=(t.titulo||'Testimonio')+' · Mujeres de Acción';
      cont.innerHTML='<article class="lectura">'+portada(t.imagen||'img/testimonio.webp')+
        '<div class="fila-etiqueta"><span class="etiqueta">'+esc(t.etiqueta||'Testimonio')+'</span></div>'+
        '<h2>'+esc(t.titulo||'Testimonio')+'</h2>'+
        '<div class="cuerpo">'+(texto.length?C.bloques(texto):'<p class="aviso-vacio">El testimonio todavía no está cargado.</p>')+'</div>'+
        '<div class="nav-lect"><a class="btn-sec" href="index.html">‹ Volver al inicio</a></div></article>';
    }).catch(sinDatos);
  }

  /* ---------- Recursos ---------- */
  function pRecursos(){
    C.get('data/recursos.json').then(function(items){
      items=Array.isArray(items)?items:[];
      if(!items.length) return vacio('Todavía no hay recursos para descargar.');
      cont.innerHTML='<p class="intro">Materiales para descargar y guardar en tu celular.</p><div class="lista">'+items.map(function(x){
        return '<div class="recurso">'+
          '<span class="recurso-ico" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/></svg></span>'+
          '<div class="recurso-cuerpo"><h3>'+esc(x.titulo)+'</h3>'+(x.descripcion?'<p>'+esc(x.descripcion)+'</p>':'')+
          '<a class="btn-leer btn-descarga" href="'+esc(x.archivo)+'" download target="_blank" rel="noopener">Descargar'+(x.tipo?' '+esc(x.tipo):'')+'</a></div></div>';
      }).join('')+'</div>';
    }).catch(sinDatos);
  }

  /* ---------- Contacto (por correo, sin servidor) ---------- */
  function pContacto(){
    C.get('data/contacto.json').then(function(c){
      var mail=c.correo||'', o=c.oracion||{};
      function mailto(asunto,cuerpo){return 'mailto:'+mail+'?subject='+encodeURIComponent(asunto)+'&body='+encodeURIComponent(cuerpo);}
      cont.innerHTML=
        '<p class="intro">'+esc(c.intro||'')+'</p>'+
        '<a class="btn-leer grande" id="mail-directo" href="'+esc(mailto(c.asunto||'Contacto',c.saludo||''))+'">Escribinos por correo</a>'+
        '<p class="mail-txt">'+esc(mail)+'</p>'+
        '<section class="oracion"><h3>'+esc(o.titulo||'Pedido de oración')+'</h3>'+
        '<p>'+esc(o.texto||'')+'</p>'+
        '<form class="form" id="form-oracion">'+
          '<label for="f-nombre">Tu nombre (opcional)</label><input id="f-nombre" type="text" autocomplete="given-name">'+
          '<label for="f-pedido">Tu pedido</label><textarea id="f-pedido" rows="5" required></textarea>'+
          '<div class="acciones"><button type="submit" class="btn-leer">Enviar por correo</button>'+
          '<button type="button" class="btn-sec" id="f-copiar">Copiar mensaje</button></div>'+
          '<p class="nota">Se abrirá tu aplicación de correo con el mensaje listo. Si no se abre, usá “Copiar mensaje” y pegalo en tu correo.</p>'+
        '</form></section>';
      function armar(){
        var n=document.getElementById('f-nombre').value.trim(), p=document.getElementById('f-pedido').value.trim();
        return {asunto:o.asunto||'Pedido de oración',cuerpo:(n?'Nombre: '+n+'\n\n':'')+p};
      }
      document.getElementById('form-oracion').addEventListener('submit',function(e){
        e.preventDefault(); var m=armar(); location.href=mailto(m.asunto,m.cuerpo);
      });
      document.getElementById('f-copiar').addEventListener('click',function(){
        var p=document.getElementById('f-pedido').value.trim();
        if(!p){C.aviso('Escribí primero tu pedido.');return;}
        var m=armar(), txt='Para: '+mail+'\nAsunto: '+m.asunto+'\n\n'+m.cuerpo;
        if(navigator.clipboard&&navigator.clipboard.writeText){
          navigator.clipboard.writeText(txt).then(function(){C.aviso('Mensaje copiado.');},function(){C.aviso('No se pudo copiar.');});
        } else C.aviso('No se pudo copiar.');
      });
    }).catch(sinDatos);
  }

  var rutas={articulos:pArticulos,articulo:pArticulo,devocional:pDevocional,testimonio:pTestimonio,recursos:pRecursos,contacto:pContacto};
  C.iniciarPagina(pagina);
  (rutas[pagina]||function(){})();
  base().then(function(b){C.avisos(b[0],b[1]);});
})();
