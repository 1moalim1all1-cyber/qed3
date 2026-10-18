// Navigation adapted from the user's Wood Factory slide/deck interaction.
(()=>{
const deck=document.getElementById('woodDeck'); if(!deck)return;
const slides=[...deck.querySelectorAll('.woodSlide')];
const progress=document.createElement('div');progress.className='woodProgress';progress.setAttribute('aria-hidden','true');document.body.appendChild(progress);
let activeSlide=0;
const dots=[...document.querySelectorAll('.woodDots button')];
const go=id=>document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
dots.forEach(btn=>btn.addEventListener('click',()=>go(btn.dataset.target)));
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){slides.forEach(s=>s.classList.toggle('woodActive',s===entry.target));activeSlide=slides.indexOf(entry.target);progress.style.transform='scaleX('+((activeSlide+1)/slides.length)+')';dots.forEach(d=>d.classList.toggle('active',d.dataset.target===entry.target.id));}})},{root:window.innerWidth>900?deck:null,threshold:.55});
slides.forEach(slide=>observer.observe(slide));slides[0]?.classList.add('woodActive');progress.style.transform='scaleX('+(1/slides.length)+')';
document.addEventListener('keydown',e=>{if(window.innerWidth<=900||e.target.closest('input,textarea,select,[contenteditable],.modal.show,.drawer.open'))return;
const keys=['ArrowDown','PageDown','ArrowUp','PageUp','Home','End'];if(!keys.includes(e.key))return;
e.preventDefault();let i=Math.max(0,slides.findIndex(s=>s.classList.contains('woodActive')));
if(e.key==='Home')i=0;else if(e.key==='End')i=slides.length-1;else i=Math.min(slides.length-1,Math.max(0,i+(['ArrowDown','PageDown'].includes(e.key)?1:-1)));go(slides[i]?.id);
});
})();
