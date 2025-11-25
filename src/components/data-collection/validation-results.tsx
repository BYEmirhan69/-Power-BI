"use client";

/**
 * Validation Results Component
 * Veri doğrulama sonuçlarını gösterir
 */

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ValidationResult, ValidationIssue } from "@/types/data-collection.types";

interface ValidationResultsProps {
  result: ValidationResult;
  onApplyFixes?: () => void;
  className?: string;
}

const SEVERITY_CONFIG = {
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "Hata",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    label: "Uyarı",
  },
  info: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Bilgi",
  },
};

const RULE_LABELS: Record<string, string> = {
  required: "Zorunlu Alan",
  type: "Tip Uyumsuzluğu",
  range: "Aralık Dışı",
  format: "Format Hatası",
  unique: "Tekrar Eden Değer",
  custom: "Özel Kural",
};

export function ValidationResults({
  result,
  onApplyFixes,
  className,
}: ValidationResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["errors"])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const validPercentage = Math.round(
    (result.validRows / result.totalRows) * 100
  );

  const groupedIssues = result.issues.reduce(
    (acc, issue) => {
      if (!acc[issue.severity]) {
        acc[issue.severity] = [];
      }
      acc[issue.severity].push(issue);
      return acc;
    },
    {} as Record<string, ValidationIssue[]>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {result.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Doğrulama Sonuçları
            </CardTitle>
            <CardDescription>
              {result.totalRows} satır analiz edildi
            </CardDescription>
          </div>
          {result.summary.autoFixed > 0 && onApplyFixes && (
            <Button variant="outline" size="sm" onClick={onApplyFixes}>
              <Wrench className="h-4 w-4 mr-2" />
              Düzeltmeleri Uygula ({result.summary.autoFixed})
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Geçerli Satırlar</span>
            <span className="font-medium">
              {result.validRows}/{result.totalRows} (%{validPercentage})
            </span>
          </div>
          <Progress
            value={validPercentage}
            className={cn(
              validPercentage === 100
                ? "[&>div]:bg-green-500"
                : validPercentage >= 80
                ? "[&>div]:bg-yellow-500"
                : "[&>div]:bg-red-500"
            )}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-red-500/10 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {result.summary.errors}
            </div>
            <div className="text-sm text-muted-foreground">Hata</div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {result.summary.warnings}
            </div>
            <div className="text-sm text-muted-foreground">Uyarı</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {result.summary.infos}
            </div>
            <div className="text-sm text-muted-foreground">Bilgi</div>
          </div>
        </div>

        {/* Issues List */}
        {result.issues.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium">Tüm veriler geçerli!</p>
            <p className="text-sm text-muted-foreground">
              Herhangi bir sorun tespit edilmedi.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(["error", "warning", "info"] as const).map((severity) => {
              const issues = groupedIssues[severity];
              if (!issues || issues.length === 0) return null;

              const config = SEVERITY_CONFIG[severity];
              const Icon = config.icon;
              const isExpanded = expandedSections.has(severity + "s");

              return (
                <div key={severity} className="border rounded-lg overflow-hidden">
                  <button
                    className={cn(
                      "w-full flex items-center justify-between p-4",
                      config.bg
                    )}
                    onClick={() => toggleSection(severity + "s")}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-5 w-5", config.color)} />
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="secondary">{issues.length}</Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <ScrollArea className="max-h-[300px]">
                      <div className="divide-y">
                        {issues.map((issue, index) => (
                          <IssueRow key={index} issue={issue} />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className="p-4 hover:bg-muted/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm">{issue.message}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {issue.row !== undefined && (
              <Badge variant="outline" className="text-xs">
                Satır {issue.row + 1}
              </Badge>
            )}
            {issue.column && (
              <Badge variant="outline" className="text-xs">
                Kolon: {issue.column}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {RULE_LABELS[issue.rule] || issue.rule}
            </Badge>
          </div>
        </div>
        {issue.value !== undefined && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Değer:</p>
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              {String(issue.value)}
            </code>
          </div>
        )}
      </div>
      {issue.suggestedFix !== undefined && (
        <div className="mt-2 p-2 bg-green-500/5 rounded border border-green-500/20">
          <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            Önerilen düzeltme:
            <code className="bg-muted px-1 py-0.5 rounded ml-1">
              {String(issue.suggestedFix)}
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
