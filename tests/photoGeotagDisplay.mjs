import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
try {
 const { GeoPhoto } = await server.ssrLoadModule('/src/components/common/GeoPhoto.tsx');
 const { DemoPhotoDetails } = await server.ssrLoadModule('/src/components/common/DemoPhotoDetails.tsx');
 const { generateMockData } = await server.ssrLoadModule('/src/mock/seed.ts');
 const { extendDemoPortfolio } = await server.ssrLoadModule('/src/mock/demoPortfolio.ts');
 const { photoSrc } = await server.ssrLoadModule('/src/lib/utils.ts');
 const data = extendDemoPortfolio(generateMockData());
 for (const photo of data.photos) {
  const html = renderToStaticMarkup(createElement(GeoPhoto, {...photo,src:photoSrc(photo),timestamp:photo.capturedAt}));
  assert.ok(html.includes(`Lat ${photo.lat.toFixed(6)}, Long ${photo.lng.toFixed(6)}`),photo.id);
  assert.ok(!html.includes('Demo geotag'),photo.id);
  assert.ok(!html.includes('bg-black'),photo.id);
  assert.ok(html.includes('bg-slate-950/70'),photo.id);
  assert.ok(html.includes('tile.openstreetmap.org'),photo.id);
  assert.ok(html.includes('OpenStreetMap contributors'),photo.id);
  assert.ok(html.includes('text-white'),photo.id);
  assert.ok(!html.includes('Invalid Date'),photo.id);
  const project = data.projects.find(p => p.id === photo.projectId);
  const details = renderToStaticMarkup(createElement(DemoPhotoDetails,{photo,project}));
  assert.ok(details.includes('Distance from site'));
  assert.ok(details.includes('Geo-Fence'));
  assert.ok(!details.includes('not verified'));
  assert.ok(!details.includes('Demo geotag'));
 }
 const photo = data.photos[0];
 const html = renderToStaticMarkup(createElement(GeoPhoto, {...photo, src:'data:image/jpeg;base64,test',mediaKey:'capture',locationSource:'CAPTURED',timestamp:photo.capturedAt}));
 assert.ok(!html.includes('Demo geotag'));
 assert.ok(html.includes('Device GPS'));
 console.log(`PASS geotags and full demo details on all ${data.photos.length} photos; actual capture remains device GPS.`);
} finally {await server.close();}
