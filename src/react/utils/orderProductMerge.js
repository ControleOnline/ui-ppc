/**
 * Pure helpers for OrderProduct identity-preserving merge (ui-ppc#4).
 * Extracted for unit testing and reuse.
 */

const getHydraCollection = value => {
  if (Array.isArray(value)) {
    return value
  }

  if (Array.isArray(value?.member)) {
    return value.member
  }

  if (Array.isArray(value?.['hydra:member'])) {
    return value['hydra:member']
  }

  return null
}

const normalizeEntityId = value => {
  if (!value) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (/^\d+$/.test(trimmedValue)) {
      return Number(trimmedValue)
    }

    const iriMatch = trimmedValue.match(/\/(\d+)(?:\/)?$/)
    if (iriMatch?.[1]) {
      return Number(iriMatch[1])
    }

    return null
  }

  if (typeof value?.id === 'number') {
    return value.id
  }

  if (typeof value?.id === 'string') {
    return normalizeEntityId(value.id)
  }

  if (value?.['@id']) {
    return normalizeEntityId(value['@id'])
  }

  return null
}

const mergeNestedEntity = (baseEntity, nextEntity) => {
  if (!baseEntity || typeof baseEntity !== 'object') {
    return nextEntity
  }

  if (!nextEntity || typeof nextEntity !== 'object') {
    return baseEntity
  }

  return {
    ...baseEntity,
    ...nextEntity,
  }
}

const resolveCollectionValue = (...candidates) => {
  for (const candidate of candidates) {
    const collectionItems = getHydraCollection(candidate)
    if (collectionItems) {
      return collectionItems
    }
  }

  return null
}

/**
 * Merge a base OrderProduct with a detailed payload without losing persisted identity.
 * id and @id from the base node always win over the detail (ui-ppc#4 acceptance).
 */
const mergeOrderProduct = (baseOrderProduct, detailedOrderProduct) => {
  if (!detailedOrderProduct || typeof detailedOrderProduct !== 'object') {
    return baseOrderProduct
  }

  // Preserve persisted OrderProduct identity (ui-ppc#4). Never lose id/@id from the base node.
  const mergedOrderProduct = {
    ...baseOrderProduct,
    ...detailedOrderProduct,
    id: baseOrderProduct?.id ?? detailedOrderProduct?.id,
    '@id': baseOrderProduct?.['@id'] ?? detailedOrderProduct?.['@id'],
    order: mergeNestedEntity(baseOrderProduct?.order, detailedOrderProduct?.order),
    product: mergeNestedEntity(baseOrderProduct?.product, detailedOrderProduct?.product),
    category: mergeNestedEntity(baseOrderProduct?.category, detailedOrderProduct?.category),
    productGroup: mergeNestedEntity(
      baseOrderProduct?.productGroup,
      detailedOrderProduct?.productGroup,
    ),
    productCategory: mergeNestedEntity(
      baseOrderProduct?.productCategory,
      detailedOrderProduct?.productCategory,
    ),
  }

  const orderProductComponents = resolveCollectionValue(
    detailedOrderProduct?.orderProductComponents,
    detailedOrderProduct?.order_product_components,
    baseOrderProduct?.orderProductComponents,
    baseOrderProduct?.order_product_components,
  )
  if (orderProductComponents) {
    mergedOrderProduct.orderProductComponents = orderProductComponents
    mergedOrderProduct.order_product_components = orderProductComponents
  }

  const orderProductQueues = resolveCollectionValue(
    detailedOrderProduct?.orderProductQueues,
    detailedOrderProduct?.order_product_queues,
    baseOrderProduct?.orderProductQueues,
    baseOrderProduct?.order_product_queues,
  )
  if (orderProductQueues) {
    mergedOrderProduct.orderProductQueues = orderProductQueues
    mergedOrderProduct.order_product_queues = orderProductQueues
  }

  const productFiles = resolveCollectionValue(
    detailedOrderProduct?.product?.productFiles,
    detailedOrderProduct?.product?.product_files,
    detailedOrderProduct?.product?.files,
    baseOrderProduct?.product?.productFiles,
    baseOrderProduct?.product?.product_files,
    baseOrderProduct?.product?.files,
  )
  if (productFiles) {
    mergedOrderProduct.product = {
      ...(mergedOrderProduct.product || {}),
      productFiles,
      product_files: productFiles,
      files: productFiles,
    }
  }

  return mergedOrderProduct
}

/**
 * Acceptance (ui-ppc#4): never render a knowingly incomplete tree.
 * When details are required and still loading without detailed metadata, show loading only.
 */
const shouldWaitForCompletePayload = (
  shouldFetchDetails,
  isLoadingDetails,
  hasDetailedMetadata,
) =>
  Boolean(shouldFetchDetails) &&
  Boolean(isLoadingDetails) &&
  !hasDetailedMetadata

module.exports = {
  getHydraCollection,
  normalizeEntityId,
  mergeNestedEntity,
  resolveCollectionValue,
  mergeOrderProduct,
  shouldWaitForCompletePayload,
}
