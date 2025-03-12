document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const joinScreen = document.getElementById('join-screen');
    const waitingScreen = document.getElementById('waiting-screen');
    const gameScreen = document.getElementById('game-screen');
    const resultScreen = document.getElementById('result-screen');
    
    const playerNameInput = document.getElementById('player-name');
    const createGameBtn = document.getElementById('create-game');
    const joinGameBtn = document.getElementById('join-game-btn');
    const joinGameForm = document.getElementById('join-game-form');
    const gameCodeInput = document.getElementById('game-code');
    const joinGameSubmit = document.getElementById('join-game-submit');
    
    const gameCodeDisplay = document.getElementById('game-code-display');
    const copyCodeBtn = document.getElementById('copy-code');
    
    const playerNameDisplay = document.getElementById('player-name-display');
    const opponentNameDisplay = document.getElementById('opponent-name-display');
    const playerScore = document.getElementById('player-score');
    const opponentScore = document.getElementById('opponent-score');
    const roundNumber = document.getElementById('round-number');
    
    const timer = document.getElementById('timer');
    const countdown = document.getElementById('countdown');
    const choiceBtns = document.querySelectorAll('.choice-btn');
    const statusMessage = document.querySelector('.status-message');
    
    const resultDisplay = document.querySelector('.result-display');
    const playerChoiceIcon = document.getElementById('player-choice-icon');
    const opponentChoiceIcon = document.getElementById('opponent-choice-icon');
    const resultMessage = document.getElementById('result-message');
    const nextRoundBtn = document.getElementById('next-round');
    
    const finalResult = document.getElementById('final-result');
    const finalPlayerName = document.getElementById('final-player-name');
    const finalOpponentName = document.getElementById('final-opponent-name');
    const finalPlayerScore = document.getElementById('final-player-score');
    const finalOpponentScore = document.getElementById('final-opponent-score');
    const playAgainBtn = document.getElementById('play-again');
    const backToHomeBtn = document.getElementById('back-to-home');
    
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    // Game state
    let gameData = {
        gameId: null,
        playerId: null,
        playerName: '',
        opponentName: '',
        round: 1,
        playerScore: 0,
        opponentScore: 0,
        playerChoice: null,
        opponentChoice: null,
        waitingForOpponent: false,
        gameOver: false
    };
    
    // Initialize Socket.io connection (for actual server implementation)
    // For this demo, we'll simulate the server using localStorage
    let socket = null;
    
    // ==== Simulated Socket.io for local testing ==== //
    // This is a simplified simulation of the Socket.io functionality using localStorage
    // In a real implementation, you would replace this with actual Socket.io
    
    function initSimulatedSocket() {
        // Create a unique ID for this browser tab to simulate a socket connection
        const socketId = 'socket_' + Math.random().toString(36).substr(2, 9);
        
        // Local storage event listener to simulate socket events
        window.addEventListener('storage', (event) => {
            if (event.key && event.key.startsWith('rps_event_')) {
                try {
                    const data = JSON.parse(event.newValue);
                    if (data && data.recipients.includes(socketId) || data.recipients.includes('all')) {
                        processSocketEvent(data.event, data.data);
                    }
                } catch (e) {
                    console.error('Error processing simulated socket event', e);
                }
            }
        });
        
        // Create the simulated socket object
        socket = {
            id: socketId,
            emit: function(event, data) {
                // Store the event for other tabs to pick up
                const storageKey = 'rps_event_' + Date.now();
                const storageData = {
                    event: event,
                    data: data,
                    recipients: ['server'],  // Indicates this message is for the "server"
                    from: socketId
                };
                localStorage.setItem(storageKey, JSON.stringify(storageData));
                
                // Process the event locally as if it were coming from the client
                processServerEvent(event, data);
                
                // Clean up old events
                cleanupOldEvents();
            }
        };
        
        // Listen for server events (simulated)
        setInterval(checkForServerEvents, 100);
    }
    
    function cleanupOldEvents() {
        // Cleanup events older than 5 seconds to avoid localStorage filling up
        const now = Date.now();
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('rps_event_')) {
                const timestamp = parseInt(key.split('_')[2]);
                if (now - timestamp > 5000) {
                    localStorage.removeItem(key);
                }
            }
        });
    }
    
    function checkForServerEvents() {
        // Check for events from the "server"
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('rps_event_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.recipients.includes(socket.id) && data.from === 'server') {
                        processSocketEvent(data.event, data.data);
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    console.error('Error checking for server events', e);
                }
            }
        });
    }
    
    // Simulate the server-side event handling
    function processServerEvent(event, data) {
        switch (event) {
            case 'create_game':
                handleCreateGame(data);
                break;
            case 'join_game':
                handleJoinGame(data);
                break;
            case 'player_choice':
                handlePlayerChoice(data);
                break;
            case 'next_round':
                handleNextRound(data);
                break;
            case 'play_again':
                handlePlayAgain(data);
                break;
        }
    }
    
    // Server-side event handlers (simulated)
    function handleCreateGame(data) {
        const { playerName } = data;
        const gameId = generateGameId();
        const playerId = socket.id;
        
        // Store game in "database" (localStorage)
        const gameState = {
            gameId: gameId,
            player1: {
                id: playerId,
                name: playerName,
                choice: null,
                score: 0
            },
            player2: null,
            round: 1,
            gameActive: true,
            roundActive: false
        };
        
        localStorage.setItem('rps_game_' + gameId, JSON.stringify(gameState));
        
        // Send response to creator
        sendToClient(playerId, 'game_created', {
            gameId: gameId,
            playerId: playerId
        });
    }
    
    function handleJoinGame(data) {
        const { gameId, playerName } = data;
        const playerId = socket.id;
        
        // Get game from "database"
        const gameState = JSON.parse(localStorage.getItem('rps_game_' + gameId));
        
        if (!gameState) {
            sendToClient(playerId, 'error', { message: 'Game not found' });
            return;
        }
        
        if (gameState.player2) {
            sendToClient(playerId, 'error', { message: 'Game already full' });
            return;
        }
        
        // Add player to game
        gameState.player2 = {
            id: playerId,
            name: playerName,
            choice: null,
            score: 0
        };
        gameState.roundActive = true;
        
        localStorage.setItem('rps_game_' + gameId, JSON.stringify(gameState));
        
        // Send response to both players
        sendToClient(gameState.player1.id, 'opponent_joined', {
            opponentName: playerName,
            opponentId: playerId
        });
        
        sendToClient(playerId, 'game_joined', {
            gameId: gameId,
            playerId: playerId,
            opponentName: gameState.player1.name,
            opponentId: gameState.player1.id
        });
    }
    
    function handlePlayerChoice(data) {
        const { gameId, playerId, choice } = data;
        
        // Get game from "database"
        const gameState = JSON.parse(localStorage.getItem('rps_game_' + gameId));
        
        if (!gameState || !gameState.gameActive) {
            return;
        }
        
        // Record player's choice
        let player, opponent;
        if (gameState.player1.id === playerId) {
            player = gameState.player1;
            opponent = gameState.player2;
        } else {
            player = gameState.player2;
            opponent = gameState.player1;
        }
        
        player.choice = choice;
        
        // Save updated game state
        localStorage.setItem('rps_game_' + gameId, JSON.stringify(gameState));
        
        // Notify opponent that a choice was made (but not what it was)
        if (opponent) {
            sendToClient(opponent.id, 'opponent_choice_made', {});
        }
        
        // If both players have made a choice, determine the result after 4 seconds
        if (gameState.player1.choice && gameState.player2.choice) {
            setTimeout(() => {
                const result = determineWinner(gameState.player1.choice, gameState.player2.choice);
                
                // Update scores
                if (result === 1) {
                    gameState.player1.score++;
                } else if (result === 2) {
                    gameState.player2.score++;
                }
                
                // Save updated game state
                localStorage.setItem('rps_game_' + gameId, JSON.stringify(gameState));
                
                // Send results to both players
                sendToClient(gameState.player1.id, 'round_result', {
                    playerChoice: gameState.player1.choice,
                    opponentChoice: gameState.player2.choice,
                    result: result === 1 ? 'win' : result === 2 ? 'lose' : 'draw',
                    playerScore: gameState.player1.score,
                    opponentScore: gameState.player2.score
                });
                
                sendToClient(gameState.player2.id, 'round_result', {
                    playerChoice: gameState.player2.choice,
                    opponentChoice: gameState.player1.choice,
                    result: result === 2 ? 'win' : result === 1 ? 'lose' : 'draw',
                    playerScore: gameState.player2.score,
                    opponentScore: gameState.player1.score
                });
                
            }, 4000); // Reveal result after 4 seconds
        }
    }
    
    function handleNextRound(data) {
        const { gameId, playerId } = data;
        
        // Get game from "database"
        const gameState = JSON.parse(localStorage.getItem('rps_game_' + gameId));
        
        if (!gameState || !gameState.gameActive) {
            return;
        }
        
        // Check if both players are ready for next round
        let isPlayer1 = gameState.player1.id === playerId;
        
        if (isPlayer1) {
            gameState.player1.readyForNextRound = true;
        } else {
            gameState.player2.readyForNextRound = true;
        }
        
        // If both ready, start new round
        if (gameState.player1.readyForNextRound && gameState.player2.readyForNextRound) {
            gameState.round++;
            gameState.player1.choice = null;
            gameState.player2.choice = null;
            gameState.player1.readyForNextRound = false;
            gameState.player2.readyForNextRound = false;
            
            // Save updated game state
            localStorage.setItem('rps_game_' + gameId, JSON.stringify(gameState));
            
            // Notify both players of new round
            sendToClient(gameState.player1.id, 'new_round', {
                round: gameState.round
            });
            
            sendToClient(gameState.player2.id, 'new_round', {
                round: gameState.round
            });
        } else {
            // Save updated game state
            localStorage.setItem('rps_game_' + gameId, JSON.stringify(gameState));
            
            // Notify the other player that this player is ready
            const opponentId = isPlayer1 ? gameState.player2.id : gameState.player1.id;
            sendToClient(opponentId, 'opponent_ready', {});
        }
    }
    
    function handlePlayAgain(data) {
        const { gameId, playerId } = data;
        
        // Get game from "database"
        const gameState = JSON.parse(localStorage.getItem('rps_game_' + gameId));
        
        if (!gameState) {
            return;
        }
        
        // Reset game state
        gameState.round = 1;
        gameState.player1.choice = null;
        gameState.player1.score = 0;
        gameState.player1.readyForNextRound = false;
        gameState.player2.choice = null;
        gameState.player2.score = 0;
        gameState.player2.readyForNextRound = false;
        gameState.gameActive = true;
        gameState.roundActive = true;
        
        // Save updated game state
        localStorage.setItem('rps_game_' + gameId, JSON.stringify(gameState));
        
        // Notify both players
        sendToClient(gameState.player1.id, 'game_restart', {});
        sendToClient(gameState.player2.id, 'game_restart', {});
    }
    
    // Utility functions for the simulated server
    function generateGameId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    function determineWinner(choice1, choice2) {
        if (choice1 === choice2) {
            return 0; // Draw
        } else if (
            (choice1 === 'rock' && choice2 === 'scissors') ||
            (choice1 === 'paper' && choice2 === 'rock') ||
            (choice1 === 'scissors' && choice2 === 'paper')
        ) {
            return 1; // Player 1 wins
        } else {
            return 2; // Player 2 wins
        }
    }
    
    function sendToClient(clientId, event, data) {
        const storageKey = 'rps_event_' + Date.now();
        const storageData = {
            event: event,
            data: data,
            recipients: [clientId],
            from: 'server'
        };
        localStorage.setItem(storageKey, JSON.stringify(storageData));
    }
    
    // ==== Client-side code ==== //
    
    // Process events from the server (real or simulated)
    function processSocketEvent(event, data) {
        switch (event) {
            case 'game_created':
                onGameCreated(data);
                break;
            case 'game_joined':
                onGameJoined(data);
                break;
            case 'opponent_joined':
                onOpponentJoined(data);
                break;
            case 'opponent_choice_made':
                onOpponentChoiceMade();
                break;
            case 'round_result':
                onRoundResult(data);
                break;
            case 'new_round':
                onNewRound(data);
                break;
            case 'opponent_ready':
                onOpponentReady();
                break;
            case 'game_restart':
                onGameRestart();
                break;
            case 'error':
                onError(data);
                break;
        }
    }
    
    // Socket event handlers
    function onGameCreated(data) {
        gameData.gameId = data.gameId;
        gameData.playerId = data.playerId;
        
        // Update UI for waiting room
        gameCodeDisplay.textContent = gameData.gameId;
        showScreen(waitingScreen);
    }
    
    function onGameJoined(data) {
        gameData.gameId = data.gameId;
        gameData.playerId = data.playerId;
        gameData.opponentName = data.opponentName;
        
        // Update UI for game screen
        playerNameDisplay.textContent = gameData.playerName;
        opponentNameDisplay.textContent = gameData.opponentName;
        
        // Initialize game UI for round 1
        roundNumber.textContent = `Round 1`;
        statusMessage.textContent = 'Choose your weapon!';
        
        showScreen(gameScreen);
    }
    
    function onOpponentJoined(data) {
        gameData.opponentName = data.opponentName;
        
        // Update UI for game screen
        playerNameDisplay.textContent = gameData.playerName;
        opponentNameDisplay.textContent = gameData.opponentName;
        
        // Initialize game UI for round 1
        roundNumber.textContent = `Round 1`;
        statusMessage.textContent = 'Choose your weapon!';
        
        showScreen(gameScreen);
    }
    
    function onOpponentChoiceMade() {
        if (gameData.playerChoice) {
            statusMessage.textContent = 'Both players have chosen! Revealing in 4 seconds...';
            startCountdown();
        } else {
            statusMessage.textContent = 'Opponent has chosen! Waiting for you...';
        }
    }
    
    function onRoundResult(data) {
        // Update game data
        gameData.playerChoice = null; // Reset for next round
        gameData.playerScore = data.playerScore;
        gameData.opponentScore = data.opponentScore;
        
        // Update UI
        playerScore.textContent = gameData.playerScore;
        opponentScore.textContent = gameData.opponentScore;
        
        // Update result icons
        playerChoiceIcon.innerHTML = getChoiceIcon(data.playerChoice);
        opponentChoiceIcon.innerHTML = getChoiceIcon(data.opponentChoice);
        
        // Update result message
        let messageClass = '';
        let messageText = '';
        
        if (data.result === 'win') {
            messageClass = 'win-message';
            messageText = 'You Win!';
        } else if (data.result === 'lose') {
            messageClass = 'lose-message';
            messageText = 'You Lose!';
        } else {
            messageClass = 'draw-message';
            messageText = 'It\'s a Draw!';
        }
        
        resultMessage.className = 'result-message ' + messageClass;
        resultMessage.textContent = messageText;
        
        // Show result display
        resultDisplay.classList.remove('hidden');
        statusMessage.classList.add('hidden');
        
        // Reset all choice buttons
        choiceBtns.forEach(btn => btn.classList.remove('selected'));
        
        // Hide timer
        timer.classList.add('hidden');
    }
    
    function onNewRound(data) {
        // Update game data
        gameData.round = data.round;
        
        // Update UI
        roundNumber.textContent = `Round ${gameData.round}`;
        statusMessage.textContent = 'Choose your weapon!';
        statusMessage.classList.remove('hidden');
        
        // Hide result display
        resultDisplay.classList.add('hidden');
        
        // Enable choice buttons
        choiceBtns.forEach(btn => {
            btn.disabled = false;
        });
    }
    
    function onOpponentReady() {
        showNotification('Opponent is ready for the next round!');
    }
    
    function onGameRestart() {
        // Reset game data
        gameData.round = 1;
        gameData.playerScore = 0;
        gameData.opponentScore = 0;
        gameData.playerChoice = null;
        
        // Update UI
        playerScore.textContent = '0';
        opponentScore.textContent = '0';
        roundNumber.textContent = 'Round 1';
        statusMessage.textContent = 'Choose your weapon!';
        statusMessage.classList.remove('hidden');
        
        // Hide result display
        resultDisplay.classList.add('hidden');
        
        // Show game screen
        showScreen(gameScreen);
    }
    
    function onError(data) {
        showNotification(data.message);
    }
    
    // UI Helper Functions
    function showScreen(screen) {
        joinScreen.classList.remove('active');
        waitingScreen.classList.remove('active');
        gameScreen.classList.remove('active');
        resultScreen.classList.remove('active');
        
        screen.classList.add('active');
    }
    
    function getChoiceIcon(choice) {
        switch (choice) {
            case 'rock':
                return '<i class="fas fa-hand-rock"></i>';
            case 'paper':
                return '<i class="fas fa-hand-paper"></i>';
            case 'scissors':
                return '<i class="fas fa-hand-scissors"></i>';
            default:
                return '';
        }
    }
    
    function startCountdown() {
        timer.classList.remove('hidden');
        let count = 4;
        countdown.textContent = count;
        
        const interval = setInterval(() => {
            count--;
            countdown.textContent = count;
            
            if (count <= 0) {
                clearInterval(interval);
                timer.classList.add('hidden');
            }
        }, 1000);
    }
    
    function showNotification(message) {
        notificationMessage.textContent = message;
        notification.classList.add('show');
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 300);
        }, 3000);
    }
    
    // Event Listeners
    createGameBtn.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        
        if (!playerName) {
            showNotification('Please enter your name');
            return;
        }
        
        gameData.playerName = playerName;
        
        // Create a new game
        socket.emit('create_game', {
            playerName: playerName
        });
    });
    
    joinGameBtn.addEventListener('click', () => {
        joinGameForm.classList.toggle('hidden');
    });
    
    joinGameSubmit.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        const gameCode = gameCodeInput.value.trim().toUpperCase();
        
        if (!playerName) {
            showNotification('Please enter your name');
            return;
        }
        
        if (!gameCode) {
            showNotification('Please enter a game code');
            return;
        }
        
        gameData.playerName = playerName;
        
        // Join an existing game
        socket.emit('join_game', {
            gameId: gameCode,
            playerName: playerName
        });
    });
    
    copyCodeBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(gameCodeDisplay.textContent)
            .then(() => {
                showNotification('Game code copied to clipboard');
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
            });
    });
    
    choiceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Clear previous selection
            choiceBtns.forEach(b => b.classList.remove('selected'));
            
            // Highlight this selection
            btn.classList.add('selected');
            
            // Store the choice
            const choice = btn.dataset.choice;
            gameData.playerChoice = choice;
            
            // Disable buttons after choice is made
            choiceBtns.forEach(b => {
                b.disabled = true;
            });
            
            // Update status message
            statusMessage.textContent = 'You chose ' + choice + '! Waiting for opponent...';
            
            // Send choice to server
            socket.emit('player_choice', {
                gameId: gameData.gameId,
                playerId: gameData.playerId,
                choice: choice
            });
        });
    });
    
    nextRoundBtn.addEventListener('click', () => {
        // Hide result display
        resultDisplay.classList.add('hidden');
        
        // Show waiting message
        statusMessage.textContent = 'Waiting for opponent to continue...';
        statusMessage.classList.remove('hidden');
        
        // Enable choice buttons for next round
        choiceBtns.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('selected');
        });
        
        // Notify server player is ready for next round
        socket.emit('next_round', {
            gameId: gameData.gameId,
            playerId: gameData.playerId
        });
    });
    
    playAgainBtn.addEventListener('click', () => {
        // Play again with the same opponent
        socket.emit('play_again', {
            gameId: gameData.gameId,
            playerId: gameData.playerId
        });
    });
    
    backToHomeBtn.addEventListener('click', () => {
        // Reset game data
        gameData = {
            gameId: null,
            playerId: null,
            playerName: '',
            opponentName: '',
            round: 1,
            playerScore: 0,
            opponentScore: 0,
            playerChoice: null,
            opponentChoice: null,
            waitingForOpponent: false,
            gameOver: false
        };
        
        // Go back to join screen
        showScreen(joinScreen);
    });
    
    // Initialize the app
    initSimulatedSocket();
}); 