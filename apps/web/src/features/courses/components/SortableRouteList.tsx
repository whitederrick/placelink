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
import { ArrowDown, ArrowUp, GripVertical, MapPin, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CourseDraftNode } from "../schema";

interface SortableRouteListProps {
  nodes: CourseDraftNode[];
  onChange: (nodes: CourseDraftNode[]) => void;
}

function SortableNode({
  node,
  index,
  isLast,
  onTipChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  node: CourseDraftNode;
  index: number;
  isLast: boolean;
  onTipChange: (tip: string) => void;
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
  } = useSortable({ id: node.id, disabled: index === 0 });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      className={`editable-route-node ${index === 0 ? "anchor" : ""}`}
      ref={setNodeRef}
      style={style}
    >
      <span className="route-order">{index + 1}</span>
      <div className="editable-route-copy">
        <small>
          {index === 0
            ? t("anchorBadge")
            : t("stopBadge", { index: index + 1 })}
        </small>
        <strong>{node.place.name}</strong>
        <em>
          <MapPin size={11} />
          {node.place.address}
        </em>
        {index > 0 && node.walkMinutes ? (
          <span className="route-leg-time">
            {t("walkFromPrevious", { minutes: node.walkMinutes })}
          </span>
        ) : null}
        {index > 0 ? (
          <input
            value={node.tip ?? ""}
            maxLength={50}
            onChange={(event) => onTipChange(event.target.value)}
            placeholder={t("tipInputPlaceholder")}
            aria-label={t("tipInputLabel", { place: node.place.name })}
          />
        ) : null}
      </div>
      {index === 0 ? (
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
              disabled={index === 1}
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              aria-label={t("movePlaceDown", { place: node.place.name })}
              onClick={onMoveDown}
              disabled={isLast}
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
  onChange,
}: SortableRouteListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = nodes.findIndex((node) => node.id === active.id);
    const targetIndex = Math.max(
      1,
      nodes.findIndex((node) => node.id === over.id),
    );
    if (oldIndex > 0 && targetIndex > 0)
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
        <div className="editable-route-list">
          {nodes.map((node, index) => (
            <SortableNode
              node={node}
              index={index}
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
              onRemove={() =>
                onChange(nodes.filter((candidate) => candidate.id !== node.id))
              }
              onMoveUp={() =>
                index > 1 && onChange(arrayMove(nodes, index, index - 1))
              }
              onMoveDown={() =>
                index < nodes.length - 1 &&
                onChange(arrayMove(nodes, index, index + 1))
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
