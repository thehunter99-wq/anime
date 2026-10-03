import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const mailtoSubject = encodeURIComponent(`[${subject}] ${name} - Contact Form`);
    const mailtoBody = encodeURIComponent(`
Contact Form Submission
=======================

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
Sent via contact form
Date: ${new Date().toLocaleString()}
    `);

    return NextResponse.json({
      success: true,
      mailto: `mailto:parthaforwork@outlook.com?subject=${mailtoSubject}&body=${mailtoBody}`,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}