// Notes and imported HTML may contain untrusted markup. Keep text formatting and validated embedded images.
const RichText = (() => {
  const sizes=['','10','13','16','18','24','32','48'];
  function clean(html) {
    const doc=new DOMParser().parseFromString(html,'text/html');
    const out=document.createElement('div');
    function copy(node,parent) {
      if(node.nodeType===3){parent.append(document.createTextNode(node.textContent));return;}
      if(node.nodeType!==1 || ['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','TEMPLATE'].includes(node.tagName))return;
      const tag=node.tagName.toLowerCase();
      if(tag==='img'){
        const src=node.getAttribute('src')||'';
        if(!ImageSupport.safeSource(src))return;
        const image=document.createElement('img');image.src=src;image.alt=(node.getAttribute('alt')||'Image').slice(0,200);image.draggable=false;const width=ImageSupport.safeWidth(node.getAttribute('width'));if(width)image.width=width;parent.append(image);return;
      }
      const allowed=['b','strong','i','em','u','s','br','div','p','ul','ol','li','span','font'];
      if(!allowed.includes(tag)){for(const child of node.childNodes)copy(child,parent);return;}
      const target=document.createElement(tag==='font'?'span':tag);
      const color=node.style.color || (tag==='font'?node.getAttribute('color'):'');
      if(color && CSS.supports('color',color) && !/var\(|url\(/i.test(color))target.style.color=color;
      let size=node.style.fontSize || (tag==='font'&&sizes[node.getAttribute('size')]?sizes[node.getAttribute('size')]+'px':'');
      if(/^(10|12|13|14|16|18|20|24|28|32|36|48)px$/.test(size))target.style.fontSize=size;
      if(['bold','700'].includes(node.style.fontWeight))target.style.fontWeight='bold';
      if(node.style.fontStyle==='italic')target.style.fontStyle='italic';
      for(const child of node.childNodes)copy(child,target);
      parent.append(target);
    }
    for(const child of doc.body.childNodes)copy(child,out);
    return out.innerHTML;
  }
  function render(element,html){element.innerHTML=clean(html);}
  return {clean,render};
})();
const richBody=document.getElementById('note-body');
Object.defineProperty(richBody,'value',{get(){return this.innerText;},set(value){this.textContent=value;}});
Object.defineProperty(richBody,'readOnly',{get(){return this.contentEditable==='false';},set(value){this.contentEditable=value?'false':'true';}});
richBody.addEventListener('paste',event=>{
  if(event.defaultPrevented||richBody.readOnly)return;
  event.preventDefault();
  const html=event.clipboardData.getData('text/html');
  if(html)document.execCommand('insertHTML',false,RichText.clean(html));
  else document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));
});
richBody.addEventListener('drop',event=>event.preventDefault());
