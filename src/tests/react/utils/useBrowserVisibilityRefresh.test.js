const React = require('react')
const renderer = require('react-test-renderer')
const { jest } = require('@jest/globals')

global.IS_REACT_ACT_ENVIRONMENT = true

const useBrowserVisibilityRefresh = require('../../../react/utils/useBrowserVisibilityRefresh').default

const Probe = ({ enabled = true, refresh }) => {
  useBrowserVisibilityRefresh(refresh, enabled)
  return null
}

describe('useBrowserVisibilityRefresh', () => {
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window

  afterEach(() => {
    globalThis.document = originalDocument
    globalThis.window = originalWindow
  })

  it('refreshes operational data when the browser tab becomes active', () => {
    const documentListeners = {}
    const windowListeners = {}
    const refresh = jest.fn()

    globalThis.document = {
      visibilityState: 'visible',
      addEventListener: jest.fn((event, listener) => { documentListeners[event] = listener }),
      removeEventListener: jest.fn(),
    }
    globalThis.window = {
      addEventListener: jest.fn((event, listener) => { windowListeners[event] = listener }),
      removeEventListener: jest.fn(),
    }

    let tree
    renderer.act(() => {
      tree = renderer.create(React.createElement(Probe, { refresh }))
    })

    renderer.act(() => windowListeners.focus())
    expect(refresh).toHaveBeenCalledTimes(1)

    globalThis.document.visibilityState = 'hidden'
    renderer.act(() => documentListeners.visibilitychange())
    expect(refresh).toHaveBeenCalledTimes(1)

    globalThis.document.visibilityState = 'visible'
    renderer.act(() => documentListeners.visibilitychange())
    expect(refresh).toHaveBeenCalledTimes(2)

    renderer.act(() => tree.unmount())
    expect(globalThis.document.removeEventListener).toHaveBeenCalled()
    expect(globalThis.window.removeEventListener).toHaveBeenCalled()
  })
})
