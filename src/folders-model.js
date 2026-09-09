(function(root){
  const Todo=typeof module!=='undefined'?require('./todo-model.js'):root.TodoModel;
  const Gantt=typeof module!=='undefined'?require('./gantt-model.js'):root.GanttModel;
  const ROOTS=[{id:'customers',name:'Customers',parent:null},{id:'technologies',name:'Technologies',parent:null},{id:'generic',name:'Generic',parent:null}];
  const clean=value=>{if(typeof value!=='string')throw new Error('Enter a folder name.');const name=value.trim().replace(/\s+/g,' ');if(!name||name.length>120||/[\x00-\x1f/\\]/.test(name))throw new Error('Use 1–120 characters, without slashes.');return name;};
  const key=name=>name.toLowerCase();
  function validate(data){
    if(!Array.isArray(data)||data.length>10000)throw new Error('Invalid folder list.');
    const ids=new Set(),siblings=new Set();
    const folders=data.map(f=>{if(!f||typeof f.id!=='string'||!f.id||ids.has(f.id)||(f.parent!==null&&typeof f.parent!=='string'))throw new Error('Invalid folder.');const name=clean(f.name),pair=JSON.stringify([f.parent,key(name)]);if(siblings.has(pair))throw new Error('Duplicate folder name.');ids.add(f.id);siblings.add(pair);if(f.kind!==undefined&&!['gallery','gantt','todo'].includes(f.kind))throw new Error('Invalid folder type.');if(f.id==='generic'&&f.kind)throw new Error('Generic must remain a regular folder.');return {id:f.id,name,parent:f.parent,...(f.kind?{kind:f.kind}:{}),...(f.kind==='gantt'?{tasks:Gantt.validate(f.tasks||[])}:{}),...(f.kind==='todo'?{items:Todo.validate(f.items??[])}:{})};});
    for(const root of ROOTS.filter(f=>f.id==='generic'))if(!folders.some(f=>f.id===root.id&&f.parent===null))throw new Error('Missing folder tree.');
    const map=new Map(folders.map(f=>[f.id,f]));
    for(const f of folders){const seen=new Set([f.id]);let parent=f.parent;while(parent!==null){if(!map.has(parent)||seen.has(parent))throw new Error('Invalid folder hierarchy.');if(map.get(parent).kind)throw new Error('Choose a regular folder as the parent.');seen.add(parent);parent=map.get(parent).parent;}}
    return folders;
  }
  function path(folders,id){const map=new Map(folders.map(f=>[f.id,f])),parts=[];let f=map.get(id);while(f){parts.unshift(f.name);f=map.get(f.parent);}return parts.join(' / ');}
  function children(folders,parent){return folders.filter(f=>f.parent===parent).sort((a,b)=>a.name.localeCompare(b.name));}
  function create(folders,parent,value,id,kind){if(parent!==null&&!folders.some(f=>f.id===parent))throw new Error('Choose a parent folder.');const name=clean(value);if(folders.some(f=>f.parent===parent&&key(f.name)===key(name)))throw new Error('A folder with that name already exists here.');return validate([...folders,{id,name,parent,...(kind?{kind}:{})}]);}
  function load(data,notes){
    if(data.version>=4){const folders=validate(data.folders);const ids=new Set(folders.filter(f=>!f.kind).map(f=>f.id));if(notes.some(n=>!ids.has(n.folderId)))throw new Error('A note has an invalid folder.');return {folders,notes};}
    const folders=ROOTS.map(f=>({...f}));
    // Legacy names can contain slashes. Keep them as literal folder names using a safe display separator.
    function legacy(parent,value){const name=clean(value.replace(/[/\\]/g,'›'));let f=folders.find(f=>f.parent===parent&&key(f.name)===key(name));if(!f){f={id:'legacy:'+parent+':'+encodeURIComponent(key(name)),name,parent};folders.push(f);}return f.id;}
    for(const c of data.clients||[])if(c.trim().toLowerCase()!=='generic')legacy('customers',c);
    for(const t of data.technologies||[])if(t.trim().toLowerCase()!=='uncategorized')legacy('technologies',t);
    const moved=notes.map(n=>{const customer=n.client?legacy('customers',n.client):null;const techs=(n.technologies||[]).map(t=>legacy('technologies',t));return {...n,folderId:customer||techs[0]||'generic'};});
    return {folders:validate(folders),notes:moved};
  }
  function merge(current,incoming){
    let folders=validate(current.folders).map(f=>({...f}));const mapped=new Map([[null,null],['generic','generic']]);
    const pending=validate(incoming.folders).filter(f=>f.id!=='generic');
    while(pending.length){const at=pending.findIndex(f=>mapped.has(f.parent));const f=pending.splice(at,1)[0],parent=mapped.get(f.parent);let match=folders.find(x=>x.parent===parent&&key(x.name)===key(f.name));if(match&&match.kind!==f.kind)throw new Error('Different folder types have the same backup path. Rename one before importing.');if(!match){let id=f.id;while(folders.some(x=>x.id===id))id+=':import';match={id,name:f.name,parent,...(f.kind?{kind:f.kind}:{}),...(f.kind==='gantt'?{tasks:f.tasks}:{}),...(f.kind==='todo'?{items:f.items}:{})};folders.push(match);}else if(f.kind==='gantt'){const taskIds=new Set(match.tasks.map(t=>t.id));match.tasks=Gantt.schedule([...match.tasks,...f.tasks.filter(t=>!taskIds.has(t.id))]);}else if(f.kind==='todo'){match.items=Todo.merge(match.items,f.items);}mapped.set(f.id,match.id);}
    const ids=new Set(current.notes.map(n=>n.id));const additions=incoming.notes.filter(n=>!ids.has(n.id)).map(n=>({...n,folderId:mapped.get(n.folderId)}));
    return {folders,notes:[...current.notes,...additions],added:additions.length,folderMap:mapped};
  }
  function remove(folders,notes,id){
    if(id==='generic')throw new Error('Generic is kept as the recovery folder.');
    if(!folders.some(f=>f.id===id))throw new Error('Folder not found.');
    const removed=new Set([id]);let count;
    do{count=removed.size;for(const f of folders)if(removed.has(f.parent))removed.add(f.id);}while(count!==removed.size);
    return {folders:validate(folders.filter(f=>!removed.has(f.id))),notes:notes.map(n=>removed.has(n.folderId)?{...n,folderId:'generic',deleted:true}:n),removed};
  }
  function move(folders,id,parent){
    const folder=folders.find(f=>f.id===id);
    if(!folder)throw new Error('Folder not found.');
    if(id==='generic')throw new Error('The recovery folder stays at the root.');
    if(parent!==null&&!folders.some(f=>f.id===parent))throw new Error('Destination folder not found.');
    let ancestor=parent;
    while(ancestor!==null){if(ancestor===id)throw new Error('A folder cannot be moved into itself or its subfolders.');ancestor=folders.find(f=>f.id===ancestor).parent;}
    if(folders.some(f=>f.id!==id&&f.parent===parent&&key(f.name)===key(folder.name)))throw new Error('A folder with that name already exists there.');
    return validate(folders.map(f=>f.id===id?{...f,parent}:f));
  }
  const api={move,remove,ROOTS,clean,validate,path,children,create,load,merge};if(typeof module!=='undefined')module.exports=api;else root.Folders=api;
})(typeof window!=='undefined'?window:globalThis);
