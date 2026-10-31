import { useSyncExternalStore } from 'react'

const detectOs = () => {
  const userAgent = navigator.userAgent
  return userAgent.includes('Mac') ? 'mac' : userAgent.includes('Win') ? 'win' : ''
}

// The user agent never changes, so there is nothing to subscribe to. The
// server render has no navigator and reports no OS.
const subscribe = () => () => {}

const useGetOs = () => useSyncExternalStore(subscribe, detectOs, () => '')

export default useGetOs
