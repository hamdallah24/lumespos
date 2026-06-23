# QA Specialist Agent — POS App Lume's Everywhere

## Test Scenarios

### Authentication
- [ ] Login dengan email + password
- [ ] Login dengan Google (nip.io domain)
- [ ] Signup dengan kode undangan (lumes123)
- [ ] Reset password flow
- [ ] Invalid credentials → error message
- [ ] New Google user → redirect ke halaman kode undangan

### CSRF Protection
- [ ] Mutation requests include x-csrf-token header
- [ ] Invalid CSRF token → 403 error
- [ ] Auth routes (login/signup) skip CSRF

### Cashier
- [ ] Product search by name
- [ ] Add product to cart (with variant)
- [ ] Update quantity (stepper +/-)
- [ ] Remove item from cart
- [ ] Payment: Tunai / QRIS / Online
- [ ] Amount paid validation
- [ ] Clear cart

### Shift Management
- [ ] Start shift with opening balance
- [ ] Owner/manager skip opening balance (X button)
- [ ] Close shift: wajib stok akhir + foto
- [ ] Close shift: validation toasts for empty fields
- [ ] Shift summary: Tunai / Online / QRIS separated

### Dashboard
- [ ] Sales chart renders (Recharts)
- [ ] Date range filter (Hari Ini / 7 Hari / 30 Hari)
- [ ] Calendar picker popup
- [ ] Stat cards (revenue, orders, profit)
- [ ] Low stock ticker

### Products
- [ ] CRUD products
- [ ] Variant pricing (HPP + Harga Jual)
- [ ] BOM / Recipe tab (mobile: compact tabs)
- [ ] Category management
- [ ] Product image upload

### Mobile Responsive
- [ ] All buttons visible (Resep, Periksa, Produksi)
- [ ] Bottom nav: floating pill
- [ ] Header: rounded-2xl glassmorphism
- [ ] Product cards: compact layout
- [ ] Dialog: max-h-[90vh], responsive tabs

### Dark Mode
- [ ] Toggle light/dark
- [ ] Login page gradient
- [ ] Dashboard chart background
- [ ] Sidebar buttons
- [ ] Table rows

## Common Bug Patterns
- Button `hidden sm:flex` → not visible on mobile
- `bg-white` instead of `bg-card` → broken dark mode
- CSRF `__Host-` cookie prefix → requires HTTPS
- PM2 missing `-r dotenv/config` → DATABASE_URL error
- Nginx root path wrong → 500 errors

## Test Commands
```bash
# API health
curl http://127.0.0.1:3000/api/health

# Login test
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# PM2 status
pm2 status
pm2 logs pos-api --lines 10 --nostream
```
