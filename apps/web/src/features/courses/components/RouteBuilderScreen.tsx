"use client";

import dynamic from "next/dynamic";
import { ArrowRight, Check, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CourseDraft, CourseDraftNode } from "../schema";
import { useUpdateCourseDraft } from "../hooks";

const SortableRouteList = dynamic(() => import("./SortableRouteList"), {
  ssr: false,
});

interface PlaceSuggestion {
  id: string;
  name: string;
  address: string;
  area: string | null;
  category: "EXHIBITION" | "CAFE" | "SHOP" | "RESTAURANT" | "ACTIVITY" | "BAR";
  lat: number;
  lng: number;
  distanceMeters?: number;
}

export function RouteBuilderScreen({
  locale,
  draft,
  suggestions,
}: {
  locale: "ko" | "en";
  draft: CourseDraft;
  suggestions: PlaceSuggestion[];
}) {
  const t = useTranslations("create");
  const router = useRouter();
  const explore = useTranslations("explore");
  const [nodes, setNodes] = useState<CourseDraftNode[]>(draft.nodes);
  const updateDraft = useUpdateCourseDraft(draft.slug, locale);
  const availableSuggestions = suggestions.filter(
    (suggestion) => !nodes.some((node) => node.place.id === suggestion.id),
  );
  const totalWalkMinutes = useMemo(
    () => nodes.reduce((total, node) => total + (node.walkMinutes ?? 0), 0),
    [nodes],
  );

  const addPlace = (place: PlaceSuggestion) => {
    if (nodes.length >= 8) return;
    setNodes([
      ...nodes,
      {
        id: `new-${place.id}`,
        orderIndex: nodes.length,
        tip: null,
        distanceMeters: place.distanceMeters ?? null,
        walkMinutes: place.distanceMeters
          ? Math.max(1, Math.ceil(place.distanceMeters / 80))
          : null,
        place,
      },
    ]);
  };
  const saveRoute = () =>
    updateDraft.mutate(
      {
        nodes: nodes.map((node) => ({ placeId: node.place.id, tip: node.tip })),
      },
      {
        onSuccess: (result) => {
          setNodes(result.data.nodes);
          router.push(
            `/${locale}/create?step=3&draft=${encodeURIComponent(draft.slug)}`,
          );
        },
      },
    );

  return (
    <div className="screen-page create-page">
      <div className="wizard-head">
        <div>
          <span className="section-kicker">{t("kicker")}</span>
          <h1>{draft.title}</h1>
        </div>
        <span className="draft-chip">{t("draft")}</span>
      </div>
      <div className="stepper">
        <span className="done">
          <Check size={14} />
        </span>
        <i />
        <span className="current">2</span>
        <i />
        <span>3</span>
      </div>
      <div className="step-labels">
        <span>{t("stepAnchor")}</span>
        <strong>{t("stepRoute")}</strong>
        <span>{t("stepPublish")}</span>
      </div>
      <div className="route-workspace">
        <section className="builder-card route-editor-card">
          <div className="builder-title">
            <span>{t("routeKicker")}</span>
            <h2>{t("routeTitle")}</h2>
            <p>{t("routeHint")}</p>
          </div>
          <SortableRouteList nodes={nodes} onChange={setNodes} />
        </section>
        <section className="place-suggestions">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{t("nearbyKicker")}</span>
              <h2>{t("nearbyTitle")}</h2>
            </div>
            <span>{t("routeLimit", { count: nodes.length })}</span>
          </div>
          <div className="suggestion-list">
            {availableSuggestions.length === 0 ? (
              <div className="empty-state">
                <strong>{t("nearbyEmptyTitle")}</strong>
                <p>{t("nearbyEmptyBody")}</p>
              </div>
            ) : (
              availableSuggestions.slice(0, 8).map((place) => (
                <article className="suggestion-row" key={place.id}>
                  <div>
                    <small>{explore(`categories.${place.category}`)}</small>
                    <strong>{place.name}</strong>
                    <span>
                      {place.distanceMeters
                        ? t("metersAway", { distance: place.distanceMeters })
                        : place.address}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addPlace(place)}
                    disabled={nodes.length >= 8}
                    aria-label={t("addNamedPlace", { place: place.name })}
                  >
                    <Plus size={17} />
                    {t("addShort")}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
      {updateDraft.isSuccess ? (
        <p className="save-notice">
          <Check size={14} />
          {t("routeSaved")}
        </p>
      ) : null}
      {updateDraft.isError ? (
        <p className="form-error" role="alert">
          {t("routeSaveError")}
        </p>
      ) : null}
      <div className="builder-summary anchor-summary">
        <span>
          {nodes.length < 2
            ? t("routeMinStops")
            : t("routeSummary", {
                stops: nodes.length,
                minutes: totalWalkMinutes,
              })}
        </span>
        <button
          type="button"
          onClick={saveRoute}
          disabled={nodes.length < 2 || updateDraft.isPending}
        >
          {updateDraft.isPending ? t("savingRoute") : t("next")}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
