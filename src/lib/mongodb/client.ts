/**
 * MongoDB Client - Next.js App Router Uyumlu
 * Development ortamında hot-reload sırasında yeniden bağlantı açmamak için global cache kullanır.
 */

import { MongoClient, type Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI ortam değişkeni tanımlı değil");
}

if (!process.env.MONGODB_DB) {
  throw new Error("MONGODB_DB ortam değişkeni tanımlı değil");
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

// Global cache tipi tanımı
declare global {
   
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // Development modunda global cache kullan
  // Hot-reload sırasında yeni bağlantılar açılmasını önler
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production modunda her zaman yeni client oluştur
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * MongoDB client promise'ini döndürür
 * @returns {Promise<MongoClient>} MongoDB client instance
 */
export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

/**
 * MongoDB veritabanı instance'ını döndürür
 * @returns {Promise<Db>} MongoDB database instance
 */
export async function getMongoDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

/**
 * Bağlantı durumunu kontrol eder
 * @returns {Promise<boolean>} Bağlantı başarılı mı
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await clientPromise;
    await client.db(dbName).command({ ping: 1 });
    return true;
  } catch (error) {
    console.error("MongoDB bağlantı hatası:", error);
    return false;
  }
}

// Default export olarak client promise
export default clientPromise;
