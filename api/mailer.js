import crypto from 'node:crypto';
import { db } from './db.js';

export function sendEmail({ to, subject, html, type, recipientName, metadata = {} }) {
  const emailRecord = {
    id: `eml_${crypto.randomUUID().slice(0, 8)}`,
    to,
    subject,
    body: html,
    type,
    recipientName: recipientName || to.split('@')[0],
    status: 'sent',
    metadata,
    sentAt: new Date().toISOString()
  };

  db.addEmail(emailRecord);
  console.log(`[EMAIL DISPATCHED] To: ${to} | Type: ${type} | Subject: ${subject}`);
  return emailRecord;
}

export function sendRegistrationPendingEmail(user) {
  const html = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:30px 24px;text-align:center;color:#ffffff;">
        <h1 style="margin:0;font-size:22px;font-weight:700;">Account Registration Received</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Manual Admin Verification in Progress</p>
      </div>
      <div style="padding:28px 24px;color:#334155;line-height:1.6;">
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Thank you for registering at <strong>OmniStore</strong>. To protect buyers and sellers, new customer accounts require manual review and verification by our store administrator.</p>
        
        <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px;border-radius:0 8px 8px 0;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:#1e40af;font-weight:600;">Status: PENDING MANUAL ADMIN APPROVAL</p>
          <p style="margin:4px 0 0;font-size:12px;color:#3b82f6;">Registered Email: <strong>${user.email}</strong></p>
        </div>

        <p>You will receive an approval notification email as soon as the administrator verifies your account.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    recipientName: user.name,
    subject: `Registration Received - Awaiting Admin Approval (${user.name})`,
    type: 'admin_approval_request',
    html,
    metadata: { userId: user.id }
  });
}

export function sendAccountApprovedEmail(user, baseUrl = '') {
  const loginUrl = `${baseUrl}?login_email=${encodeURIComponent(user.email)}`;
  const html = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#065f46,#10b981);padding:30px 24px;text-align:center;color:#ffffff;">
        <h1 style="margin:0;font-size:22px;font-weight:700;">Account Approved by Admin!</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Your customer profile is now fully verified</p>
      </div>
      <div style="padding:28px 24px;color:#334155;line-height:1.6;">
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Great news! The store administrator has reviewed and <strong>approved</strong> your customer account.</p>
        
        <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:14px;border-radius:0 8px 8px 0;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:#065f46;font-weight:600;">Status: VERIFIED & ACTIVE</p>
        </div>

        <p>You can now sign in to start shopping, manage your cart, and place orders.</p>

        <div style="text-align:center;margin:28px 0;">
          <a href="${loginUrl}" style="background:#10b981;color:#ffffff;text-decoration:none;padding:12px 28px;font-weight:600;font-size:14px;border-radius:6px;display:inline-block;">
            Sign In to Your Account &rarr;
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    recipientName: user.name,
    subject: `✓ Your Account Has Been Approved! Welcome to OmniStore`,
    type: 'account_approved',
    html,
    metadata: { userId: user.id }
  });
}

export function sendVerificationTokenLinkEmail(user, token, baseUrl = '') {
  const verifyUrl = `${baseUrl}?verify_token=${token}`;
  const html = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:30px 24px;text-align:center;color:#ffffff;">
        <h1 style="margin:0;font-size:22px;font-weight:700;">Admin Verification Email</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Complete your account verification</p>
      </div>
      <div style="padding:28px 24px;color:#334155;line-height:1.6;">
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>The administrator has requested that you verify your email address to complete your account activation.</p>
        
        <div style="text-align:center;margin:28px 0;">
          <a href="${verifyUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;font-weight:600;font-size:14px;border-radius:6px;display:inline-block;">
            Verify My Email Address &rarr;
          </a>
        </div>

        <p style="font-size:12px;color:#64748b;">Or copy this link:<br>
          <a href="${verifyUrl}" style="color:#4f46e5;word-break:break-all;">${verifyUrl}</a>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    recipientName: user.name,
    subject: `Action Required: Verify your email address`,
    type: 'verification_link',
    html,
    metadata: { userId: user.id, token }
  });
}

export function sendAccountRejectedEmail(user, reason) {
  const html = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#dc2626;padding:26px 20px;text-align:center;color:#ffffff;">
        <h2 style="margin:0;font-size:20px;">Account Verification Update</h2>
      </div>
      <div style="padding:24px;color:#334155;line-height:1.6;">
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Your account registration could not be approved at this time.</p>
        <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px;margin:16px 0;">
          <strong>Reason:</strong> ${reason || 'Incomplete registration details.'}
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    recipientName: user.name,
    subject: `Notice Regarding Your Account Registration`,
    type: 'account_rejected',
    html,
    metadata: { userId: user.id, reason }
  });
}

export function sendOrderConfirmationEmail(order, baseUrl = '') {
  const itemsHtml = order.items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <strong>${i.name}</strong> &times; ${i.quantity}
      </td>
      <td style="padding:8px 0;text-align:right;border-bottom:1px solid #f1f5f9;">
        ₹${(i.price * i.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:28px 20px;text-align:center;color:#ffffff;">
        <h2 style="margin:0;font-size:20px;">Order Confirmation & Receipt</h2>
        <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Order #${order.id} | Paid via ${order.paymentMethod}</p>
      </div>
      <div style="padding:24px;color:#334155;">
        <p>Thank you for your order, <strong>${order.customerName}</strong>! Your payment has been confirmed by our payment gateway.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td style="padding-top:10px;font-weight:600;">Total Paid:</td>
              <td style="padding-top:10px;font-weight:700;font-size:15px;text-align:right;">₹${order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
        <div style="text-align:center;margin:20px 0;">
          <a href="${baseUrl}?track_order=${order.id}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 24px;font-weight:600;font-size:13px;border-radius:6px;display:inline-block;">
            Track Your Shipment Live &rarr;
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: order.customerEmail,
    recipientName: order.customerName,
    subject: `Order Confirmed: #${order.id} (₹${order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`,
    type: 'order_confirmation',
    html,
    metadata: { orderId: order.id }
  });
}

export function sendDeliveryStatusUpdateEmail(order, status, note, baseUrl = '') {
  const html = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#2563eb;padding:24px 20px;text-align:center;color:#ffffff;">
        <h2 style="margin:0;font-size:18px;">Delivery Status Update</h2>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.9;">Order #${order.id}</p>
      </div>
      <div style="padding:20px;color:#334155;">
        <p>Hello <strong>${order.customerName}</strong>,</p>
        <p>Your order status has been updated to: <strong>${status.toUpperCase()}</strong></p>
        ${note ? `<p style="font-size:12px;color:#64748b;">Note: ${note}</p>` : ''}
        <div style="text-align:center;margin:20px 0;">
          <a href="${baseUrl}?track_order=${order.id}" style="background:#1e40af;color:#ffffff;text-decoration:none;padding:10px 20px;font-weight:600;font-size:13px;border-radius:6px;display:inline-block;">
            View Tracking Timeline
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: order.customerEmail,
    recipientName: order.customerName,
    subject: `Delivery Update: Order #${order.id} is now ${status}`,
    type: 'delivery_update',
    html,
    metadata: { orderId: order.id, status }
  });
}
