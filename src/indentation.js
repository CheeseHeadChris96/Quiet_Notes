// List items use structural indentation; ordinary text keeps literal tabs.
let nextTabLeavesEditor=false;
function listItemAtBoundary(node,offset,end=false){
  let element=node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;
  const containing=element?.closest('li');if(containing&&bodyField.contains(containing))return containing;
  if(node.nodeType!==Node.ELEMENT_NODE)return null;
  let child=node.childNodes[end?Math.max(0,offset-1):offset];
  while(child){
    if(child.nodeType===Node.ELEMENT_NODE&&child.tagName==='LI')return child;
    child=end?child.lastChild:child.firstChild;
  }
  return null;
}
function lineRange(start,end){const range=document.createRange();range.setStart(start.node,start.offset);if(end)range.setEnd(end.node,end.offset);else range.setEnd(bodyField,bodyField.childNodes.length);return range;}
function leadingIndentRange(range){
  const walker=document.createTreeWalker(bodyField,NodeFilter.SHOW_TEXT);const chars=[];let node;
  while((node=walker.nextNode())&&chars.length<4){
    if(!range.intersectsNode(node))continue;
    const start=node===range.startContainer?range.startOffset:0;
    const end=node===range.endContainer?range.endOffset:node.length;
    for(let i=start;i<end&&chars.length<4;i++){
      const ch=node.textContent[i];
      if(ch==='\t'&&!chars.length){const deletion=document.createRange();deletion.setStart(node,i);deletion.setEnd(node,i+1);return deletion;}
      if(ch!==' '){return makeDeletion(chars);}
      chars.push({node,offset:i});
    }
  }
  return makeDeletion(chars);
}
function makeDeletion(chars){if(!chars.length)return null;const range=document.createRange();range.setStart(chars[0].node,chars[0].offset);const last=chars[chars.length-1];range.setEnd(last.node,last.offset+1);return range;}
bodyField.addEventListener('keydown',e=>{
  if(e.key==='Escape'){nextTabLeavesEditor=true;return;}
  if(e.key!=='Tab'){nextTabLeavesEditor=false;return;}
  if(nextTabLeavesEditor){nextTabLeavesEditor=false;return;}
  if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
  e.preventDefault();if(!active||active.deleted)return;
  const selection=getSelection();if(!selection.rangeCount)return;
  const chosen=selection.getRangeAt(0).cloneRange();
  if(!bodyField.contains(chosen.startContainer)||!bodyField.contains(chosen.endContainer))return;
  formatBar.hidden=true;savedRange=null;
  const firstItem=listItemAtBoundary(chosen.startContainer,chosen.startOffset);
  const lastItem=chosen.collapsed?firstItem:listItemAtBoundary(chosen.endContainer,chosen.endOffset,true);
  if(firstItem&&lastItem){
    document.execCommand(e.shiftKey?'outdent':'indent',false,null);
    bodyField.dispatchEvent(new Event('input',{bubbles:true}));
    return;
  }
  if(chosen.collapsed&&!e.shiftKey){document.execCommand('insertText',false,'\t');bodyField.dispatchEvent(new Event('input',{bubbles:true}));return;}
  const starts=logicalLineStarts(),startPoint=chosen.cloneRange(),endPoint=chosen.cloneRange();startPoint.collapse(true);endPoint.collapse(false);
  let first=0,last=0;
  for(let i=0;i<starts.length;i++){
    const point=lineRange(starts[i],starts[i]);
    if(point.compareBoundaryPoints(Range.START_TO_START,startPoint)<=0)first=i;
    const comparison=point.compareBoundaryPoints(Range.START_TO_START,endPoint);
    if(comparison<0||(chosen.collapsed&&comparison===0))last=i;
  }
  last=Math.max(first,last);
  const ranges=starts.slice(first,last+1).map((start,index)=>lineRange(start,starts[first+index+1]));
  let changed=false;
  for(let i=ranges.length-1;i>=0;i--){
    if(e.shiftKey){const deletion=leadingIndentRange(ranges[i]);if(deletion){deletion.deleteContents();changed=true;}}
    else{const insertion=ranges[i].cloneRange();insertion.collapse(true);insertion.insertNode(document.createTextNode('\t'));changed=true;}
  }
  if(changed){selection.removeAllRanges();selection.addRange(chosen);bodyField.dispatchEvent(new Event('input',{bubbles:true}));}
});
bodyField.addEventListener('blur',()=>{nextTabLeavesEditor=false;});
