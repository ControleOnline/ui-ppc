## Escopo
- Modulo de PPC/KDS e operacao de producao.
- Cobre displays, filas, blocos de fila, ordem de preparo e telas de exibicao operacional.

## Estado
- Este modulo tem implementacao ativa em `src/react` e deve constar em novos prompts.
- Se existir `src/vue`, ela e apenas legado e deve ser ignorada, salvo pedido explicito.

## Quando usar
- Prompts sobre PPC, KDS, displays, filas de producao, queue, ordem de preparo e telas de exibicao.

## Regras
- A tela de displays de pedidos deve renderizar apenas pedidos operacionais de venda (`orderType = sale`). Pedidos `cart` pertencem ao fluxo de rascunho/carrinho e nao devem aparecer no display.
