import Layout from '@/components/layout/Layout'

export default function Home() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">İş Zekası Platformuna Hoş Geldiniz</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">Dashboard</h2>
            <p className="text-gray-600">Verilerinizi analiz edin ve görselleştirin.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">Grafikler</h2>
            <p className="text-gray-600">İnteraktif grafiklerle verilerinizi keşfedin.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">Raporlar</h2>
            <p className="text-gray-600">Detaylı raporlar oluşturun ve paylaşın.</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}