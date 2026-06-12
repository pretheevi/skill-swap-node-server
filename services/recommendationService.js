const axios = require('axios');

const ML_SERVER_URL = process.env.ML_SERVER_URL || 'https://imbaki-skill-swap-ml.hf.space';

async function getRecommendations(userId) {
  const response = await axios.post(`${ML_SERVER_URL}/recommend`, {
    user_id: userId
  }, { timeout: 30000 });
  return response.data;
}

module.exports = getRecommendations;
