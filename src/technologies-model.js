(function(root){
  function clean(value){if(typeof value!=='string')throw new Error('Technology names must be text.');const name=value.trim().replace(/\s+/g,' ');if(!name||name.length>120||/[\x00-\x1f]/.test(name))throw new Error('Use a technology name between 1 and 120 characters.');return name;}
  function key(name){return clean(name).toLowerCase();}
  function merge(...lists){const map=new Map();for(const list of lists){if(!Array.isArray(list))throw new Error('Invalid technology list.');for(const value of list){const name=clean(value);if(key(name)==='uncategorized')continue;if(!map.has(key(name)))map.set(key(name),name);}}return [...map.values()].sort((a,b)=>a.localeCompare(b));}
  function matches(note,filter){return filter==='*'||(filter===''?!(note.technologies||[]).length:(note.technologies||[]).some(t=>key(t)===key(filter)));}
  const api={clean,key,merge,matches};if(typeof module!=='undefined')module.exports=api;else root.Technologies=api;
})(typeof window!=='undefined'?window:globalThis);
