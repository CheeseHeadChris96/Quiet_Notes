let history = null, savedRange=null;
const bodyField=$('note-body');
const toolsBar=document.createElement('div');toolsBar.className='text-toolbar';toolsBar.setAttribute('aria-label','Text editing tools');
const undo=makeButton('↶ Undo','Undo text edit',()=>travel('undo'));
const redo=makeButton('↷ Redo','Redo text edit',()=>travel('redo'));
const select=makeButton('Select all','Select all note text',()=>{bodyField.focus();const range=document.createRange();range.selectNodeContents(bodyField);const s=getSelection();s.removeAllRanges();s.addRange(range);});
const find=makeButton('Find / replace','Find and replace in note',()=>{findBar.hidden=!findBar.hidden;if(!findBar.hidden)findInput.focus();});
const save=makeButton('Save text file…','Save note content as a text file',saveText);
toolsBar.append(undo,redo,select,find,save);toolsBar.hidden=true;bodyField.before(toolsBar);
// Keep editing utilities available in More without occupying the writing area.
const editMenu=$('open-text').parentElement;for(const button of [undo,redo,select,find,save])editMenu.append(button);
const formatBar=document.createElement('div');formatBar.className='format-toolbar';formatBar.setAttribute('aria-label','Text formatting');
function command(name,value){if(active.deleted)return;bodyField.focus();if(savedRange&&bodyField.contains(savedRange.commonAncestorContainer)){const s=getSelection();s.removeAllRanges();s.addRange(savedRange);}document.execCommand(name,false,value);bodyField.dispatchEvent(new Event('input',{bubbles:true}));}
const bold=makeButton('B','Bold',()=>command('bold'));bold.className='bold-control';
const italic=makeButton('I','Italic',()=>command('italic'));italic.className='italic-control';
const bullets=makeButton('• List','Bulleted list',()=>command('insertUnorderedList'));
const clear=makeButton('Clear style','Clear text formatting',()=>command('removeFormat'));
const size=document.createElement('select');size.setAttribute('aria-label','Font size');
for(const [value,label] of [['2','13'],['3','16'],['4','18'],['5','24'],['6','32'],['7','48']]){const o=document.createElement('option');o.value=value;o.textContent=label;size.append(o);}size.value='3';size.onchange=()=>command('fontSize',size.value);
const colorLabel=document.createElement('label');colorLabel.textContent='Text color ';
const color=document.createElement('input');color.type='color';color.value='#202020';color.setAttribute('aria-label','Text color');color.oninput=()=>command('foreColor',color.value);colorLabel.append(color);
formatBar.append(bold,italic,size,colorLabel,bullets,clear);formatBar.hidden=true;formatBar.setAttribute('role','toolbar');document.body.append(formatBar);
for(const button of formatBar.querySelectorAll('button'))button.onmousedown=e=>e.preventDefault();
function showSelectionFormatting(){
  if(!active||active.deleted||!$('editor').open){formatBar.hidden=true;savedRange=null;return;}
  const selection=getSelection();
  if(formatBar.contains(document.activeElement)&&savedRange&&bodyField.contains(savedRange.commonAncestorContainer))return;
  if(!selection.rangeCount||selection.isCollapsed||!bodyField.contains(selection.anchorNode)||!bodyField.contains(selection.focusNode)){
    formatBar.hidden=true;savedRange=null;return;
  }
  savedRange=selection.getRangeAt(0).cloneRange();
  const selectedSize=document.queryCommandValue('fontSize');if([...size.options].some(o=>o.value===selectedSize))size.value=selectedSize;
  bold.setAttribute('aria-pressed',String(document.queryCommandState('bold')));italic.setAttribute('aria-pressed',String(document.queryCommandState('italic')));bullets.setAttribute('aria-pressed',String(document.queryCommandState('insertUnorderedList')));
  formatBar.hidden=false;
  const rect=savedRange.getBoundingClientRect(),width=formatBar.offsetWidth,height=formatBar.offsetHeight;
  formatBar.style.left=Math.max(8,Math.min(rect.left,innerWidth-width-8))+'px';
  formatBar.style.top=Math.max(8,Math.min(rect.top-height-8>=8?rect.top-height-8:rect.bottom+8,innerHeight-height-8))+'px';
}
document.addEventListener('selectionchange',showSelectionFormatting);
bodyField.addEventListener('pointerup',showSelectionFormatting);
bodyField.addEventListener('keyup',showSelectionFormatting);
bodyField.addEventListener('scroll',()=>{formatBar.hidden=true;});
window.addEventListener('resize',()=>{formatBar.hidden=true;});
document.addEventListener('pointerdown',e=>{if(!formatBar.contains(e.target)&&!bodyField.contains(e.target)){formatBar.hidden=true;savedRange=null;}});
formatBar.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();bodyField.focus();formatBar.hidden=true;}});
$('editor').addEventListener('close',()=>{formatBar.hidden=true;savedRange=null;});
const findBar=document.createElement('div');findBar.className='find-bar';findBar.hidden=true;
const findInput=document.createElement('input');findInput.placeholder='Find (match case)';findInput.setAttribute('aria-label','Find text, case sensitive');
const replaceInput=document.createElement('input');replaceInput.placeholder='Replace with';replaceInput.setAttribute('aria-label','Replacement text');
const count=document.createElement('span');count.setAttribute('role','status');
const next=makeButton('Next','Find next match',findNext);
const replace=makeButton('Replace all','Replace all matches',()=>{
  if(active.deleted||!findInput.value)return;
  const positions=TextTools.matches(bodyField.textContent,findInput.value);
  for(const at of positions.reverse()){const range=textRange(at,at+findInput.value.length);range.deleteContents();range.insertNode(document.createTextNode(replaceInput.value));}
  bodyField.dispatchEvent(new Event('input',{bubbles:true}));
});
findBar.append(findInput,replaceInput,next,replace,count);bodyField.before(findBar);
const hint=document.createElement('p');hint.className='file-hint';hint.hidden=true;hint.textContent='Text files save without formatting.';bodyField.after(hint);
function snapshot(){return {title:$('note-title').value,html:RichText.clean(bodyField.innerHTML)};}
function historyButtons(){undo.disabled=active.deleted||!history||history.index===0;redo.disabled=active.deleted||!history||history.index===history.values.length-1;replace.disabled=active.deleted;for(const c of formatBar.querySelectorAll('button,select,input'))c.disabled=active.deleted;}
function countMatches(){const n=TextTools.matches(bodyField.textContent,findInput.value).length;count.textContent=findInput.value?`${n} matches`:'';}
function travel(direction){if(!history||active.deleted)return;const state=history[direction]();$('note-title').value=state.title;RichText.render(bodyField,state.html);active.title=state.title;active.body=bodyField.value;active.html=state.html;active.updated=Date.now();persist();updateEditor();historyButtons();countMatches();savedRange=null;bodyField.focus();}
function textRange(start,end){const walker=document.createTreeWalker(bodyField,NodeFilter.SHOW_TEXT);let node,offset=0;const range=document.createRange();let begun=false;while(node=walker.nextNode()){const length=node.textContent.length;if(!begun&&start<=offset+length){range.setStart(node,start-offset);begun=true;}if(begun&&end<=offset+length){range.setEnd(node,end-offset);return range;}offset+=length;}range.selectNodeContents(bodyField);return range;}
function findNext(){const positions=TextTools.matches(bodyField.textContent,findInput.value);countMatches();if(!positions.length)return;let offset=0;const s=getSelection();if(s.rangeCount&&bodyField.contains(s.focusNode)){const before=document.createRange();before.selectNodeContents(bodyField);before.setEnd(s.focusNode,s.focusOffset);offset=before.toString().length;}const at=positions.find(i=>i>=offset)??positions[0];bodyField.focus();s.removeAllRanges();s.addRange(textRange(at,at+findInput.value.length));}
findInput.oninput=countMatches;
findInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();findNext();}};
replaceInput.onkeydown=e=>{if(e.key==='Enter')e.preventDefault();};
const originalOpen=openNote;
openNote=function(id){originalOpen(id);history=new TextTools.History(snapshot());formatBar.hidden=true;savedRange=null;findBar.hidden=true;findInput.value='';replaceInput.value='';count.textContent='';size.value='3';historyButtons();bodyField.focus();};
for(const id of ['note-title','note-body'])$(id).addEventListener('input',()=>{history?.push(snapshot());historyButtons();countMatches();});
async function openText(){
  if(storageFailed)return toast('Saved notes need recovery before opening another file.');
  if(!window.textFiles){$('text-file').click();return;}
  try{const file=await window.textFiles.open();if(file?.error)throw new Error(file.error);if(file)addText(file);}catch(error){toast(error.message);}
}
function addText(file){
  if($('editor').open)$('editor').close();
  const now=Date.now();const n={id:crypto.randomUUID(),title:file.name.slice(0,200),body:file.content,color:'neutral',folderId:noteDestination(),created:now,updated:now,pinned:false,deleted:false};
  notes.unshift(n);persist();$('search').value='';setView('all');openNote(n.id);bodyField.focus();
}
async function saveText(){
  if(!active)return;const name=TextTools.filename(active.title),content=active.body;
  try{
    if(window.textFiles){const result=await window.textFiles.save(name,content);if(result?.error)throw new Error(result.error);if(result)toast(`Saved ${result.name}`);}
    else{const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch(error){toast(`Could not save file: ${error.message}`);}
}
$('open-text').onclick=openText;
$('text-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2_000_000)throw new Error('Choose a text file smaller than 2 MB.');const content=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());if(content.includes('\0'))throw new Error('Choose a UTF-8 text file.');addText({name:file.name,content});}catch(error){toast(error.message);}e.target.value='';};
document.addEventListener('keydown',e=>{
  if(!(e.metaKey||e.ctrlKey))return;const key=e.key.toLowerCase();
  if(key==='o'){e.preventDefault();e.stopImmediatePropagation();openText();}
  if(!$('editor').open)return;
  if(key==='s'){e.preventDefault();e.stopImmediatePropagation();saveText();}
  if(key==='f'){e.preventDefault();e.stopImmediatePropagation();findBar.hidden=false;findInput.focus();}
  if(document.activeElement===bodyField&&(key==='b'||key==='i')){e.preventDefault();e.stopImmediatePropagation();command(key==='b'?'bold':'italic');}
  if((key==='z'||key==='y')&&[bodyField,$('note-title')].includes(document.activeElement)){
    e.preventDefault();e.stopImmediatePropagation();travel(key==='y'||e.shiftKey?'redo':'undo');
  }
},true);
