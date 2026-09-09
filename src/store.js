(function (root) {
  const COLORS = ['neutral', 'butter', 'sage', 'rose', 'lavender', 'sky', 'stone'];
  function validate(data) {
    if (!Array.isArray(data) || data.length > 10000) throw new Error('This is not a valid Quiet Notes backup.');
    const ids = new Set();
    return data.map(n => {
      if (!n || typeof n.id !== 'string' || ids.has(n.id) || typeof n.title !== 'string' || typeof n.body !== 'string' || !COLORS.includes(n.color) || !Number.isFinite(n.created) || !Number.isFinite(n.updated)) throw new Error('This backup contains invalid notes.');
      if(n.client !== undefined && (typeof n.client !== 'string' || n.client.trim().length>120 || /[\x00-\x1f]/.test(n.client))) throw new Error('Invalid note customer.');
      if(n.technologies!==undefined && (!Array.isArray(n.technologies)||n.technologies.length>100||n.technologies.some(t=>typeof t!=='string'||!t.trim()||t.trim().length>120||/[\x00-\x1f]/.test(t))))throw new Error('Invalid note technologies.');
      if(n.folderId!==undefined&&n.folderId!==null&&(typeof n.folderId!=='string'||!n.folderId))throw new Error('Invalid note folder.');
      const techs=n.technologies?[...new Map(n.technologies.filter(t=>t.trim().toLowerCase()!=='uncategorized').map(t=>{const name=t.trim().replace(/\s+/g,' ');return [name.toLowerCase(),name];})).values()]:undefined;
      ids.add(n.id);
      return {...(n.folderId!==undefined?{folderId:n.folderId}:{}), id:n.id, title:n.title.slice(0,200), body:n.body, color:n.color, created:n.created, updated:n.updated, pinned:!!n.pinned, deleted:!!n.deleted, ...(techs?{technologies:techs}:{}), ...(n.client && n.client.trim().toLowerCase() !== 'generic' ? {client:n.client.trim().replace(/\s+/g,' ')} : {}), ...(typeof n.html === 'string' ? {html:n.html} : {})};
    });
  }
  function select(notes, view, query, sort) {
    const q = query.toLowerCase();
    return notes.filter(n => (view === 'trash' ? n.deleted : !n.deleted && (view !== 'pinned' || n.pinned)) && (n.title + '\n' + n.body).toLowerCase().includes(q)).sort((a,b) => Number(b.pinned)-Number(a.pinned) || (sort === 'title' ? a.title.localeCompare(b.title) : b[sort]-a[sort]));
  }
  const api = { COLORS, validate, select };
  if (typeof module !== 'undefined') module.exports = api; else root.NotesStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
