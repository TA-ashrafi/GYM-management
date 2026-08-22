import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useGym, generateSlots } from "@/lib/gym-store";
import { fetchMembers } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/schedule")({
  head: () => ({ meta: [{ title: "Time Slots — ALPHA FITNESS" }] }),
  component: Schedule,
});

function Schedule() {
  const [members, setMembers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [slotDuration, setSlotDuration] = useState(60);
  const settings = useGym((s) => s.settings);

  // Fetch members and gym settings (shifts + slot duration)
  useEffect(() => {
    fetchMembers().then((data) => setMembers(data || []));

    supabase
      .from("gym_settings")
      .select("shifts, slot_duration_min")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data?.shifts) setShifts(data.shifts);
        if (data?.slot_duration_min) setSlotDuration(data.slot_duration_min);
      });
  }, []);

  // Generate slots (prefer shifts from Supabase)
  const slots = generateSlots(
    shifts.length > 0 ? shifts : settings.shifts,
    slotDuration || settings.slotDurationMin
  );

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader 
        title="Time Slot Manager" 
        subtitle="Set capacity limits and prevent overcrowding" 
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slot) => {
          const bookedMembers = members.filter((m) => m.preferredSlot === slot);
          const booked = bookedMembers.length;
          const cap = settings.slotCapacity;
          const pct = Math.min(100, (booked / cap) * 100);
          const hot = pct > 90;

          return (
            <div key={slot} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="font-heading text-lg">{slot}</p>
                <span className={"text-[10px] uppercase tracking-wider px-2 py-1 rounded " + 
                  (hot ? "bg-danger/10 text-danger" : pct > 60 ? "bg-warn/10 text-warn" : "bg-brand/10 text-brand")}>
                  {hot ? "Full" : pct > 60 ? "Busy" : "Open"}
                </span>
              </div>

              <p className="text-3xl font-heading mt-3">
                {booked}<span className="text-muted-foreground text-lg"> / {cap}</span>
              </p>

              <div className="h-2 bg-secondary rounded-full overflow-hidden mt-3">
                <div 
                  className={"h-full " + (hot ? "bg-danger" : pct > 60 ? "bg-warn" : "bg-brand")} 
                  style={{ width: `${pct}%` }} 
                />
              </div>

              {/* Capacity Adjustment */}
              <label className="block mt-4">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Capacity</span>
                <input
                  type="number"
                  value={cap}
                  onChange={(e) => {
                    const newCap = Math.max(1, +e.target.value);
                    // Note: Uncomment below if gym-store has setSlotCapacity function
                    // gym.setSlotCapacity(slot, newCap);
                  }}
                  className="mt-1 w-full px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40"
                />
              </label>

              {/* Member Avatars */}
              <div className="mt-4 -mx-1 flex flex-wrap gap-1">
                {bookedMembers.slice(0, 8).map((m) => (
                  m.photo ? (
                    <img 
                      key={m.id} 
                      src={m.photo} 
                      title={m.name} 
                      className="size-7 rounded-full object-cover ring-1 ring-border" 
                      width={28} 
                      height={28} 
                      loading="lazy" 
                      alt={m.name} 
                    />
                  ) : (
                    <div 
                      key={m.id} 
                      title={m.name} 
                      className="size-7 rounded-full bg-brand/20 grid place-items-center text-brand text-[10px] font-bold"
                    >
                      {m.name?.[0] || "?"}
                    </div>
                  )
                ))}
                {bookedMembers.length > 8 && (
                  <div className="size-7 rounded-full bg-secondary grid place-items-center text-[10px] text-muted-foreground font-medium">
                    +{bookedMembers.length - 8}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}