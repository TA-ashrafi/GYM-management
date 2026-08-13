import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  component: () => {
    const nav = useNavigate();
    useEffect(() => {
      nav({ to: "/auth", search: { mode: "login" } });
    }, [nav]);
    return null;
  },
});
