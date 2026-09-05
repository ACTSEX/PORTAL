# Migração V1 → V2

Antes de importar: inventariar categorias reais, cidades, planos e formatos da V1; mapear sem renomear; deduplicar por cliente; classificar PII; validar consentimentos e maioridade. Executar exportação somente leitura, transformação local, validação por schema e amostragem. Nunca copiar nascimento/CPF ao público.

Ensaio deve comparar contagens e hashes, testar rollback e preservar IDs de mídia. Cutover e qualquer escrita R2 pertencem a rodada posterior com aprovação. Pendências atuais: categorias comprovadas, limites dos planos, política de retenção e estratégia final de rotas.
