import React, { Component } from 'react';
import YouTube from 'react-youtube';

class YoutubePlayer extends Component {
  handleReady(e) {
    const player = e.target;
    // player.setPlaybackRate(0.5);
    player.mute();
  }

  render() {
    const { videoId } = this.props;
    const options = {
      height: '100%',
      width: '100%',
      playerVars: {
        // https://developers.google.com/youtube/player_parameters
        autoplay: 1,
        controls: 0, // Show pause/play buttons in player
        showinfo: 0, // Hide the video title
        modestbranding: 1, // Hide the Youtube Logo
        enablejsapi: 1,
        rel: 0,
        loop: 1, // Run the video in a loop
        fs: 0, // Hide the full screen button
        cc_load_policy: 0, // Hide closed captions
        iv_load_policy: 3, // Hide the Video Annotations
        autohide: 1, // Hide video controls when playing
      },
    };

    return (
      <div style={{ height: '100%', transform: 'scale(1.4)' }}>
        <YouTube onReady={this.handleReady} videoId={videoId} opts={options} />
      </div>
    );
  }
}

export default YoutubePlayer;
