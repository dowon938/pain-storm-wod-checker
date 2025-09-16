import { create } from 'zustand'

type Reader<T> = {
  [K in keyof T as `read${Capitalize<string & K>}`]: () => T[K]
}

type Updater<T> = {
  [K in keyof T as `update${Capitalize<string & K>}`]: (value: T[K]) => void
}

type WatchHook<T> = {
  [K in keyof T as `useWatch${Capitalize<string & K>}`]: () => T[K]
}

/**
 * `createStore` 함수는 초기 상태나 타입을 전달받아 해당 이름에 맞는 `read`, `update`, `useWatch` 메서드를 생성합니다.
 * - `read`: 상태를 가져오는 메서드입니다.
 * - `update`: 상태를 업데이트하는 메서드입니다.
 * - `useWatch`: 상태를 바라보는 hook으로, 반드시 React hook 사이클 내에서만 사용 가능합니다.
 *
 * @param initialState 초기 상태나 타입을 전달합니다.
 * @returns `read`, `update`, `useWatch` 메서드를 포함한 store API를 반환합니다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createStore<T extends Record<string, any>>(initialState: T) {
  type Store = T & Updater<T>

  const store = create<Store>((set) => {
    const setters = Object.keys(initialState).reduce((acc, key) => {
      const fnName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      acc[fnName] = (value: any) => set((state) => ({ ...state, [key]: value }))
      return acc
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {} as any)

    return {
      ...initialState,
      ...setters,
    }
  })

  const storeAPI = (Object.keys(initialState) as (keyof T)[]).reduce((acc, key) => {
    const capital = `${(key as string).charAt(0).toUpperCase()}${(key as string).slice(1)}`

    acc[`read${capital}`] = () => store.getState()[key]
    acc[`update${capital}`] = store.getState()[`set${capital}`]
    acc[`useWatch${capital}`] = () => store((state) => state[key])

    return acc
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as Record<string, any>) as Reader<T> & Updater<T> & WatchHook<T>

  return storeAPI
}
