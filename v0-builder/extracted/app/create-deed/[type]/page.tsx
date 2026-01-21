import { DeedBuilder } from "@/features/builder/DeedBuilder"
import { SidebarProvider } from "@/contexts/SidebarContext"
import { PartnersProvider } from "@/contexts/PartnersContext"

export default async function CreateDeedPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params

  return (
    <SidebarProvider>
      <PartnersProvider>
        <DeedBuilder deedType={type} />
      </PartnersProvider>
    </SidebarProvider>
  )
}
