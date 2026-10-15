import "fake-indexeddb/auto"
import { IDBFactory } from "fake-indexeddb"
import { cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach } from "vitest"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

afterEach(() => {
  cleanup()
})
