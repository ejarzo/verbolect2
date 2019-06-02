const { YOUTUBE_API_KEY } = process.env;
const { fetchApi } = require('./utils');

const fetchYoutubeResults = query => {
  const url = 'https://www.googleapis.com/youtube/v3/search/';
  const params = {
    key: YOUTUBE_API_KEY,
    q: query,
    part: 'snippet',
    type: 'video',
    maxResults: 15,
  };

  return fetchApi(url, params);
};

exports.handler = async (event, context) => {
  console.log('get-videos called');
  const { query } = event.queryStringParameters || {};
  const youtubeResults = await fetchYoutubeResults(query);
  try {
    console.log('success', youtubeResults);
    return {
      statusCode: 200,
      body: JSON.stringify(youtubeResults),
    };
  } catch (error) {
    console.log('error', error);
    return {
      statusCode: 400,
      body: JSON.stringify(error),
    };
  }
};
