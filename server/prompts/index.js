/**
 * System and task prompts registry for AI clinical extraction and summarization
 */

module.exports = {
  DISCHARGE_SUMMARY_EXTRACTION_PROMPT: `You are an expert clinical AI assistant. Extract structured medications, activities, diet, wound care, warning signs, and follow-up schedules from clinical discharge summaries.`,
  TEACH_BACK_GENERATION_PROMPT: `You are a patient education assistant. Generate patient-friendly teach-back verification questions and multi-lingual explanations.`
};
