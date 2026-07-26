import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useGym } from "@/lib/gym-store";
import { fetchMembers } from "@/lib/supabase";

export const Route = createFileRoute("/tools")({
  head: () => ({ meta: [{ title: "Fitness Tools — IronSync" }] }),
  component: Tools,
});

function Tools() {
  const [activeTab, setActiveTab] = useState<"bmi" | "calorie" | "protein" | "fat" | "diet">("bmi");
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const [form, setForm] = useState({
    weight: 70,
    height: 170,
    age: 25,
    gender: "M" as "M" | "F",
    goal: "General Fitness",
    workoutDays: 3,
    activityLevel: "moderate" as "sedentary" | "light" | "moderate" | "active" | "veryActive",
  });

  // Fetch members on mount
  useEffect(() => {
    fetchMembers().then(setMembers);
  }, []);

  // Auto-fill form when a member is selected
  function handleMemberSelect(id: string) {
    setSelectedMemberId(id);
    const m = members.find((x) => x.id === id);
    if (m) {
      setForm({
        weight: m.weightKg ?? 70,
        height: m.heightCm ?? 170,
        age: m.age ?? 25,
        gender: m.gender ?? "M",
        goal: m.goal ?? "General Fitness",
        workoutDays: 3,
        activityLevel: "moderate",
      });
    }
  }

  // Calculate BMI
  const bmi = form.weight / ((form.height / 100) ** 2);

  // Calculate BMR
  const bmr = form.gender === "M"
    ? 88.36 + (13.4 * form.weight) + (4.8 * form.height) - (5.7 * form.age)
    : 447.6 + (9.2 * form.weight) + (3.1 * form.height) - (4.3 * form.age);

  const activityMult = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  }[form.activityLevel] ?? 1.55;

  // Calculate TDEE and target calories
  const tdee = bmr * activityMult;
  const targetCals = form.goal === "Fat Loss / Cuts" ? tdee - 500
    : form.goal === "Muscle Gain" ? tdee + 300
    : tdee;

  // Calculate macros
  const protein = form.weight * 2.0; // grams
  const fat = (targetCals * 0.25) / 9; // grams
  const carbs = (targetCals - (protein * 4) - (fat * 9)) / 4; // grams

  return (
    <div className="p-8 max-w-[1600px]">
      <PageHeader title="Fitness Tools" subtitle="BMI · TDEE · Macros · Diet Plan Generator" />

      {/* Member Quick Load */}
      <div className="mb-6 bg-card border border-border rounded-xl p-4">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">
          Quick Load Member
        </label>
        <select
          value={selectedMemberId}
          onChange={(e) => handleMemberSelect(e.target.value)}
          className="w-full px-3 py-2 bg-secondary rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/40"
        >
          <option value="">— Manual Entry —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.rollNo})</option>
          ))}
        </select>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-border pb-1">
        {(["bmi", "calorie", "protein", "fat", "diet"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm rounded-lg capitalize transition ${activeTab === tab ? "bg-brand text-brand-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {tab === "bmi" ? "BMI" : tab === "calorie" ? "Calorie / TDEE" : tab === "protein" ? "Protein" : tab === "fat" ? "Fat %" : "Diet Plan"}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-heading text-lg mb-4">Inputs</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Height (cm)</label>
              <input type="number" value={form.height} onChange={(e) => setForm(f => ({ ...f, height: +e.target.value }))} className="w-full px-3 py-2 bg-secondary rounded-lg" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Weight (kg)</label>
              <input type="number" value={form.weight} onChange={(e) => setForm(f => ({ ...f, weight: +e.target.value }))} className="w-full px-3 py-2 bg-secondary rounded-lg" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Age</label>
              <input type="number" value={form.age} onChange={(e) => setForm(f => ({ ...f, age: +e.target.value }))} className="w-full px-3 py-2 bg-secondary rounded-lg" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Gender</label>
              <select value={form.gender} onChange={(e) => setForm(f => ({ ...f, gender: e.target.value as "M" | "F" }))} className="w-full px-3 py-2 bg-secondary rounded-lg">
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Activity Level</label>
              <select value={form.activityLevel} onChange={(e) => setForm(f => ({ ...f, activityLevel: e.target.value as any }))} className="w-full px-3 py-2 bg-secondary rounded-lg">
                <option value="sedentary">Sedentary (desk job)</option>
                <option value="light">Light (1-3 days/week)</option>
                <option value="moderate">Moderate (3-5 days/week)</option>
                <option value="active">Active (6-7 days/week)</option>
                <option value="veryActive">Very Active / Athlete</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Fitness Goal</label>
              <select value={form.goal} onChange={(e) => setForm(f => ({ ...f, goal: e.target.value }))} className="w-full px-3 py-2 bg-secondary rounded-lg">
                <option value="Muscle Gain">Muscle Gain</option>
                <option value="Fat Loss / Cuts">Fat Loss / Cuts</option>
                <option value="Weight Loss">Weight Loss</option>
                <option value="General Fitness">General Fitness</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* BMI Tab */}
          {activeTab === "bmi" && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <h3 className="text-6xl font-heading">{bmi.toFixed(1)}</h3>
              <p className="text-2xl mt-2">BMI</p>
              <p className="text-lg mt-4 text-muted-foreground">
                {bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"}
              </p>
            </div>
          )}

          {/* Calorie / TDEE Tab */}
          {activeTab === "calorie" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">BMR (Resting)</p>
                <p className="text-5xl font-heading mt-1">{Math.round(bmr)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">TDEE (Daily)</p>
                <p className="text-5xl font-heading mt-1 text-brand">{Math.round(tdee)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Target Calories</p>
                <p className="text-5xl font-heading mt-1">{Math.round(targetCals)}</p>
              </div>
            </div>
          )}

          {/* Protein Tab */}
          {activeTab === "protein" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Daily Protein Requirement</p>
                <p className="text-5xl font-heading mt-1 text-brand">{Math.round(protein)}g</p>
                <p className="text-sm text-muted-foreground mt-2">Based on {form.weight}kg body weight × 2.0g/kg</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/40 rounded-lg">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Per Meal</p>
                  <p className="text-2xl font-heading">{Math.round(protein / 4)}g</p>
                  <p className="text-xs text-muted-foreground">(4 meals)</p>
                </div>
                <div className="p-4 bg-secondary/40 rounded-lg">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Per Kg</p>
                  <p className="text-2xl font-heading">2.0g</p>
                  <p className="text-xs text-muted-foreground">Body weight</p>
                </div>
              </div>
            </div>
          )}

          {/* Fat Tab */}
          {activeTab === "fat" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Daily Fat Requirement</p>
                <p className="text-5xl font-heading mt-1 text-brand">{Math.round(fat)}g</p>
                <p className="text-sm text-muted-foreground mt-2">25% of target calories</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/40 rounded-lg">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Saturated Fat</p>
                  <p className="text-2xl font-heading">{Math.round(fat * 0.3)}g</p>
                  <p className="text-xs text-muted-foreground">Max 30% of total fat</p>
                </div>
                <div className="p-4 bg-secondary/40 rounded-lg">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Per Meal</p>
                  <p className="text-2xl font-heading">{Math.round(fat / 4)}g</p>
                  <p className="text-xs text-muted-foreground">(4 meals)</p>
                </div>
              </div>
            </div>
          )}

          {/* Diet Plan Tab */}
          {activeTab === "diet" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Daily Macros</p>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="p-4 bg-secondary/40 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Protein</p>
                    <p className="text-2xl font-heading text-brand">{Math.round(protein)}g</p>
                  </div>
                  <div className="p-4 bg-secondary/40 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Carbs</p>
                    <p className="text-2xl font-heading text-warn">{Math.round(carbs)}g</p>
                  </div>
                  <div className="p-4 bg-secondary/40 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Fat</p>
                    <p className="text-2xl font-heading text-danger">{Math.round(fat)}g</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-brand/10 border border-brand/20 rounded-lg">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Calorie Distribution</p>
                <div className="flex h-4 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-brand" style={{ width: `${(protein * 4 / targetCals) * 100}%` }} />
                  <div className="h-full bg-warn" style={{ width: `${(carbs * 4 / targetCals) * 100}%` }} />
                  <div className="h-full bg-danger" style={{ width: `${(fat * 9 / targetCals) * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Protein {Math.round((protein * 4 / targetCals) * 100)}%</span>
                  <span>Carbs {Math.round((carbs * 4 / targetCals) * 100)}%</span>
                  <span>Fat {Math.round((fat * 9 / targetCals) * 100)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Sample Meal Plan</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-3 bg-secondary/40 rounded-lg">
                    <p className="font-semibold">Breakfast</p>
                    <p className="text-muted-foreground text-xs">Oats, eggs, milk</p>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-lg">
                    <p className="font-semibold">Lunch</p>
                    <p className="text-muted-foreground text-xs">Chicken/rice/veg</p>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-lg">
                    <p className="font-semibold">Snack</p>
                    <p className="text-muted-foreground text-xs">Fruits, nuts</p>
                  </div>
                  <div className="p-3 bg-secondary/40 rounded-lg">
                    <p className="font-semibold">Dinner</p>
                    <p className="text-muted-foreground text-xs">Fish/tofu/salad</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}