import Home from "@/app/page";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <Home restaurantSlug={slug} />;
}
