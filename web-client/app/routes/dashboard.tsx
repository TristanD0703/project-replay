import { Sidebar, SidebarProvider, useSidebar } from "~/components/ui/sidebar";

export default function Dashboard() {
    return (
        <SidebarProvider>
            <Sidebar></Sidebar>
        </SidebarProvider>
    );
}