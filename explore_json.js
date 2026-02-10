const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/HYPE-R/.gemini/antigravity/playground/white-orion/api_response.json', 'utf8'));

console.log("Keys in root:", Object.keys(data));
if (data.dailyActivity && data.dailyActivity.length > 0) {
    console.log("Keys in dailyActivity[0]:", Object.keys(data.dailyActivity[0]));
    console.log("Sample dailyActivity[0]:", JSON.stringify(data.dailyActivity[0], null, 2));
} else {
    console.log("dailyActivity is empty or missing");
}

if (data.template && data.template.length > 0) {
    console.log("Keys in template[0]:", Object.keys(data.template[0]));
}
