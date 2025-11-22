# Quick Start Guide

## 🎮 Playing the Game

The game servers are now running!

### Access the Game

Open your browser and navigate to:
```
http://localhost:3000
```

### Controls

- **Mouse Movement**: Control your snake's direction
- The snake moves continuously forward
- Point your mouse where you want to go

### Objective

1. Eat colorful pellets to grow your snake
2. Avoid hitting other snakes' bodies
3. Compete for the top spot on the leaderboard!

### Multiplayer Testing

To test multiplayer functionality, open multiple browser tabs or windows to `http://localhost:3000`.

Each tab represents a different player that can interact in real-time.

## 📊 Game Status

- ✅ **Server**: Running on port 8080
- ✅ **Client**: Running on port 3000
- ✅ **WebSocket**: Active and ready for connections

## 🛑 Stopping the Servers

To stop the servers, press `Ctrl+C` in the terminal windows where they're running.

## 🎯 Features Implemented

- [x] Real-time multiplayer gameplay
- [x] Smooth snake movement with interpolation
- [x] Pellet consumption and growth
- [x] Snake-to-snake collision detection
- [x] Death and respawn system
- [x] Live leaderboard (Top 5 players)
- [x] Responsive camera following player
- [x] Grid background
- [x] Name display above snakes
- [x] Colored snakes with unique hues

## 🚀 Next Steps

The core gameplay is complete! You can now:

1. Test multiplayer by opening multiple tabs
2. Customize game parameters in `shared/constants.ts`
3. Adjust visual styles in `client/index.html`
4. Later: Add Web3 integration, blockchain features, etc.

Enjoy playing!

