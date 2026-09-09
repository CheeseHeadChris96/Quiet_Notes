const {test}=require('node:test');const assert=require('node:assert/strict');const {validate,select}=require('../src/store.js');
const a={id:'a',title:'Groceries',body:'Apples',color:'sage',created:1,updated:2,pinned:false,deleted:false};
test('backups reject invalid data and duplicate identifiers',()=>{assert.throws(()=>validate({}));assert.throws(()=>validate([a,a]));assert.throws(()=>validate([{...a,color:'invalid'}]));assert.deepEqual(validate([a]),[a]);});
test('trash is excluded from active searches and recoverable separately',()=>{const deleted={...a,id:'b',deleted:true};assert.deepEqual(select([a,deleted],'all','apples','updated'),[a]);assert.deepEqual(select([a,deleted],'trash','','updated'),[deleted]);});
test('pinning takes precedence over recency and search is case insensitive',()=>{const pin={...a,id:'b',pinned:true,updated:1};assert.deepEqual(select([a,pin],'all','APPLES','updated'),[pin,a]);assert.deepEqual(select([a,pin],'pinned','','updated'),[pin]);});
test('backups preserve optional formatting and older plain notes',()=>{const rich={...a,html:'<b>Apples</b>'};assert.equal(validate([rich])[0].html,rich.html);assert.equal(validate([a])[0].html,undefined);});
