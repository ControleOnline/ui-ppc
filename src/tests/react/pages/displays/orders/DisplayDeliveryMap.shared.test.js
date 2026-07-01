const {
  buildDisplayDeliveryMapConfig,
} = require('../../../../../react/pages/displays/orders/DisplayDeliveryMap.shared');

const {describe, expect, it} = global;

describe('DisplayDeliveryMap.shared', () => {
  it('builds a pure map config from delivery payload data', () => {
    const config = buildDisplayDeliveryMapConfig({
      provider: {
        address: {
          id: 'store-1',
          latitude: -15.59,
          longitude: -56.09,
          nickname: 'Loja Centro',
        },
      },
      deliveries: [
        {
          id: 'delivery-1',
          status: {
            status: 'way',
            color: '#0EA5E9',
          },
          address: {
            id: 'addr-1',
            latitude: -15.6,
            longitude: -56.1,
            nickname: 'Cliente 1',
          },
        },
      ],
    });

    expect(config.addresses.origin).toMatchObject({
      latitude: -15.59,
      longitude: -56.09,
    });
    expect(config.addresses.markers).toHaveLength(1);
    expect(config.addresses.markers[0]).toMatchObject({
      latitude: -15.6,
      longitude: -56.1,
      title: '#delivery-1',
    });
    expect(config.paths).toHaveLength(1);
    expect(config.paths[0]).toMatchObject({
      color: '#0EA5E9',
    });
  });
});
