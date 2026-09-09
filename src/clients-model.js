(function(root){
  function clean(value){if(typeof value!=='string')throw new Error('Customer names must be text.');const name=value.trim().replace(/\s+/g,' ');if(!name||name.length>120||/[\x00-\x1f]/.test(name))throw new Error('Use a customer name between 1 and 120 characters.');return name;}
  function key(name){return clean(name).toLowerCase();}
  function merge(...lists){const map=new Map();for(const list of lists){if(!Array.isArray(list))throw new Error('Invalid customer list.');for(const value of list){const name=clean(value);if(key(name)==='generic')continue;if(!map.has(key(name)))map.set(key(name),name);}}return [...map.values()].sort((a,b)=>a.localeCompare(b));}
  function label(note){return note.client||'Generic';}
  function matches(note,filter){return filter==='*'||(filter===''?!note.client:!!note.client&&key(note.client)===key(filter));}
  const api={clean,key,merge,label,matches};if(typeof module!=='undefined')module.exports=api;else root.Clients=api;
})(typeof window!=='undefined'?window:globalThis);
