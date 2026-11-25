import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect Vercel Serverless environment
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isVercel ? path.join(os.tmpdir(), 'omnistore_data') : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // If directory creation fails in serverless, will operate in-memory
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function getInitialData() {
  const adminPass = hashPassword('admin123');
  const johnPass = hashPassword('customer123');
  const alicePass = hashPassword('alice123');
  const bobPass = hashPassword('bob123');

  const now = new Date().toISOString();

  return {
    users: [
      {
        id: 'usr_admin',
        name: 'Store Administrator',
        email: 'admin@store.com',
        passwordHash: adminPass.hash,
        salt: adminPass.salt,
        role: 'admin',
        status: 'approved',
        phone: '+1 (555) 019-2834',
        address: { street: '100 Admin Plaza', city: 'San Francisco', state: 'CA', zip: '94105' },
        verificationToken: null,
        verifiedAt: now,
        rejectionReason: null,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
      },
      {
        id: 'usr_john',
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: johnPass.hash,
        salt: johnPass.salt,
        role: 'customer',
        status: 'approved',
        phone: '+1 (555) 234-5678',
        address: { street: '742 Evergreen Terrace', city: 'Springfield', state: 'IL', zip: '62704' },
        verificationToken: null,
        verifiedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        rejectionReason: null,
        createdAt: new Date(Date.now() - 12 * 86400000).toISOString()
      },
      {
        id: 'usr_alice',
        name: 'Alice Walker',
        email: 'alice@example.com',
        passwordHash: alicePass.hash,
        salt: alicePass.salt,
        role: 'customer',
        status: 'pending_approval',
        phone: '+1 (555) 876-5432',
        address: { street: '404 Innovation Way', city: 'Austin', state: 'TX', zip: '78701' },
        verificationToken: 'tok_alice_verify_2026',
        verifiedAt: null,
        rejectionReason: null,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: 'usr_bob',
        name: 'Bob Miller',
        email: 'bob@example.com',
        passwordHash: bobPass.hash,
        salt: bobPass.salt,
        role: 'customer',
        status: 'pending_approval',
        phone: '+1 (555) 345-6789',
        address: { street: '12 Blossom Lane', city: 'Seattle', state: 'WA', zip: '98101' },
        verificationToken: 'tok_bob_verify_2026',
        verifiedAt: null,
        rejectionReason: null,
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
      }
    ],
    categories: [
      {
        id: 'cat_electronics',
        name: 'Electronics & Gadgets',
        slug: 'electronics',
        description: 'Keyboards, gaming mice, fast chargers, and computing accessories.',
        icon: 'Cpu'
      },
      {
        id: 'cat_wearables',
        name: 'Wearables & Watches',
        slug: 'wearables',
        description: 'Smartwatches, fitness bands, smart health rings, and connected devices.',
        icon: 'Watch'
      },
      {
        id: 'cat_audio',
        name: 'Audio & Sound',
        slug: 'audio',
        description: 'ANC headphones, true wireless earbuds, portable speakers, and soundbars.',
        icon: 'Headphones'
      },
      {
        id: 'cat_fashion',
        name: 'Fashion & Apparel',
        slug: 'fashion',
        description: 'Designer apparel, luxury footwear, and seasonal accessories.',
        icon: 'Shirt'
      },
      {
        id: 'cat_home',
        name: 'Home & Kitchen',
        slug: 'home-living',
        description: 'Minimalist furniture, smart home decor, and ambient lighting.',
        icon: 'Home'
      },
      {
        id: 'cat_beauty',
        name: 'Beauty & Wellness',
        slug: 'beauty',
        description: 'Organic skincare, fragrances, and daily personal care essentials.',
        icon: 'Sparkles'
      },
      {
        id: 'cat_sports',
        name: 'Sports & Outdoors',
        slug: 'sports',
        description: 'Fitness equipment, athletic wear, and outdoor adventure gear.',
        icon: 'Activity'
      }
    ],
    products: [
      {
            "id": "prod_1",
            "name": "AuraPulse ANC Wireless Headphones",
            "categoryId": "cat_electronics",
            "categoryName": "Electronics & Gadgets",
            "price": 2999,
            "stock": 35,
            "rating": 4.8,
            "reviewCount": 42,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
            "description": "High-fidelity audio with hybrid active noise cancellation, 40-hour battery life, and spatial surround sound.",
            "specs": [
                  "Bluetooth 5.3",
                  "40hr Battery Life",
                  "40mm Neodymium Drivers",
                  "USB-C Fast Charge"
            ]
      },
      {
            "id": "prod_2",
            "name": "Horizon Pro Smartwatch Ultra",
            "categoryId": "cat_electronics",
            "categoryName": "Electronics & Gadgets",
            "price": 4499,
            "stock": 20,
            "rating": 4.9,
            "reviewCount": 38,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
            "description": "Aerospace-grade chassis, always-on sapphire AMOLED display, advanced ECG, and dual-frequency GPS.",
            "specs": [
                  "Durable Case",
                  "100m Water Resistant",
                  "ECG & SpO2 Monitoring",
                  "7-Day Battery"
            ]
      },
      {
            "id": "prod_3",
            "name": "ZenMechanical RGB Pro Keyboard",
            "categoryId": "cat_electronics",
            "categoryName": "Electronics & Gadgets",
            "price": 3299,
            "stock": 18,
            "rating": 4.7,
            "reviewCount": 29,
            "featured": false,
            "image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80",
            "description": "Hot-swappable mechanical switches, CNC machined aluminum case, sound dampening foam, and per-key RGB.",
            "specs": [
                  "Mechanical Switches",
                  "Hot-Swappable",
                  "PBT Keycaps",
                  "Triple-Mode Wireless"
            ]
      },
      {
            "id": "prod_4",
            "name": "Voyager Heritage Leather Duffel",
            "categoryId": "cat_fashion",
            "categoryName": "Fashion & Apparel",
            "price": 2499,
            "stock": 15,
            "rating": 4.9,
            "reviewCount": 19,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
            "description": "Handcrafted full-grain leather duffel bag with antique brass hardware and waterproof shoe compartment.",
            "specs": [
                  "Full-Grain Leather",
                  "45L Capacity",
                  "Separate Shoe Tunnel",
                  "Heavy-Duty Brass Zippers"
            ]
      },
      {
            "id": "prod_5",
            "name": "AeroGlide Carbon Running Shoes",
            "categoryId": "cat_sports",
            "categoryName": "Sports & Outdoors",
            "price": 3999,
            "stock": 24,
            "rating": 4.6,
            "reviewCount": 31,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
            "description": "Propulsive carbon plate embedded in dual-density nitrogen-infused supercritical foam for maximum energy return.",
            "specs": [
                  "Carbon Plate",
                  "Ultra-Light 210g",
                  "Breathable Matrix Mesh",
                  "Durable Rubber Grip"
            ]
      },
      {
            "id": "prod_6",
            "name": "Nordic Minimalist Desk Lamp",
            "categoryId": "cat_home",
            "categoryName": "Home & Living",
            "price": 1499,
            "stock": 40,
            "rating": 4.7,
            "reviewCount": 16,
            "featured": false,
            "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
            "description": "Architectural desk lamp with stepless touch dimming, color temperature tuning (2700K-6500K), and integrated Qi wireless charger base.",
            "specs": [
                  "Touch Dimmer",
                  "Wireless Fast Charging",
                  "CRI > 95 True Color",
                  "Aluminum Alloy"
            ]
      },
      {
            "id": "prod_7",
            "name": "Artisan Ceramic Pour-Over Set",
            "categoryId": "cat_home",
            "categoryName": "Home & Living",
            "price": 999,
            "stock": 28,
            "rating": 4.8,
            "reviewCount": 22,
            "featured": false,
            "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80",
            "description": "Double-walled ceramic dripper with borosilicate server and precision thermal spiral extraction ribs.",
            "specs": [
                  "Handmade Ceramic",
                  "600ml Server",
                  "Heat Resistant Borosilicate",
                  "Dishwasher Safe"
            ]
      },
      {
            "id": "prod_8",
            "name": "Botanical Radiance Restorative Serum",
            "categoryId": "cat_beauty",
            "categoryName": "Beauty & Wellness",
            "price": 799,
            "stock": 50,
            "rating": 4.9,
            "reviewCount": 54,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
            "description": "Potent botanical complex infused with niacinamide, multi-molecular hyaluronic acid, and cold-pressed squalane.",
            "specs": [
                  "30ml Bottle",
                  "100% Vegan",
                  "Fragrance-Free",
                  "Dermatologist Tested"
            ]
      },
      {
            "id": "prod_9",
            "name": "HyperSpeed Wireless Gaming Mouse",
            "categoryId": "cat_electronics",
            "categoryName": "Electronics & Gadgets",
            "price": 1899,
            "stock": 45,
            "rating": 4.8,
            "reviewCount": 56,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80",
            "description": "Ultra-lightweight ergonomic wireless gaming mouse with 26,000 DPI optical sensor, RGB lighting, and 80-hour battery life.",
            "specs": [
                  "26K DPI Sensor",
                  "1ms Ultra-Low Latency",
                  "68g Lightweight",
                  "USB-C Fast Charging"
            ]
      },
      {
            "id": "prod_10",
            "name": "SonicBoom Portable Bluetooth Speaker",
            "categoryId": "cat_electronics",
            "categoryName": "Electronics & Gadgets",
            "price": 2499,
            "stock": 30,
            "rating": 4.7,
            "reviewCount": 44,
            "featured": false,
            "image": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80",
            "description": "Powerful 360-degree stereo sound with deep bass punch, IPX7 waterproof rating, and 24-hour battery life for outdoor adventures.",
            "specs": [
                  "IPX7 Waterproof",
                  "24-Hour Battery",
                  "BassBoost Drivers",
                  "True Wireless Stereo"
            ]
      },
      {
            "id": "prod_11",
            "name": "PowerCore 20,000mAh 65W Fast Power Bank",
            "categoryId": "cat_electronics",
            "categoryName": "Electronics & Gadgets",
            "price": 1999,
            "stock": 40,
            "rating": 4.9,
            "reviewCount": 72,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1609592426508-d25a815a5198?w=800&q=80",
            "description": "High-capacity power bank with 65W Power Delivery fast charging for smartphones, tablets, and mobile devices.",
            "specs": [
                  "20,000mAh Capacity",
                  "65W PD Fast Charge",
                  "LED Digital Display",
                  "Triple Device Output"
            ]
      },
      {
            "id": "prod_12",
            "name": "PureComfort Heavyweight Cotton Hoodie",
            "categoryId": "cat_fashion",
            "categoryName": "Fashion & Apparel",
            "price": 1799,
            "stock": 35,
            "rating": 4.8,
            "reviewCount": 38,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80",
            "description": "Premium 400 GSM brushed fleece oversized hoodie crafted from 100% combed organic cotton with reinforced stitching.",
            "specs": [
                  "400 GSM Cotton",
                  "Brushed Fleece Interior",
                  "Pre-Shrunk Fabric",
                  "Kangaroo Pocket"
            ]
      },
      {
            "id": "prod_13",
            "name": "Classic Chelsea Handcrafted Suede Boots",
            "categoryId": "cat_fashion",
            "categoryName": "Fashion & Apparel",
            "price": 3499,
            "stock": 18,
            "rating": 4.9,
            "reviewCount": 27,
            "featured": false,
            "image": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80",
            "description": "Timeless Chelsea silhouette made with rich water-resistant suede, cushioned insole, and durable non-slip crepe rubber sole.",
            "specs": [
                  "Genuine Suede",
                  "Elastic Side Panels",
                  "Memory Foam Insole",
                  "Anti-Slip Outsole"
            ]
      },
      {
            "id": "prod_14",
            "name": "Aviator Titanium Polarized Sunglasses",
            "categoryId": "cat_fashion",
            "categoryName": "Fashion & Apparel",
            "price": 1299,
            "stock": 50,
            "rating": 4.7,
            "reviewCount": 31,
            "featured": false,
            "image": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80",
            "description": "Ultra-light titanium frame with 100% UV400 polarized HD lenses that eliminate glare while providing crystal-clear vision.",
            "specs": [
                  "UV400 Protection",
                  "Polarized Triacetate Lenses",
                  "Titanium Alloy Frame",
                  "Anti-Scratch Coating"
            ]
      },
      {
            "id": "prod_15",
            "name": "ZenAroma Ultrasonic Oil Diffuser",
            "categoryId": "cat_home",
            "categoryName": "Home & Living",
            "price": 1199,
            "stock": 28,
            "rating": 4.8,
            "reviewCount": 49,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80",
            "description": "Whisper-quiet ultrasonic humidifier and aromatherapy diffuser with 7 ambient LED mood lights and auto shut-off.",
            "specs": [
                  "500ml Reservoir",
                  "Whisper Quiet < 20dB",
                  "7 LED Mood Colors",
                  "Timer Auto Shut-Off"
            ]
      },
      {
            "id": "prod_16",
            "name": "ErgoRest Orthopedic Memory Foam Pillow",
            "categoryId": "cat_home",
            "categoryName": "Home & Living",
            "price": 1499,
            "stock": 32,
            "rating": 4.7,
            "reviewCount": 63,
            "featured": false,
            "image": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80",
            "description": "Ergonomically contoured cervical support pillow with cooling gel infusion and breathable bamboo washable cover.",
            "specs": [
                  "Contoured Neck Support",
                  "Cooling Gel Infusion",
                  "Bamboo Fiber Cover",
                  "Hypoallergenic"
            ]
      },
      {
            "id": "prod_17",
            "name": "French Press Double-Wall Coffee Maker",
            "categoryId": "cat_home",
            "categoryName": "Home & Living",
            "price": 1699,
            "stock": 22,
            "rating": 4.9,
            "reviewCount": 35,
            "featured": false,
            "image": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80",
            "description": "304 food-grade stainless steel double-walled insulated French press that keeps brew hot for 3 hours with 4-level filtration.",
            "specs": [
                  "1000ml (34oz)",
                  "Double-Wall Thermal Insulation",
                  "4-Stage Filter Screen",
                  "304 Stainless Steel"
            ]
      },
      {
            "id": "prod_18",
            "name": "ProFit All-in-One Resistance Bands Set",
            "categoryId": "cat_sports",
            "categoryName": "Sports & Outdoors",
            "price": 899,
            "stock": 60,
            "rating": 4.8,
            "reviewCount": 85,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&q=80",
            "description": "11-piece workout set with 5 stackable resistance tubes (up to 150 lbs total), foam handles, ankle straps, and door anchor.",
            "specs": [
                  "Up to 150 lbs Resistance",
                  "Natural Latex Tubes",
                  "Includes Door Anchor & Bag",
                  "Full-Body Workout Guide"
            ]
      },
      {
            "id": "prod_19",
            "name": "GripMaster Non-Slip Eco Yoga Mat",
            "categoryId": "cat_sports",
            "categoryName": "Sports & Outdoors",
            "price": 1399,
            "stock": 25,
            "rating": 4.9,
            "reviewCount": 41,
            "featured": false,
            "image": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80",
            "description": "High-density 6mm cushioned TPE dual-layer yoga mat with laser-etched body alignment lines and non-slip textured grip.",
            "specs": [
                  "6mm High Density TPE",
                  "Laser Alignment Lines",
                  "100% Non-Toxic & Eco-Friendly",
                  "Free Carry Strap"
            ]
      },
      {
            "id": "prod_20",
            "name": "AyurVeda Cold-Pressed Hair Care Elixir",
            "categoryId": "cat_beauty",
            "categoryName": "Beauty & Wellness",
            "price": 649,
            "stock": 70,
            "rating": 4.9,
            "reviewCount": 94,
            "featured": true,
            "image": "https://images.unsplash.com/photo-1608248597359-54881079313a?w=800&q=80",
            "description": "Traditional blend of Rosemary, Bhringraj, Amla, and Virgin Coconut oil that deeply nourishes roots and promotes hair density.",
            "specs": [
                  "200ml Glass Bottle",
                  "100% Pure & Cold-Pressed",
                  "No Mineral Oils or Silicones",
                  "Ayurvedic Recipe"
            ]
      }
],
    orders: [
      {
        id: 'ORD-9821',
        customerId: 'usr_john',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        items: [
          {
            productId: 'prod_1',
            name: 'AuraPulse ANC Wireless Headphones',
            price: 2999,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
          }
        ],
        subtotal: 2999,
        shippingFee: 0,
        tax: 539.82,
        totalAmount: 3538.82,
        shippingAddress: {
          name: 'John Doe',
          street: 'B-402, Lotus Towers, MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          zip: '560001',
          country: 'India'
        },
        paymentMethod: 'Credit Card',
        paymentStatus: 'completed',
        paymentId: 'PAY-882194',
        orderStatus: 'delivered',
        trackingNumber: 'TRK-US-991283',
        deliveryPartner: 'FedEx Express',
        trackingHistory: [
          { status: 'placed', timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), note: 'Order placed successfully by customer.', location: 'Online' },
          { status: 'confirmed', timestamp: new Date(Date.now() - 5 * 86400000 + 120000).toISOString(), note: 'Payment processed and verified by Payment Gateway.', location: 'Payment Gateway' },
          { status: 'processing', timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), note: 'Items packed and labeled at Central Fulfillment Hub.', location: 'Warehouse A1' },
          { status: 'shipped', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), note: 'Package handed over to carrier.', location: 'Chicago Sorting Center' },
          { status: 'out_for_delivery', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), note: 'Courier on the way to delivery address.', location: 'Springfield Hub' },
          { status: 'delivered', timestamp: new Date(Date.now() - 2 * 86400000 + 14400000).toISOString(), note: 'Package signed and delivered at front porch.', location: 'Springfield, IL' }
        ],
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
      }
    ],
    payments: [
      {
        id: 'PAY-882194',
        orderId: 'ORD-9821',
        customerId: 'usr_john',
        customerName: 'John Doe',
        amount: 269.99,
        paymentMethod: 'Credit Card (ending in 4242)',
        gatewayRef: 'GW_TXN_9918237192',
        status: 'success',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
      }
    ],
    reviews: [
      {
        id: 'rev_1',
        productId: 'prod_1',
        customerId: 'usr_john',
        customerName: 'John Doe',
        rating: 5,
        comment: 'Outstanding quality and active noise cancellation. Very comfortable for long sessions.',
        verifiedPurchase: true,
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
      }
    ],
    emails: [
      {
        id: 'eml_1',
        to: 'alice@example.com',
        subject: 'Account Registration Received - Pending Admin Approval',
        type: 'admin_approval_request',
        recipientName: 'Alice Walker',
        status: 'sent',
        body: `<div style="font-family:sans-serif;padding:24px;background:#f8fafc;color:#1e293b;">
          <h2 style="color:#2563eb;">Welcome to OmniStore, Alice!</h2>
          <p>Thank you for creating an account. In accordance with security policy, our store administrator is currently reviewing your registration.</p>
          <div style="background:#e0f2fe;border-left:4px solid #0284c7;padding:12px;margin:16px 0;">
            <strong>Verification Status:</strong> PENDING MANUAL ADMIN APPROVAL
          </div>
          <p>You will receive an email confirmation as soon as your account is approved.</p>
        </div>`,
        sentAt: new Date(Date.now() - 2 * 86400000).toISOString()
      }
    ]
  };
}

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = getInitialData();
        this.save();
      }
    } catch {
      this.data = getInitialData();
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // In serverless environments where file write is restricted, state remains in memory
    }
  }

  // Users
  getUsers() { return this.data.users; }
  getUserById(id) { return this.data.users.find(u => u.id === id); }
  getUserByEmail(email) { return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()); }
  getUserByToken(token) { return this.data.users.find(u => u.verificationToken === token); }
  
  addUser(user) {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id, updates) {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    this.data.users[index] = { ...this.data.users[index], ...updates };
    this.save();
    return this.data.users[index];
  }

  deleteUser(id) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.save();
  }

  // Categories
  getCategories() { return this.data.categories; }
  getCategoryById(id) { return this.data.categories.find(c => c.id === id); }
  addCategory(cat) {
    this.data.categories.push(cat);
    this.save();
    return cat;
  }
  updateCategory(id, updates) {
    const index = this.data.categories.findIndex(c => c.id === id);
    if (index === -1) return null;
    this.data.categories[index] = { ...this.data.categories[index], ...updates };
    this.save();
    return this.data.categories[index];
  }
  deleteCategory(id) {
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    this.save();
  }

  // Products
  getProducts() { return this.data.products; }
  getProductById(id) { return this.data.products.find(p => p.id === id); }
  addProduct(prod) {
    this.data.products.unshift(prod);
    this.save();
    return prod;
  }
  updateProduct(id, updates) {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.data.products[index] = { ...this.data.products[index], ...updates };
    this.save();
    return this.data.products[index];
  }
  deleteProduct(id) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.data.reviews = (this.data.reviews || []).filter(r => r.productId !== id);
    this.save();
  }

  // Orders
  getOrders() { return this.data.orders; }
  getOrderById(id) { return this.data.orders.find(o => o.id === id); }
  getOrdersByCustomer(customerId) { return this.data.orders.filter(o => o.customerId === customerId); }
  addOrder(order) {
    this.data.orders.unshift(order);
    this.save();
    return order;
  }
  updateOrder(id, updates) {
    const index = this.data.orders.findIndex(o => o.id === id);
    if (index === -1) return null;
    this.data.orders[index] = { ...this.data.orders[index], ...updates };
    this.save();
    return this.data.orders[index];
  }

  // Payments
  getPayments() { return this.data.payments; }
  getPaymentById(id) { return this.data.payments.find(p => p.id === id); }
  addPayment(payment) {
    this.data.payments.unshift(payment);
    this.save();
    return payment;
  }
  updatePayment(id, updates) {
    const index = this.data.payments.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.data.payments[index] = { ...this.data.payments[index], ...updates };
    this.save();
    return this.data.payments[index];
  }

  // Reviews
  getReviews(productId) {
    if (!productId) return this.data.reviews;
    return this.data.reviews.filter(r => r.productId === productId);
  }
  addReview(review) {
    this.data.reviews.unshift(review);
    const prodReviews = this.data.reviews.filter(r => r.productId === review.productId);
    const avg = prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length;
    this.updateProduct(review.productId, {
      rating: parseFloat(avg.toFixed(1)),
      reviewCount: prodReviews.length
    });
    this.save();
    return review;
  }

  // Emails
  getEmails() { return this.data.emails; }
  addEmail(email) {
    this.data.emails.unshift(email);
    this.save();
    return email;
  }
}

export const db = new Database();
export { hashPassword };
