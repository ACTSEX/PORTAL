# Localização do visitante

Prioridade: cidade válida da URL, preferência anterior e só então oferta opcional de localização. `navigator.geolocation` é chamado apenas depois de ação do usuário. Negativa resulta em seleção manual normal.

A comparação ocorre localmente somente contra cidades ativas presentes em `coordenadas-operacionais.json`. Latitude/longitude do visitante não são persistidas nem enviadas. O navegador guarda apenas o slug escolhido. Não há geocodificador, localização por IP ou chamada obrigatória ao Worker.

O IBGE Localidades não fornece centros municipais. O contrato de coordenadas exige fonte URL e data verificável; enquanto o arquivo estiver vazio, “Usar minha localização” fica oculto. Uma fonte futura deverá ser documentada e auditada antes da habilitação. Nenhuma coordenada de Londrina foi inventada.
