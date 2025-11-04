import { GameConfig, Platform, Player } from "@/interface";

// Update camera position based on player position
export const updateCamera = (config: GameConfig, player: Player) => {
  const centerY = config.canvasHeight / 2;
  const playerCenterY = player.y + player.imageHeight / 2;
  
  // Calculate target camera position to keep player centered
  config.targetCameraY = playerCenterY - centerY;
  
  // Smooth camera movement using linear interpolation
  const lerpFactor = config.cameraLerpSpeed;
  config.cameraY += (config.targetCameraY - config.cameraY) * lerpFactor;
};

// Get screen position for rendering (world position - camera offset)
export const getScreenPosition = (worldY: number, config: GameConfig): number => {
  return worldY - config.cameraY;
};

// Generate initial platforms
export const generatePlatforms = (config: GameConfig): Platform[] => {
  const platforms: Platform[] = [];
  
  // Ground platform
  platforms.push({
    id: "ground",
    x: 0,
    y: config.canvasHeight - 20,
    width: config.canvasWidth,
    height: 20,
    moves: false,
    direction: 1,
  });

  // Generate platforms going up with multiple columns
  for (let i = 1; i <= config.maxPlatforms; i++) {
    const platformsPerLevel = Math.random() > 0.4 ? 3 : 2; // 60% chance for 3 platforms, 40% for 2
    const platformWidth = Math.random() * 100 + 80; // Random width between 80-180
    const minGap = 100; // Minimum gap between platforms
    const levelY = config.canvasHeight - (i * config.distanceBetweenPlatforms) - 20;
    
    // Calculate available space and distribute platforms
    const totalPlatformWidth = platformsPerLevel * platformWidth;
    const totalGapWidth = (platformsPerLevel - 1) * minGap;
    const availableSpace = config.canvasWidth - totalPlatformWidth - totalGapWidth;
    
    // Only generate platforms if they can fit with proper spacing
    if (availableSpace > 0) {
      const extraSpace = availableSpace / (platformsPerLevel + 1); // Extra space to distribute
      
      for (let j = 0; j < platformsPerLevel; j++) {
        const platformX = extraSpace + j * (platformWidth + minGap + extraSpace);
        
        // Ensure platform doesn't go out of bounds with safety margins
        const safetyMargin = 10;
        const finalX = Math.max(safetyMargin, Math.min(platformX, config.canvasWidth - platformWidth - safetyMargin));
        const finalWidth = Math.min(platformWidth, config.canvasWidth - finalX - safetyMargin);
        
        // Only add platform if it has reasonable size
        if (finalWidth >= 60) {
          platforms.push({
            id: `platform-${i}-${j}`,
            x: finalX,
            y: levelY,
            width: finalWidth,
            height: 15,
            moves: i > 10 ? Math.random() > 0.8 : false, // 20% chance for moving platforms after level 10
            speedX: Math.random() * 1.5 + 0.5, // Slower moving platforms
            direction: Math.random() > 0.5 ? 1 : -1,
          });
        }
      }
    } else {
      // Fallback: single platform if spacing doesn't work
      const safetyMargin = 20;
      const fallbackWidth = Math.min(platformWidth, config.canvasWidth - safetyMargin * 2);
      const maxX = config.canvasWidth - fallbackWidth - safetyMargin;
      const fallbackX = Math.max(safetyMargin, Math.random() * maxX);
      
      if (fallbackWidth >= 60) {
        platforms.push({
          id: `platform-${i}-fallback`,
          x: fallbackX,
          y: levelY,
          width: fallbackWidth,
          height: 15,
          moves: i > 10 ? Math.random() > 0.8 : false,
          speedX: Math.random() * 1.5 + 0.5,
          direction: Math.random() > 0.5 ? 1 : -1,
        });
      }
    }
  }

  return platforms;
};

// Update moving platforms
export const updatePlatforms = (platforms: Platform[], config: GameConfig) => {
  platforms.forEach(platform => {
    if (platform.moves && platform.speedX) {
      const speedX = platform.speedX; // Type-safe reference
      const platformLevel = platform.y;
      
      // Find sibling platforms on the same level
      const siblings = platforms.filter(p => 
        p.id !== platform.id && 
        Math.abs(p.y - platformLevel) < 20 && 
        !p.moves // Only consider static platforms as boundaries
      );
      
      // Sort siblings by x position
      siblings.sort((a, b) => a.x - b.x);
      
      // Find left and right boundaries based on siblings
      let leftBoundary = 20; // Add minimum margin from edge
      let rightBoundary = config.canvasWidth - 20; // Add minimum margin from edge
      
      for (const sibling of siblings) {
        if (sibling.x + sibling.width < platform.x) {
          // Sibling is to the left
          leftBoundary = Math.max(leftBoundary, sibling.x + sibling.width + 15);
        } else if (sibling.x > platform.x + platform.width) {
          // Sibling is to the right
          rightBoundary = Math.min(rightBoundary, sibling.x - 15);
        }
      }
      
      // Calculate new position
      const newX = platform.x + platform.direction * speedX;
      
      // Check boundaries with safety margins
      if (newX <= leftBoundary || newX + platform.width >= rightBoundary) {
        platform.direction *= -1;
        // Clamp position to stay within bounds
        platform.x = Math.max(leftBoundary, Math.min(newX, rightBoundary - platform.width));
      } else {
        platform.x = newX;
      }
      
      // Final safety check to prevent out-of-bounds
      platform.x = Math.max(0, Math.min(platform.x, config.canvasWidth - platform.width));
    }
  });
};

// Check collision between player and platforms
export const checkPlatformCollision = (player: Player, platforms: Platform[]): boolean => {
  let onPlatform = false;
  
  platforms.forEach(platform => {
    // Check if player is falling and intersecting with platform from above
    if (
      player.velocityY >= 0 && // Player is falling or stationary
      player.x + player.imageWidth > platform.x &&
      player.x < platform.x + platform.width &&
      player.y + player.imageHeight >= platform.y &&
      player.y + player.imageHeight <= platform.y + platform.height + 5 // Reduced tolerance
    ) {
      // Ensure player lands exactly on platform surface
      player.y = platform.y - player.imageHeight;
      player.velocityY = 0;
      player.onGround = true;
      onPlatform = true;
      
      // Reset to idle animation when landing (jump ends)
      if (player.frameY === 3) {
        player.frameY = 0;
        player.frameX = 0;
      }
    }
  });
  
  return onPlatform;
};

// Check if player passed a new platform level
export const checkPlatformPassed = (player: Player, config: GameConfig): boolean => {
  const currentHeight = config.canvasHeight - player.y;
  const levelsPassed = Math.floor(currentHeight / config.distanceBetweenPlatforms);
  
  // Game starts when player reaches first platform level
  if (config.platformsPassed === 0 && levelsPassed >= 1) {
    config.platformsPassed = levelsPassed;
    return true;
  }
  
  if (levelsPassed > config.platformsPassed) {
    config.platformsPassed = levelsPassed;
    
    // Check win condition - win when reaching the target level
    if (config.platformsPassed >= config.maxPlatforms) {
      config.gameState = "win";
    }
    
    return true;
  }
  
  return false;
};

export const applyPhysics = (config: GameConfig, player: Player, dimensions: { width: number; height: number }, platforms: Platform[]) => {
  // Don't update physics if game is over
  if (config.gameState !== "playing") return;

  // Update moving platforms first to ensure consistent collision detection
  updatePlatforms(platforms, config);

  // Horizontal movement with boundaries
  player.x += player.velocityX;
  
  // Keep player within canvas bounds horizontally
  if (player.x < 0) {
    player.x = 0;
    player.velocityX = 0; // Stop horizontal movement when hitting boundary
  } else if (player.x + player.imageWidth > dimensions.width) {
    player.x = dimensions.width - player.imageWidth;
    player.velocityX = 0; // Stop horizontal movement when hitting boundary
  }

  // Apply gravity with maximum falling speed limit
  player.velocityY += config.gravity;
  
  // Limit maximum falling speed to prevent extreme velocities
  const maxFallSpeed = 15;
  if (player.velocityY > maxFallSpeed) {
    player.velocityY = maxFallSpeed;
  }
  
  // Limit maximum jump velocity to prevent extreme jumping
  const maxJumpSpeed = -20;
  if (player.velocityY < maxJumpSpeed) {
    player.velocityY = maxJumpSpeed;
  }
  
  player.y += player.velocityY;
  player.onGround = false;

  // Check platform collisions
  checkPlatformCollision(player, platforms);

  // Check if player passed platforms
  checkPlatformPassed(player, config);

  // Update camera to follow player
  updateCamera(config, player);

  // Ground collision (game over condition) - check using world coordinates
  const groundLevel = dimensions.height - 20; // Account for ground platform
  if (player.y >= groundLevel - player.imageHeight) {
    // Only game over if player fell from a platform (has made progress)
    if (config.platformsPassed > 0) {
      config.gameState = "gameOver";
    } else {
      // Player is on starting ground - this is normal
      player.y = groundLevel - player.imageHeight;
      player.velocityY = 0;
      player.onGround = true;
      
      // Reset to idle animation when landing on ground (jump ends)
      if (player.frameY === 3) {
        player.frameY = 0;
        player.frameX = 0;
      }
    }
  }
};


export const animateSprite = (player: Player) => {
  const framesPerRow = 4;

  // Update animation based on movement and direction
  if (player.velocityX !== 0) {
    // Walking animation - only update frameX if moving
    player.frameX = (player.frameX + 1) % framesPerRow;
  } else {
    // Idle animation - reset to first frame
    player.frameX = 0;
  }

};

export const handleKeyDown = (e: KeyboardEvent, player: Player, config: GameConfig) => {
  // Don't handle input if game is over
  if (config.gameState !== "playing") return;

  switch (e.key) {
    case "ArrowLeft":
      player.velocityX = -player.moveSpeed;
      player.direction = "left";
      player.frameY = 2; // Set to walking animation row for left
      break;
    case "ArrowRight":
      player.velocityX = player.moveSpeed;
      player.direction = "right";
      player.frameY = 1; // Set to walking animation row for right
      break;
    case "ArrowUp":
    case " ":
      // Only allow jumping if on ground and not already jumping
      if (player.onGround && player.velocityY >= 0) {
        player.velocityY = player.jumpPower;
        player.onGround = false;
        player.frameY = 3; // Jump animation row
      }
      break;
  }
};

export const handleKeyUp = (e: KeyboardEvent, player: Player, config: GameConfig) => {
  // Don't handle input if game is over
  if (config.gameState !== "playing") return;

  switch (e.key) {
    case "ArrowLeft":
      player.velocityX = 0;
      player.direction = "idle";
      player.frameY = 0; // Set to idle animation
      player.frameX = 0; // Reset to first idle frame
      break;
    case "ArrowRight":
      player.velocityX = 0;
      player.direction = "idle";
      player.frameY = 0; // Set to idle animation
      player.frameX = 0; // Reset to first idle frame
      break;
  }
};

// Mobile touch event handlers with tap for jump and swipe for movement
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isSwipeDetected = false;

export const handleTouchStart = (e: TouchEvent, player: Player, config: GameConfig, canvasRect: DOMRect) => {
  e.preventDefault(); // Prevent scrolling and other default behaviors
  
  // Don't handle input if game is over
  if (config.gameState !== "playing") return;

  const touch = e.touches[0];
  touchStartX = touch.clientX - canvasRect.left;
  touchStartY = touch.clientY - canvasRect.top;
  touchStartTime = Date.now();
  isSwipeDetected = false;
};

export const handleTouchEnd = (e: TouchEvent, player: Player, config: GameConfig, canvasRect: DOMRect) => {
  e.preventDefault();
  
  // Don't handle input if game is over
  if (config.gameState !== "playing") return;

  const touch = e.changedTouches[0];
  const touchEndX = touch.clientX - canvasRect.left;
  const touchEndY = touch.clientY - canvasRect.top;
  const touchEndTime = Date.now();
  
  const touchDuration = touchEndTime - touchStartTime;
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  // Define thresholds for smoother interaction
  const tapMaxDuration = 250; // Reduced for quicker tap response
  const tapMaxDistance = 20; // Reduced for more precise tap detection
  
  // Check if it's a tap (short duration and small movement)
  if (touchDuration < tapMaxDuration && distance < tapMaxDistance && !isSwipeDetected) {
    // Tap detected - jump
    if (player.onGround && player.velocityY >= 0) {
      player.velocityY = player.jumpPower;
      player.onGround = false;
      player.frameY = 3; // Jump animation row
    }
  }
  
  // Stop horizontal movement when touch ends (for swipe movements)
  if (isSwipeDetected) {
    player.velocityX = 0;
    player.direction = "idle";
    player.frameY = 0; // Set to idle animation
    player.frameX = 0; // Reset to first idle frame
  }
  
  // Reset swipe detection for next gesture
  isSwipeDetected = false;
};

export const handleTouchMove = (e: TouchEvent, player: Player, config: GameConfig, canvasRect: DOMRect) => {
  e.preventDefault(); // Prevent scrolling
  
  // Don't handle input if game is over
  if (config.gameState !== "playing") return;

  const touch = e.touches[0];
  const touchX = touch.clientX - canvasRect.left;
  const touchY = touch.clientY - canvasRect.top;
  
  const deltaX = touchX - touchStartX;
  const deltaY = touchY - touchStartY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  const swipeMinDistance = 25; // Reduced minimum distance for smoother detection
  
  // Check if it's a swipe gesture
  if (distance > swipeMinDistance && !isSwipeDetected) {
    isSwipeDetected = true;
    
    // Determine swipe direction with more sensitivity
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.8) { // Less strict vertical requirement
      // Vertical swipe - check for upward swipe (jump)
      if (deltaY < -15) { // Reduced threshold for upward detection
        // Swipe up - jump
        if (player.onGround && player.velocityY >= 0) {
          player.velocityY = player.jumpPower;
          player.onGround = false;
          player.frameY = 3; // Jump animation row
        }
      }
    } else {
      // Check for diagonal swipes (up + left/right)
      if (deltaY < -15 && Math.abs(deltaX) > 15) {
        // Diagonal swipe up + horizontal
        if (player.onGround && player.velocityY >= 0) {
          player.velocityY = player.jumpPower;
          player.onGround = false;
          player.frameY = 3; // Jump animation row
          
          // Add horizontal movement based on swipe direction
          if (deltaX > 0) {
            // Right swipe up - jump and move right
            player.velocityX = player.moveSpeed;
            player.direction = "right";
          } else {
            // Left swipe up - jump and move left
            player.velocityX = -player.moveSpeed;
            player.direction = "left";
          }
        }
      } else {
        // Pure horizontal swipe - movement only
        if (deltaX > 15) { // Reduced threshold for right detection
          // Swipe right
          player.velocityX = player.moveSpeed;
          player.direction = "right";
          player.frameY = 1; // Set to walking animation row for right
        } else if (deltaX < -15) { // Reduced threshold for left detection
          // Swipe left
          player.velocityX = -player.moveSpeed;
          player.direction = "left";
          player.frameY = 2; // Set to walking animation row for left
        }
      }
    }
  }
  
  // Continue movement if already swiping horizontally with smoother updates
  if (isSwipeDetected && Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
    if (deltaX > 10) { // Reduced threshold for continued movement
      // Continue right movement
      player.velocityX = player.moveSpeed;
      player.direction = "right";
      player.frameY = 1;
    } else if (deltaX < -10) { // Reduced threshold for continued movement
      // Continue left movement
      player.velocityX = -player.moveSpeed;
      player.direction = "left";
      player.frameY = 2;
    }
  }
};

export const getImageFrame = (index: number, frameWidth: number, frameHeight: number, columns: number) => {
  const col = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: col * frameWidth,
    y: row * frameHeight,
    width: frameWidth,
    height: frameHeight,
  };
};

// Restart game function
export const restartGame = (config: GameConfig, player: Player, dimensions: { width: number; height: number }) => {
  // Reset game config
  config.gameState = "playing";
  config.platformsPassed = 0;
  config.timer = 0;
  config.cameraY = 0;
  config.targetCameraY = 0;

  // Reset player position to ground level
  const groundLevel = dimensions.height - 20;
  player.x = dimensions.width / 2 - player.imageWidth / 2;
  player.y = groundLevel - player.imageHeight;
  player.velocityX = 0;
  player.velocityY = 0;
  player.onGround = true;
  player.direction = "idle";
  player.frameX = 0;
  player.frameY = 0;
  player.frameTimer = 0;
};