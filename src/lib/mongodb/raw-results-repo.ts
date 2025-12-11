/**
 * Raw Scraping Results Repository
 * Ham scraping sonuçlarını MongoDB'de saklayan repository
 */

import { ObjectId, type Collection, type WithId, type Filter, type Sort } from "mongodb";
import { getMongoDb } from "./client";

/**
 * Ham scraping verisi için document yapısı
 */
export interface RawScrapingDocument {
  /** Veri kaynağı - Örn: "exchange-api", "web-scraper", "file-upload" */
  source: string;
  /** Kayıt oluşturma tarihi */
  createdAt: Date;
  /** Ham JSON veri (ScrapingResult, API response vb.) */
  payload: unknown;
  /** İşlem durumu */
  status?: "success" | "error" | "pending";
  /** Hata durumunda hata mesajı */
  errorMessage?: string;
  /** İşleyen kullanıcı ID'si (Supabase user id) */
  userId?: string;
  /** Organizasyon ID'si (Supabase organization id) */
  organizationId?: string;
  /** Veri seti ID'si (ilişkili Supabase dataset) */
  datasetId?: string;
  /** Ek metadata */
  metadata?: Record<string, unknown>;
  /** İşlenme tarihi (Supabase'e aktarıldığında) */
  processedAt?: Date;
  /** İşlenme durumu */
  isProcessed?: boolean;
}

/** MongoDB'den dönen document tipi (ObjectId ile) */
export type RawScrapingDocumentWithId = WithId<RawScrapingDocument>;

const COLLECTION_NAME = "raw_scraping_results";

/**
 * Raw Scraping Results koleksiyonunu döndürür
 */
async function getCollection(): Promise<Collection<RawScrapingDocument>> {
  const db = await getMongoDb();
  return db.collection<RawScrapingDocument>(COLLECTION_NAME);
}

/**
 * Raw Scraping Results Repository
 * CRUD operasyonları ve sorgu yardımcıları
 */
export const RawResultsRepo = {
  /**
   * Yeni ham veri kaydı oluşturur
   * @param doc - Kaydedilecek document
   * @returns Oluşturulan document ID'si
   */
  async create(doc: Omit<RawScrapingDocument, "createdAt">): Promise<string> {
    const collection = await getCollection();
    const result = await collection.insertOne({
      ...doc,
      createdAt: new Date(),
      isProcessed: false,
    });
    return result.insertedId.toString();
  },

  /**
   * Toplu veri ekleme
   * @param docs - Eklenecek document listesi
   * @returns Oluşturulan document ID'leri
   */
  async createMany(docs: Omit<RawScrapingDocument, "createdAt">[]): Promise<string[]> {
    const collection = await getCollection();
    const docsWithDate = docs.map((doc) => ({
      ...doc,
      createdAt: new Date(),
      isProcessed: false,
    }));
    const result = await collection.insertMany(docsWithDate);
    return Object.values(result.insertedIds).map((id) => id.toString());
  },

  /**
   * ID ile document bulur
   * @param id - MongoDB ObjectId string
   * @returns Document veya null
   */
  async findById(id: string): Promise<RawScrapingDocumentWithId | null> {
    const collection = await getCollection();
    return collection.findOne({ _id: new ObjectId(id) });
  },

  /**
   * Filtreye göre document listesi döndürür
   * @param filter - MongoDB filter
   * @param options - Sayfalama ve sıralama seçenekleri
   * @returns Document listesi
   */
  async find(
    filter: Filter<RawScrapingDocument> = {},
    options: {
      limit?: number;
      skip?: number;
      sort?: Sort;
    } = {}
  ): Promise<RawScrapingDocumentWithId[]> {
    const collection = await getCollection();
    const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;

    return collection
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
  },

  /**
   * Kaynak türüne göre document listesi döndürür
   * @param source - Veri kaynağı
   * @param options - Sayfalama seçenekleri
   */
  async findBySource(
    source: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<RawScrapingDocumentWithId[]> {
    return this.find({ source }, options);
  },

  /**
   * İşlenmemiş kayıtları döndürür
   * @param options - Sayfalama seçenekleri
   */
  async findUnprocessed(
    options: { limit?: number; skip?: number } = {}
  ): Promise<RawScrapingDocumentWithId[]> {
    return this.find({ isProcessed: { $ne: true } }, options);
  },

  /**
   * Organizasyona göre kayıtları döndürür
   * @param organizationId - Supabase organization ID
   * @param options - Sayfalama seçenekleri
   */
  async findByOrganization(
    organizationId: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<RawScrapingDocumentWithId[]> {
    return this.find({ organizationId }, options);
  },

  /**
   * Tarih aralığına göre kayıtları döndürür
   * @param startDate - Başlangıç tarihi
   * @param endDate - Bitiş tarihi
   * @param options - Sayfalama seçenekleri
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options: { limit?: number; skip?: number } = {}
  ): Promise<RawScrapingDocumentWithId[]> {
    return this.find(
      {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      options
    );
  },

  /**
   * Kaydı işlenmiş olarak işaretler
   * @param id - Document ID
   * @returns Güncelleme başarılı mı
   */
  async markAsProcessed(id: string): Promise<boolean> {
    const collection = await getCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isProcessed: true,
          processedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  },

  /**
   * Kaydı günceller
   * @param id - Document ID
   * @param update - Güncellenecek alanlar
   * @returns Güncelleme başarılı mı
   */
  async update(
    id: string,
    update: Partial<RawScrapingDocument>
  ): Promise<boolean> {
    const collection = await getCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
    return result.modifiedCount > 0;
  },

  /**
   * Kaydı siler
   * @param id - Document ID
   * @returns Silme başarılı mı
   */
  async delete(id: string): Promise<boolean> {
    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  },

  /**
   * Belirli bir tarihten eski kayıtları siler (temizlik için)
   * @param olderThan - Bu tarihten eski kayıtlar silinir
   * @param onlyProcessed - Sadece işlenmiş kayıtları sil
   * @returns Silinen kayıt sayısı
   */
  async deleteOld(olderThan: Date, onlyProcessed = true): Promise<number> {
    const collection = await getCollection();
    const filter: Filter<RawScrapingDocument> = {
      createdAt: { $lt: olderThan },
    };

    if (onlyProcessed) {
      filter.isProcessed = true;
    }

    const result = await collection.deleteMany(filter);
    return result.deletedCount;
  },

  /**
   * Toplam kayıt sayısını döndürür
   * @param filter - Opsiyonel filtre
   */
  async count(filter: Filter<RawScrapingDocument> = {}): Promise<number> {
    const collection = await getCollection();
    return collection.countDocuments(filter);
  },

  /**
   * Kaynak bazlı istatistikler
   * @returns Kaynak türüne göre gruplandırılmış sayılar
   */
  async getStatsBySource(): Promise<Array<{ _id: string; count: number }>> {
    const collection = await getCollection();
    return collection
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();
  },

  /**
   * Koleksiyon için index'leri oluşturur
   * Uygulama başlangıcında bir kez çağrılmalı
   */
  async ensureIndexes(): Promise<void> {
    const collection = await getCollection();
    await Promise.all([
      collection.createIndex({ source: 1 }),
      collection.createIndex({ createdAt: -1 }),
      collection.createIndex({ isProcessed: 1 }),
      collection.createIndex({ organizationId: 1 }),
      collection.createIndex({ userId: 1 }),
      collection.createIndex({ status: 1 }),
      // Compound indexes for common queries
      collection.createIndex({ organizationId: 1, createdAt: -1 }),
      collection.createIndex({ source: 1, isProcessed: 1 }),
    ]);
  },
};

export default RawResultsRepo;
