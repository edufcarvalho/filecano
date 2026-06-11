/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react"
import type { LinkResponse } from "@/lib/api"

type LinksContextType = {
  links: LinkResponse[]
  setLinks: Dispatch<SetStateAction<LinkResponse[]>>
  addLink: (link: LinkResponse) => void
}

const LinksContext = createContext<LinksContextType | null>(null)

export function LinksProvider({ children }: { children: ReactNode }) {
  const [links, setLinks] = useState<LinkResponse[]>([])

  const addLink = useCallback((link: LinkResponse) => {
    setLinks((prev: LinkResponse[]) => [link, ...prev])
  }, [])

  const value = useMemo(() => ({ links, setLinks, addLink }), [links, addLink])

  return <LinksContext.Provider value={value}>{children}</LinksContext.Provider>
}

export function useLinks() {
  const context = useContext(LinksContext)
  if (!context) {
    throw new Error("useLinks must be used within a LinksProvider")
  }
  return context
}
