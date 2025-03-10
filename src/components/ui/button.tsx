import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none",
  {
    variants: {
      variant: {
        default: "text-white hover:opacity-90",
        destructive: "text-white hover:opacity-90",
        outline: "border hover:opacity-80",
        secondary: "hover:opacity-80",
        ghost: "hover:opacity-80",
        link: "underline-offset-4 hover:underline",
      },
      size: {
        default: "",
        sm: "",
        lg: "",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  
  // 根據變體設置內聯樣式
  const getStyles = () => {
    const baseStyles = {
      height: size === 'sm' ? '2rem' : size === 'lg' ? '2.5rem' : '2.25rem',
      padding: size === 'icon' ? '0.5rem' : size === 'sm' ? '0 0.75rem' : size === 'lg' ? '0 1.5rem' : '0 1rem',
      borderRadius: '0.375rem',
    };
    
    const variantStyles = {
      default: {
        backgroundColor: 'hsl(var(--primary, 222.2 47.4% 11.2%))',
        color: 'hsl(var(--primary-foreground, 210 40% 98%))',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      },
      destructive: {
        backgroundColor: 'hsl(var(--destructive, 0 84.2% 60.2%))',
        color: 'white',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      },
      outline: {
        backgroundColor: 'hsl(var(--background, 0 0% 100%))',
        color: 'hsl(var(--foreground, 222.2 84% 4.9%))',
        border: '1px solid hsl(var(--input, 214.3 31.8% 91.4%))',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      },
      secondary: {
        backgroundColor: 'hsl(var(--secondary, 210 40% 96.1%))',
        color: 'hsl(var(--secondary-foreground, 222.2 47.4% 11.2%))',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'hsl(var(--foreground, 222.2 84% 4.9%))'
      },
      link: {
        backgroundColor: 'transparent',
        color: 'hsl(var(--primary, 222.2 47.4% 11.2%))',
        boxShadow: 'none',
        padding: 0,
        height: 'auto'
      }
    };
    
    return { ...baseStyles, ...(variant ? variantStyles[variant] : variantStyles.default) };
  };

  return (
    <Comp
      data-slot="button"
      style={getStyles()}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
