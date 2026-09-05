import { route } from './router.js';
export default { fetch(request, env, context) { void env; void context; return route(request); } };
