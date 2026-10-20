/* Precision Dental: lead capture (14 October 2026 revisions)
   1. remembers where a visitor came from (UTM tags, ad click IDs, referrer)
   2. the new patient offer pop-up: once per browser session, never blocks the page
   3. the price list form: posts to /api/price-list, then fires the conversion events
   4. click events for the offer and price list buttons, and opening the price list PDF */
(function(){
  var KEY='pd_attr', DAY=864e5;
  window.dataLayer=window.dataLayer||[];
  function store(k,v,local){try{(local?localStorage:sessionStorage).setItem(k,v);}catch(e){}}
  function read(k,local){try{return (local?localStorage:sessionStorage).getItem(k);}catch(e){return null;}}

  /* ---------- 1. attribution: the last visit that carried campaign details wins, for 90 days ---------- */
  var q={}; try{new URLSearchParams(location.search).forEach(function(v,k){q[k]=v;});}catch(e){}
  var tags=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','gbraid','wbraid','fbclid','msclkid'];
  var hasTags=tags.some(function(t){return q[t];});
  var ref='';
  try{ if(document.referrer && new URL(document.referrer).host!==location.host) ref=document.referrer; }catch(e){}
  var saved=null; try{saved=JSON.parse(read(KEY,true)||'null');}catch(e){}
  if(saved && saved.t && Date.now()-saved.t>90*DAY) saved=null;
  if(hasTags || !saved){
    var a={t:Date.now(),landing:location.pathname,referrer:ref};
    tags.forEach(function(t){if(q[t])a[t]=String(q[t]).slice(0,200);});
    store(KEY,JSON.stringify(a),true);
  }
  function attribution(){ var s=null; try{s=JSON.parse(read(KEY,true)||'null');}catch(e){} return s||{}; }

  /* ---------- 4. click events ---------- */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('[data-offer-cta],[data-pl-cta],[data-pl-pdf]'); if(!a)return;
    if(a.hasAttribute('data-pl-pdf')){
      var h=a.closest('[data-pl-location]');
      window.dataLayer.push({event:'price_list_pdf_open',form_location:h?h.getAttribute('data-pl-location'):location.pathname});
    }else if(a.hasAttribute('data-offer-cta')){
      window.dataLayer.push({event:'offer_cta_click',offer:'new_patient',placement:a.getAttribute('data-offer-cta'),cta:a.getAttribute('data-track')||''});
    }else{
      window.dataLayer.push({event:'price_list_cta_click',placement:a.getAttribute('data-pl-cta')});
    }
  });

  /* ---------- 2. offer pop-up: centred, once per visit, easy to close ---------- */
  (function(){
    var pop=document.getElementById('offerPop'); if(!pop)return;
    var dialog=pop.querySelector('.om-dialog');
    var skip=(pop.getAttribute('data-skip')||'').split(/\s+/).filter(Boolean);
    if(skip.indexOf(location.pathname)>-1) return;
    if(read('pd_offer_seen')) return;
    var delay=parseInt(pop.getAttribute('data-delay'),10); if(isNaN(delay))delay=2;
    var shown=false, open=false, timer=null, last=null;
    /* fetch the photo while we wait, so it is there when the pop-up opens */
    var photo=pop.querySelector('.om-ring img'); if(photo){photo.loading='eager';}
    function focusables(){
      return [].slice.call(dialog.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])')).filter(function(el){return el.offsetParent!==null;});
    }
    function show(how){
      if(shown)return; shown=true; if(timer)clearTimeout(timer);
      document.removeEventListener('mouseout',exit);
      /* not over the phone menu */
      var mm=document.getElementById('mobileMenu'); if(mm&&mm.classList.contains('open')){shown=false;timer=setTimeout(function(){show(how)},4000);return;}
      store('pd_offer_seen','1');
      last=document.activeElement;
      pop.hidden=false; open=true;
      document.body.classList.add('om-open');
      requestAnimationFrame(function(){requestAnimationFrame(function(){pop.classList.add('is-in');dialog.focus();});});
      window.dataLayer.push({event:'offer_popup_shown',offer:'new_patient',trigger:how});
    }
    function hide(){
      if(!open)return; open=false;
      pop.classList.remove('is-in');
      document.body.classList.remove('om-open');
      setTimeout(function(){pop.hidden=true;},350);
      if(last&&last.focus){try{last.focus({preventScroll:true});}catch(e){last.focus();}}
      window.dataLayer.push({event:'offer_popup_closed',offer:'new_patient'});
    }
    function exit(e){ if(!e.relatedTarget && e.clientY<=0) show('exit'); }
    pop.addEventListener('click',function(e){
      if(e.target.closest('[data-pop-close]')) hide();
      else if(e.target.closest('a')) setTimeout(hide,150);
    });
    document.addEventListener('keydown',function(e){
      if(!open)return;
      if(e.key==='Escape'){hide();return;}
      if(e.key==='Tab'){
        /* keep the keyboard inside the pop-up while it is open */
        var f=focusables(); if(!f.length)return;
        var first=f[0], lastEl=f[f.length-1];
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();lastEl.focus();}
        else if(!e.shiftKey&&document.activeElement===lastEl){e.preventDefault();first.focus();}
      }
    });
    if(delay>0) timer=setTimeout(function(){show('timer');},delay*1000);
    else if(window.matchMedia && window.matchMedia('(pointer:fine)').matches) document.addEventListener('mouseout',exit);
    else timer=setTimeout(function(){show('timer');},1500);
  })();

  /* ---------- 3. price list form ---------- */
  var FAIL='Sorry, that did not send. Please try again, or call us and we will send you the price list.';
  document.querySelectorAll('form[data-pl-form]').forEach(function(f){
    var status=f.querySelector('[data-pl-status]'), btn=f.querySelector('[data-pl-submit]'), thanks=f.querySelector('[data-pl-thanks]');
    var holder=f.closest('[data-pl-location]');
    var location_=holder?holder.getAttribute('data-pl-location'):location.pathname;
    var started=false;
    f.addEventListener('input',function(){ if(!started){started=true;window.dataLayer.push({event:'price_list_form_start',form_location:location_});} });
    f.addEventListener('submit',function(e){
      e.preventDefault();
      if(!f.checkValidity()){f.reportValidity();return;}
      var mob=f.mobile.value.replace(/[\s()-]/g,'');
      if(!/^(\+?61|0)4\d{8}$/.test(mob)){status.className='form-status err';status.textContent='Please check your mobile number, for example 0412 345 678.';f.mobile.focus();return;}
      status.className='form-status';status.textContent='Sending...';btn.disabled=true;
      var at=attribution();
      var body={firstName:f.firstName.value,lastName:f.lastName.value,email:f.email.value,mobile:f.mobile.value,
        consent:f.consent.checked,company:f.company.value,formLocation:location_,page:location.pathname,attribution:at};
      fetch(f.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        .then(function(r){return r.json().catch(function(){return {};}).then(function(d){return {ok:r.ok,d:d};});})
        .then(function(res){
          if(!res.ok){status.className='form-status err';status.textContent=(res.d&&res.d.error)||FAIL;return;}
          status.className='form-status';status.textContent='';
          f.classList.add('is-done'); if(thanks){thanks.hidden=false; thanks.setAttribute('tabindex','-1'); thanks.focus();}
          window.dataLayer.push({event:'price_list_download',form_location:location_,lead_source:at.utm_source||'website'});
          if(typeof window.gtag==='function'){
            window.gtag('event','generate_lead',{form_name:'price_list',form_location:location_});
            var sendTo=f.getAttribute('data-ads-send-to'); if(sendTo) window.gtag('event','conversion',{send_to:sendTo});
          }
          if(typeof window.fbq==='function') window.fbq('track','Lead',{content_name:'Price List'});
        })
        .catch(function(){status.className='form-status err';status.textContent=FAIL;})
        .then(function(){btn.disabled=false;});
    });
  });
})();
