# Testing Guide - Slither.io Core

## 🎮 Game is Ready to Play!

Both servers are running and ready for testing:
- ✅ **Server**: ws://localhost:8080 (WebSocket)
- ✅ **Client**: http://localhost:3000 (Web Interface)

### 🆕 Latest Improvements (November 22, 2025)
- ✅ **Jerkiness Removed**: Ultra-smooth movement with enhanced camera easing
- ✅ **Dynamic Growth**: Pellets now vary in size (4-8 units), growth proportional to size
- ✅ **Better Interpolation**: Seamless visuals between server ticks

## Quick Start

### 1. Open the Game

Navigate to: **http://localhost:3000**

### 2. Enter Your Name

Type your player name (or leave blank for "Anonymous") and click **Play**.

### 3. Control Your Snake

- **Move your mouse** to control the direction
- Your snake automatically moves forward
- Eat colorful pellets to grow
- Avoid hitting other snakes!

## 🧪 Testing Checklist

### Single Player Testing

- [ ] **Start Game**: Enter name and click Play
- [ ] **Movement**: Snake follows mouse cursor smoothly
- [ ] **Camera**: View follows your snake as you move
- [ ] **Grid**: Background grid scrolls with movement
- [ ] **Pellets**: Collect pellets by moving into them
- [ ] **Growth**: Snake gets longer when eating pellets
- [ ] **Name Display**: Your name appears above your snake
- [ ] **Leaderboard**: Your name appears in the leaderboard

### Multiplayer Testing

Open **multiple browser tabs** to `http://localhost:3000`:

- [ ] **Multiple Players**: Each tab creates a separate snake
- [ ] **Real-time Sync**: All snakes visible to all players
- [ ] **Collision Detection**: Hitting another snake kills you
- [ ] **Death Screen**: "You Died!" screen shows final score
- [ ] **Respawn**: Click "Play Again" to rejoin
- [ ] **Leaderboard Updates**: Top 5 players shown in real-time

### Visual Features

- [ ] **Snake Colors**: Each snake has a unique color
- [ ] **Snake Eyes**: Heads have eyes pointing forward
- [ ] **Body Segments**: Smooth, gradient-styled segments
- [ ] **Ultra-Smooth Movement**: 60 FPS rendering with no jerkiness
- [ ] **Camera Easing**: Smooth camera following (20% smoothing)
- [ ] **UI Polish**: Glassmorphism effects on panels
- [ ] **Gold/Silver/Bronze**: Top 3 players highlighted
- [ ] **Connection Status**: Shows "Connected" in top-left
- [ ] **Varied Pellets**: Different sized pellets (4-8 units)

### Edge Cases

- [ ] **Very Long Snake**: Grow to 50+ segments
- [ ] **World Boundaries**: Go near edges of 5000x5000 world
- [ ] **Fast Rotation**: Rapidly move mouse in circles
- [ ] **Tab Switch**: Game continues when switching tabs
- [ ] **Reconnection**: Close and reopen browser tab

## 🎯 Expected Behavior

### Normal Gameplay

1. **Spawning**: Appears at random location with 5 segments
2. **Movement**: Ultra-smooth forward motion at 150 units/sec (jerkiness-free)
3. **Turning**: Max 360°/sec rotation (no instant turns)
4. **Eating**: Pellet disappears, snake grows by 2-4 segments (based on pellet size)
5. **Collision**: Instant death, shows final score
6. **Respawn**: New snake at new random location

### Performance Targets

- **Client FPS**: 60 FPS (check with browser DevTools)
- **Server TPS**: 20 updates/second
- **Latency**: < 50ms on localhost
- **Player Count**: Supports 10-20+ concurrent players

## 🐛 Known Behaviors

### Intentional Design Choices

- **No Self-Collision**: Snake cannot hit its own body (optional feature)
- **Instant Death**: No health points, one-hit death
- **Random Spawn**: New snakes appear at random safe locations
- **No Invincibility**: Can die immediately after spawning if unlucky

### Visual Quirks

- **Interpolation**: Movement is smooth and jerkiness-free (enhanced algorithm)
- **Segment Spacing**: Body segments have fixed 15-unit gaps
- **Camera Smoothing**: 20% easing factor for professional camera feel
- **Pellet Sizes**: Pellets vary from 4 to 8 units for visual variety

## 📊 Monitoring Server

Check server terminal output for:

```
Player player-0 connected
Snake Bob (player-0) spawned at (2345, 1678)
Player player-0 joined as "Bob"
Snake Alice (player-1) spawned at (3456, 2789)
Player player-1 joined as "Alice"
```

### Server Logs Show

- Player connections/disconnections
- Snake spawns with positions
- Player join events

## 🎮 Multiplayer Test Scenarios

### Scenario 1: Basic Multiplayer

1. Open 2 tabs
2. Join as "Player 1" and "Player 2"
3. Move around and find each other
4. Observe both snakes moving smoothly
5. Check leaderboard shows both players

### Scenario 2: Collision Test

1. Open 2 tabs
2. Join with different names
3. Maneuver one snake's head into the other's body
4. Verify the hitting snake dies
5. Verify death screen shows correct score
6. Respawn and try again

### Scenario 3: Leaderboard Competition

1. Open 3-5 tabs
2. Join with different names
3. Compete to eat the most pellets
4. Watch leaderboard update in real-time
5. Verify top 3 have gold/silver/bronze colors

### Scenario 4: Stress Test

1. Open 10+ tabs simultaneously
2. Join all as players
3. Move all snakes actively
4. Check for:
   - Smooth performance
   - No lag or jitter
   - All snakes visible
   - Collisions working correctly

## 🔧 Troubleshooting

### Game Won't Load

- Check server is running: `http://localhost:8080`
- Check client is running: `http://localhost:3000`
- Check browser console for errors (F12)

### Snake Not Moving

- Ensure you clicked "Play" button
- Check mouse is over the game canvas
- Check browser console for WebSocket errors

### Can't See Other Players

- Verify multiple tabs are connected
- Check server terminal for connection logs
- Refresh all browser tabs

### Performance Issues

- Close other applications
- Reduce number of open tabs
- Check CPU usage in Activity Monitor
- Lower pellet count in `shared/constants.ts`

## 📝 Feedback Checklist

After testing, evaluate:

- [ ] **Fun Factor**: Is the game enjoyable?
- [ ] **Smoothness**: Does movement feel fluid?
- [ ] **Responsiveness**: Do inputs feel immediate?
- [ ] **Fairness**: Are collisions accurate?
- [ ] **Clarity**: Is the UI easy to understand?
- [ ] **Polish**: Do visual effects look good?

## 🎉 Success Criteria

The implementation is successful if:

✅ Multiple players can join simultaneously
✅ All snakes move smoothly without jitter
✅ Collisions are detected accurately
✅ Death and respawn work correctly
✅ Leaderboard updates in real-time
✅ Game maintains 60 FPS with 10+ players
✅ UI is clear and responsive
✅ No critical bugs or crashes

## 🚀 Next Testing Phase

Once core gameplay is validated:

1. Test with 20+ concurrent players
2. Test on different browsers (Chrome, Firefox, Safari)
3. Test on different devices
4. Profile performance bottlenecks
5. Gather user feedback
6. Tune game parameters
7. Prepare for Web3 integration

---

**Happy Testing!** 🎮

If you encounter any issues, check:
1. Server terminal logs
2. Client browser console (F12)
3. Network tab for WebSocket messages
4. System resource usage

