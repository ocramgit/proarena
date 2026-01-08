"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Plus,
  Clock,
  MapPin,
  Users,
  Trophy,
  Gamepad2,
  Video,
  Coffee,
  Megaphone,
  X
} from "lucide-react";

/**
 * FASE 55: TEAM CALENDAR
 * Monthly/Weekly views with auto-synced events
 */

const EVENT_TYPES = {
  PRACC: { icon: Gamepad2, color: "bg-green-500", label: "Pracc" },
  TOURNAMENT: { icon: Trophy, color: "bg-yellow-500", label: "Torneio" },
  SCRIM: { icon: Gamepad2, color: "bg-blue-500", label: "Scrim" },
  TRAINING: { icon: Users, color: "bg-purple-500", label: "Treino" },
  VOD_REVIEW: { icon: Video, color: "bg-cyan-500", label: "VOD Review" },
  MEETING: { icon: Users, color: "bg-orange-500", label: "Reunião" },
  MEDIA: { icon: Megaphone, color: "bg-pink-500", label: "Media" },
  DAY_OFF: { icon: Coffee, color: "bg-zinc-500", label: "Folga" },
  OTHER: { icon: Calendar, color: "bg-zinc-600", label: "Outro" },
};

export default function OrgCalendarPage() {
  const router = useRouter();
  const myOrg = useQuery(api.organizations.getMyOrganization);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calculate date range for query
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

  const events = useQuery(api.orgManagement.getCalendarEvents,
    myOrg?._id ? {
      orgId: myOrg._id as Id<"organizations">,
      startDate: BigInt(startOfMonth.getTime()),
      endDate: BigInt(endOfMonth.getTime()),
    } : "skip"
  );

  const createEvent = useMutation(api.orgManagement.createCalendarEvent);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    eventType: "TRAINING" as keyof typeof EVENT_TYPES,
    date: "",
    startTime: "19:00",
    endTime: "21:00",
    status: "PENDING" as "PENDING" | "CONFIRMED",
  });

  // Not in an org
  if (myOrg === null) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Sem Organização</h2>
        <p className="text-zinc-400">Não fazes parte de nenhuma organização.</p>
      </div>
    );
  }

  // Loading
  if (myOrg === undefined || events === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const org = myOrg;
  const orgId = org._id as Id<"organizations">;

  // Calendar helpers
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventsForDay = (day: number) => {
    const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return events?.filter((e: any) => e.startTime >= dayStart && e.startTime < dayEnd) || [];
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;

    const [year, month, day] = newEvent.date.split("-").map(Number);
    const [startHour, startMin] = newEvent.startTime.split(":").map(Number);
    const [endHour, endMin] = newEvent.endTime.split(":").map(Number);

    const startTime = new Date(year, month - 1, day, startHour, startMin).getTime();
    const endTime = new Date(year, month - 1, day, endHour, endMin).getTime();

    try {
      await createEvent({
        orgId,
        title: newEvent.title,
        description: newEvent.description || undefined,
        eventType: newEvent.eventType,
        startTime: BigInt(startTime),
        endTime: BigInt(endTime),
        status: newEvent.status,
      });
      setShowCreateModal(false);
      setNewEvent({
        title: "",
        description: "",
        eventType: "TRAINING",
        date: "",
        startTime: "19:00",
        endTime: "21:00",
        status: "PENDING",
      });
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <Calendar className="w-7 h-7 text-orange-500" />
              Calendário da Equipa
            </h1>
            <p className="text-zinc-400">[{org.tag}] {org.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === "month" ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === "week" ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Semana
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white capitalize">{monthName}</h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-zinc-800">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-zinc-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before the first of the month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2 min-h-[100px] bg-zinc-900/50 border-b border-r border-zinc-800/50" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);

            return (
              <div
                key={day}
                className={`p-2 min-h-[100px] border-b border-r border-zinc-800/50 transition-colors hover:bg-zinc-800/30 ${
                  today ? "bg-orange-500/10" : ""
                }`}
                onClick={() => {
                  setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                  setNewEvent({
                    ...newEvent,
                    date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                  });
                  setShowCreateModal(true);
                }}
              >
                <div className={`text-sm font-medium mb-1 ${today ? "text-orange-500" : "text-zinc-400"}`}>
                  {day}
                  {today && <span className="ml-1 text-xs">(Hoje)</span>}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event: any) => {
                    const eventType = EVENT_TYPES[event.eventType as keyof typeof EVENT_TYPES] || EVENT_TYPES.OTHER;
                    return (
                      <div
                        key={event._id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate ${eventType.color} text-white`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {new Date(event.startTime).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} {event.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-zinc-500">+{dayEvents.length - 3} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Type Legend */}
      <div className="mt-6 flex flex-wrap gap-4">
        {Object.entries(EVENT_TYPES).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded ${value.color}`} />
            <span className="text-zinc-400">{value.label}</span>
          </div>
        ))}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Criar Evento</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Título *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Ex: Treino Tático"
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Tipo</label>
                <select
                  value={newEvent.eventType}
                  onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                >
                  {Object.entries(EVENT_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Data *</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Início</label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Fim</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Detalhes do evento..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Estado</label>
                <select
                  value={newEvent.status}
                  onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="PENDING">Pendente</option>
                  <option value="CONFIRMED">Confirmado</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
              >
                Criar Evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
