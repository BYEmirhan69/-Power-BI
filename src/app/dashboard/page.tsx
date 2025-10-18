'use client'

import Layout from '@/components/layout/Layout'
import TimeSeriesChart from '@/components/charts/TimeSeriesChart'

export default function DashboardPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            Yeni Grafik Ekle
          </button>
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm">Toplam Veri Seti</h3>
            <p className="text-2xl font-bold">24</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm">Aktif Grafikler</h3>
            <p className="text-2xl font-bold">12</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-500 text-sm">Son Güncelleme</h3>
            <p className="text-2xl font-bold">2 saat önce</p>
          </div>
        </div>

        {/* Grafik Alanı */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md h-[400px]">
            <h3 className="text-xl font-semibold mb-4">Zaman Serisi Analizi</h3>
            <TimeSeriesChart />
          </div>
        </div>
      </div>
    </Layout>
  )
}