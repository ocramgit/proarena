"use client"

import { useQuery } from "convex/react"
import { useAuth, useUser } from "@clerk/nextjs"
import { api } from "../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function DiagnosticsPage() {
  const { getToken, isLoaded, userId } = useAuth()
  const { user } = useUser()
  const serverConfig = useQuery(api.diagnostics.checkServerConfig)
  const [tokenInfo, setTokenInfo] = useState<any>(null)

  const checkToken = async () => {
    try {
      const token = await getToken({ template: "convex" })
      if (token) {
        // Decode JWT to see what's inside (just the payload, not validating)
        const parts = token.split('.')
        const payload = JSON.parse(atob(parts[1]))
        setTokenInfo({
          hasToken: true,
          payload: payload,
          tokenPreview: token.substring(0, 50) + "..."
        })
      } else {
        setTokenInfo({
          hasToken: false,
          error: "No token generated - JWT template 'convex' not found in Clerk"
        })
      }
    } catch (error: any) {
      setTokenInfo({
        hasToken: false,
        error: error.message
      })
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-4xl font-bold text-zinc-100">
        🔧 Diagnóstico Completo
      </h1>

      <div className="space-y-6">
        {/* Clerk Status */}
        <Card className="border-zinc-800 bg-faceit-panel">
          <CardHeader>
            <CardTitle>1. Clerk (Frontend)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Loaded:</span>
                <span className={isLoaded ? "text-green-600" : "text-red-600"}>
                  {isLoaded ? "✓" : "✗"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">User ID:</span>
                <span className="text-zinc-100">{userId || "null"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Username:</span>
                <span className="text-zinc-100">
                  {user?.username || user?.firstName || "null"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* JWT Token Check */}
        <Card className="border-zinc-800 bg-faceit-panel">
          <CardHeader>
            <CardTitle>2. JWT Token (Clerk → Convex)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkToken} disabled={!isLoaded}>
              Verificar Token JWT
            </Button>

            {tokenInfo && (
              <div className="space-y-2">
                {tokenInfo.hasToken ? (
                  <>
                    <div className="rounded bg-green-900/20 p-3">
                      <p className="font-bold text-green-600">
                        ✓ Token JWT gerado com sucesso
                      </p>
                      <p className="mt-2 text-xs text-green-600">
                        {tokenInfo.tokenPreview}
                      </p>
                    </div>
                    <div className="rounded bg-zinc-900 p-3">
                      <p className="mb-2 text-sm font-bold text-zinc-100">
                        Payload do Token:
                      </p>
                      <pre className="overflow-x-auto text-xs text-zinc-400">
                        {JSON.stringify(tokenInfo.payload, null, 2)}
                      </pre>
                    </div>
                    <div className="text-sm text-zinc-400">
                      <p className="font-bold">Verifica se o token tem:</p>
                      <ul className="ml-4 mt-1 list-disc">
                        <li>
                          <code>iss</code> (issuer): deve ser{" "}
                          <code>https://powerful-doberman-93.clerk.accounts.dev</code>
                        </li>
                        <li>
                          <code>sub</code> (subject): teu user ID do Clerk
                        </li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="rounded bg-red-900/20 p-3">
                    <p className="font-bold text-red-600">
                      ✗ Erro ao gerar token
                    </p>
                    <p className="mt-2 text-sm text-red-600">
                      {tokenInfo.error}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Convex Server Check */}
        <Card className="border-zinc-800 bg-faceit-panel">
          <CardHeader>
            <CardTitle>3. Convex (Backend)</CardTitle>
          </CardHeader>
          <CardContent>
            {serverConfig === undefined ? (
              <div className="text-zinc-400">A carregar...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Has Identity:</span>
                  <span
                    className={
                      serverConfig.hasIdentity ? "text-green-600" : "text-red-600"
                    }
                  >
                    {serverConfig.hasIdentity ? "✓" : "✗"}
                  </span>
                </div>

                {serverConfig.identityDetails && (
                  <div className="rounded bg-zinc-900 p-3">
                    <p className="mb-2 text-sm font-bold text-zinc-100">
                      Identity Details:
                    </p>
                    <pre className="overflow-x-auto text-xs text-zinc-400">
                      {JSON.stringify(serverConfig.identityDetails, null, 2)}
                    </pre>
                  </div>
                )}

                <div
                  className={`rounded p-3 ${
                    serverConfig.hasIdentity
                      ? "bg-green-900/20"
                      : "bg-yellow-900/20"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      serverConfig.hasIdentity
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {serverConfig.message}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Final Verdict */}
        <Card
          className={`border-2 ${
            serverConfig?.hasIdentity
              ? "border-green-600 bg-green-600/10"
              : "border-red-600 bg-red-600/10"
          }`}
        >
          <CardHeader>
            <CardTitle
              className={
                serverConfig?.hasIdentity ? "text-green-600" : "text-red-600"
              }
            >
              {serverConfig?.hasIdentity
                ? "✓ AUTENTICAÇÃO FUNCIONANDO"
                : "✗ AUTENTICAÇÃO FALHANDO"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serverConfig?.hasIdentity ? (
              <div className="space-y-2 text-sm text-green-600">
                <p className="font-bold">Tudo está a funcionar!</p>
                <p>Podes voltar ao Dashboard e entrar na queue.</p>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-red-600">
                <p className="font-bold">O Convex não está a validar o token JWT.</p>
                <p className="font-bold">Causa mais provável:</p>
                <p>
                  A variável <code>CLERK_ISSUER_URL</code> NÃO está configurada
                  no Convex Dashboard, ou o servidor não foi reiniciado depois
                  de adicionar.
                </p>
                <div className="mt-4 rounded border border-red-600 bg-red-900/20 p-3">
                  <p className="font-bold">SOLUÇÃO:</p>
                  <ol className="ml-4 mt-2 list-decimal space-y-1">
                    <li>
                      Vai a:{" "}
                      <a
                        href="https://dashboard.convex.dev/t/marco-silva/proarena/dev:amicable-wren-703/settings/environment-variables"
                        target="_blank"
                        className="underline"
                      >
                        Convex Dashboard → Environment Variables
                      </a>
                    </li>
                    <li>
                      Adiciona: Key = <code>CLERK_ISSUER_URL</code>, Value ={" "}
                      <code>https://powerful-doberman-93.clerk.accounts.dev</code>
                    </li>
                    <li>
                      Reinicia: <code>npx convex dev</code> (Ctrl+C e reinicia)
                    </li>
                    <li>Faz refresh nesta página</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
