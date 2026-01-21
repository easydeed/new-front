"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useSidebar } from "@/contexts/SidebarContext"

export function useBuilderMode() {
  const pathname = usePathname()
  const { setCollapsed } = useSidebar()

  const isBuilderRoute = pathname?.includes("/create-deed") || pathname?.includes("/deed-builder")

  useEffect(() => {
    if (isBuilderRoute) {
      setCollapsed(true)
    }
  }, [isBuilderRoute, setCollapsed])

  return { isBuilderMode: isBuilderRoute }
}
