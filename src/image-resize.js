// Resize controls live outside the editable HTML so they never enter saved notes.
(() => {
  const overlay=document.createElement('div'),frame=document.createElement('div');
  overlay.className='image-resize-overlay';overlay.hidden=true;frame.className='image-resize-frame';
  overlay.append(frame);document.body.append(overlay);
  let selected=null,selectedNote=null,drag=null;
  function valid(){return selected&&bodyField.contains(selected)&&active?.id===selectedNote&&!active.deleted&&$('editor').open;}
  function position(){
    if(!valid()){hide();return;}
    const bounds=bodyField.getBoundingClientRect(),rect=selected.getBoundingClientRect();
    Object.assign(overlay.style,{left:bounds.left+'px',top:bounds.top+'px',width:bodyField.clientWidth+'px',height:bodyField.clientHeight+'px'});
    Object.assign(frame.style,{left:rect.left-bounds.left+'px',top:rect.top-bounds.top+'px',width:rect.width+'px',height:rect.height+'px'});
    overlay.hidden=false;
  }
  function restore(state){if(state.width===null)state.image.removeAttribute('width');else state.image.setAttribute('width',state.width);}
  function finish(cancel=false){
    if(!drag)return;
    const state=drag;drag=null;
    if(state.handle.hasPointerCapture(state.pointerId))state.handle.releasePointerCapture(state.pointerId);
    document.body.classList.remove('resizing-image');
    if(cancel||!valid()){restore(state);return;}
    if(state.image.getAttribute('width')===state.width)return;
    const note=active,before={html:note.html,body:note.body,updated:note.updated};
    note.html=RichText.clean(bodyField.innerHTML);note.body=bodyField.value;note.updated=Date.now();
    if(!persist()){Object.assign(note,before);restore(state);toast('The photo size could not be saved. Its previous size was restored.');}
    else bodyField.dispatchEvent(new Event('input',{bubbles:true}));
    scheduleLineNumbers();position();
  }
  function hide(){finish(true);selected=null;selectedNote=null;overlay.hidden=true;}
  for(const [corner,label] of [['nw','top left'],['ne','top right'],['sw','bottom left'],['se','bottom right']]){
    const handle=document.createElement('button');handle.type='button';handle.className='image-resize-handle '+corner;
    handle.setAttribute('aria-label','Resize photo from '+label);handle.title='Drag to resize photo';frame.append(handle);
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0||!valid())return;
      event.preventDefault();event.stopPropagation();
      const rect=selected.getBoundingClientRect(),style=getComputedStyle(bodyField);
      const maxWidth=Math.min(4096,bodyField.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));
      if(!rect.width||!rect.height||maxWidth<1)return;
      drag={image:selected,width:selected.getAttribute('width'),startWidth:rect.width,startHeight:rect.height,x:event.clientX,y:event.clientY,corner,maxWidth,handle,pointerId:event.pointerId};
      handle.setPointerCapture(event.pointerId);formatBar.hidden=true;document.body.classList.add('resizing-image');
    });
    handle.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;
      if(!valid()){hide();return;}
      event.preventDefault();
      if(Math.abs(event.clientX-drag.x)+Math.abs(event.clientY-drag.y)<3)return;
      selected.width=ImageSupport.resizedWidth(drag.startWidth,drag.startHeight,event.clientX-drag.x,event.clientY-drag.y,drag.corner,drag.maxWidth);
      position();
    });
    handle.addEventListener('pointerup',()=>finish());
    handle.addEventListener('pointercancel',()=>{finish(true);position();});
    handle.addEventListener('lostpointercapture',()=>{finish(true);position();});
  }
  document.addEventListener('pointerdown',event=>{
    if(overlay.contains(event.target))return;
    if(event.target.tagName==='IMG'&&bodyField.contains(event.target)&&active&&!active.deleted){
      hide();selected=event.target;selectedNote=active.id;
      event.preventDefault();bodyField.focus();
      const range=document.createRange();range.setStartAfter(selected);range.collapse(true);
      getSelection().removeAllRanges();getSelection().addRange(range);formatBar.hidden=true;position();
    }else hide();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&selected){event.preventDefault();event.stopImmediatePropagation();hide();}
    else if(drag){event.preventDefault();event.stopImmediatePropagation();}
    else if(bodyField.contains(event.target))hide();
  },true);
  bodyField.addEventListener('scroll',()=>{if(selected)position();});
  bodyField.addEventListener('load',()=>{if(selected)position();},true);
  new MutationObserver(()=>{if(selected)position();}).observe(bodyField,{childList:true,subtree:true,attributes:true});
  new ResizeObserver(()=>{if(selected)position();}).observe(bodyField);
  $('editor').addEventListener('close',hide);
  window.addEventListener('blur',()=>{finish(true);if(selected)position();});
  window.addEventListener('resize',()=>{if(selected)position();});
})();
