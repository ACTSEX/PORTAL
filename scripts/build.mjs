import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/worker', { recursive: true });
await cp('src', 'dist/worker/src', { recursive: true });
await cp('package.json', 'dist/worker/package.json');
await cp('frontend/painel', 'dist/painel', { recursive: true });
await cp('frontend/publico', 'dist/publico', { recursive: true });
console.log('Build concluído: dist/worker, dist/painel, dist/publico');
