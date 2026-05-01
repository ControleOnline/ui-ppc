const normalizeText = value => String(value || '').trim();

const pickFirstValue = (...values) => {
    const match = values.find(value => normalizeText(value));
    return match ?? '';
};

export const buildDisplayOrderHeaderPayload = (orderEntity = {}, queueItem = {}) => ({
    ...orderEntity,
    orderDate: pickFirstValue(
        orderEntity?.orderDate,
        orderEntity?.order_date,
        queueItem?.registerTime,
        queueItem?.updateTime,
    ),
    alterDate: pickFirstValue(
        orderEntity?.alterDate,
        orderEntity?.alter_date,
        queueItem?.updateTime,
        queueItem?.registerTime,
    ),
});

export default buildDisplayOrderHeaderPayload;
