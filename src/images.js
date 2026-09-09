const imageInput=document.createElement('input');imageInput.type='file';imageInput.accept='image/png,image/jpeg,image/webp,image/gif';imageInput.hidden=true;document.body.append(imageInput);
let imageSelection=null,imageSelectionNote=null,imageBusy=false;
document.addEventListener('selectionchange',()=>{
  const selection=getSelection();
  if(active&&selection.rangeCount&&bodyField.contains(selection.anchorNode)&&bodyField.contains(selection.focusNode)){imageSelection=selection.getRangeAt(0).cloneRange();imageSelectionNote=active.id;}
});
const insertImage=makeButton('Insert image…','Insert image into note',()=>{
  if(!active||active.deleted||!$('editor').open)return toast('Open a note before inserting an image.');
  imageInput.click();
});$('open-text').after(insertImage);
function readImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read the image.'));reader.readAsDataURL(file);});}
async function prepareImage(file){
  if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
  if(file.size>ImageSupport.MAX_SOURCE_BYTES)throw new Error('Choose an image smaller than 20 MB.');
  const source=await readImage(file),picture=new Image();
  await new Promise((resolve,reject)=>{picture.onload=resolve;picture.onerror=()=>reject(new Error('This image could not be opened.'));picture.src=source;});
  if(!picture.naturalWidth||!picture.naturalHeight)throw new Error('This image has no dimensions.');
  if(Math.max(picture.naturalWidth,picture.naturalHeight)<=1600&&ImageSupport.safeSource(source))return source;
  const scale=Math.min(1,1600/Math.max(picture.naturalWidth,picture.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(picture.naturalWidth*scale));canvas.height=Math.max(1,Math.round(picture.naturalHeight*scale));
  canvas.getContext('2d').drawImage(picture,0,0,canvas.width,canvas.height);
  for(const quality of [.85,.7,.5]){const result=canvas.toDataURL('image/webp',quality);if(ImageSupport.safeSource(result))return result;}
  throw new Error('This image is too large to embed. Try a smaller image.');
}
async function addImage(file){
  if(imageBusy)return toast('Please wait for the current image to finish.');
  if(storageFailed||!active||active.deleted||!$('editor').open)return toast('Open an editable note before inserting an image.');
  imageBusy=true;const note=active,noteId=active.id;
  const insertion=imageSelectionNote===noteId&&imageSelection&&bodyField.contains(imageSelection.commonAncestorContainer)?imageSelection.cloneRange():null;
  try{
    const src=await prepareImage(file);
    if(active?.id!==noteId||!$('editor').open||active.deleted)throw new Error('The note changed. Insert the image again in the intended note.');
    const before={html:note.html,body:note.body,updated:note.updated},beforeDOM=bodyField.innerHTML;
    const range=insertion&&bodyField.contains(insertion.commonAncestorContainer)?insertion:document.createRange();
    if(range!==insertion){range.selectNodeContents(bodyField);range.collapse(false);}
    const image=document.createElement('img');image.src=src;image.alt=file.name||'Pasted image';image.draggable=false;
    range.deleteContents();range.insertNode(image);range.setStartAfter(image);range.collapse(true);
    note.html=RichText.clean(bodyField.innerHTML);note.body=bodyField.value;note.updated=Date.now();
    if(!persist()){Object.assign(note,before);bodyField.innerHTML=beforeDOM;throw new Error('Not enough local storage for this image. The note was left unchanged.');}
    bodyField.focus();const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
    bodyField.dispatchEvent(new Event('input',{bubbles:true}));scheduleLineNumbers();toast('Image inserted');
  }catch(error){toast(error.message);}finally{imageBusy=false;imageInput.value='';}
}
imageInput.onchange=()=>{if(imageInput.files[0])addImage(imageInput.files[0]);};
bodyField.addEventListener('paste',event=>{
  const file=[...(event.clipboardData?.items||[])].find(item=>item.kind==='file'&&item.type.startsWith('image/'))?.getAsFile();
  if(file){event.preventDefault();event.stopImmediatePropagation();addImage(file);}
},true);
bodyField.addEventListener('load',scheduleLineNumbers,true);
