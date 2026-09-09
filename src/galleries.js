(() => {
  const panel=document.createElement('section');panel.id='photo-gallery';panel.setAttribute('aria-label','Photo gallery');panel.hidden=true;$('notes-home').append(panel);
  const toolbar=document.createElement('div');toolbar.className='gallery-toolbar';
  const uploadButton=makeButton('Upload photos…','Upload photos',()=>upload(folderFilter));
  const hint=document.createElement('span');hint.textContent='Double-click a photo to preview';toolbar.append(uploadButton,hint);
  const grid=document.createElement('div');grid.className='photo-grid';grid.setAttribute('aria-label','Photos');
  const status=document.createElement('p');status.className='gallery-status';status.setAttribute('role','status');panel.append(toolbar,grid,status);
  const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='image/png,image/jpeg,image/webp,image/gif';input.hidden=true;document.body.append(input);
  let uploadTarget=null,busy=false,generation=0,urls=[],previewURL=null,shownPhoto=null,shownPhotos=[];
  const isGallery=id=>folders.some(f=>f.id===id&&f.kind==='gallery');
  const supported=type=>/^image\/(png|jpeg|webp|gif)$/.test(type);
  function release(){for(const url of urls)URL.revokeObjectURL(url);urls=[];}
  function blobURL(blob){const url=URL.createObjectURL(blob);urls.push(url);return url;}
  function friendly(error){toast(error.message||'The photo action could not be completed.');}
  async function bitmap(blob){const url=URL.createObjectURL(blob),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('This photo could not be opened.'));img.src=url;});return img;}finally{URL.revokeObjectURL(url);}}
  async function thumbnail(blob){
    const img=await bitmap(blob),scale=Math.min(1,256/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create a photo thumbnail.')),'image/png'));
  }
  function upload(id){if(storageFailed||busy)return toast('Please finish the current save before uploading.');if(!isGallery(id))return;uploadTarget=id;input.click();}
  input.onchange=async()=>{
    const files=[...input.files],target=uploadTarget;input.value='';if(!files.length||!isGallery(target))return;
    busy=true;uploadButton.disabled=true;let added=0,errors=[];
    try{
      for(const file of files){
        try{
          if(!supported(file.type))throw new Error(`${file.name}: choose a PNG, JPEG, WebP, or GIF.`);
          if(file.size>20_000_000)throw new Error(`${file.name}: choose a photo smaller than 20 MB.`);
          const thumb=await thumbnail(file);
          if(!isGallery(target))throw new Error('The destination gallery was removed.');
          setSaveStatus('Unsaved');await PhotoStore.put([{id:crypto.randomUUID(),galleryId:target,name:file.name.slice(0,200),type:file.type,created:Date.now(),blob:file,thumbnail:thumb}]);added++;
        }catch(error){errors.push(error.message);}
      }
      setSaveStatus(errors.length?'Unsaved':'Saved on this device');
      if(folderFilter===target)await draw();
      toast(`${added} photo${added===1?'':'s'} uploaded.${errors.length?' '+errors.join(' '):''}`);
    }finally{busy=false;uploadButton.disabled=false;}
  };
  async function draw(){
    const ticket=++generation,id=folderFilter;release();grid.replaceChildren();
    if(!isGallery(id)||$('notes-home').hidden)return;
    status.textContent='Loading photos…';
    try{
      const photos=(await PhotoStore.all()).filter(p=>p.galleryId===id).sort((a,b)=>a.created-b.created);
      if(ticket!==generation||folderFilter!==id)return;
      shownPhotos=photos;
      for(const photo of photos){
        const card=document.createElement('button');card.type='button';card.className='photo-card';card.setAttribute('aria-label',`Photo ${photo.name}`);card.title=photo.name;
        const img=document.createElement('img');img.src=blobURL(photo.thumbnail);img.alt='';img.draggable=false;img.loading='lazy';
        const label=document.createElement('span');label.textContent=photo.name;card.append(img,label);
        card.ondblclick=()=>preview(photo);card.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();preview(photo);}if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();const r=card.getBoundingClientRect();photoMenu(photo,r.left,r.bottom,card);}};
        card.oncontextmenu=event=>{event.preventDefault();event.stopPropagation();photoMenu(photo,event.clientX,event.clientY,card);};grid.append(card);
      }
      status.textContent=photos.length?`${photos.length} photo${photos.length===1?'':'s'} · Originals stored on this device`:'No photos yet. Upload photos to get started.';
    }catch(error){if(ticket===generation)status.textContent=error.message;}
  }
  const baseRender=render;render=function(){
    baseRender();const gallery=isGallery(folderFilter);panel.hidden=!gallery;$('notes-home').classList.toggle('show-gallery',gallery);
    if(gallery){folderActions.hidden=true;childFolders.hidden=true;$('empty').hidden=true;draw();}else {generation++;release();}
  };
  // Preview is a separate dialog; it never becomes editable note content.
  const viewer=document.createElement('dialog');viewer.id='photo-preview';viewer.setAttribute('aria-label','Photo preview');
  const previewBar=document.createElement('div');previewBar.className='photo-preview-bar';const previewName=document.createElement('span');
  const closePreview=makeButton('×','Close photo preview',()=>viewer.close());previewBar.append(previewName,closePreview);
  const full=document.createElement('img');full.alt='';
  const previewFooter=document.createElement('div');previewFooter.className='photo-preview-actions';
  previewFooter.append(makeButton('Copy','Copy photo',()=>copyPhoto(shownPhoto).catch(friendly)),makeButton('Move…','Move photo',()=>chooseMove(shownPhoto)),makeButton('Save as…','Save photo locally',()=>savePhoto(shownPhoto).catch(friendly)),makeButton('Delete','Delete photo',()=>confirmDelete(shownPhoto)));
  viewer.append(previewBar,full,previewFooter);document.body.append(viewer);
  function preview(photo){shownPhoto=photo;if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(photo.blob);full.src=previewURL;full.alt=photo.name;previewName.textContent=photo.name;if(!viewer.open)viewer.showModal();closePreview.focus();}
  viewer.onclose=()=>{full.removeAttribute('src');if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;shownPhoto=null;closeMenu();};
  viewer.onkeydown=event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){const at=shownPhotos.findIndex(p=>p.id===shownPhoto?.id),photo=shownPhotos[at+(event.key==='ArrowRight'?1:-1)];if(photo){event.preventDefault();preview(photo);}}};
  full.oncontextmenu=event=>{event.preventDefault();photoMenu(shownPhoto,event.clientX,event.clientY,closePreview);};
  const menu=document.createElement('div');menu.className='photo-context-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Photo actions');menu.hidden=true;document.body.append(menu);
  let menuAnchor=null;
  function closeMenu(){menu.hidden=true;}
  function photoMenu(photo,x,y,anchor){
    closeFolderMenu();menuAnchor=anchor;menu.replaceChildren();(viewer.open?viewer:document.body).append(menu);
    for(const [label,action] of [['Preview',()=>preview(photo)],['Copy',()=>copyPhoto(photo)],['Move…',()=>chooseMove(photo)],['Save as…',()=>savePhoto(photo)],['Delete',()=>confirmDelete(photo)]]){
      const button=makeButton(label,label,()=>{closeMenu();Promise.resolve().then(action).catch(friendly);});button.setAttribute('role','menuitem');menu.append(button);
    }
    menu.hidden=false;menu.style.left=Math.max(4,Math.min(x,innerWidth-menu.offsetWidth-4))+'px';menu.style.top=Math.max(4,Math.min(y,innerHeight-menu.offsetHeight-4))+'px';menu.querySelector('button').focus();
  }
  menu.onkeydown=event=>{const buttons=[...menu.querySelectorAll('button')],at=buttons.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu();menuAnchor?.focus();}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();buttons[(at+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();}else if(event.key==='Tab')closeMenu();};
  document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))closeMenu();});document.addEventListener('scroll',closeMenu,true);window.addEventListener('resize',closeMenu);
  async function pngBlob(photo){if(photo.type==='image/png')return photo.blob;const img=await bitmap(photo.blob),canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not copy photo.')),'image/png'));}
  async function copyPhoto(photo){
    if(window.photoFiles){const result=await window.photoFiles.copy(new Uint8Array(await photo.blob.arrayBuffer()));if(result?.error)throw new Error(result.error);}
    else{if(!navigator.clipboard?.write||!window.ClipboardItem)throw new Error('Image clipboard access is unavailable in this browser. Use Save as instead.');await navigator.clipboard.write([new ClipboardItem({'image/png':pngBlob(photo)})]);}
    toast('Photo copied');
  }
  async function savePhoto(photo){
    if(window.photoFiles){const result=await window.photoFiles.save(photo.name,new Uint8Array(await photo.blob.arrayBuffer()));if(result?.error)throw new Error(result.error);if(!result)return;}
    else{download(photo.blob,photo.name);toast('Photo download started');return;}
    toast('Photo saved to file');
  }
  function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  const moveDialog=document.createElement('dialog');moveDialog.className='gallery-dialog';moveDialog.setAttribute('aria-label','Move photo');
  const moveHeading=document.createElement('h2');moveHeading.textContent='Move photo';const search=document.createElement('input');search.type='search';search.placeholder='Search galleries';search.setAttribute('aria-label','Search destination galleries');
  const destinations=document.createElement('div');destinations.className='gallery-destinations';const moveClose=makeButton('Cancel','Cancel photo move',()=>moveDialog.close());moveDialog.append(moveHeading,search,destinations,moveClose);document.body.append(moveDialog);let moving=null;
  function listDestinations(){destinations.replaceChildren();const options=folders.filter(f=>f.kind==='gallery'&&f.id!==moving?.galleryId&&Folders.path(folders,f.id).toLowerCase().includes(search.value.toLowerCase()));for(const f of options){const b=makeButton(Folders.path(folders,f.id),`Move to ${Folders.path(folders,f.id)}`,async()=>{b.disabled=true;try{if(!isGallery(f.id))throw new Error('Destination gallery no longer exists.');await PhotoStore.put([{...moving,galleryId:f.id}]);moveDialog.close();if(viewer.open)viewer.close();await draw();toast('Photo moved');}catch(error){friendly(error);b.disabled=false;}});destinations.append(b);}if(!options.length)destinations.textContent='No other matching galleries. Create another gallery in a folder first.';}
  function chooseMove(photo){moving=photo;search.value='';listDestinations();moveDialog.showModal();search.focus();}search.oninput=listDestinations;
  const deleteDialog=document.createElement('dialog');deleteDialog.className='gallery-dialog';deleteDialog.setAttribute('aria-label','Delete photo');const deleteText=document.createElement('p');const deleteActions=document.createElement('div');deleteActions.className='dialog-buttons';let deleting=null;
  const deleteConfirm=makeButton('Delete','Confirm delete photo',async()=>{deleteConfirm.disabled=true;try{await PhotoStore.remove(deleting.id);deleteDialog.close();if(viewer.open)viewer.close();await draw();toast('Photo deleted');}catch(error){friendly(error);}finally{deleteConfirm.disabled=false;}});
  deleteActions.append(makeButton('Cancel','Cancel photo deletion',()=>deleteDialog.close()),deleteConfirm);deleteDialog.append(deleteText,deleteActions);document.body.append(deleteDialog);
  function confirmDelete(photo){deleting=photo;deleteText.textContent=`Delete “${photo.name}” from this gallery? This removes the stored photo.`;deleteDialog.showModal();}
  window.Galleries={upload};
  // Include original photo bytes in normal and recovery backups.
  async function exportData(data,name){
    const ids=new Set((data.folders||[]).filter(f=>f.kind==='gallery').map(f=>f.id));
    const photos=ids.size?(await PhotoStore.all()).filter(p=>ids.has(p.galleryId)):[];
    const encoded=[];for(const p of photos)encoded.push({id:p.id,galleryId:p.galleryId,name:p.name,type:p.type,created:p.created,source:await readImage(p.blob)});
    download(new Blob([JSON.stringify({...data,photos:encoded},null,2)],{type:'application/json'}),name);
  }
  $('export').onclick=async()=>{try{if(storageFailed){download(new Blob([localStorage.getItem(KEY)||''],{type:'application/json'}),'quiet-notes-recovery.json');return;}const data={version:5,folders,notes};await exportData(data,`quiet-notes-${new Date().toISOString().slice(0,10)}.json`);}catch(error){friendly(error);}};
  deleteBackup.onclick=async()=>{try{const raw=localStorage.getItem('quiet-notes-before-folder-delete');if(raw)await exportData(JSON.parse(raw),'quiet-notes-before-folders-deleted.json');}catch(error){friendly(error);}};
  const originalDelete=deleteFolder;deleteFolder=function(id){const galleryIds=folders.filter(f=>f.kind==='gallery').map(f=>f.id);originalDelete(id);if(galleryIds.some(id=>!isGallery(id)))toast('Folder deleted. Its photos are available in More → Export last folder deletion backup.');};
  const progress=document.createElement('dialog');progress.className='gallery-dialog';progress.setAttribute('aria-label','Importing backup');progress.textContent='Importing backup…';progress.oncancel=event=>event.preventDefault();document.body.append(progress);
  $('import-file').onchange=async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try{
      if(storageFailed||busy)throw new Error('Finish the current save or recover stored data before importing.');
      if(file.size>200_000_000)throw new Error('Choose a backup smaller than 200 MB.');
      progress.showModal();
      const parsed=JSON.parse(await file.text()),data=Array.isArray(parsed)?{notes:parsed}:parsed;
      const incoming=Folders.load(data,NotesStore.validate(data.notes));
      if(data.photos!==undefined&&(!Array.isArray(data.photos)||data.photos.length>10000))throw new Error('Invalid photo backup.');
      const prepared=[],seen=new Set();
      for(const photo of data.photos||[]){
        if(!photo||typeof photo.id!=='string'||!photo.id||seen.has(photo.id)||typeof photo.name!=='string'||photo.name.length>200||!supported(photo.type)||!Number.isFinite(photo.created)||!incoming.folders.some(f=>f.id===photo.galleryId&&f.kind==='gallery')||typeof photo.source!=='string'||photo.source.length>27_000_000||!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.source)||!photo.source.startsWith(`data:${photo.type};base64,`))throw new Error('Invalid photo in backup.');
        seen.add(photo.id);const bytes=Uint8Array.from(atob(photo.source.split(',')[1]),c=>c.charCodeAt(0));if(bytes.length>20_000_000)throw new Error('A backup photo exceeds 20 MB.');
        const blob=new Blob([bytes],{type:photo.type});prepared.push({id:photo.id,galleryId:photo.galleryId,name:photo.name,type:photo.type,created:photo.created,blob,thumbnail:await thumbnail(blob)});
      }
      const existing=new Map((prepared.length?await PhotoStore.all():[]).map(p=>[p.id,p]));
      const merged=Folders.merge({folders,notes},incoming),previous={folders,notes};
      const additions=prepared.filter(p=>existing.get(p.id)?.galleryId!==merged.folderMap.get(p.galleryId)).map(p=>({...p,id:existing.has(p.id)?crypto.randomUUID():p.id,galleryId:merged.folderMap.get(p.galleryId)}));
      folders=merged.folders;notes=merged.notes;
      if(!persist()){folders=previous.folders;notes=previous.notes;throw new Error('Could not save imported folders and notes.');}
      try{if(additions.length)await PhotoStore.put(additions);}catch(error){folders=previous.folders;notes=previous.notes;persist();throw error;}
      render();toast(`Imported ${merged.added} note${merged.added===1?'':'s'} and ${additions.length} photo${additions.length===1?'':'s'}. Existing items were kept.`);
    }catch(error){friendly(error);}finally{if(progress.open)progress.close();}
  };
  render();
})();
