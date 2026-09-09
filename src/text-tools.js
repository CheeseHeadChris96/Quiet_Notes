(function(root) {
  function matches(body, query) {
    if (!query) return [];
    const found=[]; let at=0;
    while ((at=body.indexOf(query,at))!==-1) { found.push(at); at+=query.length; }
    return found;
  }
  function replaceAll(body,query,replacement) { return query ? body.split(query).join(replacement) : body; }
  function filename(title) {
    const clean=(title || 'Untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').trim().slice(0,150) || 'Untitled';
    return /\.(txt|md|markdown)$/i.test(clean) ? clean : `${clean}.txt`;
  }
  class History {
    constructor(value) { this.values=[value];this.index=0; }
    push(value) {
      if (JSON.stringify(value)===JSON.stringify(this.values[this.index])) return;
      this.values.splice(this.index+1);this.values.push(value);
      if(this.values.length>100)this.values.shift();this.index=this.values.length-1;
    }
    undo(){if(this.index>0)this.index--;return this.values[this.index];}
    redo(){if(this.index<this.values.length-1)this.index++;return this.values[this.index];}
  }
  const api={matches,replaceAll,filename,History};
  if(typeof module!=='undefined')module.exports=api;else root.TextTools=api;
})(typeof window!=='undefined'?window:globalThis);
