import { Star } from "lucide-react"

interface PremiumBadgeProps {
  isPremium: boolean
  displayName: string
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
}

export function PremiumBadge({ 
  isPremium, 
  displayName, 
  size = "md",
  showIcon = true 
}: PremiumBadgeProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <span className={`flex items-center gap-1 ${sizeClasses[size]}`}>
      <span className={isPremium ? "text-yellow-500 font-bold" : "text-zinc-100 font-medium"}>
        {displayName}
      </span>
      {isPremium && showIcon && (
        <Star className={`${iconSizes[size]} text-yellow-500 fill-yellow-500`} />
      )}
    </span>
  )
}
