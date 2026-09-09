(function(root){
  const MAX_SOURCE_BYTES=20_000_000,MAX_EMBEDDED_LENGTH=1_400_000;
  function safeSource(src){return typeof src==='string'&&src.length<=MAX_EMBEDDED_LENGTH&&/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(src);}
  function safeWidth(value){const text=String(value??'');return /^[1-9]\d{0,3}$/.test(text)&&Number(text)<=4096?Number(text):null;}
  function resizedWidth(width,height,dx,dy,corner,maxWidth){
    const x=corner.includes('w')?-dx:dx,y=corner.includes('n')?-dy:dy;
    const delta=(x*width+y*height)/(width*width+height*height);
    return Math.round(Math.max(Math.min(32,maxWidth),Math.min(maxWidth,width*(1+delta))));
  }
  const api={safeWidth,resizedWidth,safeSource,MAX_SOURCE_BYTES,MAX_EMBEDDED_LENGTH};if(typeof module!=='undefined')module.exports=api;else root.ImageSupport=api;
})(typeof window!=='undefined'?window:globalThis);
