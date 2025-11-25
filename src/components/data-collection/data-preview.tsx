"use client";

/**
 * Data Preview Table Component
 * Veri önizleme ve kolon bilgileri
 */

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnInfo, ClassificationResult } from "@/types/data-collection.types";

interface DataPreviewProps {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
  classification?: ClassificationResult | null;
  pageSize?: number;
  className?: string;
  onExport?: (format: "csv" | "json") => void;
}

const TYPE_COLORS: Record<string, string> = {
  string: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  number: "bg-green-500/10 text-green-700 dark:text-green-300",
  date: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  boolean: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  json: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  mixed: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

const CATEGORY_LABELS: Record<string, string> = {
  time_series: "Zaman Serisi",
  behavioral: "Davranışsal",
  technological: "Teknolojik",
  financial: "Finansal",
  other: "Genel",
};

export function DataPreview({
  data,
  columns,
  classification,
  pageSize = 10,
  className,
  onExport,
}: DataPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => !hiddenColumns.has(col.name));
  }, [columns, hiddenColumns]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some(
        (value) => value && String(value).toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const toggleColumn = (columnName: string) => {
    const newHidden = new Set(hiddenColumns);
    if (newHidden.has(columnName)) {
      newHidden.delete(columnName);
    } else {
      newHidden.add(columnName);
    }
    setHiddenColumns(newHidden);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "Evet" : "Hayır";
    return String(value);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Veri Önizleme</CardTitle>
            <CardDescription>
              {filteredData.length} satır, {visibleColumns.length}/{columns.length} kolon gösteriliyor
            </CardDescription>
          </div>
          {classification && (
            <Badge variant="outline" className="text-sm">
              {CATEGORY_LABELS[classification.category] || classification.category}
              <span className="ml-1 text-muted-foreground">
                (%{Math.round(classification.confidence * 100)})
              </span>
            </Badge>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              className="pl-8"
            />
          </div>

          {/* Column Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Kolonlar:</span>
            <ScrollArea className="max-w-[300px]">
              <div className="flex gap-1">
                {columns.map((col) => (
                  <Button
                    key={col.name}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2 text-xs",
                      hiddenColumns.has(col.name) && "opacity-50"
                    )}
                    onClick={() => toggleColumn(col.name)}
                  >
                    {hiddenColumns.has(col.name) ? (
                      <EyeOff className="h-3 w-3 mr-1" />
                    ) : (
                      <Eye className="h-3 w-3 mr-1" />
                    )}
                    {col.name}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Export */}
          {onExport && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onExport("csv")}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport("json")}>
                <Download className="h-4 w-4 mr-1" />
                JSON
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Column Info */}
        <div className="mb-4 flex flex-wrap gap-2">
          {visibleColumns.map((col) => (
            <div
              key={col.name}
              className="flex items-center gap-1 text-xs"
              title={`Boş: ${col.nullCount}, Benzersiz: ${col.uniqueCount}`}
            >
              <span className="font-medium">{col.name}:</span>
              <Badge variant="secondary" className={cn("text-xs", TYPE_COLORS[col.inferredType])}>
                {col.inferredType}
              </Badge>
              {col.nullCount > 0 && (
                <span className="text-muted-foreground">
                  ({col.nullCount} boş)
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Table */}
        <ScrollArea className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                {visibleColumns.map((col) => (
                  <TableHead key={col.name} className="min-w-[120px]">
                    <div className="flex flex-col gap-1">
                      <span>{col.name}</span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] w-fit", TYPE_COLORS[col.inferredType])}
                      >
                        {col.inferredType}
                      </Badge>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + 1}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchTerm ? "Sonuç bulunamadı" : "Veri yok"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center text-muted-foreground text-xs">
                      {currentPage * pageSize + index + 1}
                    </TableCell>
                    {visibleColumns.map((col) => (
                      <TableCell key={col.name} className="max-w-[200px] truncate">
                        <span title={formatValue(row[col.name])}>
                          {formatValue(row[col.name])}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Sayfa {currentPage + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Classification Details */}
        {classification && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Sınıflandırma Detayları</h4>
            <div className="space-y-2 text-sm">
              {classification.reasoning.map((reason, index) => (
                <p key={index} className="text-muted-foreground">
                  {reason}
                </p>
              ))}
            </div>
            {classification.detectedPatterns.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Tespit edilen pattern&apos;ler:</p>
                <div className="flex flex-wrap gap-2">
                  {classification.detectedPatterns.map((pattern, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {pattern.type}: {pattern.columns.join(", ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
