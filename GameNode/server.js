/* jshint node:true */

var cloak = require('cloak');
var _ = require('underscore');
var connect = require('connect');
var express = require('express');
const app = express();
var youtubedl = require('youtube-dl');
var fs = require('fs');
const bodyParser = require('body-parser');
var path = require('path');
const ypi = require('youtube-playlist-info');

var clientPort = 8080;
var serverPort = 8090;

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

async function downloadYoutubeVid(url) {
  var video = await youtubedl(url, ['-f 140'],
    { cwd: __dirname });
  var createdFileName = "";

  // Will be called when the download starts.
  /*video.on('info', function (info) {
    createdFileName = info._filename;
  });*/
  var rand = Math.random();
  console.log("hi");
  video.on("end", function() {
    console.log("doneski");
  });
  var pos = 0;
  video.on('data', function data(chunk) {
    pos += chunk.length;
    // `size` should not be 0 here.
    if (1) {
      process.stdout.cursorTo(0);
      process.stdout.clearLine(1);
      process.stdout.write(pos+ ' pos');
    }
  });
  video.pipe(fs.createWriteStream("client/media/video" + rand.toString() + ".mp3"));
  return "/media/video" + rand.toString() + ".mp3"; //attach to game
}
 
/*async function downloadPlaylist(url) {
  var video = await youtubedl(url, ["-f 140"], null);
  var createdFile = "";
  video.on('error', function error(err) {
    return 'error 2:' + err;
  });

  var size = 0;
  video.on('info', function (info) {
    size = info.size;
    createdFile = path.join(__dirname + '/', size + '.m4a');
    video.pipe(fs.createWriteStream(createdFile));
  });

  video.on('next', downloadPlaylist);
}*/

async function getPlayList(url) {
  try {
    const videos = [];

    var PlaylistID = url.split("list=")[1];
    await ypi("AIzaSyDt2-8433-k2eK0GGUIUbKvmO2jkbIvH8Y", PlaylistID).then(items => {
      //console.log(items);
      //List of songs is the titles of the youtube video

      items.forEach(function (value) {
        videos.push({
          title: value.title,
          video_id: value.resourceId.videoId
        });
      });
    });
    return videos;
  }
  catch (e) {
    //playlist link is invalid, do something, don't continue
    return 'ERROR: Link invalid';
  }
}

app.get('/downloadYoutube/:url', async function (req, res) {
  const data = await downloadYoutubeVid(req.params.url);
  res.pipe(fs.createReadStream('client' + data));
})

app.get('/getPlaylist/:url', async function (req, res) {
  const data = await getPlayList(req.params.url);
  res.json(data);
})

var sendLobbyCount = function (arg) {
  this.messageMembers('chat', "for lobby");
};

cloak.configure({
  port: serverPort,
  messages: {
    chat: function (msg, user) {
      user.getRoom().messageMembers('chat', msg);
    },
    joinLobby: function (arg, user) {
      cloak.getLobby().addMember(user);
      user.message('joinLobbyResponse');
      console.log("User Joined Lobby " + user.id);
    },
    joinRoom: function (id, user) {
      cloak.getRoom(id).addMember(user);
      user.message('joinRoomResponse', {
        id: id,
        success: true
      });
    },

    listRooms: function (arg, user) {
      user.message('listRooms', cloak.getRooms(true));
      console.log("List Rooms " + cloak.getRooms(true));
    },

    listUsers: function (arg, user) {
      user.message('refreshLobby', {
        users: user.room.getMembers(true),
        inLobby: user.room.isLobby,
        roomCount: user.room.getMembers().length,
        roomSize: user.room.size
      });
    },
    createRoom: function (arg, user) {
      var room = cloak.createRoom(Math.floor(Math.random() * 100000 - 1), 1000);
      var success = room.addMember(user);
      user.message('roomCreated', {
        success: success,
        roomId: room.id,
        roomName: room.name,
        user: user,
        room: room
      });

    }

  },

  lobby: {
    newMember: sendLobbyCount,
    memberLeaves: sendLobbyCount,
  },
  room: {
    init: function () {
      /*
        Room Variables,
        this.xxxxxxxxx
        need scores, songs, playlist, l
        etc etc etc


      */


      console.log("Room Initation " + this.name + " " + this.id);
    },


    pulse: function () {
      // add timed turn stuff here
    },

    close: function () {
      this.messageMembers('you have left ' + this.name);
    }

  }
});

cloak.run();

connect()
  .use(connect.static('./client'))
  .listen(clientPort);

console.log('client running on on ' + clientPort);

app.listen(8070, function () {
  console.log('Example app listening on port 8070!');
})
