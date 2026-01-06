/**
 * FASE 40: ONBOARDING LAYOUT ISOLADO
 * Layout específico para onboarding - SEM header, SEM sidebar
 */

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {children}
    </div>
  )
}
