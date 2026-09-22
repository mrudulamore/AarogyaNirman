import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const images=JSON.parse(readFileSync('src/mock/constructionImages.json','utf8'));
assert.equal(images.length,222);
assert.equal(new Set(images.map(x=>x.photoId)).size,222,'Each photo record must have an assignment');
assert.ok(new Set(images.map(x=>x.path)).size>100,'Reuse a varied library across projects');
assert.equal(new Set(images.map(x=>x.projectId)).size,24);
for(const image of images) {
 assert.equal(createHash('sha256').update(readFileSync('public'+image.path)).digest('hex'),image.sha256);
 assert.ok(image.author && image.license && image.sourceUrl.startsWith('https://commons.wikimedia.org/'));
}
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
 const {generateMockData}=await server.ssrLoadModule('/src/mock/seed.ts');
 const {extendDemoPortfolio}=await server.ssrLoadModule('/src/mock/demoPortfolio.ts');
 const {photoSrc}=await server.ssrLoadModule('/src/lib/utils.ts');
 const data=extendDemoPortfolio(generateMockData());
 for(const photo of data.photos) {
  const image=images.find(x=>x.photoId===photo.id);
  assert.ok(image,photo.id);
  assert.equal(image.stage,photo.stage);
  assert.equal(image.projectId,photo.projectId);
  assert.equal(photoSrc(photo),image.path);
  assert.equal(photoSrc({...photo,dataUrl:'data:image/jpeg;base64,captured'}),'data:image/jpeg;base64,captured');
 }
 console.log('222 photo assignments cover all 24 projects; reused images exist, hashes match, and captured photos remain unchanged.');
} finally {await server.close();}
