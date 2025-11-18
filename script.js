(() => {
  const SIZE = 4;
  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('score');
  const undoBtn = document.getElementById('undoBtn');
  const restartBtn = document.getElementById('restartBtn');
  const leaderBtn = document.getElementById('leaderBtn');
  const leaderBackdrop = document.getElementById('leaderBackdrop');
  const leaderTableBody = document.querySelector('#leaderTable tbody');
  const closeLeader = document.getElementById('closeLeader');
  const clearLeader = document.getElementById('clearLeader');
  const mobileControls = document.getElementById('mobileControls');

  const gameOverBackdrop = document.getElementById('gameOverBackdrop');
  const saveRow = document.getElementById('saveRow');
  const savedMsg = document.getElementById('savedMsg');
  const playerName = document.getElementById('playerName');
  const saveScoreBtn = document.getElementById('saveScoreBtn');
  const restartAfterGame = document.getElementById('restartAfterGame');

  const confirmRestartBackdrop = document.getElementById('confirmRestartBackdrop');
  const confirmRestartYes = document.getElementById('confirmRestartYes');
  const confirmRestartNo = document.getElementById('confirmRestartNo');

  const KEY_STATE = 'lab2048_state_v1';
  const KEY_LEAD = 'lab2048_leader_v1';

  let grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  let score = 0;
  let prevState = null;
  let gameOver = false;
  let scoreSaved = false;

  function saveState() {
    localStorage.setItem(KEY_STATE, JSON.stringify({ grid, score, gameOver, scoreSaved }));
  }

  function loadState() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY_STATE));
      if (!data) return false;
      grid = data.grid || Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
      score = data.score || 0;
      gameOver = data.gameOver || false;
      scoreSaved = data.scoreSaved || false;
      return true;
    } catch { return false; }
  }

  function saveLeaderboardEntry(name, score) {
    if (!name) name = 'Аноним';
    const dt = new Date().toLocaleString();
    const arr = JSON.parse(localStorage.getItem(KEY_LEAD) || '[]');
    arr.push({ name, score, date: dt });
    arr.sort((a, b) => b.score - a.score);
    while (arr.length > 10) arr.pop();
    localStorage.setItem(KEY_LEAD, JSON.stringify(arr));
  }

  function renderLeader() {
    while (leaderTableBody.firstChild) leaderTableBody.removeChild(leaderTableBody.firstChild);

    const arr = JSON.parse(localStorage.getItem(KEY_LEAD) || '[]');
    arr.forEach((r, i) => {
      const tr = document.createElement('tr');

      const tdIndex = document.createElement('td');
      tdIndex.textContent = i + 1;
      tr.appendChild(tdIndex);

      const tdName = document.createElement('td');
      tdName.textContent = r.name;
      tr.appendChild(tdName);

      const tdScore = document.createElement('td');
      tdScore.textContent = r.score;
      tr.appendChild(tdScore);

      const tdDate = document.createElement('td');
      tdDate.textContent = r.date;
      tr.appendChild(tdDate);

      leaderTableBody.appendChild(tr);
    });
  }

  function initBoard() {
    while (boardEl.firstChild) {
      boardEl.removeChild(boardEl.firstChild);
    }

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.id = `tile-${r}-${c}`;
        boardEl.appendChild(tile);
      }
    }

    if (!loadState()) {
      grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
      score = 0;
      gameOver = false;
      scoreSaved = false;
      spawnRandom(Math.floor(Math.random() * 3) + 1);
    }
    render();
  }

  function updateTile(r, c, value, isNew = false, isMerged = false) {
    const tile = document.getElementById(`tile-${r}-${c}`);
    if (!tile) return;

    if (value === 0) {
      tile.textContent = '';
      tile.className = 'tile';
      tile.dataset.value = '';
    } else {
      tile.textContent = value;
      tile.className = 'tile';
      tile.classList.add(`tile-${value}`);
      tile.dataset.value = value;
    }

    if (isNew) {
      tile.classList.add('tile-new');
      setTimeout(() => tile.classList.remove('tile-new'), 200);
    } else if (isMerged) {
      tile.classList.add('tile-merge');
      setTimeout(() => tile.classList.remove('tile-merge'), 200);
    }
  }

  function render() {
    scoreEl.textContent = score;
    
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        updateTile(r, c, grid[r][c]);
      }
    }
    
    saveState();
  }

  function spawnRandom(count = 1) {
    const empties = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) empties.push([r, c]);
      }
    }
    if (empties.length === 0) return [];
    
    count = Math.min(count, empties.length);
    const newTiles = [];
    
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * empties.length);
      const [r, c] = empties.splice(idx, 1)[0];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
      newTiles.push({ r, c });
    }
    
    return newTiles;
  }

  function rotateGrid(times) {
    for (let t = 0; t < times; t++) {
      const newG = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          newG[c][SIZE - 1 - r] = grid[r][c];
        }
      }
      grid = newG;
    }
  }

  function compressAndMergeRow(row) {
    const newRow = row.filter(v => v);
    let points = 0;
    
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2;
        points += newRow[i];
        newRow.splice(i + 1, 1);
      }
    }
    
    while (newRow.length < SIZE) newRow.push(0);
    return { row: newRow, points };
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) return true;
        if (r + 1 < SIZE && grid[r + 1][c] === grid[r][c]) return true;
        if (c + 1 < SIZE && grid[r][c + 1] === grid[r][c]) return true;
      }
    }
    return false;
  }

  function move(direction) {
    if (gameOver) return;
    
    const dirMap = { left: 0, down: 1, right: 2, up: 3 };
    const times = dirMap[direction];
    prevState = { grid: grid.map(r => r.slice()), score };

    rotateGrid(times);

    let moved = false;
    let gained = 0;

    for (let r = 0; r < SIZE; r++) {
      const { row, points } = compressAndMergeRow(grid[r]);
      
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] !== row[c]) moved = true;
      }
      grid[r] = row;
      gained += points;
    }

    rotateGrid((4 - times) % 4);

    if (moved) {
      score += gained;
      const newTiles = spawnRandom(Math.random() < 0.25 ? 2 : 1);
      
      render();
      
      newTiles.forEach(({ r, c }) => {
        updateTile(r, c, grid[r][c], true, false);
      });

      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (grid[r][c] === 2048) {
            setTimeout(() => endGame(), 300);
            return;
          }
        }
      }

      if (!canMove()) {
        setTimeout(() => endGame(), 300);
      }
    }
  }

  function endGame() {
    gameOver = true;
    scoreSaved = false;
    saveState();
    gameOverBackdrop.classList.remove('hidden');
    saveRow.classList.remove('hidden');
    savedMsg.classList.add('hidden');
    playerName.value = '';
    saveScoreBtn.disabled = false;
    saveScoreBtn.textContent = 'Сохранить результат';
    saveScoreBtn.classList.remove('save-success');
  }

  function hideGameOver() {
    gameOverBackdrop.classList.add('hidden');
  }

  function restartGame() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    prevState = null;
    gameOver = false;
    scoreSaved = false;
    spawnRandom(Math.floor(Math.random() * 3) + 1);
    render();
    hideGameOver();
    confirmRestartBackdrop.classList.add('hidden');
  }

  function showConfirmRestart() {
    confirmRestartBackdrop.classList.remove('hidden');
  }

  function hideConfirmRestart() {
    confirmRestartBackdrop.classList.add('hidden');
  }

  function undo() {
    if (!prevState || gameOver) return;
    grid = prevState.grid.map(r => r.slice());
    score = prevState.score;
    prevState = null;
    render();
  }

  document.addEventListener('keydown', e => {
    const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (keys[e.key]) { 
      e.preventDefault(); 
      move(keys[e.key]); 
    }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) undo();
  });

  mobileControls.addEventListener('click', e => {
    const btn = e.target.closest('.dir-btn');
    if (!btn || !leaderBackdrop.classList.contains('hidden')) return;
    move(btn.dataset.dir);
  });

  let touchStart = null;
  boardEl.addEventListener('touchstart', e => { 
    if (e.touches.length === 1) {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  });
  
  boardEl.addEventListener('touchend', e => {
    if (!touchStart || !leaderBackdrop.classList.contains('hidden')) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    
    const direction = Math.abs(dx) > Math.abs(dy) 
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');
    
    move(direction);
    touchStart = null;
  });

  undoBtn.addEventListener('click', undo);
  
  restartBtn.addEventListener('click', showConfirmRestart);
  
  confirmRestartYes.addEventListener('click', restartGame);
  confirmRestartNo.addEventListener('click', hideConfirmRestart);

  leaderBtn.addEventListener('click', () => { 
    renderLeader(); 
    leaderBackdrop.classList.remove('hidden'); 
  });
  
  closeLeader.addEventListener('click', () => { 
    leaderBackdrop.classList.add('hidden'); 
  });
  
  clearLeader.addEventListener('click', () => { 
    if (confirm('Очистить таблицу лидеров?')) { 
      localStorage.removeItem(KEY_LEAD); 
      renderLeader(); 
    } 
  });

  saveScoreBtn.addEventListener('click', () => {
    if (scoreSaved) return;
    
    const name = playerName.value.trim() || 'Аноним';
    saveLeaderboardEntry(name, score);
    
    saveScoreBtn.disabled = true;
    saveScoreBtn.textContent = 'Результат сохранён!';
    saveScoreBtn.classList.add('save-success');
    scoreSaved = true;
    saveState();
    
    saveRow.classList.add('hidden');
    savedMsg.classList.remove('hidden');
    renderLeader();
    
    setTimeout(() => {
      restartGame();
    }, 2000);
  });

  restartAfterGame.addEventListener('click', () => { 
    restartGame();
  });

  renderLeader();
  initBoard();
})();
