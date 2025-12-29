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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter as _Filter,
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
  pageSizeOptions?: number[];
  className?: string;
  onExport?: (format: "csv" | "json") => void;
  maxHeight?: string;
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
  pageSize: initialPageSize = 50,
  pageSizeOptions = [25, 50, 100, 250, 500],
  className,
  onExport,
  maxHeight = "600px",
}: DataPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(initialPageSize);

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

      <CardContent className="space-y-4">
        {/* Column Info - Collapsible */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            Kolon Bilgileri ({visibleColumns.length} kolon)
          </summary>
          <div className="mt-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex flex-wrap gap-3">
              {visibleColumns.map((col) => (
                <div
                  key={col.name}
                  className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border text-xs"
                  title={`Boş: ${col.nullCount}, Benzersiz: ${col.uniqueCount}`}
                >
                  <span className="font-semibold">{col.name}</span>
                  <Badge variant="secondary" className={cn("text-[10px]", TYPE_COLORS[col.inferredType])}>
                    {col.inferredType}
                  </Badge>
                  {col.nullCount > 0 && (
                    <span className="text-muted-foreground text-[10px]">
                      {col.nullCount} boş
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </details>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <ScrollArea style={{ maxHeight }}>
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-muted/80 hover:bg-muted/80 backdrop-blur-sm">
                  <TableHead className="w-16 text-center font-bold text-foreground border-r bg-muted/80">#</TableHead>
                  {visibleColumns.map((col, colIndex) => (
                    <TableHead 
                      key={col.name} 
                      className={cn(
                        "min-w-[140px] font-semibold text-foreground bg-muted/80",
                        colIndex < visibleColumns.length - 1 && "border-r"
                      )}
                    >
                      <div className="flex flex-col gap-1.5 py-1">
                        <span className="text-sm">{col.name}</span>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] w-fit font-normal", TYPE_COLORS[col.inferredType])}
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
                      className="text-center text-muted-foreground py-12"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-muted-foreground/50" />
                        <span>{searchTerm ? "Sonuç bulunamadı" : "Veri yok"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, index) => (
                    <TableRow 
                      key={index} 
                      className={cn(
                        "transition-colors",
                        index % 2 === 0 ? "bg-background" : "bg-muted/30"
                      )}
                    >
                      <TableCell className="text-center text-muted-foreground text-xs font-medium border-r bg-muted/20">
                        {currentPage * pageSize + index + 1}
                      </TableCell>
                      {visibleColumns.map((col, colIndex) => (
                        <TableCell 
                          key={col.name} 
                          className={cn(
                            "max-w-[250px] truncate text-sm",
                            colIndex < visibleColumns.length - 1 && "border-r border-border/50"
                          )}
                        >
                          <span 
                            title={formatValue(row[col.name])}
                            className={cn(
                              row[col.name] === null || row[col.name] === undefined 
                                ? "text-muted-foreground italic" 
                                : ""
                            )}
                          >
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
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 p-4 bg-muted/30 rounded-lg border">
            {/* Sol: Sayfa bilgisi ve boyut seçici */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Toplam</span>
                <span className="font-bold text-foreground">{filteredData.length}</span>
                <span className="text-muted-foreground">satır</span>
                {filteredData.length !== data.length && (
                  <span className="text-muted-foreground text-xs">(filtrelendi: {data.length})</span>
                )}
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sayfa başına:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger className="h-9 w-[90px] font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Orta: Sayfa navigasyonu */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                title="İlk sayfa"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                title="Önceki sayfa"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2 px-3">
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage + 1}
                  onChange={(e) => {
                    const page = parseInt(e.target.value) - 1;
                    if (page >= 0 && page < totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="h-9 w-16 text-center font-medium"
                />
                <span className="text-sm text-muted-foreground font-medium">/ {totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
                title="Sonraki sayfa"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage === totalPages - 1}
                title="Son sayfa"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Sağ: Gösterilen aralık */}
            <div className="text-sm">
              <span className="font-bold text-foreground">{currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, filteredData.length)}</span>
              <span className="text-muted-foreground"> gösteriliyor</span>
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
