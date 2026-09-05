export class CepService {
  async consultar() { return null; }
}
export class HttpCepService extends CepService {
  constructor({ endpoint, fetcher = fetch }) { super(); this.endpoint = endpoint; this.fetcher = fetcher; }
  async consultar(cep) { const normalized = String(cep).replace(/\D/g, ''); if (!/^\d{8}$/.test(normalized)) return null; try { const response = await this.fetcher(this.endpoint.replace('{cep}', normalized), { headers: { accept: 'application/json' } }); if (!response.ok) return null; return await response.json(); } catch { return null; } }
}
export class NullCepService extends CepService {}
