export function bindingsDisponiveis(env) { return Boolean(env?.acts_private && env?.acts_public); }
export function escritaR2Indisponivel() { throw new Error('Escrita R2 não implementada na Rodada 1'); }
