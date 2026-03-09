const axios = require('axios');

async function getRecommendations(userId) {
  const response = await axios.post('http://localhost:8000/recommend', {
    user_id: userId
  });
  return response.data;
}

module.exports = getRecommendations;