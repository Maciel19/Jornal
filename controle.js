// Controle do site: lê e salva as preferências do Caique em controle/preferencias.json, no GitHub.
// Quem tem a chave (token) salva neste navegador vira "dono": as mudanças vão para o repositório
// e as tarefas automáticas leem de lá. Visitantes só leem.
(function(){
  const REPO='Maciel19/Jornal', PATH='controle/preferencias.json', API='https://api.github.com/repos/'+REPO+'/contents/'+PATH;
  const KTOKEN='jornal-caique-token', KCACHE='jornal-caique-prefs';
  const PADRAO={temas:[],pedido:'',pedidoEm:'',pedidoPautas:'',pedidoPautasEm:'',seguindo:{},votos:{},pautasPostadas:{}};
  let token=null, sha=null, prefs=null, timer=null, ouvintes=[], estado='lendo';
  try{token=localStorage.getItem(KTOKEN)}catch(e){}

  const b64dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g,'')),c=>c.charCodeAt(0)));
  const b64enc=s=>{const by=new TextEncoder().encode(s);let bin='';by.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin)};
  const hdr=()=>({'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'});
  function avisar(novo){if(novo)estado=novo;document.documentElement.classList.toggle('dono',!!token);ouvintes.forEach(f=>{try{f(prefs,estado)}catch(e){console.warn(e)}})}
  function cache(){try{localStorage.setItem(KCACHE,JSON.stringify(prefs))}catch(e){}}

  async function lerGitHub(){
    const r=await fetch(API+'?ref=main',{headers:hdr(),cache:'no-store'});
    if(r.status===401||r.status===403)throw {code:'chave'};
    if(r.status===404){sha=null;return {...PADRAO}}
    if(!r.ok)throw {code:'rede'};
    const j=await r.json();sha=j.sha;return {...PADRAO,...JSON.parse(b64dec(j.content))};
  }
  async function lerPublico(){
    const r=await fetch(PATH,{cache:'no-cache'});if(!r.ok)throw {code:'rede'};
    return {...PADRAO,...await r.json()};
  }
  async function carregar(){
    try{const c=JSON.parse(localStorage.getItem(KCACHE));if(c){prefs={...PADRAO,...c};avisar()}}catch(e){}
    try{prefs=token?await lerGitHub():await lerPublico();cache();avisar(token?'pronto':'visitante')}
    catch(e){
      if(e.code==='chave'){avisar('chave-invalida')}
      else{if(!prefs)prefs={...PADRAO};avisar('offline')}
    }
  }
  async function gravar(tentativa=0){
    if(!token)return;
    avisar('salvando');
    prefs.atualizadoEm=new Date().toISOString();
    const corpo={message:'Preferências atualizadas pelo site',content:b64enc(JSON.stringify(prefs,null,1)),branch:'main'};
    if(sha)corpo.sha=sha;
    const r=await fetch(API,{method:'PUT',headers:{...hdr(),'Content-Type':'application/json'},body:JSON.stringify(corpo)});
    if(r.ok){sha=(await r.json()).content.sha;cache();avisar('salvo');return}
    if((r.status===409||r.status===422)&&tentativa<2){
      // Outra aba ou aparelho salvou antes: pega a versão nova (sha) e grava de novo com as escolhas daqui.
      try{const j=await (await fetch(API+'?ref=main',{headers:hdr(),cache:'no-store'})).json();sha=j.sha}catch(e){}
      return gravar(tentativa+1);
    }
    avisar(r.status===401||r.status===403?'chave-invalida':'erro');
  }
  window.Prefs={
    get:()=>prefs,
    estado:()=>estado,
    dono:()=>!!token,
    ouvir:f=>{ouvintes.push(f);if(prefs)f(prefs,estado)},
    // muda as preferências e salva no GitHub depois de 1,5 s sem novas mudanças
    mudar(fn){if(!prefs)prefs={...PADRAO};fn(prefs);cache();avisar(token?'pendente':estado);
      if(token){clearTimeout(timer);timer=setTimeout(()=>gravar(),1500)}},
    async conectar(chave){
      chave=String(chave||'').trim();if(!chave)return 'Cole a chave primeiro.';
      const r=await fetch('https://api.github.com/repos/'+REPO,{headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+chave}});
      if(!r.ok)return 'O GitHub recusou essa chave. Confira se copiou inteira e se ela dá acesso ao repositório Jornal.';
      const j=await r.json();if(!j.permissions||!j.permissions.push)return 'A chave funciona, mas não tem permissão de escrita. Marque "Contents: Read and write" ao criar.';
      token=chave;try{localStorage.setItem(KTOKEN,chave)}catch(e){}
      await carregar();return '';
    },
    desconectar(){token=null;sha=null;try{localStorage.removeItem(KTOKEN)}catch(e){}carregar()}
  };
  carregar();

  // Faixa de status + painel para conectar a chave, usada nas duas páginas.
  const TXT={lendo:'Carregando suas preferências…',pronto:'Conectado: suas escolhas vão para o GitHub e as tarefas leem de lá.',
    pendente:'Salvando em instantes…',salvando:'Salvando no GitHub…',salvo:'Salvo no GitHub. A próxima edição já vai considerar.',
    visitante:'Modo leitura. Conecte sua chave para que avaliações e pedidos cheguem às tarefas.',
    'chave-invalida':'A chave salva não funciona mais (expirou ou foi apagada). Conecte uma nova.',
    offline:'Sem conexão com o GitHub agora. Suas escolhas ficam guardadas aqui e vão quando voltar.',erro:'Não deu para salvar no GitHub. Tente de novo em instantes.'};
  window.Prefs.painel=function(el){
    el.innerHTML=`<div class="sync"><span class="sync-dot" aria-hidden="true"></span><span class="sync-txt" role="status"></span>
      <button class="tbtn sync-btn" type="button"></button></div>
      <div class="sync-form" hidden>
        <p class="hint">Crie uma chave no GitHub em <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a>: em <strong>Repository access</strong> escolha <strong>Only select repositories → Jornal</strong>; em <strong>Permissions → Contents</strong> escolha <strong>Read and write</strong>; gere e cole aqui. A chave fica só neste aparelho. Não mostre para ninguém.</p>
        <form class="row"><input type="password" autocomplete="off" placeholder="github_pat_…" aria-label="Chave do GitHub"><button class="small" type="submit">Conectar</button></form>
        <p class="hint sync-err" role="alert"></p>
      </div>`;
    const dot=el.querySelector('.sync-dot'),txt=el.querySelector('.sync-txt'),btn=el.querySelector('.sync-btn'),form=el.querySelector('.sync-form'),err=el.querySelector('.sync-err');
    function pintar(_p,st){txt.textContent=TXT[st]||'';el.dataset.estado=st;
      btn.textContent=token?'Desconectar':'Conectar chave';btn.hidden=st==='lendo';if(token&&st!=='chave-invalida')form.hidden=true}
    window.Prefs.ouvir(pintar);
    btn.addEventListener('click',()=>{if(token){window.Prefs.desconectar()}else{form.hidden=!form.hidden;if(!form.hidden)form.querySelector('input').focus()}});
    form.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();err.textContent='Verificando…';
      const m=await window.Prefs.conectar(form.querySelector('input').value);err.textContent=m;if(!m){form.querySelector('input').value='';form.hidden=true}});
  };
})();
