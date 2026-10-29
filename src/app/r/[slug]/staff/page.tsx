import StaffHubPage from "@/app/staff/page";

export default async function RestaurantStaffPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <StaffHubPage restaurantSlug={slug} />;
}
