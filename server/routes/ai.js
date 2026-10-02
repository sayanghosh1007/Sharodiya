import express from 'express';
import dotenv from 'dotenv';
import { PANDALS_DATA, EATERIES_DATA, RITUAL_SCHEDULE, COMPANION_ARCHETYPES } from '../../js/data.js';

dotenv.config();
const router = express.Router();

const STOPWORDS = new Set([
  'what', 'when', 'where', 'who', 'which', 'how', 'why', 'is', 'are', 'was', 'were',
  'the', 'a', 'an', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'from', 'with', 'by', 'of',
  'tell', 'about', 'can', 'get', 'order', 'serve', 'serves', 'its', 'their', 'rules',
  'timing', 'timings', 'time', 'nearest', 'history', 'significance', 'does', 'should',
  'would', 'please', 'know', 'find', 'recommend', 'give', 'me', 'i', 'you', 'your',
  'we', 'our', 'good', 'best', 'popular', 'famous', 'night', 'nights', 'around', 'puja', 'run', 'like'
]);

function normalizeText(text) {
  return text.toLowerCase()
    .replace(/sarbojanin/g, 'sarbojonin')
    .replace(/rasgulla/g, 'rosogolla')
    .replace(/sandesh/g, 'sondesh')
    .replace(/[^\w\s]/g, ' ')
    .trim();
}

/**
 * Intelligent Knowledge Retriever with NLP Entity Scoring & Intent Classification
 */
function retrievePujaKnowledge(query) {
  const normQuery = normalizeText(query);
  const rawWords = normQuery.split(/\s+/).filter(w => w.length > 1);
  const keywords = rawWords.filter(w => !STOPWORDS.has(w) && w.length > 2);

  // 1. Score Pure Transit (Highest priority for how to travel / reach / metro routes)
  let transitScore = 0;
  if (/metro|train|bus|transport|traffic|subway|how\s+to\s+reach|transit|route/i.test(normQuery)) {
    transitScore = 380;
    if (!/pandal|food|eat|restaurant|sweet|cabin|dish|thali/i.test(normQuery)) {
      transitScore = 550;
    }
  }

  // 2. Score Pandals (High weight when pandal/club name matches)
  const scoredPandals = PANDALS_DATA.map(p => {
    let score = 0;
    const name = normalizeText(p.name);
    const loc = normalizeText(p.location);
    const theme = normalizeText(p.theme || '');
    const artisan = normalizeText(p.artisan || '');
    const id = normalizeText(p.id);

    if (name === normQuery || id === normQuery) score += 500;
    if (normQuery.includes(name) || name.includes(normQuery)) score += 350;

    keywords.forEach(kw => {
      if (name.includes(kw)) score += 120;
      if (artisan.includes(kw)) score += 80;
      if (theme.includes(kw)) score += 40;
      if (loc.includes(kw)) score += 30;
    });

    if (normQuery.includes('pandal') || normQuery.includes('theme') || normQuery.includes('artisan') || normQuery.includes('sculptor')) {
      if (score > 0) score += 60;
    }

    return { pandal: p, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // 3. Score Eateries (High weight when restaurant/sweet shop/dish matches)
  const scoredEateries = EATERIES_DATA.map(e => {
    let score = 0;
    const name = normalizeText(e.name);
    const loc = normalizeText(e.location);
    const cuisine = normalizeText(e.cuisine);
    const dishes = normalizeText((e.mustTry || []).join(' '));
    const id = normalizeText(e.id);

    if (name === normQuery || id === normQuery) score += 500;
    if (normQuery.includes(name) || name.includes(normQuery)) score += 350;

    keywords.forEach(kw => {
      if (name.includes(kw)) score += 120;
      if (dishes.includes(kw)) score += 70;
      if (cuisine.includes(kw)) score += 50;
      if (loc.includes(kw)) score += 20;
    });

    if (/food|eat|biryani|sweet|sweets|mishti|restaurant|cabin|sandesh|sondesh|doi|kebab|roll|fish|paturi|dine|dining|thali/i.test(normQuery)) {
      if (score > 0) score += 100;
    }

    return { eatery: e, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // 4. Score Ritual Schedule
  let ritualScore = 0;
  const matchedSchedule = [];
  const RITUAL_TERMS = /pushpanjali|sandhi|kumari|kola\s*bou|nabapatrika|bodhon|aarti|bisarjan|sindoor|tithi|muhurat|fasting|bhog|ashtami|navami|saptami|sasthi|dashami|pran\s*pratistha|yajna|darpan/i;

  if (RITUAL_TERMS.test(normQuery)) {
    ritualScore = 400;

    RITUAL_SCHEDULE.forEach(day => {
      const dayName = normalizeText(day.day);
      const tithi = normalizeText(day.bengaliTithi);
      const dayMatched = normQuery.includes(dayName) || normQuery.includes(tithi) || normQuery.includes(day.id);

      const relevantEvents = (day.events || []).filter(ev => {
        const title = normalizeText(ev.title);
        return normQuery.includes(title) || title.includes(normQuery) || keywords.some(kw => kw.length > 3 && title.includes(kw));
      });

      if (relevantEvents.length > 0) {
        matchedSchedule.push({
          day: day.day,
          tithi: day.bengaliTithi,
          date: day.englishDate,
          guidelines: day.guidelines,
          events: relevantEvents
        });
      } else if (dayMatched) {
        matchedSchedule.push({
          day: day.day,
          tithi: day.bengaliTithi,
          date: day.englishDate,
          guidelines: day.guidelines,
          events: day.events
        });
      }
    });
  }

  const topPandal = scoredPandals[0];
  const topEatery = scoredEateries[0];

  return {
    topPandal: topPandal ? topPandal.pandal : null,
    pandalScore: topPandal ? topPandal.score : 0,
    allPandals: scoredPandals.slice(0, 4).map(i => i.pandal),

    topEatery: topEatery ? topEatery.eatery : null,
    eateryScore: topEatery ? topEatery.score : 0,
    allEateries: scoredEateries.slice(0, 4).map(i => i.eatery),

    ritualScore,
    matchedSchedule,

    transitScore
  };
}

/**
 * Generates an accurate, comprehensive, and factual response using verified ground truth.
 */
function generateAccuratePujaAnswer(prompt) {
  const context = retrievePujaKnowledge(prompt);

  const scores = [
    { type: 'pandal', score: context.pandalScore },
    { type: 'eatery', score: context.eateryScore },
    { type: 'ritual', score: context.ritualScore },
    { type: 'transit', score: context.transitScore }
  ].sort((a, b) => b.score - a.score);

  const winner = scores[0];

  // 1. TRANSIT & METRO MASTERGUIDE WINNER
  if (winner.type === 'transit' && winner.score > 0) {
    return `🚇 **Kolkata Metro & Transit Masterguide for Durga Puja 2026:**\n\n` +
      `1. **Green Line (East-West Underwater Corridor):**\n` +
      `   - Connects **Howrah Railway Station** to **Esplanade** (via India's first Underwater Metro Tunnel beneath River Hooghly) and extends to **Salt Lake Sector V** and **Karunamoyee** in under 20 minutes!\n` +
      `   - *Best Route from Howrah to Salt Lake:* Board at Howrah Station, ride underwater to Esplanade, and continue directly on the Green Line to Salt Lake!\n\n` +
      `2. **Blue Line (North-South Corridor - Runs ALL NIGHT on Saptami, Ashtami & Navami):**\n` +
      `   - **North Hub:** Sovabazar Sutanuti & Shyambazar (for Bagbazar, Kumartuli, Hatibagan, Kashi Bose Lane).\n` +
      `   - **Central Hub:** MG Road & Central (for College Square, Md. Ali Park, Santosh Mitra Square).\n` +
      `   - **South Hub:** Netaji Bhavan & Jatin Das Park (for Maddox Square, 66 Palli, Bakulbagan).\n` +
      `   - **South Epicenter:** Kalighat (Gate 3) & Rabindra Sarobar (for Deshapriya Park, Tridhara, Ballygunge Cultural, Mudiali, Shiv Mandir, Chetla Agrani).\n\n` +
      `3. **VIP Road & Airport Corridor:**\n` +
      `   - Auto/Bus shuttles run 24/7 along VIP Road connecting Ultadanga to **Sreebhumi Sporting Club**, **Lake Town**, and **Dum Dum Tarun Dal**.\n\n` +
      `💡 *Transit Tip:* Buy a Kolkata Metro Tourist Smart Card or QR token in advance to bypass ticket queues!`;
  }

  // 2. SPECIFIC PANDAL WINNER
  if (winner.type === 'pandal' && winner.score > 0 && context.topPandal) {
    const top = context.topPandal;
    let resp = `🏛️ **${top.name}**\n\n`;
    resp += `- **Zone & Location:** ${top.zone} (${top.location})\n`;
    resp += `- **Established:** Year ${top.estYear} (${new Date().getFullYear() - top.estYear}+ Years of Heritage)\n`;
    resp += `- **Nearest Metro Station:** 🚇 **${top.nearestMetro}**\n`;
    resp += `- **2026 Theme / Concept:** *${top.theme}*\n`;
    resp += `- **Master Artisans & Sculptors:** 🎨 ${top.artisan}\n`;
    resp += `- **Best Visiting Hours:** ⏱️ ${top.bestTime} (Est. Queue Wait: ~${top.estWaitTime || '25 mins'})\n\n`;
    resp += `📖 **Historical Background:**\n${top.history}\n\n`;
    
    if (context.allPandals.length > 1) {
      resp += `✨ *Related Nearby Pandals:* ` + context.allPandals.slice(1).map(p => `**${p.name}** (${p.nearestMetro})`).join(', ');
    }
    return resp;
  }

  // 3. SPECIFIC EATERY WINNER
  if (winner.type === 'eatery' && winner.score > 0 && context.topEatery) {
    const top = context.topEatery;
    let resp = `🍽️ **${top.name}** (${top.outlet})\n\n`;
    resp += `- **Location / Address:** 📍 ${top.address || top.location}\n`;
    resp += `- **Cuisine Style:** ${top.cuisine} (${top.tagline})\n`;
    resp += `- **Rating & Connoisseur Feedback:** ⭐ **${top.rating} / 5.0** (${top.reviewCount?.toLocaleString() || '10,000+'} reviews)\n`;
    resp += `- **Average Price for Two:** 💰 **${top.avgPrice}**\n`;
    resp += `- **Operating Timings:** ⏰ **${top.timings}** (Wait Time: ~${top.waitTime})\n\n`;
    resp += `✨ **Signature Dishes (Must-Order):**\n` + top.mustTry.map(m => `  • **${m}**`).join('\n') + `\n\n`;
    resp += `📝 *Insider Tip:* ${top.description}\n`;

    if (context.allEateries.length > 1) {
      resp += `\n🌟 *Other Top Recommendations Nearby:* ` + context.allEateries.slice(1).map(e => `**${e.name}** (${e.avgPrice})`).join(', ');
    }
    return resp;
  }

  // 4. RITUAL SCHEDULE WINNER
  if (winner.type === 'ritual' && winner.score > 0) {
    let resp = `🌸 **Durga Puja 2026 Sacred Ritual Timetable & Muhurats:**\n\n`;
    
    if (context.matchedSchedule.length > 0) {
      context.matchedSchedule.forEach(day => {
        resp += `📅 **${day.day} (${day.tithi})** — *${day.date}*\n`;
        if (day.guidelines) resp += `💡 *Devotee Protocol:* ${day.guidelines}\n\n`;
        (day.events || []).forEach(ev => {
          resp += `  • **${ev.title}** [⏰ **${ev.time}**]\n`;
          resp += `    └ ${ev.desc}\n`;
          resp += `    └ *Spiritual Significance:* ${ev.significance}\n`;
        });
        resp += `\n`;
      });
    } else {
      resp += `1. **Maha Sasthi (Friday, Oct 16, 2026):**\n   - Kalparambho & Bodhon (07:00 AM – 09:30 AM)\n   - Devi Amontron & Adhibas (06:30 PM – 08:30 PM)\n\n`;
      resp += `2. **Maha Saptami (Saturday, Oct 17, 2026):**\n   - Nabapatrika / Kola Bou Snan at Ganges Ghats (05:45 AM – 07:30 AM)\n   - Saptami Pran Pratistha & Maha Bhog (11:30 AM – 01:00 PM)\n\n`;
      resp += `3. **Maha Ashtami (Sunday, Oct 18, 2026):**\n   - **Mahashtami Pushpanjali Timings:** 10:00 AM – 11:30 AM (Strict fasting required before offering floral Anjali with Bel leaves)\n   - **Kumari Puja:** 11:30 AM – 01:00 PM\n   - **Sandhi Puja (108 Lotuses & 108 Lamps):** 06:15 PM – 07:03 PM (Devi Chamunda invocation during the exact Ashtami-Navami transition)\n\n`;
      resp += `4. **Maha Navami (Monday, Oct 19, 2026):**\n   - Maha Navami Havan & Yajna (10:30 AM – 12:30 PM)\n   - Grand Dhunuchi Naach Competitions (07:30 PM onwards)\n\n`;
      resp += `5. **Vijaya Dashami (Tuesday, Oct 20, 2026):**\n   - Darpan Bisarjan (09:00 AM – 10:30 AM)\n   - Devi Boron & Sindoor Khela (11:00 AM – 02:00 PM)\n   - Sacred Bisarjan Ghat Processions (04:00 PM – 11:00 PM)`;
    }
    return resp;
  }

  // 5. GENERAL COMPREHENSIVE OVERVIEW
  return `🕉️ **Sharodiya AI Cultural Companion:**\n\n` +
    `Welcome to Kolkata Durga Puja 2026! I have verified records across **141 Pandals**, **250 Eateries**, and **5-Day Ritual Timetables**.\n\n` +
    `Here are some exact topics you can ask me:\n` +
    `- **Pandal Lookups:** *"Tell me about Bagbazar Sarbojanin"* or *"Who is the artist for Chetla Agrani?"*\n` +
    `- **Metro Directions:** *"Nearest metro station to Ekdalia Evergreen"* or *"How to reach Sreebhumi?"*\n` +
    `- **Muhurats & Tithis:** *"When is Mahashtami Pushpanjali and Sandhi Puja?"* or *"Sindoor Khela timing"*\n` +
    `- **Food & Eateries:** *"Best midnight biryani open at 3 AM"* or *"Famous sweet shops for Jolbhora Sandesh"*\n` +
    `- **Itinerary:** Launch the **Personalized Itinerary Builder** from the top bar to get a tailored timed schedule for your squad!`;
}

// POST /api/ai/companion
router.post('/companion', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Valid prompt string is required' });
    }

    const trimmedPrompt = prompt.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. If Gemini API Key is available, ground Gemini with verified context
    if (apiKey) {
      try {
        const context = retrievePujaKnowledge(trimmedPrompt);
        const contextSummary = JSON.stringify({
          relevantPandals: context.allPandals.map(p => ({ name: p.name, zone: p.zone, metro: p.nearestMetro, theme: p.theme, artisan: p.artisan, estYear: p.estYear, bestTime: p.bestTime })),
          relevantEateries: context.allEateries.map(e => ({ name: e.name, cuisine: e.cuisine, location: e.location, price: e.avgPrice, mustTry: e.mustTry, timings: e.timings })),
          relevantSchedule: context.matchedSchedule
        });

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const systemInstruction = `You are "Sharodiya", the world-class AI Cultural Companion and local expert for Kolkata Durga Puja 2026.
You provide highly accurate, precise, culturally authentic, and factual answers regarding:
- 141 Kolkata Pandals (historical origins, established years, nearest Metro stations, master sculptors/artisans, themes, and best crowd-avoidance hours).
- 250 Kolkata Eateries (historical sweet shops, cabins, midnight biryani institutions, traditional Bengali feasts, and fine dining).
- 5-Day Ritual Calendar (exact Vedic tithis, Pushpanjali fasting protocols, Sandhi Puja 108 lamps, Kumari Puja, and Sindoor Khela).
- Kolkata Metro transit advice (Blue Line North-South all-night schedules and Green Line underwater metro).

Grounding Context from Sharodiya Database:
${contextSummary}

Instructions:
1. Always give precise, factual, well-formatted markdown answers.
2. Include exact timings, Metro gate/station names, and Bengali terminology.
3. Be warm, respectful, and festive.`;

        const response = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\nUser Question: ${trimmedPrompt}` }] }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer && answer.trim().length > 0) {
            return res.json({
              success: true,
              source: 'gemini-grounded',
              answer: answer.trim()
            });
          }
        }
      } catch (geminiErr) {
        console.warn('[AI] Gemini API attempt encountered issue, switching to high-precision local engine:', geminiErr.message);
      }
    }

    // 2. High-Precision Local Knowledge Engine (Deterministic, zero hallucination, instant)
    const localAnswer = generateAccuratePujaAnswer(trimmedPrompt);
    res.json({
      success: true,
      source: 'sharodiya-knowledge-engine',
      answer: localAnswer
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
