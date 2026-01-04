"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { useAuth, useUser } from "@clerk/nextjs"
import { api } from "../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TestAuthDetailedPage() {
  const { getToken, isLoaded: authLoaded, userId } = useAuth()
  const { user } = useUser()
  const testAuth = useMutation(api.authTest.testAuthDetailed)
  const [testResult, setTestResult] = useState<any>(null)
  const [clerkToken, setClerkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleTestAuth = async () => {
    setLoading(true)
    try {
      // Get Clerk token
      const token = await getToken({ template: "convex" })
      setClerkToken(token)
      
      // Test Convex auth
      const result = await testAuth()
      setTestResult(result)
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-4xl font-bold text-zinc-100">
        🔍 Debug Detalhado de Autenticação
      </h1>

      <div className="space-y-6">
        <Card className="border-zinc-800 bg-faceit-panel">
          <CardHeader>
            <CardTitle>1. Clerk Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="text-zinc-400">Auth Loaded:</span>{" "}
                <span className={authLoaded ? "text-green-600" : "text-red-600"}>
                  {authLoaded ? "✓ Sim" : "✗ Não"}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">User ID:</span>{" "}
                <span className="text-zinc-100">{userId || "null"}</span>
              </div>
              <div>
                <span className="text-zinc-400">Username:</span>{" "}
                <span className="text-zinc-100">
                  {user?.username || user?.firstName || "null"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-faceit-panel">
          <CardHeader>
            <CardTitle>2. Teste de Token JWT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleTestAuth}
              disabled={loading || !authLoaded}
              className="w-full"
            >
              {loading ? "A testar..." : "Testar Autenticação"}
            </Button>

            {clerkToken && (
              <div className="space-y-2">
                <p className="font-bold text-zinc-100">Token JWT do Clerk:</p>
                <div className="overflow-x-auto rounded bg-zinc-900 p-3">
                  <code className="text-xs text-green-600">
                    {clerkToken.substring(0, 50)}...
                  </code>
                </div>
                <p className="text-xs text-zinc-400">
                  ✓ Clerk conseguiu gerar token com template "convex"
                </p>
              </div>
            )}

            {clerkToken === null && testResult && (
              <div className="rounded border border-red-600 bg-red-600/10 p-4">
                <p className="font-bold text-red-600">
                  ✗ Clerk NÃO conseguiu gerar token
                </p>
                <p className="mt-2 text-sm text-red-600">
                  O template JWT "convex" não está configurado corretamente no
                  Clerk Dashboard.
                </p>
              </div>
            )}

            {testResult && (
              <div className="space-y-2">
                <p className="font-bold text-zinc-100">Resultado do Convex:</p>
                <div className="overflow-x-auto rounded bg-zinc-900 p-3">
                  <pre className="text-xs text-zinc-100">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
                {testResult.success && testResult.hasIdentity ? (
                  <p className="text-sm text-green-600">
                    ✓ Convex recebeu e validou o token JWT!
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    ✗ Convex não conseguiu validar o token
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-faceit-panel">
          <CardHeader>
            <CardTitle>3. Checklist de Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded border border-zinc-700" />
                <div>
                  <p className="font-bold text-zinc-100">
                    JWT Template "convex" no Clerk
                  </p>
                  <p className="text-zinc-400">
                    Dashboard → JWT Templates → Template "convex" (minúsculas)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded border border-zinc-700" />
                <div>
                  <p className="font-bold text-zinc-100">
                    CLERK_ISSUER_URL no Convex
                  </p>
                  <p className="text-zinc-400">
                    Dashboard → Settings → Environment Variables (ambiente DEV)
                  </p>
                  <p className="text-zinc-400">
                    Value: https://powerful-doberman-93.clerk.accounts.dev
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded border border-zinc-700" />
                <div>
                  <p className="font-bold text-zinc-100">
                    Reiniciar npx convex dev
                  </p>
                  <p className="text-zinc-400">
                    Depois de adicionar CLERK_ISSUER_URL
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
