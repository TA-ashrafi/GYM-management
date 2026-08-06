# Supabase SQL Editor Query

Please COPY and RUN this exact query inside your **Supabase SQL Editor** (available in the left menu in Supabase dashboard) to instantly support all of Gym OS's advanced features including customizable workouts, progress charts, and WhatsApp alerts!

```sql
-- 1. Add Workout Routine and Progress Logs columns to the members table
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS workout_routine jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS progress_logs jsonb DEFAULT '[]'::jsonb;

-- 2. Add WhatsApp Webhook URL and Custom Workout Templates to the branches table
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS whatsapp_webhook_url text,
ADD COLUMN IF NOT EXISTS workout_templates jsonb DEFAULT '[]'::jsonb;
```

---

### Why this is needed:
- `workout_routine` will store the member's assigned 6-day workout templates dynamically.
- `progress_logs` will store monthly measurement logs of Weight, Body Fat %, Muscle Mass, Chest, Biceps, and Waist.
- `whatsapp_webhook_url` will store the owner's custom WhatsApp API trigger link to send automated notifications upon check-ins.
- `workout_templates` will store the custom workout templates defined by you (the Gym Owner) inside the Settings page!
