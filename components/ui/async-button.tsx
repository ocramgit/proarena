/**
 * FASE 41: ASYNC BUTTON
 * Button component with built-in loading state and double-click prevention
 */

import { useState } from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface AsyncButtonProps extends Omit<ButtonProps, "onClick"> {
  onClick: () => Promise<void> | void
  loadingText?: string
}

export function AsyncButton({
  onClick,
  children,
  loadingText,
  disabled,
  ...props
}: AsyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (isLoading) return // Prevent double clicks

    setIsLoading(true)
    try {
      await onClick()
    } catch (error) {
      console.error("AsyncButton error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {loadingText || "A processar..."}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
