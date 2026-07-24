import { auth } from "@/auth";
import { loadHumanActor } from "@/features/auth";
import {
  AnchorSelectionScreen,
  listCourseAnchors,
  loadCourseDraft,
  PublishCourseScreen,
  RouteBuilderScreen,
} from "@/features/courses";
import { findNearbyPlaces } from "@/features/places";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

export default async function CreatePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const session = await auth();
  const actor = session?.user?.id
    ? await loadHumanActor(session.user.id)
    : null;
  const draftSlug = typeof query.draft === "string" ? query.draft : undefined;
  const step = typeof query.step === "string" ? query.step : undefined;
  if (actor && draftSlug) {
    let draftResult;
    try {
      draftResult = await loadCourseDraft(actor, draftSlug, locale);
    } catch {
      notFound();
    }
    if (step === "3")
      return <PublishCourseScreen locale={locale} draft={draftResult.data} />;
    const anchor = draftResult.data.nodes[0]!.place;
    const nearby = await findNearbyPlaces({
      locale,
      lat: anchor.lat,
      lng: anchor.lng,
      radiusMeters: 2000,
      take: 20,
    });
    return (
      <RouteBuilderScreen
        locale={locale}
        draft={draftResult.data}
        suggestions={nearby.data}
      />
    );
  }
  const anchorPage = await listCourseAnchors({ locale, take: 20 });
  return (
    <AnchorSelectionScreen
      locale={locale}
      anchors={anchorPage.data}
      signedIn={Boolean(actor)}
    />
  );
}

export const dynamic = "force-dynamic";
