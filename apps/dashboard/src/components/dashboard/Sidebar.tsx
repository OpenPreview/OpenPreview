import { fetchOrganizations } from '@openpreview/db/hooks/fetchOrganizations';
import { MobileSidebar } from './MobileSidebar';
import { SidebarContent } from './SidebarContent';

export async function Sidebar() {
  const organizations = await fetchOrganizations();

  return (
    <>
      <MobileSidebar>
        <SidebarContent organizations={organizations} />
      </MobileSidebar>
      <aside className="bg-background border-border hidden h-screen w-64 border-r shadow-md md:block">
        <SidebarContent organizations={organizations} />
      </aside>
    </>
  );
}
