"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Package,
  RotateCcw,
  ShoppingBag,
  Truck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import type { Notification, NotificationType, UnreadCountResponse } from "@/types";

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "LOW_STOCK":
      return <AlertTriangle className="size-4 text-warning" aria-hidden />;
    case "ORDER_SUBMITTED":
    case "ORDER_ACCEPTED":
      return <ShoppingBag className="size-4 text-brand" aria-hidden />;
    case "ORDER_DISPATCHED":
      return <Truck className="size-4 text-info" aria-hidden />;
    case "ORDER_DELIVERED":
      return <Package className="size-4 text-success" aria-hidden />;
    case "ORDER_REJECTED":
    case "ORDER_CANCELLED":
      return <XCircle className="size-4 text-danger" aria-hidden />;
    case "CONNECTION_REQUEST":
    case "CONNECTION_ACCEPTED":
      return <UserCheck className="size-4 text-brand" aria-hidden />;
    default:
      return <Bell className="size-4 text-muted-foreground" aria-hidden />;
  }
}

function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateString;
  }
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Fetch unread count for badge
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await apiClient.get<UnreadCountResponse>("/notifications/unread-count");
      setUnreadCount(data.count ?? 0);
    } catch {
      // In preview or unauthenticated mode, fail silently for badge
    }
  }, []);

  // Fetch notifications list on dropdown open
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await apiClient.get<Notification[]>("/notifications");
      setNotifications(Array.isArray(data) ? data : []);
      // Refresh count as well
      const countData = await apiClient.get<UnreadCountResponse>("/notifications/unread-count");
      setUnreadCount(countData.count ?? 0);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Mark single notification as read
  async function markAsRead(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await apiClient.patch<Notification>(`/notifications/${id}/read`);
    } catch {
      // Revert if error
      fetchNotifications();
    }
  }

  // Mark all notifications as read
  async function markAllAsRead() {
    setIsMarkingAll(true);
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await apiClient.patch("/notifications/read-all");
    } catch {
      fetchNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
          className="relative"
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground shadow-sm animate-in zoom-in">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-50 w-80 sm:w-96 rounded-xl border bg-popover p-0 text-popover-foreground shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 ? (
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
                {unreadCount} new
              </Badge>
            ) : null}
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isMarkingAll}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              <span>Mark all read</span>
            </Button>
          ) : null}
        </div>

        {/* Notifications Body */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <div className="size-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p>Loading notifications…</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center px-4">
              <p className="text-sm font-medium text-destructive">
                Failed to load notifications
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNotifications}
                className="gap-1.5"
              >
                <RotateCcw className="size-3.5" /> Retry
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground px-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Bell className="size-5 opacity-60" />
              </div>
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs">You are all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
                className={`group flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-muted/50 ${
                  !notification.isRead ? "bg-brand/5" : ""
                }`}
              >
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        !notification.isRead
                          ? "font-semibold text-foreground"
                          : "font-medium text-foreground/80"
                      }`}
                    >
                      {notification.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {notification.message}
                  </p>
                </div>

                {!notification.isRead ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mark read"
                    title="Mark read"
                    onClick={(e) => markAsRead(notification.id, e)}
                    className="size-6 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-background"
                  >
                    <Check className="size-3 text-muted-foreground hover:text-foreground" />
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

