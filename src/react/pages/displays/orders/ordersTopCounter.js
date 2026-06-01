/*
 * Regra de negocio: o contador do topo do display de pedidos precisa usar
 * o `totalItems` retornado pela API. Nao usar a contagem renderizada da lista,
 * porque ela pode representar apenas a pagina já carregada.
 */
export const resolveOrdersTopCounterValue = totalItems => {
  const parsed = Number(totalItems || 0)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}
