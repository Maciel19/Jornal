// Ferramentas de leitura compartilhadas: tema (claro, sépia, escuro), tamanho da letra,
// barra de progresso e botão de voltar ao topo. As escolhas ficam salvas neste navegador.
(function(){
  const KEY='jornal-caique-leitura';
  const root=document.documentElement;
  let pref={};
  try{pref=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
  function apply(){
    if(pref.tema&&pref.tema!=='auto')root.setAttribute('data-theme',pref.tema);else root.removeAttribute('data-theme');
    root.setAttribute('data-size',pref.tamanho||'m');
    document.querySelectorAll('[data-set-tema]').forEach(b=>b.setAttribute('aria-pressed',String((pref.tema||'auto')===b.dataset.setTema)));
    document.querySelectorAll('[data-set-size]').forEach(b=>b.setAttribute('aria-pressed',String((pref.tamanho||'m')===b.dataset.setSize)));
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(pref))}catch(e){}}
  apply();
  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-set-tema]');if(t){pref.tema=t.dataset.setTema;save();apply();return}
    const s=e.target.closest('[data-set-size]');if(s){pref.tamanho=s.dataset.setSize;save();apply();return}
    if(e.target.closest('#toTop'))window.scrollTo({top:0,behavior:'smooth'});
  });
  document.addEventListener('DOMContentLoaded',apply);
  window.addEventListener('scroll',()=>{
    const p=document.getElementById('progress');const top=document.getElementById('toTop');
    const h=document.documentElement.scrollHeight-innerHeight;
    if(p)p.style.width=(h>0?Math.min(100,scrollY/h*100):0)+'%';
    if(top)top.hidden=scrollY<600;
  },{passive:true});
})();
window.J={
  $:s=>document.querySelector(s),
  esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  slug:s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'item',
  secKey:s=>{const k=String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return ['brasil','eua','mundo','onu','tecnologia','imigracao','ny-nj'].includes(k)?k:'outros'},
  fmtDate:d=>{try{return new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}catch(e){return d}},
  minutos:txt=>Math.max(1,Math.round(String(txt||'').split(/\s+/).length/200)),
  srcLinks:fs=>(fs||[]).map(f=>`<a href="${J.esc(f.url)}" target="_blank" rel="noopener">${J.esc(f.titulo||f.veiculo||'fonte')}</a>`).join('')
};
