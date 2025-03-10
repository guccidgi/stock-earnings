"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        className
      )}
      style={{ width: '2rem', height: '2rem' }}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square", className)}
      style={{ width: '100%', height: '100%' }}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex items-center justify-center rounded-full",
        className
      )}
      style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: 'hsl(var(--muted, 210 40% 96.1%))',
        color: 'hsl(var(--muted-foreground, 215.4 16.3% 46.9%))'
      }}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
