"use client";

import dynamic from "next/dynamic";
import { ArrowRight, CalendarDays, Check, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyticsEventOnMount } from "@/features/analytics/components/AnalyticsEventOnMount";
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
  const [dayCount, setDayCount] = useState(draft.dayCount);
  const [dayStartMinutes, setDayStartMinutes] = useState(draft.dayStartMinutes);
  const [dayEndMinutes, setDayEndMinutes] = useState(draft.dayEndMinutes);
  const [targetStopCount, setTargetStopCount] = useState(draft.targetStopCount);
  const [activeDay, setActiveDay] = useState(1);
  const updateDraft = useUpdateCourseDraft(draft.slug, locale);
  const availableSuggestions = suggestions.filter(
    (suggestion) => !nodes.some((node) => node.place.id === suggestion.id),
  );
  const totalWalkMinutes = useMemo(
    () => {
      const visitedDays = new Set<number>();
      return nodes.reduce((total, node) => {
        if (!visitedDays.has(node.dayIndex)) {
          visitedDays.add(node.dayIndex);
          return total;
        }
        return total + (node.walkMinutes ?? 0);
      }, 0);
    },
    [nodes],
  );
  const scheduledNodes = useMemo(() => {
    const elapsedByDay = new Map<number, number>();
    return nodes.map((node, orderIndex) => {
      const arrivalMinutes =
        (elapsedByDay.get(node.dayIndex) ?? dayStartMinutes) +
        (elapsedByDay.has(node.dayIndex) ? (node.walkMinutes ?? 0) : 0);
      elapsedByDay.set(node.dayIndex, arrivalMinutes + node.durationMinutes);
      return { ...node, orderIndex, arrivalMinutes };
    });
  }, [dayStartMinutes, nodes]);
  const dayEndByIndex = useMemo(() => {
    const result = new Map<number, number>();
    for (const node of scheduledNodes)
      result.set(node.dayIndex, node.arrivalMinutes + node.durationMinutes);
    return result;
  }, [scheduledNodes]);
  const missingDay = Array.from(
    { length: dayCount },
    (_, dayOffset) => dayOffset + 1,
  ).find(
    (dayIndex) => !scheduledNodes.some((node) => node.dayIndex === dayIndex),
  );
  const scheduleOverflows = [...dayEndByIndex.values()].some(
    (minutes) => minutes > dayEndMinutes,
  );
  const normalizeNodes = (nextNodes: CourseDraftNode[]) =>
    setNodes(nextNodes.map((node, orderIndex) => ({ ...node, orderIndex })));
  const changeDayCount = (nextDayCount: number) => {
    setDayCount(nextDayCount);
    setActiveDay((current) => Math.min(current, nextDayCount));
    setTargetStopCount((current) =>
      Math.min(nextDayCount * 8, Math.max(current, Math.max(2, nextDayCount))),
    );
    normalizeNodes(
      nodes
        .map((node) =>
          node.dayIndex > nextDayCount
            ? { ...node, dayIndex: nextDayCount }
            : node,
        )
        .sort(
          (first, second) =>
            first.dayIndex - second.dayIndex ||
            first.orderIndex - second.orderIndex,
        ),
    );
  };

  const addPlace = (place: PlaceSuggestion) => {
    const activeDayStops = nodes.filter(
      (node) => node.dayIndex === activeDay,
    ).length;
    if (nodes.length >= 24 || activeDayStops >= 8) return;
    normalizeNodes(
      [
        ...nodes,
        {
          id: `new-${place.id}`,
          orderIndex: nodes.length,
          dayIndex: activeDay,
          durationMinutes: 60,
          arrivalMinutes: dayStartMinutes,
          tip: null,
          distanceMeters: place.distanceMeters ?? null,
          walkMinutes: activeDayStops > 0 && place.distanceMeters
            ? Math.max(1, Math.ceil(place.distanceMeters / 80))
            : null,
          place,
        },
      ].sort(
        (first, second) =>
          first.dayIndex - second.dayIndex ||
          first.orderIndex - second.orderIndex,
      ),
    );
  };
  const saveRoute = () =>
    updateDraft.mutate(
      {
        dayCount,
        dayStartMinutes,
        dayEndMinutes,
        targetStopCount,
        nodes: scheduledNodes.map((node) => ({
          placeId: node.place.id,
          dayIndex: node.dayIndex,
          durationMinutes: node.durationMinutes,
          tip: node.tip,
        })),
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
      <AnalyticsEventOnMount
        event={{ name: "wizard.step_viewed", properties: { step: 2, locale } }}
      />
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
          <div className="schedule-controls">
            <div className="schedule-control-group">
              <span>
                <CalendarDays size={15} />
                {t("scheduleDays")}
              </span>
              <div className="day-count-options">
                {[1, 2, 3].map((count) => (
                  <button
                    type="button"
                    className={dayCount === count ? "selected" : ""}
                    onClick={() => changeDayCount(count)}
                    key={count}
                  >
                    {t("dayCountOption", { count })}
                  </button>
                ))}
              </div>
            </div>
            <div className="schedule-time-grid">
              <label>
                <span>{t("startTime")}</span>
                <input
                  type="time"
                  value={`${String(Math.floor(dayStartMinutes / 60)).padStart(2, "0")}:${String(dayStartMinutes % 60).padStart(2, "0")}`}
                  onChange={(event) => {
                    const [hours, minutes] = event.target.value
                      .split(":")
                      .map(Number);
                    setDayStartMinutes((hours ?? 0) * 60 + (minutes ?? 0));
                  }}
                />
              </label>
              <label>
                <span>{t("endTime")}</span>
                <input
                  type="time"
                  value={`${String(Math.floor(dayEndMinutes / 60)).padStart(2, "0")}:${String(dayEndMinutes % 60).padStart(2, "0")}`}
                  onChange={(event) => {
                    const [hours, minutes] = event.target.value
                      .split(":")
                      .map(Number);
                    setDayEndMinutes((hours ?? 0) * 60 + (minutes ?? 0));
                  }}
                />
              </label>
              <label>
                <span>{t("targetStops")}</span>
                <select
                  value={targetStopCount}
                  onChange={(event) =>
                    setTargetStopCount(Number(event.target.value))
                  }
                >
                  {Array.from(
                    {
                      length: dayCount * 8 - Math.max(2, dayCount) + 1,
                    },
                    (_, index) => Math.max(2, dayCount) + index,
                  ).map((count) => (
                    <option value={count} key={count}>
                      {t("targetStopsOption", { count })}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <SortableRouteList
            nodes={scheduledNodes}
            dayCount={dayCount}
            onChange={normalizeNodes}
          />
        </section>
        <section className="place-suggestions">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{t("nearbyKicker")}</span>
              <h2>{t("nearbyTitle")}</h2>
            </div>
            <span>
              {t("routeProgress", {
                count: nodes.length,
                target: targetStopCount,
              })}
            </span>
          </div>
          <div className="suggestion-day-picker">
            <span>{t("addToDay")}</span>
            {Array.from({ length: dayCount }, (_, dayOffset) => (
              <button
                type="button"
                className={activeDay === dayOffset + 1 ? "selected" : ""}
                onClick={() => setActiveDay(dayOffset + 1)}
                key={dayOffset + 1}
              >
                DAY {dayOffset + 1}
              </button>
            ))}
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
                    disabled={
                      nodes.length >= 24 ||
                      nodes.filter((node) => node.dayIndex === activeDay)
                        .length >= 8
                    }
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
            : missingDay
              ? t("routeMissingDay", { day: missingDay })
              : scheduleOverflows
                ? t("routeScheduleOverflow")
                : t("routeSummary", {
                    stops: nodes.length,
                    minutes: totalWalkMinutes,
                  })}
        </span>
        <button
          type="button"
          onClick={saveRoute}
          disabled={
            nodes.length < 2 ||
            Boolean(missingDay) ||
            scheduleOverflows ||
            dayEndMinutes - dayStartMinutes < 180 ||
            updateDraft.isPending
          }
        >
          {updateDraft.isPending ? t("savingRoute") : t("next")}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
