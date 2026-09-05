import { route } from './router.js';
export default { fetch(request, env, context) { void context; return route(request, env); } };
