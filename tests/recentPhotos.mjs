import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
 const {generateMockData}=await server.ssrLoadModule('/src/mock/seed.ts');
 const {extendDemoPortfolio}=await server.ssrLoadModule('/src/mock/demoPortfolio.ts');
 const {selectRecentPhotos}=await server.ssrLoadModule('/src/lib/recentPhotos.ts');
 const {photoSrc}=await server.ssrLoadModule('/src/lib/utils.ts');
 const data=extendDemoPortfolio(generateMockData());
 const recent=selectRecentPhotos(data.photos,6);
 assert.equal(recent.length,6);assert.equal(new Set(recent.map(photoSrc)).size,6);
 for(const p of data.projects){const selected=selectRecentPhotos(data.photos.filter(x=>x.projectId===p.id),4);assert.equal(new Set(selected.map(photoSrc)).size,selected.length);}
 const captured=[{...data.photos[0],id:'real-a',dataUrl:'data:image/jpeg;base64,test'},{...data.photos[0],id:'real-b',mediaKey:'local-original'}];
 assert.equal(selectRecentPhotos(captured,4).length,2);
 for(const photo of recent){assert.ok(data.projects.some(p=>p.id===photo.projectId));assert.ok(photo.description&&photo.uploadedBy&&photo.stage);}
 console.log('Six distinct recent images, per-project uniqueness, metadata links and captured-photo preservation passed.');
} finally {await server.close();}
