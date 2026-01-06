"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

/**
 * FASE 26: NOTIFICATION BELL
 * Sistema de notificações em tempo real com som
 */

export function NotificationBell() {
  const router = useRouter();
  const [previousCount, setPreviousCount] = useState(0);
  
  const notifications = useQuery(api.notifications.getMyNotifications, { limit: 10 });
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  // Play sound when new notification arrives
  useEffect(() => {
    if (unreadCount !== undefined && unreadCount > previousCount && previousCount > 0) {
      // Play notification sound
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors (user might not have interacted with page yet)
      });
    }
    if (unreadCount !== undefined) {
      setPreviousCount(unreadCount);
    }
  }, [unreadCount, previousCount]);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead({ notificationId: notification._id });
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  if (!notifications) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-zinc-800 transition-colors">
          <Bell className="w-5 h-5 text-zinc-400" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 bg-zinc-900 border-zinc-800 p-0">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-zinc-100">Notificações</div>
            {unreadCount !== undefined && unreadCount > 0 && (
              <div className="text-xs text-zinc-500">{unreadCount} não lidas</div>
            )}
          </div>
          {unreadCount !== undefined && unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMarkAllRead}
              className="text-xs text-orange-500 hover:text-orange-400"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <button
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors text-left ${
                  !notification.read ? "bg-zinc-800/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Type Icon */}
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      notification.type === "TOURNAMENT"
                        ? "bg-orange-500"
                        : notification.type === "MATCH_READY"
                        ? "bg-green-500"
                        : notification.type === "FRIEND_REQUEST"
                        ? "bg-blue-500"
                        : "bg-zinc-500"
                    }`}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-100 mb-1">
                      {notification.title}
                    </div>
                    <div className="text-xs text-zinc-400 mb-2">
                      {notification.message}
                    </div>
                    <div className="text-xs text-zinc-600">
                      {new Date(Number(notification.createdAt)).toLocaleString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-zinc-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Sem notificações</p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
