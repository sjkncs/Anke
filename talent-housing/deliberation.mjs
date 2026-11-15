// Supply facts for the existing model/tool loop, without prescribing a winner.
// Policy constraints remain authoritative; comparisons never reserve housing.
export function decisionContext(application, units, results) {
  const facts = results.map(row => {
    const unit = units.find(u => u.id === row.unitId);
    return {
      unitId: row.unitId, state: row.state,
      monthlyCost: row.totalCost, commuteMinutes: row.commute,
      bedrooms: unit.bedrooms, qualityAssessment: unit.quality,
      setupCost: row.setupCost, furnished: row.furnished,
      availableOn: unit.availableOn,
      blocked: row.blocked, unknown: row.unknown,
      source: unit.source, supply: row.supply,
      currentEvidence: row.evidence, plannedEvidence: row.future,
      residentRating: row.residentRating,
    };
  }).sort((a,b) => a.unitId.localeCompare(b.unitId));
  const feasible = facts.filter(row => row.state === 'matched');
  const dimensions = [
    ['monthlyCost', -1], ['commuteMinutes', -1], ['setupCost', -1],
    ['bedrooms', 1], ['qualityAssessment', 1],
  ];
  // Dominance is valid only when every compared measurement is known.
  const dominates = (a,b) => dimensions.every(([key]) =>
    Number.isFinite(a[key]) && Number.isFinite(b[key])) &&
    dimensions.every(([key,sign]) => sign*a[key] >= sign*b[key]) &&
    dimensions.some(([key,sign]) => sign*a[key] > sign*b[key]);
  const alternatives = feasible.filter(b => !feasible.some(a => a !== b && dominates(a,b)));
  const contrasts = dimensions.flatMap(([field]) => {
    const measured = alternatives.filter(row => Number.isFinite(row[field]));
    if(measured.length < 2) return [];
    const low = Math.min(...measured.map(row => row[field]));
    const high = Math.max(...measured.map(row => row[field]));
    return low === high ? [] : [{field, minimum:low, maximum:high,
      measurements:measured.map(row => ({unitId:row.unitId,value:row[field]}))}];
  });
  return {
    version:'housing-deliberation-v1', applicationId:application.id,
    policy:{eligibility:application.eligibility, ruleVersion:application.ruleVersion,
      priority:application.priority, allocationChanged:false},
    // Ordered by ID so legacy utility scores do not silently determine exposure.
    candidates:facts, alternatives:alternatives.map(row => row.unitId), contrasts,
    unresolved:facts.filter(row => row.unknown.length).map(row =>
      ({unitId:row.unitId,fields:row.unknown})),
    conflicts:facts.filter(row => row.blocked.length).map(row =>
      ({unitId:row.unitId,constraints:row.blocked})),
    interpretation:{
      legacyScores:'Scenario utilities only; not learned satisfaction probabilities.',
      alternatives:'Non-dominated on the listed numeric measurements only; not a final recommendation. Missing measurements preserve alternatives.',
      modelTask:'Use the user conversation and these sourced facts to compare options. Choose whether to ask a material question, retrieve further evidence, or explain a recommendation. Reassess after each user answer or tool result. Do not automatically choose the highest legacy score.',
      followUp:'Use contrasts to ask about a real trade-off only if the conversation has not already resolved it. Do not infer family members, preferences, school eligibility or future amenities. Do not relax user limits or policy constraints without the relevant authority.',
      emptySupply:'If candidates are empty, explain the missing supply or active query filters; request data or retry retrieval. Never generate housing records.',
      feedback:'User corrections inform this conversation. No preference has been learned or persisted by this read-only operation.',
      output:'Respond in plain Chinese text without Markdown headings, asterisks, decorative symbols or tables. Explain practical reasons, trade-offs and unresolved facts.',
    },
  };
}
