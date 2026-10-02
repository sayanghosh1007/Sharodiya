import express from 'express';
import { PANDALS_DATA, EATERIES_DATA } from '../../js/data.js';

const router = express.Router();

// POST /api/itinerary/recommend
router.post('/recommend', (req, res) => {
  try {
    const {
      archetype = 'friends',
      day = 'Maha Ashtami',
      timeWindow = 'midnight',
      zone = 'all',
      cuisine = 'biryani',
      pace = 'balanced'
    } = req.body;

    // 1. Determine target stops
    let targetPandals = 5;
    let targetEateries = 2;
    if (pace === 'relaxed') {
      targetPandals = 3;
      targetEateries = 1;
    } else if (pace === 'balanced') {
      targetPandals = 5;
      targetEateries = 2;
    } else if (pace === 'intense') {
      targetPandals = 7;
      targetEateries = 2;
    }

    // 2. Filter candidate pandals
    let candidatePandals = PANDALS_DATA;
    if (zone && zone !== 'all') {
      candidatePandals = candidatePandals.filter(p => p.zoneKey === zone.toLowerCase());
    }
    if (candidatePandals.length < targetPandals) {
      candidatePandals = PANDALS_DATA;
    }

    // 3. Score candidate pandals
    const scoredPandals = candidatePandals.map(pandal => {
      let score = 0;
      const cats = Array.isArray(pandal.category) ? pandal.category : [pandal.category];

      if (archetype === 'friends') {
        if (cats.includes('theme')) score += 6;
        if (cats.includes('lighting')) score += 5;
        if (cats.includes('popular')) score += 4;
        if (pandal.crowdLevel === 'Peak' || pandal.crowdLevel === 'High') score += 3;
      } else if (archetype === 'family') {
        if (cats.includes('traditional')) score += 8;
        if (cats.includes('sabeki')) score += 6;
        if (cats.includes('eco')) score += 4;
        if (pandal.crowdLevel === 'Low' || pandal.crowdLevel === 'Moderate') score += 5;
      } else if (archetype === 'couple') {
        if (cats.includes('lighting')) score += 7;
        if (pandal.location.toLowerCase().includes('lake') || pandal.location.toLowerCase().includes('park')) score += 6;
        if (cats.includes('traditional')) score += 3;
      } else if (archetype === 'solo' || archetype === 'culture') {
        if (cats.includes('eco')) score += 6;
        if (cats.includes('theme')) score += 5;
        if (pandal.zoneKey === 'north') score += 4;
      }

      const daySeed = (day.length * 11 + pandal.name.length * 7) % 7;
      score += daySeed;

      return { pandal, score };
    });

    scoredPandals.sort((a, b) => b.score - a.score);
    const selectedPandals = scoredPandals.slice(0, targetPandals).map(sp => sp.pandal);

    // 4. Filter candidate eateries
    let candidateEateries = EATERIES_DATA;
    if (cuisine === 'biryani') {
      candidateEateries = candidateEateries.filter(e => e.category === 'midnight' || e.cuisine.toLowerCase().includes('biryani') || e.cuisine.toLowerCase().includes('mughlai'));
    } else if (cuisine === 'bengali') {
      candidateEateries = candidateEateries.filter(e => e.category === 'traditional' || e.cuisine.toLowerCase().includes('bengali') || e.cuisine.toLowerCase().includes('thali'));
    } else if (cuisine === 'street') {
      candidateEateries = candidateEateries.filter(e => e.category === 'street' || e.cuisine.toLowerCase().includes('fry') || e.cuisine.toLowerCase().includes('chop'));
    } else if (cuisine === 'sweets') {
      candidateEateries = candidateEateries.filter(e => e.category === 'cafes' || e.cuisine.toLowerCase().includes('sandesh') || e.cuisine.toLowerCase().includes('sweet'));
    } else if (cuisine === 'finedine') {
      candidateEateries = candidateEateries.filter(e => e.category === 'finedine');
    }

    if (candidateEateries.length < targetEateries) {
      candidateEateries = EATERIES_DATA;
    }

    const sortedEateries = [...candidateEateries].sort((a, b) => b.rating - a.rating);
    const selectedEateries = sortedEateries.slice(0, targetEateries);

    // 5. Build timeline
    const startHourMap = {
      'morning': 8,
      'afternoon': 13,
      'evening': 17,
      'midnight': 23,
      'allday': 9
    };
    let currentHour = startHourMap[timeWindow] || 17;
    let currentMinute = 0;

    const formatTimeSlot = (startH, startM, durationM) => {
      const endTotalM = (startH * 60 + startM + durationM) % (24 * 60);
      const endH = Math.floor(endTotalM / 60);
      const endM = endTotalM % 60;

      const formatSingle = (h, m) => {
        const period = h >= 12 && h < 24 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const displayM = String(m).padStart(2, '0');
        return `${String(displayH).padStart(2, '0')}:${displayM} ${period}`;
      };

      return `${formatSingle(startH, startM)} - ${formatSingle(endH, endM)}`;
    };

    const itineraryItems = [];
    let pandalIdx = 0;
    let eateryIdx = 0;
    const totalStops = selectedPandals.length + selectedEateries.length;

    const foodInsertPoints = [];
    if (selectedEateries.length === 1) {
      foodInsertPoints.push(Math.floor(selectedPandals.length / 2));
    } else if (selectedEateries.length === 2) {
      foodInsertPoints.push(2);
      foodInsertPoints.push(selectedPandals.length);
    }

    let pCount = 0;
    for (let i = 0; i < totalStops; i++) {
      if (foodInsertPoints.includes(pCount) && eateryIdx < selectedEateries.length) {
        const eatery = selectedEateries[eateryIdx++];
        const duration = 60;
        const timeSlot = formatTimeSlot(currentHour, currentMinute, duration);

        itineraryItems.push({
          id: 'gen_e_' + Date.now() + '_' + eateryIdx,
          type: 'eatery',
          itemId: eatery.id,
          name: `${eatery.name} (${eatery.outlet})`,
          zone: eatery.location,
          timeSlot: timeSlot,
          distanceFromPrev: '1.2 km (Transit / Walk)',
          duration: `${duration} mins`,
          notes: `Food Stop: Must-try ${eatery.mustTry ? eatery.mustTry.slice(0, 2).join(', ') : 'Specialties'} (${eatery.avgPrice}).`,
          details: eatery
        });

        const newTotalM = (currentHour * 60 + currentMinute + duration + 15) % (24 * 60);
        currentHour = Math.floor(newTotalM / 60);
        currentMinute = newTotalM % 60;
      } else if (pandalIdx < selectedPandals.length) {
        const pandal = selectedPandals[pandalIdx++];
        pCount++;
        const duration = 75;
        const timeSlot = formatTimeSlot(currentHour, currentMinute, duration);

        itineraryItems.push({
          id: 'gen_p_' + Date.now() + '_' + pandalIdx,
          type: 'pandal',
          itemId: pandal.id,
          name: pandal.name,
          zone: pandal.location,
          timeSlot: timeSlot,
          distanceFromPrev: pandalIdx === 1 ? '0 km (Starting Point)' : '1.8 km (Metro / Walk)',
          duration: `${duration} mins`,
          notes: `Theme: ${pandal.theme}. Nearest Metro: ${pandal.nearestMetro}.`,
          details: pandal
        });

        const newTotalM = (currentHour * 60 + currentMinute + duration + 20) % (24 * 60);
        currentHour = Math.floor(newTotalM / 60);
        currentMinute = newTotalM % 60;
      }
    }

    res.json({
      success: true,
      itinerary: {
        options: req.body,
        day,
        archetype,
        timeWindow,
        zone,
        cuisine,
        pace,
        items: itineraryItems,
        totalEstDistance: (itineraryItems.length * 2.2).toFixed(1),
        totalEstHours: (itineraryItems.length * 1.4).toFixed(1),
        totalPandals: selectedPandals.length,
        totalEateries: selectedEateries.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
