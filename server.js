const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: "*", // In production, you might want to restrict this to your frontend domain
  methods: ["GET", "POST"]
}));

// Serve a simple status page
app.get('/', (req, res) => {
  res.send('Whiteboard Server is running. Connect your socket.io client.');
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // In production, you might want to restrict this to your frontend domain
    methods: ["GET", "POST"]
  }
});

// Store drawing data and active users
let drawingData = [];
let activeUsers = {};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Send existing drawing data to new client
  socket.emit('drawing-history', drawingData);
  socket.emit('active-users', activeUsers);

  // Handle user join
  socket.on('user-join', (userData) => {
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
    // In a real app, we'd need to implement proper erasing logic
    // Here we just broadcast the erase event to all clients
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

// Helper function to generate random color
function getRandomColor() {
  const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#F3FF33', 
    '#FF33F3', '#33FFF3', '#FFA333', '#A333FF'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 