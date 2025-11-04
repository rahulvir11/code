"use client";
import { Stage, Layer, Image as KonvaImage, Rect, Text } from "react-konva";
import React, { useRef, useEffect, useState } from "react";
import { animateSprite, applyPhysics, handleKeyDown, handleKeyUp, getImageFrame, generatePlatforms, restartGame, getScreenPosition, handleTouchStart, handleTouchEnd, handleTouchMove } from "@/helpers/game";
import { GameConfig, Platform, Player } from "@/interface";
import useImage from "use-image";

const CanvasStage = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [playerImage] = useImage('/player.png');

    const gameRef = useRef<GameConfig>({
        canvasWidth: 0,
        canvasHeight: 0,
        timer: 0,
        gravity: 0.8,
        scrollSpeed: 2,
        currentPlatformIndex: 0,
        fps: 60,
        interval: 1000 / 60,
        distanceBetweenPlatforms: 120,
        gameState: "playing",
        platformsPassed: 0,
        maxPlatforms: 50,
        cameraY: 0,
        targetCameraY: 0,
        cameraLerpSpeed: 0.1,
    });
    // Initialize player with proper values
    const playerRef = useRef<Player>({
        x: 0,
        y: 0,
        imageWidth: 60,
        imageHeight: 60,
        velocityX: 0,
        velocityY: 0,
        onGround: false,
        direction: "idle",
        frameY: 0,
        frameX: 0,
        spriteWidth: 250,
        spriteHeight: 280,
        jumpPower: -15,
        moveSpeed: 5,
        frameTimer: 0,
        animationSpeed: 8,
    });
    const platformsRef = useRef<Array<Platform>>([]);
    const [player, setPlayer] = useState<Player>(playerRef.current);
    const [platforms, setPlatforms] = useState<Array<Platform>>([]);

    // 🔹 Measure container size
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                setDimensions({ width: clientWidth, height: clientHeight });
                gameRef.current.canvasWidth = clientWidth;
                gameRef.current.canvasHeight = clientHeight;

                // Set player initial position on the ground
                const groundLevel = clientHeight - 20; // Account for ground platform height
                playerRef.current.x = clientWidth / 2 - playerRef.current.imageWidth / 2;
                playerRef.current.y = groundLevel - playerRef.current.imageHeight;
                playerRef.current.onGround = true;
                setPlayer({ ...playerRef.current });

                // Initialize platforms
                const initialPlatforms = generatePlatforms(gameRef.current);
                platformsRef.current = initialPlatforms;
                setPlatforms(initialPlatforms);

            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // 🔹 Setup input handlers
    useEffect(() => {
        const handleKeyDownWrapper = (e: KeyboardEvent) => {
            // Handle restart game
            if ((gameRef.current.gameState === "win" || gameRef.current.gameState === "gameOver") && e.key === "r") {
                restartGame(gameRef.current, playerRef.current, dimensions);
                const newPlatforms = generatePlatforms(gameRef.current);
                platformsRef.current = newPlatforms;
                setPlatforms(newPlatforms);
                setPlayer({ ...playerRef.current });
                return;
            }
            
            handleKeyDown(e, playerRef.current, gameRef.current);
        };
        
        const handleKeyUpWrapper = (e: KeyboardEvent) => handleKeyUp(e, playerRef.current, gameRef.current);

        // Mobile touch event handlers
        const handleTouchStartWrapper = (e: TouchEvent) => {
            if (stageRef.current && containerRef.current) {
                const canvasRect = containerRef.current.getBoundingClientRect();
                
                // Handle restart game for mobile
                if (gameRef.current.gameState === "win" || gameRef.current.gameState === "gameOver") {
                    restartGame(gameRef.current, playerRef.current, dimensions);
                    const newPlatforms = generatePlatforms(gameRef.current);
                    platformsRef.current = newPlatforms;
                    setPlatforms(newPlatforms);
                    setPlayer({ ...playerRef.current });
                    return;
                }
                
                handleTouchStart(e, playerRef.current, gameRef.current, canvasRect);
            }
        };

        const handleTouchEndWrapper = (e: TouchEvent) => {
            if (containerRef.current) {
                const canvasRect = containerRef.current.getBoundingClientRect();
                handleTouchEnd(e, playerRef.current, gameRef.current, canvasRect);
            }
        };

        const handleTouchMoveWrapper = (e: TouchEvent) => {
            if (containerRef.current) {
                const canvasRect = containerRef.current.getBoundingClientRect();
                handleTouchMove(e, playerRef.current, gameRef.current, canvasRect);
            }
        };

        window.addEventListener("keydown", handleKeyDownWrapper);
        window.addEventListener("keyup", handleKeyUpWrapper);
        
        // Add mobile touch events
        if (containerRef.current) {
            containerRef.current.addEventListener("touchstart", handleTouchStartWrapper, { passive: false });
            containerRef.current.addEventListener("touchend", handleTouchEndWrapper, { passive: false });
            containerRef.current.addEventListener("touchmove", handleTouchMoveWrapper, { passive: false });
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDownWrapper);
            window.removeEventListener("keyup", handleKeyUpWrapper);
            
            // Remove mobile touch events
            if (containerRef.current) {
                containerRef.current.removeEventListener("touchstart", handleTouchStartWrapper);
                containerRef.current.removeEventListener("touchend", handleTouchEndWrapper);
                containerRef.current.removeEventListener("touchmove", handleTouchMoveWrapper);
            }
        };
    }, [dimensions]);

    // 🔹 Animation loop with FPS control
    useEffect(() => {
        if (dimensions.width === 0 || dimensions.height === 0) return;

        let animationFrame: number;
        let lastTime = 0;

        const loop = (timeStamp: number) => {
            if (!lastTime) lastTime = timeStamp;
            const deltaTime = timeStamp - lastTime;
            lastTime = timeStamp;

            gameRef.current.timer += deltaTime;

            // Apply physics and update player
            applyPhysics(gameRef.current, playerRef.current, dimensions, platformsRef.current);


            // Animate player sprite
            if (playerRef.current.frameTimer >= playerRef.current.animationSpeed) {
                animateSprite(playerRef.current);
                playerRef.current.frameTimer = 0;
            } else {
                playerRef.current.frameTimer += 1;
            }

            // Update state to trigger re-render
            setPlayer({ ...playerRef.current });
            setPlatforms([...platformsRef.current]);

            animationFrame = requestAnimationFrame(loop);
        };

        animationFrame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrame);
    }, [dimensions.width, dimensions.height]);

    const renderPlayer = () => {
        if (!playerImage) return null;

        const columns = 4;
        const index = player.frameX + player.frameY * columns;
        const crop = getImageFrame(index, player.spriteWidth, player.spriteHeight, columns);

        // Use screen position for rendering
        const screenY = getScreenPosition(player.y, gameRef.current);

        return (
            <KonvaImage
                image={playerImage}
                x={player.x}
                y={screenY}
                width={player.imageWidth}
                height={player.imageHeight}
                crop={crop}
            />
        );
    };

    const renderPlatforms = () => {
        return platforms.map((platform) => {
            // Use screen position for rendering
            const screenY = getScreenPosition(platform.y, gameRef.current);
            
            // Only render platforms that are visible on screen
            if (screenY < -platform.height || screenY > dimensions.height + platform.height) {
                return null;
            }

            // Special styling for ground platform
            const isGround = platform.id === "ground";

            return (
                <Rect
                    key={platform.id}
                    x={platform.x}
                    y={screenY}
                    width={platform.width}
                    height={platform.height}
                    fill={isGround ? "#8b4513" : platform.moves ? "#ff6b6b" : "#4ecdc4"}
                    stroke={isGround ? "#654321" : "#2c3e50"}
                    strokeWidth={isGround ? 3 : 2}
                />
            );
        }).filter(Boolean);
    };

    const renderGameUI = () => {
        const fontSize = 20;
        const padding = 20;
        const height = Math.max(0, Math.floor(-gameRef.current.cameraY / gameRef.current.distanceBetweenPlatforms));
        
        return (
            <>
                {/* Game instructions for new players */}
                {gameRef.current.platformsPassed === 0 && (
                    <Text
                        x={dimensions.width / 2}
                        y={dimensions.height - 120}
                        text="🎮 Desktop: Arrow keys | Mobile: Tap/swipe up to jump, diagonal swipes for directional jumps"
                        fontSize={13}
                        fill="#2c3e50"
                        fontFamily="Arial"
                        fontStyle="bold"
                        align="center"
                        width={dimensions.width - 40}
                        offsetX={(dimensions.width - 40) / 2}
                    />
                )}
                
                {/* Score display */}
                <Text
                    x={padding}
                    y={padding}
                    text={`Levels: ${gameRef.current.platformsPassed}/${gameRef.current.maxPlatforms}`}
                    fontSize={fontSize}
                    fill="#2c3e50"
                    fontFamily="Arial"
                />
                
                {/* Height display */}
                <Text
                    x={padding}
                    y={padding + 30}
                    text={`Height: ${height}m`}
                    fontSize={16}
                    fill="#2c3e50"
                    fontFamily="Arial"
                />
                
                {/* Player direction indicator - only show after game starts */}
                {gameRef.current.platformsPassed > 0 && (
                    <Text
                        x={padding}
                        y={padding + 55}
                        text={`${player.velocityY < 0 ? "↑ Rising" : player.velocityY > 0 ? "↓ Falling" : "⏸ Still"}`}
                        fontSize={14}
                        fill={player.velocityY < 0 ? "#4caf50" : player.velocityY > 0 ? "#f44336" : "#9e9e9e"}
                        fontFamily="Arial"
                    />
                )}
                
                {/* Win message */}
                {gameRef.current.gameState === "win" && (
                    <>
                        <Rect
                            x={dimensions.width / 2 - 150}
                            y={dimensions.height / 2 - 60}
                            width={300}
                            height={120}
                            fill="rgba(76, 175, 80, 0.9)"
                            stroke="#4caf50"
                            strokeWidth={3}
                            cornerRadius={10}
                        />
                        <Text
                            x={dimensions.width / 2}
                            y={dimensions.height / 2 - 30}
                            text="🎉 YOU WIN! 🎉"
                            fontSize={24}
                            fill="white"
                            fontFamily="Arial"
                            fontStyle="bold"
                            align="center"
                            width={300}
                            offsetX={150}
                        />
                        <Text
                            x={dimensions.width / 2}
                            y={dimensions.height / 2 + 10}
                            text="Press R or touch screen to restart"
                            fontSize={16}
                            fill="white"
                            fontFamily="Arial"
                            align="center"
                            width={300}
                            offsetX={150}
                        />
                    </>
                )}
                
                {/* Game Over message */}
                {gameRef.current.gameState === "gameOver" && (
                    <>
                        <Rect
                            x={dimensions.width / 2 - 150}
                            y={dimensions.height / 2 - 60}
                            width={300}
                            height={120}
                            fill="rgba(244, 67, 54, 0.9)"
                            stroke="#f44336"
                            strokeWidth={3}
                            cornerRadius={10}
                        />
                        <Text
                            x={dimensions.width / 2}
                            y={dimensions.height / 2 - 30}
                            text="💀 GAME OVER 💀"
                            fontSize={24}
                            fill="white"
                            fontFamily="Arial"
                            fontStyle="bold"
                            align="center"
                            width={300}
                            offsetX={150}
                        />
                        <Text
                            x={dimensions.width / 2}
                            y={dimensions.height / 2 + 10}
                            text="Press R or touch screen to restart"
                            fontSize={16}
                            fill="white"
                            fontFamily="Arial"
                            align="center"
                            width={300}
                            offsetX={150}
                        />
                    </>
                )}
            </>
        );
    };

 
    return (
        <div ref={containerRef} className="w-full sm:w-1/2 h-screen bg-white/20 flex items-center justify-center">
            {dimensions.width > 0 && dimensions.height > 0 && (
                <Stage ref={stageRef} width={dimensions.width} height={dimensions.height}>
                    <Layer>
                        {/* Render platforms */}
                        {renderPlatforms()}
                       
                        {/* Render player */}
                        {renderPlayer()}
                        
                        {/* Render UI */}
                        {renderGameUI()}
                    </Layer>
                </Stage>
            )}
        </div>
    );
};

export default CanvasStage;