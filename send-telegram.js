// send-telegram.js
// 사용법: node send-telegram.js [day번호]
// 예시: node send-telegram.js 32

const https = require('https');
const fs = require('fs');

// ⚠️ 실제 사용 시 환경변수로 관리하세요
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8430660669:AAGpjvHoTFVbkk24CDW_-f5hI0StZQ1mA00";
const CHANNEL = process.env.TELEGRAM_CHANNEL || "@economic_terms_daily";

// terms.json 경로 (GitHub 저장소 기준)
const termsPath = './terms.json';

async function sendDailyTerms(dayNumber) {
  // terms.json 로드
  let terms;
  try {
    terms = JSON.parse(fs.readFileSync(termsPath, 'utf8'));
  } catch (e) {
    console.error('❌ terms.json 로드 실패:', e.message);
    process.exit(1);
  }

  // Day 번호 결정
  const totalDays = Math.ceil(terms.length / 4);
  let currentDay = dayNumber;
  
  if (!currentDay) {
    // 시작일 기준 자동 계산
    const START_DATE = new Date('2025-01-01');
    const today = new Date();
    const diffTime = today.getTime() - START_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    currentDay = (diffDays % totalDays) + 1;
  }

  // 오늘의 용어 4개
  const startIdx = (currentDay - 1) * 4;
  const todayTerms = terms.slice(startIdx, startIdx + 4);

  if (todayTerms.length === 0) {
    console.log('❌ 해당 Day에 용어가 없습니다.');
    process.exit(1);
  }

  console.log(`📅 Day ${currentDay} 발송 준비...`);
  console.log(`용어: ${todayTerms.map(t => t.term).join(', ')}`);

  // 메시지 생성
  const termsList = todayTerms.map((t, i) => {
    const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'][i];
    const simple = t.simpleExplanation || t.definition || '';
    // 너무 긴 설명은 자르기
    const shortSimple = simple.length > 80 ? simple.substring(0, 80) + '...' : simple;
    return `${emoji} <b>${t.term}</b>\n${shortSimple}`;
  }).join('\n\n');

  const webAppUrl = `https://basic-economic-vocab.netlify.app/?day=${currentDay}`;

  const message = `📚 <b>오늘의 경제금융용어 (Day ${currentDay})</b>
━━━━━━━━━━━━━━━━━━━━

${termsList}

━━━━━━━━━━━━━━━━━━━━

👉 <a href="${webAppUrl}">자세히 학습하기</a>

#경제용어 #금융공부 #매일학습`;

  // 텔레그램 API 호출
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: CHANNEL,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.ok) {
            console.log(`\n✅ 발송 성공!`);
            console.log(`채널: ${CHANNEL}`);
            console.log(`메시지 ID: ${result.result.message_id}`);
            resolve(result);
          } else {
            console.error('❌ 발송 실패:', result.description);
            reject(new Error(result.description));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 실행
const dayArg = process.argv[2] ? parseInt(process.argv[2]) : null;
sendDailyTerms(dayArg).catch(console.error);
