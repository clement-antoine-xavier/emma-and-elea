"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {Badge} from "@astryxdesign/core/Badge";
import {Banner} from "@astryxdesign/core/Banner";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {Grid} from "@astryxdesign/core/Grid";
import {Heading} from "@astryxdesign/core/Heading";
import {HStack} from "@astryxdesign/core/HStack";
import {Icon} from "@astryxdesign/core/Icon";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
} from "@astryxdesign/core/Layout";
import {MoreMenu} from "@astryxdesign/core/MoreMenu";
import {StatusDot} from "@astryxdesign/core/StatusDot";
import {Text} from "@astryxdesign/core/Text";
import {VStack} from "@astryxdesign/core/VStack";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  LoaderCircle,
} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {setTaskStatusAction} from "@/app/actions/task.actions";
import {formatBusinessDate} from "@/lib/format";
import type {TaskRecord, TaskStatusName} from "@/lib/dto";

// Pointer travel (px) before a press is promoted to a drag, so a click on the
// card does not start a move.
const DRAG_THRESHOLD = 5;

const COLUMNS = [
  {status: "TODO", variant: "neutral", icon: Inbox},
  {status: "IN_PROGRESS", variant: "accent", icon: LoaderCircle},
  {status: "BLOCKED", variant: "error", icon: AlertTriangle},
  {status: "DONE", variant: "success", icon: CheckCircle2},
] as const satisfies ReadonlyArray<{
  status: TaskStatusName;
  variant: "neutral" | "accent" | "error" | "success";
  icon: typeof Inbox;
}>;

// Live state of an in-progress pointer drag. Coordinates are viewport space.
type DragState = {
  taskId: string;
  width: number;
  offsetX: number;
  offsetY: number;
  pointerX: number;
  pointerY: number;
  over: TaskStatusName | null;
};

function isStatus(value: string | undefined): value is TaskStatusName {
  return COLUMNS.some((column) => column.status === value);
}

function timeOf(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function TaskCardBody({
  task,
  menu,
}: {
  task: TaskRecord;
  menu?: ReactNode;
}) {
  const t = useTranslations("MyWork.board");
  const locale = useLocale();

  const planned = task.plannedStartAt
    ? t("planned", {
        date: formatBusinessDate(task.plannedStartAt, {locale}),
        time: timeOf(task.plannedStartAt, locale),
      })
    : t("unscheduled");
  const duration =
    task.estimatedMinutes != null && task.estimatedMinutes > 0
      ? ` · ${t("duration", {minutes: task.estimatedMinutes})}`
      : "";

  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="start" gap={2}>
        <HStack gap={1} vAlign="center" wrap="wrap">
          {task.batchCode ? (
            <Badge variant="neutral" label={task.batchCode} />
          ) : null}
          {task.requiredSkillName ? (
            <Badge variant="blue" label={task.requiredSkillName} />
          ) : null}
        </HStack>
        {menu}
      </HStack>

      <VStack gap={1}>
        <Heading level={4}>
          {task.recipeName
            ? `${task.recipeName} · ${task.title}`
            : task.title}
        </Heading>
        {task.description ? (
          <Text type="supporting" color="secondary" maxLines={2}>
            {task.description}
          </Text>
        ) : null}
      </VStack>

      <Text type="supporting" color="secondary">
        {`${planned}${duration}`}
      </Text>
    </VStack>
  );
}

/**
 * Personal kanban for tasks assigned to the signed-in employee. Columns are the
 * task statuses; dragging a card (or using its menu) updates the status through
 * the task service. Ordering inside a column stays the planned order: the domain
 * has no reorder action, so this board never fakes one.
 */
export function MyWorkBoard({
  tasks,
  canExecute,
}: {
  tasks: TaskRecord[];
  canExecute: boolean;
}) {
  const t = useTranslations("MyWork.board");
  const tTasks = useTranslations("Tasks");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();

  const [overrides, setOverrides] = useState<
    Record<string, {from: TaskStatusName; status: TaskStatusName}>
  >({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const teardownRef = useRef<(() => void) | null>(null);

  // An optimistic move only applies while the server still reports the status
  // it started from; once refreshed data arrives it wins without any cleanup.
  const statusOf = (task: TaskRecord): TaskStatusName => {
    const override = overrides[task.id];
    return override && task.status === override.from
      ? override.status
      : task.status;
  };

  // Suppress text selection while a card follows the pointer.
  const isDragging = drag !== null;
  useEffect(() => {
    if (!isDragging) return;
    const previous = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = previous;
    };
  }, [isDragging]);

  useEffect(() => () => teardownRef.current?.(), []);

  async function move(task: TaskRecord, status: TaskStatusName) {
    if (!canExecute || status === statusOf(task) || pendingId) return;

    setPendingId(task.id);
    setError(null);
    setOverrides((current) => ({
      ...current,
      [task.id]: {from: task.status, status},
    }));

    try {
      const result = await setTaskStatusAction(task.id, status);
      if (!result.ok) {
        setOverrides((current) => {
          const next = {...current};
          delete next[task.id];
          return next;
        });
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  const columnAt = (x: number, y: number): TaskStatusName | null => {
    for (const element of document.querySelectorAll<HTMLElement>(
      "[data-column]",
    )) {
      const rect = element.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        const status = element.dataset.column;
        if (isStatus(status)) return status;
      }
    }
    return null;
  };

  const startDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    task: TaskRecord,
  ) => {
    if (!canExecute || event.button !== 0 || !event.isPrimary) return;
    // Touch drags would fight page scrolling; the card menu covers touch.
    if (event.pointerType === "touch") return;
    // Let the card's own controls handle the press.
    if (
      (event.target as HTMLElement).closest(
        "button, a, [role='menuitem'], [role='menu']",
      )
    ) {
      return;
    }

    const from = statusOf(task);
    const rect = event.currentTarget.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    let started = false;
    let over: TaskStatusName | null = null;

    const handleMove = (moveEvent: PointerEvent) => {
      if (
        !started &&
        Math.abs(moveEvent.clientX - startX) +
          Math.abs(moveEvent.clientY - startY) <
          DRAG_THRESHOLD
      ) {
        return;
      }
      started = true;
      over = columnAt(moveEvent.clientX, moveEvent.clientY);
      setDrag({
        taskId: task.id,
        width: rect.width,
        offsetX,
        offsetY,
        pointerX: moveEvent.clientX,
        pointerY: moveEvent.clientY,
        over,
      });
    };

    const teardown = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      teardownRef.current = null;
    };

    const handleUp = () => {
      teardown();
      setDrag(null);
      if (started && over && over !== from) {
        void move(task, over);
      }
    };

    teardownRef.current = teardown;
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  };

  if (tasks.length === 0) {
    return (
      <Card padding={4}>
        <EmptyState
          title={tTasks("emptyTitle")}
          description={tTasks("emptyBody")}
          isCompact
        />
      </Card>
    );
  }

  const draggedTask = drag
    ? tasks.find((task) => task.id === drag.taskId)
    : undefined;

  return (
    <>
      {error ? (
        <Banner
          status="error"
          title={tTasks("errorTitle")}
          description={error}
        />
      ) : null}

      <Grid columns={{minWidth: 260, max: 4}} gap={4}>
        {COLUMNS.map((meta) => {
          const status = meta.status;
          const statusLabel = tTasks(`statuses.${status}`);
          const columnTasks = tasks.filter((task) => statusOf(task) === status);
          const isDropTarget = drag?.over === status;

          return (
            <Card
              key={status}
              data-column={status}
              variant="muted"
              padding={0}
              elevation={isDropTarget ? "med" : "none"}
            >
              <Layout
                height="auto"
                header={
                  <LayoutHeader hasDivider padding={3}>
                    <HStack hAlign="between" vAlign="center">
                      <HStack gap={2} vAlign="center">
                        <StatusDot
                          variant={meta.variant}
                          label={statusLabel}
                        />
                        <Heading level={4}>{statusLabel}</Heading>
                      </HStack>
                      <Text
                        type="supporting"
                        color="secondary"
                        hasTabularNumbers
                      >
                        {columnTasks.length}
                      </Text>
                    </HStack>
                  </LayoutHeader>
                }
                content={
                  <LayoutContent padding={2}>
                    {columnTasks.length === 0 ? (
                      <VStack padding={4}>
                        <EmptyState
                          isCompact
                          icon={
                            <Icon
                              icon={meta.icon}
                              size="lg"
                              color="secondary"
                            />
                          }
                          title={t(`empty.${status}`)}
                        />
                      </VStack>
                    ) : (
                      <VStack gap={2}>
                        {columnTasks.map((task) => {
                          const moveTargets = COLUMNS.filter(
                            (target) => target.status !== status,
                          ).map((target) => ({
                            label: t("moveTo", {
                              status: tTasks(`statuses.${target.status}`),
                            }),
                            onClick: () => {
                              void move(task, target.status);
                            },
                          }));

                          return (
                            <Card
                              key={task.id}
                              padding={3}
                              elevation={
                                drag?.taskId === task.id ? "med" : "none"
                              }
                              style={{
                                cursor: canExecute ? "grab" : undefined,
                                opacity: drag?.taskId === task.id ? 0.4 : 1,
                              }}
                              onPointerDown={(event) => startDrag(event, task)}
                            >
                              <TaskCardBody
                                task={task}
                                menu={
                                  canExecute ? (
                                    <MoreMenu
                                      label={t("actions")}
                                      size="sm"
                                      isDisabled={pendingId === task.id}
                                      items={moveTargets}
                                    />
                                  ) : null
                                }
                              />
                            </Card>
                          );
                        })}
                      </VStack>
                    )}
                  </LayoutContent>
                }
              />
            </Card>
          );
        })}
      </Grid>

      {drag && draggedTask ? (
        <Card
          padding={3}
          elevation="high"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: drag.width,
            transform: `translate(${drag.pointerX - drag.offsetX}px, ${
              drag.pointerY - drag.offsetY
            }px)`,
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          <TaskCardBody task={draggedTask} />
        </Card>
      ) : null}
    </>
  );
}
