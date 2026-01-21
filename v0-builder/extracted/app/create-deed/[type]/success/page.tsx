import { Suspense } from "react"
import { SuccessContent } from "./success-content"

export default function DeedSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}
