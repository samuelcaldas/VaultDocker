
import { AppSidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen overflow-x-hidden">
        <Navbar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
