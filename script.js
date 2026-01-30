/*
  script.js
  Interactivity for the Birthday Surprise site.

  Features implemented:
  - Smooth start button and nav behavior
  - Intro animated typewriter and hero micro-interactions
  - Timeline / story reveal and replay sequence
  - Photo gallery modal with keyboard navigation and captions
  - Love letter typewriter with pause/resume and cursor
  - Mini-game: click-the-hearts with scoring and messages
  - Surprise unlock using password 'roshni18' (customizable)
  - Confetti and fireworks visual triggers
  - Scroll-triggered animations (IntersectionObserver)
  - Accessibility helpers and focus management

  Notes:
  - All audio hooks are intentionally left empty/commented for privacy.
  - Placeholder images/text are used; replace with personal content as needed.
*/

(function(){
  'use strict';

  /* ====================================================================== */
  /* Configuration & constants                                                */
  /* ====================================================================== */
  const CONFIG = {
    surprisePassword: 'roshni18', // <-- Set by user
    heartGameMax: 30,
    confettiCount: 80,
    fireworksBursts: 8,
    timelineStagger: 350,
    typingSpeed: 26, // ms per char for long love letter
  };

  /* ====================================================================== */
  /* DOM nodes cache                                                          */
  /* ====================================================================== */
  const dom = {
    startBtn: document.getElementById('start-btn'),
    replayTimelineBtn: document.getElementById('replay-timeline'),
    timelineItems: Array.from(document.querySelectorAll('.timeline-item')),
    photoFigures: Array.from(document.querySelectorAll('.photo')), // NodeList
    photoModal: document.getElementById('photo-modal'),
    modalImg: document.querySelector('.modal-media img'),
    modalCaption: document.querySelector('.modal-caption'),
    modalClose: document.querySelector('.modal-close'),
    modalPrev: document.querySelector('.modal-prev'),
    modalNext: document.querySelector('.modal-next'),
    typewriterEl: document.getElementById('typewriter'),
    pauseLetterBtn: document.getElementById('pause-letter'),
    resumeLetterBtn: document.getElementById('resume-letter'),
    heartsArea: document.getElementById('hearts-area'),
    scoreEl: document.getElementById('score'),
    scoreMsg: document.getElementById('score-msg'),
    startGameBtn: document.getElementById('start-game'),
    resetGameBtn: document.getElementById('reset-game'),
    surpriseForm: document.getElementById('surprise-form'),
    surprisePwInput: document.getElementById('pw'),
    surpriseMessage: document.getElementById('surprise-message'),
    confettiRoot: document.getElementById('confetti'),
    finalSection: document.getElementById('final'),
    backgroundVisuals: document.getElementById('background-visuals'),
  };

  /* Small safety checks */
  if(!dom.startBtn){console.warn('Start button not found');}

  /* ====================================================================== */
  /* Utilities                                                                */
  /* ====================================================================== */
  function rand(min, max){ return Math.random() * (max - min) + min; }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function createEl(tag, opts){ const el = document.createElement(tag); if(opts){ Object.assign(el, opts); } return el; }

  /* Simple accessible focus trap for modals */
  function trapFocus(container){
    const focusable = container.querySelectorAll('a[href],button,textarea,input,select,[tabindex]:not([tabindex="-1"])');
    const first = focusable[0]; const last = focusable[focusable.length-1];
    function keyHandler(e){
      if(e.key === 'Tab'){
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
      if(e.key === 'Escape'){ closeModal(); }
    }
    container.addEventListener('keydown', keyHandler);
    return ()=>container.removeEventListener('keydown', keyHandler);
  }

  /* ====================================================================== */
  /* Smooth intro / start button actions                                      */
  /* ====================================================================== */
  dom.startBtn && dom.startBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    document.querySelector('#story').scrollIntoView({behavior:'smooth'});
    // Warm visual: pulse the button and release a small burst of hearts
    dom.startBtn.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:600,easing:'ease-out'});
    tinyHeartBurst(8, document.querySelector('.hero-content'));
  });

  /* ====================================================================== */
  /* Timeline: card toggle & replay sequencing                                 */
  /* ====================================================================== */
  function toggleCard(card){
    const expanded = card.getAttribute('aria-expanded') === 'true';
    card.setAttribute('aria-expanded', String(!expanded));
  }

  dom.timelineItems.forEach(item=>{
    const card = item.querySelector('.timeline-card');
    card.addEventListener('click', ()=>{
      // Toggle the card details
      const isExp = card.getAttribute('aria-expanded') === 'true';
      card.setAttribute('aria-expanded', String(!isExp));
      // When expanding, ensure the item is revealed
      if(!isExp) item.classList.add('revealed');
    });
    // reveal on hover gently for desktop
    card.addEventListener('mouseenter', ()=> item.classList.add('revealed'));
  });

  function replayTimeline(){
    // Reset states
    dom.timelineItems.forEach(it=>{ it.classList.remove('revealed'); it.querySelector('.timeline-card').setAttribute('aria-expanded','false'); });
    // Animate one-by-one
    dom.timelineItems.forEach((item, i)=>{
      setTimeout(()=>{
        item.classList.add('revealed');
        // small nudge animation
        const el = item.querySelector('.timeline-card');
        el.animate([{transform:'translateY(12px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:520,easing:'cubic-bezier(.2,.9,.3,1)'});
      }, i * CONFIG.timelineStagger);
    });
  }

  dom.replayTimelineBtn && dom.replayTimelineBtn.addEventListener('click', replayTimeline);

  /* ====================================================================== */
  /* Photo gallery modal with keyboard navigation                             */
  /* ====================================================================== */
  let currentPhotoIndex = 0;
  const photos = dom.photoFigures.map(fig=>({img: fig.querySelector('img').src, caption: fig.querySelector('figcaption')?.textContent || ''}));

  function openModal(index){
    currentPhotoIndex = clamp(index, 0, photos.length -1);
    const data = photos[currentPhotoIndex];
    dom.modalImg.src = data.img;
    dom.modalImg.alt = data.caption || 'Memory photo';
    dom.modalCaption.textContent = data.caption;
    dom.photoModal.setAttribute('aria-hidden','false');
    // Manage focus
    dom.modalClose.focus();
    // Trap focus within modal
    const release = trapFocus(dom.photoModal);
    // attach close handler for escape
    function escClose(e){ if(e.key === 'Escape'){ closeModal(); } }
    document.addEventListener('keydown', escClose);
    // return cleanup function
    dom.photoModal._cleanup = ()=>{ release(); document.removeEventListener('keydown', escClose); };
  }

  function closeModal(){
    dom.photoModal.setAttribute('aria-hidden','true');
    dom.photoModal._cleanup && dom.photoModal._cleanup();
  }

  function showPrevPhoto(){ openModal((currentPhotoIndex - 1 + photos.length) % photos.length); }
  function showNextPhoto(){ openModal((currentPhotoIndex + 1) % photos.length); }

  // Click handlers: open modal
  dom.photoFigures.forEach((fig, idx)=>{
    fig.addEventListener('click', ()=> openModal(idx));
    fig.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' ') openModal(idx); });
  });

  // Modal button handlers
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalPrev.addEventListener('click', showPrevPhoto);
  dom.modalNext.addEventListener('click', showNextPhoto);

  // Keyboard navigation inside modal
  document.addEventListener('keydown', (e)=>{
    if(dom.photoModal.getAttribute('aria-hidden') === 'false'){
      if(e.key === 'ArrowLeft') showPrevPhoto();
      if(e.key === 'ArrowRight') showNextPhoto();
    }
  });

  /* ====================================================================== */
  /* Love Letter typewriter with pause/resume                                 */
  /* ====================================================================== */
  const letterText = [
    "My love,",
    "",
    "Every day with you is a quiet miracle. I still find reasons to smile at the smallest things you do.",
    "You taught me that patience can be gentle, and that courage sometimes looks like holding hands on a rainy street.",
    "",
    "Today I celebrate you — your laugh, your warmth, and the way you make home out of ordinary moments.",
    "",
    "Forever starts at the tiny things: the look you give when I make coffee, the way you hum when you're happy, the comfort of your shoulder.",
    "",
    "Happy Birthday, my heart. This page is a small mirror of the love I feel for you, written in pixels but meant for your eyes.",
    "",
    "All my love, always."
  ].join('\n');

  // Typewriter state
  let typePos = 0;
  let typing = true;
  let typeTimer = null;

  function typeStep(){
    if(!typing) return;
    if(typePos <= letterText.length){
      const textNow = letterText.slice(0, typePos);
      dom.typewriterEl.innerHTML = escapeHtml(textNow) + '<span class="cursor"></span>';
      typePos += 1;
      typeTimer = setTimeout(typeStep, CONFIG.typingSpeed + Math.random()*20);
    } else {
      dom.typewriterEl.innerHTML = escapeHtml(letterText); // final
    }
  }

  function pauseTyping(){ typing = false; clearTimeout(typeTimer); }
  function resumeTyping(){ if(!typing){ typing = true; typeStep(); } }

  dom.pauseLetterBtn.addEventListener('click', ()=>{ pauseTyping(); dom.pauseLetterBtn.setAttribute('disabled','true'); dom.resumeLetterBtn.removeAttribute('disabled'); });
  dom.resumeLetterBtn.addEventListener('click', ()=>{ resumeTyping(); dom.resumeLetterBtn.setAttribute('disabled','true'); dom.pauseLetterBtn.removeAttribute('disabled'); });

  // small helper: escape for HTML insertion
  function escapeHtml(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }

  // start the typewriter gently after load
  setTimeout(()=>{ typeStep(); }, 700);

  /* ====================================================================== */
  /* Mini-game: Click the hearts                                              */
  /* ====================================================================== */
  let score = 0;
  let gameRunning = false;
  let activeHearts = [];

  function spawnHeart(){
    if(!dom.heartsArea) return;
    const area = dom.heartsArea.getBoundingClientRect();
    const h = createEl('div');
    h.className = 'game-heart';
    h.style.left = rand(6, area.width - 54) + 'px';
    h.style.top = rand(6, area.height - 54) + 'px';
    h.textContent = '💖';
    dom.heartsArea.appendChild(h);
    activeHearts.push(h);

    // tidy removal after some time
    const life = setTimeout(()=>{
      if(h.parentElement) h.remove();
      activeHearts = activeHearts.filter(x=>x!==h);
    }, 7000 + Math.random()*6000);

    // click handler
    h.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      // pop animation
      h.classList.add('pop');
      setTimeout(()=>{ h.remove(); activeHearts = activeHearts.filter(x=>x!==h); }, 220);
      // increment score and message
      score += 1;
      dom.scoreEl.textContent = score;
      if(score > 0 && score % 5 === 0){ dom.scoreMsg.textContent = ['So cute!','You make my heart flutter','Keep going, love','I adore you'][Math.floor(Math.random()*4)]; }
    });
  }

  let gameInterval = null;

  function startGame(){
    if(gameRunning) return;
    gameRunning = true;
    score = 0; dom.scoreEl.textContent = score; dom.scoreMsg.textContent = 'Catch them all!';
    gameInterval = setInterval(()=>{
      if(activeHearts.length < 8) spawnHeart();
      // auto stop after a while
      if(score >= CONFIG.heartGameMax){ stopGame(); dom.scoreMsg.textContent = 'You win! Check the surprise ❤️'; }
    }, 650);
  }

  function stopGame(){ gameRunning = false; clearInterval(gameInterval); activeHearts.forEach(h=>h.remove()); activeHearts = []; }

  dom.startGameBtn.addEventListener('click', ()=> startGame());
  dom.resetGameBtn.addEventListener('click', ()=>{ stopGame(); score = 0; dom.scoreEl.textContent = 0; dom.scoreMsg.textContent = 'Reset — start again!'; });

  /* ====================================================================== */
  /* Surprise form: unlock by password -> confetti + reveal message          */
  /* ====================================================================== */
  dom.surpriseForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const val = dom.surprisePwInput.value.trim();
    if(val === CONFIG.surprisePassword){
      // success: show confetti and reveal message
      triggerConfetti();
      dom.surpriseMessage.hidden = false;
      dom.surpriseMessage.querySelector('h3').classList.add('glow');
      // scroll to final message after a moment
      setTimeout(()=>{
        dom.finalSection.scrollIntoView({behavior:'smooth'});
        triggerFireworks();
      }, 800);
    } else {
      // small shake for wrong password
      dom.surprisePwInput.animate([{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:420});
      dom.surprisePwInput.value = '';
      dom.surprisePwInput.placeholder = 'Try again ❤️';
    }
  });

  /* ====================================================================== */
  /* Confetti generator (creates DOM pieces and animates via CSS)            */
  /* ====================================================================== */
  function triggerConfetti(){
    if(!dom.confettiRoot) return;
    const colors = ['#ff6f91','#ffd166','#c4a7ff','#ff9bb3','#ffd1e6','#ffd6a5'];
    for(let i=0;i<CONFIG.confettiCount;i++){
      const piece = createEl('div');
      piece.className = 'confetti-piece';
      const size = Math.floor(rand(6,14));
      piece.style.width = size + 'px';
      piece.style.height = Math.floor(size*1.6) + 'px';
      piece.style.left = rand(4,96) + '%';
      piece.style.top = rand(-8,2) + '%';
      piece.style.background = colors[Math.floor(rand(0,colors.length))];
      piece.style.transform = `rotate(${rand(0,360)}deg)`;
      piece.style.opacity = 1;
      // random animation duration and delay
      const dur = rand(1800, 3800);
      const delay = rand(0, 200);
      piece.style.animation = `confetti-fall ${dur}ms linear ${delay}ms forwards`;
      dom.confettiRoot.appendChild(piece);
      // cleanup
      setTimeout(()=>{ piece.remove(); }, dur + delay + 200);
    }
  }

  /* tiny hearts burst used in hero intro */
  function tinyHeartBurst(n, container){
    for(let i=0;i<n;i++){
      const h = createEl('div');
      h.className = 'game-heart';
      h.textContent = '💗';
      h.style.position = 'absolute';
      h.style.left = '50%'; h.style.top = '50%';
      h.style.transform = `translate(-50%,-50%) scale(${rand(0.6,1.2)})`;
      container.appendChild(h);
      const dx = rand(-260,260); const dy = rand(-160,-420);
      h.animate([{transform:`translate(-50%,-50%) translate(0,0) scale(0.8)`,opacity:1},{transform:`translate(-50%,-50%) translate(${dx}px,${dy}px) scale(0.4)`,opacity:0}],{duration:1200+rand(0,600),easing:'cubic-bezier(.2,.9,.3,1)'});
      setTimeout(()=>h.remove(), 1800);
    }
  }

  /* ====================================================================== */
  /* Fireworks: simple bursts using DOM elements and CSS sparkle animation    */
  /* ====================================================================== */
  function triggerFireworks(){
    // create several bursts in final visuals
    const root = document.querySelector('.final-visuals') || document.body;
    for(let i=0;i<CONFIG.fireworksBursts;i++){
      const burst = createEl('div');
      burst.className = 'fw-burst';
      const x = rand(10,90); const y = rand(10,70);
      burst.style.position = 'absolute'; burst.style.left = x + '%'; burst.style.top = y + '%';
      burst.style.width = burst.style.height = rand(40,140) + 'px';
      burst.style.borderRadius = '50%';
      burst.style.pointerEvents = 'none';
      // create radial particles
      const colors = ['#ffd166','#ff6f91','#c4a7ff','#fff1c9'];
      for(let p=0;p<10;p++){
        const dot = createEl('div');
        dot.style.position='absolute'; dot.style.left='50%'; dot.style.top='50%';
        dot.style.width = dot.style.height = rand(6,12) + 'px';
        dot.style.background = colors[Math.floor(rand(0,colors.length))];
        dot.style.borderRadius='50%'; dot.style.transformOrigin='center';
        dot.style.animation = `sparkle ${600+Math.floor(rand(0,700))}ms ease-out ${Math.floor(rand(0,300))}ms forwards`;
        burst.appendChild(dot);
      }
      root.appendChild(burst);
      // fade and remove
      setTimeout(()=>{ burst.style.transition='opacity 800ms'; burst.style.opacity='0'; setTimeout(()=>burst.remove(),900); }, 900 + Math.random()*800);
    }
  }

  /* ====================================================================== */
  /* Scroll-triggered reveals using IntersectionObserver                     */
  /* ====================================================================== */
  function setupScrollReveals(){
    const revealables = document.querySelectorAll('.timeline-item, .section');
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(ent=>{
        if(ent.isIntersecting){
          ent.target.classList.add('revealed');
        }
      });
    },{threshold:0.18});
    revealables.forEach(r=> io.observe(r));
  }
  setupScrollReveals();

  /* ====================================================================== */
  /* Tiny nav handling: open/close for small screens                        */
  /* ====================================================================== */
  const navToggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.nav-list');
  if(navToggle){
    navToggle.addEventListener('click', ()=>{
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      if(!expanded){ navList.style.display = 'flex'; } else { navList.style.display = ''; }
    });
  }

  /* ====================================================================== */
  /* Micro-interactions: gentle parallax for background visuals              */
  /* ====================================================================== */
  (function backgroundParallax(){
    const root = dom.backgroundVisuals; if(!root) return;
    root.style.position = 'fixed'; root.style.inset = '0'; root.style.zIndex = 0; root.style.pointerEvents = 'none';
    // create subtle floating shapes
    for(let i=0;i<6;i++){
      const s = createEl('div'); s.className = 'bg-blob';
      s.style.position='absolute'; s.style.borderRadius='50%'; s.style.opacity=0.12; s.style.pointerEvents='none';
      s.style.width = rand(160,360) + 'px'; s.style.height = rand(160,360) + 'px';
      s.style.left = rand(2,86) + '%'; s.style.top = rand(4,86) + '%';
      s.style.background = `radial-gradient(circle at 30% 30%, rgba(255,111,145,0.16), transparent 30%)`;
      root.appendChild(s);
      // float animation
      s.animate([{transform:'translateY(0)'},{transform:`translateY(${rand(-40,40)}px)`},{transform:'translateY(0)'}],{duration:6000+rand(0,8000),iterations:Infinity,easing:'ease-in-out'});
    }
  })();

  /* ====================================================================== */
  /* Accessibility: ensure keyboard users can navigate gallery and sections  */
  /* ====================================================================== */
  // Add tabindex to timeline cards for keyboard activation
  document.querySelectorAll('.timeline-card').forEach(c=>{ c.setAttribute('tabindex','0'); c.addEventListener('keydown', (e)=>{ if(e.key==='Enter') c.click(); }); });

  /* ====================================================================== */
  /* Final small polish: when page loads, choreograph a small entrance       */
  /* ====================================================================== */
  window.addEventListener('load', ()=>{
    // gently reveal the first timeline card
    setTimeout(()=>{ if(dom.timelineItems[0]) dom.timelineItems[0].classList.add('revealed'); }, 700);
    // brief sparkle in hero
    tinyHeartBurst(6, document.querySelector('.hero-content'));
  });

  /* ====================================================================== */
  /* Exported for potential debugging (avoid polluting window in prod)      */
  /* ====================================================================== */
  window.__birthday = {
    openModal, closeModal, showNextPhoto, showPrevPhoto, replayTimeline, startGame, stopGame, triggerConfetti, triggerFireworks
  };

  /* ====================================================================== */
  /* End of script                                                         */
  /* ====================================================================== */

})();
