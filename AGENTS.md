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
- A tela de displays de pedidos deve reaproveitar a mesma listagem de produtos usada em `ui-orders` para `OrderDetails` e `POS`. O card do pedido pode mudar, mas a leitura interna dos itens precisa ser a mesma.
- Quando `ui-ppc` abrir popup/modal com detalhes de pedido, o topo deve reaproveitar o mesmo cabecalho canonico de `ui-orders` (`OrderHeader` e barra superior correspondente). A impressao do pedido ou do item entra na mesma barra padronizada de acoes, nunca em faixa paralela isolada.
- Cards de pedido em displays/KDS tambem devem usar o mesmo `OrderHeader` canonico de `ui-orders`. Nao remontar numero do pedido, cliente, datas ou status com JSX local so para essas colunas operacionais.
- Displays e KDS devem aceitar o mesmo agrupamento de itens customizaveis usado em `ui-orders`, baseado nos vinculos `orderProduct`, `parentProduct` e `productGroup`. Nao manter regra paralela de encaixe de adicionais so para a operacao.
- Cada item mostrado no display deve deixar claro o que precisa ser preparado e, quando existir fila, deve exibir a cor e o status da fila atual do item.
- Em telas de preparo por produto, quantidades agrupadas precisam ser expandidas em linhas unitarias para leitura operacional. Exemplo: `3x misto quente` deve virar tres linhas `1x misto quente`.
- Em pedidos integrados, o destaque visual do pedido na operacao deve priorizar o numero operacional curto da integracao que chega em `extraData` ou no payload canonico, como `order_index`, `code` ou `displayId`. `pickup_code` e `handover_code` entram apenas como fallback quando esse numero principal nao existir.
- Em displays por produto, a transicao `status_in -> status_working` deve disparar a impressao automatica no front quando o `DISPLAY` runtime estiver com `display-auto-print-product` ativo e com impressora resolvida.
