export const CACHE={immutable:'public, max-age=31536000, immutable',pointer:'public, max-age=60, must-revalidate',private:'no-store'};
export function cacheControlFor(path,{privateData=false}={}){if(privateData||path.startsWith('/api/'))return CACHE.private;if(/(?:manifesto|versao)\.json$/.test(path))return CACHE.pointer;return CACHE.immutable;}
