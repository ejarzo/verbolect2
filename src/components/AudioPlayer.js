import React from 'react';
import Tone from 'tone';
Tone.context.latencyHint = 'playback';

class AudioPlayer extends React.Component {
  constructor(props) {
    super(props);
    this.sounds = [];

    const masterCompressor = new Tone.Compressor({
      ratio: 16,
      threshold: -30,
      release: 0.25,
      attack: 0.003,
      knee: 30,
    });

    this.volume = new Tone.Volume();

    const masterLimiter = new Tone.Limiter(-3);
    this.reverb = new Tone.Freeverb(0.4);
    this.filter = new Tone.Filter();
    const masterOutput = new Tone.Gain(0.8).receive('masterOutput');

    masterOutput.chain(
      this.filter,
      this.reverb,
      masterCompressor,
      masterLimiter,
      this.volume,
      Tone.Master
    );

    this.players = [...Array(10)].map((_, i) => {
      const player = new Tone.Player();
      // player.autostart = true;
      player.send('masterOutput');
      return player;
    });
  }

  componentDidUpdate(prevProps) {
    // console.log(prevProps, this.props);
    const { src, count } = this.props;
    if (this.props.src && prevProps.src !== src) {
      const player = this.players[count % 10];
      player.stop('+0.3');
      player.load(src, () => {
        player.start('+5');
      });
    }

    if (this.props.intensity !== !prevProps.intensity) {
      const freq = this.props.intensity * 10000 + 50;
      let roomSize = this.props.intensity / 2;
      if (roomSize > 0.8) {
        roomSize = 0.8;
      }
      if (roomSize < 0) {
        roomSize = 0;
      }
      // console.log(roomSize);
      // console.log(this.props.intensity, freq);
      this.filter.frequency.rampTo(freq, 5);
      this.reverb.roomSize.rampTo(roomSize, 5);
    }

    if (this.props.isSpeaking && !prevProps.isSpeaking) {
      this.volume.volume.rampTo(-18, 0.5);
    }

    if (!this.props.isSpeaking && prevProps.isSpeaking) {
      this.volume.volume.rampTo(-2, 1);
    }
  }

  render() {
    return null;
  }
}

export default AudioPlayer;
