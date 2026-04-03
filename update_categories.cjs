const fs = require('fs');
let content = fs.readFileSync('src/data.ts', 'utf-8');
content = content.replace(/category: "地宫"/g, 'category: "恋念"');
content = content.replace(/category: "特权"/g, 'category: "超值"');
fs.writeFileSync('src/data.ts', content);
