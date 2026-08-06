# Supabase SQL Migrations for Gym OS

To enable the new advanced features (**Workout Routine Builder**, **Member Physical Progress Tracker**, and **Automated WhatsApp Webhook alerts**), please copy and execute the following SQL query inside your Supabase **SQL Editor**:

```sql
-- 1. Add Workout Routine and Progress Logs columns to the members table
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS workout_routine jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS progress_logs jsonb DEFAULT '[]'::jsonb;

-- 2. Add WhatsApp Webhook URL configuration column to the branches table
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS whatsapp_webhook_url text;
```

---

### Why this is needed:
- `workout_routine` will store the member's assigned 6-day workout templates dynamically.
- `progress_logs` will store monthly measurement logs of Weight, Body Fat %, Muscle Mass, Chest, Biceps, and Waist.
- `whatsapp_webhook_url` will store the owner's custom WhatsApp API trigger link to send automated notifications upon check-ins.
