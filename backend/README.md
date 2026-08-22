# ALPHA FITNESS — Backend & Supabase Database Setup

This directory contains the database schema, real-time trigger tables (`rfid_pending`), Row Level Security (RLS) policies, and hardware ESP32 / Arduino integration documentation.

---

## ⚡ Setup Commands & Instructions

### 1. Database Setup (Supabase PostgreSQL)
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor** -> **New Query**.
3. Copy the full contents of `SUPABASE_SQL.md` located in this folder and click **Run**.
4. This instantly creates all required tables (`branches`, `members`, `attendance_logs`, `expenses`, `products`, `sales`, `todos`, `rfid_pending`).

### 2. Arduino / ESP32 Hardware Setup
1. Open the Arduino C++ Firmware sketch in the Arduino IDE.
2. Connect your **MFRC522 RFID Reader** to your ESP32 board:
   - **SS Pin:** `5`
   - **RST Pin:** `22`
   - **Buzzer Pin:** `4`
3. Retrieve your **Branch ID** directly from the **Settings Page** of your deployed Web Console and update `BRANCH_ID` along with your Supabase URL & Anon Key.
