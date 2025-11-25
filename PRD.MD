Harika bir proje vizyonu Mikail! Aşağıda, iş zekası platformunuz için detaylı bir prd.md (Product Requirements Document) taslağı hazırladım. Her adımın başına [ ] işareti ekledim ve senin öngörmediğin ama sistemin sürdürülebilirliği, ölçeklenebilirliği ve kullanıcı deneyimi açısından kritik olabilecek bazı özellikleri de ekledim.

---

## 📄 prd.md — İş Zekası Platformu

### 🎯 Proje Amacı
[x] Firmaların kendi veri kaynaklarını kullanarak zaman serisi, tüketici davranışları ve teknoloji kullanımı gibi verileri görselleştirebilecekleri, modüler ve ölçeklenebilir bir iş zekası platformu geliştirmek.

---

### 🧱 Temel Bileşenler

#### [x] Veritabanı
- Supabase (PostgreSQL tabanlı)
- Otomatik veri senkronizasyonu ve veri bütünlüğü kontrolleri
- [x] UUID tabanlı veri kimliklendirme
- [x] Zaman damgası ile veri versiyonlama

#### [x] Web Arayüzü
- React tabanlı SPA (Single Page Application) - Next.js 16 kullanılıyor
- [x] Dinamik grafik bileşenleri (Chart.js, Recharts veya ECharts entegrasyonu) - Recharts entegre edildi
- [x] Sayfa bazlı modüler yapı (Dashboard, Veri Aktarımı, Grafikler, Ayarlar)
- [x] Kullanıcı dostu UI/UX (renk kodlama, filtreleme, kolon seçimi)
- [x] Tema desteği (light/dark mode) - next-themes ile uygulandı

#### [x] Veri Toplama Katmanı
- API entegrasyonu (REST/GraphQL) - HttpClient servisi oluşturuldu
- Web scraping (Puppeteer, Cheerio, Selenium opsiyonları) - ScrapingService oluşturuldu
- CSV/Excel dosyası yükleme - FileParserService oluşturuldu
- [x] Otomatik veri doğrulama ve temizleme pipeline'ı - ValidationPipeline oluşturuldu
- [x] Veri türüne göre otomatik sınıflandırma (zaman serisi, davranışsal, teknolojik) - ClassificationResult tipi tanımlandı

---

### 🧩 Kullanıcı Rolleri ve Yetkilendirme

#### [x] Firma Yetkilisi
- Veri yükleme, grafik oluşturma, rapor alma

#### [x] Sistem Yöneticisi
- Kullanıcı yönetimi, veri akışı kontrolü, log takibi

#### [x] Geliştirici
- API erişimi, özel entegrasyonlar

#### [x] Yetkilendirme Özellikleri
- JWT tabanlı oturum yönetimi - Supabase Auth kullanılıyor
- [x] Rol bazlı erişim kontrolü (RBAC) - UserRole tipi (admin, user, developer) tanımlandı
- [ ] İki faktörlü kimlik doğrulama (opsiyonel)

---

### 📊 Grafik ve Görselleştirme Modülü

#### [x] Grafik Türleri
- Zaman serisi çizgi grafikleri - DynamicLineChart
- Pasta, çubuk, alan grafikleri - DynamicPieChart, DynamicBarChart, DynamicAreaChart
- [x] Korelasyon ve regresyon analizleri için scatter plot - DynamicScatterChart
- [x] Heatmap ve radar grafikleri (ileri seviye kullanıcılar için) - DynamicHeatmapChart, DynamicRadarChart

#### [x] Özelleştirme
- Renk paleti seçimi - DEFAULT_COLORS tanımlandı
- Filtreleme (tarih, kategori, metrik)
- [x] Dinamik kolon seçimi
- [x] Grafik paylaşımı ve embed kodu üretimi - ChartEmbedGenerator bileşeni oluşturuldu

---

### 🔄 Veri Aktarımı ve Güncelleme

#### [x] Dosya Yükleme
- CSV, XLSX destekli - FileParserService'de uygulandı
- [x] Sürükle-bırak arayüzü - FileDropzone bileşeni (react-dropzone)
- [x] Otomatik veri eşleme (kolon isimlerine göre) - ColumnMapping ve ColumnInfo tipleri

#### [x] API ile Aktarım
- Token bazlı erişim - AuthConfig tipleri (bearer, api_key, basic, oauth2)
- [x] Veri push/pull mantığı - HttpClient.fetchPaginated metodu
- [x] Günlük/haftalık otomatik veri çekme scheduler'ı - ScheduleConfig tipi tanımlandı

#### [x] Web Scraping
- [x] Kaynak bazlı scraping şablonları - ScrapingService.createTemplate metodu
- [x] CAPTCHA ve anti-bot önlemleri için fallback stratejisi - Puppeteer desteği

---

### 📁 Loglama ve İzlenebilirlik

#### [x] Sistem Logları
- Veri aktarım geçmişi - activity_logs tablosu
- Grafik oluşturma ve paylaşım geçmişi
- [x] Hata logları ve uyarı sistemi

#### [x] Kullanıcı Logları
- Oturum açma/kapatma - AuthProvider ile izleniyor
- Veri yükleme ve silme işlemleri - activity_logs tablosu

---

### 📈 Performans ve Ölçeklenebilirlik

#### [x] Veri Boyutu Yönetimi
- Büyük veri setleri için sayfalama ve lazy loading - fetchPaginated metodu
- [ ] Arka planda veri işleme (worker queue)

#### [ ] Cache ve Optimize
- [ ] Grafik önbellekleme
- [ ] Sık kullanılan veri sorguları için cache layer

---

### 🛡 Güvenlik ve Yedekleme

#### [x] Güvenlik
- HTTPS zorunluluğu - Next.js middleware
- [ ] Rate limiting ve IP bazlı erişim kontrolü
- [x] SQL injection ve XSS koruma katmanları - Supabase RLS + Zod validation

#### [ ] Yedekleme
- Günlük Supabase snapshot'ları
- [ ] Manuel yedek alma opsiyonu

---

### 📬 Bildirim ve Raporlama

#### [x] Bildirimler
- Veri aktarımı başarılı/başarısız bildirimleri - notifications tablosu + sonner toast
- [ ] Grafik paylaşımı sonrası e-posta bildirimi

#### [x] Raporlama
- PDF/Excel formatında dışa aktarım - reports tablosu (format: pdf, excel, csv)
- [ ] Zaman bazlı veri analiz raporları

---

### 🧠 AI Destekli Özellikler (Opsiyonel Genişleme)

#### [ ] Otomatik grafik önerileri (veri türüne göre)
#### [ ] Anomali tespiti ve uyarı sistemi
#### [ ] Doğal dil ile grafik oluşturma ("Son 6 ay satış trendini göster")

---

Bu PRD, sistemin modülerliğini, veri akışını ve kullanıcı deneyimini ön planda tutarak uzun vadeli sürdürülebilirlik için optimize edildi. İstersen bu dokümana versiyonlama, test senaryoları veya teknik mimari diyagramları da ekleyebilirim.

Hazır olduğunda bir sonraki adım olarak teknik mimariyi veya ilk MVP kapsamını çıkarabiliriz. Ne dersin?
