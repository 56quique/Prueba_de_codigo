/* Editor "Editoras": artículos y devocionales. Publica directo en el repositorio de GitHub. */
(function(){
  'use strict';
  var C=window.Comun, D=window.Devocional, GH=window.GH;
  var esc=C.esc, cont=document.getElementById('contenido');
  var S={cfg:null,cats:[],arts:[],devs:[],vista:'articulos'};
  var ED=null, LOTE=[];
  var BKEY='mda_borradores_v1';

  /* ---------- utilidades ---------- */
  function $(id){return document.getElementById(id);}
  function estado(msg,tipo){
    var e=$('ed-estado'); if(!e){C.aviso(msg);return;}
    e.textContent=msg; e.className='nota ed-msg'+(tipo?' '+tipo:'');
    if(e.scrollIntoView) e.scrollIntoView({block:'nearest'});
  }
  function slug(s,max){
    s=String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return (s||'articulo').slice(0,max||60).replace(/-+$/,'');
  }
  function fechaValida(f){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
    var p=f.split('-').map(Number), d=new Date(Date.UTC(p[0],p[1]-1,p[2]));
    return d.getUTCFullYear()===p[0]&&d.getUTCMonth()===p[1]-1&&d.getUTCDate()===p[2];
  }
  function normFecha(s){
    s=String(s).trim(); var m;
    if(fechaValida(s)) return s;
    if((m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))){
      var f=m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
      return fechaValida(f)?f:'';
    }
    return '';
  }
  function fechaCorta(f){return fechaValida(f||'')?D.fechaLarga(f):'';}
  function idUnico(titulo){
    var base=slug(titulo), id=base, n=2, usados=S.arts.map(function(a){return String(a.id);});
    while(usados.indexOf(id)>=0){id=base+'-'+n;n++;}
    return id;
  }
  function aBloques(parr){
    return (parr||[]).map(function(s){
      s=String(s);
      if(/^##\s+/.test(s)) return {t:'sub',x:s.replace(/^##\s+/,'')};
      if(/^>\s+/.test(s)) return {t:'cita',x:s.replace(/^>\s+/,'')};
      return {t:'p',x:s};
    });
  }
  function aParrafos(bq){
    return bq.map(function(b){return {t:b.t,x:String(b.x||'').trim()};}).filter(function(b){return b.x;})
      .map(function(b){return b.t==='sub'?'## '+b.x:(b.t==='cita'?'> '+b.x:b.x);});
  }
  function blobADataURL(blob){
    return new Promise(function(ok,no){var r=new FileReader();r.onload=function(){ok(r.result);};r.onerror=function(){no(new Error('No se pudo leer la imagen.'));};r.readAsDataURL(blob);});
  }
  /* Reduce la foto (máx. 1400 px) y la pasa a WebP (o JPG si el celular no puede). */
  function reducirImagen(file){
    return new Promise(function(ok,no){
      var url=URL.createObjectURL(file), im=new Image();
      im.onload=function(){
        var r=Math.min(1,1400/Math.max(im.width,im.height)), w=Math.round(im.width*r), h=Math.round(im.height*r);
        var c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(im,0,0,w,h);
        URL.revokeObjectURL(url);
        function fin(b,ext){blobADataURL(b).then(function(d){ok({blob:b,ext:ext,dataURL:d});},no);}
        c.toBlob(function(b){
          if(b&&b.type==='image/webp') fin(b,'webp');
          else c.toBlob(function(b2){fin(b2,'jpg');},'image/jpeg',.85);
        },'image/webp',.82);
      };
      im.onerror=function(){URL.revokeObjectURL(url);no(new Error('No se pudo leer la imagen. Probá con otra foto.'));};
      im.src=url;
    });
  }

  /* ---------- borradores (se guardan en este celular) ---------- */
  function leerBor(){try{return JSON.parse(localStorage.getItem(BKEY))||[];}catch(e){return [];}}
  function guardarBor(l){try{localStorage.setItem(BKEY,JSON.stringify(l));return true;}catch(e){return false;}}
  function quitarBor(id){if(!id) return; guardarBor(leerBor().filter(function(b){return b.id!==id;}));}
  function borPorId(id){return leerBor().filter(function(b){return b.id===id;})[0]||null;}

  /* ---------- editor de bloques de texto ---------- */
  var TIPO={p:'Párrafo',sub:'Subtítulo',cita:'Cita bíblica'};
  function Bloques(el,arr,alCambiar){
    function render(){
      el.innerHTML=arr.length?arr.map(function(b,i){
        return '<div class="blq"><div class="blq-cab"><span class="blq-tipo">'+TIPO[b.t]+'</span><span class="blq-acc">'+
          '<button type="button" data-bq="sube" data-i="'+i+'" aria-label="Subir">↑</button>'+
          '<button type="button" data-bq="baja" data-i="'+i+'" aria-label="Bajar">↓</button>'+
          '<button type="button" data-bq="borra" data-i="'+i+'" aria-label="Quitar">✕</button></span></div>'+
          '<textarea rows="'+(b.t==='sub'?1:4)+'" data-i="'+i+'" aria-label="'+TIPO[b.t]+'">'+esc(b.x)+'</textarea></div>';
      }).join(''):'<p class="nota">Todavía no hay texto. Agregá un párrafo con los botones de abajo.</p>';
    }
    el.addEventListener('input',function(e){
      var t=e.target.closest('textarea[data-i]'); if(t){arr[+t.getAttribute('data-i')].x=t.value; if(alCambiar) alCambiar();}
    });
    el.addEventListener('click',function(e){
      var b=e.target.closest('[data-bq]'); if(!b) return;
      var i=+b.getAttribute('data-i'), a=b.getAttribute('data-bq'), t;
      if(a==='borra') arr.splice(i,1);
      else if(a==='sube'&&i>0){t=arr[i];arr[i]=arr[i-1];arr[i-1]=t;}
      else if(a==='baja'&&i<arr.length-1){t=arr[i];arr[i]=arr[i+1];arr[i+1]=t;}
      render(); if(alCambiar) alCambiar();
    });
    render();
    return {render:render,agregar:function(tipo){
      arr.push({t:tipo,x:''}); render();
      var ta=el.querySelectorAll('textarea'); if(ta.length&&ta[ta.length-1].focus) ta[ta.length-1].focus();
      if(alCambiar) alCambiar();
    }};
  }

  /* ---------- vista previa ---------- */
  function mostrarVista(html){
    var v=document.createElement('div'); v.className='vista'; v.innerHTML=html;
    v.addEventListener('click',function(e){if(e.target.closest('[data-cerrar]')) v.remove();});
    document.body.appendChild(v);
  }
  function htmlVista(o){
    return '<div class="vista-barra"><button type="button" class="btn-sec" data-cerrar>‹ Cerrar vista previa</button><span>Así se verá</span></div>'+
      '<div class="pagina"><article class="lectura">'+
      (o.imagen?'<div class="portada"><img src="'+esc(o.imagen)+'" alt=""></div>':'')+
      (o.etiqueta?'<div class="fila-etiqueta"><span class="etiqueta">'+esc(o.etiqueta)+'</span></div>':'')+
      '<h2>'+esc(o.titulo||'(sin título)')+'</h2>'+
      (o.fecha?'<p class="meta">'+esc(o.fecha)+'</p>':'')+
      (o.referencia?'<p class="referencia">'+esc(o.referencia)+'</p>':'')+
      '<div class="cuerpo">'+(o.parrafos.length?C.bloques(o.parrafos):'<p class="aviso-vacio">Todavía no escribiste el texto.</p>')+'</div></article></div>';
  }

  /* ---------- acceso ---------- */
  function acceso(){
    if(!(window.crypto&&window.crypto.subtle)){
      cont.innerHTML='<div class="error-carga">Este navegador no permite el acceso seguro. Abrí la app desde la dirección https de la página.</div>'; return;
    }
    if(!S.cfg.owner||!S.cfg.repo){
      cont.innerHTML='<div class="error-carga">Falta configurar el repositorio en <strong>data/editor.json</strong> (campos “owner” y “repo”).</div>'; return;
    }
    if(GH.hayLlave()) vistaLogin(); else vistaConfigurar();
  }
  function vistaConfigurar(){
    cont.innerHTML='<section class="oracion"><h3>Primer ingreso en este celular</h3>'+
      '<p>Para publicar hace falta la <strong>llave de GitHub</strong> (la crea el administrador del sitio) y una <strong>contraseña</strong> que elijas. La llave queda guardada acá, cifrada con tu contraseña.</p>'+
      '<details class="ayuda"><summary>Cómo se crea la llave</summary><ol>'+
        '<li>En GitHub: Settings → Developer settings → Personal access tokens → <em>Fine-grained tokens</em> → Generate new token.</li>'+
        '<li>Elegí un vencimiento y, en “Repository access”, <em>Only select repositories</em>: marcá solo el repositorio de la app.</li>'+
        '<li>En “Repository permissions” poné <strong>Contents: Read and write</strong>.</li>'+
        '<li>Generá la llave y copiala (empieza con <code>github_pat_</code>). Pegala acá abajo.</li></ol>'+
        '<p class="nota">Los nombres de los menús pueden variar un poco. Si la llave vence, hay que crear otra.</p></details>'+
      '<form class="form" id="f-cfg" novalidate>'+
        '<label for="c-token">Llave de GitHub</label><input id="c-token" type="password" autocomplete="off" autocapitalize="off" spellcheck="false">'+
        '<label for="c-p1">Elegí una contraseña (mínimo 8 caracteres)</label><input id="c-p1" type="password" autocomplete="new-password">'+
        '<label for="c-p2">Repetí la contraseña</label><input id="c-p2" type="password" autocomplete="new-password">'+
        '<div class="acciones"><button type="submit" class="btn-leer" id="c-ok">Guardar y entrar</button></div>'+
        '<p class="nota ed-msg" id="ed-estado"></p></form></section>';
    $('f-cfg').addEventListener('submit',function(e){
      e.preventDefault();
      var t=$('c-token').value.trim(), p1=$('c-p1').value, p2=$('c-p2').value;
      if(!t) return estado('Pegá la llave de GitHub.','error');
      if(p1.length<8) return estado('La contraseña necesita al menos 8 caracteres.','error');
      if(p1!==p2) return estado('Las contraseñas no coinciden.','error');
      $('c-ok').disabled=true; estado('Verificando…');
      GH.guardarLlave(t,p1).then(function(){GH.usar(t,S.cfg);return GH.verificar();}).then(entrar).catch(function(er){
        GH.olvidarLlave(); if($('c-ok')) $('c-ok').disabled=false; estado(GH.mensajeError(er),'error');
      });
    });
  }
  function vistaLogin(){
    cont.innerHTML='<section class="oracion"><h3>Ingresá tu contraseña</h3>'+
      '<form class="form" id="f-login" novalidate>'+
        '<label for="l-p">Contraseña</label><input id="l-p" type="password" autocomplete="current-password">'+
        '<div class="acciones"><button type="submit" class="btn-leer" id="l-ok">Entrar</button></div>'+
        '<p class="nota ed-msg" id="ed-estado"></p></form>'+
      '<p class="nota"><button type="button" class="enlace" data-acc="olvidar">Olvidar la llave de este celular</button></p></section>';
    $('f-login').addEventListener('submit',function(e){
      e.preventDefault();
      var p=$('l-p').value; if(!p) return estado('Escribí tu contraseña.','error');
      $('l-ok').disabled=true; estado('Entrando…');
      GH.abrirLlave(p).then(function(t){GH.usar(t,S.cfg);return GH.verificar();}).then(entrar).catch(function(er){
        GH.cerrar(); if($('l-ok')) $('l-ok').disabled=false; estado(GH.mensajeError(er),'error');
      });
    });
  }
  function entrar(){
    cont.innerHTML='<p class="cargando">Cargando tus artículos…</p>';
    return Promise.all([GH.leerJSON('data/articulos.json'),GH.leerJSON('data/devocionales.json')]).then(function(r){
      S.arts=Array.isArray(r[0].datos)?r[0].datos:[]; S.devs=Array.isArray(r[1].datos)?r[1].datos:[];
      panel();
    }).catch(function(er){
      cont.innerHTML='<div class="error-carga">'+esc(GH.mensajeError(er))+'</div><p><button type="button" class="btn-sec" data-acc="salir">Salir</button></p>';
    });
  }

  /* ---------- panel y listas ---------- */
  function panel(){
    ED=null;
    cont.innerHTML='<div class="ed-barra"><h2>Panel de editoras</h2><button type="button" class="btn-sec peq" data-acc="salir">Salir</button></div>'+
      '<div class="chips">'+
        '<button type="button" class="chip'+(S.vista==='articulos'?' activa':'')+'" data-acc="vista" data-v="articulos">Artículos</button>'+
        '<button type="button" class="chip'+(S.vista==='devocionales'?' activa':'')+'" data-acc="vista" data-v="devocionales">Devocionales</button></div>'+
      '<div id="ed-cuerpo"></div>';
    if(S.vista==='articulos') listaArticulos(); else listaDevocionales();
  }
  function item(titulo,sub,botones,borrador){
    return '<div class="ed-item"><div class="ed-item-txt"><strong>'+(borrador?'<span class="etiqueta">Borrador</span> ':'')+esc(titulo||'(sin título)')+'</strong><span>'+esc(sub||'')+'</span></div><div class="ed-item-acc">'+botones+'</div></div>';
  }
  function btn(txt,acc,attr,extra){return '<button type="button" class="btn-sec peq'+(extra?' '+extra:'')+'" data-acc="'+acc+'" '+attr+'>'+txt+'</button>';}

  function listaArticulos(){
    var bor=leerBor().filter(function(b){return b.tipo==='articulo';});
    var pub=S.arts.slice().sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');});
    $('ed-cuerpo').innerHTML='<button type="button" class="btn-leer" data-acc="nuevo-art">+ Nuevo artículo</button>'+
      (bor.length?'<h3 class="ed-sub">Borradores</h3><div class="lista">'+bor.map(function(b){
        return item(b.titulo,b.ref?'Edición de un artículo publicado':'Artículo nuevo',btn('Continuar','cont-art','data-id="'+esc(b.id)+'"')+btn('Borrar','borra-bor','data-id="'+esc(b.id)+'"','peligro'),true);
      }).join('')+'</div>':'')+
      '<h3 class="ed-sub">Publicados ('+pub.length+')</h3>'+
      (pub.length?'<div class="lista">'+pub.map(function(a){
        return item(a.titulo,[a.categoria,fechaCorta(a.fecha)].filter(Boolean).join(' · '),
          btn('Editar','edit-art','data-id="'+esc(a.id)+'"')+btn('Borrar','borra-art','data-id="'+esc(a.id)+'"','peligro'));
      }).join('')+'</div>':'<p class="vacio">Todavía no hay artículos publicados.</p>');
  }
  function listaDevocionales(){
    var bor=leerBor().filter(function(b){return b.tipo==='devocional';});
    var pub=S.devs.slice().sort(function(a,b){return b.fecha<a.fecha?-1:b.fecha>a.fecha?1:0;});
    var hoy=D.hoyISO();
    $('ed-cuerpo').innerHTML='<div class="acciones"><button type="button" class="btn-leer" data-acc="nuevo-dev">+ Nuevo devocional</button>'+
      '<button type="button" class="btn-sec" data-acc="lote">Cargar varios juntos</button></div>'+
      (bor.length?'<h3 class="ed-sub">Borradores</h3><div class="lista">'+bor.map(function(b){
        return item(b.titulo,b.fecha?fechaCorta(b.fecha):'Sin fecha',btn('Continuar','cont-dev','data-id="'+esc(b.id)+'"')+btn('Borrar','borra-bor','data-id="'+esc(b.id)+'"','peligro'),true);
      }).join('')+'</div>':'')+
      '<h3 class="ed-sub">Cargados ('+pub.length+')</h3>'+
      (pub.length?'<div class="lista">'+pub.map(function(d){
        return item(d.titulo,fechaCorta(d.fecha)+(d.fecha>hoy?' · aún no publicado':''),
          btn('Editar','edit-dev','data-f="'+esc(d.fecha)+'"')+btn('Borrar','borra-dev','data-f="'+esc(d.fecha)+'"','peligro'));
      }).join('')+'</div>':'<p class="vacio">Todavía no hay devocionales cargados.</p>');
  }

  /* ---------- editor de artículo ---------- */
  function editorArticulo(orig,draft){
    var d=draft?draft.datos:null;
    var E={id:draft?draft.id:null, ref:orig?String(orig.id):(draft?draft.ref:''), ocupado:false, t:null,
      imagenNueva:(d&&d.imagenData)?{dataURL:d.imagenData,ext:d.imagenExt||'webp',blob:null}:null,
      imagenActual:(d?d.imagenActual:(orig&&orig.imagen))||'',
      desc:((d?d.descargas:(orig&&orig.descargas))||[]).map(function(x){return {titulo:x.titulo,archivo:x.archivo};}), pend:[]};
    var bq=aBloques(d?d.parrafos:C.lista(orig||{}));
    var cats=S.cats.slice(), catActual=d?d.categoria:(orig&&orig.categoria)||cats[0]||'';
    if(catActual&&cats.indexOf(catActual)<0) cats.push(catActual);

    cont.innerHTML='<form class="form ed-form" id="ed-form" novalidate>'+
      '<h2 class="ed-titulo">'+(E.ref?'Editar artículo':'Nuevo artículo')+'</h2>'+
      (draft?'<p class="aviso-vacio">Estás continuando un borrador guardado en este celular.</p>':'')+
      '<label for="a-titulo">Título</label><input id="a-titulo" type="text">'+
      '<label for="a-cat">Categoría</label><select id="a-cat">'+cats.map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select>'+
      '<label for="a-resumen">Resumen (se ve en la lista y en el inicio)</label><textarea id="a-resumen" rows="3"></textarea>'+
      '<label for="a-fecha">Fecha</label><input id="a-fecha" type="date">'+
      '<label class="chk"><input type="checkbox" id="a-dest"> Artículo destacado (aparece en el inicio)</label>'+
      '<label for="a-file">Imagen de portada</label><div id="a-img" class="ed-img"></div>'+
      '<input id="a-file" type="file" accept="image/*">'+
      '<label>Texto del artículo</label><div id="a-bq"></div>'+
      '<div class="acciones"><button type="button" class="btn-sec peq" data-add="p">+ Párrafo</button><button type="button" class="btn-sec peq" data-add="sub">+ Subtítulo</button><button type="button" class="btn-sec peq" data-add="cita">+ Cita bíblica</button></div>'+
      '<label>Archivos para descargar (PDF)</label><div id="a-desc"></div>'+
      '<div class="ed-desc-add"><input id="a-dtit" type="text" placeholder="Nombre que verá la lectora"><input id="a-dfile" type="file" accept="application/pdf"><button type="button" class="btn-sec peq" id="a-dadd">Agregar archivo</button></div>'+
      '<div class="acciones ed-final"><button type="button" class="btn-sec" data-acc="e-vista">Vista previa</button><button type="button" class="btn-sec" data-acc="e-borrador">Guardar borrador</button><button type="button" class="btn-leer" data-acc="e-publicar" id="e-pub">Publicar</button><button type="button" class="enlace" data-acc="cancelar">Cancelar</button></div>'+
      '<p class="nota ed-msg" id="ed-estado"></p></form>';
    $('a-titulo').value=d?d.titulo:(orig&&orig.titulo)||'';
    $('a-cat').value=catActual;
    $('a-resumen').value=d?d.resumen:(orig&&orig.resumen)||'';
    $('a-fecha').value=d?d.fecha:(orig&&orig.fecha)||D.hoyISO();
    $('a-dest').checked=d?!!d.destacado:!!(orig&&orig.destacado);

    function leer(){return {titulo:$('a-titulo').value.trim(),categoria:$('a-cat').value,resumen:$('a-resumen').value.trim(),fecha:$('a-fecha').value,destacado:$('a-dest').checked};}
    function cambio(){ if(E.ref) return; clearTimeout(E.t); E.t=setTimeout(function(){E.borrador(true);},1500); }
    var B=Bloques($('a-bq'),bq,cambio);
    function pintarImg(){
      var src=E.imagenNueva?E.imagenNueva.dataURL:E.imagenActual;
      $('a-img').innerHTML=src?'<img src="'+esc(src)+'" alt="Portada">':'<p class="nota">Sin imagen. Si no subís una, el artículo se muestra sin portada.</p>';
    }
    function pintarDesc(){
      var todos=E.desc.map(function(x,i){return {t:x.titulo,i:i,nuevo:false};}).concat(E.pend.map(function(x,i){return {t:x.titulo,i:i,nuevo:true};}));
      $('a-desc').innerHTML=todos.length?todos.map(function(x){
        return '<div class="ed-desc"><span>'+esc(x.t)+(x.nuevo?' <em>(se sube al publicar)</em>':'')+'</span><button type="button" data-dq="'+(x.nuevo?'p':'d')+'" data-i="'+x.i+'" aria-label="Quitar">✕</button></div>';
      }).join(''):'<p class="nota">Sin archivos adjuntos.</p>';
    }
    pintarImg(); pintarDesc();

    $('ed-form').addEventListener('input',cambio);
    $('ed-form').addEventListener('click',function(e){
      var a=e.target.closest('[data-add]'); if(a){B.agregar(a.getAttribute('data-add'));return;}
      var q=e.target.closest('[data-dq]');
      if(q){var i=+q.getAttribute('data-i'); if(q.getAttribute('data-dq')==='p') E.pend.splice(i,1); else E.desc.splice(i,1); pintarDesc(); cambio(); return;}
      if(e.target.closest('#a-dadd')){
        var f=$('a-dfile').files[0], t=$('a-dtit').value.trim();
        if(!f) return estado('Elegí primero el archivo PDF.','error');
        if(f.size>15*1024*1024) return estado('El archivo pesa demasiado (máximo 15 MB).','error');
        t=t||f.name.replace(/\.pdf$/i,'');
        E.pend.push({titulo:t,file:f,archivo:'pdf/'+slug(t,50)+'-'+Date.now().toString(36).slice(-4)+'.pdf'});
        $('a-dfile').value=''; $('a-dtit').value=''; pintarDesc(); estado('');
      }
    });
    $('a-file').addEventListener('change',function(){
      var f=this.files[0]; if(!f) return;
      estado('Preparando la imagen…');
      reducirImagen(f).then(function(r){E.imagenNueva=r;pintarImg();estado('');cambio();},function(er){estado(er.message,'error');});
    });

    E.vista=function(){
      var v=leer();
      mostrarVista(htmlVista({imagen:E.imagenNueva?E.imagenNueva.dataURL:E.imagenActual,etiqueta:v.categoria,titulo:v.titulo,fecha:fechaCorta(v.fecha),parrafos:aParrafos(bq).length?aParrafos(bq):(v.resumen?[v.resumen]:[])}));
    };
    E.borrador=function(silencioso){
      var v=leer();
      if(!v.titulo&&!v.resumen&&!aParrafos(bq).length){ if(!silencioso) estado('Todavía no hay nada para guardar.'); return; }
      var l=leerBor(); if(!E.id) E.id='b-'+Date.now().toString(36);
      var reg={id:E.id,tipo:'articulo',ref:E.ref,titulo:v.titulo,actualizado:Date.now(),datos:{titulo:v.titulo,categoria:v.categoria,resumen:v.resumen,fecha:v.fecha,destacado:v.destacado,
        parrafos:aParrafos(bq),imagenActual:E.imagenActual,imagenData:E.imagenNueva?E.imagenNueva.dataURL:'',imagenExt:E.imagenNueva?E.imagenNueva.ext:'',descargas:E.desc}};
      var i=l.map(function(b){return b.id;}).indexOf(E.id); if(i>=0) l[i]=reg; else l.unshift(reg);
      var ok=guardarBor(l);
      estado(ok?(silencioso?'Borrador guardado.':'Borrador guardado en este celular.'):'No se pudo guardar el borrador (poco espacio en el celular).',ok?'':'error');
    };
    E.publicar=async function(){
      if(E.ocupado) return;
      var v=leer(), parr=aParrafos(bq);
      if(!v.titulo) return estado('Escribí el título.','error');
      if(!fechaValida(v.fecha)) return estado('Elegí una fecha válida.','error');
      if(!v.resumen&&!parr.length) return estado('Agregá un resumen o el texto del artículo.','error');
      if(!confirm('¿Publicar este artículo ahora?')) return;
      E.ocupado=true; $('e-pub').disabled=true; estado('Publicando… no cierres esta pantalla.');
      try{
        var id=E.ref||idUnico(v.titulo);
        var art=Object.assign({},orig||{},{id:id,titulo:v.titulo,categoria:v.categoria,resumen:v.resumen,fecha:v.fecha,destacado:v.destacado,parrafos:parr});
        delete art.texto; delete art.contenido;
        var imagen=E.imagenActual;
        if(E.imagenNueva){
          var blob=E.imagenNueva.blob||await (await fetch(E.imagenNueva.dataURL)).blob();
          var ruta='img/articulos/'+id+'.'+E.imagenNueva.ext;
          estado('Subiendo la imagen…'); await GH.subir(ruta,blob,'Editor: imagen de «'+v.titulo+'»'); imagen=ruta;
        }
        if(imagen) art.imagen=imagen; else delete art.imagen;
        var desc=E.desc.slice();
        for(var k=0;k<E.pend.length;k++){
          estado('Subiendo archivo '+(k+1)+' de '+E.pend.length+'…');
          await GH.subir(E.pend[k].archivo,E.pend[k].file,'Editor: archivo para «'+v.titulo+'»');
          desc.push({titulo:E.pend[k].titulo,archivo:E.pend[k].archivo});
        }
        if(desc.length) art.descargas=desc; else delete art.descargas;
        if(!art.resumen) delete art.resumen;
        if(!art.destacado) delete art.destacado;
        estado('Guardando el artículo…');
        S.arts=await GH.modificarJSON('data/articulos.json',function(arr){
          arr=Array.isArray(arr)?arr:[];
          if(art.destacado) arr.forEach(function(x){if(String(x.id)!==id) delete x.destacado;});
          var i=arr.map(function(x){return String(x.id);}).indexOf(id);
          if(i>=0) arr[i]=art; else arr.unshift(art);
          return arr;
        },'Editor: '+(orig?'actualizar':'publicar')+' artículo «'+v.titulo+'»');
        quitarBor(E.id); clearTimeout(E.t);
        S.vista='articulos'; panel(); C.aviso('Publicado. En un par de minutos lo verán las lectoras.');
      }catch(er){
        E.ocupado=false; if($('e-pub')) $('e-pub').disabled=false; estado(GH.mensajeError(er),'error');
      }
    };
    ED=E;
  }

  /* ---------- editor de devocional ---------- */
  function editorDevocional(orig,draft){
    var d=draft?draft.datos:null;
    var E={id:draft?draft.id:null, ref:orig?orig.fecha:(draft?draft.ref:''), ocupado:false, t:null};
    var bq=aBloques(d?d.parrafos:C.lista(orig||{}));
    cont.innerHTML='<form class="form ed-form" id="ed-form" novalidate>'+
      '<h2 class="ed-titulo">'+(E.ref?'Editar devocional':'Nuevo devocional')+'</h2>'+
      (draft?'<p class="aviso-vacio">Estás continuando un borrador guardado en este celular.</p>':'')+
      '<label for="v-fecha">Fecha en que se publica</label><input id="v-fecha" type="date">'+
      '<label for="v-titulo">Título</label><input id="v-titulo" type="text">'+
      '<label for="v-ref">Cita bíblica (opcional, ej.: Filipenses 4:6)</label><input id="v-ref" type="text">'+
      '<label>Texto</label><div id="v-bq"></div>'+
      '<div class="acciones"><button type="button" class="btn-sec peq" data-add="p">+ Párrafo</button><button type="button" class="btn-sec peq" data-add="sub">+ Subtítulo</button><button type="button" class="btn-sec peq" data-add="cita">+ Cita bíblica</button></div>'+
      '<div class="acciones ed-final"><button type="button" class="btn-sec" data-acc="e-vista">Vista previa</button><button type="button" class="btn-sec" data-acc="e-borrador">Guardar borrador</button><button type="button" class="btn-leer" data-acc="e-publicar" id="e-pub">Publicar</button><button type="button" class="enlace" data-acc="cancelar">Cancelar</button></div>'+
      '<p class="nota ed-msg" id="ed-estado"></p></form>';
    $('v-fecha').value=d?d.fecha:(orig&&orig.fecha)||'';
    $('v-titulo').value=d?d.titulo:(orig&&orig.titulo)||'';
    $('v-ref').value=d?d.referencia:(orig&&orig.referencia)||'';
    function leer(){return {fecha:$('v-fecha').value,titulo:$('v-titulo').value.trim(),referencia:$('v-ref').value.trim()};}
    function cambio(){ if(E.ref) return; clearTimeout(E.t); E.t=setTimeout(function(){E.borrador(true);},1500); }
    var B=Bloques($('v-bq'),bq,cambio);
    $('ed-form').addEventListener('input',cambio);
    $('ed-form').addEventListener('click',function(e){var a=e.target.closest('[data-add]'); if(a) B.agregar(a.getAttribute('data-add'));});

    E.vista=function(){
      var v=leer();
      mostrarVista(htmlVista({etiqueta:'Devocional',titulo:v.titulo,fecha:fechaCorta(v.fecha),referencia:v.referencia,parrafos:aParrafos(bq)}));
    };
    E.borrador=function(silencioso){
      var v=leer();
      if(!v.titulo&&!aParrafos(bq).length){ if(!silencioso) estado('Todavía no hay nada para guardar.'); return; }
      var l=leerBor(); if(!E.id) E.id='b-'+Date.now().toString(36);
      var reg={id:E.id,tipo:'devocional',ref:E.ref,titulo:v.titulo,fecha:v.fecha,actualizado:Date.now(),datos:{fecha:v.fecha,titulo:v.titulo,referencia:v.referencia,parrafos:aParrafos(bq)}};
      var i=l.map(function(b){return b.id;}).indexOf(E.id); if(i>=0) l[i]=reg; else l.unshift(reg);
      var ok=guardarBor(l);
      estado(ok?(silencioso?'Borrador guardado.':'Borrador guardado en este celular.'):'No se pudo guardar el borrador.',ok?'':'error');
    };
    E.publicar=async function(){
      if(E.ocupado) return;
      var v=leer(), parr=aParrafos(bq);
      if(!fechaValida(v.fecha)) return estado('Elegí la fecha de publicación.','error');
      if(!v.titulo) return estado('Escribí el título.','error');
      if(!parr.length) return estado('Escribí el texto del devocional.','error');
      var choca=S.devs.some(function(x){return x.fecha===v.fecha&&x.fecha!==E.ref;});
      if(choca&&!confirm('Ya hay un devocional para esa fecha. ¿Querés reemplazarlo?')) return;
      if(!confirm('¿Publicar este devocional ahora?')) return;
      E.ocupado=true; $('e-pub').disabled=true; estado('Publicando… no cierres esta pantalla.');
      try{
        var dev=Object.assign({},orig||{},{fecha:v.fecha,titulo:v.titulo,parrafos:parr});
        delete dev.texto; delete dev.contenido;
        if(v.referencia) dev.referencia=v.referencia; else delete dev.referencia;
        S.devs=await GH.modificarJSON('data/devocionales.json',function(arr){
          arr=Array.isArray(arr)?arr:[];
          arr=arr.filter(function(x){return x.fecha!==v.fecha&&x.fecha!==E.ref;});
          arr.push(dev); arr.sort(function(a,b){return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0;});
          return arr;
        },'Editor: devocional del '+v.fecha);
        quitarBor(E.id); clearTimeout(E.t);
        S.vista='devocionales'; panel(); C.aviso('Devocional guardado.');
      }catch(er){
        E.ocupado=false; if($('e-pub')) $('e-pub').disabled=false; estado(GH.mensajeError(er),'error');
      }
    };
    ED=E;
  }

  /* ---------- cargar varios devocionales juntos ---------- */
  function parsearLote(txt){
    var bloques=txt.replace(/\r/g,'').split(/^\s*-{3,}\s*$/m).map(function(s){return s.trim();}).filter(Boolean);
    var vistos={};
    return bloques.map(function(b,n){
      var l=b.split('\n');
      var f=normFecha(l.shift());
      while(l.length&&!l[0].trim()) l.shift();
      var titulo=(l.shift()||'').trim(), ref='';
      while(l.length&&!l[0].trim()&&!ref) { if(/^\s*$/.test(l[0])) l.shift(); else break; }
      if(l.length&&/^\s*(cita|ref|referencia)\s*:/i.test(l[0])) ref=l.shift().replace(/^[^:]*:/,'').trim();
      var texto=l.join('\n').trim();
      var parr=texto?texto.split(/\n\s*\n/).map(function(s){return s.trim();}).filter(Boolean):[];
      var er=[]; if(!f) er.push('fecha no válida'); if(!titulo) er.push('falta el título'); if(!parr.length) er.push('falta el texto');
      if(f&&vistos[f]) er.push('fecha repetida en el lote'); if(f) vistos[f]=1;
      return {n:n+1,fecha:f,titulo:titulo,referencia:ref,parrafos:parr,error:er.join(', ')};
    });
  }
  function vistaLote(){
    ED=null; LOTE=[];
    cont.innerHTML='<div class="ed-barra"><h2>Cargar varios devocionales</h2><button type="button" class="btn-sec peq" data-acc="cancelar">‹ Volver</button></div>'+
      '<p class="intro">Pegá todos los devocionales juntos. Separá cada uno con una línea que tenga <code>---</code>.</p>'+
      '<details class="ayuda"><summary>Ver el formato</summary><pre class="ejemplo">2026-11-01\nTítulo del devocional\nCita: Salmo 23:1\nPrimer párrafo del texto.\n\nSegundo párrafo.\n---\n02/11/2026\nOtro título\nTexto del segundo día...</pre>'+
      '<p class="nota">1.ª línea: fecha (2026-11-01 o 01/11/2026). 2.ª: título. 3.ª (opcional): “Cita: …”. Después, el texto con una línea en blanco entre párrafos.</p></details>'+
      '<form class="form" id="f-lote"><textarea id="l-txt" rows="14" placeholder="Pegá acá los devocionales…"></textarea>'+
      '<div class="acciones"><button type="button" class="btn-leer" data-acc="lote-revisar">Revisar</button><button type="button" class="enlace" data-acc="cancelar">Cancelar</button></div></form>'+
      '<div id="l-res"></div><p class="nota ed-msg" id="ed-estado"></p>';
  }
  function revisarLote(){
    var txt=$('l-txt').value; if(!txt.trim()) return estado('Pegá primero los devocionales.','error');
    LOTE=parsearLote(txt);
    var ok=LOTE.filter(function(x){return !x.error;}), mal=LOTE.length-ok.length;
    var existentes=S.devs.map(function(x){return x.fecha;});
    $('l-res').innerHTML='<h3 class="ed-sub">Resultado: '+ok.length+' listos'+(mal?', '+mal+' con errores':'')+'</h3><div class="lista">'+LOTE.map(function(x){
      return '<div class="ed-item'+(x.error?' ed-err':'')+'"><div class="ed-item-txt"><strong>'+esc(x.titulo||'(sin título)')+'</strong><span>'+esc(x.fecha?fechaCorta(x.fecha):'Fecha no válida')+
        (x.error?' · '+esc(x.error):(existentes.indexOf(x.fecha)>=0?' · reemplaza al existente':' · nuevo'))+'</span></div></div>';
    }).join('')+'</div>'+
    (ok.length?'<div class="acciones"><button type="button" class="btn-leer" data-acc="lote-publicar" id="l-pub">Publicar '+ok.length+' devocionales</button></div>':'<p class="vacio">Corregí los errores y volvé a revisar.</p>');
    estado(mal?'Los que tienen errores no se publicarán.':'');
  }
  async function publicarLote(){
    var ok=LOTE.filter(function(x){return !x.error;}); if(!ok.length) return;
    if(!confirm('¿Publicar '+ok.length+' devocionales?')) return;
    $('l-pub').disabled=true; estado('Publicando…');
    try{
      S.devs=await GH.modificarJSON('data/devocionales.json',function(arr){
        arr=Array.isArray(arr)?arr:[];
        var fechas=ok.map(function(x){return x.fecha;});
        arr=arr.filter(function(x){return fechas.indexOf(x.fecha)<0;});
        ok.forEach(function(x){var o={fecha:x.fecha,titulo:x.titulo,parrafos:x.parrafos}; if(x.referencia) o.referencia=x.referencia; arr.push(o);});
        arr.sort(function(a,b){return a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0;});
        return arr;
      },'Editor: cargar '+ok.length+' devocionales');
      S.vista='devocionales'; panel(); C.aviso(ok.length+' devocionales guardados.');
    }catch(er){ if($('l-pub')) $('l-pub').disabled=false; estado(GH.mensajeError(er),'error'); }
  }

  /* ---------- acciones ---------- */
  function borrarArt(id){
    var a=S.arts.filter(function(x){return String(x.id)===id;})[0]; if(!a) return;
    if(!confirm('¿Borrar el artículo «'+a.titulo+'»? Dejará de verse en la app.')) return;
    C.aviso('Borrando…');
    GH.modificarJSON('data/articulos.json',function(arr){return (arr||[]).filter(function(x){return String(x.id)!==id;});},'Editor: borrar artículo «'+a.titulo+'»')
      .then(function(l){S.arts=l;panel();C.aviso('Artículo borrado.');}).catch(function(er){C.aviso(GH.mensajeError(er));});
  }
  function borrarDev(f){
    var d=S.devs.filter(function(x){return x.fecha===f;})[0]; if(!d) return;
    if(!confirm('¿Borrar el devocional «'+d.titulo+'»?')) return;
    C.aviso('Borrando…');
    GH.modificarJSON('data/devocionales.json',function(arr){return (arr||[]).filter(function(x){return x.fecha!==f;});},'Editor: borrar devocional del '+f)
      .then(function(l){S.devs=l;panel();C.aviso('Devocional borrado.');}).catch(function(er){C.aviso(GH.mensajeError(er));});
  }
  var ACC={
    'salir':function(){GH.cerrar();acceso();},
    'olvidar':function(){if(confirm('¿Olvidar la llave guardada en este celular? Para volver a publicar habrá que cargarla otra vez.')){GH.olvidarLlave();acceso();}},
    'vista':function(b){S.vista=b.getAttribute('data-v');panel();},
    'cancelar':function(){if(ED&&ED.t) clearTimeout(ED.t); panel();},
    'nuevo-art':function(){editorArticulo(null,null);},
    'edit-art':function(b){
      var id=b.getAttribute('data-id'), a=S.arts.filter(function(x){return String(x.id)===id;})[0]; if(!a) return;
      var bor=leerBor().filter(function(x){return x.tipo==='articulo'&&x.ref===id;})[0];
      editorArticulo(a,bor||null);
    },
    'cont-art':function(b){
      var bor=borPorId(b.getAttribute('data-id')); if(!bor) return;
      var orig=bor.ref?S.arts.filter(function(x){return String(x.id)===bor.ref;})[0]:null;
      editorArticulo(orig||null,bor);
    },
    'borra-art':function(b){borrarArt(b.getAttribute('data-id'));},
    'borra-bor':function(b){if(confirm('¿Borrar este borrador?')){quitarBor(b.getAttribute('data-id'));panel();}},
    'nuevo-dev':function(){editorDevocional(null,null);},
    'edit-dev':function(b){
      var f=b.getAttribute('data-f'), d=S.devs.filter(function(x){return x.fecha===f;})[0]; if(!d) return;
      var bor=leerBor().filter(function(x){return x.tipo==='devocional'&&x.ref===f;})[0];
      editorDevocional(d,bor||null);
    },
    'cont-dev':function(b){
      var bor=borPorId(b.getAttribute('data-id')); if(!bor) return;
      var orig=bor.ref?S.devs.filter(function(x){return x.fecha===bor.ref;})[0]:null;
      editorDevocional(orig||null,bor);
    },
    'borra-dev':function(b){borrarDev(b.getAttribute('data-f'));},
    'lote':vistaLote, 'lote-revisar':revisarLote, 'lote-publicar':publicarLote,
    'e-vista':function(){if(ED) ED.vista();},
    'e-borrador':function(){if(ED) ED.borrador(false);},
    'e-publicar':function(){if(ED) ED.publicar();}
  };
  cont.addEventListener('click',function(e){
    var b=e.target.closest('[data-acc]'); if(!b) return;
    var f=ACC[b.getAttribute('data-acc')]; if(f) f(b,e);
  });

  /* ---------- arranque ---------- */
  C.iniciarPagina('editoras');
  C.get('data/editor.json').then(function(cfg){
    var r=cfg.repo||{};
    /* Si no se indicó el repositorio, se intenta deducir de una dirección github.io */
    if(!r.owner&&/\.github\.io$/.test(location.hostname)){
      r.owner=location.hostname.split('.')[0];
      r.repo=r.repo||location.pathname.split('/')[1]||'';
    }
    S.cfg={owner:(r.owner||'').trim(),repo:(r.repo||'').trim(),rama:(r.rama||'main').trim(),api:cfg.api||''};
    S.cats=Array.isArray(cfg.categorias)?cfg.categorias:[];
    acceso();
  }).catch(function(){cont.innerHTML='<div class="error-carga">No se pudo cargar data/editor.json.</div>';});
})();
