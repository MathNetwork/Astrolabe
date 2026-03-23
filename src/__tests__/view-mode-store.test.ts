import { useViewStore } from '../stores/viewStore'
import { act } from '@testing-library/react'

describe('viewMode in viewStore', () => {
  beforeEach(() => {
    // Reset store
    useViewStore.setState({ viewMode: 'graph' })
  })

  test('default viewMode is graph', () => {
    expect(useViewStore.getState().viewMode).toBe('graph')
  })

  test('setViewMode switches to ref', () => {
    act(() => useViewStore.getState().setViewMode('ref'))
    expect(useViewStore.getState().viewMode).toBe('ref')
  })

  test('setViewMode switches back to graph', () => {
    act(() => useViewStore.getState().setViewMode('ref'))
    act(() => useViewStore.getState().setViewMode('graph'))
    expect(useViewStore.getState().viewMode).toBe('graph')
  })
})
