"use client"

import * as React from "react"
import {
  BicepsFlexed,
  BookOpen,
  Bot,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Pose",
      url: "/dev/pose",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "3D Pose Estimation",
          url: "/dev/pose/pose-estimation",
        },
        {
          title: "3D Pose Visualization",
          url: "/dev/pose/pose-visualization",
        },
        {
          title: "Pose Classification",
          url: "/dev/pose/pose-classification",
        },
      ],
    },
    {
      title: "Exercise",
      url: "/dev/exercise",
      icon: BicepsFlexed,
      items: [
        {
          title: "Squat",
          url: "/dev/exercise/squat",
        },
      ],
    },
  ],
  projects: [
    {
      name: "UI/UX Design",
      url: "#",
      icon: Frame,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Home Fitness Service</span>
                  <span className="truncate text-xs">Test Platform</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
    </Sidebar>
  )
}
