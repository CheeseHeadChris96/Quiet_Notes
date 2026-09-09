const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const text=s=>({nodeType:3,textContent:s});
function element(tag,...children){const node={nodeType:1,tagName:tag,childNodes:children};for(const child of children)child.parentNode=node;return node;}
function count(body){const source=fs.readFileSync(require.resolve('../src/line-numbers.js'),'utf8');const ctx={bodyField:body,Node:{TEXT_NODE:3,ELEMENT_NODE:1}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function logicalLineStarts'),source.indexOf('function drawLineNumbers')),ctx);return ctx.logicalLineStarts().length;}
test('line numbers include empty lines and do not count wrapping or inline formatting',()=>{assert.equal(count(element('DIV')),1);assert.equal(count(element('DIV',text('a\n\nb\n'))),4);assert.equal(count(element('DIV',text('long '.repeat(100)))),1);assert.equal(count(element('DIV',text('hello '),element('B',text('bold')),text(' world'))),1);});
test('paragraphs and list items each receive a line number',()=>{assert.equal(count(element('DIV',element('DIV',text('first')),element('DIV',element('BR')),element('DIV',text('third')))),3);assert.equal(count(element('DIV',element('UL',element('LI',text('one')),element('LI',text('two'))))),2);assert.equal(count(element('DIV',text('a'),element('BR'),text('b'))),2);});

test('the browser filler break left by Backspace represents one empty line',()=>{
 assert.equal(count(element('DIV',element('BR'))),1);
 assert.equal(count(element('DIV',text(''),element('BR'),text(''))),1);
 assert.equal(count(element('DIV',element('B',element('BR')))),1);
 assert.equal(count(element('DIV',element('DIV',element('BR')))),1);
});
test('terminal filler breaks do not add a phantom line but real blank lines are retained',()=>{
 assert.equal(count(element('DIV',text('a'),element('BR'))),1);
 assert.equal(count(element('DIV',text('a'),element('BR'),element('BR'))),2);
 assert.equal(count(element('DIV',element('BR'),element('BR'))),2);
 assert.equal(count(element('DIV',element('BR'),element('BR'),element('BR'))),3);
 assert.equal(count(element('DIV',element('DIV',element('BR')),element('DIV',element('BR')))),2);
 assert.equal(count(element('DIV',text('a'),element('B',element('BR')),text('b'))),2);
});
