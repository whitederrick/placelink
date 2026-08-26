"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  GripVertical,
  MapPin,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { CourseDraftNode } from "../schema";

interface SortableRouteListProps {
  nodes: CourseDraftNode[];
  dayCount: number;
  onChange: (nodes: CourseDraftNode[]) => void;
}

function SortableNode({
  node,
  dayPosition,
  dayNodeCount,
  dayCount,
  isAnchor,
  isLast,
  onTipChange,
  onDayChange,
  onDurationChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  node: CourseDraftNode;
  dayPosition: number;
  dayNodeCount: number;
  dayCount: number;
  isAnchor: boolean;
  isLast: boolean;
  onTipChange: (tip: string) => void;
  onDayChange: (dayIndex: number) => void;
  onDurationChange: (durationMinutes: number) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const t = useTranslations("create");
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: node.id, disabled: isAnchor });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      className={`editable-route-node ${isAnchor ? "anchor" : ""}`}
      ref={setNodeRef}
      style={style}
    >
      <span className="route-order">{dayPosition + 1}</span>
      <div className="editable-route-copy">
        <small>
          {isAnchor
            ? t("anchorBadge")
            : t("stopBadge", { index: dayPosition + 1 })}
        </small>
        <strong>{node.place.name}</strong>
        <em>
          <MapPin size={11} />
          {node.place.address}
        </em>
        <span className="route-leg-time">
          <Clock3 size={11} />
          {t("arrivalAndStay", {
            time: `${String(Math.floor(node.arrivalMinutes / 60)).padStart(2, "0")}:${String(node.arrivalMinutes % 60).padStart(2, "0")}`,
            minutes: node.durationMinutes,
          })}
        </span>
        {dayPosition > 0 && node.walkMinutes ? (
          <span className="route-leg-time">
            {t("walkFromPrevious", { minutes: node.walkMinutes })}
          </span>
        ) : null}
        <div className="route-node-schedule">
          {!isAnchor ? (
            <label>
              <span>{t("dayLabel")}</span>
              <select
                value={node.dayIndex}
                onChange={(event) => onDayChange(Number(event.target.value))}
                aria-label={t("placeDayLabel", { place: node.place.name })}
              >
                {Array.from({ length: dayCount }, (_, dayOffset) => (
                  <option value={dayOffset + 1} key={dayOffset + 1}>
                    {t("dayHeading", { day: dayOffset + 1 })}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span>{t("stayLabel")}</span>
            <select
              value={node.durationMinutes}
              onChange={(event) => onDurationChange(Number(event.target.value))}
              aria-label={t("placeDurationLabel", {
                place: node.place.name,
              })}
            >
              {[30, 45, 60, 90, 120, 180, 240].map((minutes) => (
                <option value={minutes} key={minutes}>
                  {t("minutesOption", { minutes })}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!isAnchor ? (
          <input
            value={node.tip ?? ""}
            maxLength={50}
            onChange={(event) => onTipChange(event.target.value)}
            placeholder={t("tipInputPlaceholder")}
            aria-label={t("tipInputLabel", { place: node.place.name })}
          />
        ) : null}
      </div>
      {isAnchor ? (
        <span className="anchor-lock">{t("anchorFixed")}</span>
      ) : (
        <div className="route-node-actions">
          <button
            type="button"
            className="drag-handle"
            aria-label={t("reorderPlace", { place: node.place.name })}
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={17} />
          </button>
          <span>
            <button
              type="button"
              aria-label={t("movePlaceUp", { place: node.place.name })}
              onClick={onMoveUp}
              disabled={dayPosition === 0}
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              aria-label={t("movePlaceDown", { place: node.place.name })}
              onClick={onMoveDown}
              disabled={dayPosition === dayNodeCount - 1 || isLast}
            >
              <ArrowDown size={13} />
            </button>
          </span>
          <button
            type="button"
            aria-label={t("removePlace", { place: node.place.name })}
            onClick={onRemove}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function SortableRouteList({
  nodes,
  dayCount,
  onChange,
}: SortableRouteListProps) {
  const t = useTranslations("create");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = nodes.findIndex((node) => node.id === active.id);
    const targetIndex = nodes.findIndex((node) => node.id === over.id);
    if (
      oldIndex > 0 &&
      targetIndex > 0 &&
      nodes[oldIndex]?.dayIndex === nodes[targetIndex]?.dayIndex
    )
      onChange(arrayMove(nodes, oldIndex, targetIndex));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={nodes.map((node) => node.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="editable-route-list multiday-route-list">
          {Array.from({ length: dayCount }, (_, dayOffset) => {
            const dayIndex = dayOffset + 1;
            const dayNodes = nodes.filter((node) => node.dayIndex === dayIndex);
            return (
              <section className="route-day-group" key={dayIndex}>
                <header>
                  <strong>{t("dayHeading", { day: dayIndex })}</strong>
                  <span>{t("dayStopCount", { count: dayNodes.length })}</span>
                </header>
                {dayNodes.length === 0 ? (
                  <p className="route-day-empty">{t("dayEmpty")}</p>
                ) : (
                  dayNodes.map((node, dayPosition) => {
                    const index = nodes.findIndex(
                      (candidate) => candidate.id === node.id,
                    );
                    return (
                      <SortableNode
                        node={node}
                        dayPosition={dayPosition}
                        dayNodeCount={dayNodes.length}
                        dayCount={dayCount}
                        isAnchor={index === 0}
                        isLast={index === nodes.length - 1}
                        key={node.id}
                        onTipChange={(tip) =>
                          onChange(
                            nodes.map((candidate) =>
                              candidate.id === node.id
                                ? { ...candidate, tip }
                                : candidate,
                            ),
                          )
                        }
                        onDayChange={(nextDayIndex) =>
                          onChange(
                            nodes
                              .map((candidate) =>
                                candidate.id === node.id
                                  ? {
                                      ...candidate,
                                      dayIndex: nextDayIndex,
                                    }
                                  : candidate,
                              )
                              .sort(
                                (first, second) =>
                                  first.dayIndex - second.dayIndex ||
                                  first.orderIndex - second.orderIndex,
                              ),
                          )
                        }
                        onDurationChange={(durationMinutes) =>
                          onChange(
                            nodes.map((candidate) =>
                              candidate.id === node.id
                                ? { ...candidate, durationMinutes }
                                : candidate,
                            ),
                          )
                        }
                        onRemove={() =>
                          onChange(
                            nodes.filter(
                              (candidate) => candidate.id !== node.id,
                            ),
                          )
                        }
                        onMoveUp={() => {
                          if (dayPosition === 0) return;
                          const previousIndex = nodes.findIndex(
                            (candidate) =>
                              candidate.id === dayNodes[dayPosition - 1]?.id,
                          );
                          onChange(arrayMove(nodes, index, previousIndex));
                        }}
                        onMoveDown={() => {
                          if (dayPosition >= dayNodes.length - 1) return;
                          const nextIndex = nodes.findIndex(
                            (candidate) =>
                              candidate.id === dayNodes[dayPosition + 1]?.id,
                          );
                          onChange(arrayMove(nodes, index, nextIndex));
                        }}
                      />
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
