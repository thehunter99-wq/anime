import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      company,
      address,
      city,
      state,
      zip,
      country,
      copyrightedWork,
      infringingUrls,
      goodFaithStatement,
      accuracyStatement,
      authorizedStatement,
      signature,
    } = body;

    const requiredFields = [
      name, email, phone, address, city, state, zip, country,
      copyrightedWork, infringingUrls, signature
    ];

    if (requiredFields.some(f => !f || !f.trim())) {
      return NextResponse.json({ error: 'All required fields must be filled' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!goodFaithStatement || !accuracyStatement || !authorizedStatement) {
      return NextResponse.json({ error: 'All legal statements must be confirmed' }, { status: 400 });
    }

    const mailtoSubject = encodeURIComponent(`DMCA Takedown Notice - ${name}`);
    const mailtoBody = encodeURIComponent(`
DMCA TAKEDOWN NOTICE
====================

Contact Information:
- Name: ${name}
- Email: ${email}
- Phone: ${phone}
- Company: ${company || 'N/A'}
- Address: ${address}, ${city}, ${state} ${zip}, ${country}

Copyrighted Work:
${copyrightedWork}

Infringing URL(s):
${infringingUrls}

Statements:
- Good Faith Belief: ${goodFaithStatement ? 'Confirmed' : 'Not Confirmed'}
- Accuracy: ${accuracyStatement ? 'Confirmed' : 'Not Confirmed'}
- Authorization: ${authorizedStatement ? 'Confirmed' : 'Not Confirmed'}

Electronic Signature: ${signature}
Date: ${new Date().toLocaleDateString()}

---
This notice was submitted via the DMCA form.
    `);

    return NextResponse.json({
      success: true,
      mailto: `mailto:parthaforwork@outlook.com?subject=${mailtoSubject}&body=${mailtoBody}`,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}