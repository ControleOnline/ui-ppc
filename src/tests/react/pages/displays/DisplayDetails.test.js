const { jest } = require('@jest/globals')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const { describe, beforeEach, expect, it } = global

const mockStores = {}
let mockRouteParams = {}
const mockNavigation = {
  addListener: jest.fn(() => () => {}),
  replace: jest.fn(),
  setOptions: jest.fn(),
  setParams: jest.fn(),
}

jest.mock('react-native', () => {
  const React = require('react')
  const createComponent = name =>
    function MockComponent(props) {
      return React.createElement(name.toLowerCase(), null, props.children)
    }

  return {
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    StyleSheet: {
      create: styles => styles,
    },
    Text: createComponent('Text'),
    View: createComponent('View'),
  }
})

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockRouteParams }),
}))

jest.mock('@store', () => ({
  useStore: name => mockStores[name] || { actions: {}, getters: {} },
}))

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: jest.fn(),
  },
}))

jest.mock('@controleonline/ui-ppc/src/react/theme/displayTheme', () => ({
  useDisplayTheme: () => ({
    currentCompany: { id: 3 },
    ppcColors: {
      accentInfo: '#0EA5E9',
      appBg: '#FFFFFF',
      borderSoft: '#E2E8F0',
      cardBg: '#FFFFFF',
      textSecondary: '#475569',
      textPrimary: '#0F172A',
      panelBg: '#F8FAFC',
      border: '#CBD5E1',
    },
  }),
}))

jest.mock('@controleonline/ui-ppc/src/react/utils/forcedDisplay', () => ({
  buildForcedDisplayParams: jest.fn(() => null),
  doesDeviceConfigBelongToRuntime: jest.fn(() => false),
  doesDisplayBelongToCompany: jest.fn(() => true),
  normalizeEntityId: value => {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
      return Number(value.trim())
    }
    return null
  },
  resolveForcedDisplayId: jest.fn(() => null),
}))

jest.mock('../../../../react/pages/displays/orders', () => {
  const React = require('react')
  return function MockOrdersDisplay(props) {
    global.__renderedDisplay = 'orders'
    global.__renderedDisplayProps = props
    return React.createElement('orders-display')
  }
})

jest.mock('../../../../react/pages/displays/products', () => {
  const React = require('react')
  return function MockProductsDisplay(props) {
    global.__renderedDisplay = 'products'
    global.__renderedDisplayProps = props
    return React.createElement('products-display')
  }
})

jest.mock('../../../../react/pages/displays/tv', () => {
  const React = require('react')
  return function MockTvDisplay(props) {
    global.__renderedDisplay = 'tv'
    global.__renderedDisplayProps = props
    return React.createElement('tv-display')
  }
})

const DisplayDetails =
  require('../../../../react/pages/displays/DisplayDetails').default

describe('DisplayDetails routing', () => {
  beforeEach(() => {
    mockRouteParams = { id: 22 }
    global.__renderedDisplay = null
    global.__renderedDisplayProps = null
    mockNavigation.addListener.mockClear()
    mockNavigation.replace.mockClear()
    mockNavigation.setOptions.mockClear()
    mockNavigation.setParams.mockClear()

    mockStores.displays = {
      actions: { get: jest.fn() },
      getters: { item: undefined },
    }
    mockStores.device_config = {
      actions: {},
      getters: { item: undefined },
    }
    mockStores.device = {
      actions: {},
      getters: { item: undefined },
    }
  })

  it('opens the TV screen when displayType is tv', () => {
    mockRouteParams = { id: 22, displayType: 'tv' }

    ReactDOMServer.renderToStaticMarkup(React.createElement(DisplayDetails))

    expect(global.__renderedDisplay).toBe('tv')
    expect(global.__renderedDisplayProps).toMatchObject({
      display: undefined,
    })
  })

  it('keeps orders on the compact orders screen', () => {
    mockRouteParams = { id: 22, displayType: 'orders' }

    ReactDOMServer.renderToStaticMarkup(React.createElement(DisplayDetails))

    expect(global.__renderedDisplay).toBe('orders')
  })

  it('keeps products on the products monitor', () => {
    mockRouteParams = { id: 22, displayType: 'products' }

    ReactDOMServer.renderToStaticMarkup(React.createElement(DisplayDetails))

    expect(global.__renderedDisplay).toBe('products')
  })
})
