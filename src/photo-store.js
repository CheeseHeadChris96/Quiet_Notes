// Original photos use IndexedDB blobs, separate from the small localStorage note envelope.
const PhotoStore=(()=>{
  let database;
  function open(){
    if(!database)database=new Promise((resolve,reject)=>{
      const request=indexedDB.open('quiet-photos-v1',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('photos',{keyPath:'id'});
      request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();database=null;};resolve(request.result);};
      request.onerror=()=>{database=null;reject(new Error('Photo storage is unavailable.'));};
    });return database;
  }
  async function transaction(mode,work){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('photos',mode);let result;try{result=work(tx.objectStore('photos'));}catch(error){tx.abort();reject(error);return;}tx.oncomplete=()=>resolve(result?.result);tx.onabort=tx.onerror=()=>reject(new Error('Photos could not be saved. Device storage may be full or unavailable.'));});}
  return {all:()=>transaction('readonly',store=>store.getAll()),put:items=>transaction('readwrite',store=>{for(const item of items)store.put(item);}),remove:id=>transaction('readwrite',store=>store.delete(id))};
})();
