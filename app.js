'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const levelNames = {exterieur:'Extérieur',rdc:'Rez-de-chaussée',etage:'Étage'};
  const scenes = [
    {id:'facade',title:'Façade & entrée',level:'exterieur',eyebrow:'L’arrivée',description:'L’allée, la façade nord et l’accès à la maison.',alt:'Façade nord de la maison et allée menant à l’entrée',size:[1546,1017],meta:'Vue nord',spots:[['sejour',50,65,'Entrer'],['jardin',78,83,'Côté jardin']]},
    {id:'sejour',title:'La pièce de vie',level:'rdc',eyebrow:'Vivre & recevoir',description:'Une perspective du séjour ouvert sur la cuisine et le jardin.',alt:'Projection d’aménagement du séjour, avec cuisine ouverte et accès vers la terrasse',size:[1672,941],meta:'Séjour ouvert',generated:true,spots:[['cuisine',56,38,'Cuisine'],['jardin',26,51,'Terrasse'],['palier',85,57,'Étage']]},
    {id:'cuisine',title:'La cuisine ouverte',level:'rdc',eyebrow:'Au cœur de la maison',description:'Un aménagement proposé pour la cuisine et son espace repas.',alt:'Perspective indicative de la cuisine, îlot en bois clair et rangements',size:[492,288],meta:'Perspective d’aménagement',generated:true,spots:[['sejour',35,73,'Séjour'],['suite',78,53,'Suite']]},
    {id:'suite',title:'La suite parentale',level:'rdc',eyebrow:'L’espace privé',description:'La chambre du rez-de-chaussée, avec salle d’eau repérée sur le plan.',alt:'Projection d’aménagement de la suite parentale au rez-de-chaussée',size:[574,254],meta:'Au rez-de-chaussée',generated:true,spots:[['sejour',22,55,'Séjour']]},
    {id:'jardin',title:'Terrasse & piscine',level:'exterieur',eyebrow:'La vie dehors',description:'La façade sud et sa terrasse, ouvertes sur le jardin et la piscine.',alt:'Façade sud de la maison avec terrasse en bois, jardin et piscine',size:[1654,951],meta:'Vue sud',spots:[['sejour',33,54,'Séjour'],['suite',72,56,'Suite'],['est',80,81,'Vue est']]},
    {id:'palier',title:'Le palier de l’étage',level:'etage',eyebrow:'Monter à l’étage',description:'L’escalier rejoint le palier desservant les deux chambres et la salle de bains.',alt:'Perspective indicative du palier de l’étage et de la cage d’escalier',size:[835,416],meta:'Escalier & distribution',generated:true,spots:[['sejour',27,74,'Descendre'],['chambre1',60,48,'Chambre 1'],['chambre2',79,78,'Chambre 2']]},
    {id:'chambre1',title:'Chambre 1',level:'etage',eyebrow:'Un espace à soi',description:'Chambre de 12,38 m² selon le plan fourni. Aménagement intérieur proposé.',alt:'Projection d’aménagement de la chambre de 12,38 mètres carrés',size:[829,413],meta:'12,38 m² · selon le plan',generated:true,spots:[['palier',18,68,'Palier'],['chambre2',78,72,'Chambre 2']]},
    {id:'chambre2',title:'Chambre 2',level:'etage',eyebrow:'Un espace à soi',description:'Chambre de 11,53 m² selon le plan fourni. Aménagement intérieur proposé.',alt:'Projection d’aménagement de la chambre de 11,53 mètres carrés',size:[835,365],meta:'11,53 m² · selon le plan',generated:true,spots:[['palier',16,55,'Palier'],['sdb',75,73,'Salle de bains']]},
    {id:'sdb',title:'La salle de bains',level:'etage',eyebrow:'Les espaces de confort',description:'Salle de bains de 4,28 m² selon le plan fourni. Les équipements illustrés sont indicatifs.',alt:'Perspective indicative de la salle de bains de l’étage',size:[829,369],meta:'4,28 m² · selon le plan',generated:true,spots:[['palier',18,65,'Palier'],['jardin',76,75,'Jardin']]},
    {id:'est',title:'La maison côté est',level:'exterieur',eyebrow:'Faire le tour',description:'Un autre point de vue sur les volumes et les ouvertures de la maison.',alt:'Vue extérieure est de la maison fournie pour le projet',size:[1536,1024],meta:'Vue est',spots:[['jardin',28,74,'Jardin'],['ouest',72,76,'Vue ouest']]},
    {id:'ouest',title:'La maison côté ouest',level:'exterieur',eyebrow:'Faire le tour',description:'La vue ouest complète la découverte des façades.',alt:'Vue extérieure ouest de la maison fournie pour le projet',size:[1536,1024],meta:'Vue ouest',spots:[['facade',25,75,'Entrée'],['jardin',75,76,'Jardin']]}
  ];
  const byId = Object.fromEntries(scenes.map(s => [s.id,s]));
  const route = ['facade','sejour','cuisine','suite','jardin','palier','chambre1','chambre2','sdb'];
  const levelOrder = {exterieur:['facade','jardin','est','ouest'],rdc:['sejour','cuisine','suite'],etage:['palier','chambre1','chambre2','sdb']};
  const planSpots = {rdc:[['cuisine',30,56,'Cuisine'],['sejour',51,73,'Séjour'],['suite',82,69,'Suite'],['palier',59,37,'Étage']],etage:[['chambre2',36,26,'Chambre 2'],['chambre1',36,65,'Chambre 1'],['sdb',70,71,'Salle de bains'],['palier',61,41,'Palier']]};
  let current=byId.facade, selectedLevel='exterieur', zoom=1, pan={x:0,y:0}, showSpots=true, playing=false, playTimer=null, progressFrame=null, playStart=0, requestId=0, toastTimer=null, planLevel='rdc';
  const pointers=new Map(); let dragStart=null, moved=false, pinchStart=null, fallbackFullscreen=false;
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
  function spotsInto(element,spots,onSelect){
    element.replaceChildren();
    spots.forEach(([id,x,y,label])=>{
      const b=document.createElement('button');b.className='hotspot';b.style.left=x+'%';b.style.top=y+'%';b.setAttribute('aria-label','Visiter : '+byId[id].title);b.dataset.target=id;
      const plus=document.createElement('span');plus.textContent='+';plus.setAttribute('aria-hidden','true');const t=document.createElement('span');t.textContent=label;b.append(plus,t);b.onclick=()=>onSelect(id);element.append(b);
    });
  }
  // Écarte verticalement les points qui se chevauchent ou masquent les outils sur petit écran, sans les éloigner de leur repère.
  // reach : écart maximal en hauteurs de point (plus strict sur les plans, où la position repère une pièce).
  function declutter(element,bounds,obstacles=[],reach=1.5){
    const items=[...element.children];items.forEach(b=>b.style.marginTop='');
    const limit=bounds.getBoundingClientRect();if(!limit.height)return;
    const gap=4,placed=obstacles.map(o=>o.getBoundingClientRect()).filter(r=>r.height);
    items.map(b=>({b,r:b.getBoundingClientRect()})).sort((a,c)=>a.r.top-c.r.top).forEach(({b,r})=>{
      const hit=s=>placed.find(p=>r.left<p.right+gap&&r.right>p.left-gap&&r.top+s<p.bottom+gap&&r.bottom+s>p.top-gap);
      const search=dir=>{let s=0;for(let p=hit(s),n=0;p&&n<=placed.length;p=hit(s),n++)s=dir>0?p.bottom+gap-r.top:p.top-gap-r.bottom;return s;};
      const ok=s=>Math.abs(s)<=r.height*reach&&r.top+s>=limit.top+gap&&r.bottom+s<=limit.bottom-gap&&!hit(s);
      const shift=hit(0)?[search(1),search(-1)].filter(ok).sort((a,c)=>Math.abs(a)-Math.abs(c))[0]||0:0;
      if(shift)b.style.marginTop=shift+'px';
      placed.push({left:r.left,right:r.right,top:r.top+shift,bottom:r.bottom+shift});
    });
  }
  function restartMove(){const img=$('sceneImage');img.style.animation='none';void img.offsetWidth;img.style.animation='';}
  function renderRooms(){
    document.querySelectorAll('[data-level]').forEach(b=>{const active=b.dataset.level===selectedLevel;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    $('roomList').setAttribute('aria-labelledby','tab-'+selectedLevel);$('roomList').replaceChildren();
    levelOrder[selectedLevel].forEach(id=>{const s=byId[id],b=document.createElement('button');b.className='room';b.dataset.scene=id;b.setAttribute('aria-current',String(current.id===id));
      const img=document.createElement('img');img.src='assets/'+id+'-thumb.webp';img.alt='';img.width=240;img.height=150;img.loading='lazy';
      const t=document.createElement('span');t.textContent=s.title;const sub=document.createElement('small');sub.textContent=s.meta;t.append(sub);b.append(img,t);b.onclick=()=>go(id);$('roomList').append(b);});
  }
  function fit(){
    const v=$('viewer'),[w,h]=current.size,ratio=Math.min(v.clientWidth/w,v.clientHeight/h);
    $('sceneSurface').style.width=(w*ratio)+'px';$('sceneSurface').style.height=(h*ratio)+'px';clampPan();applyTransform();
    if(zoom===1)declutter($('hotspots'),v,[...document.querySelectorAll('.viewer-tools,.view-top span')],3);
    if($('planDialog').open)fitPlan();
  }
  function clampPan(){const v=$('viewer'),s=$('sceneSurface');const maxX=Math.max(0,(parseFloat(s.style.width||'0')*zoom-v.clientWidth)/2),maxY=Math.max(0,(parseFloat(s.style.height||'0')*zoom-v.clientHeight)/2);pan.x=Math.max(-maxX,Math.min(maxX,pan.x));pan.y=Math.max(-maxY,Math.min(maxY,pan.y));}
  function applyTransform(){const s=$('sceneSurface');s.style.transform=`translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`;s.classList.toggle('zoomed',zoom>1);$('zoomReset').textContent=Math.round(zoom*100)+' %';$('zoomOut').disabled=zoom<=1;$('zoomIn').disabled=zoom>=3;$('hotspots').classList.toggle('hidden',!showSpots||zoom>1.01);$('viewer').style.touchAction=zoom>1?'none':'pan-y';$('viewHint').textContent=zoom>1?'Faites glisser pour explorer':'Cliquez sur un point pour changer d’espace';}
  function setZoom(value){stopGuided();zoom=Math.max(1,Math.min(3,value));if(zoom===1)pan={x:0,y:0};clampPan();applyTransform();}
  function updateInfo(){
    $('sceneTitle').textContent=current.title;$('sceneEyebrow').textContent=current.eyebrow.toUpperCase();$('sceneDescription').textContent=current.description;
    $('viewLevel').textContent=levelNames[current.level].toUpperCase();$('sourceLabel').textContent=current.generated?'Projection d’aménagement':'Visuel du projet';
    const i=route.indexOf(current.id);$('sceneNumber').textContent=String(i<0?scenes.indexOf(current)+1:i+1).padStart(2,'0');$('stepCount').textContent=i<0?'Autre vue':`${i+1} / ${route.length}`;
    $('prev').disabled=i===0;$('next').disabled=i===route.length-1;
    $('viewer').setAttribute('aria-label',current.title+'. Les touches gauche et droite changent d’espace.');
    spotsInto($('hotspots'),current.spots,id=>go(id));selectedLevel=current.level;renderRooms();
    document.title=current.title+' · Maison méditerranéenne';
  }
  function go(id,automatic=false){
    if(!byId[id])return;if(!automatic)stopGuided();current=byId[id];zoom=1;pan={x:0,y:0};updateInfo();fit();$('imageError').hidden=true;
    history.replaceState(null,'','#'+id);
    const n=++requestId;const preload=new Image();$('sceneSurface').classList.add('transitioning');
    preload.onload=()=>{if(n!==requestId)return;$('sceneImage').src=preload.src;$('sceneImage').alt=current.alt;$('sceneImage').width=current.size[0];$('sceneImage').height=current.size[1];$('backdrop').style.backgroundImage=`url("assets/${id}.webp")`;$('sceneSurface').classList.remove('transitioning');if(playing)restartMove();};
    preload.onerror=()=>{if(n!==requestId)return;$('sceneSurface').classList.remove('transitioning');$('imageError').hidden=false;stopGuided();};
    preload.src='assets/'+id+'.webp';if(automatic)scheduleStep();
  }
  function next(delta){const i=route.indexOf(current.id);const n=i<0?(delta>0?0:route.length-1):Math.max(0,Math.min(route.length-1,i+delta));go(route[n]);}
  function stopGuided(){if(!playing)return;playing=false;clearTimeout(playTimer);cancelAnimationFrame(progressFrame);$('tourApp').classList.remove('is-playing');$('guided').setAttribute('aria-pressed','false');$('guidedLabel').textContent='Visite guidée';$('guided').setAttribute('aria-label','Démarrer la visite guidée');$('playIcon').innerHTML='<path d="m8 5 11 7-11 7z"/>';$('guidedProgress').firstElementChild.style.width='0%';}
  function scheduleStep(){clearTimeout(playTimer);cancelAnimationFrame(progressFrame);playStart=performance.now();
    const frame=()=>{if(!playing)return;$('guidedProgress').firstElementChild.style.width=Math.min(100,(performance.now()-playStart)/90)+'%';progressFrame=requestAnimationFrame(frame);};progressFrame=requestAnimationFrame(frame);
    playTimer=setTimeout(()=>{const i=route.indexOf(current.id);if(i>=route.length-1){stopGuided();toast('La visite est terminée. Explorez librement les espaces.');}else go(route[i+1],true);},9000);
  }
  function startGuided(){if(playing){stopGuided();return;}playing=true;$('tourApp').classList.add('is-playing');$('guided').setAttribute('aria-pressed','true');$('guidedLabel').textContent='Pause';$('guided').setAttribute('aria-label','Mettre la visite guidée en pause');$('playIcon').innerHTML='<path d="M8 5v14M16 5v14"/>';if(route.indexOf(current.id)<0||current.id==='sdb')go('facade',true);else{zoom=1;pan={x:0,y:0};applyTransform();restartMove();scheduleStep();}}
  function updateFullscreen(){const active=!!document.fullscreenElement||fallbackFullscreen;$('fullscreen').setAttribute('aria-label',active?'Quitter le plein écran':'Afficher la visite en plein écran');$('fullscreen').setAttribute('aria-pressed',String(active));requestAnimationFrame(fit);}
  async function fullscreen(){
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if(fallbackFullscreen){fallbackFullscreen=false;$('tourApp').classList.remove('immersive');document.body.style.overflow='';updateFullscreen();return;}
    try{if(!$('tourApp').requestFullscreen)throw new Error('unsupported');await $('tourApp').requestFullscreen();}catch{fallbackFullscreen=true;$('tourApp').classList.add('immersive');document.body.style.overflow='hidden';updateFullscreen();}
  }
  function fitPlan(){const stage=document.querySelector('.plan-stage'),dims=planLevel==='rdc'?[1370,1148]:[1388,1133],scale=Math.min(stage.clientWidth/dims[0],stage.clientHeight/dims[1]);$('planSurface').style.width=dims[0]*scale+'px';$('planSurface').style.height=dims[1]*scale+'px';declutter($('planHotspots'),stage);}
  function renderPlan(level){planLevel=level;$('planImage').src='assets/plan-'+(level==='rdc'?'rdc':'etage')+'.webp';$('planImage').alt='Plan 3D '+(level==='rdc'?'du rez-de-chaussée':'de l’étage');document.querySelectorAll('[data-plan]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plan===level)));spotsInto($('planHotspots'),planSpots[level],id=>{$('planDialog').close();go(id);$('viewer').focus({preventScroll:true});});fitPlan();}
  $('prev').onclick=()=>next(-1);$('next').onclick=()=>next(1);$('guided').onclick=startGuided;$('fullscreen').onclick=fullscreen;
  $('zoomIn').onclick=()=>setZoom(zoom+.25);$('zoomOut').onclick=()=>setZoom(zoom-.25);$('zoomReset').onclick=()=>setZoom(1);
  $('toggleHotspots').onclick=()=>{showSpots=!showSpots;$('toggleHotspots').setAttribute('aria-pressed',String(showSpots));$('toggleHotspots').setAttribute('aria-label',showSpots?'Masquer les points de navigation':'Afficher les points de navigation');applyTransform();};
  $('retryImage').onclick=()=>go(current.id);
  document.querySelectorAll('[data-level]').forEach(b=>{b.onclick=()=>{selectedLevel=b.dataset.level;renderRooms();};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const levels=['exterieur','rdc','etage'],i=levels.indexOf(selectedLevel);selectedLevel=e.key==='Home'?levels[0]:e.key==='End'?levels[2]:levels[(i+(e.key==='ArrowRight'?1:2))%3];renderRooms();$('tab-'+selectedLevel).focus();};});
  $('openPlan').onclick=()=>{stopGuided();$('planDialog').showModal();renderPlan(current.level==='etage'?'etage':'rdc');};$('closePlan').onclick=()=>$('planDialog').close();
  $('planDialog').addEventListener('click',e=>{if(e.target===$('planDialog')){const r=$('planDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('planDialog').close();}});
  document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>renderPlan(b.dataset.plan));
  document.querySelector('.brand').onclick=e=>{e.preventDefault();go('facade');};
  document.addEventListener('fullscreenchange',updateFullscreen);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopGuided();});
  document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||$('planDialog').open||(e.target.closest&&e.target.closest('input,textarea,[role=tab]')))return;if(e.key==='ArrowRight'){e.preventDefault();next(1);}else if(e.key==='ArrowLeft'){e.preventDefault();next(-1);}else if(e.key.toLowerCase()==='f'){e.preventDefault();fullscreen();}else if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(zoom+.25);}else if(e.key==='-'){e.preventDefault();setZoom(zoom-.25);}else if(e.key==='Escape'){if(fallbackFullscreen)fullscreen();else if(zoom>1)setZoom(1);}});
  const v=$('viewer');
  v.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});dragStart={x:e.clientX,y:e.clientY,panX:pan.x,panY:pan.y};moved=false;if(zoom>1){v.setPointerCapture(e.pointerId);$('sceneSurface').classList.add('dragging');}if(pointers.size===2){stopGuided();const [a,b]=[...pointers.values()];pinchStart={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};v.style.touchAction='none';}});
  v.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinchStart){const [a,b]=[...pointers.values()];zoom=Math.max(1,Math.min(3,pinchStart.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinchStart.distance)));clampPan();applyTransform();return;}if(!dragStart)return;const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;if(Math.abs(dx)+Math.abs(dy)>8)moved=true;if(zoom>1){stopGuided();pan={x:dragStart.panX+dx,y:dragStart.panY+dy};clampPan();applyTransform();}});
  function release(e){if(!pointers.has(e.pointerId))return;const wasPinch=!!pinchStart;if(zoom===1&&dragStart&&moved&&!wasPinch&&e.type!=='pointercancel'){const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5)next(dx<0?1:-1);}pointers.delete(e.pointerId);pinchStart=null;if(pointers.size===0){dragStart=null;v.style.touchAction=zoom>1?'none':'pan-y';$('sceneSurface').classList.remove('dragging');}}
  v.addEventListener('pointerup',release);v.addEventListener('pointercancel',release);v.addEventListener('lostpointercapture',()=>{$('sceneSurface').classList.remove('dragging');});
  v.addEventListener('dblclick',e=>{if(!e.target.closest('button'))setZoom(zoom>1?1:1.75);});
  v.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();setZoom(zoom+(e.deltaY<0?.15:-.15));},{passive:false});
  $('sceneImage').addEventListener('error',()=>{$('imageError').hidden=false;stopGuided();});
  window.addEventListener('resize',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe(v);
  $('backdrop').style.backgroundImage='url("assets/facade.webp")';const start=location.hash.slice(1);if(byId[start]&&start!=='facade')go(start);else{updateInfo();fit();}
  window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(byId[id]&&id!==current.id)go(id);});
})();
