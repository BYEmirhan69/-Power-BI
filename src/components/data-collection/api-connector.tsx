"use client";

/**
 * API Connector Component
 * REST API bağlantısı kurma ve test etme
 */

import { useState } from "react";
import { 
  Globe, 
  Key, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ApiRequestConfig, AuthConfig } from "@/types/data-collection.types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type AuthType = "none" | "bearer" | "api_key" | "basic";
type KeyLocation = "header" | "query";

interface ApiFormValues {
  url: string;
  method: HttpMethod;
  authType: AuthType;
  bearerToken: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyLocation: KeyLocation;
  basicUsername: string;
  basicPassword: string;
  headers: string;
  timeout: number;
}

interface ApiConnectorProps {
  onConnect?: (config: ApiRequestConfig, data: unknown) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function ApiConnector({ onConnect, onError, className }: ApiConnectorProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fetchedData, setFetchedData] = useState<unknown>(null);

  const [formValues, setFormValues] = useState<ApiFormValues>({
    url: "",
    method: "GET",
    authType: "none",
    bearerToken: "",
    apiKeyName: "",
    apiKeyValue: "",
    apiKeyLocation: "header",
    basicUsername: "",
    basicPassword: "",
    headers: "",
    timeout: 30000,
  });

  const updateField = <K extends keyof ApiFormValues>(field: K, value: ApiFormValues[K]) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  const buildConfig = (): ApiRequestConfig => {
    let auth: AuthConfig;

    switch (formValues.authType) {
      case "bearer":
        auth = {
          type: "bearer",
          token: formValues.bearerToken || "",
        };
        break;
      case "api_key":
        auth = {
          type: "api_key",
          key: formValues.apiKeyName || "",
          value: formValues.apiKeyValue || "",
          location: formValues.apiKeyLocation || "header",
        };
        break;
      case "basic":
        auth = {
          type: "basic",
          username: formValues.basicUsername || "",
          password: formValues.basicPassword || "",
        };
        break;
      default:
        auth = { type: "none" };
    }

    let headers: Record<string, string> | undefined;
    if (formValues.headers) {
      try {
        headers = JSON.parse(formValues.headers);
      } catch {
        // Invalid JSON, ignore
      }
    }

    return {
      url: formValues.url,
      method: formValues.method,
      auth,
      headers,
      timeout: formValues.timeout,
      retryCount: 3,
      retryDelay: 1000,
    };
  };

  const testConnection = async () => {
    if (!formValues.url) {
      onError?.("URL gerekli");
      return;
    }

    const config = buildConfig();

    setIsTestingConnection(true);
    setConnectionStatus("idle");

    try {
      const response = await fetch("/api/data-collection/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus("success");
        setConnectionMessage(`Bağlantı başarılı (${result.latency}ms)`);
      } else {
        setConnectionStatus("error");
        setConnectionMessage(result.message || "Bağlantı başarısız");
        onError?.(result.message);
      }
    } catch (error) {
      setConnectionStatus("error");
      setConnectionMessage((error as Error).message);
      onError?.((error as Error).message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const fetchData = async () => {
    const config = buildConfig();

    setIsFetchingData(true);

    try {
      const response = await fetch("/api/data-collection/api/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      const result = await response.json();

      if (result.success) {
        setFetchedData(result.data);
        onConnect?.(config, result.data);
      } else {
        onError?.(result.error);
      }
    } catch (error) {
      onError?.((error as Error).message);
    } finally {
      setIsFetchingData(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          API Bağlantısı
        </CardTitle>
        <CardDescription>
          REST API endpoint&apos;ine bağlanın ve veri çekin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url">API URL</Label>
            <Input
              id="url"
              placeholder="https://api.example.com/data"
              value={formValues.url}
              onChange={(e) => updateField("url", e.target.value)}
            />
          </div>

          {/* Method */}
          <div className="space-y-2">
            <Label>HTTP Metodu</Label>
            <Select
              value={formValues.method}
              onValueChange={(value) => updateField("method", value as HttpMethod)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Metod seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auth Type */}
          <div className="space-y-2">
            <Label>Kimlik Doğrulama</Label>
            <Select
              value={formValues.authType}
              onValueChange={(value) => updateField("authType", value as AuthType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auth tipi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Yok</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="api_key">API Key</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bearer Token */}
          {formValues.authType === "bearer" && (
            <div className="space-y-2">
              <Label htmlFor="bearerToken">Bearer Token</Label>
              <Input
                id="bearerToken"
                type="password"
                placeholder="Token"
                value={formValues.bearerToken}
                onChange={(e) => updateField("bearerToken", e.target.value)}
              />
            </div>
          )}

          {/* API Key */}
          {formValues.authType === "api_key" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKeyName">Key İsmi</Label>
                  <Input
                    id="apiKeyName"
                    placeholder="X-API-Key"
                    value={formValues.apiKeyName}
                    onChange={(e) => updateField("apiKeyName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Konum</Label>
                  <Select
                    value={formValues.apiKeyLocation}
                    onValueChange={(value) => updateField("apiKeyLocation", value as KeyLocation)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="query">Query Param</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKeyValue">API Key Değeri</Label>
                <Input
                  id="apiKeyValue"
                  type="password"
                  placeholder="your-api-key"
                  value={formValues.apiKeyValue}
                  onChange={(e) => updateField("apiKeyValue", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Basic Auth */}
          {formValues.authType === "basic" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basicUsername">Kullanıcı Adı</Label>
                <Input
                  id="basicUsername"
                  value={formValues.basicUsername}
                  onChange={(e) => updateField("basicUsername", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basicPassword">Şifre</Label>
                <Input
                  id="basicPassword"
                  type="password"
                  value={formValues.basicPassword}
                  onChange={(e) => updateField("basicPassword", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Advanced Options */}
          <div>
            <Button
              type="button"
              variant="ghost"
              className="p-0 h-auto text-sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 mr-1" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-1" />
              )}
              Gelişmiş Ayarlar
            </Button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headers">Ek Header&apos;lar (JSON)</Label>
                  <Input
                    id="headers"
                    placeholder='{"Content-Type": "application/json"}'
                    value={formValues.headers}
                    onChange={(e) => updateField("headers", e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    JSON formatında ek header&apos;lar ekleyin
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={formValues.timeout}
                    onChange={(e) => updateField("timeout", parseInt(e.target.value) || 30000)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Connection Status */}
          {connectionStatus !== "idle" && (
            <div
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                connectionStatus === "success"
                  ? "bg-green-500/10 text-green-700 dark:text-green-300"
                  : "bg-red-500/10 text-red-700 dark:text-red-300"
              )}
            >
              {connectionStatus === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{connectionMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={isTestingConnection || !formValues.url}
            >
              {isTestingConnection ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Bağlantıyı Test Et
            </Button>
            <Button
              type="button"
              onClick={fetchData}
              disabled={isFetchingData || connectionStatus !== "success"}
            >
              {isFetchingData ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Veri Çek
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
