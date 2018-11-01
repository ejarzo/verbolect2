import React, { Component } from 'react';
import Sketch1 from 'components/p5sketches/Sketch1';
import RovingEye from 'components/RovingEye';
import NewsHeadline from 'components/NewsHeadline';
import YoutubePlayer from 'components/YoutubePlayer';
import AudioPlayer from 'components/AudioPlayer';
import ConversationSummaryGraph from 'components/ConversationSummaryGraph';
import { getColorForEmotion, getEmotionCategoryForEmotion } from 'utils/color';
import { getRandomIn } from 'utils/data';

import {
  getYoutubeComments,
  getFreesounds,
  getCleverbotReply,
  getNews,
  getYoutubeVideos,
  getLanguage,
} from 'middleware/middleware.js';

class VecTorBel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showEye: false,
      showVideo: true,
      showTreemap: false,

      todaysArticle: '',
      replies: [],
      lastCBResponse: { cs: '' },
      count: 0,

      voices: [],
      currentVoice: null,

      videoId: '',
      videoComments: [],

      soundUrl: '',

      filterColor: 'rgb(255,255,255)',
      youtubeBlurAmount1: 0,
      youtubeBlurAmount2: 0,

      responsesPerCycle: 10,
      runIndefinitely: false,
    };

    this.begin = this.begin.bind(this);
    this.speak = this.speak.bind(this);

    this.getNews = this.getNews.bind(this);
    this.getVoices = this.getVoices.bind(this);
    this.getYoutubeData = this.getYoutubeData.bind(this);
    this.getSoundUrl = this.getSoundUrl.bind(this);
    this.getNextReply = this.getNextReply.bind(this);
  }

  async componentDidMount() {
    if (
      typeof speechSynthesis !== 'undefined' &&
      speechSynthesis.onvoiceschanged !== undefined
    ) {
      speechSynthesis.onvoiceschanged = this.getVoices;
    }

    // this.channel = new window.BroadcastChannel('ttt');
  }

  componentWillUnmount() {
    // this.channel.close();
  }

  async begin() {
    const { articles } = await getNews().catch(error => {
      console.log(error);
      return {};
      // TODO: handle get news error
    });
    if (!articles) return;

    // let initArticle = getRandomIn(articles);
    let initArticle = articles[0];

    // search top headline on youtube
    const [{ videoId, videoComments }, soundUrl] = await Promise.all([
      this.getYoutubeData(initArticle.title),
      this.getSoundUrl('news+music', { min: 45, max: 300 }),
    ]);

    this.speak(initArticle.title);
    // initialize with top headline
    this.setState({
      todaysArticle: initArticle,
      replies: [{ text: initArticle.title, source: 'news' }],
      videoId,
      videoComments,
      soundUrl,
    });
  }

  getVoices() {
    if (typeof speechSynthesis === 'undefined') {
      return;
    }

    const voices = speechSynthesis.getVoices();
    this.setState({ voices });
    return voices;
  }

  async speak(input) {
    if (this.state.voices.length === 0) {
      console.log('no voice yet');
      return;
    }
    const language = await getLanguage(input);
    const languageCode =
      language.probability > 10 ? language.language_code : 'en';
    const voice = this.state.voices.find(
      voice => voice.lang.slice(0, 2) === languageCode
    );
    console.log('Language:', language, voice);
    const { count, responsesPerCycle } = this.state;

    const synth = window.speechSynthesis;
    const utterThis = new SpeechSynthesisUtterance(input);

    utterThis.onend = () => {
      synth.cancel();
      this.setState({ showCommentOverlay: false, isSpeaking: false });
      console.log('============ done speaking ===========');

      console.log('count', count);
      const cosTime =
        5 * (Math.cos(((2 * Math.PI) / responsesPerCycle) * count) + 1);
      const maxTimeUntilNextResponse = 3 * cosTime;
      // const minTimeUntilNextResponse = cosTime;

      // console.log('max next time', maxTimeUntilNextResponse);
      // console.log('min next time', minTimeUntilNextResponse);
      // const timeUntilNextReply =
      //   Math.random() * (maxTimeUntilNextResponse - minTimeUntilNextResponse) +
      //   minTimeUntilNextResponse;

      console.log('-- timeUntilNextReply', maxTimeUntilNextResponse);
      if (this.state.runIndefinitely) {
        setTimeout(this.getNextReply, maxTimeUntilNextResponse * 1000);
      }
    };

    utterThis.volume = 1;
    utterThis.pitch = 1;
    // utterThis.rate = count / responsesPerCycle / 2 + 0.3;
    utterThis.rate = 1;
    utterThis.onerror = error => {
      console.log('speak error');
      console.log(error);
    };
    utterThis.voice = voice;
    this.setState({ isSpeaking: true });
    console.log(utterThis);
    synth.speak(utterThis);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.voices.length === 0 && this.state.voices.length > 0) {
      this.setState({
        currentVoice: this.state.voices[0],
      });
    }
  }

  async getSoundUrl(query, minMax) {
    console.log('getsoundurl', minMax);
    const freeSounds = await getFreesounds(query, minMax).catch(error => {
      console.log('get sounds error:', error);
    });

    if (!freeSounds) return '';
    return getRandomIn(freeSounds).previews['preview-hq-mp3'];
  }

  async getYoutubeData(query) {
    let videoId = '';
    let videoComments = [];
    const videos = await getYoutubeVideos(query).catch(error => {
      // TODO: handle no videos
      console.log('error getting videos');
      console.log(error);
    });

    if (!videos) return { videoId, videoComments };

    const randomVideo = getRandomIn(videos);

    videoId = randomVideo.id.videoId;
    videoComments = await getYoutubeComments(videoId).catch(error => {
      // TODO: handle no comments
      return [];
    });

    return { videoId, videoComments };
  }

  async getNextReply() {
    const {
      replies,
      videoComments,
      lastCBResponse,
      count,
      responsesPerCycle,
    } = this.state;
    const prevReply = replies[replies.length - 1];
    const nextReplies = replies.slice();

    const minSoundLength = (responsesPerCycle * 3) / (count + 1);
    const maxSoundLength = minSoundLength + minSoundLength * 3;
    const minMax = { min: minSoundLength, max: maxSoundLength };

    if (
      (replies.length === 2 || replies.length % 13 === 0) &&
      videoComments.length > 0
    ) {
      // get comment reply
      const { text, author } = videoComments[0];
      const nextReply = text;

      nextReplies.push({ text, source: 'comment' });

      const [
        { videoId, videoComments: nextVideoComments },
        soundUrl,
      ] = await Promise.all([
        this.getYoutubeData(nextReply),
        this.getSoundUrl('comment', minMax),
      ]);

      this.setState({
        replies: nextReplies,
        count: this.state.count + 1,
        videoId,
        videoComments: nextVideoComments,
        showCommentOverlay: true,
      });

      if (soundUrl) {
        this.setState({
          soundUrl,
        });
      }
      this.speak(text);
    } else {
      // Get cleverbot response

      const cleverbotResponse = await getCleverbotReply(
        prevReply ? prevReply.text : ''
      );
      const nextReply = cleverbotResponse.output;
      const emotion = cleverbotResponse.emotion;
      const reaction = cleverbotResponse.reaction;

      nextReplies.push({ text: nextReply, source: 'cleverbot', emotion });

      const [{ videoId, videoComments }, soundUrl] = await Promise.all([
        this.getYoutubeData(nextReply),
        this.getSoundUrl(nextReply, minMax),
      ]);

      const emotionColor = getColorForEmotion(emotion);
      const emotionSoundUrl =
        !soundUrl &&
        (await this.getSoundUrl(
          getEmotionCategoryForEmotion(`${emotion}+${reaction}`),
          minMax
        ));

      this.setState({
        replies: nextReplies,
        lastCBResponse: cleverbotResponse,
        count: this.state.count + 1,
        videoId,
        videoComments,
        showCommentOverlay: false,
        filterColor: emotionColor,
      });
      if (soundUrl || emotionSoundUrl) {
        this.setState({
          soundUrl: soundUrl || emotionSoundUrl,
        });
      }
      this.speak(nextReply);
    }
  }

  async getNews() {
    const { articles } = await getNews().catch(() => ({}));
    if (articles[3].title !== this.state.todaysArticle.title) {
      console.log('NEW HEADLINE');
      console.log(articles[3].title);

      // let initArticle = getRandomIn(articles);
      let initArticle = articles[3];

      // search top headline on youtube
      const [{ videoId, videoComments }, soundUrl] = await Promise.all([
        this.getYoutubeData(initArticle.title),
        this.getSoundUrl(initArticle.title),
      ]);

      this.speak(initArticle.title);
      // initialize with top headline
      this.setState({
        todaysArticle: initArticle,
        replies: [{ text: initArticle.title, source: 'news' }],
        videoId,
        videoComments,
      });
      if (soundUrl) {
        this.setState({
          soundUrl,
        });
      }
    } else {
      console.log('same title');
      console.log(articles[0].title);
      console.log(this.state.todaysArticle.title);
    }
  }

  render() {
    const {
      showEye,
      showVideo,
      showTreemap,
      videoId,
      videoComments,
      replies,
      lastCBResponse,
      youtubeBlurAmount1,
      youtubeBlurAmount2,
      showCommentOverlay,
      soundUrl,
      isSpeaking,
    } = this.state;

    const n = replies.length;
    const latestReply = replies[n - 1];

    if (!this.state.currentVoice) {
      return null;
    }

    return (
      <div className="App" style={{ paddingBottom: 100 }}>
        {showVideo && (
          <div className="VideoContainer">
            <YoutubePlayer
              getNextReply={this.getNextReply}
              count={n}
              blurAmount1={youtubeBlurAmount1}
              blurAmount2={youtubeBlurAmount2}
              videoId={videoId}
            />
          </div>
        )}

        {showEye && <RovingEye />}

        {/*<div
          style={{
            mixBlendMode: 'hue',
            transition: 'all 0.5s',
            position: 'absolute',
            width: '100vw',
            height: '100vh',
            background: this.state.filterColor,
          }}
        />*/}

        <div className="SketchContainer">
          {latestReply && (
            <Sketch1
              newReply={latestReply}
              newData={lastCBResponse}
              count={this.state.count}
            />
          )}
        </div>

        {latestReply && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              transition: 'all 0.3s',
              transform: `translate3d(${showCommentOverlay ? 0 : 100}vw, 0, 0)`,
              mixBlendMode: 'screen',
              // bottom: 0,
              // width: '100%',
              padding: 30,
              // top: 0,
              fontFamily: 'Roboto',
              color: '#222',
              background: 'white',
              fontSize: '8em',
            }}
          >
            "{latestReply.text}"
          </div>
        )}
        <div className="controls" style={{ zIndex: 20 }}>
          <button onClick={this.begin}>BEGIN</button>
          <button
            onClick={() => {
              // Send a message on "my_bus".
              // this.channel.postMessage('This is a test message.');
            }}
          >
            SEND MESSAGE
          </button>
          <button onClick={this.getNextReply}>GO</button>
          <button
            onClick={() =>
              this.setState({ showTreemap: !this.state.showTreemap })
            }
          >
            Toggle treemap
          </button>
          <button
            onClick={() =>
              this.setState({ runIndefinitely: !this.state.runIndefinitely })
            }
          >
            Toggle infinite
          </button>
          <button onClick={this.getNews}>CHECK FOR NEWS UPDATES</button>
          <button
            onClick={() => {
              this.setState({
                youtubeBlurAmount1: 0,
                youtubeBlurAmount2: 0,
              });
            }}
          >
            CLEAR BLUR
          </button>
          <button
            onClick={() => {
              this.setState({
                youtubeBlurAmount1: Math.random() * 50,
              });
            }}
          >
            RANDOM BLUR 1
          </button>
          <button
            onClick={() => {
              this.setState({
                youtubeBlurAmount2: Math.random() * 50,
              });
            }}
          >
            RANDOM BLUR 2
          </button>
          <button
            onClick={() => {
              const r = Math.random() * 255;
              const g = Math.random() * 255;
              const b = Math.random() * 255;
              this.setState({
                filterColor: `rgb(${r},${g},${b})`,
              });
            }}
          >
            RANDOM COLOR
          </button>
        </div>

        <NewsHeadline headline={this.state.replies[0]} />

        <AudioPlayer src={soundUrl} isSpeaking={isSpeaking} />
        {latestReply && (
          <div style={{ position: 'absolute', zIndex: 1 }}>
            <ConversationSummaryGraph
              enabled={showTreemap}
              currEmotion={latestReply.emotion}
            />
          </div>
        )}
      </div>
    );
  }
}

export default VecTorBel;
