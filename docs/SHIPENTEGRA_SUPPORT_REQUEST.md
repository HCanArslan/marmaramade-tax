# ShipEntegra production API support request

Send the following to ShipEntegra support before enabling remote order creation. Do not send the client secret by email or support ticket.

## Copy/paste message (Turkish)

Merhaba,

MarmaraMade / Hamit Can Arslan şahıs işletmesi hesabımız için ShipEntegra public API üretim entegrasyonu hazırlıyoruz. Sandbox kullanmayacağız. Lütfen aşağıdaki konuları yazılı olarak teyit eder misiniz?

1. Hesabımız için production API erişimi aktif mi? `clientId` ve `clientSecret` hangi güvenli kanaldan alınır ve hangi yetkiler/scopelar tanımlıdır? Doğru production base URL `https://publicapi.shipentegra.com/v1` midir?
2. API v4.0.4 dokümanında `POST /orders` başarılı yanıt şeması görünmüyor. Başarı/hata HTTP kodlarını ve gerçek örnek JSON yanıtlarını; ShipEntegra order ID, tracking/label bilgisi ve bizim `orderNumber` referansımızın döndüğü alanları paylaşır mısınız?
3. `orderNumber` production ortamında benzersiz/idempotent midir? Timeout sonrası aynı siparişin iki kez oluşmasını önlemek için resmi idempotency key/header var mı? Yoksa `GET /orders/manual?orderNumber=...` ile güvenli doğrulama yöntemi nedir?
4. Etsy IOSS için mağaza ayarlarındaki “Manual Orders / IOSS Numarası” alanını boş mu bırakmalıyız? Etsy'nin uygun AB siparişinde sağladığı siparişe özel IOSS bilgisini API'de tam olarak hangi alanla göndermeliyiz: `POST /orders` içindeki `vatNumber`, etiket isteğindeki `iossNumber`, yoksa ikisi birden mi? Bilginin kargo firmasına elektronik olarak aktarıldığını ve etiket/paket üzerinde açık basılmadığını teyit eder misiniz?
5. `shippingType` değerlerinin kesin eşlemesi nedir (DDP/DDU/DAP)? Hangi servisler DDP destekler ve nihai vergi/harç/ek ücretler hangi yanıtta veya faturada görülür?
6. `POST /tools/calculate/all` yanıtındaki servis kodu, para birimi, yakıt/ek ücret, transit süre ve teklif geçerlilik alanlarını; etiket isteğindeki `specialService` ile eşlemeyi teyit eder misiniz?
7. `shipFrom` normal müşteri hesabı için zorunlu mudur, yoksa yalnızca reseller/yetkili hesaplarda mı gerekir?
8. `POST /orders` yalnızca sipariş mi oluşturur, yoksa gönderiyi satın alıp hesabı borçlandırır mı? Etiket satın alma/üretme adımı, iptal/hold/refund akışı ve olası masraflar nelerdir?
9. Production rate limitleri ve `Retry-After` davranışı nedir? Token, fiyat, sipariş, etiket, dosya ve tracking endpointleri için ayrı limit var mı?
10. Label, invoice ve ETGB dosyaları hangi endpointten alınır; özel URL'lerin ömrü ve yetkilendirmesi nedir? ETGB oluştuğunda durum/dosya nasıl tespit edilir?
11. Tracking webhook desteği var mı? Yoksa önerilen polling aralığı, timezone, event ID/timestamp ve status listesi nedir?
12. Sandbox kullanmadan, ücret veya gerçek gönderi oluşturmayan production doğrulama prosedürünüz var mı? Yoksa allowlist edilmiş iptal edilebilir test siparişi için yazılı prosedür sağlayabilir misiniz?
13. `GET /users/stores` içindeki store ID ile panelde görünen “Manual Orders” mağazası nasıl eşleşir?

Teşekkürler.

## IOSS handling rule in MarmaraMade Ledger

- Never invent an IOSS number and never use the Turkish tax number in the IOSS field.
- Keep a global/manual-store IOSS field empty until ShipEntegra explicitly confirms its Etsy behavior.
- Use only the IOSS value displayed by Etsy for the specific qualifying order.
- Treat it as confidential transit data: do not persist it in logs, exports, audit payloads, screenshots, or parcel text.
- Transmit it electronically only through the ShipEntegra fields confirmed by support.
- Orders above the marketplace IOSS threshold or otherwise not marked by Etsy must not inherit an IOSS value.
