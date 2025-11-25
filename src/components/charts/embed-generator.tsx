"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Code, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface EmbedConfig {
  width: string;
  height: string;
  theme: "light" | "dark" | "auto";
  showHeader: boolean;
  showLegend: boolean;
  interactive: boolean;
}

interface ChartEmbedGeneratorProps {
  chartId: string;
  chartName: string;
  embedToken?: string;
  baseUrl?: string;
  trigger?: React.ReactNode;
}

const DEFAULT_CONFIG: EmbedConfig = {
  width: "100%",
  height: "400",
  theme: "auto",
  showHeader: true,
  showLegend: true,
  interactive: true,
};

export function ChartEmbedGenerator({
  chartId,
  chartName,
  embedToken,
  baseUrl = typeof window !== "undefined" ? window.location.origin : "",
  trigger,
}: ChartEmbedGeneratorProps) {
  const [config, setConfig] = useState<EmbedConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState<string | null>(null);

  // Embed URL oluştur
  const getEmbedUrl = useCallback(() => {
    const params = new URLSearchParams({
      theme: config.theme,
      header: config.showHeader.toString(),
      legend: config.showLegend.toString(),
      interactive: config.interactive.toString(),
    });

    if (embedToken) {
      params.set("token", embedToken);
    }

    return `${baseUrl}/embed/chart/${chartId}?${params.toString()}`;
  }, [chartId, embedToken, baseUrl, config]);

  // Paylaşım URL'i oluştur
  const getShareUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (embedToken) {
      params.set("token", embedToken);
    }
    return `${baseUrl}/share/chart/${chartId}${params.toString() ? `?${params.toString()}` : ""}`;
  }, [chartId, embedToken, baseUrl]);

  // HTML iframe kodu oluştur
  const getIframeCode = useCallback(() => {
    const height = config.height.includes("%") ? config.height : `${config.height}px`;
    return `<iframe
  src="${getEmbedUrl()}"
  width="${config.width}"
  height="${height}"
  frameborder="0"
  allowfullscreen
  title="${chartName}"
  style="border: none; border-radius: 8px;"
></iframe>`;
  }, [config, getEmbedUrl, chartName]);

  // JavaScript embed kodu oluştur
  const getJsEmbedCode = useCallback(() => {
    return `<div id="chart-${chartId}"></div>
<script src="${baseUrl}/embed.js"></script>
<script>
  PowerBIEmbed.render({
    container: '#chart-${chartId}',
    chartId: '${chartId}',
    token: '${embedToken || "YOUR_TOKEN"}',
    width: '${config.width}',
    height: '${config.height}',
    theme: '${config.theme}',
    showHeader: ${config.showHeader},
    showLegend: ${config.showLegend},
    interactive: ${config.interactive}
  });
</script>`;
  }, [chartId, embedToken, baseUrl, config]);

  // React bileşen kodu oluştur
  const getReactCode = useCallback(() => {
    return `import { useEffect, useRef } from 'react';

function EmbeddedChart() {
  const containerRef = useRef(null);

  useEffect(() => {
    const iframe = document.createElement('iframe');
    iframe.src = '${getEmbedUrl()}';
    iframe.width = '${config.width}';
    iframe.height = '${config.height}';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.title = '${chartName}';
    
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(iframe);
    }
  }, []);

  return <div ref={containerRef} />;
}

export default EmbeddedChart;`;
  }, [config, getEmbedUrl, chartName]);

  // Panoya kopyala
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success("Kopyalandı!", {
        description: "Kod panoya kopyalandı.",
      });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Kopyalama başarısız", {
        description: "Lütfen manuel olarak kopyalayın.",
      });
    }
  };

  const CopyButton = ({ text, type }: { text: string; type: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyToClipboard(text, type)}
      className="gap-2"
    >
      {copied === type ? (
        <>
          <Check className="h-4 w-4" />
          Kopyalandı
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Kopyala
        </>
      )}
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Paylaş
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Grafik Paylaş & Embed
          </DialogTitle>
          <DialogDescription>
            {chartName} grafiğini paylaşın veya web sitenize ekleyin.
          </DialogDescription>
        </DialogHeader>

        {/* Ayarlar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b">
          <div className="space-y-2">
            <Label htmlFor="width">Genişlik</Label>
            <Input
              id="width"
              value={config.width}
              onChange={(e) => setConfig({ ...config, width: e.target.value })}
              placeholder="100% veya 600"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Yükseklik</Label>
            <Input
              id="height"
              value={config.height}
              onChange={(e) => setConfig({ ...config, height: e.target.value })}
              placeholder="400"
            />
          </div>
          <div className="space-y-2">
            <Label>Tema</Label>
            <Select
              value={config.theme}
              onValueChange={(v) => setConfig({ ...config, theme: v as EmbedConfig["theme"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Otomatik</SelectItem>
                <SelectItem value="light">Açık</SelectItem>
                <SelectItem value="dark">Koyu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Seçenekler</Label>
            <div className="flex flex-col gap-1 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showHeader}
                  onChange={(e) => setConfig({ ...config, showHeader: e.target.checked })}
                  className="rounded"
                />
                Başlık
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showLegend}
                  onChange={(e) => setConfig({ ...config, showLegend: e.target.checked })}
                  className="rounded"
                />
                Legend
              </label>
            </div>
          </div>
        </div>

        {/* Kod Tabs */}
        <Tabs defaultValue="share" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="share">Paylaş</TabsTrigger>
            <TabsTrigger value="iframe">iframe</TabsTrigger>
            <TabsTrigger value="js">JavaScript</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
          </TabsList>

          {/* Paylaşım Linki */}
          <TabsContent value="share" className="space-y-4">
            <div className="space-y-2">
              <Label>Paylaşım Linki</Label>
              <div className="flex gap-2">
                <Input value={getShareUrl()} readOnly className="font-mono text-sm" />
                <CopyButton text={getShareUrl()} type="share" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(getShareUrl(), "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* iframe Kodu */}
          <TabsContent value="iframe" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>HTML iframe Kodu</Label>
                <CopyButton text={getIframeCode()} type="iframe" />
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm font-mono">
                <code>{getIframeCode()}</code>
              </pre>
            </div>
          </TabsContent>

          {/* JavaScript Kodu */}
          <TabsContent value="js" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>JavaScript Embed Kodu</Label>
                <CopyButton text={getJsEmbedCode()} type="js" />
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                <code>{getJsEmbedCode()}</code>
              </pre>
            </div>
          </TabsContent>

          {/* React Kodu */}
          <TabsContent value="react" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>React Bileşen Kodu</Label>
                <CopyButton text={getReactCode()} type="react" />
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                <code>{getReactCode()}</code>
              </pre>
            </div>
          </TabsContent>
        </Tabs>

        {/* Önizleme */}
        <div className="mt-4 p-4 border rounded-lg bg-muted/50">
          <Label className="text-muted-foreground text-sm">Önizleme</Label>
          <div
            className="mt-2 bg-background rounded-lg border overflow-hidden"
            style={{
              width: config.width.includes("%") ? "100%" : `${config.width}px`,
              height: `${parseInt(config.height) / 2}px`,
            }}
          >
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <div className="text-center">
                <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Grafik önizlemesi burada görünecek</p>
                <p className="text-xs mt-1">
                  {config.width} × {config.height}px
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
