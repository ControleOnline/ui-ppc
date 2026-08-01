# ui-ppc

## Contratos
- Tipos canonicos de display: `production`, `conference` e `tracking`.
- A UI pode aceitar `products`, `orders` e `tv` como aliases de dados antigos, mas novos saves, rotas e parametros devem usar os nomes canonicos.
- `production` e o display que gerencia filas de producao; `conference` confere pedido; `tracking` acompanha pedidos prontos/entrega.
- A apresentacao operacional compacta de `conference` e `tracking` e configurada no proprio display: identificacao da fila, indicador de status, exibicao de `1x` e permissao global para nomes de grupos. Nome, identificacao curta e icone continuam pertencendo ao cadastro da fila.

## Qualidade de código

- A barra comum de modularizacao, testes, smoke tests e limite de tamanho de componentes vive em `https://github.com/ControleOnline/agents-mcp/blob/master/skills/shared/code-quality.md`.
