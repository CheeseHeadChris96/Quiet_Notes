const writingArea=document.createElement('div');writingArea.id='writing-area';bodyField.before(writingArea);writingArea.append(bodyField);
const lineGutter=document.createElement('div');lineGutter.id='line-numbers';lineGutter.setAttribute('aria-hidden','true');writingArea.prepend(lineGutter);
let lineNumbersEnabled=false,lineFrame=null;
try{lineNumbersEnabled=localStorage.getItem('quiet-line-numbers')==='true';}catch{}
const lineToggle=makeButton('Line numbers','Line numbers',()=>{
  lineNumbersEnabled=!lineNumbersEnabled;
  try{localStorage.setItem('quiet-line-numbers',String(lineNumbersEnabled));}catch{}
  applyLineNumbers();
});lineToggle.id='toggle-line-numbers';$('open-text').before(lineToggle);
function applyLineNumbers(){lineToggle.setAttribute('aria-pressed',String(lineNumbersEnabled));lineToggle.textContent=(lineNumbersEnabled?'✓ ':'')+'Line numbers';lineGutter.hidden=!lineNumbersEnabled;scheduleLineNumbers();}
function logicalLineStarts(){
  const lines=[{node:bodyField,offset:0}];let content=false,pendingBlock=false;
  function start(node,offset,force=false){const at={node,offset};if(content||force)lines.push(at);else lines[lines.length-1]=at;content=false;}
  function terminalBreak(node){
    // A final BR gives a contenteditable line its height; it does not start another line.
    let current=node;
    while(current!==bodyField){
      const parent=current.parentNode,siblings=[...parent.childNodes],index=siblings.indexOf(current);
      if(siblings.slice(index+1).some(sibling=>sibling.nodeType!==Node.TEXT_NODE||sibling.textContent.length))return false;
      if(parent===bodyField||/^(DIV|P|LI|H[1-6]|PRE|BLOCKQUOTE)$/.test(parent.tagName))return true;
      current=parent;
    }
    return true;
  }
  function visit(node){
    if(node.nodeType===Node.TEXT_NODE){
      const text=node.textContent;if(!text)return;
      if(pendingBlock){start(node,0,true);pendingBlock=false;}else if(!content)start(node,0);
      for(let i=0;i<text.length;i++){if(text[i]==='\n')start(node,i+1,true);else content=true;}
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    if(node.tagName==='IMG'){
      const parent=node.parentNode,index=[...parent.childNodes].indexOf(node);
      if(pendingBlock){start(parent,index,true);pendingBlock=false;}else if(!content)start(parent,index);
      content=true;return;
    }
    if(node.tagName==='BR'){
      const parent=node.parentNode,index=[...parent.childNodes].indexOf(node);
      if(!content)start(parent,index);
      if(terminalBreak(node))return;
      start(parent,index+1,true);pendingBlock=false;return;
    }
    const block=/^(DIV|P|LI|H[1-6]|PRE|BLOCKQUOTE)$/.test(node.tagName)&&node!==bodyField;
    if(block){start(node,0,pendingBlock);pendingBlock=false;}
    for(const child of node.childNodes)visit(child);
    if(block)pendingBlock=true;
  }
  visit(bodyField);return lines;
}
function drawLineNumbers(){
  lineFrame=null;if(!lineNumbersEnabled||!$('editor').open)return;
  const starts=logicalLineStarts(),bounds=bodyField.getBoundingClientRect();
  lineGutter.style.width=Math.max(28,String(starts.length).length*7+12)+'px';
  lineGutter.replaceChildren();
  for(let i=0;i<starts.length;i++){
    const {node,offset}=starts[i],range=document.createRange();range.setStart(node,offset);range.collapse(true);
    let rect=range.getClientRects()[0];
    if(!rect||!rect.height){
      if(node.nodeType===Node.ELEMENT_NODE&&node.childNodes[offset]?.nodeName==='BR'){range.selectNode(node.childNodes[offset]);rect=range.getClientRects()[0];}
      if((!rect||!rect.height)&&node.nodeType===Node.TEXT_NODE&&offset<node.length){range.setEnd(node,offset+1);rect=range.getClientRects()[0];}
      if(!rect||!rect.height){const element=node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;rect=element.getBoundingClientRect();if(element===bodyField)rect={top:bounds.top+parseFloat(getComputedStyle(bodyField).paddingTop)-bodyField.scrollTop,height:16};}
    }
    const label=document.createElement('span');label.textContent=i+1;label.style.top=(rect.top-bounds.top+Math.max(0,(rect.height-16)/2))+'px';lineGutter.append(label);
  }
}
function scheduleLineNumbers(){if(lineFrame===null)lineFrame=requestAnimationFrame(drawLineNumbers);}
bodyField.addEventListener('input',scheduleLineNumbers);bodyField.addEventListener('scroll',scheduleLineNumbers);
new MutationObserver(scheduleLineNumbers).observe(bodyField,{childList:true,subtree:true,characterData:true,attributes:true});
new ResizeObserver(scheduleLineNumbers).observe(bodyField);
new MutationObserver(scheduleLineNumbers).observe($('editor'),{attributes:true,attributeFilter:['open']});
applyLineNumbers();
