/* Original chip compositions and input-driven, fixed-step tetromino physics. */
window.createExperience = function (shapes, reducedMotion) {
  'use strict';
  const $ = id => document.getElementById(id);
  const read = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const tracks = [
    { id:'field', name:'01 · FIELD NOTES', mood:'旷野手记 · 留白与钟音', bpm:80, beats:8, wave:'square',
      melody:[[74,null,null,81,78,null,76,null],[null,69,null,74,null,null,76,null],[78,null,81,null,85,null,null,81],[78,null,76,null,null,null,null,null],[74,null,null,78,81,null,83,null],[81,null,78,null,76,null,null,69],[71,null,74,null,null,78,76,null],[74,null,null,null,null,null,null,null]],
      chords:[[50,57,62,66],[47,54,59,62],[43,50,57,62],[45,52,59,64]] },
    { id:'sky', name:'02 · SKY ISLAND', mood:'空岛微光 · 空灵分解和弦', bpm:68, beats:8, wave:'triangle',
      melody:[[79,null,null,86,null,85,81,null],[83,null,81,null,78,null,null,null],[74,null,81,null,83,null,86,null],[90,null,null,86,85,null,null,null],[83,81,null,null,78,null,79,null],[86,null,90,null,88,null,null,85],[83,null,null,81,null,78,74,null],[79,null,null,null,null,null,null,null]],
      chords:[[43,50,59,66],[45,52,61,66],[47,54,62,66],[50,57,64,69]] },
    { id:'grove', name:'03 · CLOVER DANCE', mood:'苜蓿舞曲 · 凯尔特 6/8 拍', bpm:112, beats:6, wave:'square',
      melody:[[74,77,81,79,77,74],[72,76,79,81,79,76],[74,77,81,84,81,79],[77,76,74,72,69,null],[81,84,86,84,81,77],[79,83,86,83,79,76],[77,81,79,77,76,72],[74,69,72,74,null,null]],
      chords:[[50,57,62,65],[48,55,60,64],[43,50,59,62],[50,57,62,65]] },
    { id:'night', name:'04 · MOSS LANTERN', mood:'苔灯夜行 · 缓慢摇曳的电子小调', bpm:60, beats:8, wave:'triangle',
      melody:[[76,null,79,null,83,null,null,81],[79,null,null,76,null,74,null,null],[71,null,74,null,78,null,79,null],[78,null,null,null,74,null,null,null],[83,null,86,null,null,83,81,null],[79,null,null,78,76,null,74,null],[71,null,74,null,76,null,78,null],[76,null,null,null,null,null,null,null]],
      chords:[[40,47,55,59],[43,50,57,62],[45,52,59,64],[47,54,59,62]] }
  ];
  let selected = tracks.find(t => t.id === read('xiye-track','field')) || tracks[0];
  let musicOn=read('xiye-music','on')!=='off', sfxOn=read('xiye-sfx','on')!=='off';
  let audio, master, musicBus, sfxBus, pending, unlocking=false, nextNote=0, step=0;
  const voices=new Set(), sfxTimes=new Map();
  const menu=$('music-menu'), musicButton=$('music-toggle'), muteButton=$('music-mute'), sfxButton=$('sfx-toggle');
  tracks.forEach(track => {
    const button=document.createElement('button'); button.type='button'; button.className='track-option'; button.dataset.track=track.id;
    button.setAttribute('role','menuitemradio'); button.innerHTML='<span>'+track.name+'</span><small>'+track.mood+'</small>';
    button.addEventListener('click',()=>{ selected=track; save('xiye-track',track.id); musicOn=true;save('xiye-music','on');stopVoices('music');step=0;nextNote=0;sync();unlockAudio();if(musicBus)musicBus.gain.setTargetAtTime(.5,audio.currentTime,.035);playSfx('select','menu'); });
    $('track-list').append(button);
  });
  function sync(){
    document.querySelectorAll('[data-track]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.track===selected.id)));
    musicButton.dataset.on=String(musicOn); $('music-state').textContent=musicOn?selected.name.slice(0,2):'OFF';
    muteButton.textContent=musicOn?'PAUSE MUSIC':'PLAY MUSIC';muteButton.setAttribute('aria-pressed',String(musicOn));
    sfxButton.setAttribute('aria-pressed',String(sfxOn));sfxButton.setAttribute('aria-label',sfxOn?'关闭操作音效':'开启操作音效');
  }
  function setMenu(open){
    menu.inert=!open; menu.setAttribute('aria-hidden',String(!open));musicButton.setAttribute('aria-expanded',String(open));
    menu.classList.toggle('is-open',open);
  }
  musicButton.addEventListener('click',()=>{setMenu(musicButton.getAttribute('aria-expanded')!=='true');unlockAudio();playSfx('menu','menu');});
  muteButton.addEventListener('click',()=>{musicOn=!musicOn;save('xiye-music',musicOn?'on':'off');if(musicBus)musicBus.gain.setTargetAtTime(musicOn?.5:0,audio.currentTime,.035);if(musicOn){nextNote=0;unlockAudio();}else stopVoices('music');sync();playSfx('switch','menu');});
  sfxButton.addEventListener('click',()=>{sfxOn=!sfxOn;save('xiye-sfx',sfxOn?'on':'off');if(sfxBus)sfxBus.gain.setTargetAtTime(sfxOn?.65:0,audio.currentTime,.01);if(sfxOn){unlockAudio();playSfx('switch','menu');}sync();});
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.sound-controls'))setMenu(false);});
  menu.addEventListener('keydown',e=>{
    const buttons=[...menu.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.code)){e.preventDefault();e.stopPropagation();const n=e.code==='Home'?0:e.code==='End'?buttons.length-1:(i+(e.code==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[n].focus();}
  });
  document.addEventListener('keydown',e=>{if(e.code==='Escape'&&musicButton.getAttribute('aria-expanded')==='true'){setMenu(false);musicButton.focus();}});
  sync();setMenu(false);
  function tone(note,when,duration,type,gain,bus,slide=null,group='sfx',pan=0){
    if(!audio||!bus||voices.size>90)return;
    const osc=audio.createOscillator(),amp=audio.createGain(),panner=audio.createStereoPanner();osc.type=type;panner.pan.value=pan;
    osc.frequency.setValueAtTime(440*2**((note-69)/12),when);
    if(slide!==null)osc.frequency.exponentialRampToValueAtTime(440*2**((slide-69)/12),when+duration);
    amp.gain.setValueAtTime(0,when);amp.gain.linearRampToValueAtTime(gain,when+.008);amp.gain.exponentialRampToValueAtTime(.0001,when+duration);
    osc.connect(amp);amp.connect(panner);panner.connect(bus);const voice={osc,group};voices.add(voice);
    osc.onended=()=>{voices.delete(voice);osc.disconnect();amp.disconnect();panner.disconnect();};osc.start(when);osc.stop(when+duration+.02);
  }
  function stopVoices(group){for(const v of voices){if(!group||v.group===group){try{v.osc.stop();}catch{}}}}
  function unlockAudio(){
    if(document.hidden||(!musicOn&&!sfxOn))return;
    try{
      if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){$('audio-status').textContent='此浏览器不支持声音';return;}
        audio=new Audio();master=audio.createGain();musicBus=audio.createGain();sfxBus=audio.createGain();
        const limiter=audio.createDynamicsCompressor();master.gain.value=.48;musicBus.gain.value=musicOn?.5:0;sfxBus.gain.value=sfxOn?.65:0;
        musicBus.connect(master);sfxBus.connect(master);master.connect(limiter);limiter.connect(audio.destination);
      }
      if(audio.state!=='running'&&!unlocking){unlocking=true;audio.resume().then(()=>{unlocking=false;nextNote=audio.currentTime+.04;master.gain.setTargetAtTime(.48,audio.currentTime,.02);if(pending){const [kind,region]=pending;pending=null;playSfx(kind,region);}}).catch(()=>{unlocking=false;$('audio-status').textContent='点击 PLAY MUSIC 重试';});}
      else if(audio.state==='running'){master.gain.setTargetAtTime(.48,audio.currentTime,.02);if(!nextNote)nextNote=audio.currentTime+.04;}
    }catch{$('audio-status').textContent='声音暂不可用，游戏仍可操作';}
  }
  function silenceAudio(){pending=null;if(!audio)return;master.gain.setValueAtTime(0,audio.currentTime);stopVoices();nextNote=0;audio.suspend().catch(()=>{});}
  function scheduleMusic(){
    if(!audio||audio.state!=='running'||!musicOn||document.hidden)return;
    const now=audio.currentTime;if(nextNote<now-.2)nextNote=now+.04;
    while(nextNote<now+.18){
      const t=selected,bar=Math.floor(step/t.beats)%t.melody.length,beat=step%t.beats,chord=t.chords[Math.floor(bar/2)%t.chords.length],note=t.melody[bar][beat],unit=60/t.bpm/(t.beats===6?3:2);
      const play=(n,delay,dur,wave,vol,pan=0)=>tone(n,nextNote+delay,dur,wave,vol,musicBus,null,'music',pan);
      if(note!==null){play(note,0,t.id==='grove'?.18:.65,t.wave,t.wave==='square'?.065:.16,-.15);if(t.id!=='grove')play(note+12,.12,.5,'triangle',.025,.35);}
      if(beat===0||beat===(t.beats===6?3:4))play(chord[0],0,unit*3.5,'triangle',.18);
      if(t.id==='sky'||beat%2===0)play(chord[1+beat%3]+12,0,t.id==='sky'?.85:.35,'triangle',.065,.25);
      if(t.id==='grove'&&(beat===0||beat===3))tone(42,nextNote,.055,'triangle',.12,musicBus,25,'music');
      step=(step+1)%(t.melody.length*t.beats);nextNote+=unit;
    }
  }
  function playSfx(kind='tap',region='shell'){
    if(!sfxOn||document.hidden)return;
    if(!audio||audio.state!=='running'){pending=[kind,region];return;}
    const now=audio.currentTime,key=region+kind;if(now-(sfxTimes.get(key)??-1)<.045)return;sfxTimes.set(key,now);
    const wave=region==='dock'?'square':'triangle',shift=region==='dock'?7:0,vol=region==='dock'?.07:.15;
    const play=(n,d=0,len=.075,type=wave,v=vol,slide=null)=>tone(n+shift,now+d,len,type,v,sfxBus,slide);
    if(kind==='clear'){[74,78,81,86].forEach((n,i)=>play(n,i*.075,.2,'square',.075));return;}
    if(region==='menu'){play(kind==='mode'?79:86,0,.045,'triangle',.12);play(kind==='mode'?86:90,.045,.1,'triangle',.1);return;}
    if(kind==='drop'){play(62,0,.14,'triangle',.2,35);play(86,0,.025,'square',.045);return;}
    if(kind==='rotate'){play(72);play(79,.045,.1);return;}
    if(kind==='start'){[62,69,74].forEach((n,i)=>play(n,i*.055,.15));return;}
    if(region==='background'){play(88,0,.16,'sine',.07);return;}
    play(kind==='left'?57:kind==='right'?64:kind==='down'?50:76,0,.05);
  }
  const canvas=$('click-fx'),ctx=canvas.getContext('2d'),particles=[],taps=new Map();
  let width=innerWidth,height=innerHeight,accumulator=0,clock=0;
  const HOLD=12,FADE=1.2,LIMIT=100,H=1/120;
  function resize(){const oldW=width,oldH=height;width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);for(const p of particles){p.x=Math.max(0,Math.min(width-p.w,p.x*width/oldW));p.y=Math.min(height-p.h,p.y*height/oldH);p.rest=false;}}
  addEventListener('resize',resize,{passive:true});resize();
  function burst(x,y){
    if(reducedMotion.matches)return;
    const count=Math.min(3+Math.floor(Math.random()*2),LIMIT-particles.length);
    for(let i=0;i<count;i++){
      let shape=shapes[Math.floor(Math.random()*shapes.length)];for(let r=0,n=Math.floor(Math.random()*4);r<n;r++)shape=shape[0].map((_,c)=>shape.map(row=>row[c]).reverse());
      const size=5+Math.floor(Math.random()*3),cells=[];shape.forEach((row,r)=>row.forEach((v,c)=>{if(v)cells.push([c*size,r*size]);}));
      const w=shape[0].length*size,h=shape.length*size;
      particles.push({x:Math.max(0,Math.min(width-w,x-w/2+(i-count/2)*18)),y:Math.min(height-h,y-h/2),w,h,size,cells,vx:(Math.random()-.5)*170,vy:-120-Math.random()*100,landed:null,rest:false,squash:0,color:['#798154','#92987d','#6c745e','#898c82'][Math.floor(Math.random()*4)]});
    }
  }
  function physics(){
    // Axis-aligned compound bodies: test each occupied square, not the empty bounding box.
    const active=particles.filter(p=>!p.rest).sort((a,b)=>b.y+b.h-a.y-a.h);
    for(const p of active){
      const oldY=p.y;p.vy+=720*H;p.vx*=Math.exp(-.75*H);p.x+=p.vx*H;
      if(p.x<0||p.x+p.w>width){p.x=Math.max(0,Math.min(width-p.w,p.x));p.vx*=-.36;}
      let newY=p.y+p.vy*H,hit=newY+p.h>=height,limit=height-p.h;
      if(p.vy>=0){for(const q of particles){
        if(q===p||!q.rest||p.x+p.w<=q.x||p.x>=q.x+q.w||newY+p.h<q.y||oldY>q.y+q.h)continue;
        for(const [px,py] of p.cells)for(const [qx,qy] of q.cells){
          const bottom=oldY+py+p.size,top=q.y+qy;
          if(p.x+px+p.size>q.x+qx+.15&&p.x+px<q.x+qx+q.size-.15&&bottom<=top+.5&&newY+py+p.size>=top){limit=Math.min(limit,top-py-p.size);hit=true;}
        }
      }}
      if(hit&&p.vy>=0){p.y=limit;
        // Contact correction handles simultaneous landings and lateral entries into a pile.
        // Lift only by the penetration of occupied cells, then recheck supporting bodies.
        for(let pass=0;pass<LIMIT;pass++){
          let lift=0;
          for(const q of particles){if(q===p||!q.rest||p.x+p.w<=q.x||p.x>=q.x+q.w||p.y+p.h<=q.y||p.y>=q.y+q.h)continue;
            for(const [px,py] of p.cells)for(const [qx,qy] of q.cells){
              if(p.x+px+p.size>q.x+qx+.01&&p.x+px<q.x+qx+q.size-.01&&p.y+py+p.size>q.y+qy+.01&&p.y+py<q.y+qy+q.size-.01)lift=Math.max(lift,p.y+py+p.size-q.y-qy);
            }
          }
          if(lift===0)break;p.y-=lift;
        }
        p.squash=Math.min(.22,p.vy/1800);p.vx*=.6;if(p.landed===null)p.landed=clock;
        if(p.vy>80){p.vy*=-.22;}else{p.vy=0;p.vx=0;p.rest=true;}
      }else p.y=newY;
    }
  }
  function drawParticles(dt){
    ctx.clearRect(0,0,width,height);if(document.hidden)return;
    if(reducedMotion.matches){particles.length=0;return;}
    const seconds=Math.min(.05,dt/1000);clock+=seconds;accumulator+=seconds;
    let removed=false;
    for(let i=particles.length-1;i>=0;i--)if(particles[i].landed!==null&&clock-particles[i].landed>HOLD+FADE){particles.splice(i,1);removed=true;}
    if(removed)for(const p of particles)p.rest=false;
    while(accumulator>=H){physics();accumulator-=H;}
    for(const p of particles){
      p.squash*=Math.exp(-18*seconds);const age=p.landed===null?0:clock-p.landed;
      ctx.save();ctx.globalAlpha=.85*(age<=HOLD?1:Math.max(0,1-(age-HOLD)/FADE));ctx.translate(p.x+p.w/2,p.y+p.h);ctx.scale(1+p.squash,1-p.squash);ctx.translate(-p.w/2,-p.h);ctx.fillStyle=p.color;
      for(const [x,y] of p.cells){ctx.fillRect(x,y,p.size-1,p.size-1);ctx.fillStyle='#ffffff50';ctx.fillRect(x+1,y+1,Math.max(1,p.size-3),1);ctx.fillStyle=p.color;}
      ctx.restore();
    }
    canvas.dataset.particles=String(particles.length);canvas.dataset.settled=String(particles.filter(p=>p.rest).length);
  }
  document.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;unlockAudio();
    if(e.target.closest('button')){burst(e.clientX,e.clientY);if(e.target.closest('[data-mode]'))playSfx('mode','menu');}
    else taps.set(e.pointerId,{x:e.clientX,y:e.clientY});
  },{capture:true});
  document.addEventListener('pointerup',e=>{const p=taps.get(e.pointerId);taps.delete(e.pointerId);if(p&&Math.hypot(p.x-e.clientX,p.y-e.clientY)<8){burst(e.clientX,e.clientY);playSfx('tap',e.target.closest('.console')?'shell':'background');}},{capture:true});
  document.addEventListener('pointercancel',e=>taps.delete(e.pointerId));addEventListener('blur',()=>taps.clear());
  return {unlockAudio,silenceAudio,scheduleMusic,playSfx,burst,drawParticles};
};
