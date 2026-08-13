import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/landing")({
  component: () => {
    const nav = useNavigate();
    useEffect(() => {
      nav({ to: "/" });
    }, [nav]);
    return null;
  },
});
