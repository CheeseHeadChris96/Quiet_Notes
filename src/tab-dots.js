// Visual guides stay outside the note: copying and exporting keep literal tabs.
(() => {
  const overlay=document.createElement('div');overlay.id='tab-dots';overlay.setAttribute('aria-hidden','true');
  writingArea.append(overlay);
  let enabled=false,frame=null;
  try{enabled=localStorage.getItem('quiet-tab-dots')==='true';}catch{}
  const toggle=makeButton('Show tab dots','Show tab dots',()=>{
    enabled=!enabled;
    try{localStorage.setItem('quiet-tab-dots',String(enabled));}catch{}
    apply();
  });toggle.id='toggle-tab-dots';lineToggle.after(toggle);
  function apply(){
    toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent=(enabled?'✓ ':'')+'Show tab dots';
    overlay.hidden=!enabled;if(!enabled)overlay.replaceChildren();schedule();
  }
  function draw(){
    frame=null;overlay.replaceChildren();
    if(!enabled||!$('editor').open){overlay.hidden=true;return;}
    overlay.hidden=false;
    const bounds=bodyField.getBoundingClientRect(),area=writingArea.getBoundingClientRect();
    Object.assign(overlay.style,{left:bounds.left-area.left+'px',top:bounds.top-area.top+'px',width:bodyField.clientWidth+'px',height:bodyField.clientHeight+'px'});
    const dots=document.createDocumentFragment(),walker=document.createTreeWalker(bodyField,NodeFilter.SHOW_TEXT),range=document.createRange();
    let node;
    while(node=walker.nextNode()){
      for(let offset=node.data.indexOf('\t');offset!==-1;offset=node.data.indexOf('\t',offset+1)){
        range.setStart(node,offset);range.setEnd(node,offset+1);
        const rect=[...range.getClientRects()].find(rect=>rect.width>0&&rect.height>0);
        if(!rect||rect.bottom<bounds.top||rect.top>bounds.top+bodyField.clientHeight)continue;
        const dot=document.createElement('span');
        dot.style.left=rect.left-bounds.left+rect.width/2+'px';dot.style.top=rect.top-bounds.top+rect.height/2+'px';dots.append(dot);
      }
    }
    overlay.append(dots);
  }
  function schedule(){if(frame===null)frame=requestAnimationFrame(draw);}
  bodyField.addEventListener('input',schedule);bodyField.addEventListener('scroll',schedule);bodyField.addEventListener('load',schedule,true);
  new MutationObserver(schedule).observe(bodyField,{childList:true,subtree:true,characterData:true,attributes:true});
  new MutationObserver(schedule).observe($('editor'),{attributes:true,attributeFilter:['open']});
  new ResizeObserver(schedule).observe(bodyField);
  document.fonts.ready.then(schedule);apply();
})();
