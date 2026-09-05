import { ASAAS_STATE } from '../config.js';
export function obterEstadoAsaas() { return ASAAS_STATE; }
export function executarOperacaoAsaas() { throw new Error('Asaas desativado; transporte externo ausente'); }
