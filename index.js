import express from 'express';

import { transcribeHandler, homeHandler, renderHandler, getChannelVideosIds } from './controllers.js';


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/transcribe', transcribeHandler);

app.get('/', homeHandler);

app.post('/render-transcript', renderHandler);

app.get('/channel-videos', getChannelVideosIds);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

