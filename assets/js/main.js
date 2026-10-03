(function(){
  /* background video: hold on the poster frame when reduced motion is preferred */
  var hv=document.getElementById('heroVideo');
  if(hv){
    var rm=window.matchMedia('(prefers-reduced-motion: reduce)');
    var applyRM=function(){
      if(rm.matches){hv.removeAttribute('autoplay');hv.pause();}
      else{var p=hv.play();if(p&&p.catch){p.catch(function(){});}}
    };
    applyRM();
    if(rm.addEventListener){rm.addEventListener('change',applyRM);}
    /* pause while the hero is off screen */
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){es.forEach(function(e){
        if(rm.matches)return;
        if(e.isIntersecting){var p=hv.play();if(p&&p.catch){p.catch(function(){});}}else{hv.pause();}
      })},{threshold:0}).observe(hv);
    }
  }

  /* keep aria-expanded in sync with the hover/focus menus */
  document.querySelectorAll('.nav-links > li').forEach(function(li){
    var btn=li.querySelector(':scope > button'); if(!btn)return;
    var set=function(v){btn.setAttribute('aria-expanded',v?'true':'false')};
    li.addEventListener('mouseenter',function(){set(true)});
    li.addEventListener('mouseleave',function(){set(false)});
    li.addEventListener('focusin',function(){set(true)});
    li.addEventListener('focusout',function(){if(!li.contains(document.activeElement))set(false)});
  });

  var header=document.getElementById('header');
  var onScroll=function(){header.classList.toggle('scrolled',window.scrollY>24)};
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  var mm=document.getElementById('mobileMenu');
  document.getElementById('burger').addEventListener('click',function(){mm.classList.add('open');mm.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'});
  document.getElementById('closeMenu').addEventListener('click',function(){mm.classList.remove('open');mm.setAttribute('aria-hidden','true');document.body.style.overflow=''});

  /* FAQ accordion (all answers stay in the DOM) */
  document.querySelectorAll('.faq-q').forEach(function(btn){
    btn.addEventListener('click',function(){
      var item=btn.closest('.faq-item');var open=item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(o){o.classList.remove('open');o.querySelector('.faq-q').setAttribute('aria-expanded','false')});
      if(!open){item.classList.add('open');btn.setAttribute('aria-expanded','true')}
    });
  });
  /* Why choose list (same pattern, one open at a time) */
  document.querySelectorAll('.why-list h3 > button').forEach(function(btn){
    btn.addEventListener('click',function(){
      var li=btn.closest('li');var open=li.classList.contains('open');
      document.querySelectorAll('.why-list li.open').forEach(function(o){o.classList.remove('open');o.querySelector('button').setAttribute('aria-expanded','false')});
      if(!open){li.classList.add('open');btn.setAttribute('aria-expanded','true')}
    });
  });

  var els=document.querySelectorAll('.reveal,.reveal-left,.reveal-right');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.1,rootMargin:'0px 0px -5% 0px'});
    els.forEach(function(el){io.observe(el)});
  }else{els.forEach(function(el){el.classList.add('in')})}

  /* Revision 1: hold the sticky Call and Book bar back while the hero is on
     screen, so Book Online is never offered twice at once on a phone. With no
     IntersectionObserver the bar just stays visible, as it did before. */
  var heroSection=document.querySelector('.hero, .page-hero');
  if(heroSection&&'IntersectionObserver' in window){
    document.body.classList.add('hero-onscreen');
    new IntersectionObserver(function(es){
      document.body.classList.toggle('hero-onscreen',es[0].isIntersecting);
    },{threshold:0,rootMargin:'-40% 0px 0px 0px'}).observe(heroSection);
  }

  window.dataLayer=window.dataLayer||[];
  document.querySelectorAll('[data-track]').forEach(function(a){a.addEventListener('click',function(){window.dataLayer.push({event:a.getAttribute('data-track')==='call'?'click_to_call':'book_online_click'})})});
  document.getElementById('year').textContent=new Date().getFullYear();
})();

/* enquiry form -> /api/enquiry (SMTP2GO relay) */
(function(){
  var f=document.getElementById('enquiryForm'); if(!f)return;
  var s=document.getElementById('formStatus'), btn=document.getElementById('formSubmit');
  f.addEventListener('submit',function(e){
    e.preventDefault();
    if(!f.checkValidity()){f.reportValidity();return;}
    s.className='form-status';s.textContent='Sending your enquiry...';btn.disabled=true;
    fetch(f.action,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:f.name.value,phone:f.phone.value,email:f.email.value,service:f.service.value,message:f.message.value})})
      .then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d}})})
      .then(function(res){
        if(res.ok){f.reset();s.className='form-status ok';s.textContent='Thank you. Your enquiry has been sent and our team will be in touch during opening hours.';}
        else{s.className='form-status err';s.textContent=(res.d&&res.d.error)||'Sorry, that did not send. Please call us on (07) 3852 1160.';}
      })
      .catch(function(){s.className='form-status err';s.textContent='Sorry, that did not send. Please call us on (07) 3852 1160.';})
      .then(function(){btn.disabled=false;});
  });
})();

/* smile gallery: treatment filters and the before/after lightbox */
(function(){
  var grid=document.querySelector('.gallery-grid'); if(!grid)return;
  var cards=[].slice.call(grid.querySelectorAll('.gallery-card'));
  var chips=[].slice.call(document.querySelectorAll('.filter-chip'));
  var count=document.querySelector('.gallery-count');

  function apply(name){
    var shown=0;
    cards.forEach(function(c){
      var on = name==='All' || c.getAttribute('data-cat')===name;
      c.hidden=!on; if(on) shown++;
    });
    chips.forEach(function(b){
      var on=b.getAttribute('data-filter')===name;
      b.classList.toggle('is-on',on);
      b.setAttribute('aria-pressed',on?'true':'false');
    });
    if(count){
      count.textContent = name==='All'
        ? 'Showing all '+shown+' cases'
        : 'Showing '+shown+' '+name+(shown===1?' case':' cases');
    }
  }
  chips.forEach(function(b){
    b.addEventListener('click',function(){apply(b.getAttribute('data-filter'));});
  });

  /* lightbox */
  var lb=document.getElementById('lightbox');
  if(!lb)return;
  var img=document.getElementById('lbImg'), who=document.getElementById('lbWho'),
      meta=document.getElementById('lbMeta'), last=null, i=-1;

  function visible(){ return cards.filter(function(c){return !c.hidden;}); }

  function show(card){
    var b=card.querySelector('.ph'), thumb=b.querySelector('img');
    img.src=thumb.getAttribute('src').replace(/-th\.webp$/,'.webp');
    img.alt=thumb.getAttribute('alt');
    var cap=card.querySelector('figcaption');
    who.textContent=cap.querySelector('strong').textContent;
    var tt=cap.querySelector('.tt'), tf=cap.querySelector('.tf');
    meta.textContent=tt.textContent+(tf?'  |  '+tf.textContent:'');
    i=visible().indexOf(card);
  }

  function open(card){
    last=document.activeElement;
    show(card);
    lb.hidden=false; document.body.classList.add('lb-open');
    lb.querySelector('.lb-x').focus();
  }
  function close(){
    lb.hidden=true; document.body.classList.remove('lb-open'); img.removeAttribute('src');
    if(last&&last.focus)last.focus();
  }
  function step(d){
    var v=visible(); if(!v.length)return;
    i=(i+d+v.length)%v.length; show(v[i]);
  }

  grid.addEventListener('click',function(e){
    var b=e.target.closest('.ph'); if(b) open(b.closest('.gallery-card'));
  });
  lb.addEventListener('click',function(e){
    if(e.target.closest('[data-close]')) close();
    var n=e.target.closest('[data-step]'); if(n) step(+n.getAttribute('data-step'));
  });
  document.addEventListener('keydown',function(e){
    if(lb.hidden)return;
    if(e.key==='Escape')close();
    else if(e.key==='ArrowLeft')step(-1);
    else if(e.key==='ArrowRight')step(1);
    else if(e.key==='Tab'){
      /* keep focus inside the dialog while it is open */
      var f=[].slice.call(lb.querySelectorAll('button')).filter(function(el){return el.offsetParent!==null;});
      if(!f.length)return;
      var first=f[0], lastEl=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastEl.focus();}
      else if(!e.shiftKey&&document.activeElement===lastEl){e.preventDefault();first.focus();}
    }
  });
})();

/* dental articles index: category filter and pager.
   The cards are already in the HTML, so this only ever hides and shows them.
   With scripting off the page still lists every article, which is why the
   filter and pager markup is built here rather than shipped in the page. */
(function(){
  var grid=document.querySelector('.art-grid');
  if(!grid)return;
  var cards=[].slice.call(grid.querySelectorAll('.art-card'));
  var chips=[].slice.call(document.querySelectorAll('.art-chip'));
  var pager=document.querySelector('.art-pager');
  var count=document.querySelector('.art-count');
  var PER=12, cat='all', page=1;

  function matching(){
    if(cat==='all')return cards;
    return cards.filter(function(c){
      return (c.getAttribute('data-cats')||'').split('|').indexOf(cat)>-1;
    });
  }

  function render(){
    var list=matching(), pages=Math.max(1,Math.ceil(list.length/PER));
    if(page>pages)page=pages;
    var from=(page-1)*PER, to=from+PER;

    cards.forEach(function(c){c.hidden=true;});
    list.slice(from,to).forEach(function(c){c.hidden=false;});

    if(count){
      count.textContent=list.length
        ? 'Showing '+(from+1)+' to '+Math.min(to,list.length)+' of '+list.length+
          ' article'+(list.length===1?'':'s')
        : 'No articles in this category yet.';
    }

    pager.innerHTML='';
    if(pages<2)return;
    function btn(label,target,on,disabled){
      var b=document.createElement('button');
      b.type='button'; b.textContent=label;
      if(on){b.className='is-on'; b.setAttribute('aria-current','page');}
      if(disabled)b.disabled=true;
      b.addEventListener('click',function(){
        page=target; render();
        grid.scrollIntoView({behavior:'smooth',block:'start'});
      });
      return b;
    }
    pager.appendChild(btn('Previous',page-1,false,page===1));
    for(var i=1;i<=pages;i++)pager.appendChild(btn(String(i),i,i===page,false));
    pager.appendChild(btn('Next',page+1,false,page===pages));
  }

  chips.forEach(function(ch){
    ch.addEventListener('click',function(){
      chips.forEach(function(o){o.classList.remove('is-on');o.setAttribute('aria-pressed','false');});
      ch.classList.add('is-on'); ch.setAttribute('aria-pressed','true');
      cat=ch.getAttribute('data-cat'); page=1; render();
    });
  });

  render();
})();
