import { createFileRoute } from "@tanstack/react-router";
import { IdeApp } from "@/components/ide/IdeApp.tsx";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <IdeApp />;
}
