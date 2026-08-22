# ALPHA FITNESS - Backend & Supabase Database Configuration

This directory contains the database schema, real-time trigger tables (`rfid_pending`), Row Level Security (RLS) policies, and hardware ESP32/Arduino integration specs.

## 🚀 Installation & Setup Instructions

### 1. Database Setup (Supabase SQL)
1. Go to your **Supabase Dashboard** -> **SQL Editor**.
2. Create a new query, paste the contents of `SUPABASE_SQL.md`, and click **Run**.
3. This creates all core tables:
   - `branches`
   - `members`
   - `attendance_logs`
   - `expenses`
   - `products`
   - `sales`
   - `todos`
   - `rfid_pending` (Real-time hardware card registration table)

### 2. Hardware ESP32 / Arduino Integration
- Load the Arduino C++ code into your Arduino IDE.
- Connect your **MFRC522 RFID Reader** to SS Pin `5`, RST Pin `22`, and Buzzer Pin `4`.
- Copy your `BRANCH_ID` directly from the **Settings Page** of the Web Console and paste it into the code along with your Supabase URL & Anon Key.
