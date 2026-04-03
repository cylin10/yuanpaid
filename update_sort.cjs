const fs = require('fs');
let content = fs.readFileSync('src/data.ts', 'utf-8');

const map = {
  '特权': 10,
  '卡池': 20,
  '贤士': 30,
  '地宫': 40,
  '其他': 50
};

content = content.replace(/(category:\s*"([^"]+)"(?:,\s*extra:\s*"[^"]*")?)\s*\}/g, (match, p1, p2) => {
  const sortId = map[p2] || 99;
  return `${p1}, sortId: ${sortId} }`;
});

fs.writeFileSync('src/data.ts', content);
