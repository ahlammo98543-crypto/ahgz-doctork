// netlify/functions/update-doctors.js
// Netlify function (Node 18+) — تحديث ملف doctors.json في الريبو عبر GitHub API
exports.handler = async function(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { adminPassword, doctors } = body;

    // حماية بسيطة: نتحقق من كلمة سر الأدمن (تعيطيها كـ ENV في Netlify)
    const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
    if (!ADMIN_SECRET || adminPassword !== ADMIN_SECRET) {
      return { statusCode: 401, body: JSON.stringify({ ok:false, message: 'Unauthorized' }) };
    }

    // إعداد معلومات الريبو — عدّلي الأسماء لو لزم
    const OWNER = 'ahlammo98543-crypto';
    const REPO = 'ahgz-doctork';
    const PATH = 'doctors.json';
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // ضعي التوكن على Netlify كـ ENV (مش هنا)

    if (!GITHUB_TOKEN) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, message: 'Server missing GitHub token' }) };
    }

    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

    // 1) الحصول على SHA الحالي لو الملف موجود (لمعرفة هل نحتاج للـ sha عند التحديث)
    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'update-doctors-function'
      }
    });

    let sha = null;
    if (getRes.ok) {
      const json = await getRes.json();
      sha = json.sha;
    } else if (getRes.status === 404) {
      // الملف غير موجود — سننشئه
      sha = null;
    } else {
      const txt = await getRes.text();
      return { statusCode: getRes.status, body: JSON.stringify({ ok:false, msg: 'GitHub read error', raw: txt }) };
    }

    // 2) تجهيز المحتوى (base64)
    const contentStr = JSON.stringify(Array.isArray(doctors) ? doctors : [], null, 2);
    const contentBase64 = Buffer.from(contentStr, 'utf8').toString('base64');

    // 3) PUT لتحديث أو إنشاء الملف
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'update-doctors-function',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update doctors via admin panel',
        content: contentBase64,
        sha: sha // لو null أو undefined، GitHub سينشئ الملف
      })
    });

    if (!putRes.ok) {
      const txt = await putRes.text();
      return { statusCode: putRes.status, body: JSON.stringify({ ok:false, msg: 'GitHub update failed', raw: txt }) };
    }

    const result = await putRes.json();
    return { statusCode: 200, body: JSON.stringify({ ok:true, result }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, err: String(err) }) };
  }
};
