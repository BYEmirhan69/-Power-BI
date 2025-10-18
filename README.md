Harika bir proje vizyonu Emirhan! Aşağıda, iş zekası platformunuz için detaylı bir *prd.md* (Product Requirements Document) taslağı hazırladım. Her adımın başına [ ] işareti ekledim ve senin öngörmediğin ama sistemin sürdürülebilirliği, ölçeklenebilirliği ve kullanıcı deneyimi açısından kritik olabilecek bazı özellikleri de ekledim.

---

## 📄 prd.md — İş Zekası Platformu

### 🎯 Proje Amacı
[ ] Firmaların kendi veri kaynaklarını kullanarak zaman serisi, tüketici davranışları ve teknoloji kullanımı gibi verileri görselleştirebilecekleri, modüler ve ölçeklenebilir bir iş zekası platformu geliştirmek.

---

### 🧱 Temel Bileşenler

#### [ ] Veritabanı
- Supabase (PostgreSQL tabanlı)
- Otomatik veri senkronizasyonu ve veri bütünlüğü kontrolleri
- [ ] UUID tabanlı veri kimliklendirme
- [ ] Zaman damgası ile veri versiyonlama

#### [ ] Web Arayüzü
- React tabanlı SPA (Single Page Application)
- [ ] Dinamik grafik bileşenleri (Chart.js, Recharts veya ECharts entegrasyonu)
- [ ] Sayfa bazlı modüler yapı (Dashboard, Veri Aktarımı, Grafikler, Ayarlar)
- [ ] Kullanıcı dostu UI/UX (renk kodlama, filtreleme, kolon seçimi)
- [ ] Tema desteği (light/dark mode)

#### [ ] Veri Toplama Katmanı
- API entegrasyonu (REST/GraphQL)
- Web scraping (Puppeteer, Cheerio, Selenium opsiyonları)
- CSV/Excel dosyası yükleme
- [ ] Otomatik veri doğrulama ve temizleme pipeline’ı
- [ ] Veri türüne göre otomatik sınıflandırma (zaman serisi, davranışsal, teknolojik)

---

### 🧩 Kullanıcı Rolleri ve Yetkilendirme

#### [ ] Firma Yetkilisi
- Veri yükleme, grafik oluşturma, rapor alma

#### [ ] Sistem Yöneticisi
- Kullanıcı yönetimi, veri akışı kontrolü, log takibi

#### [ ] Geliştirici
- API erişimi, özel entegrasyonlar

#### [ ] Yetkilendirme Özellikleri
- JWT tabanlı oturum yönetimi
- [ ] Rol bazlı erişim kontrolü (RBAC)
- [ ] İki faktörlü kimlik doğrulama (opsiyonel)

---

### 📊 Grafik ve Görselleştirme Modülü

#### [ ] Grafik Türleri
- Zaman serisi çizgi grafikleri
- Pasta, çubuk, alan grafikleri
- [ ] Korelasyon ve regresyon analizleri için scatter plot
- [ ] Heatmap ve radar grafikleri (ileri seviye kullanıcılar için)

#### [ ] Özelleştirme
- Renk paleti seçimi
- Filtreleme (tarih, kategori, metrik)
- [ ] Dinamik kolon seçimi
- [ ] Grafik paylaşımı ve embed kodu üretimi

---

### 🔄 Veri Aktarımı ve Güncelleme

#### [ ] Dosya Yükleme
- CSV, XLSX destekli
- [ ] Sürükle-bırak arayüzü
- [ ] Otomatik veri eşleme (kolon isimlerine göre)

#### [ ] API ile Aktarım
- Token bazlı erişim
- [ ] Veri push/pull mantığı
- [ ] Günlük/haftalık otomatik veri çekme scheduler’ı

#### [ ] Web Scraping
- [ ] Kaynak bazlı scraping şablonları
- [ ] CAPTCHA ve anti-bot önlemleri için fallback stratejisi

---

### 📁 Loglama ve İzlenebilirlik

#### [ ] Sistem Logları
- Veri aktarım geçmişi
- Grafik oluşturma ve paylaşım geçmişi
- [ ] Hata logları ve uyarı sistemi

#### [ ] Kullanıcı Logları
- Oturum açma/kapatma
- Veri yükleme ve silme işlemleri

---

### 📈 Performans ve Ölçeklenebilirlik

#### [ ] Veri Boyutu Yönetimi
- Büyük veri setleri için sayfalama ve lazy loading
- [ ] Arka planda veri işleme (worker queue)

#### [ ] Cache ve Optimize
- [ ] Grafik önbellekleme
- [ ] Sık kullanılan veri sorguları için cache layer

---

### 🛡 Güvenlik ve Yedekleme

#### [ ] Güvenlik
- HTTPS zorunluluğu
- [ ] Rate limiting ve IP bazlı erişim kontrolü
- [ ] SQL injection ve XSS koruma katmanları

#### [ ] Yedekleme
- Günlük Supabase snapshot’ları
- [ ] Manuel yedek alma opsiyonu

---

### 📬 Bildirim ve Raporlama

#### [ ] Bildirimler
- Veri aktarımı başarılı/başarısız bildirimleri
- [ ] Grafik paylaşımı sonrası e-posta bildirimi

#### [ ] Raporlama
- PDF/Excel formatında dışa aktarım
- [ ] Zaman bazlı veri analiz raporları

---

### 🧠 AI Destekli Özellikler (Opsiyonel Genişleme)

#### [ ] Otomatik grafik önerileri (veri türüne göre)
#### [ ] Anomali tespiti ve uyarı sistemi
#### [ ] Doğal dil ile grafik oluşturma (“Son 6 ay satış trendini göster”)

---

