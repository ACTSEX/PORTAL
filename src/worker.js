import { route } from './router.js';
import { executarCron } from './cron.js';
export default { fetch(request, env, context) { void context; return route(request, env); }, scheduled(controller,env,context){context.waitUntil(executarCron(env,env.__cronController));void controller;} };
