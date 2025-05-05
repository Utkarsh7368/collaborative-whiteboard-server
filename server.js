const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Your Vercel frontend domains
const allowedOrigins = [
  'https://whiteboard-o4zp6b0ji-utkarsh-guptas-projects-5b5ddd8b.vercel.app',
  'https://whiteboard-p1t7vyouv-utkarsh-guptas-projects-5b5ddd8b.vercel.app',
  'https://whiteboard-ks7v1k6em-utkarsh-guptas-projects-5b5ddd8b.vercel.app',
  'https://whiteboard-7t903cb8p-utkarsh-guptas-projects-5b5ddd8b.vercel.app',
  'https://whiteboard-nxi9o5a8t-utkarsh-guptas-projects-5b5ddd8b.vercel.app',
  'https://whiteboard-5lzw3tr9v-utkarsh-guptas-projects-5b5ddd8b.vercel.app',
  'https://whiteboard-4uh55irw8-utkarsh-guptas-projects-5b5ddd8b.vercel.app'
];

const app = express();
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Check if the origin is allowed
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('Origin allowed:', origin);
      return callback(null, true);
    } else {
      console.log('Origin allowed:', origin);
      return callback(null, true);
    }
  },
  methods: ["GET", "POST"],
  credentials: true
}));

// Serve a simple status page
app.get('/', (req, res) => {
  res.send('Whiteboard Server is running. Connect your socket.io client.');
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow all origins in development
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000, // Increase ping timeout for better connection stability
});

// Store drawing data and active users
let drawingData = [];
let activeUsers = {};

// Enable debugging
io.engine.on("connection_error", (err) => {
  console.log("Connection error:", err.req);      // the request object
  console.log("Connection error:", err.code);     // the error code
  console.log("Connection error:", err.message);  // the error message
  console.log("Connection error:", err.context);  // some additional error context
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Send existing drawing data to new client
  socket.emit('drawing-history', drawingData);
  socket.emit('active-users', activeUsers);

  // Handle user join
  socket.on('user-join', (userData) => {
    console.log('User joined:', userData.name, socket.id);
    const userId = socket.id;
    activeUsers[userId] = {
      id: userId,
      name: userData.name || `User ${Object.keys(activeUsers).length + 1}`,
      color: userData.color || getRandomColor()
    };
    io.emit('user-joined', activeUsers[userId]);
    io.emit('active-users', activeUsers);
  });

  // Handle drawing events
  socket.on('draw', (data) => {
    // Only store a reasonable amount of drawing data to avoid memory issues
    if (drawingData.length > 1000) {
      drawingData = drawingData.slice(-1000);
    }
    drawingData.push(data);
    socket.broadcast.emit('draw', data);
  });

  // Handle clear board event
  socket.on('clear-board', () => {
    drawingData = [];
    io.emit('clear-board');
  });

  // Handle shape drawing
  socket.on('draw-shape', (data) => {
    drawingData.push(data);
    socket.broadcast.emit('draw-shape', data);
  });

  // Handle erasing
  socket.on('erase', (data) => {
    socket.broadcast.emit('erase', data);
  });

  socket.on('disconnect', () => {
    // Remove user from active users
    if (activeUsers[socket.id]) {
      io.emit('user-left', socket.id);
      delete activeUsers[socket.id];
      io.emit('active-users', activeUsers);
    }
    console.log('Client disconnected:', socket.id);
  });
});

function getRandomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
