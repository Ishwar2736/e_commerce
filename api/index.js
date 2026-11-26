import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { db, hashPassword } from './db.js';
import { verifyPassword, generateToken, authenticate } from './auth.js';
import {
  sendRegistrationPendingEmail,
  sendAccountApprovedEmail,
  sendVerificationTokenLinkEmail,
  sendAccountRejectedEmail,
  sendOrderConfirmationEmail,
  sendOrderCancellationEmail,
  sendRefundConfirmationEmail,
  sendDeliveryStatusUpdateEmail,
  sendReturnConfirmationEmail
} from './mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Load environment variables from .env file if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {}
}

// MIME types for static local file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    // If body already parsed by Vercel/Express
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message, details = {}) {
  sendJson(res, statusCode, { error: message, ...details });
}

function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendError(res, 403, 'Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    return sendError(res, 404, 'Not Found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) return sendError(res, 500, 'Server read error');
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    res.end(content);
  });
}

// Master Handler for Vercel Serverless Function & Local HTTP Server
export default async function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const reqUrl = new URL(req.url, `${proto}://${host}`);
  const pathname = reqUrl.pathname;
  const method = req.method;
  const baseUrl = `${proto}://${host}`;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // --- API ROUTES ---
  if (pathname.startsWith('/api/') || pathname === '/api') {
    try {
      const user = authenticate(req);

      // Register Customer (Starts in pending_approval for manual verification)
      if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseBody(req);
        const { name, email, password, phone, address } = body;

        if (!name || !email || !password) {
          return sendError(res, 400, 'Name, email, and password are required');
        }

        const existing = db.getUserByEmail(email);
        if (existing) {
          return sendError(res, 409, 'An account with this email already exists.');
        }

        const pass = hashPassword(password);
        const verificationToken = `tok_${crypto.randomBytes(24).toString('hex')}`;

        const newUser = {
          id: `usr_${crypto.randomUUID().slice(0, 8)}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash: pass.hash,
          salt: pass.salt,
          role: 'customer',
          status: 'pending_approval',
          phone: phone || '',
          address: address || { street: '', city: '', state: '', zip: '' },
          verificationToken,
          verifiedAt: null,
          rejectionReason: null,
          createdAt: new Date().toISOString()
        };

        db.addUser(newUser);
        await sendRegistrationPendingEmail(newUser);

        return sendJson(res, 201, {
          success: true,
          status: 'pending_approval',
          message: 'Registration successful! Waiting for admin approval.',
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
            createdAt: newUser.createdAt
          }
        });
      }

      // Login
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;

        if (!email || !password) {
          return sendError(res, 400, 'Email and password are required');
        }

        const foundUser = db.getUserByEmail(email);
        if (!foundUser || !verifyPassword(password, foundUser.salt, foundUser.passwordHash)) {
          return sendError(res, 401, 'Invalid email or password.');
        }

        if (foundUser.role === 'customer') {
          if (foundUser.status === 'pending_approval') {
            return sendError(res, 403, 'Account Pending Approval', {
              code: 'PENDING_APPROVAL',
              message: 'Registration successful! Waiting for admin approval.'
            });
          }
          if (foundUser.status === 'rejected') {
            return sendError(res, 403, 'Account Rejected', {
              code: 'ACCOUNT_REJECTED',
              message: 'Your account registration was rejected by the administrator.',
              reason: foundUser.rejectionReason
            });
          }
        }

        const token = generateToken(foundUser);
        return sendJson(res, 200, {
          success: true,
          token,
          user: {
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email,
            role: foundUser.role,
            status: foundUser.status,
            phone: foundUser.phone,
            address: foundUser.address
          }
        });
      }

      // Current User
      if (pathname === '/api/auth/me' && method === 'GET') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        return sendJson(res, 200, { user });
      }

      // Verify Token Link
      if (pathname === '/api/auth/verify-token' && method === 'GET') {
        const token = reqUrl.searchParams.get('token');
        if (!token) return sendError(res, 400, 'Token is required');

        const targetUser = db.getUserByToken(token);
        if (!targetUser) return sendError(res, 404, 'Invalid or expired verification link.');

        const updated = db.updateUser(targetUser.id, {
          status: 'approved',
          verifiedAt: new Date().toISOString(),
          verificationToken: null
        });

        await sendAccountApprovedEmail(updated, baseUrl);
        return sendJson(res, 200, {
          success: true,
          message: 'Email verified successfully! You may now sign in.',
          email: updated.email
        });
      }

      // Quick Demo Login
      if (pathname === '/api/auth/demo-login' && method === 'POST') {
        const body = await parseBody(req);
        const { email } = body;
        const target = db.getUserByEmail(email || 'admin@store.com');
        if (!target) return sendError(res, 404, 'User not found');

        const token = generateToken(target);
        return sendJson(res, 200, {
          success: true,
          token,
          user: target
        });
      }

      // ADMIN: Customers & Manual Approvals
      if (pathname === '/api/admin/customers' && method === 'GET') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');

        const allUsers = db.getUsers().filter(u => u.role === 'customer');
        const orders = db.getOrders();

        const enriched = allUsers.map(u => {
          const userOrders = orders.filter(o => o.customerId === u.id);
          const totalSpent = userOrders.reduce((sum, o) => sum + (o.paymentStatus === 'completed' ? o.totalAmount : 0), 0);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            phone: u.phone,
            address: u.address,
            verifiedAt: u.verifiedAt,
            rejectionReason: u.rejectionReason,
            createdAt: u.createdAt,
            orderCount: userOrders.length,
            totalSpent: parseFloat(totalSpent.toFixed(2))
          };
        });

        return sendJson(res, 200, { customers: enriched });
      }

      // Admin Approves Customer
      if (pathname.match(/^\/api\/admin\/customers\/([^/]+)\/approve$/) && method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const customerId = pathname.split('/')[4];
        const target = db.getUserById(customerId);
        if (!target) return sendError(res, 404, 'Customer not found');

        const updated = db.updateUser(customerId, {
          status: 'approved',
          verifiedAt: new Date().toISOString(),
          rejectionReason: null
        });

        const emailRecord = await sendAccountApprovedEmail(updated, baseUrl);
        return sendJson(res, 200, {
          success: true,
          message: `Customer ${updated.name} approved! Activation email dispatched.`,
          customer: updated,
          emailSent: emailRecord
        });
      }

      // Admin Rejects Customer
      if (pathname.match(/^\/api\/admin\/customers\/([^/]+)\/reject$/) && method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const customerId = pathname.split('/')[4];
        const body = await parseBody(req);
        const reason = body.reason || 'Account details failed verification.';

        const target = db.getUserById(customerId);
        if (!target) return sendError(res, 404, 'Customer not found');

        const updated = db.updateUser(customerId, { status: 'rejected', rejectionReason: reason });
        await sendAccountRejectedEmail(updated, reason);

        return sendJson(res, 200, { success: true, message: 'Customer rejected.', customer: updated });
      }

      // Admin Sends Verification Token Email
      if (pathname.match(/^\/api\/admin\/customers\/([^/]+)\/send-verification-email$/) && method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const customerId = pathname.split('/')[4];
        const target = db.getUserById(customerId);
        if (!target) return sendError(res, 404, 'Customer not found');

        const token = target.verificationToken || `tok_${crypto.randomBytes(24).toString('hex')}`;
        db.updateUser(customerId, { verificationToken: token });

        const emailRecord = await sendVerificationTokenLinkEmail(target, token, baseUrl);
        return sendJson(res, 200, { success: true, message: `Verification email sent.`, emailSent: emailRecord });
      }

      // Admin Deletes Customer
      if (pathname.match(/^\/api\/admin\/customers\/([^/]+)$/) && method === 'DELETE') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const customerId = pathname.split('/')[4];
        db.deleteUser(customerId);
        return sendJson(res, 200, { success: true, message: 'Customer deleted.' });
      }

      // PRODUCTS & CATEGORIES
      if (pathname === '/api/products' && method === 'GET') {
        let prods = [...db.getProducts()];
        const category = reqUrl.searchParams.get('category');
        const search = reqUrl.searchParams.get('search');
        const sortBy = reqUrl.searchParams.get('sortBy');

        if (category && category !== 'all') {
          const catLower = category.toLowerCase().trim();
          prods = prods.filter(p => {
            const pCatId = (p.categoryId || '').toLowerCase();
            const pCatName = (p.categoryName || '').toLowerCase();
            const pName = (p.name || '').toLowerCase();

            // Direct ID or name match
            if (pCatId === catLower || pCatId === `cat_${catLower}` || pCatName.includes(catLower)) {
              return true;
            }

            // Keyword aliases
            if (catLower === 'wearables' || catLower === 'cat_wearables') {
              return pCatId === 'cat_wearables' || pCatName.includes('wearable') || pCatName.includes('watch') || pName.includes('watch') || pName.includes('tracker') || pName.includes('fitness band') || pName.includes('smart ring');
            }
            if (catLower === 'audio' || catLower === 'cat_audio') {
              return pCatId === 'cat_audio' || pCatName.includes('audio') || pCatName.includes('sound') || pName.includes('headphone') || pName.includes('earbud') || pName.includes('speaker') || pName.includes('soundbar');
            }
            if (catLower === 'electronics' || catLower === 'cat_electronics') {
              return pCatId === 'cat_electronics' || pCatName.includes('electronic') || pCatName.includes('gadget');
            }
            if (catLower === 'shoes' || catLower === 'footwear' || catLower === 'sneakers') {
              return (pCatId === 'cat_fashion' || pCatId === 'cat_sports') && (pName.includes('shoe') || pName.includes('sneaker') || pName.includes('loafer') || pName.includes('sandal') || pName.includes('slide') || pName.includes('boot') || pName.includes('trainer') || pName.includes('footwear'));
            }
            if (catLower === 'tshirt' || catLower === 't-shirt' || catLower === 'polos') {
              return pCatId === 'cat_fashion' && (pName.includes('shirt') || pName.includes('tee') || pName.includes('polo') || pName.includes('top') || pName.includes('hoodie'));
            }
            if (catLower === 'gaming' || catLower === 'gaming-tech') {
              return pCatId === 'cat_electronics' && (pName.includes('game') || pName.includes('console') || pName.includes('mouse') || pName.includes('pad') || pName.includes('cable') || pName.includes('mic') || pName.includes('earphone') || pName.includes('fan') || pName.includes('hub') || pName.includes('controller'));
            }
            if (catLower === 'fashion' || catLower === 'cat_fashion' || catLower === 'apparel') {
              return pCatId === 'cat_fashion' || pCatName.includes('fashion') || pCatName.includes('apparel');
            }
            if (catLower === 'home' || catLower === 'cat_home' || catLower === 'home-living') {
              return pCatId === 'cat_home' || pCatName.includes('home') || pCatName.includes('living') || pCatName.includes('kitchen');
            }
            if (catLower === 'beauty' || catLower === 'cat_beauty') {
              return pCatId === 'cat_beauty' || pCatName.includes('beauty') || pCatName.includes('wellness');
            }
            if (catLower === 'sports' || catLower === 'cat_sports') {
              return pCatId === 'cat_sports' || pCatName.includes('sports') || pCatName.includes('outdoors') || pCatName.includes('fitness');
            }
            if (catLower === 'accessories') {
              return pCatId === 'cat_fashion' || pName.includes('sunglasses') || pName.includes('bag') || pName.includes('duffel') || pName.includes('power bank');
            }

            return false;
          });
        }
        if (search) {
          const q = search.toLowerCase().trim();
          prods = prods.filter(p => {
            const pName = (p.name || '').toLowerCase();
            const pDesc = (p.description || '').toLowerCase();
            const pCat = (p.categoryName || '').toLowerCase();
            const pSpecs = (p.specs || []).join(' ').toLowerCase();
            const fullText = `${pName} ${pDesc} ${pCat} ${pSpecs}`;
            
            if (fullText.includes(q)) return true;

            const terms = q.split(/\s+/).filter(Boolean);
            return terms.every(term => {
              if (fullText.includes(term)) return true;
              // Singular / plural checks (e.g. headphone vs headphones, shoe vs shoes)
              if (term.endsWith('s') && term.length > 3 && fullText.includes(term.slice(0, -1))) return true;
              if (fullText.includes(term + 's')) return true;
              if (term === 'headphone' && (fullText.includes('headphone') || fullText.includes('earbud') || fullText.includes('audio') || fullText.includes('headset'))) return true;
              if (term === 'earphone' && (fullText.includes('earphone') || fullText.includes('earbud') || fullText.includes('headphone'))) return true;
              return false;
            });
          });
        }

        const maxPrice = reqUrl.searchParams.get('maxPrice');
        const minPrice = reqUrl.searchParams.get('minPrice');
        const offer = reqUrl.searchParams.get('offer');

        if (maxPrice) {
          const max = parseFloat(maxPrice);
          if (!isNaN(max)) prods = prods.filter(p => p.price <= max);
        }
        if (minPrice) {
          const min = parseFloat(minPrice);
          if (!isNaN(min)) prods = prods.filter(p => p.price >= min);
        }
        if (offer === 'under299') {
          prods = prods.filter(p => p.price <= 299);
        }
        if (offer === 'under399') {
          prods = prods.filter(p => p.price <= 399);
        }
        if (sortBy === 'price_asc') prods.sort((a, b) => a.price - b.price);
        if (sortBy === 'price_desc') prods.sort((a, b) => b.price - a.price);
        if (sortBy === 'rating') prods.sort((a, b) => b.rating - a.rating);

        return sendJson(res, 200, { products: prods });
      }

      if (pathname.match(/^\/api\/products\/([^/]+)$/) && method === 'GET') {
        const prodId = pathname.split('/')[3];
        const prod = db.getProductById(prodId);
        if (!prod) return sendError(res, 404, 'Product not found');
        return sendJson(res, 200, { product: prod, reviews: db.getReviews(prodId) });
      }

      if (pathname === '/api/admin/products' && method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const body = await parseBody(req);
        const cat = db.getCategoryById(body.categoryId);
        const newProduct = {
          id: `prod_${crypto.randomUUID().slice(0, 8)}`,
          name: body.name.trim(),
          categoryId: body.categoryId,
          categoryName: cat ? cat.name : 'General',
          price: parseFloat(body.price),
          stock: parseInt(body.stock, 10) || 0,
          description: body.description || '',
          rating: 5.0,
          reviewCount: 0,
          featured: Boolean(body.featured),
          image: body.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
          specs: body.specs || [],
          createdAt: new Date().toISOString()
        };
        db.addProduct(newProduct);
        return sendJson(res, 201, { success: true, product: newProduct });
      }

      if (pathname.match(/^\/api\/admin\/products\/([^/]+)$/) && method === 'DELETE') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        db.deleteProduct(pathname.split('/')[4]);
        return sendJson(res, 200, { success: true });
      }

      if (pathname === '/api/categories' && method === 'GET') {
        const cats = db.getCategories();
        const prods = db.getProducts();
        return sendJson(res, 200, {
          categories: cats.map(c => ({ ...c, itemCount: prods.filter(p => p.categoryId === c.id).length }))
        });
      }

      if (pathname === '/api/admin/categories' && method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const body = await parseBody(req);
        const newCat = {
          id: `cat_${body.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: body.name.trim(),
          description: body.description || ''
        };
        db.addCategory(newCat);
        return sendJson(res, 201, { success: true, category: newCat });
      }

      if (pathname.match(/^\/api\/admin\/categories\/([^/]+)$/) && method === 'DELETE') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const catId = pathname.split('/')[4];
        db.deleteCategory(catId);
        return sendJson(res, 200, { success: true, message: 'Category deleted' });
      }

      // ORDERS & PAYMENT GATEWAY
      if (pathname === '/api/orders/place' && method === 'POST') {
        if (!user) return sendError(res, 401, 'Please sign in to order');
        if (user.status !== 'approved') return sendError(res, 403, 'Account pending approval.');

        const body = await parseBody(req);
        const { items, shippingAddress, paymentDetails, couponCode } = body;

        for (const item of items) {
          const product = db.getProductById(item.productId);
          if (!product || product.stock < item.quantity) {
            return sendError(res, 400, `Item "${item.name}" insufficient stock.`);
          }
        }

        const AVAILABLE_COUPONS = {
          'WELCOME10': { type: 'percent', value: 10, minOrder: 0 },
          'FESTIVE20': { type: 'percent', value: 20, minOrder: 0 },
          'FLAT500': { type: 'flat', value: 500, minOrder: 1500 },
          'FREESHIP': { type: 'shipping', value: 99, minOrder: 0 },
          'MEGA50': { type: 'percent', value: 50, minOrder: 0 }
        };

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let shippingFee = subtotal >= 999 ? 0 : 99;
        let discount = 0;
        let validCoupon = null;

        if (couponCode && typeof couponCode === 'string') {
          const cleanCode = couponCode.trim().toUpperCase();
          const found = AVAILABLE_COUPONS[cleanCode];
          if (found && (!found.minOrder || subtotal >= found.minOrder)) {
            validCoupon = cleanCode;
            if (found.type === 'percent') {
              discount = Math.round((subtotal * found.value) / 100);
            } else if (found.type === 'flat') {
              discount = Math.min(found.value, subtotal);
            } else if (found.type === 'shipping') {
              discount = shippingFee;
              shippingFee = 0;
            }
          }
        }

        const discountedSubtotal = Math.max(0, subtotal - (validCoupon && AVAILABLE_COUPONS[validCoupon]?.type === 'shipping' ? 0 : discount));
        const tax = parseFloat((discountedSubtotal * 0.18).toFixed(2));
        const totalAmount = parseFloat((discountedSubtotal + shippingFee + tax).toFixed(2));

        const paymentId = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;
        const gatewayRef = `GW_TXN_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

        // Decrement stock
        for (const item of items) {
          const p = db.getProductById(item.productId);
          db.updateProduct(item.productId, { stock: p.stock - item.quantity });
        }

        const payment = {
          id: paymentId,
          orderId,
          customerId: user.id,
          customerName: user.name,
          amount: totalAmount,
          discount,
          coupon: validCoupon,
          paymentMethod: `${paymentDetails?.method || 'Credit Card'}${paymentDetails?.cardLast4 ? ` (ending in ${paymentDetails.cardLast4})` : ''}`,
          gatewayRef,
          status: 'success',
          createdAt: new Date().toISOString()
        };
        db.addPayment(payment);

        const order = {
          id: orderId,
          customerId: user.id,
          customerName: user.name,
          customerEmail: user.email,
          items,
          subtotal,
          coupon: validCoupon,
          discount,
          shippingFee,
          tax,
          totalAmount,
          shippingAddress: shippingAddress || {},
          paymentMethod: payment.paymentMethod,
          paymentStatus: 'completed',
          paymentId,
          orderStatus: 'confirmed',
          trackingNumber: `TRK-US-${Math.floor(100000 + Math.random() * 900000)}`,
          deliveryPartner: 'FedEx Priority',
          trackingHistory: [
            { status: 'placed', timestamp: new Date().toISOString(), note: 'Order placed by customer.', location: 'Store' },
            { status: 'confirmed', timestamp: new Date().toISOString(), note: 'Payment confirmed by Gateway.', location: 'Payment Gateway' }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.addOrder(order);

        await sendOrderConfirmationEmail(order, baseUrl);
        return sendJson(res, 201, { success: true, order, payment });
      }

      if (pathname === '/api/orders' && method === 'GET') {
        let orders = [];
        if (user) {
          orders = user.role === 'admin' ? db.getOrders() : db.getOrdersByCustomer(user.id);
        } else {
          orders = db.getOrders().slice(0, 5);
        }
        return sendJson(res, 200, { orders });
      }

      if (pathname.match(/^\/api\/orders\/([^/]+)$/) && method === 'GET') {
        const order = db.getOrderById(pathname.split('/')[3]);
        if (!order) return sendError(res, 404, 'Order not found');
        return sendJson(res, 200, { order });
      }

      if (pathname.match(/^\/api\/orders\/([^/]+)\/return$/) && method === 'POST') {
        const orderId = pathname.split('/')[3];
        const order = db.getOrderById(orderId);
        if (!order) return sendError(res, 404, 'Order not found');

        const body = await parseBody(req);
        const returnId = `RET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const returnRecord = {
          returnId,
          orderId: order.id,
          reason: body.reason || 'Defective / performance not as expected',
          resolution: body.resolution || 'refund',
          comments: body.comments || '',
          pickupSlot: body.pickupSlot || 'Tomorrow, 9:00 AM - 1:00 PM',
          pickupAddress: body.pickupAddress || order.shippingAddress,
          refundAmount: order.totalAmount,
          status: 'return_approved',
          requestedAt: new Date().toISOString()
        };

        const updatedHistory = [
          ...order.trackingHistory,
          {
            status: 'return_initiated',
            timestamp: new Date().toISOString(),
            note: `Return #${returnId} requested: ${returnRecord.resolution === 'replace' ? 'Replacement item dispatched' : 'Full refund of ₹' + Number(order.totalAmount || 0).toFixed(2) + ' to be issued upon pickup'}. Reason: ${returnRecord.reason}`,
            location: 'OmniStore Return Center'
          }
        ];

        const updated = db.updateOrder(orderId, {
          orderStatus: 'return_in_progress',
          returnInfo: returnRecord,
          trackingHistory: updatedHistory
        });

        if (returnRecord.resolution === 'refund') {
          await sendRefundConfirmationEmail(updated, {
            amount: updated.totalAmount,
            reason: returnRecord.reason,
            refundId: returnRecord.returnId
          }, baseUrl);
        } else {
          await sendReturnConfirmationEmail(updated, returnRecord, baseUrl);
        }

        return sendJson(res, 200, { success: true, returnRecord, order: updated });
      }

      if (pathname.match(/^\/api\/orders\/([^/]+)\/cancel$/) && method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const order = db.getOrderById(pathname.split('/')[3]);
        if (!order) return sendError(res, 404, 'Order not found');

        for (const item of order.items) {
          const p = db.getProductById(item.productId);
          if (p) db.updateProduct(item.productId, { stock: p.stock + item.quantity });
        }

        const updated = db.updateOrder(order.id, {
          orderStatus: 'cancelled',
          paymentStatus: 'refunded',
          trackingHistory: [...order.trackingHistory, { status: 'cancelled', timestamp: new Date().toISOString(), note: 'Order cancelled. Refund issued.', location: 'System' }]
        });
        if (order.paymentId) db.updatePayment(order.paymentId, { status: 'refunded' });

        await sendOrderCancellationEmail(updated, baseUrl);
        return sendJson(res, 200, { success: true, order: updated });
      }

      if (pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/) && method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin access required');
        const orderId = pathname.split('/')[4];
        const body = await parseBody(req);
        const order = db.getOrderById(orderId);
        if (!order) return sendError(res, 404, 'Order not found');

        const updateData = {
          orderStatus: body.status,
          trackingHistory: [...order.trackingHistory, { status: body.status, timestamp: new Date().toISOString(), note: body.note || 'Status updated.', location: 'Logistics Center' }]
        };

        if (body.status === 'cancelled') {
          updateData.paymentStatus = 'refunded';
          if (order.paymentId) db.updatePayment(order.paymentId, { status: 'refunded' });
        }

        const updated = db.updateOrder(orderId, updateData);

        if (body.status === 'cancelled') {
          await sendOrderCancellationEmail(updated, baseUrl);
        } else {
          await sendDeliveryStatusUpdateEmail(updated, body.status, body.note, baseUrl);
        }

        return sendJson(res, 200, { success: true, order: updated });
      }

      // PAYMENTS, REVIEWS, REPORTS, EMAILS
      if (pathname === '/api/admin/payments' && method === 'GET') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin required');
        return sendJson(res, 200, { payments: db.getPayments() });
      }

      if (pathname.match(/^\/api\/admin\/payments\/([^/]+)\/refund$/) && method === 'POST') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin required');
        const paymentId = pathname.split('/')[4];
        const updated = db.updatePayment(paymentId, { status: 'refunded' });

        const order = db.getOrders().find(o => o.paymentId === paymentId || o.id === updated?.orderId);
        if (order) {
          await sendRefundConfirmationEmail(order, {
            amount: updated.amount,
            reason: 'Payment refund processed by store administrator',
            refundId: updated.id
          }, baseUrl);
        }

        return sendJson(res, 200, { success: true, payment: updated });
      }

      if (pathname === '/api/reviews' && method === 'GET') {
        return sendJson(res, 200, { reviews: db.getReviews(reqUrl.searchParams.get('productId')) });
      }

      if (pathname === '/api/reviews' && method === 'POST') {
        if (!user) return sendError(res, 401, 'Unauthorized');
        const body = await parseBody(req);
        const review = {
          id: `rev_${crypto.randomUUID().slice(0, 8)}`,
          productId: body.productId,
          customerId: user.id,
          customerName: user.name,
          rating: parseInt(body.rating, 10),
          comment: body.comment,
          verifiedPurchase: true,
          createdAt: new Date().toISOString()
        };
        db.addReview(review);
        return sendJson(res, 201, { success: true, review });
      }

      if (pathname === '/api/admin/reports' && method === 'GET') {
        if (!user || user.role !== 'admin') return sendError(res, 403, 'Admin required');
        const orders = db.getOrders();
        const users = db.getUsers().filter(u => u.role === 'customer');
        const completed = orders.filter(o => o.orderStatus !== 'cancelled');
        const totalRevenue = completed.reduce((sum, o) => sum + o.totalAmount, 0);

        const categorySales = {};
        db.getCategories().forEach(c => categorySales[c.name] = 0);
        completed.forEach(o => {
          o.items.forEach(i => {
            const prod = db.getProductById(i.productId);
            const cat = prod?.categoryName || 'General';
            categorySales[cat] = (categorySales[cat] || 0) + (i.price * i.quantity);
          });
        });

        return sendJson(res, 200, {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalOrders: orders.length,
          completedOrdersCount: completed.length,
          averageOrderValue: completed.length ? parseFloat((totalRevenue / completed.length).toFixed(2)) : 0,
          totalCustomers: users.length,
          pendingCustomers: users.filter(u => u.status === 'pending_approval').length,
          approvedCustomers: users.filter(u => u.status === 'approved').length,
          categorySales,
          topProducts: db.getProducts().slice(0, 4).map(p => ({ ...p, revenue: p.price * 5, unitsSold: 5 }))
        });
      }

      if (pathname === '/api/emails' && method === 'GET') {
        return sendJson(res, 200, { emails: db.getEmails() });
      }

      return sendError(res, 404, `Route not found: ${method} ${pathname}`);
    } catch (err) {
      console.error('API Error:', err);
      return sendError(res, 500, err.message);
    }
  }

  // --- LOCAL STATIC ASSETS SERVING ---
  serveStatic(req, res, pathname);
}

// Start standalone HTTP server when executed directly (`node api/index.js` or `npm start`)
const isMainModule = process.argv[1] && process.argv[1].endsWith('index.js');
if (isMainModule && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  OmniStore Running at http://localhost:${PORT}`);
    console.log(`  Ready for local development & Vercel deployment!`);
    console.log(`======================================================\n`);
  });
}
