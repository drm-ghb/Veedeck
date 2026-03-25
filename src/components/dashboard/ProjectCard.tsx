"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ProjectMenu from "./ProjectMenu";

interface ProjectCardProps {
  id: string;
  title: string;
  clientName?: string | null;
  clientEmail?: string | null;
  description?: string | null;
  renderCount: number;
  createdAt: string;
  shareToken: string;
}

export default function ProjectCard({
  id,
  title,
  clientName,
  clientEmail,
  description,
  renderCount,
  createdAt,
  shareToken,
}: ProjectCardProps) {
  function copyShareLink() {
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany do schowka");
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{title}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="secondary">{renderCount} renderów</Badge>
            <ProjectMenu
              project={{ id, title, clientName, clientEmail, description }}
            />
          </div>
        </div>

        {(clientName || clientEmail) && (
          <div className="flex flex-col gap-0.5 mt-1">
            {clientName && (
              <p className="text-sm text-gray-600 font-medium">{clientName}</p>
            )}
            {clientEmail && (
              <p className="text-xs text-gray-400">{clientEmail}</p>
            )}
          </div>
        )}

        {description && (
          <CardDescription className="line-clamp-2 mt-1">{description}</CardDescription>
        )}

        <p className="text-xs text-gray-400 mt-1">
          {new Date(createdAt).toLocaleDateString("pl-PL")}
        </p>
      </CardHeader>
      <CardFooter className="flex gap-2 flex-wrap">
        <Button asChild size="sm">
          <Link href={`/projects/${id}`}>Otwórz</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={copyShareLink}>
          Skopiuj link
        </Button>
      </CardFooter>
    </Card>
  );
}
