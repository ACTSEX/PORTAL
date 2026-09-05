const CLIENT_ID = /^[A-Za-z0-9_-]+$/;

export function assertClienteId(clienteId) {
  if (!CLIENT_ID.test(String(clienteId))) throw new TypeError('CLIENTE_ID_INVALID');
  return String(clienteId);
}

export const privatePaths = Object.freeze({
  root: (id) => `clientes/${assertClienteId(id)}`,
  dados: (id, file) => `clientes/${assertClienteId(id)}/dados-privados/${file}`,
  documento: (id, file) => `clientes/${assertClienteId(id)}/documentos/${file}`,
  rascunho: (id, file) => `clientes/${assertClienteId(id)}/rascunho-publico/${file}`,
  midia: (id, tipo, file) => `clientes/${assertClienteId(id)}/midias/${tipo}/${file}`,
  upload: (id, uploadId, file) => `clientes/${assertClienteId(id)}/midias/uploads-temporarios/${uploadId}/${file}`,
  auditoria: (id, file) => `clientes/${assertClienteId(id)}/auditoria/${file}`
});

export const publicPaths = Object.freeze({
  dados: (id, file) => `clientes/${assertClienteId(id)}/dados/${file}`,
  site: (id, file) => `clientes/${assertClienteId(id)}/site/${file}`,
  midia: (id, tipo, file) => `clientes/${assertClienteId(id)}/midias/${tipo}/${file}`
});

export function assertClientMediaKey(key, clienteId) {
  const expected = `clientes/${assertClienteId(clienteId)}/midias/`;
  if (!String(key).startsWith(expected)) throw new TypeError(`MEDIA_KEY_OUTSIDE_CLIENT: ${key}`);
  return key;
}
